import fs from "node:fs";
import path from "node:path";
import { StateFile } from "@/src/state";
import { auditLogPath } from "@/lib/server/audit";

/**
 * Operator controls (halt / resume / reset breaker) are delivered to the
 * daemon through the shared STATE_FILE, which both processes read on every
 * loop. This only works when the web app and the daemon share a filesystem
 * (e.g. the all-in-one Docker container); otherwise the file is simply absent.
 */
export function stateFilePath(): string | null {
  const raw = process.env.STATE_FILE;
  if (raw === "") return null;
  return path.resolve(process.cwd(), raw ?? "./sentinel-state.json");
}

export function openState(): StateFile | null {
  const file = stateFilePath();
  return file ? new StateFile(file) : null;
}

export function readControlState(): { available: boolean; halted: boolean; breakerTripped: boolean } {
  const file = stateFilePath();
  if (!file || !fs.existsSync(file)) return { available: Boolean(file), halted: false, breakerTripped: false };
  const s = new StateFile(file).read();
  return { available: true, halted: s.control.halted, breakerTripped: s.breaker.tripped };
}

/** Append one audit line, matching the format the daemon's logger writes. */
export function appendAudit(action: string, extra: Record<string, unknown> = {}): void {
  const entry = {
    action,
    wallet: process.env.WALLET_ADDRESS ?? "",
    source: "dashboard",
    ...extra,
    timestamp: new Date().toISOString(),
  };
  try {
    fs.appendFileSync(auditLogPath(), JSON.stringify(entry) + "\n", "utf-8");
  } catch {
    // best-effort: the control action itself already took effect
  }
}
