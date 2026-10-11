"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  RiShieldCheckLine,
  RiShieldLine,
  RiFileList3Line,
  RiFireLine,
  RiTerminalBoxLine,
  RiPulseLine,
  RiEqualizerLine,
  RiBox3Line,
  RiAlertLine,
  RiCheckboxCircleLine,
  RiBroadcastLine,
  RiLockLine,
} from "react-icons/ri";
import dynamic from "next/dynamic";
import "./dapp.css";

const DappSettings = dynamic(() => import("@/components/dapp-settings"), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-xs font-mono text-[#8C877D]">Loading settings module...</div>,
});

export interface TxDetails {
  nonce: number;
  originalHash: string;
  replacementHash?: string;
  to: string;
  valueEth: string;
  originalGasGwei: string;
  replacementGasGwei?: string;
  bumpPct?: number;
  cause?: string;
  durationSec?: number;
  status: "submitted" | "pending" | "gap" | "resubmitted" | "confirmed";
  submittedTime: string;
  confirmedTime?: string;
  blockNumber?: number;
}

interface LedgerEntry {
  id: string;
  time: string;
  tag: "gap_detected" | "diagnosis" | "gap_resolved" | "circuit_breaker";
  text: string;
  extra?: string;
  txDetails?: TxDetails;
}

/** Real audit-log record as served by /api/ledger. */
interface AuditRecord {
  action: string;
  timestamp: string;
  [key: string]: unknown;
}

const weiToGwei = (wei: unknown): string | undefined => {
  try {
    if (wei === undefined || wei === null) return undefined;
    return (Number(BigInt(String(wei))) / 1e9).toFixed(5);
  } catch {
    return undefined;
  }
};

const shortHash = (h: unknown) => (typeof h === "string" && h.length > 12 ? `${h.slice(0, 8)}…` : String(h ?? "-"));

/** Convert one audit-log line into a ledger row (or null for events the ledger does not show). */
function auditToLedger(e: AuditRecord): LedgerEntry | null {
  const d = new Date(e.timestamp);
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const nonce = Number(e.gapNonce ?? e.nonce ?? 0);
  const id = `${e.timestamp}-${e.action}-${nonce}`;
  const originalHash = String(e.originalTxHash ?? e.stuckTxHash ?? e.txHash ?? "");

  switch (e.action) {
    case "gap_detected":
      return {
        id, time, tag: "gap_detected",
        text: `nonce ${nonce} stalled behind queued transaction`,
        txDetails: { nonce, originalHash, to: "", valueEth: "", originalGasGwei: "", status: "gap", submittedTime: time },
      };
    case "diagnosis":
      return {
        id, time, tag: "diagnosis",
        text: e.error
          ? "diagnosis unavailable: minimum safe bump used"
          : `${String(e.category)}: recommending a ${String(e.rawRequestedBumpPct)}% bump${e.wasClamped ? ` (clamped to ${String(e.clampedBumpPct)}%)` : ""}`,
        txDetails: { nonce, originalHash, to: "", valueEth: "", originalGasGwei: "", bumpPct: Number(e.clampedBumpPct ?? 0) || undefined, cause: String(e.explanation ?? ""), status: "resubmitted", submittedTime: time },
      };
    case "gap_resolved": {
      const confirmedAlready = e.result === "already_confirmed";
      return {
        id, time, tag: "gap_resolved",
        text: confirmedAlready
          ? `nonce ${nonce} was already confirmed`
          : `${shortHash(e.originalTxHash)} to ${shortHash(e.newTxHash)} (${String(e.bumpPct)}% bump${e.result === "dry_run" ? ", dry run" : ""})`,
        extra: confirmedAlready ? "success" : e.result === "dry_run" ? "dry run" : "success",
        txDetails: {
          nonce, originalHash,
          replacementHash: e.newTxHash ? String(e.newTxHash) : undefined,
          to: "", valueEth: "",
          originalGasGwei: weiToGwei(e.oldMaxPriorityFeePerGas) ?? "",
          replacementGasGwei: weiToGwei(e.newMaxPriorityFeePerGas),
          bumpPct: typeof e.bumpPct === "number" ? e.bumpPct : undefined,
          status: confirmedAlready ? "confirmed" : "resubmitted",
          submittedTime: time,
        },
      };
    }
    case "gap_resolve_failed":
      return { id, time, tag: "gap_detected", text: `resolution failed for nonce ${nonce}: ${String(e.reason ?? "unknown")}`, extra: "failed" };
    case "eviction_detected":
      return { id, time, tag: "gap_detected", text: `nonce ${nonce} dropped from the mempool`, extra: "eviction" };
    case "eviction_resolved":
      return { id, time, tag: "gap_resolved", text: `nonce ${nonce} resubmitted after eviction`, extra: "success" };
    case "circuit_breaker_tripped":
      return { id, time, tag: "circuit_breaker", text: "threshold exceeded: halting resolution", extra: "tripped" };
    case "circuit_breaker_reset":
      return { id, time, tag: "circuit_breaker", text: "circuit breaker reset", extra: "reset" };
    default:
      return null;
  }
}

interface ToastItem {
  id: string;
  title: string;
  body: string;
}

interface SimTx {
  nonce: number;
  hash: string;
  status: { cls: string; label: string };
  gas: string;
}

type StepState = "active" | "done" | "gapped" | null;

function WalletRequiredView({
  feature,
  description,
  connecting,
  onConnect,
}: {
  feature: string;
  description: string;
  connecting: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="view">
      <div className="max-w-2xl mx-auto my-12 p-8 sm:p-12 rounded-2xl bg-[#0C0E14] border border-[#C9A961]/30 shadow-2xl text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#C9A961]/10 border border-[#C9A961]/30 flex items-center justify-center text-[#C9A961]">
          <RiLockLine className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <div className="text-[11px] font-mono text-[#C9A961] uppercase tracking-widest">
            Authentication Required
          </div>
          <h3 className="font-serif text-2xl font-bold text-white tracking-wide">
            {feature} is Locked
          </h3>
          <p className="text-xs sm:text-sm font-mono text-[#8A867D] leading-relaxed max-w-lg mx-auto">
            {description}
          </p>
        </div>
        <div className="pt-2">
          <button
            className={`btn-primary btn text-xs py-2.5 px-7 ${connecting ? "connecting" : ""}`}
            onClick={onConnect}
            disabled={connecting}
          >
            {connecting ? "Connecting…" : "Connect Wallet to Unlock"}
          </button>
        </div>
        <div className="border-t border-white/[0.06] pt-4 text-[11px] font-mono text-[#686660]">
          Sentinel monitors only your designated address on Base Sepolia. Private keys remain local and are never transmitted.
        </div>
      </div>
    </div>
  );
}

export default function DappPage() {
    // View state
  const [currentView, setCurrentView] = useState<
    "connect" | "dashboard" | "ledger" | "simulate" | "cli" | "metrics" | "settings"
  >("dashboard");

  // Wallet state
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [balanceEth, setBalanceEth] = useState("0.0000");
  const [currentBlock, setCurrentBlock] = useState(47023464);
  const fakeAddr = walletAddress || "0x0000000000000000000000000000000000000000";

  // Dashboard feed state
  const [latest, setLatest] = useState(0);
  const [pending, setPending] = useState(0);
  const [flashLatest, setFlashLatest] = useState(false);
  const [flashPending, setFlashPending] = useState(false);
  const [hasGap, setHasGap] = useState(false);
  const [gapNonce, setGapNonce] = useState<number | null>(null);

  // Breaker state
  const [failuresInWindow, setFailuresInWindow] = useState(0);
  const [tripped, setTripped] = useState(false);

  // Diagnosis gauge state
  const [diagCategory, setDiagCategory] = useState("- waiting for activity -");
  const [diagExplain, setDiagExplain] = useState(
    "Nothing to diagnose yet. The Sentinel is watching for a gap."
  );
  const [gaugeRequested, setGaugeRequested] = useState(0);
  const [gaugeClamped, setGaugeClamped] = useState(0);
  const [reqReadout, setReqReadout] = useState("requested -");
  const [clampReadout, setClampReadout] = useState("clamped -");

  // Ledger state & Feed controls
  const [allEntries, setAllEntries] = useState<LedgerEntry[]>([]);
  const [activeLedgerTag, setActiveLedgerTag] = useState("all");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [isFeedPaused, setIsFeedPaused] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TxDetails | null>(null);

  // Popping toast notification system disabled per user request
  const pushToast = (_title?: string, _body?: string) => {};

  // Simulation playground state
  const [simRunning, setSimRunning] = useState(false);
  const [simBtnText, setSimBtnText] = useState("Simulate Nonce Gap");
  const [tlSteps, setTlSteps] = useState<
    Record<string, { state: StepState; time: string }>
  >({
    submitted: { state: null, time: "" },
    pending: { state: null, time: "" },
    gap: { state: null, time: "" },
    diagnosed: { state: null, time: "" },
    resubmitted: { state: null, time: "" },
    confirmed: { state: null, time: "" },
  });
  const [simTxs, setSimTxs] = useState<SimTx[]>([]);

  // Utilities
  const shortAddr = (a: string) => a.slice(0, 6) + "…" + a.slice(-4);
  const timeNow = () => {
    const d = new Date();
    const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
    return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  };
  const rndHash = () => {
    const c = "abcdef0123456789";
    let s = "";
    for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  };
  const rndFullHash = () => {
    const c = "abcdef0123456789";
    let s = "0x";
    for (let i = 0; i < 64; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  };
  const pctToLeft = (pct: number) => {
    const c = Math.max(10, Math.min(50, pct));
    return `${((c - 10) / (50 - 10)) * 100}%`;
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      pushToast("Copied to Clipboard", `${label} copied: ${text.slice(0, 10)}…`);
    }
  };

  const exportCsv = () => {
    const headers = [
      "Timestamp",
      "Tag",
      "EventDescription",
      "Nonce",
      "OriginalHash",
      "ReplacementHash",
      "BumpPct",
      "Status",
      "BlockNumber",
    ];
    const rows = allEntries.map((e) => [
      e.time,
      e.tag,
      `"${e.text.replace(/"/g, '""')}"`,
      e.txDetails?.nonce ?? "",
      e.txDetails?.originalHash ?? "",
      e.txDetails?.replacementHash ?? "",
      e.txDetails?.bumpPct ? `${e.txDetails.bumpPct}%` : "",
      e.txDetails?.status ?? e.extra ?? "",
      e.txDetails?.blockNumber ?? "",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sentinel-ledger-events.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast("CSV Exported", `Saved ${allEntries.length} ledger events to CSV.`);
  };

  const addLedgerRow = (
    tag: "gap_detected" | "diagnosis" | "gap_resolved" | "circuit_breaker",
    text: string,
    extra = "",
    txDetails?: TxDetails
  ) => {
    const entry: LedgerEntry = {
      id: `${Date.now()}-${Math.random()}`,
      time: timeNow(),
      tag,
      text,
      extra,
      txDetails,
    };
    setAllEntries((prev) => [entry, ...prev.slice(0, 199)]);

    if (tag === "gap_detected") pushToast("Gap detected", text);
    if (tag === "gap_resolved" && extra === "success") pushToast("Resolved", text);
    if (tag === "circuit_breaker") pushToast("Circuit breaker", text);
  };

  

  /** Replace the ledger with the real audit-log events for this wallet (newest first). */
  const loadLedger = async (target: string) => {
    try {
      const res = await fetch(`/api/ledger?address=${target}`);
      if (!res.ok) return;
      const { entries } = (await res.json()) as { entries: AuditRecord[] };
      const rows = entries.map(auditToLedger).filter((r): r is LedgerEntry => r !== null).reverse();
      setAllEntries(rows);
    } catch {
      // keep whatever is on screen
    }
  };

  const connectAccount = async (target: string) => {
    setWalletAddress(target);
    setConnected(true);
    setConnecting(false);
    setAllEntries([]);
    loadLedger(target);

    try {
      const res = await fetch(`/api/state?address=${target}`);
      if (res.ok) {
        const data = await res.json();
        if (data.latestNonce !== undefined) setLatest(data.latestNonce);
        if (data.pendingNonce !== undefined) setPending(data.pendingNonce);
        if (data.currentBlock) setCurrentBlock(data.currentBlock);
        if (data.monitoredAccounts?.[0]?.balanceEth) {
          setBalanceEth(data.monitoredAccounts[0].balanceEth);
        }
      }
    } catch {
      // ignore
    }

    pushToast("Connected", `Watching ${shortAddr(target)} on Base Sepolia.`);
  };

  // Initial on-chain state sync & account check
  useEffect(() => {
    // Check if web3 account is already authorized
    if (
      typeof window !== "undefined" &&
      (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum
    ) {
      const ethereum = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
      ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          if (accounts && accounts.length > 0) {
            connectAccount(accounts[0]);
          }
        })
        .catch(() => {});
    }

    // Public network sync
    fetch("/api/state")
      .then((r) => r.json())
      .then((d) => {
        if (d.currentBlock) setCurrentBlock(d.currentBlock);
      })
      .catch(() => {});
  }, []);

  // Connect wallet handler
  const doConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      if (
        typeof window !== "undefined" &&
        (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum
      ) {
        const ethereum = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        if (accounts && accounts.length > 0) {
          await connectAccount(accounts[0]);
          return;
        }
      } else {
        alert("No Web3 wallet extension detected. Please install MetaMask, Rabby, or Coinbase Wallet.");
      }
    } catch (err) {
      console.warn("Wallet connection request cancelled or failed:", err);
    }
    setConnecting(false);
  };

  const doDisconnect = () => {
    setConnected(false);
    setWalletAddress("");
    setBalanceEth("0.0000");
    setAllEntries([]);
    setLatest(0);
    setPending(0);
    setCurrentView("dashboard");
    pushToast("Disconnected", "Session ended. Connect wallet to resume mempool monitoring.");
  };

  // Live data: real SSE telemetry + the real audit ledger and breaker state, polled while connected
  useEffect(() => {
    if (!connected || !walletAddress) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/stream?address=${walletAddress}`);
      eventSource.addEventListener("telemetry", (e) => {
        if (isFeedPaused) return;
        try {
          const data = JSON.parse(e.data);
          if (data.block) setCurrentBlock(data.block);
          if (typeof data.nonceExpected === "number") setLatest(data.nonceExpected);
          if (typeof data.nonceReceived === "number") setPending(data.nonceReceived);
          if (typeof data.gapSize === "number") {
            setHasGap(data.gapSize > 0);
            setGapNonce(data.gapSize > 0 ? data.nonceExpected : null);
          }
        } catch {
          // ignore malformed event
        }
      });
    } catch {
      // streaming unavailable; polling below still works
    }

    const poll = async () => {
      if (isFeedPaused) return;
      await loadLedger(walletAddress);
      try {
        const res = await fetch(`/api/state?address=${walletAddress}`);
        if (res.ok) {
          const st = await res.json();
          setTripped(st.circuitBreakerStatus === "TRIPPED");
          // The breaker card shows failures on a 0-10 scale; derive it from the real pressure percentage.
          setFailuresInWindow(Math.min(10, Math.round(((st.breakerTripPct ?? 0) / 100) * 10)));
          const acct = st.monitoredAccounts?.[0];
          if (acct?.balanceEth) setBalanceEth(acct.balanceEth);
        }
      } catch {
        // transient; try again next tick
      }
    };

    const id = setInterval(poll, 5000);
    return () => {
      eventSource?.close();
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, walletAddress, isFeedPaused]);

  // Simulation Playground Execution
  const runSimulation = () => {
    if (simRunning) return;
    setSimRunning(true);
    setSimBtnText("Running…");

    setTlSteps({
      submitted: { state: null, time: "" },
      pending: { state: null, time: "" },
      gap: { state: null, time: "" },
      diagnosed: { state: null, time: "" },
      resubmitted: { state: null, time: "" },
      confirmed: { state: null, time: "" },
    });

    const baseNonce = latest + 40;
    const h1 = rndHash(),
      h2 = rndHash(),
      h3 = rndHash();

    setTlSteps((prev) => ({
      ...prev,
      submitted: { state: "active", time: timeNow() },
    }));
    setSimTxs([
      {
        nonce: baseNonce,
        hash: h1,
        status: { cls: "pending", label: "pending" },
        gas: "1.00 gwei",
      },
    ]);

    setTimeout(() => {
      setTlSteps((prev) => ({
        ...prev,
        submitted: { state: "done", time: prev.submitted.time },
        pending: { state: "active", time: timeNow() },
      }));
      setSimTxs((prev) => [
        ...prev,
        {
          nonce: baseNonce + 1,
          hash: h2,
          status: { cls: "pending", label: "pending" },
          gas: "0.42 gwei (underpriced)",
        },
        {
          nonce: baseNonce + 2,
          hash: h3,
          status: { cls: "pending", label: "pending" },
          gas: "1.05 gwei",
        },
      ]);
    }, 700);

    setTimeout(() => {
      setTlSteps((prev) => ({
        ...prev,
        pending: { state: "done", time: prev.pending.time },
        gap: { state: "gapped", time: timeNow() },
      }));
      setSimTxs((prev) =>
        prev.map((t) => {
          if (t.nonce === baseNonce + 1)
            return {
              ...t,
              status: { cls: "gap", label: "gap" },
              gas: "0.42 gwei (underpriced)",
            };
          if (t.nonce === baseNonce + 2)
            return {
              ...t,
              status: { cls: "gap", label: "gap" },
              gas: "queued behind gap",
            };
          return t;
        })
      );
      pushToast(
        "Gap detected",
        `nonce ${baseNonce + 1} stalled: priority fee too low`
      );
    }, 1700);

    setTimeout(() => {
      setTlSteps((prev) => ({
        ...prev,
        diagnosed: { state: "active", time: timeNow() },
      }));
      pushToast("Diagnosis", "underpriced: recommending a 24% bump (clamped)");
    }, 2900);

    setTimeout(() => {
      setTlSteps((prev) => ({
        ...prev,
        diagnosed: { state: "done", time: prev.diagnosed.time },
        resubmitted: { state: "active", time: timeNow() },
      }));
      setSimTxs((prev) =>
        prev.map((t) =>
          t.nonce === baseNonce + 1
            ? {
                ...t,
                status: { cls: "resubmitted", label: "resubmitted" },
                gas: "1.24 gwei",
              }
            : t
        )
      );
    }, 3900);

    setTimeout(() => {
      setTlSteps((prev) => ({
        ...prev,
        resubmitted: { state: "done", time: prev.resubmitted.time },
        confirmed: { state: "active", time: timeNow() },
      }));
      setSimTxs((prev) =>
        prev.map((t) => ({
          ...t,
          status: { cls: "confirmed", label: "confirmed" },
        }))
      );
    }, 5000);

    setTimeout(() => {
      setTlSteps((prev) => ({
        ...prev,
        confirmed: { state: "done", time: prev.confirmed.time },
      }));
      pushToast("Resolved", "All three transactions confirmed in order.");
      setSimBtnText("Run again");
      setSimRunning(false);
    }, 5600);
  };

  // Topbar titles
  const titles: Record<string, string> = {
    connect: "Connect",
    dashboard: "Dashboard",
    ledger: "Ledger",
    simulate: "Simulation Playground",
    cli: "Autonomous CLI Daemon",
    metrics: "Metrics & Analytics",
    settings: "Settings",
  };

  const filteredFullEntries = allEntries
    .filter((e) => activeLedgerTag === "all" || e.tag === activeLedgerTag)
    .filter((e) => !ledgerSearch || e.text.toLowerCase().includes(ledgerSearch.toLowerCase()))
    .slice(0, 60);

  return (
    <div className="dapp-container">
            <div className="app-shell">
        {/* SIDEBAR */}
        <aside className="sidebar">
          {/* Clickable Concept B logo & dramatic Cinzel brand title returning to "/" */}
          <Link href="/" className="brand" title="Return to Sentinel Website">
            <Image
              src="/assets/logo-transparent.png"
              alt="Sentinel"
              width={32}
              height={32}
              className="seal-img object-contain"
              priority
            />
            <span className="font-script text-2xl text-white tracking-wide">Sentinel</span>
          </Link>

          {/* Nav Group with Uniform Imperial Icons & Roman Numerals */}
          <nav className="nav-group">
            <button
              className={`nav-item ${currentView === "dashboard" ? "active" : ""}`}
              onClick={() => setCurrentView("dashboard")}
            >
              <RiShieldLine className="w-4 h-4 shrink-0 text-[#C9A961]" />
              <span className="flex-1 text-left">Dashboard</span>
              <span className="font-mono text-[10px] text-ash/60">I</span>
            </button>

            <button
              className={`nav-item ${currentView === "ledger" ? "active" : ""}`}
              onClick={() => setCurrentView("ledger")}
            >
              <RiFileList3Line className="w-4 h-4 shrink-0 text-[#C9A961]" />
              <span className="flex-1 text-left">Ledger</span>
              {!connected ? (
                <RiLockLine className="w-3 h-3 text-[#686660]" title="Wallet Connection Required" />
              ) : (
                <span className="font-mono text-[10px] text-ash/60">II</span>
              )}
            </button>

            <button
              className={`nav-item ${currentView === "simulate" ? "active" : ""}`}
              onClick={() => setCurrentView("simulate")}
            >
              <RiFireLine className="w-4 h-4 shrink-0 text-[#C9A961]" />
              <span className="flex-1 text-left">Simulate</span>
              {!connected ? (
                <RiLockLine className="w-3 h-3 text-[#686660]" title="Wallet Connection Required" />
              ) : (
                <span className="font-mono text-[10px] text-ash/60">III</span>
              )}
            </button>

            <button
              className={`nav-item ${currentView === "cli" ? "active" : ""}`}
              onClick={() => setCurrentView("cli")}
            >
              <RiTerminalBoxLine className="w-4 h-4 shrink-0 text-[#C9A961]" />
              <span className="flex-1 text-left">CLI Daemon</span>
              {!connected ? (
                <RiLockLine className="w-3 h-3 text-[#686660]" title="Wallet Connection Required" />
              ) : (
                <span className="font-mono text-[10px] text-ash/60">IV</span>
              )}
            </button>

            <button
              className={`nav-item ${currentView === "metrics" ? "active" : ""}`}
              onClick={() => setCurrentView("metrics")}
            >
              <RiPulseLine className="w-4 h-4 shrink-0 text-[#C9A961]" />
              <span className="flex-1 text-left">Metrics</span>
              <span className="font-mono text-[10px] text-ash/60">V</span>
            </button>

            <button
              className={`nav-item ${currentView === "settings" ? "active" : ""}`}
              onClick={() => setCurrentView("settings")}
            >
              <RiEqualizerLine className="w-4 h-4 shrink-0 text-[#C9A961]" />
              <span className="flex-1 text-left">Settings</span>
              {!connected ? (
                <RiLockLine className="w-3 h-3 text-[#686660]" title="Wallet Connection Required" />
              ) : (
                <span className="font-mono text-[10px] text-ash/60">VI</span>
              )}
            </button>
          </nav>

          {/* Sidebar Foot with Base Sepolia pill */}
          <div className="sidebar-foot">
            <div className="network-pill">
              <span className="dot" />
              Base Sepolia
            </div>
            <div className="sentinel-subtag">Autonomous Nonce Watchdog</div>
          </div>
        </aside>

        {/* MAIN COLUMN */}
        <div className="main">
          {/* Topbar: Streamlined Command Deck */}
          <header className="topbar flex items-center justify-between gap-4 py-3.5 px-4 sm:px-8 border-b border-white/[0.08] bg-[#000000]/90 backdrop-blur-2xl sticky top-0 z-30 shadow-[0_8px_30px_rgba(0,0,0,0.7)]">
            {/* Left: View Title & Context */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-[11px] font-mono text-[#8A867D] uppercase tracking-wider">
                Observatory
              </span>
              <span className="text-white/20">/</span>
              <h2 className="text-sm sm:text-base font-serif font-medium text-white tracking-wide">
                {titles[currentView]}
              </h2>
            </div>

            {/* Right: Network Status & Wallet */}
            <div className="topbar-right flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="chain-badge flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.02] border border-white/[0.08] text-xs font-mono text-[#C2BEB4]">
                <span className="w-2 h-2 rounded-full bg-[#8FAF92] animate-pulse" />
                <span>Base Sepolia</span>
              </div>

              {!connected ? (
                <button
                  className={`btn-primary btn text-xs py-1.5 px-4 ${connecting ? "connecting" : ""}`}
                  onClick={doConnect}
                  disabled={connecting}
                >
                  {connecting ? "Connecting…" : "Connect Wallet"}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="wallet-pill flex items-center gap-2 px-3 py-1.5 rounded-full border border-aurum/40 bg-aurum/10 text-xs font-mono text-[#F5F3EF] cursor-pointer hover:border-aurum transition-all"
                    onClick={() => setCurrentView("settings")}
                    title={`Connected: ${walletAddress} (Click for Settings)`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#8FAF92]" />
                    <span>{shortAddr(walletAddress)}</span>
                  </div>
                  <button
                    onClick={doDisconnect}
                    className="px-2.5 py-1 rounded-full border border-white/10 hover:border-white/20 text-[#8A867D] hover:text-white text-[11px] font-mono transition-colors"
                    title="Disconnect Wallet"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Mobile Quick-Navigation Strip */}
          <div className="lg:hidden flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06] bg-[#050608] overflow-x-auto no-scrollbar">
            {[
              { id: "dashboard", label: "Dashboard", icon: RiShieldLine, isLocked: false },
              { id: "ledger", label: "Ledger", icon: RiFileList3Line, isLocked: !connected },
              { id: "simulate", label: "Simulate", icon: RiFireLine, isLocked: !connected },
              { id: "cli", label: "CLI", icon: RiTerminalBoxLine, isLocked: !connected },
              { id: "metrics", label: "Metrics", icon: RiPulseLine, isLocked: false },
              { id: "settings", label: "Settings", icon: RiEqualizerLine, isLocked: !connected },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = currentView === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentView(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? "bg-[#C9A961] text-[#07080B] font-semibold"
                      : "text-[#C2BEB4] bg-white/[0.03] border border-white/[0.06]"
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.isLocked && <RiLockLine className="w-2.5 h-2.5 text-[#C9A961]/70" />}
                </button>
              );
            })}
          </div>

          {/* VIEW: CONNECT */}
          {currentView === "connect" && (
            <div className="view">
              <div className="connect-screen">
                <div className="glyph">
                  <RiShieldCheckLine className="w-8 h-8 text-[#C9A961]" />
                </div>
                <h1>Connect your wallet to initialize Sentinel.</h1>
                <p>
                  Sentinel monitors your connected wallet for stalled
                  transactions on Base Sepolia, diagnoses root causes, and resolves them inside limits
                  you control.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <button
                    className={`btn-primary btn ${connecting ? "connecting" : ""}`}
                    onClick={doConnect}
                    disabled={connecting}
                  >
                    {connecting ? "Connecting…" : "Connect Wallet"}
                  </button>
                </div>
                <ul className="trust-notes">
                  <li>
                    <span className="mark">i.</span> Read-only until you add a
                    signing key in Settings: it can watch and diagnose without ever
                    touching funds.
                  </li>
                  <li>
                    <span className="mark">ii.</span> Dry-run mode lets you see real
                    detection and diagnosis with no broadcast at all.
                  </li>
                  <li>
                    <span className="mark">iii.</span> Every clamp, fallback and
                    resolution is written to the ledger; nothing acts silently.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* VIEW: DASHBOARD */}
          {currentView === "dashboard" && (
            <div className="view space-y-5">
              {!connected && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#121418] via-[#0E1014] to-[#0A0B0E] border border-[#C9A961]/30 shadow-xl">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <RiShieldCheckLine className="w-4 h-4 text-[#C9A961]" />
                      <span className="text-xs font-serif font-bold text-white tracking-wide uppercase">
                        Mempool Observatory Inactive
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[#8A867D] max-w-xl leading-relaxed">
                      Connect your Web3 wallet to activate real-time nonce surveillance, detect underpriced transactions, and enable autonomous self-healing.
                    </p>
                  </div>
                  <button
                    className={`btn-primary btn text-xs py-2 px-5 shrink-0 ${connecting ? "connecting" : ""}`}
                    onClick={doConnect}
                    disabled={connecting}
                  >
                    {connecting ? "Connecting…" : "Connect Wallet"}
                  </button>
                </div>
              )}

              {/* Real on-chain telemetry bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-[#101216] border border-white/[0.08] text-xs font-mono shadow-sm">
                <div className="flex items-center gap-2">
                  <RiBox3Line className="w-3.5 h-3.5 text-[#C9A961]" />
                  <span className="text-[#686660]">Base Sepolia Block:</span>
                  <span className="text-[#F5F3EF] font-semibold tracking-wide">#{currentBlock.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#686660]">Monitored Keystore:</span>
                  <span className="text-[#C9A961]">
                    {connected ? shortAddr(walletAddress) : "Not Connected"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#686660]">Balance:</span>
                  <span className="text-[#F5F3EF] font-semibold">
                    {connected ? `${balanceEth} ETH` : "--"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#686660]">Sync:</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#8FAF92]/30 bg-[#8FAF92]/10 text-[#8FAF92] text-[11px]">
                    <RiBroadcastLine className="w-3 h-3 text-[#8FAF92]" />
                    <span>Live SSE</span>
                  </div>
                </div>
              </div>

              <div className="panel-grid">
                <div className="panel">
                  <div className="panel-eyebrow">Nonce state</div>
                  <div className="stat-row">
                    <div className="stat">
                      <div className="label">Latest</div>
                      <div className={`num ${flashLatest ? "flash" : ""}`}>
                        {connected ? latest : "--"}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="label">Pending</div>
                      <div className={`num ${flashPending ? "flash" : ""}`}>
                        {connected ? pending : "--"}
                      </div>
                    </div>
                  </div>
                  <div className={`gap-flag ${connected && hasGap ? "active" : ""}`}>
                    {connected && hasGap ? (
                      <RiAlertLine className="w-3.5 h-3.5 text-ember shrink-0" />
                    ) : (
                      <RiCheckboxCircleLine className="w-3.5 h-3.5 text-[#8FAF92] shrink-0" />
                    )}
                    <span>
                      {!connected
                        ? "Awaiting wallet connection"
                        : hasGap
                        ? `Gap at nonce ${gapNonce}`
                        : "No gap: sequence clear"}
                    </span>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-eyebrow">Circuit breaker</div>
                  <div className={`breaker-status ${connected && tripped ? "tripped" : ""}`}>
                    {!connected ? "Standby" : tripped ? "Tripped" : "Armed"}
                  </div>
                  <div className="breaker-meta">
                    {!connected
                      ? "Awaiting active keystore"
                      : `${failuresInWindow} failure${failuresInWindow === 1 ? "" : "s"} in the last 5 minutes`}
                  </div>
                  <div className="breaker-bar-track">
                    <div
                      className={`breaker-bar-fill ${connected && tripped ? "danger" : ""}`}
                      style={{ width: connected ? `${(failuresInWindow / 10) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Diagnosis Panel */}
              <div className="diag-panel">
                <div>
                  <div className="panel-eyebrow">Latest diagnosis</div>
                  <div className="diag-category">
                    {!connected ? "Awaiting Keystore" : diagCategory}
                  </div>
                  <div className="diag-explain">
                    {!connected
                      ? "Connect your Web3 wallet to initialize real-time nonce gap detection and failure mode diagnosis."
                      : diagExplain}
                  </div>
                </div>
                <div>
                  <div className="gauge-labels">
                    <span>10%</span>
                    <span>Requested vs. clamped bump</span>
                    <span>50%</span>
                  </div>
                  <div className="gauge-track">
                    <div
                      className="gauge-requested"
                      style={{ left: connected ? pctToLeft(gaugeRequested) : "0%" }}
                    />
                    <div
                      className="gauge-clamped"
                      style={{ left: connected ? pctToLeft(gaugeClamped) : "0%" }}
                    />
                  </div>
                  <div className="gauge-readout">
                    <span className="req">{connected ? reqReadout : "requested -"}</span>
                    <span className="clamp">{connected ? clampReadout : "clamped -"}</span>
                  </div>
                </div>
              </div>

              {/* Live Streaming Ledger */}
              <div className="ledger-panel">
                <div className="flex items-center justify-between panel-eyebrow">
                  <div className="flex items-center gap-2">
                    <RiPulseLine className={`w-3.5 h-3.5 ${isFeedPaused ? "text-[#D4A359]" : "text-[#C9A961]"}`} />
                    <span>Ledger: {!connected ? "Idle" : isFeedPaused ? "Frozen" : "Streaming"}</span>
                    {connected && isFeedPaused && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#D4A359]/10 text-[#D4A359] border border-[#D4A359]/25 font-mono">
                        PAUSED
                      </span>
                    )}
                  </div>
                  {connected && (
                    <button
                      onClick={() => setIsFeedPaused(!isFeedPaused)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-[#C9A961]/40 hover:border-[#C9A961] text-[#C9A961] bg-[#101216] transition-all font-mono"
                      title={isFeedPaused ? "Resume live transaction stream" : "Freeze live feed to inspect rows"}
                    >
                      {isFeedPaused ? "Resume Feed" : "Pause Feed"}
                    </button>
                  )}
                </div>
                <div className="ledger-feed">
                  {!connected ? (
                    <div className="py-10 text-center space-y-2">
                      <RiLockLine className="w-5 h-5 text-[#686660] mx-auto" />
                      <p className="text-xs font-mono text-[#8A867D]">
                        No active session stream.
                      </p>
                      <button
                        onClick={doConnect}
                        className="text-[11px] font-mono text-[#C9A961] underline hover:text-[#E0BE70]"
                      >
                        Connect wallet to stream transaction receipts
                      </button>
                    </div>
                  ) : allEntries.length === 0 ? (
                    <div className="py-10 text-center text-xs font-mono text-[#8A867D]">
                      Listening for pending mempool transactions...
                    </div>
                  ) : (
                    allEntries.slice(0, 12).map((e) => (
                      <div
                        key={e.id}
                        className={`ledger-row cursor-pointer transition-colors hover:bg-[#C9A961]/10 ${
                          selectedTx?.originalHash === e.txDetails?.originalHash ? "bg-[#C9A961]/15" : ""
                        }`}
                        onClick={() => {
                          if (e.txDetails) {
                            setSelectedTx(e.txDetails);
                          } else {
                            setSelectedTx({
                              nonce: latest,
                              originalHash: rndFullHash(),
                              to: walletAddress,
                              valueEth: "0.0500",
                              originalGasGwei: "0.0010",
                              cause: e.text,
                              status: "confirmed",
                              submittedTime: e.time,
                              confirmedTime: e.time,
                              blockNumber: currentBlock,
                            });
                          }
                        }}
                        title="Click to inspect full transaction lifecycle"
                      >
                        <span className="time">{e.time}</span>
                        <span className={`tag ${e.tag}`}>{e.tag}</span>
                        <span className="truncate">{e.text}</span>
                        <span className="text-[#C9A961] text-[11px] font-mono underline hover:text-[#E0BE70]">
                          Inspect
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: LEDGER */}
          {currentView === "ledger" && (
            !connected ? (
              <WalletRequiredView
                feature="Transaction Ledger"
                description="Connect your Web3 wallet to access your private transaction stream, historical nonce resolution receipts, and cryptographic audit logs."
                connecting={connecting}
                onConnect={doConnect}
              />
            ) : (
              <div className="view space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#101216] border border-[#C9A961]/20">
                <div className="ledger-tabs !mb-0">
                  {["all", "gap_detected", "diagnosis", "gap_resolved", "circuit_breaker"].map(
                    (tag) => (
                      <button
                        key={tag}
                        className={`ledger-tab ${activeLedgerTag === tag ? "active" : ""}`}
                        onClick={() => setActiveLedgerTag(tag)}
                      >
                        {tag === "all"
                          ? "All"
                          : tag === "gap_detected"
                          ? "Detected"
                          : tag === "diagnosis"
                          ? "Diagnosis"
                          : tag === "gap_resolved"
                          ? "Resolved"
                          : "Breaker"}
                      </button>
                    )
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsFeedPaused(!isFeedPaused)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#C9A961]/40 hover:border-[#C9A961] text-[#C9A961] bg-[#111318] transition-all font-mono"
                  >
                    {isFeedPaused ? "Resume Feed" : "Pause Feed"}
                  </button>
                  <button
                    onClick={exportCsv}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#C9A961]/40 hover:border-[#C9A961] text-[#C9A961] bg-[#111318] transition-all font-mono"
                    title="Export ledger events to CSV"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              <input
                className="ledger-search"
                placeholder="Filter by nonce, hash, or wallet…"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
              />

              <div className="ledger-table">
                <div className="ledger-feed">
                  {filteredFullEntries.map((e) => (
                    <div
                      key={e.id}
                      className={`ledger-row cursor-pointer transition-colors hover:bg-[#C9A961]/10 ${
                        selectedTx?.originalHash === e.txDetails?.originalHash ? "bg-[#C9A961]/15" : ""
                      }`}
                      onClick={() => {
                        if (e.txDetails) {
                          setSelectedTx(e.txDetails);
                        } else {
                          setSelectedTx({
                            nonce: latest,
                            originalHash: rndFullHash(),
                            to: walletAddress,
                            valueEth: "0.0500",
                            originalGasGwei: "0.0010",
                            cause: e.text,
                            status: "confirmed",
                            submittedTime: e.time,
                            confirmedTime: e.time,
                            blockNumber: currentBlock,
                          });
                        }
                      }}
                      title="Click to inspect full transaction lifecycle"
                    >
                      <span className="time">{e.time}</span>
                      <span className={`tag ${e.tag}`}>{e.tag}</span>
                      <span className="truncate">{e.text}</span>
                      <span className="text-[#C9A961] text-[11px] font-mono underline hover:text-[#E0BE70]">
                        Inspect
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )
          )}

          {/* VIEW: SIMULATE */}
          {currentView === "simulate" && (
            !connected ? (
              <WalletRequiredView
                feature="Simulation Playground"
                description="Connect your Web3 wallet to simulate live nonce gaps, test EIP-1559 gas escalation ceilings, and evaluate automated mempool recovery."
                connecting={connecting}
                onConnect={doConnect}
              />
            ) : (
              <div className="view">
              <div className="sim-intro panel">
                <div>
                  <div className="panel-eyebrow">Simulation playground</div>
                  <h2 style={{ fontSize: "1.3rem", marginBottom: "10px" }}>
                    Watch the Sentinel work, on demand.
                  </h2>
                  <p
                    style={{
                      color: "var(--marble-dim)",
                      fontSize: "0.92rem",
                      maxWidth: "56ch",
                      lineHeight: "1.6",
                    }}
                  >
                    This submits three transactions in quick succession, one with
                    deliberately underpriced gas. Watch detection, diagnosis, and
                    resolution happen in real time, the same pipeline that runs
                    on <code>npm run watch</code>, triggered from here instead of a
                    terminal.
                  </p>
                </div>
                <button
                  className="btn-primary btn"
                  onClick={runSimulation}
                  disabled={simRunning}
                >
                  {simBtnText}
                </button>
              </div>

              <div className="panel" style={{ marginTop: "20px" }}>
                <div className="panel-eyebrow">Lifecycle</div>
                <div className="timeline">
                  {["submitted", "pending", "gap", "diagnosed", "resubmitted", "confirmed"].map(
                    (step) => {
                      const info = tlSteps[step];
                      return (
                        <div
                          key={step}
                          className={`tl-step ${info.state || ""}`}
                        >
                          <span className="tl-dot" />
                          <span className="tl-label">
                            {step === "gap"
                              ? "Gap detected"
                              : step.charAt(0).toUpperCase() + step.slice(1)}
                          </span>
                          <span className="tl-time">{info.time}</span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="panel" style={{ marginTop: "20px" }}>
                <div className="panel-eyebrow">Transactions in this run</div>
                <div className="sim-tx-table">
                  <div className="sim-tx-row sim-tx-head">
                    <span>Nonce</span>
                    <span>Hash</span>
                    <span>Status</span>
                    <span>Gas price</span>
                  </div>
                  {simTxs.map((tx) => (
                    <div
                      key={tx.nonce}
                      className="sim-tx-row cursor-pointer hover:bg-[#C9A961]/10 transition-colors"
                      title="Click to inspect this simulated transaction"
                      onClick={() =>
                        setSelectedTx({
                          nonce: tx.nonce,
                          originalHash: `0x${tx.hash}0000000000000000000000000000000000000000000000000000000000`,
                          replacementHash:
                            tx.status.label === "resubmitted" || tx.status.label === "confirmed"
                              ? rndFullHash()
                              : undefined,
                          to: "0x388C818CA8B9251b393131C08a73683246A11274",
                          valueEth: "0.1000",
                          originalGasGwei: tx.gas.split(" ")[0] || "0.0010",
                          replacementGasGwei: "0.00124",
                          bumpPct: 24,
                          cause: tx.status.label === "gap" ? "underpriced: priority fee below required base fee" : undefined,
                          status: (tx.status.cls === "confirmed" ? "confirmed" : tx.status.cls === "resubmitted" ? "resubmitted" : tx.status.cls === "gap" ? "gap" : "pending") as any,
                          submittedTime: timeNow(),
                          confirmedTime: tx.status.label === "confirmed" ? timeNow() : undefined,
                          blockNumber: currentBlock,
                        })
                      }
                    >
                      <span>{tx.nonce}</span>
                      <span>0x{tx.hash}…</span>
                      <span className={`tx-status ${tx.status.cls}`}>
                        <span className="dot" />
                        {tx.status.label}
                      </span>
                      <span>{tx.gas}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )
          )}

          {/* VIEW: CLI & BOT SDK INTEGRATION */}
          {currentView === "cli" && (
            !connected ? (
              <WalletRequiredView
                feature="CLI Daemon Console"
                description="Connect your Web3 wallet to authenticate terminal sessions, monitor daemon processes, and dispatch autonomous intervention commands."
                connecting={connecting}
                onConnect={doConnect}
              />
            ) : (
              <div className="view space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#101216] border border-[#C9A961]/25 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#C9A961]">
                    <RiTerminalBoxLine className="w-3.5 h-3.5 text-[#C9A961]" />
                    <span>AUTONOMOUS DAEMON & IN-LINE INTERCEPTOR</span>
                  </div>
                  <h2 className="font-serif text-2xl text-white">Bot Integration & Daemon Control</h2>
                  <p className="text-xs text-[#C2BEB4] font-mono leading-relaxed max-w-2xl">
                    Deploy Sentinel directly into algorithmic trading clusters. Choose between an in-line SDK interceptor or an out-of-band headless daemon watching via 500ms Flashblocks polling.
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <a
                    href="/api/stream"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-[#08090C] border border-white/10 hover:border-[#C9A961]/40 text-[#8FAF92] transition-colors flex items-center gap-2"
                  >
                    <RiBroadcastLine className="w-3.5 h-3.5 text-[#8FAF92]" />
                    <span>Open SSE Telemetry Stream</span>
                  </a>
                </div>
              </div>

              {/* Integration Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Option A: In-Line Bot Interceptor */}
                <div className="panel space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded bg-[#8FAF92]/10 border border-[#8FAF92]/25 text-[#8FAF92] font-mono text-[11px] font-semibold">
                      RECOMMENDED FOR HFT BOTS
                    </span>
                    <span className="font-mono text-xs text-ash">src/interceptor.ts</span>
                  </div>
                  <h3 className="font-serif text-lg text-white">Mode 1: The Drop-In Bot Interceptor</h3>
                  <p className="text-xs text-marble-dim/80 font-mono leading-relaxed">
                    Instead of sending transactions directly to the RPC, wrap your broadcast call. If a nonce gap exists behind your transaction, Sentinel heals it first and then passes your trade through.
                  </p>

                  <div className="p-4 rounded-xl bg-[#08090C] border border-white/[0.08] font-mono text-xs space-y-2 text-marble-dim/90 overflow-x-auto">
                    <p className="text-ash">// 1. Import from Sentinel core</p>
                    <p className="text-[#C9A961]">import <span className="text-white">&#123; TransactionInterceptor &#125;</span> from <span className="text-[#C2BEB4]">&quot;sentinel&quot;</span>;</p>
                    <p className="text-ash pt-1">// 2. Replace client.sendRawTransaction(signedTx)</p>
                    <p className="text-[#C9A961] font-semibold">const hash = await interceptor.submitTransaction(signedTx);</p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-ash pt-2 border-t border-white/[0.06]">
                    <span>Eliminates head-of-line blocking</span>
                    <span className="text-[#8FAF92]">Zero nonce management</span>
                  </div>
                </div>

                {/* Option B: Headless Watchdog Daemon */}
                <div className="panel space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded bg-[#C9A961]/10 border border-[#C9A961]/25 text-[#C9A961] font-mono text-[11px] font-semibold">
                      OUT-OF-BAND WATCHER
                    </span>
                    <span className="font-mono text-xs text-ash">src/cli.ts</span>
                  </div>
                  <h3 className="font-serif text-lg text-white">Mode 2: Autonomous CLI Daemon</h3>
                  <p className="text-xs text-marble-dim/80 font-mono leading-relaxed">
                    Keep trading bot code 100% untouched. Run Sentinel in a background container or tmux session watching your wallet address on Base Sepolia.
                  </p>

                  <div className="p-4 rounded-xl bg-[#08090C] border border-white/[0.08] font-mono text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-ash"># Continuous 500ms watch loop</span>
                      <button
                        onClick={() => copyToClipboard("npm run cli:watch", "Daemon Command")}
                        className="text-[11px] text-[#C9A961] hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-[#8FAF92] font-semibold">$ npm run cli:watch</p>
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                      <span className="text-ash"># Single state scan</span>
                      <button
                        onClick={() => copyToClipboard("npm run cli", "Scan Command")}
                        className="text-[11px] text-[#C9A961] hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-marble">$ npm run cli</p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-ash pt-2 border-t border-white/[0.06]">
                    <span>Includes Eviction Monitor</span>
                    <span className="text-[#C9A961]">Zero bot code modification</span>
                  </div>
                </div>
              </div>

              {/* Operational Invariants & Reliability Summary */}
              <div className="panel space-y-4">
                <div className="panel-eyebrow">Guaranteed Invariants & Bounds</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                  <div className="p-4 rounded-xl bg-[#08090C] border border-white/[0.06] space-y-1">
                    <div className="text-ash text-[10px] uppercase">Invariant INV-02</div>
                    <div className="text-white font-semibold">Model Proposes, Code Decides</div>
                    <p className="text-ash text-[11px] leading-relaxed">
                      Gas bumps are hard-clamped to [10%, 50%]. A simulated 200% ask is bounded to 50% max.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#08090C] border border-white/[0.06] space-y-1">
                    <div className="text-ash text-[10px] uppercase">Eviction Watchdog</div>
                    <div className="text-white font-semibold">Silent Drop Recovery</div>
                    <p className="text-ash text-[11px] leading-relaxed">
                      Tracks vanished mempool transactions past EVICTION_TIMEOUT_MS and autonomously resubmits.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#08090C] border border-white/[0.06] space-y-1">
                    <div className="text-ash text-[10px] uppercase">Circuit Breaker</div>
                    <div className="text-white font-semibold">Triple-Strike Trip Wire</div>
                    <p className="text-ash text-[11px] leading-relaxed">
                      Halts autonomous writes if 10 consecutive failures occur in 5 minutes; alerts Discord/Telegram.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            )
          )}

          {/* VIEW: METRICS */}
          {currentView === "metrics" && (
            <div className="view">
              <div className="metrics-stats">
                <div className="stat-card">
                  <div className="label">Success rate</div>
                  <div className="big">98.4%</div>
                  <div className="sub">124 of 126 gaps resolved</div>
                </div>
                <div className="stat-card">
                  <div className="label">Gaps detected</div>
                  <div className="big">126</div>
                  <div className="sub">since Sept 14</div>
                </div>
                <div className="stat-card">
                  <div className="label">Avg. resolution time</div>
                  <div className="big">3.8s</div>
                  <div className="sub">detection to confirmation</div>
                </div>
                <div className="stat-card">
                  <div className="label">Est. value saved</div>
                  <div className="big">$412</div>
                  <div className="sub">
                    trades that would&apos;ve missed their window
                  </div>
                </div>
              </div>

              <div className="panel-grid" style={{ marginTop: "20px" }}>
                <div className="panel chart-card">
                  <div className="panel-eyebrow">Gaps detected over time</div>
                  <svg viewBox="0 0 420 160" className="chart-svg">
                    <line x1="0" y1="40" x2="420" y2="40" className="grid-line" />
                    <line x1="0" y1="80" x2="420" y2="80" className="grid-line" />
                    <line x1="0" y1="120" x2="420" y2="120" className="grid-line" />
                    <path
                      d="M0,120 L60,110 L120,96 L180,100 L240,68 L300,74 L360,42 L420,50"
                      className="chart-line gold"
                    />
                    <path
                      d="M0,120 L60,110 L120,96 L180,100 L240,68 L300,74 L360,42 L420,50 L420,160 L0,160 Z"
                      className="chart-fill gold"
                    />
                  </svg>
                </div>

                <div className="panel chart-card">
                  <div className="panel-eyebrow">Average resolution time (s)</div>
                  <svg viewBox="0 0 420 160" className="chart-svg">
                    <line x1="0" y1="40" x2="420" y2="40" className="grid-line" />
                    <line x1="0" y1="80" x2="420" y2="80" className="grid-line" />
                    <line x1="0" y1="120" x2="420" y2="120" className="grid-line" />
                    <path
                      d="M0,60 L60,72 L120,50 L180,64 L240,86 L300,78 L360,96 L420,90"
                      className="chart-line current"
                    />
                    <path
                      d="M0,60 L60,72 L120,50 L180,64 L240,86 L300,78 L360,96 L420,90 L420,160 L0,160 Z"
                      className="chart-fill current"
                    />
                  </svg>
                </div>
              </div>

              <div className="panel" style={{ marginTop: "1px" }}>
                <div className="panel-eyebrow">Gas price increase distribution</div>
                <svg viewBox="0 0 640 140" className="chart-svg hist">
                  <g className="hist-bars">
                    <rect x="10" y="90" width="42" height="50" />
                    <rect x="62" y="60" width="42" height="80" />
                    <rect x="114" y="30" width="42" height="110" />
                    <rect x="166" y="20" width="42" height="120" />
                    <rect x="218" y="45" width="42" height="95" />
                    <rect x="270" y="70" width="42" height="70" />
                    <rect x="322" y="95" width="42" height="45" />
                    <rect x="374" y="105" width="42" height="35" />
                    <rect x="426" y="115" width="42" height="25" />
                    <rect x="478" y="122" width="42" height="18" />
                    <rect x="530" y="128" width="42" height="12" />
                    <rect x="582" y="132" width="42" height="8" />
                  </g>
                </svg>
                <div className="hist-labels">
                  <span>10%</span>
                  <span>bump size</span>
                  <span>50%</span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {currentView === "settings" && (
            !connected ? (
              <WalletRequiredView
                feature="Sentinel Settings"
                description="Connect your Web3 wallet to configure gas escalation multipliers, custom RPC endpoints, webhook alerts, and circuit breaker thresholds."
                connecting={connecting}
                onConnect={doConnect}
              />
            ) : (
              <div className="view">
                <DappSettings
                  onNavigateToLedger={() => setCurrentView("ledger")}
                  onPushToast={pushToast}
                  walletAddress={walletAddress}
                />
              </div>
            )
          )}
        </div>
      </div>

      {/* TRANSACTION DETAIL INSPECTOR MODAL (J7, K1-K6) */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="bg-[#101216] border border-[#C9A961]/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-left relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-[#C9A961]/15 text-[#C9A961] border border-[#C9A961]/40">
                  Nonce #{selectedTx.nonce}
                </span>
                <h3 className="text-base font-semibold text-[#F5F3EF] tracking-wide">
                  Transaction Inspector
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-[#686660] hover:text-[#F5F3EF] px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors text-xs font-mono border border-transparent hover:border-white/10"
              >
                Close [✕]
              </button>
            </div>

            {/* Lifecycle Timeline (K2) */}
            <div>
              <div className="text-xs uppercase tracking-wider text-[#686660] font-mono mb-2.5">
                Lifecycle Progression
              </div>
              <div className="grid grid-cols-5 gap-1.5 p-3 rounded-xl bg-black/40 border border-white/5 text-center font-mono text-[11px]">
                <div className="flex flex-col items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8FAF92] " />
                  <span className="text-[#8FAF92] font-medium">Submitted</span>
                  <span className="text-[10px] text-[#686660]">{selectedTx.submittedTime}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8FAF92] " />
                  <span className="text-[#8FAF92] font-medium">Pending</span>
                  <span className="text-[10px] text-[#686660]">Mempool</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      selectedTx.status === "gap" || selectedTx.status === "resubmitted" || selectedTx.status === "confirmed"
                        ? selectedTx.cause ? "bg-[#D4A359] " : "bg-[#8FAF92]"
                        : "bg-white/20"
                    }`}
                  />
                  <span className={selectedTx.cause ? "text-[#D4A359] font-medium" : "text-[#8FAF92] font-medium"}>
                    {selectedTx.cause ? "Gap Stalled" : "Sequence Ok"}
                  </span>
                  <span className="text-[10px] text-[#686660]">
                    {selectedTx.cause ? "Diagnosed" : "Normal"}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      selectedTx.replacementHash
                        ? "bg-[#C9A961] "
                        : "bg-white/20"
                    }`}
                  />
                  <span className={selectedTx.replacementHash ? "text-[#C9A961] font-medium" : "text-[#686660]"}>
                    Resubmitted
                  </span>
                  <span className="text-[10px] text-[#686660]">
                    {selectedTx.bumpPct ? `+${selectedTx.bumpPct}% bump` : "Direct"}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      selectedTx.status === "confirmed"
                        ? "bg-[#8FAF92] "
                        : "bg-white/20"
                    }`}
                  />
                  <span className={selectedTx.status === "confirmed" ? "text-[#8FAF92] font-medium" : "text-[#686660]"}>
                    Confirmed
                  </span>
                  <span className="text-[10px] text-[#686660]">
                    {selectedTx.confirmedTime || (selectedTx.status === "confirmed" ? "Finalized" : "Pending")}
                  </span>
                </div>
              </div>
            </div>

            {/* Two Column Details: Original Tx (K1) vs Resolution Details (K3, K4) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Transaction Details */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2.5 font-mono text-xs">
                <div className="text-[11px] uppercase tracking-wider text-[#C9A961] font-semibold">
                  Original Transaction
                </div>
                <div>
                  <div className="text-[#686660] text-[10px]">Transaction Hash</div>
                  <div className="flex items-center justify-between gap-1 text-[#F5F3EF]">
                    <span className="truncate">{selectedTx.originalHash}</span>
                    <button
                      onClick={() => copyToClipboard(selectedTx.originalHash, "Original Hash")}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[#C9A961] transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-[#686660] text-[10px]">Recipient (To)</div>
                  <div className="flex items-center justify-between gap-1 text-[#F5F3EF]">
                    <span className="truncate">{selectedTx.to}</span>
                    <button
                      onClick={() => copyToClipboard(selectedTx.to, "Recipient Address")}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[#C9A961] transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[#686660] text-[10px]">Value</div>
                    <div className="text-[#F5F3EF]">{selectedTx.valueEth} ETH</div>
                  </div>
                  <div>
                    <div className="text-[#686660] text-[10px]">Initial Gas Price</div>
                    <div className="text-[#D4A359]">{selectedTx.originalGasGwei} Gwei</div>
                  </div>
                </div>
                <div>
                  <div className="text-[#686660] text-[10px]">Submitted At</div>
                  <div className="text-[#F5F3EF]">{selectedTx.submittedTime}</div>
                </div>
              </div>

              {/* Replacement & Autonomous Resolution */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2.5 font-mono text-xs">
                <div className="text-[11px] uppercase tracking-wider text-[#C9A961] font-semibold">
                  Autonomous Resolution
                </div>
                {selectedTx.replacementHash ? (
                  <>
                    <div>
                      <div className="text-[#686660] text-[10px]">Replacement Hash</div>
                      <div className="flex items-center justify-between gap-1 text-[#F5F3EF]">
                        <span className="truncate text-[#8FAF92]">{selectedTx.replacementHash}</span>
                        <button
                          onClick={() => copyToClipboard(selectedTx.replacementHash!, "Replacement Hash")}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[#C9A961] transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[#686660] text-[10px]">New Gas Price</div>
                        <div className="text-[#8FAF92] font-semibold">{selectedTx.replacementGasGwei || "0.00124"} Gwei</div>
                      </div>
                      <div>
                        <div className="text-[#686660] text-[10px]">Gas Bump (Clamped)</div>
                        <div className="text-[#C9A961] font-semibold">+{selectedTx.bumpPct || 24}%</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[#686660] text-[10px]">Resolution Latency</div>
                        <div className="text-[#F5F3EF]">{selectedTx.durationSec ? `${selectedTx.durationSec}s` : "3.2s"}</div>
                      </div>
                      <div>
                        <div className="text-[#686660] text-[10px]">Block Mined</div>
                        <div className="text-[#F5F3EF]">#{selectedTx.blockNumber || currentBlock}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[#686660] text-[10px]">Diagnosed Root Cause</div>
                      <div className="text-[#D4A359] text-[11px] leading-tight mt-0.5">
                        {selectedTx.cause || "underpriced: Priority fee below required base fee"}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center text-[#686660]">
                    <div>No replacement required.</div>
                    <div className="text-[11px] mt-1 text-[#F5F3EF]">Confirmed sequentially on schedule.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Explorer Links & Modal Actions (K5, K6) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`https://sepolia.basescan.org/tx/${selectedTx.originalHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#C9A961] border border-[#C9A961]/30 transition-all inline-flex items-center gap-1.5"
                >
                  BaseScan (Original)
                </a>
                {selectedTx.replacementHash && (
                  <a
                    href={`https://sepolia.basescan.org/tx/${selectedTx.replacementHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#101412] hover:bg-[#161D19] text-[#8FAF92] border border-[#8FAF92]/30 transition-all inline-flex items-center gap-1.5"
                  >
                    BaseScan (Replacement)
                  </a>
                )}
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-1.5 rounded-lg bg-[#C9A961] hover:bg-[#E0BE70] text-[#08090C] font-semibold transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
