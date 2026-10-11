import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import { TransactionInterceptor, CircuitBreakerOpenError } from "../src/interceptor.js";
import { CircuitBreaker } from "../src/circuitBreaker.js";
import { GapDiagnostician } from "../src/agent.js";
import { GapResolver } from "../src/resolver.js";
import { PendingTxStore } from "../src/nonceTracker.js";
import { TEST_KEY, makeTx, silentLogger, stubTracker, testConfig } from "./helpers.js";

const account = privateKeyToAccount(TEST_KEY);
const other = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");

async function sign(opts: { signer?: typeof account; nonce: number; chainId?: number; legacy?: boolean }) {
  const signer = opts.signer ?? account;
  const common = {
    chainId: opts.chainId ?? 84532,
    to: "0x2222222222222222222222222222222222222222" as const,
    value: 0n,
    nonce: opts.nonce,
    gas: 21000n,
  };
  return opts.legacy
    ? signer.signTransaction({ ...common, type: "legacy", gasPrice: 1_000_000_000n })
    : signer.signTransaction({
        ...common,
        type: "eip1559",
        maxFeePerGas: 3_000_000_000n,
        maxPriorityFeePerGas: 1_000_000_000n,
      });
}

function setup(stubs: Parameters<typeof stubTracker>[2] = {}) {
  const config = testConfig({ dryRun: true });
  const store = new PendingTxStore();
  const { tracker, calls } = stubTracker(config, store, stubs);
  const logger = silentLogger(config);
  const breaker = new CircuitBreaker(config, logger);
  const resolver = new GapResolver(config, tracker, store, logger);
  const interceptor = new TransactionInterceptor(
    config, tracker, store, resolver, new GapDiagnostician(config, logger), breaker, logger
  );
  return { config, store, tracker, calls, breaker, interceptor, resolver };
}

async function quiet<T>(fn: () => Promise<T>): Promise<T> {
  const log = console.log, err = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.log = log;
    console.error = err;
  }
}

describe("TransactionInterceptor", () => {
  it("forwards and tracks a normal EIP-1559 transaction", async () => {
    const { interceptor, store, calls } = setup();
    const hash = await quiet(async () => interceptor.submitTransaction(await sign({ nonce: 3 })));
    assert.match(hash, /^0x[0-9a-f]{64}$/);
    assert.ok(calls.includes("broadcastRaw"));
    const tracked = store.get(3)!;
    assert.equal(tracked.maxFeePerGas, 3_000_000_000n);
    assert.equal(tracked.maxPriorityFeePerGas, 1_000_000_000n);
    assert.equal(tracked.gasLimit, 21000n);
  });

  it("rejects legacy transactions instead of tracking zero fees", async () => {
    const { interceptor, calls } = setup();
    await assert.rejects(
      quiet(async () => interceptor.submitTransaction(await sign({ nonce: 3, legacy: true }))),
      /EIP-1559/
    );
    assert.ok(!calls.includes("broadcastRaw"));
  });

  it("rejects a transaction for the wrong chain", async () => {
    const { interceptor } = setup();
    await assert.rejects(
      quiet(async () => interceptor.submitTransaction(await sign({ nonce: 3, chainId: 8453 }))),
      /chainId/
    );
  });

  it("passes other senders' transactions through without tracking them", async () => {
    const { interceptor, store, calls } = setup();
    await quiet(async () => interceptor.submitTransaction(await sign({ nonce: 3, signer: other })));
    assert.ok(calls.includes("broadcastRaw"));
    assert.equal(store.all().length, 0);
    assert.ok(!calls.includes("detectGap"));
  });

  it("refuses submissions while the circuit breaker is tripped", async () => {
    const { interceptor, breaker, config } = setup();
    for (let i = 0; i < config.circuitBreakerThreshold; i++) await quiet(() => breaker.recordFailure());
    await assert.rejects(
      quiet(async () => interceptor.submitTransaction(await sign({ nonce: 3 }))),
      CircuitBreakerOpenError
    );
  });

  it("resolves a gap ahead of the submitted nonce, then still forwards", async () => {
    const config = testConfig({ dryRun: true });
    const store = new PendingTxStore();
    store.add(makeTx(4));
    const { tracker, calls } = stubTracker(config, store, {
      detectGap: async () => ({ gapNonce: 4, stuckTx: store.get(4)! }),
      getNonceState: async () => ({ latestNonce: 4, pendingNonce: 6, trackedTxs: store.all() }),
    });
    const logger = silentLogger(config);
    const logged: string[] = [];
    logger.onEntry((e) => logged.push(e.action));
    const interceptor = new TransactionInterceptor(
      config, tracker, store, new GapResolver(config, tracker, store, logger),
      new GapDiagnostician(config, logger), new CircuitBreaker(config, logger), logger
    );
    await quiet(async () => interceptor.submitTransaction(await sign({ nonce: 5 })));
    assert.ok(logged.includes("gap_detected"));
    assert.ok(logged.includes("gap_resolved"));
    assert.ok(calls.includes("broadcastRaw"));
  });

  it("does not count an untracked nonce against the circuit breaker", async () => {
    const config = testConfig({ dryRun: true, circuitBreakerThreshold: 1 });
    const store = new PendingTxStore(); // gap nonce 4 was never submitted through Sentinel
    const { tracker } = stubTracker(config, store, {
      detectGap: async () => ({ gapNonce: 4, stuckTx: null }),
      getNonceState: async () => ({ latestNonce: 4, pendingNonce: 6, trackedTxs: [] }),
    });
    const logger = silentLogger(config);
    const breaker = new CircuitBreaker(config, logger);
    const interceptor = new TransactionInterceptor(
      config, tracker, store, new GapResolver(config, tracker, store, logger),
      new GapDiagnostician(config, logger), breaker, logger
    );
    await quiet(async () => interceptor.submitTransaction(await sign({ nonce: 5 })));
    assert.equal(breaker.isTripped(), false);
  });

  it("serializes concurrent submissions", async () => {
    const order: string[] = [];
    let n = 0;
    const { interceptor } = setup({
      broadcastRaw: async () => {
        const id = ++n;
        order.push(`start${id}`);
        await new Promise((r) => setTimeout(r, 15));
        order.push(`end${id}`);
        return `0x${String(id).padStart(64, "0")}`;
      },
    });
    const a = await sign({ nonce: 1 });
    const b = await sign({ nonce: 2 });
    await quiet(() => Promise.all([interceptor.submitTransaction(a), interceptor.submitTransaction(b)]));
    assert.deepEqual(order, ["start1", "end1", "start2", "end2"]);
  });
});
