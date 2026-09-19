"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import DappSettings from "@/components/dapp-settings";
import "./dapp.css";

interface LedgerEntry {
  id: string;
  time: string;
  tag: "gap_detected" | "diagnosis" | "gap_resolved" | "circuit_breaker";
  text: string;
  extra?: string;
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

export default function DappPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // View state
  const [currentView, setCurrentView] = useState<
    "connect" | "dashboard" | "ledger" | "simulate" | "metrics" | "settings"
  >("connect");

  // Wallet state
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState("0x742d35Cc6634C0532925a3b844Bc454e4438BaEa");
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

  // Ledger state
  const [allEntries, setAllEntries] = useState<LedgerEntry[]>([]);
  const [activeLedgerTag, setActiveLedgerTag] = useState("all");
  const [ledgerSearch, setLedgerSearch] = useState("");

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

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
  const pctToLeft = (pct: number) => {
    const c = Math.max(10, Math.min(50, pct));
    return `${((c - 10) / (50 - 10)) * 100}%`;
  };

  const pushToast = (title: string, body: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, body }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const addLedgerRow = (
    tag: "gap_detected" | "diagnosis" | "gap_resolved" | "circuit_breaker",
    text: string,
    extra = ""
  ) => {
    const entry: LedgerEntry = {
      id: `${Date.now()}-${Math.random()}`,
      time: timeNow(),
      tag,
      text,
      extra,
    };
    setAllEntries((prev) => [entry, ...prev.slice(0, 199)]);

    if (tag === "gap_detected") pushToast("Gap detected", text);
    if (tag === "gap_resolved" && extra === "success") pushToast("Resolved", text);
    if (tag === "circuit_breaker") pushToast("Circuit breaker", text);
  };

  // Canvas living wave background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!canvas) return;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const GOLD = [201, 169, 97];
    const BLUE = [74, 122, 153];
    const lines = [0.15, 0.9].map((yf, i) => ({
      yFrac: yf,
      amp: 16,
      freq: 0.0028,
      phase: Math.random() * 6,
      speed: 0.00012,
      color: i ? BLUE : GOLD,
    }));

    function yOn(line: (typeof lines)[0], x: number, t: number) {
      return (
        H * line.yFrac +
        Math.sin(x * line.freq + line.phase + t * line.speed) * line.amp
      );
    }

    let animId: number;
    function drawBg(t: number) {
      if (!ctx) return;
      ctx.fillStyle = "rgba(8,9,12,0.45)";
      ctx.fillRect(0, 0, W, H);
      lines.forEach((line) => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${line.color.join(",")},0.08)`;
        ctx.lineWidth = 1;
        for (let x = 0; x <= W; x += 10) {
          const yy = yOn(line, x, t);
          if (x === 0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      });
      animId = requestAnimationFrame(drawBg);
    }
    animId = requestAnimationFrame(drawBg);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Connect wallet handler
  const doConnect = async () => {
    if (connected || connecting) return;
    setConnecting(true);
    let target = "0x742d35Cc6634C0532925a3b844Bc454e4438BaEa";
    try {
      if (
        typeof window !== "undefined" &&
        (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum
      ) {
        const ethereum = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        if (accounts && accounts.length > 0) {
          target = accounts[0];
        }
      }
    } catch {
      // User cancelled or no web3 injected, fall back to default
    }

    setWalletAddress(target);

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
    pushToast("Connected", `Watching ${shortAddr(target)} on Base Sepolia.`);
    addLedgerRow("gap_resolved", `Sentinel started: watching wallet ${shortAddr(target)}`);
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
        addLedgerRow("gap_detected", `nonce ${gapNum} stalled behind queued transaction`);

        setTimeout(() => {
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
            `${c.cat}: recommending a ${requested}% bump${requested !== clamped ? ` (clamped to ${clamped}%)` : ""}`
          );

          setTimeout(() => {
            const willFail = Math.random() < 0.1;
            if (willFail) {
              setFailuresInWindow((f) => Math.min(10, f + 1));
              addLedgerRow("gap_detected", `resubmission failed for nonce ${gapNum}`, "retrying");
              setTimeout(() => {
                setLatest((l) => l + 1);
                setFlashLatest(true);
                setTimeout(() => setFlashLatest(false), 500);
                setHasGap(false);
                setGapNonce(null);
                addLedgerRow("gap_resolved", `0x${rndHash()}… to 0x${rndHash()}…`, "success");
              }, 1400);
            } else {
              setLatest((l) => l + 1);
              setFlashLatest(true);
              setTimeout(() => setFlashLatest(false), 500);
              setHasGap(false);
              setGapNonce(null);
              addLedgerRow("gap_resolved", `0x${rndHash()}… to 0x${rndHash()}…`, "success");
            }
          }, 1600);
        }, 1000);

        return currLatest;
      });
    };

    const ordinaryTick = () => {
      setPending((p) => {
        setFlashPending(true);
        setTimeout(() => setFlashPending(false), 500);
        return p + 1;
      });
      setLatest((l) => {
        const nextL = l + 1;
        setFlashLatest(true);
        setTimeout(() => setFlashLatest(false), 500);
        addLedgerRow("gap_resolved", `nonce ${nextL} confirmed on schedule`, "success");
        return nextL;
      });
    };

    const loop = () => {
      if (Math.random() < 0.35) runGapCycle();
      else ordinaryTick();
      timeoutId = setTimeout(loop, 3200 + Math.random() * 2600);
    };

    timeoutId = setTimeout(loop, 2500);
    return () => clearTimeout(timeoutId);
  }, [connected]);

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
    metrics: "Metrics & Analytics",
    settings: "Settings",
  };

  const filteredFullEntries = allEntries
    .filter((e) => activeLedgerTag === "all" || e.tag === activeLedgerTag)
    .filter((e) => !ledgerSearch || e.text.toLowerCase().includes(ledgerSearch.toLowerCase()))
    .slice(0, 60);

  return (
    <div className="dapp-container">
      <canvas ref={canvasRef} className="dapp-canvas" aria-hidden="true" />

      <div className="app-shell">
        {/* SIDEBAR */}
        <aside className="sidebar">
          {/* Clickable Concept B logo & dramatic Cinzel brand title returning to "/" */}
          <Link href="/" className="brand" title="Return to Sentinel Website">
            <Image
              src="/assets/logo.jpg"
              alt="Sentinel"
              width={32}
              height={32}
              className="seal-img"
              priority
            />
            <span className="brand-title">SENTINEL</span>
          </Link>

          {/* Nav Group */}
          <nav className="nav-group">
            <button
              className={`nav-item ${!connected ? "disabled" : ""} ${
                currentView === "dashboard" ? "active" : ""
              }`}
              onClick={() => connected && setCurrentView("dashboard")}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1">
                <rect x="1.5" y="1.5" width="6" height="6" />
                <rect x="8.5" y="1.5" width="6" height="6" />
                <rect x="1.5" y="8.5" width="6" height="6" />
                <rect x="8.5" y="8.5" width="6" height="6" />
              </svg>
              Dashboard
            </button>

            <button
              className={`nav-item ${!connected ? "disabled" : ""} ${
                currentView === "ledger" ? "active" : ""
              }`}
              onClick={() => connected && setCurrentView("ledger")}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1">
                <path d="M2 2h12v12H2z" />
                <path d="M4.5 5.5h7M4.5 8h7M4.5 10.5h4" />
              </svg>
              Ledger
            </button>

            <button
              className={`nav-item ${!connected ? "disabled" : ""} ${
                currentView === "simulate" ? "active" : ""
              }`}
              onClick={() => connected && setCurrentView("simulate")}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1">
                <path d="M4 2.5v11l9-5.5-9-5.5z" />
              </svg>
              Simulate
            </button>

            <button
              className={`nav-item ${!connected ? "disabled" : ""} ${
                currentView === "metrics" ? "active" : ""
              }`}
              onClick={() => connected && setCurrentView("metrics")}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1">
                <path d="M2 13.5V2M2 13.5h12" />
                <path d="M4.5 11V7.5M8 11V4.5M11.5 11V6" />
              </svg>
              Metrics
            </button>

            <button
              className={`nav-item ${!connected ? "disabled" : ""} ${
                currentView === "settings" ? "active" : ""
              }`}
              onClick={() => connected && setCurrentView("settings")}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1">
                <circle cx="8" cy="8" r="2.3" />
                <path d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8L3.4 3.4" />
              </svg>
              Settings
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
          {/* Topbar */}
          <header className="topbar">
            <h2>{titles[currentView]}</h2>
            <div className="topbar-right">
              {connected ? (
                <>
                  <div className="chain-badge">
                    <span />
                    Base Sepolia
                  </div>
                  <div className="wallet-pill" onClick={() => setCurrentView("settings")}>
                    <span className="dot" />
                    {shortAddr(fakeAddr)}
                  </div>
                </>
              ) : (
                <button
                  className={`btn-primary btn ${connecting ? "connecting" : ""}`}
                  onClick={doConnect}
                  disabled={connecting}
                >
                  {connecting ? "Connecting…" : "Connect Wallet"}
                </button>
              )}
            </div>
          </header>

          {/* VIEW: CONNECT */}
          {currentView === "connect" && (
            <div className="view">
              <div className="connect-screen">
                <div className="glyph">
                  <svg
                    viewBox="0 0 24 24"
                    width="26"
                    height="26"
                    fill="none"
                    stroke="#C9A961"
                    strokeWidth="1.3"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3.2 3.2" />
                  </svg>
                </div>
                <h1>Connect a wallet to begin watching.</h1>
                <p>
                  Sentinel monitors the wallet you connect for stalled
                  transactions on Base, diagnoses why, and resolves them inside limits
                  you control.
                </p>
                <button
                  className={`btn-primary btn ${connecting ? "connecting" : ""}`}
                  onClick={doConnect}
                  disabled={connecting}
                >
                  {connecting ? "Connecting…" : "Connect Wallet"}
                </button>
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
              {/* Real on-chain telemetry bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-[#101216] border border-[#C9A961]/20 text-xs font-mono shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[#686660]">Base Sepolia Block:</span>
                  <span className="text-[#F5F3EF] font-semibold">#{currentBlock.toLocaleString()}</span>
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
                  <span className="text-emerald-400">Live SSE</span>
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
                    <span className="dot" />
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
                <div className="panel-eyebrow">
                  <span className="pulse-dot" />
                  Ledger: streaming
                </div>
                <div className="ledger-feed">
                  {allEntries.slice(0, 12).map((e) => (
                    <div key={e.id} className="ledger-row">
                      <span className="time">{e.time}</span>
                      <span className={`tag ${e.tag}`}>{e.tag}</span>
                      <span>{e.text}</span>
                      <span>{e.extra || ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: LEDGER */}
          {currentView === "ledger" && (
            <div className="view">
              <div className="ledger-tabs">
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
              <input
                className="ledger-search"
                placeholder="Filter by nonce, hash, or wallet…"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
              />
              <div className="ledger-table">
                <div className="ledger-feed">
                  {filteredFullEntries.map((e) => (
                    <div key={e.id} className="ledger-row">
                      <span className="time">{e.time}</span>
                      <span className={`tag ${e.tag}`}>{e.tag}</span>
                      <span>{e.text}</span>
                      <span>{e.extra || ""}</span>
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
                    <div key={tx.nonce} className="sim-tx-row">
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

      {/* TOAST STACK */}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <strong>{t.title}</strong>
            <br />
            {t.body}
          </div>
        ))}
      </div>
    </div>
  );
}
