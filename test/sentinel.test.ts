import assert from "node:assert/strict";
import { clampBumpPct } from "../src/resolver.js";
import { PendingTxStore } from "../src/nonceTracker.js";
import { AuditLogger } from "../src/logger.js";
import { CircuitBreaker } from "../src/circuitBreaker.js";
import type { SentinelConfig } from "../src/config.js";

const mockConfig: SentinelConfig = {
  rpcUrl: "https://sepolia.base.org",
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438BaEa",
  privateKey: null,
  gapDetectionIntervalMs: 500,
  evictionTimeoutMs: 30000,
  circuitBreakerThreshold: 3,
  circuitBreakerWindowMs: 10000,
  logFile: "./test-audit.log",
  alertWebhookUrl: null,
  minGasBumpPct: 10,
  maxGasBumpPct: 50,
  anthropicApiKey: null,
  agentModel: "llm-reasoning-agent",
  dryRun: true,
};

async function runTests() {
  console.log("--- RUNNING SENTINEL INVARIANT & SECURITY TEST SUITE ---\n");

  // Test 1: Gas Bump Clamping Invariant (INV-02)
  console.log("TEST 1: Invariant INV-02 Gas Bump Clamping");
  assert.equal(clampBumpPct(200, mockConfig), 50, "Excessive bump should be clamped to 50% ceiling");
  assert.equal(clampBumpPct(3, mockConfig), 10, "Sub-minimum bump should be elevated to 10% floor");
  assert.equal(clampBumpPct(25, mockConfig), 25, "Valid 25% bump should be preserved");
  console.log("  PASS: Invariant INV-02 holds under all inputs.\n");

  // Test 2: PendingTxStore Nonce Tracking (INV-01)
  console.log("TEST 2: Invariant INV-01 Monotonic Nonce Tracking");
  const store = new PendingTxStore();
  store.add({
    hash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    nonce: 100,
    to: "0x2222222222222222222222222222222222222222",
    value: 0n,
    data: "0x",
    gasLimit: 21000n,
    maxPriorityFeePerGas: 1000000n,
    maxFeePerGas: 2000000n,
    submittedAt: Date.now(),
  });
  assert.ok(store.get(100) !== undefined, "Store should record nonce 100");
  assert.equal(store.get(100)?.nonce, 100, "Store should retrieve tracked tx");
  store.remove(100);
  assert.equal(store.get(100), undefined, "Store should remove confirmed nonce");
  console.log("  PASS: PendingTxStore tracks and prunes nonces correctly.\n");

  // Test 3: Circuit Breaker Threshold Trip (INV-04)
  console.log("TEST 3: Invariant INV-04 Circuit Breaker Trip Rate");
  const testLogger = new AuditLogger("./test-audit.log");
  const breaker = new CircuitBreaker(mockConfig, testLogger);
  assert.equal(breaker.isTripped(), false, "Breaker should initially be closed (normal operation)");
  await breaker.recordFailure();
  await breaker.recordFailure();
  assert.equal(breaker.isTripped(), false, "Breaker should remain closed under 2 failures (threshold=3)");
  await breaker.recordFailure();
  assert.equal(breaker.isTripped(), true, "Breaker should trip into SAFE mode after 3 failures");
  breaker.reset();
  assert.equal(breaker.isTripped(), false, "Breaker should reset back to normal operation");
  console.log("  PASS: Invariant INV-04 trips and resets as specified.\n");

  // Test 4: Secret Redaction in Audit Logger
  console.log("TEST 4: Audit Logger Secret Redaction");
  const logger = new AuditLogger("./test-audit.log");
  let loggedOutput = "";
  const origLog = console.log;
  console.log = (...args) => {
    loggedOutput += args.join(" ");
  };

  await logger.log({
    action: "gap_resolved",
    wallet: mockConfig.walletAddress,
    privateKey: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    originalTxHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  });
  console.log = origLog;

  assert.ok(loggedOutput.includes("[REDACTED]"), "Private key field must be scrubbed to [REDACTED]");
  assert.ok(
    loggedOutput.includes("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
    "Public transaction hash must be preserved for BaseScan"
  );
  console.log("  PASS: Sensitive keys scrubbed while preserving public tx receipts.\n");

  console.log("====================================================");
  console.log("  ALL SENTINEL INVARIANT & SECURITY TESTS PASSED!");
  console.log("====================================================\n");
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
