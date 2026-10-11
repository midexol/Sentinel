import fs from "node:fs";
import path from "node:path";

/**
 * Small JSON-file-backed state shared between Sentinel processes (proxy,
 * watchdog, daemon) that mount the same STATE_FILE. Every access re-reads
 * the file so separate processes observe each other's writes; writes are
 * atomic (tmp file + rename). All operations are synchronous, so within one
 * process read-modify-write cycles cannot interleave.
 *
 * With no file path the state lives in memory only.
 */
export interface PersistedTx {
  hash: string;
  nonce: number;
  to: string;
  value: string;
  data: string;
  gasLimit: string;
  maxPriorityFeePerGas: string;
  maxFeePerGas: string;
  submittedAt: number;
}

export interface PersistedBreaker {
  tripped: boolean;
  trippedAt: number | null;
  failures: number[];
}

export interface PersistedControl {
  /** Operator pause: stop gap resolution and let the proxy forward transactions untouched. */
  halted: boolean;
}

export interface PersistedState {
  txs: Record<string, PersistedTx>;
  breaker: PersistedBreaker;
  control: PersistedControl;
}

function emptyState(): PersistedState {
  return { txs: {}, breaker: { tripped: false, trippedAt: null, failures: [] }, control: { halted: false } };
}

export class StateFile {
  private memory: PersistedState = emptyState();

  constructor(private readonly filePath: string | null = null) {}

  read(): PersistedState {
    if (!this.filePath) return this.memory;
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        txs: parsed.txs ?? {},
        breaker: { ...emptyState().breaker, ...(parsed.breaker ?? {}) },
        control: { ...emptyState().control, ...(parsed.control ?? {}) },
      };
    } catch {
      return emptyState();
    }
  }

  write(state: PersistedState): void {
    if (!this.filePath) {
      this.memory = state;
      return;
    }
    fs.mkdirSync(path.dirname(path.resolve(this.filePath)), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state), "utf-8");
    fs.renameSync(tmp, this.filePath);
  }

  update(mutate: (state: PersistedState) => void): void {
    const state = this.read();
    mutate(state);
    this.write(state);
  }
}
