import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GapResolver, UntrackedNonceError } from "../src/resolver.js";
import { PendingTxStore } from "../src/nonceTracker.js";
import { TEST_ADDRESS, TEST_KEY, makeTx, silentLogger, stubTracker, testConfig } from "./helpers.js";

async function quiet<T>(fn: () => Promise<T>): Promise<T> {
  const orig = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = orig;
  }
}

describe("GapResolver (dry run)", () => {
  it("computes a replacement that beats the original by the bump and leaves state untouched", async () => {
    const config = testConfig({ dryRun: true });
    const store = new PendingTxStore();
    const original = makeTx(5);
    store.add(original);
    const { tracker } = stubTracker(config, store);
    const resolver = new GapResolver(config, tracker, store, silentLogger(config));

    const res = await quiet(() => resolver.resolveGap(5, 25));
    assert.equal(res.outcome, "resolved");
    assert.match(res.newHash!, /^0x[0-9a-f]{64}$/);
    // dry run must not rewrite the (possibly shared) store
    assert.equal(store.get(5)?.hash, original.hash);
  });

  it("clamps an absurd bump override to the ceiling", async () => {
    const config = testConfig({ dryRun: true });
    const store = new PendingTxStore();
    store.add(makeTx(5));
    const { tracker } = stubTracker(config, store);
    const logs: string[] = [];
    const logger = silentLogger(config);
    logger.onEntry((e) => logs.push(JSON.stringify(e)));
    const resolver = new GapResolver(config, tracker, store, logger);
    await quiet(() => resolver.resolveGap(5, 9999));
    const resolved = JSON.parse(logs.find((l) => l.includes("gap_resolved"))!);
    assert.equal(resolved.bumpPct, 50);
    // 1 gwei * 1.5 = 1.5 gwei priority
    assert.equal(resolved.newMaxPriorityFeePerGas, "1500000000");
    assert.ok(BigInt(resolved.newMaxFeePerGas) > BigInt(resolved.oldMaxFeePerGas));
  });

  it("strictly increases fees even when the original priority fee is zero", async () => {
    const config = testConfig({ dryRun: true });
    const store = new PendingTxStore();
    store.add(makeTx(5, { maxPriorityFeePerGas: 0n, maxFeePerGas: 0n }));
    const { tracker } = stubTracker(config, store);
    const logs: string[] = [];
    const logger = silentLogger(config);
    logger.onEntry((e) => logs.push(JSON.stringify(e)));
    await quiet(() => new GapResolver(config, tracker, store, logger).resolveGap(5));
    const resolved = JSON.parse(logs.find((l) => l.includes("gap_resolved"))!);
    assert.ok(BigInt(resolved.newMaxPriorityFeePerGas) > 0n);
    assert.ok(BigInt(resolved.newMaxFeePerGas) >= BigInt(resolved.newMaxPriorityFeePerGas));
  });

  it("does nothing when the nonce is already mined", async () => {
    const config = testConfig({ dryRun: true });
    const store = new PendingTxStore();
    store.add(makeTx(5));
    const { tracker } = stubTracker(config, store, { isNonceMined: async () => true });
    const res = await quiet(() => new GapResolver(config, tracker, store, silentLogger(config)).resolveGap(5));
    assert.equal(res.outcome, "already_confirmed");
    assert.equal(store.get(5), undefined);
  });

  it("refuses when the replacement would exceed the configured price cap", async () => {
    const config = testConfig({ dryRun: true, maxGasPriceCapGwei: 1 });
    const store = new PendingTxStore();
    store.add(makeTx(5)); // 2 gwei maxFee already above a 1 gwei cap
    const { tracker } = stubTracker(config, store);
    const resolver = new GapResolver(config, tracker, store, silentLogger(config));
    await assert.rejects(quiet(() => resolver.resolveGap(5)), /Refusing to resolve/);
  });

  it("throws UntrackedNonceError for a nonce it never saw", async () => {
    const config = testConfig({ dryRun: true });
    const store = new PendingTxStore();
    const { tracker } = stubTracker(config, store);
    const resolver = new GapResolver(config, tracker, store, silentLogger(config));
    await assert.rejects(quiet(() => resolver.resolveGap(9)), UntrackedNonceError);
  });

  it("rejects a concurrent resolution of the same nonce", async () => {
    const config = testConfig({ dryRun: true });
    const store = new PendingTxStore();
    store.add(makeTx(5));
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const { tracker } = stubTracker(config, store, { getCurrentBaseFee: async () => { await gate; return 1n; } });
    const resolver = new GapResolver(config, tracker, store, silentLogger(config));
    const first = quiet(() => resolver.resolveGap(5));
    await new Promise((r) => setTimeout(r, 20));
    await assert.rejects(resolver.resolveGap(5), /already in progress/);
    release();
    await first;
  });

  it("requires a key outside dry-run mode", async () => {
    const config = testConfig({ dryRun: false, privateKey: null });
    const store = new PendingTxStore();
    const { tracker } = stubTracker(config, store);
    const resolver = new GapResolver(config, tracker, store, silentLogger(config));
    await assert.rejects(resolver.resolveGap(1), /PRIVATE_KEY/);
  });
});

describe("INV-03 replacement payload", () => {
  async function broadcastWith(strategy: "replace" | "cancel") {
    const config = testConfig({ dryRun: false, privateKey: TEST_KEY, gapResolutionStrategy: strategy });
    const store = new PendingTxStore();
    store.add(makeTx(5, { to: "0x3333333333333333333333333333333333333333", value: 7n, data: "0xdeadbeef", gasLimit: 90_000n }));
    const { tracker } = stubTracker(config, store);
    const resolver = new GapResolver(config, tracker, store, silentLogger(config));
    let sent: Record<string, unknown> | undefined;
    (resolver as unknown as { walletClient: { sendTransaction: (a: Record<string, unknown>) => Promise<string> } }).walletClient.sendTransaction =
      async (args) => {
        sent = args;
        return `0x${"ee".repeat(32)}`;
      };
    await quiet(() => resolver.resolveGap(5, 20));
    return { sent: sent!, store };
  }

  it("replace re-sends exactly what the bot signed, with higher fees and the same nonce", async () => {
    const { sent, store } = await broadcastWith("replace");
    assert.equal(sent.to, "0x3333333333333333333333333333333333333333");
    assert.equal(sent.value, 7n);
    assert.equal(sent.data, "0xdeadbeef");
    assert.equal(sent.gas, 90_000n);
    assert.equal(sent.nonce, 5);
    assert.ok((sent.maxPriorityFeePerGas as bigint) >= 1_200_000_000n);
    assert.equal(store.get(5)?.hash, `0x${"ee".repeat(32)}`);
  });

  it("cancel sends a zero-value empty-calldata self-transfer at the same nonce", async () => {
    const { sent, store } = await broadcastWith("cancel");
    assert.equal(sent.to, TEST_ADDRESS);
    assert.equal(sent.value, 0n);
    assert.equal(sent.data, "0x");
    assert.equal(sent.gas, 21_000n);
    assert.equal(sent.nonce, 5);
    assert.equal(store.get(5)?.value, 0n);
  });
});
