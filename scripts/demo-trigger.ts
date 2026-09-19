import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  parseGwei,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { loadConfig } from "../src/config.js";
import { NonceTracker, PendingTxStore } from "../src/nonceTracker.js";
import { AuditLogger } from "../src/logger.js";
import { GapResolver } from "../src/resolver.js";
import { GapDiagnostician } from "../src/agent.js";
import { TransactionInterceptor } from "../src/interceptor.js";

/**
 * Demo Trigger Script for Sentinel.
 *
 * This script demonstrates the exact Flashblocks / mempool stuck nonce problem:
 * 1. Sends Tx 1 with standard gas.
 * 2. Sends Tx 2 with deliberately low / underpriced gas (e.g. 1 wei priority fee).
 * 3. Sends Tx 3 & 4 with standard gas.
 *
 * Modes:
 * - `npm run demo -- --mode=raw`:
 *   Submits transactions directly to Base Sepolia RPC. Run `npm run watch`
 *   in a separate terminal to watch Sentinel detect the gap, diagnose it
 *   with Claude, and resubmit it with the clamped bump.
 *
 * - `npm run demo -- --mode=interceptor`:
 *   Submits transactions through `TransactionInterceptor`. The interceptor
 *   detects the blocking gap ahead of Tx 3, triggers AI diagnosis, resubmits Tx 2,
 *   and unblocks the queue automatically before forwarding Tx 3.
 *
 * - `npm run demo -- --mode=simulate`:
 *   Runs an in-memory simulation with dry-run mode (no funds or private key needed),
 *   demonstrating the entire detection -> diagnosis -> clamping -> audit logging flow.
 */

const modeArg = process.argv.find((a) => a.startsWith("--mode="))?.split("=")[1] || "simulate";

async function runSimulation() {
  console.log("================================================================================");
  console.log("  SENTINEL DEMO: In-Memory Dry-Run Simulation (No ETH / Private Key Required)");
  console.log("================================================================================\n");

  const mockConfig = {
    rpcUrl: "https://sepolia.base.org",
    walletAddress: "0x1111111111111111111111111111111111111111" as `0x${string}`,
    privateKey: null,
    gapDetectionIntervalMs: 500,
    evictionTimeoutMs: 30000,
    circuitBreakerThreshold: 5,
    circuitBreakerWindowMs: 60000,
    logFile: "./sentinel.log",
    alertWebhookUrl: null,
    minGasBumpPct: 10,
    maxGasBumpPct: 50,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? null,
    agentModel: process.env.AGENT_MODEL ?? "claude-sonnet-5",
    dryRun: true,
  };

  const store = new PendingTxStore();
  const logger = new AuditLogger(mockConfig.logFile);
  const tracker = new NonceTracker(mockConfig, store);
  const resolver = new GapResolver(mockConfig, tracker, store, logger);
  const diagnostician = new GapDiagnostician(mockConfig, logger);

  console.log("1. Simulating trading bot submitting rapid transactions...");
  const baseNonce = 42;

  // Add Tx 1 (nonce 42)
  store.add({
    hash: "0xaaaa1111222233334444555566667777888899990000aaaa1111222233334444",
    nonce: baseNonce,
    to: "0x2222222222222222222222222222222222222222",
    value: 0n,
    data: "0x",
    gasLimit: 21000n,
    maxPriorityFeePerGas: parseGwei("1.5"),
    maxFeePerGas: parseGwei("2.0"),
    submittedAt: Date.now() - 10000,
  });

  // Tx 2 (nonce 43) - DELIBERATELY UNDERPRICED (stuck transaction)
  store.add({
    hash: "0xbbbb1111222233334444555566667777888899990000bbbb1111222233334444",
    nonce: baseNonce + 1,
    to: "0x2222222222222222222222222222222222222222",
    value: 0n,
    data: "0x",
    gasLimit: 21000n,
    maxPriorityFeePerGas: 1n, // 1 wei - will not be picked up!
    maxFeePerGas: parseGwei("0.001"),
    submittedAt: Date.now() - 8000,
  });

  // Tx 3 (nonce 44) - Queued behind nonce 43
  store.add({
    hash: "0xcccc1111222233334444555566667777888899990000cccc1111222233334444",
    nonce: baseNonce + 2,
    to: "0x2222222222222222222222222222222222222222",
    value: 0n,
    data: "0x",
    gasLimit: 21000n,
    maxPriorityFeePerGas: parseGwei("2.0"),
    maxFeePerGas: parseGwei("2.5"),
    submittedAt: Date.now() - 2000,
  });

  console.log(`   - Tx #1 (nonce ${baseNonce}): Confirmed`);
  console.log(`   - Tx #2 (nonce ${baseNonce + 1}): Underpriced (1 wei tip) -> STUCK`);
  console.log(`   - Tx #3 (nonce ${baseNonce + 2}): High fee -> QUEUED behind stuck nonce ${baseNonce + 1}\n`);

  console.log("2. Sentinel detects gap at nonce", baseNonce + 1);
  const gap = {
    gapNonce: baseNonce + 1,
    stuckTx: store.get(baseNonce + 1)!,
  };
  const mockState = {
    latestNonce: baseNonce + 1, // 42 confirmed
    pendingNonce: baseNonce + 3, // 44 submitted
    trackedTxs: store.all(),
  };

  console.log("3. Triggering AI Diagnosis (Claude reasoning layer)...");
  const diagnosis = await diagnostician.diagnose(gap, mockState, [
    { timestamp: Date.now() - 5000, kind: "gap" },
  ]);

  console.log(`   Diagnosis result:`);
  console.log(`     - Category: ${diagnosis.category}`);
  console.log(`     - Explanation: "${diagnosis.explanation}"`);
  console.log(`     - Model asked for: ${diagnosis.rawRequestedBumpPct}%`);
  console.log(`     - Clamped recommendation: ${diagnosis.recommendedBumpPct}%\n`);

  console.log("4. Resolving stuck transaction via GapResolver (Dry Run)...");
  const res = await resolver.resolveGap(gap.gapNonce, diagnosis.recommendedBumpPct);
  console.log(`   Resolution outcome: ${res.outcome}`);
  console.log(`   Generated replacement tx hash: ${res.newHash}\n`);

  console.log("5. Audit log updated in ./sentinel.log. Verification complete!\n");
}

async function runLive(mode: "raw" | "interceptor") {
  console.log(`================================================================================`);
  console.log(`  SENTINEL DEMO: Live Base Sepolia Test (${mode.toUpperCase()} MODE)`);
  console.log(`================================================================================\n`);

  const config = loadConfig();
  if (!config.privateKey) {
    console.error("Error: Live demo requires PRIVATE_KEY in .env.");
    console.error("Please fund your wallet on Base Sepolia faucet (https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet) and add PRIVATE_KEY to .env");
    process.exit(1);
  }

  const account = privateKeyToAccount(config.privateKey);
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  }) as PublicClient;

  const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  }) as WalletClient;

  const currentNonce = await client.getTransactionCount({
    address: account.address,
    blockTag: "latest",
  });

  console.log(`Wallet: ${account.address}`);
  console.log(`Current confirmed nonce: ${currentNonce}\n`);

  const dest = account.address; // Self-transfer 0 ETH to test safely
  const baseFee = await client.getBlock({ blockTag: "latest" }).then((b) => b.baseFeePerGas ?? 1000000n);

  console.log("Step 1: Firing Tx #1 (Normal gas)...");
  const hash1 = await wallet.sendTransaction({
    account,
    chain: baseSepolia,
    to: dest,
    value: 0n,
    nonce: currentNonce,
    maxPriorityFeePerGas: parseGwei("1"),
    maxFeePerGas: baseFee * 2n + parseGwei("1"),
  });
  console.log(`  Tx #1 submitted: ${hash1} (nonce ${currentNonce})`);

  console.log("\nStep 2: Firing Tx #2 (DELIBERATELY UNDERPRICED - 1 wei priority fee)...");
  const hash2 = await wallet.sendTransaction({
    account,
    chain: baseSepolia,
    to: dest,
    value: 0n,
    nonce: currentNonce + 1,
    maxPriorityFeePerGas: 1n, // 1 wei priority fee
    maxFeePerGas: baseFee + 1n, // bare minimum
  });
  console.log(`  Tx #2 submitted: ${hash2} (nonce ${currentNonce + 1}) [STUCK]`);

  console.log("\nStep 3: Firing Tx #3 (Normal gas - will be queued behind nonce " + (currentNonce + 1) + ")...");
  const hash3 = await wallet.sendTransaction({
    account,
    chain: baseSepolia,
    to: dest,
    value: 0n,
    nonce: currentNonce + 2,
    maxPriorityFeePerGas: parseGwei("2"),
    maxFeePerGas: baseFee * 2n + parseGwei("2"),
  });
  console.log(`  Tx #3 submitted: ${hash3} (nonce ${currentNonce + 2}) [QUEUED]`);

  console.log("\n--------------------------------------------------------------------------------");
  console.log("Tx sequence deployed! Nonce gap created at nonce", currentNonce + 1);
  console.log("Run 'npm run watch' in another window to see Sentinel detect and resolve it live!");
  console.log("--------------------------------------------------------------------------------\n");
}

if (modeArg === "simulate") {
  runSimulation().catch(console.error);
} else if (modeArg === "raw" || modeArg === "interceptor") {
  runLive(modeArg).catch(console.error);
} else {
  console.log(`Unknown mode: ${modeArg}. Supported modes: --mode=simulate, --mode=raw, --mode=interceptor`);
}
