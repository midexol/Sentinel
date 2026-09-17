import { createPublicClient, http, type PublicClient } from "viem";
import { baseSepolia, base } from "viem/chains";
import type { SentinelConfig } from "./config.js";

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

/** In-memory record of transactions this Sentinel instance has submitted. */
export class PendingTxStore {
  private txs = new Map<number, TrackedTx>(); // keyed by nonce

  add(tx: TrackedTx): void {
    this.txs.set(tx.nonce, tx);
  }

  remove(nonce: number): void {
    this.txs.delete(nonce);
  }

  get(nonce: number): TrackedTx | undefined {
    return this.txs.get(nonce);
  }

  all(): TrackedTx[] {
    return [...this.txs.values()].sort((a, b) => a.nonce - b.nonce);
  }
}

export class NonceTracker {
  private readonly client: PublicClient;

  constructor(
    private readonly config: SentinelConfig,
    private readonly store: PendingTxStore,
    chainId: "sepolia" | "mainnet" = "sepolia"
  ) {
    this.client = createPublicClient({
      chain: chainId === "sepolia" ? baseSepolia : base,
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

    return { latestNonce, pendingNonce, trackedTxs: this.store.all() };
  }

  /**
   * Walks the nonce sequence starting from the confirmed nonce and finds
   * the first gap - a nonce that should exist (because a higher nonce is
   * already pending) but has no confirmed or tracked transaction filling it.
   */
  async detectGap(): Promise<GapInfo | null> {
    const { latestNonce, pendingNonce, trackedTxs } = await this.getNonceState();

    if (pendingNonce <= latestNonce) {
      return null; // nothing in flight, nothing to gap
    }

    let expectedNonce = latestNonce;
    for (const tx of trackedTxs) {
      if (tx.nonce === expectedNonce) {
        expectedNonce += 1;
      } else if (tx.nonce > expectedNonce) {
        // We jumped past expectedNonce without seeing it - that's the gap.
        return { gapNonce: expectedNonce, stuckTx: this.store.get(expectedNonce) ?? null };
      }
    }

    if (expectedNonce < pendingNonce) {
      // Every tracked tx accounted for, but the chain still reports more
      // pending nonces than we have transactions for.
      return { gapNonce: expectedNonce, stuckTx: this.store.get(expectedNonce) ?? null };
    }

    return null;
  }

  /** True once a transaction has a receipt - i.e. it's actually confirmed. */
  async isConfirmed(hash: `0x${string}`): Promise<boolean> {
    try {
      const receipt = await this.client.getTransactionReceipt({ hash });
      return receipt !== null;
    } catch {
      return false; // not found yet = not confirmed
    }
  }

  /**
   * Distinguishes "still sitting in the mempool" from "the node has no
   * record of this transaction at all" - the latter, sustained past the
   * eviction timeout, is how the Sentinel infers an eviction (Base has no
   * direct "evicted" event to subscribe to).
   */
  async getTransactionStatus(hash: `0x${string}`): Promise<"pending" | "confirmed" | "not_found"> {
    try {
      const tx = await this.client.getTransaction({ hash });
      return tx.blockNumber ? "confirmed" : "pending";
    } catch {
      return "not_found";
    }
  }

  async getCurrentBaseFee(): Promise<bigint> {
    const block = await this.client.getBlock({ blockTag: "latest" });
    return block.baseFeePerGas ?? 0n;
  }

  async getPriorityFeeEstimate(): Promise<bigint> {
    return this.client.estimateMaxPriorityFeePerGas();
  }

  /** Broadcasts an already-signed raw transaction as-is. Used by the interceptor. */
  async broadcastRaw(serializedTransaction: `0x${string}`): Promise<`0x${string}`> {
    return this.client.sendRawTransaction({ serializedTransaction });
  }
}
