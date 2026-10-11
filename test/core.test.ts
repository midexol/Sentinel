import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { bumpWei, clampBumpPct } from "../src/resolver.js";
import { NonceTracker, PendingTxStore } from "../src/nonceTracker.js";
import { AuditLogger, redactSensitiveData } from "../src/logger.js";
import { CircuitBreaker } from "../src/circuitBreaker.js";
import { StateFile } from "../src/state.js";
import { loadConfig } from "../src/config.js";
import { parseProposal } from "../src/agent.js";
import { makeTx, testConfig, tmpDir } from "./helpers.js";

describe("INV-02 gas bump clamping", () => {
  const config = testConfig();
  it("clamps to the configured floor and ceiling", () => {
    assert.equal(clampBumpPct(200, config), 50);
    assert.equal(clampBumpPct(3, config), 10);
    assert.equal(clampBumpPct(25, config), 25);
    assert.equal(clampBumpPct(0, config), 10);
    assert.equal(clampBumpPct(-50, config), 10);
  });
  it("never propagates NaN or Infinity", () => {
    assert.equal(clampBumpPct(NaN, config), 10);
    assert.equal(clampBumpPct(Infinity, config), 10);
    assert.equal(clampBumpPct(-Infinity, config), 10);
  });
  it("bumpWei rounds up with integer math", () => {
    assert.equal(bumpWei(1000n, 10), 1100n);
    assert.equal(bumpWei(1n, 10), 2n); // ceil(1.1)
    assert.equal(bumpWei(0n, 10), 0n);
    assert.equal(bumpWei(1_000_000_000_000_000_000n, 12.5), 1_125_000_000_000_000_000n);
  });
});

describe("PendingTxStore", () => {
  it("adds, gets, removes and prunes", () => {
    const store = new PendingTxStore();
    store.add(makeTx(100));
    store.add(makeTx(101));
    store.add(makeTx(105));
    assert.equal(store.get(100)?.nonce, 100);
    store.remove(100);
    assert.equal(store.get(100), undefined);
    store.pruneBelow(104);
    assert.deepEqual(store.all().map((t) => t.nonce), [105]);
  });

  it("round-trips bigints through a shared state file between instances", () => {
    const file = path.join(tmpDir(), "state.json");
    const a = new PendingTxStore(new StateFile(file));
    const b = new PendingTxStore(new StateFile(file));
    a.add(makeTx(7, { maxFeePerGas: 123_456_789_012_345_678n }));
    assert.equal(b.get(7)?.maxFeePerGas, 123_456_789_012_345_678n);
    b.remove(7);
    assert.equal(a.get(7), undefined);
  });
});

describe("NonceTracker.findGap", () => {
  it("returns null when nothing is in flight", () => {
    assert.equal(NonceTracker.findGap(5, 5, []), null);
  });
  it("finds a hole between tracked transactions", () => {
    const gap = NonceTracker.findGap(5, 8, [makeTx(5), makeTx(7)]);
    assert.equal(gap?.gapNonce, 6);
    assert.equal(gap?.stuckTx, null);
  });
  it("finds a missing leading nonce", () => {
    assert.equal(NonceTracker.findGap(5, 7, [makeTx(6)])?.gapNonce, 5);
  });
  it("reports untracked pending nonces after the last tracked tx", () => {
    assert.equal(NonceTracker.findGap(5, 8, [makeTx(5), makeTx(6)])?.gapNonce, 7);
  });
  it("ignores already-mined tracked transactions", () => {
    // nonce 3 is below the confirmed nonce; it must not hide the real gap at 5.
    const gap = NonceTracker.findGap(5, 8, [makeTx(3), makeTx(4), makeTx(6)]);
    assert.equal(gap?.gapNonce, 5);
  });
  it("returns null when tracked txs cover every pending nonce", () => {
    assert.equal(NonceTracker.findGap(5, 7, [makeTx(5), makeTx(6)]), null);
  });
});

describe("CircuitBreaker", () => {
  it("trips at the threshold and resets", async () => {
    const config = testConfig({ circuitBreakerThreshold: 3, circuitBreakerAutoRecovery: false });
    const breaker = new CircuitBreaker(config, new AuditLogger(config.logFile));
    await breaker.recordFailure();
    await breaker.recordFailure();
    assert.equal(breaker.isTripped(), false);
    await breaker.recordFailure();
    assert.equal(breaker.isTripped(), true);
    await breaker.reset();
    assert.equal(breaker.isTripped(), false);
  });

  it("is shared across instances via the state file and survives a restart", async () => {
    const file = path.join(tmpDir(), "state.json");
    const config = testConfig({ circuitBreakerThreshold: 1, circuitBreakerAutoRecovery: false });
    const logger = new AuditLogger(config.logFile);
    await new CircuitBreaker(config, logger, new StateFile(file)).recordFailure();
    assert.equal(new CircuitBreaker(config, logger, new StateFile(file)).isTripped(), true);
  });

  it("auto-recovers after the cooldown", async () => {
    const config = testConfig({ circuitBreakerThreshold: 1, circuitBreakerCooldownMs: 20 });
    const breaker = new CircuitBreaker(config, new AuditLogger(config.logFile));
    await breaker.recordFailure();
    assert.equal(breaker.isTripped(), true);
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(breaker.isTripped(), false);
  });

  it("never trips when disabled", async () => {
    const config = testConfig({ circuitBreakerThreshold: 1, circuitBreakerEnabled: false });
    const breaker = new CircuitBreaker(config, new AuditLogger(config.logFile));
    await breaker.recordFailure();
    assert.equal(breaker.isTripped(), false);
  });
});

describe("AuditLogger", () => {
  it("redacts secrets but preserves public tx hashes", () => {
    const hash = "0x" + "aa".repeat(32);
    const out = redactSensitiveData({
      privateKey: "0x" + "12".repeat(32),
      originalTxHash: hash,
      note: "see https://discord.com/api/webhooks/123/abcSECRET and Bearer abc.def.ghi",
      nested: { apiKey: "sk-123", token: "t" },
    }) as Record<string, unknown>;
    const json = JSON.stringify(out);
    assert.ok(json.includes(hash));
    assert.ok(!json.includes("abcSECRET"));
    assert.ok(!json.includes("abc.def.ghi"));
    assert.ok(!json.includes("sk-123"));
    assert.equal(out.privateKey, "[REDACTED]");
  });

  it("writes JSONL, serializes concurrent writes and calls hooks", async () => {
    const file = path.join(tmpDir(), "a.log");
    const logger = new AuditLogger(file);
    const seen: string[] = [];
    logger.onEntry((e) => seen.push(e.action));
    const orig = console.log;
    console.log = () => {};
    try {
      await Promise.all(
        Array.from({ length: 20 }, (_, i) => logger.log({ action: "gap_detected", wallet: "w", gapNonce: i }))
      );
    } finally {
      console.log = orig;
    }
    const lines = fs.readFileSync(file, "utf8").trim().split("\n");
    assert.equal(lines.length, 20);
    lines.forEach((l) => JSON.parse(l));
    assert.equal(seen.length, 20);
  });

  it("never throws when the log path is unwritable", async () => {
    const dir = tmpDir();
    // A directory where the file should be makes appendFile fail.
    const logger = new AuditLogger(dir);
    const origLog = console.log;
    const origErr = console.error;
    console.log = () => {};
    console.error = () => {};
    try {
      await assert.doesNotReject(logger.log({ action: "gap_detected", wallet: "w" }));
    } finally {
      console.log = origLog;
      console.error = origErr;
    }
  });

  it("rotates when the size limit is exceeded", async () => {
    const dir = tmpDir();
    const file = path.join(dir, "r.log");
    fs.writeFileSync(file, "x".repeat(2 * 1024 * 1024));
    const logger = new AuditLogger(file, { rotation: true, maxSizeMb: 1 });
    const orig = console.log;
    console.log = () => {};
    try {
      await logger.log({ action: "gap_detected", wallet: "w" });
    } finally {
      console.log = orig;
    }
    const files = fs.readdirSync(dir);
    assert.ok(files.some((f) => f.startsWith("r.log.")), "rotated file exists");
    assert.ok(fs.statSync(file).size < 1024, "fresh log is small");
  });
});

describe("loadConfig", () => {
  const keys = [
    "WALLET_ADDRESS", "PRIVATE_KEY", "MIN_GAS_BUMP_PCT", "MAX_GAS_BUMP_PCT", "CHAIN", "SETTINGS_FILE",
    "GAP_DETECTION_INTERVAL_MS", "AGENT_MODEL", "RPC_URL", "STATE_FILE",
  ];
  function withEnv(env: Record<string, string>, fn: () => void) {
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    for (const k of keys) delete process.env[k];
    process.env.SETTINGS_FILE = path.join(tmpDir(), "none.json");
    Object.assign(process.env, env);
    try {
      fn();
    } finally {
      for (const k of keys) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    }
  }
  const wallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  it("loads sane defaults", () => {
    withEnv({ WALLET_ADDRESS: wallet }, () => {
      const c = loadConfig();
      assert.equal(c.chain, "sepolia");
      assert.equal(c.minGasBumpPct, 10);
      assert.equal(c.maxGasBumpPct, 50);
      assert.equal(c.privateKey, null);
      assert.equal(c.proxyHost, "127.0.0.1");
    });
  });
  it("selects mainnet defaults", () => {
    withEnv({ WALLET_ADDRESS: wallet, CHAIN: "mainnet" }, () => {
      const c = loadConfig();
      assert.equal(c.chain, "mainnet");
      assert.equal(c.rpcUrl, "https://mainnet.base.org");
    });
  });
  it("rejects non-numeric values instead of producing NaN", () => {
    withEnv({ WALLET_ADDRESS: wallet, MIN_GAS_BUMP_PCT: "abc" }, () => {
      assert.throws(() => loadConfig(), /MIN_GAS_BUMP_PCT must be a number/);
    });
  });
  it("rejects min > max and sub-protocol minimums", () => {
    withEnv({ WALLET_ADDRESS: wallet, MIN_GAS_BUMP_PCT: "60" }, () => {
      assert.throws(() => loadConfig(), /must not exceed/);
    });
    withEnv({ WALLET_ADDRESS: wallet, MIN_GAS_BUMP_PCT: "5" }, () => {
      assert.throws(() => loadConfig(), />= 10/);
    });
  });
  it("rejects a malformed PRIVATE_KEY and a bad CHAIN", () => {
    withEnv({ WALLET_ADDRESS: wallet, PRIVATE_KEY: "0x123" }, () => {
      assert.throws(() => loadConfig(), /PRIVATE_KEY/);
    });
    withEnv({ WALLET_ADDRESS: wallet, CHAIN: "goerli" }, () => {
      assert.throws(() => loadConfig(), /CHAIN/);
    });
  });
  it("requires a valid wallet address", () => {
    withEnv({}, () => assert.throws(() => loadConfig(), /WALLET_ADDRESS/));
    withEnv({ WALLET_ADDRESS: "0x123" }, () => assert.throws(() => loadConfig(), /not a valid address/));
  });
  it("honours settings.json for values the daemon supports, with env taking precedence", () => {
    const file = path.join(tmpDir(), "settings.json");
    fs.writeFileSync(file, JSON.stringify({ nonceTracking: { gapDetectionInterval: 750 }, gasStrategy: { maxGasPriceCapGwei: 7 } }));
    withEnv({ WALLET_ADDRESS: wallet }, () => {
      process.env.SETTINGS_FILE = file;
      const c = loadConfig();
      assert.equal(c.gapDetectionIntervalMs, 750);
      assert.equal(c.maxGasPriceCapGwei, 7);
      process.env.GAP_DETECTION_INTERVAL_MS = "900";
      assert.equal(loadConfig().gapDetectionIntervalMs, 900);
    });
  });
});

describe("parseProposal", () => {
  const ok = { category: "underpriced", explanation: "low tip", requestedBumpPct: 30 };
  it("parses plain and fenced JSON", () => {
    assert.equal(parseProposal(JSON.stringify(ok)).requestedBumpPct, 30);
    assert.equal(parseProposal("```json\n" + JSON.stringify(ok) + "\n```").category, "underpriced");
    assert.equal(parseProposal("Here you go: " + JSON.stringify(ok) + " done").requestedBumpPct, 30);
  });
  it("rejects invalid shapes", () => {
    assert.throws(() => parseProposal("no json here"));
    assert.throws(() => parseProposal(JSON.stringify({ ...ok, category: "bogus" })));
    assert.throws(() => parseProposal(JSON.stringify({ ...ok, requestedBumpPct: "30" })));
    assert.throws(() => parseProposal(JSON.stringify({ ...ok, requestedBumpPct: null })));
    assert.throws(() => parseProposal(JSON.stringify({ ...ok, explanation: 5 })));
  });
});
