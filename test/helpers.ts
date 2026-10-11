import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { makeConfig, type SentinelConfig } from "../src/config.js";
import { AuditLogger } from "../src/logger.js";
import { NonceTracker, PendingTxStore, type TrackedTx } from "../src/nonceTracker.js";

/** Well-known throwaway key (Hardhat account #1). Never holds real funds. */
export const TEST_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;
export const TEST_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;

export function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sentinel-test-"));
}

export function testConfig(overrides: Partial<SentinelConfig> = {}): SentinelConfig {
  return makeConfig({
    walletAddress: TEST_ADDRESS,
    logFile: path.join(tmpDir(), "audit.log"),
    ...overrides,
  });
}

export function silentLogger(config: SentinelConfig): AuditLogger {
  return new AuditLogger(config.logFile);
}

export function makeTx(nonce: number, overrides: Partial<TrackedTx> = {}): TrackedTx {
  return {
    hash: `0x${nonce.toString(16).padStart(64, "0")}` as `0x${string}`,
    nonce,
    to: "0x2222222222222222222222222222222222222222",
    value: 0n,
    data: "0x",
    gasLimit: 21000n,
    maxPriorityFeePerGas: 1_000_000_000n,
    maxFeePerGas: 2_000_000_000n,
    submittedAt: Date.now(),
    ...overrides,
  };
}

export interface StubTracker {
  tracker: NonceTracker;
  calls: string[];
}

/** A NonceTracker whose network-touching methods are replaced with in-memory stubs. */
export function stubTracker(
  config: SentinelConfig,
  store: PendingTxStore,
  stubs: Partial<Record<keyof NonceTracker, unknown>> = {}
): StubTracker {
  const tracker = new NonceTracker(config, store);
  const calls: string[] = [];
  const defaults: Record<string, unknown> = {
    isNonceMined: async () => false,
    isConfirmed: async () => false,
    getCurrentBaseFee: async () => 1_000_000n,
    getNonceState: async () => ({ latestNonce: 0, pendingNonce: 0, trackedTxs: store.all() }),
    detectGap: async () => null,
    broadcastRaw: async () => `0x${"ab".repeat(32)}`,
  };
  for (const [name, fn] of Object.entries({ ...defaults, ...stubs })) {
    (tracker as unknown as Record<string, unknown>)[name] = async (...args: unknown[]) => {
      calls.push(name);
      return (fn as (...a: unknown[]) => unknown)(...args);
    };
  }
  return { tracker, calls };
}
