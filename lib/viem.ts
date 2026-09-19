import {
  createPublicClient,
  http,
  formatEther as viemFormatEther,
  formatGwei as viemFormatGwei,
} from "viem";
import { baseSepolia } from "viem/chains";

export const defaultRpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.RPC_URL ||
  "https://sepolia.base.org";

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(defaultRpcUrl),
});

export async function fetchOnChainAccountState(address: `0x${string}`) {
  try {
    const [latestNonce, pendingNonce, balance, blockNumber, gasPrice] =
      await Promise.all([
        publicClient.getTransactionCount({ address, blockTag: "latest" }).catch(() => 0),
        publicClient.getTransactionCount({ address, blockTag: "pending" }).catch(() => 0),
        publicClient.getBalance({ address }).catch(() => 0n),
        publicClient.getBlockNumber().catch(() => 0n),
        publicClient.getGasPrice().catch(() => 0n),
      ]);

    const latest = Number(latestNonce);
    const pending = Number(pendingNonce);
    const gap = Math.max(0, pending - latest);

    return {
      latestNonce: latest,
      pendingNonce: pending,
      gap,
      balanceWei: balance.toString(),
      balanceEth: Number(viemFormatEther(balance)).toFixed(4),
      currentBlock: Number(blockNumber),
      gasPriceGwei: formatGwei(gasPrice),
    };
  } catch {
    return {
      latestNonce: 0,
      pendingNonce: 0,
      gap: 0,
      balanceWei: "0",
      balanceEth: "0.0000",
      currentBlock: 0,
      gasPriceGwei: "0.001",
    };
  }
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
  return `https://sepolia.basescan.org/tx/${hash}`;
}

export function getBaseScanAddressUrl(address: string): string {
  return `https://sepolia.basescan.org/address/${address}`;
}

export function getBaseScanBlockUrl(blockNumber: number | string): string {
  return `https://sepolia.basescan.org/block/${blockNumber}`;
}
