import { createPublicClient, http, type PublicClient } from "viem";
import { baseSepolia, base } from "viem/chains";
import type { SentinelConfig } from "./config.js";
import { StateFile, type PersistedTx } from "./state.js";

/**
 * A transaction the Sentinel knows it sent (or was told about) and is
 * tracking until it confirms. Base has no public "list pending txs for an
 * address" RPC method, so the Sentinel has to be the source of truth for
 * its own in-flight transactions - see PendingTxStore below.
 */
export interface TrackedTx {
  hash: `0x${string}`;
  nonce: number;
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  gasLimit: bigint;
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
  submittedAt: number; // ms epoch, used for eviction timeout
}

export interface NonceState {
  latestNonce: number; // confirmed, on-chain
  pendingNonce: number; // includes Flashblocks pre-confirmations
  trackedTxs: TrackedTx[];
}

export interface GapInfo {
  gapNonce: number;
  stuckTx: TrackedTx | null;
}

/** A recent Sentinel event, shared with the diagnosis prompt. */
export interface RecentEvent {
  timestamp: number;
  kind: "gap" | "eviction" | "resolved" | "failed";
}

/** Keep a bounded rolling list of recent events. */
export function recordEvent(events: RecentEvent[], kind: RecentEvent["kind"]): void {
  events.push({ timestamp: Date.now(), kind });
  if (events.length > 50) events.shift();
}

function serialize(tx: TrackedTx): PersistedTx {
  return {
    hash: tx.hash,
    nonce: tx.nonce,
    to: tx.to,
    value: tx.value.toString(),
    data: tx.data,
    gasLimit: tx.gasLimit.toString(),
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas.toString(),
    maxFeePerGas: tx.maxFeePerGas.toString(),
    submittedAt: tx.submittedAt,
  };
}

function deserialize(tx: PersistedTx): TrackedTx {
  return {
    hash: tx.hash as `0x${string}`,
    nonce: tx.nonce,
    to: tx.to as `0x${string}`,
    value: BigInt(tx.value),
    data: tx.data as `0x${string}`,
    gasLimit: BigInt(tx.gasLimit),
    maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas),
    maxFeePerGas: BigInt(tx.maxFeePerGas),
    submittedAt: tx.submittedAt,
  };
}

/**
 * Record of transactions this Sentinel has submitted, keyed by nonce.
 * Backed by a StateFile so the proxy and the watchdog (separate processes)
 * share one view; in-memory when constructed without one.
 */
export class PendingTxStore {
  constructor(private readonly state: StateFile = new StateFile(null)) {}

  add(tx: TrackedTx): void {
    this.state.update((s) => {
      s.txs[String(tx.nonce)] = serialize(tx);
    });
  }

  remove(nonce: number): void {
    this.state.update((s) => {
      delete s.txs[String(nonce)];
    });
  }

  /** Drop every tracked tx below `nonce` - those nonces are already mined. */
  pruneBelow(nonce: number): void {
    const stale = Object.keys(this.state.read().txs).filter((k) => Number(k) < nonce);
    if (stale.length === 0) return;
    this.state.update((s) => {
      for (const k of stale) delete s.txs[k];
    });
  }

  get(nonce: number): TrackedTx | undefined {
    const tx = this.state.read().txs[String(nonce)];
    return tx ? deserialize(tx) : undefined;
  }

  all(): TrackedTx[] {
    return Object.values(this.state.read().txs)
      .map(deserialize)
      .sort((a, b) => a.nonce - b.nonce);
  }
}

export type TxStatus = "pending" | "confirmed" | "not_found" | "unknown";

export class NonceTracker {
  private readonly client: PublicClient;

  constructor(
    private readonly config: SentinelConfig,
    private readonly store: PendingTxStore
  ) {
    this.client = createPublicClient({
      chain: config.chain === "sepolia" ? baseSepolia : base,
      transport: http(config.rpcUrl),
    }) as PublicClient;
  }

  /**
   * Reads both nonce tags per Base's own guidance: "latest" is confirmed
   * on-chain state, "pending" additionally includes Flashblocks
   * pre-confirmations and updates roughly every 200ms. The gap between
   * them is where stuck transactions hide.
   */
  async getNonceState(): Promise<NonceState> {
    const [latestNonce, pendingNonce] = await Promise.all([
      this.client.getTransactionCount({
        address: this.config.walletAddress,
        blockTag: "latest",
      }),
      this.client.getTransactionCount({
        address: this.config.walletAddress,
        blockTag: "pending",
      }),
    ]);

    // Anything below the confirmed nonce is mined; stop tracking it so it
    // can't be mistaken for an in-flight transaction.
    this.store.pruneBelow(latestNonce);

    return { latestNonce, pendingNonce, trackedTxs: this.store.all() };
  }

  /**
   * Walks the nonce sequence starting from the confirmed nonce and finds
   * the first gap - a nonce that should exist (because a higher nonce is
   * already pending) but has no confirmed or tracked transaction filling it.
   */
  async detectGap(): Promise<GapInfo | null> {
    const { latestNonce, pendingNonce, trackedTxs } = await this.getNonceState();
    return NonceTracker.findGap(latestNonce, pendingNonce, trackedTxs);
  }

  /** Pure gap-finding logic, separated from RPC access so it can be tested. */
  static findGap(latestNonce: number, pendingNonce: number, trackedTxs: TrackedTx[]): GapInfo | null {
    if (pendingNonce <= latestNonce) {
      return null; // nothing in flight, nothing to gap
    }

    const byNonce = new Map(trackedTxs.map((tx) => [tx.nonce, tx]));
    let expectedNonce = latestNonce;
    for (const tx of [...trackedTxs].sort((a, b) => a.nonce - b.nonce)) {
      if (tx.nonce < latestNonce) continue; // already mined
      if (tx.nonce === expectedNonce) {
        expectedNonce += 1;
      } else if (tx.nonce > expectedNonce) {
        // We jumped past expectedNonce without seeing it - that's the gap.
        return { gapNonce: expectedNonce, stuckTx: byNonce.get(expectedNonce) ?? null };
      }
    }

    if (expectedNonce < pendingNonce) {
      // Every tracked tx accounted for, but the chain still reports more
      // pending nonces than we have transactions for.
      return { gapNonce: expectedNonce, stuckTx: byNonce.get(expectedNonce) ?? null };
    }

    return null;
  }

  /**
   * True once a transaction has a receipt. A "not found" answer means not
   * confirmed yet; any other RPC failure is rethrown so callers don't act
   * (and resubmit) on the basis of a network blip.
   */
  async isConfirmed(hash: `0x${string}`): Promise<boolean> {
    try {
      const receipt = await this.client.getTransactionReceipt({ hash });
      return receipt !== null;
    } catch (err) {
      if (err instanceof Error && err.name === "TransactionReceiptNotFoundError") return false;
      throw err;
    }
  }

  /** True if some transaction with this nonce has already been mined. */
  async isNonceMined(nonce: number): Promise<boolean> {
    const latest = await this.client.getTransactionCount({
      address: this.config.walletAddress,
      blockTag: "latest",
    });
    return latest > nonce;
  }

  /**
   * Distinguishes "still sitting in the mempool" from "the node has no
   * record of this transaction at all" - the latter, sustained past the
   * eviction timeout, is how the Sentinel infers an eviction (Base has no
   * direct "evicted" event to subscribe to). An RPC failure is reported as
   * "unknown" so it is never confused with an eviction.
   */
  async getTransactionStatus(hash: `0x${string}`): Promise<TxStatus> {
    try {
      const tx = await this.client.getTransaction({ hash });
      return tx.blockNumber ? "confirmed" : "pending";
    } catch (err) {
      if (err instanceof Error && err.name === "TransactionNotFoundError") return "not_found";
      return "unknown";
    }
  }

  async getCurrentBaseFee(): Promise<bigint> {
    const block = await this.client.getBlock({ blockTag: "latest" });
    return block.baseFeePerGas ?? 0n;
  }

  async getPriorityFeeEstimate(): Promise<bigint> {
    return this.client.estimateMaxPriorityFeePerGas();
  }

  /** Recent base fee / priority fee percentiles, for the diagnostic agent. */
  async getFeeHistory(blockCount: number) {
    return this.client.getFeeHistory({ blockCount, rewardPercentiles: [25, 50, 75] });
  }

  /** Latest block number + timestamp, for the sequencer-health diagnostic. */
  async getLatestBlockInfo(): Promise<{ number: bigint; timestamp: bigint; chainId: number }> {
    const [block, chainId] = await Promise.all([
      this.client.getBlock({ blockTag: "latest" }),
      this.client.getChainId(),
    ]);
    return { number: block.number, timestamp: block.timestamp, chainId };
  }

  /** Broadcasts an already-signed raw transaction as-is. Used by the interceptor. */
  async broadcastRaw(serializedTransaction: `0x${string}`): Promise<`0x${string}`> {
    return this.client.sendRawTransaction({ serializedTransaction });
  }
}
