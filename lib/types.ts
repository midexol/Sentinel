export interface NonceGapEvent {
  id: string;
  timestamp: string;
  type: "GAP_DETECTED" | "HEALING_DISPATCHED" | "GAP_RESOLVED" | "TICK" | "CIRCUIT_BREAKER_TRIP";
  account: string;
  nonceExpected: number;
  nonceReceived: number;
  gapSize: number;
  stalledNonce: number;
  txHash?: string;
  bumpPercentage?: number;
  status: "pending" | "healed" | "failed" | "monitoring";
  latencyMs: number;
  diagnosis?: string;
}

export interface SentinelState {
  currentBlock: number;
  latestNonce: number;
  pendingNonce: number;
  totalGapsResolved: number;
  activeKeystores: number;
  avgResolutionMs: number;
  systemStatus: "OPERATIONAL" | "HEALING" | "DEGRADED";
  circuitBreakerStatus: "ARMED" | "TRIPPED";
  breakerTripPct: number;
  monitoredAccounts: Array<{
    address: string;
    label: string;
    latestNonce: number;
    pendingNonce: number;
    gap: number;
    status: "HEALTHY" | "STALLED" | "HEALING";
    balanceWei: string;
  }>;
}

export interface MetricPoint {
  time: string;
  latencyMs: number;
  gasBumpPct: number;
  gaps: number;
}
