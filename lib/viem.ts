import { cached } from "@/lib/cache";
import {
  createPublicClient,
  http,
  formatEther as viemFormatEther,
  formatGwei as viemFormatGwei,
} from "viem";
import { base, baseSepolia } from "viem/chains";

/** Dashboard network: NEXT_PUBLIC_CHAIN (build-time) or CHAIN, defaulting to Base Sepolia. */
export const isMainnet = (process.env.NEXT_PUBLIC_CHAIN ?? process.env.CHAIN ?? "sepolia").toLowerCase() === "mainnet";

export const activeChain = isMainnet ? base : baseSepolia;
export const chainLabel = isMainnet ? "Base" : "Base Sepolia";
export const explorerBase = isMainnet ? "https://basescan.org" : "https://sepolia.basescan.org";

export const defaultRpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.RPC_URL ||
  (isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org");

export const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(defaultRpcUrl),
});

export const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** Latest block plus the measured round-trip time, shared for a few seconds across requests. */
export function probeRpc(): Promise<{ block: number; latencyMs: number }> {
  return cached("rpc:probe", 4000, async () => {
    const started = Date.now();
    const block = await Promise.race([
      publicClient.getBlockNumber(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    return { block: Number(block), latencyMs: Date.now() - started };
  });
}

/**
 * Reads the account's nonces, balance, block and gas price. Errors propagate
 * so callers can report an RPC failure instead of showing fabricated zeros.
 */
export function fetchOnChainAccountState(address: `0x${string}`) {
  return cached(`acct:${address.toLowerCase()}`, 5000, () => readAccountState(address));
}

async function readAccountState(address: `0x${string}`) {
  const [latestNonce, pendingNonce, balance, blockNumber, gasPrice] = await Promise.all([
    publicClient.getTransactionCount({ address, blockTag: "latest" }),
    publicClient.getTransactionCount({ address, blockTag: "pending" }),
    publicClient.getBalance({ address }),
    publicClient.getBlockNumber(),
    publicClient.getGasPrice(),
  ]);

  const latest = Number(latestNonce);
  const pending = Number(pendingNonce);

  return {
    latestNonce: latest,
    pendingNonce: pending,
    gap: Math.max(0, pending - latest),
    balanceWei: balance.toString(),
    balanceEth: Number(viemFormatEther(balance)).toFixed(4),
    currentBlock: Number(blockNumber),
    gasPriceGwei: formatGwei(gasPrice),
  };
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

export function truncateHash(hash: string, chars = 6): string {
  if (!hash) return "";
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.slice(0, chars + 2)}…${hash.slice(-chars)}`;
}

export function formatGwei(wei: bigint | string | number): string {
  try {
    const bigintVal = typeof wei === "bigint" ? wei : BigInt(wei);
    return Number(viemFormatGwei(bigintVal)).toFixed(3);
  } catch {
    return "0.000";
  }
}

export function formatEther(wei: bigint | string | number): string {
  try {
    const bigintVal = typeof wei === "bigint" ? wei : BigInt(wei);
    return Number(viemFormatEther(bigintVal)).toFixed(4);
  } catch {
    return "0.0000";
  }
}

export function getBaseScanTxUrl(hash: string): string {
  return `${explorerBase}/tx/${hash}`;
}

export function getBaseScanAddressUrl(address: string): string {
  return `${explorerBase}/address/${address}`;
}

export function getBaseScanBlockUrl(blockNumber: number | string): string {
  return `${explorerBase}/block/${blockNumber}`;
}
