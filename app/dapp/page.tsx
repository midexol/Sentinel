"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, AlertTriangle, Radio, Box, Activity, Terminal, Eye, Shield, Scroll, Flame, SlidersHorizontal, Crown, Landmark } from "lucide-react";
import DappSettings from "@/components/dapp-settings";
import "./dapp.css";

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

const initialMockEntries: LedgerEntry[] = [
  {
    id: "init-1",
    time: "12:34:18",
    tag: "gap_resolved",
    text: "0x8f2a9c1e… to 0x3d1c4b8f… (24% bump)",
    extra: "success",
    txDetails: {
      nonce: 127,
      originalHash: "0x8f2a9c1e7d4a5b6c3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d",
      replacementHash: "0x3d1c4b8f9e0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c",
      to: "0x388C818CA8B9251b393131C08a73683246A11274",
      valueEth: "0.1500",
      originalGasGwei: "0.0010",
      replacementGasGwei: "0.00124",
      bumpPct: 24,
      cause: "underpriced: Priority fee sits well below current network conditions",
      durationSec: 3.2,
      status: "confirmed",
      submittedTime: "12:34:14",
      confirmedTime: "12:34:18",
      blockNumber: 47023466,
    },
  },
  {
    id: "init-2",
    time: "12:34:15",
    tag: "diagnosis",
    text: "underpriced: recommending a 24% bump (clamped)",
    txDetails: {
      nonce: 127,
      originalHash: "0x8f2a9c1e7d4a5b6c3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d",
      to: "0x388C818CA8B9251b393131C08a73683246A11274",
      valueEth: "0.1500",
      originalGasGwei: "0.0010",
      bumpPct: 24,
      cause: "underpriced: Priority fee sits well below current network conditions",
      status: "resubmitted",
      submittedTime: "12:34:14",
    },
  },
  {
    id: "init-3",
    time: "12:34:14",
    tag: "gap_detected",
    text: "nonce 127 stalled behind queued transaction",
    txDetails: {
      nonce: 127,
      originalHash: "0x8f2a9c1e7d4a5b6c3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d",
      to: "0x388C818CA8B9251b393131C08a73683246A11274",
      valueEth: "0.1500",
      originalGasGwei: "0.0010",
      cause: "underpriced: Priority fee sits well below current network conditions",
      status: "gap",
      submittedTime: "12:34:14",
    },
  },
  {
    id: "init-4",
    time: "12:33:50",
    tag: "gap_resolved",
    text: "nonce 126 confirmed on schedule",
    extra: "success",
    txDetails: {
      nonce: 126,
      originalHash: "0x5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c",
      to: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      valueEth: "0.0250",
      originalGasGwei: "0.0012",
      status: "confirmed",
      submittedTime: "12:33:48",
      confirmedTime: "12:33:50",
      blockNumber: 47023464,
    },
  },
  {
    id: "init-5",
    time: "12:33:12",
    tag: "gap_resolved",
    text: "0x1e49c7a2… to 0x7b5a8f3d… (18% bump)",
    extra: "success",
    txDetails: {
      nonce: 125,
      originalHash: "0x1e49c7a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0",
      replacementHash: "0x7b5a8f3d2e1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a",
      to: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      valueEth: "0.5000",
      originalGasGwei: "0.0009",
      replacementGasGwei: "0.00106",
      bumpPct: 18,
      cause: "cache_desync: Pending-nonce cache briefly out of step with confirmed chain state",
      durationSec: 2.8,
      status: "confirmed",
      submittedTime: "12:33:08",
      confirmedTime: "12:33:12",
      blockNumber: 47023458,
    },
  },
];

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

export default function DappPage() {
    // View state
  const [currentView, setCurrentView] = useState<
    "connect" | "dashboard" | "ledger" | "simulate" | "cli" | "metrics" | "settings"
  >("dashboard");

  // Wallet state
  const [connected, setConnected] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState("0x859901345112F0812b06aF1858E623414E472D72");
  const [balanceEth, setBalanceEth] = useState("0.0000");
  const [currentBlock, setCurrentBlock] = useState(47023464);
  const fakeAddr = walletAddress;

  // Dashboard feed state
  const [latest, setLatest] = useState(127);
  const [pending, setPending] = useState(127);
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
  const [allEntries, setAllEntries] = useState<LedgerEntry[]>(initialMockEntries);
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

  

  // Initial on-chain state sync
  useEffect(() => {
    fetch("/api/state")
      .then((r) => r.json())
      .then((d) => {
        if (d.monitoredAccounts?.[0]?.address) {
          setWalletAddress(d.monitoredAccounts[0].address);
        }
        if (d.latestNonce !== undefined) {
          setLatest(d.latestNonce);
          setPending(d.pendingNonce !== undefined ? d.pendingNonce : d.latestNonce);
        }
        if (d.currentBlock) setCurrentBlock(d.currentBlock);
        if (d.monitoredAccounts?.[0]?.balanceEth) {
          setBalanceEth(d.monitoredAccounts[0].balanceEth);
        }
      })
      .catch(() => {});
  }, []);

  // Connect wallet handler
  const doConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    let target = walletAddress;
    let switchedToReal = false;
    try {
      if (
        typeof window !== "undefined" &&
        (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum
      ) {
        const ethereum = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        if (accounts && accounts.length > 0) {
          target = accounts[0];
          switchedToReal = true;
        }
      }
    } catch {
      // User cancelled or no web3 injected, fall back cleanly
    }

    setWalletAddress(target);
    if (switchedToReal) {
      setIsDemoMode(false);
    }

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

    setConnected(true);
    setConnecting(false);
    setCurrentView("dashboard");
    pushToast(
      switchedToReal ? "Connected" : "Demo Mode Active",
      `Watching ${shortAddr(target)} on Base Sepolia.`
    );
    addLedgerRow("gap_resolved", `Sentinel started: watching wallet ${shortAddr(target)}`);
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    setConnected(true);
    setCurrentView("dashboard");
    pushToast("Demo Mode Active", "Exploring Sentinel with live Base Sepolia telemetry.");
  };

  // Live feed simulation loop and onchain sync
  useEffect(() => {
    if (!connected) return;

    // Real SSE Live Stream
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/stream?address=${walletAddress}`);
      eventSource.addEventListener("telemetry", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.block) setCurrentBlock(data.block);
        } catch {
          // ignore
        }
      });
    } catch {
      // fallback
    }

    let timeoutId: NodeJS.Timeout;
    const categories = [
      { cat: "underpriced", text: "Priority fee sits well below current network conditions." },
      { cat: "cache_desync", text: "The pending-nonce cache looks briefly out of step with the confirmed chain state." },
      { cat: "eviction", text: "This transaction dropped from the mempool rather than merely stalling." },
    ];

    const runGapCycle = () => {
      if (isFeedPaused) return;
      const origHash = rndFullHash();
      const replHash = rndFullHash();

      setPending((prev) => {
        const nextPending = prev + 1;
        setFlashPending(true);
        setTimeout(() => setFlashPending(false), 500);
        return nextPending;
      });

      setLatest((currLatest) => {
        const gapNum = currLatest;
        setHasGap(true);
        setGapNonce(gapNum);
        const subTime = timeNow();
        addLedgerRow("gap_detected", `nonce ${gapNum} stalled behind queued transaction`, "", {
          nonce: gapNum,
          originalHash: origHash,
          to: "0x388C818CA8B9251b393131C08a73683246A11274",
          valueEth: "0.1500",
          originalGasGwei: "0.0010",
          status: "gap",
          submittedTime: subTime,
        });

        setTimeout(() => {
          if (isFeedPaused) return;
          const c = categories[Math.floor(Math.random() * categories.length)];
          const requested = Math.round(15 + Math.random() * 45);
          const clamped = Math.max(10, Math.min(50, requested));

          setDiagCategory(c.cat.replace("_", " "));
          setDiagExplain(c.text);
          setGaugeRequested(requested);
          setGaugeClamped(clamped);
          setReqReadout(`requested ${requested}%`);
          setClampReadout(`clamped ${clamped}%`);

          addLedgerRow(
            "diagnosis",
            `${c.cat}: recommending a ${requested}% bump${requested !== clamped ? ` (clamped to ${clamped}%)` : ""}`,
            "",
            {
              nonce: gapNum,
              originalHash: origHash,
              to: "0x388C818CA8B9251b393131C08a73683246A11274",
              valueEth: "0.1500",
              originalGasGwei: "0.0010",
              bumpPct: clamped,
              cause: `${c.cat}: ${c.text}`,
              status: "resubmitted",
              submittedTime: subTime,
            }
          );

          setTimeout(() => {
            if (isFeedPaused) return;
            const willFail = Math.random() < 0.1;
            if (willFail) {
              setFailuresInWindow((f) => Math.min(10, f + 1));
              addLedgerRow("gap_detected", `resubmission failed for nonce ${gapNum}`, "retrying");
              setTimeout(() => {
                if (isFeedPaused) return;
                setLatest((l) => l + 1);
                setFlashLatest(true);
                setTimeout(() => setFlashLatest(false), 500);
                setHasGap(false);
                setGapNonce(null);
                addLedgerRow("gap_resolved", `0x${origHash.slice(2, 8)}… to 0x${replHash.slice(2, 8)}…`, "success", {
                  nonce: gapNum,
                  originalHash: origHash,
                  replacementHash: replHash,
                  to: "0x388C818CA8B9251b393131C08a73683246A11274",
                  valueEth: "0.1500",
                  originalGasGwei: "0.0010",
                  replacementGasGwei: (0.001 * (1 + clamped / 100)).toFixed(5),
                  bumpPct: clamped,
                  cause: `${c.cat}: ${c.text}`,
                  durationSec: 3.4,
                  status: "confirmed",
                  submittedTime: subTime,
                  confirmedTime: timeNow(),
                  blockNumber: currentBlock,
                });
              }, 1400);
            } else {
              setLatest((l) => l + 1);
              setFlashLatest(true);
              setTimeout(() => setFlashLatest(false), 500);
              setHasGap(false);
              setGapNonce(null);
              addLedgerRow("gap_resolved", `0x${origHash.slice(2, 8)}… to 0x${replHash.slice(2, 8)}…`, "success", {
                nonce: gapNum,
                originalHash: origHash,
                replacementHash: replHash,
                to: "0x388C818CA8B9251b393131C08a73683246A11274",
                valueEth: "0.1500",
                originalGasGwei: "0.0010",
                replacementGasGwei: (0.001 * (1 + clamped / 100)).toFixed(5),
                bumpPct: clamped,
                cause: `${c.cat}: ${c.text}`,
                durationSec: 3.4,
                status: "confirmed",
                submittedTime: subTime,
                confirmedTime: timeNow(),
                blockNumber: currentBlock,
              });
            }
          }, 1600);
        }, 1000);

        return currLatest;
      });
    };

    const ordinaryTick = () => {
      if (isFeedPaused) return;
      const ordHash = rndFullHash();
      const subTime = timeNow();
      setPending((p) => {
        setFlashPending(true);
        setTimeout(() => setFlashPending(false), 500);
        return p + 1;
      });
      setLatest((l) => {
        const nextL = l + 1;
        setFlashLatest(true);
        setTimeout(() => setFlashLatest(false), 500);
        addLedgerRow("gap_resolved", `nonce ${nextL} confirmed on schedule`, "success", {
          nonce: nextL,
          originalHash: ordHash,
          to: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
          valueEth: "0.0500",
          originalGasGwei: "0.0012",
          status: "confirmed",
          submittedTime: subTime,
          confirmedTime: timeNow(),
          blockNumber: currentBlock,
        });
        return nextL;
      });
    };

    const loop = () => {
      if (!isFeedPaused) {
        if (Math.random() < 0.35) runGapCycle();
        else ordinaryTick();
      }
      timeoutId = setTimeout(loop, 3200 + Math.random() * 2600);
    };

    timeoutId = setTimeout(loop, 2500);
    return () => clearTimeout(timeoutId);
  }, [connected, isFeedPaused, currentBlock]);

  // Circuit breaker watcher
  useEffect(() => {
    if (failuresInWindow >= 10 && !tripped) {
      setTripped(true);
      addLedgerRow("circuit_breaker", "threshold exceeded: halting resolution", "tripped");
    } else if (failuresInWindow < 10 && tripped) {
      setTripped(false);
    }
  }, [failuresInWindow, tripped]);

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
              <Shield className="w-4 h-4 shrink-0 text-[#C9A961]" />
              <span className="flex-1 text-left">Dashboard</span>
              <span className="font-mono text-[10px] text-ash/60">I</span>
            </button>

            <button
              className={`nav-item ${currentView === "ledger" ? "active" : ""}`}
              onClick={() => setCurrentView("ledger")}
            >
              <Scroll className="w-4 h-4 shrink-0 text-[#C9A961]" />
              <span className="flex-1 text-left">Ledger</span>
              <span className="font-mono text-[10px] text-ash/60">II</span>
            </button>

            <button
              className={`nav-item ${currentView === "simulate" ? "active" : ""}`}
              onClick={() => setCurrentView("simulate")}
            >
              <Flame className="w-4 h-4 shrink-0 text-[#C9A961]" />
              <span className="flex-1 text-left">Simulate</span>
              <span className="font-mono text-[10px] text-ash/60">III</span>
            </button>

            <button
              className={`nav-item ${currentView === "cli" ? "active" : ""}`}
              onClick={() => setCurrentView("cli")}
            >
              <Terminal className="w-4 h-4 shrink-0 text-[#C9A961]" />
              <span className="flex-1 text-left">CLI Daemon</span>
              <span className="font-mono text-[10px] text-ash/60">IV</span>
            </button>

            <button
              className={`nav-item ${currentView === "metrics" ? "active" : ""}`}
              onClick={() => setCurrentView("metrics")}
            >
              <Activity className="w-4 h-4 shrink-0 text-[#C9A961]" />
              <span className="flex-1 text-left">Metrics</span>
              <span className="font-mono text-[10px] text-ash/60">V</span>
            </button>

            <button
              className={`nav-item ${currentView === "settings" ? "active" : ""}`}
              onClick={() => setCurrentView("settings")}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0 text-[#C9A961]" />
              <span className="flex-1 text-left">Settings</span>
              <span className="font-mono text-[10px] text-ash/60">VI</span>
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

            {/* Right: Network Status, Site Link & Wallet */}
            <div className="topbar-right flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                href="/"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-[#8A867D] hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] transition-colors"
                title="Return to Sentinel Overview"
              >
                <span>Site</span>
              </Link>

              <div className="chain-badge flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.02] border border-white/[0.08] text-xs font-mono text-[#C2BEB4]">
                <span className="w-2 h-2 rounded-full bg-[#8FAF92] animate-pulse" />
                <span>Base Sepolia</span>
              </div>

              {isDemoMode ? (
                <>
                  <div
                    className="hidden sm:flex px-2.5 py-1 rounded-full text-[11px] font-mono border border-[#C9A961]/30 text-[#C9A961] bg-[#C9A961]/5 items-center gap-1.5 cursor-pointer hover:border-[#C9A961]/60 transition-all"
                    onClick={() => setCurrentView("settings")}
                    title="Live Demo Observer on Base Sepolia"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#C9A961]/80" />
                    <span>Observer</span>
                  </div>
                  <button
                    className={`btn-primary btn text-xs py-1.5 px-4 ${connecting ? "connecting" : ""}`}
                    onClick={doConnect}
                    disabled={connecting}
                  >
                    {connecting ? "Connecting…" : "Connect Wallet"}
                  </button>
                </>
              ) : (
                <div
                  className="wallet-pill flex items-center gap-2 px-3 py-1.5 rounded-full border border-aurum/40 bg-aurum/10 text-xs font-mono text-[#F5F3EF] cursor-pointer hover:border-aurum transition-all"
                  onClick={() => setCurrentView("settings")}
                  title="Connected Web3 Keystore"
                >
                  <span className="w-2 h-2 rounded-full bg-[#8FAF92]" />
                  <span>{shortAddr(walletAddress)}</span>
                </div>
              )}
            </div>
          </header>

          {/* Mobile Quick-Navigation Strip */}
          <div className="lg:hidden flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06] bg-[#050608] overflow-x-auto no-scrollbar">
            {[
              { id: "dashboard", label: "Dashboard", icon: Shield },
              { id: "ledger", label: "Ledger", icon: Scroll },
              { id: "simulate", label: "Simulate", icon: Flame },
              { id: "cli", label: "CLI", icon: Terminal },
              { id: "metrics", label: "Metrics", icon: Activity },
              { id: "settings", label: "Settings", icon: SlidersHorizontal },
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
                </button>
              );
            })}
          </div>

          {/* VIEW: CONNECT */}
          {currentView === "connect" && (
            <div className="view">
              <div className="connect-screen">
                <div className="glyph">
                  <Shield className="w-8 h-8 text-[#C9A961]" />
                </div>
                <h1>Connect a wallet or explore live demo.</h1>
                <p>
                  Sentinel monitors the wallet you connect for stalled
                  transactions on Base, diagnoses why, and resolves them inside limits
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
                  <button
                    className="px-5 py-2 rounded-full border border-[#C9A961]/40 hover:border-[#C9A961] text-[#C9A961] hover:bg-[#C9A961]/10 text-xs font-mono transition-all"
                    onClick={enterDemoMode}
                  >
                    Enter Live Demo Mode
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
              {isDemoMode && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#121418] border border-[#C9A961]/25 text-xs font-mono">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded border border-[#C9A961]/40 bg-[#C9A961]/10 text-[10px] font-bold text-[#C9A961] tracking-wider uppercase">
                      DEMO MODE
                    </span>
                    <span className="text-[#C2BEB4]">
                      All features, tabs, simulations, and settings are unlocked for exploration.
                    </span>
                  </div>
                  <button
                    className="underline text-[#C9A961] hover:text-white text-[11px] transition-colors"
                    onClick={doConnect}
                  >
                    Connect Personal Wallet
                  </button>
                </div>
              )}
              {/* Real on-chain telemetry bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-[#101216] border border-white/[0.08] text-xs font-mono shadow-sm">
                <div className="flex items-center gap-2">
                  <Box className="w-3.5 h-3.5 text-[#C9A961]" />
                  <span className="text-[#686660]">Base Sepolia Block:</span>
                  <span className="text-[#F5F3EF] font-semibold tracking-wide">#{currentBlock.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#686660]">Monitored Keystore:</span>
                  <span className="text-[#C9A961]">{shortAddr(walletAddress)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#686660]">Balance:</span>
                  <span className="text-[#F5F3EF] font-semibold">{balanceEth} ETH</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#686660]">Sync:</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#8FAF92]/30 bg-[#8FAF92]/10 text-[#8FAF92] text-[11px]">
                    <Radio className="w-3 h-3 text-[#8FAF92]" />
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
                        {latest}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="label">Pending</div>
                      <div className={`num ${flashPending ? "flash" : ""}`}>
                        {pending}
                      </div>
                    </div>
                  </div>
                  <div className={`gap-flag ${hasGap ? "active" : ""}`}>
                    {hasGap ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-ember shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#8FAF92] shrink-0" />
                    )}
                    <span>
                      {hasGap
                        ? `Gap at nonce ${gapNonce}`
                        : "No gap: sequence clear"}
                    </span>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-eyebrow">Circuit breaker</div>
                  <div className={`breaker-status ${tripped ? "tripped" : ""}`}>
                    {tripped ? "Tripped" : "Armed"}
                  </div>
                  <div className="breaker-meta">
                    {failuresInWindow} failure
                    {failuresInWindow === 1 ? "" : "s"} in the last 5 minutes
                  </div>
                  <div className="breaker-bar-track">
                    <div
                      className={`breaker-bar-fill ${tripped ? "danger" : ""}`}
                      style={{ width: `${(failuresInWindow / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Diagnosis Panel */}
              <div className="diag-panel">
                <div>
                  <div className="panel-eyebrow">Latest diagnosis</div>
                  <div className="diag-category">{diagCategory}</div>
                  <div className="diag-explain">{diagExplain}</div>
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
                      style={{ left: pctToLeft(gaugeRequested) }}
                    />
                    <div
                      className="gauge-clamped"
                      style={{ left: pctToLeft(gaugeClamped) }}
                    />
                  </div>
                  <div className="gauge-readout">
                    <span className="req">{reqReadout}</span>
                    <span className="clamp">{clampReadout}</span>
                  </div>
                </div>
              </div>

              {/* Live Streaming Ledger */}
              <div className="ledger-panel">
                <div className="flex items-center justify-between panel-eyebrow">
                  <div className="flex items-center gap-2">
                    <Activity className={`w-3.5 h-3.5 ${isFeedPaused ? "text-[#D4A359]" : "text-[#C9A961]"}`} />
                    <span>Ledger: {isFeedPaused ? "Frozen" : "Streaming"}</span>
                    {isFeedPaused && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#D4A359]/10 text-[#D4A359] border border-[#D4A359]/25 font-mono">
                        PAUSED
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsFeedPaused(!isFeedPaused)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-[#C9A961]/40 hover:border-[#C9A961] text-[#C9A961] bg-[#101216] transition-all font-mono"
                    title={isFeedPaused ? "Resume live transaction stream" : "Freeze live feed to inspect rows"}
                  >
                    {isFeedPaused ? "Resume Feed" : "Pause Feed"}
                  </button>
                </div>
                <div className="ledger-feed">
                  {allEntries.slice(0, 12).map((e) => (
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
          )}

          {/* VIEW: LEDGER */}
          {currentView === "ledger" && (
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
          )}

          {/* VIEW: SIMULATE */}
          {currentView === "simulate" && (
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
          )}

          {/* VIEW: CLI & BOT SDK INTEGRATION */}
          {currentView === "cli" && (
            <div className="view space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#101216] border border-[#C9A961]/25 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#C9A961]">
                    <Terminal className="w-3.5 h-3.5 text-[#C9A961]" />
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
                    <Radio className="w-3.5 h-3.5 text-[#8FAF92]" />
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
            <div className="view">
              <DappSettings
                onNavigateToLedger={() => setCurrentView("ledger")}
                onPushToast={pushToast}
              />
            </div>
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
