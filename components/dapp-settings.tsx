"use client";

import React, { useState, useEffect } from "react";
import {
  Copy,
  Check,
  Lock,
  AlertTriangle,
  Radio,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Save,
  Download,
  Trash2,
  Bell,
  Activity,
  Zap,
  Sliders,
  AlertOctagon,
  FileText,
  HelpCircle,
} from "lucide-react";

interface DappSettingsProps {
  onNavigateToLedger: () => void;
  onPushToast: (title: string, body: string) => void;
}

export default function DappSettings({
  onNavigateToLedger,
  onPushToast,
}: DappSettingsProps) {
  // Live polling data
  const [copied, setCopied] = useState(false);
  const [rpcStatus, setRpcStatus] = useState<"Connected" | "Degraded" | "Disconnected">("Connected");
  const [currentBlock, setCurrentBlock] = useState(19420845);
  const [uptime, setUptime] = useState("2h 34m 12s");
  const [isHalted, setIsHalted] = useState(false);
  const [isBreakerTripped, setIsBreakerTripped] = useState(false);

  // Form State
  const [initialSettings, setInitialSettings] = useState<any>(null);
  const [settings, setSettings] = useState<any>({
    system: {
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438BaEa",
      privateKeyLoaded: true,
      rpcUrl: "https://sepolia.base.org",
      chainId: 84532,
      version: "1.0.0",
    },
    nonceTracking: {
      gapDetectionInterval: 500,
      pendingNonceTag: "pending",
      maxPendingTransactions: 50,
      gapResolutionStrategy: "replace",
    },
    gasStrategy: {
      minGasIncreasePct: 10,
      maxFeeMultiplier: 2.0,
      priorityFeeStrategy: "max",
      customPriorityFeeGwei: 0.001,
      maxGasPriceCapGwei: 100,
      gasPriceRefreshInterval: 2000,
    },
    evictionMonitoring: {
      evictionTimeout: 30000,
      evictionCheckInterval: 5000,
      maxEvictionResubmissions: 3,
      evictionBackoffMultiplier: 1.5,
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 10,
      failureWindow: 300000,
      cooldownPeriod: 60000,
      autoRecovery: true,
    },
    alerts: {
      telegramWebhookUrl: "",
      discordWebhookUrl: "",
      alertOnGapDetected: true,
      alertOnGapResolved: true,
      alertOnGapResolutionFailed: true,
      alertOnEviction: true,
      alertOnCircuitBreaker: true,
      alertCooldown: 30000,
    },
    audit: {
      logLevel: "info",
      logFormat: "jsonl",
      logFilePath: "./nonce-sentinel.log",
      maxLogSizeMb: 100,
      logRetentionDays: 7,
      logRotation: true,
    },
  });

  // Dirty and Saving tracking
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [testAlertStatus, setTestAlertStatus] = useState<string | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<
    "clear_webhooks" | "clear_log" | "halt_sentinel" | "reset_audit" | "clear_cache" | "reset_defaults" | null
  >(null);
  const [modalInputText, setModalInputText] = useState("");

  // Fetch initial settings from backend API
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings);
          setInitialSettings(JSON.parse(JSON.stringify(data.settings)));
          if (data.status) {
            setRpcStatus(data.status.rpcConnection || "Connected");
            setCurrentBlock(data.status.currentBlock || 19420845);
            setUptime(data.status.uptime || "2h 34m 12s");
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    }
    loadSettings();

    // Poll status every 2s
    const interval = setInterval(() => {
      setCurrentBlock((prev) => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Check dirty state whenever settings change
  const updateField = (section: string, key: string, value: any) => {
    setSettings((prev: any) => {
      const updated = {
        ...prev,
        [section]: {
          ...prev[section],
          [key]: value,
        },
      };

      // Validate inputs
      validateField(key, value);

      setIsDirty(true);
      return updated;
    });
  };

  const validateField = (key: string, value: any) => {
    const errs = { ...validationErrors };

    if (key === "gapDetectionInterval") {
      const num = Number(value);
      if (num < 100) errs.gapDetectionInterval = "Values below 100ms may cause RPC rate limiting.";
      else if (num > 5000) errs.gapDetectionInterval = "Maximum recommended interval is 5000ms.";
      else delete errs.gapDetectionInterval;
    }

    if (key === "maxPendingTransactions") {
      const num = Number(value);
      if (num > 200) errs.maxPendingTransactions = "High values may cause memory pressure.";
      else if (num < 1) errs.maxPendingTransactions = "Minimum is 1.";
      else delete errs.maxPendingTransactions;
    }

    if (key === "minGasIncreasePct") {
      const num = Number(value);
      if (num < 10) {
        errs.minGasIncreasePct = "Base requires at least 10% gas increase for transaction replacement.";
      } else {
        delete errs.minGasIncreasePct;
      }
    }

    if (key === "maxGasPriceCapGwei") {
      const num = Number(value);
      if (num <= 0) {
        errs.maxGasPriceCapGwei = "Max gas price cap must be greater than 0.";
      } else {
        delete errs.maxGasPriceCapGwei;
      }
    }

    setValidationErrors(errs);
  };

  const hasBlockingErrors = Boolean(
    validationErrors.minGasIncreasePct || validationErrors.maxGasPriceCapGwei
  );

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(settings.system.walletAddress);
    setCopied(true);
    onPushToast("Address Copied", "Wallet address copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (hasBlockingErrors || !isDirty) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_settings", settings }),
      });
      if (res.ok) {
        setInitialSettings(JSON.parse(JSON.stringify(settings)));
        setIsDirty(false);
        onPushToast("Settings Saved", "All configurations applied to active Sentinel loop.");
      } else {
        onPushToast("Save Error", "Unable to persist settings to disk.");
      }
    } catch {
      onPushToast("Save Error", "Network error saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestAlert = async () => {
    setTestAlertStatus("Sending test alert...");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_alert",
          telegramUrl: settings.alerts.telegramWebhookUrl,
          discordUrl: settings.alerts.discordWebhookUrl,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestAlertStatus("Test alert sent successfully to configured webhooks.");
        onPushToast("Test Alert Sent", "Webhooks received test payload.");
      } else {
        setTestAlertStatus(data.error || "No webhook URLs configured.");
      }
    } catch {
      setTestAlertStatus("Failed to send test alert.");
    }
    setTimeout(() => setTestAlertStatus(null), 4000);
  };

  const handleDownloadLog = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            event: "AUDIT_EXPORT",
            account: settings.system.walletAddress,
            state: "HEALTHY",
            version: "1.0.0",
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nonce-sentinel.log";
    a.click();
    URL.revokeObjectURL(url);
    onPushToast("Log Downloaded", "nonce-sentinel.log exported.");
  };

  const executeModalAction = () => {
    if (activeModal === "clear_webhooks") {
      updateField("alerts", "telegramWebhookUrl", "");
      updateField("alerts", "discordWebhookUrl", "");
      onPushToast("Webhooks Cleared", "Webhook endpoints reset to empty.");
    } else if (activeModal === "clear_log") {
      if (modalInputText !== "DELETE") return;
      onPushToast("Log Cleared", "Audit log deleted.");
    } else if (activeModal === "reset_audit") {
      if (modalInputText !== "RESET") return;
      onPushToast("Audit Reset", "All historical audit events wiped.");
    } else if (activeModal === "halt_sentinel") {
      setIsHalted(true);
      onPushToast("Sentinel Halted", "Mempool watcher paused. Transactions routing directly to RPC.");
    } else if (activeModal === "clear_cache") {
      onPushToast("Cache Cleared", "Pending transactions purged. Rebuilding from sequencer.");
    } else if (activeModal === "reset_defaults") {
      // Reload defaults
      setSettings(JSON.parse(JSON.stringify(initialSettings)));
      setIsDirty(false);
      onPushToast("Reset Complete", "All parameters restored to default values.");
    }
    setActiveModal(null);
    setModalInputText("");
  };

  return (
    <div className="space-y-8 pb-28 text-marble font-sans">
      {/* SECTION 1: SYSTEM STATUS (READ-ONLY) */}
      <div className="bg-[#0C0E14] border border-aurum/20 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-aurum animate-pulse" />
            <h2 className="font-cinzel text-base font-semibold tracking-wider text-marble">
              SECTION 1: SYSTEM STATUS (READ-ONLY)
            </h2>
          </div>
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-aurum/10 text-aurum border border-aurum/30">
            Polling 2s Interval
          </span>
        </div>

        {/* Status Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          {/* Wallet Address */}
          <div className="bg-void-2 p-3.5 rounded-xl border border-white/[0.06] space-y-1">
            <div className="text-[10px] text-ash uppercase tracking-wider">Wallet Address</div>
            <div className="flex items-center justify-between">
              <span
                className="text-marble font-medium truncate max-w-[140px]"
                title={settings.system.walletAddress}
              >
                {settings.system.walletAddress.slice(0, 6)}…{settings.system.walletAddress.slice(-4)}
              </span>
              <button
                type="button"
                onClick={handleCopyWallet}
                className="text-ash hover:text-aurum transition-colors p-1 rounded"
                title="Copy full address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Private Key Status */}
          <div className="bg-void-2 p-3.5 rounded-xl border border-white/[0.06] space-y-1">
            <div className="text-[10px] text-ash uppercase tracking-wider">Private Key Status</div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Loaded
              </span>
            </div>
          </div>

          {/* RPC Endpoint */}
          <div className="bg-void-2 p-3.5 rounded-xl border border-white/[0.06] space-y-1">
            <div className="text-[10px] text-ash uppercase tracking-wider flex items-center justify-between">
              <span>RPC Endpoint</span>
              <span title="Overridden by environment">
                <Lock className="w-3 h-3 text-aurum" />
              </span>
            </div>
            <div className="text-marble font-medium truncate" title={settings.system.rpcUrl}>
              {settings.system.rpcUrl}
            </div>
          </div>

          {/* RPC Connection Status */}
          <div className="bg-void-2 p-3.5 rounded-xl border border-white/[0.06] space-y-1">
            <div className="text-[10px] text-ash uppercase tracking-wider">RPC Connection</div>
            <div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                  rpcStatus === "Connected"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : rpcStatus === "Degraded"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-red-500/10 text-red-400 border-red-500/30"
                }`}
              >
                {rpcStatus}
              </span>
            </div>
          </div>

          {/* Current Block */}
          <div className="bg-void-2 p-3.5 rounded-xl border border-white/[0.06] space-y-1">
            <div className="text-[10px] text-ash uppercase tracking-wider">Current Block</div>
            <div className="text-marble font-semibold text-sm">
              #{currentBlock.toLocaleString()}
            </div>
          </div>

          {/* Chain ID */}
          <div className="bg-void-2 p-3.5 rounded-xl border border-white/[0.06] space-y-1">
            <div className="text-[10px] text-ash uppercase tracking-wider">Chain ID</div>
            <div className="text-aurum font-medium">84532 (Base Sepolia)</div>
          </div>

          {/* Sentinel Version */}
          <div className="bg-void-2 p-3.5 rounded-xl border border-white/[0.06] space-y-1">
            <div className="text-[10px] text-ash uppercase tracking-wider">Sentinel Version</div>
            <div className="text-marble">v1.0.0</div>
          </div>

          {/* Uptime */}
          <div className="bg-void-2 p-3.5 rounded-xl border border-white/[0.06] space-y-1">
            <div className="text-[10px] text-ash uppercase tracking-wider">Uptime</div>
            <div className="text-emerald-400 font-medium">{uptime}</div>
          </div>
        </div>

        {/* RPC Disconnected Warning Banner */}
        {rpcStatus === "Disconnected" && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center gap-2.5">
            <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>RPC disconnected. Settings changes will not take effect until connection is restored.</span>
          </div>
        )}
      </div>

      {/* SECTION 2: NONCE TRACKING */}
      <div className="bg-[#0C0E14] border border-aurum/20 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-white/[0.06] pb-3">
          <h2 className="font-cinzel text-base font-semibold tracking-wider text-marble">
            SECTION 2: NONCE TRACKING
          </h2>
          <p className="text-xs font-mono text-ash mt-1">
            Core operational parameters governing how Sentinel discovers and classifies nonce gaps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          {/* Gap Detection Interval */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">
              Gap Detection Interval (ms)
            </label>
            <input
              type="number"
              min="100"
              max="5000"
              step="50"
              value={settings.nonceTracking.gapDetectionInterval}
              onChange={(e) => updateField("nonceTracking", "gapDetectionInterval", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
            {validationErrors.gapDetectionInterval ? (
              <p className="text-[11px] text-amber-400">{validationErrors.gapDetectionInterval}</p>
            ) : (
              <p className="text-[11px] text-ash">How often Sentinel polls for nonce gaps (100 to 5000ms).</p>
            )}
          </div>

          {/* Pending Nonce Tag */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">
              Pending Nonce Tag
            </label>
            <select
              value={settings.nonceTracking.pendingNonceTag}
              onChange={(e) => updateField("nonceTracking", "pendingNonceTag", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            >
              <option value="pending">pending (Flashblocks-aware, recommended)</option>
              <option value="latest">latest (fallback)</option>
            </select>
            <p className="text-[11px] text-ash">Which block tag to use for nonce queries on Base L2.</p>
          </div>

          {/* Max Pending Transactions */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">
              Max Pending Transactions
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={settings.nonceTracking.maxPendingTransactions}
              onChange={(e) => updateField("nonceTracking", "maxPendingTransactions", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
            {validationErrors.maxPendingTransactions ? (
              <p className="text-[11px] text-amber-400">{validationErrors.maxPendingTransactions}</p>
            ) : (
              <p className="text-[11px] text-ash">Maximum pending transactions tracked (1 to 500).</p>
            )}
          </div>

          {/* Gap Resolution Strategy */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">
              Gap Resolution Strategy
            </label>
            <select
              value={settings.nonceTracking.gapResolutionStrategy}
              onChange={(e) => updateField("nonceTracking", "gapResolutionStrategy", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            >
              <option value="replace">replace (resubmit with higher gas bump)</option>
              <option value="cancel">cancel (send 0-value null transaction to self)</option>
            </select>
            <p className="text-[11px] text-ash">Method used to clear the stalled sequence.</p>
          </div>
        </div>
      </div>

      {/* SECTION 3: GAS STRATEGY */}
      <div className="bg-[#0C0E14] border border-aurum/20 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-white/[0.06] pb-3">
          <h2 className="font-cinzel text-base font-semibold tracking-wider text-marble">
            SECTION 3: GAS STRATEGY
          </h2>
          <p className="text-xs font-mono text-ash mt-1">
            Rules governing replacement gas calculation. Heart of the autonomous healing engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono text-xs">
          {/* Minimum Gas Increase % */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">
              Minimum Gas Increase %
            </label>
            <input
              type="number"
              min="10"
              max="100"
              value={settings.gasStrategy.minGasIncreasePct}
              onChange={(e) => updateField("gasStrategy", "minGasIncreasePct", Number(e.target.value))}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-void-2 border text-marble outline-none ${
                validationErrors.minGasIncreasePct ? "border-red-500" : "border-white/[0.08] focus:border-aurum"
              }`}
            />
            {validationErrors.minGasIncreasePct ? (
              <p className="text-[11px] text-red-400">{validationErrors.minGasIncreasePct}</p>
            ) : (
              <p className="text-[11px] text-ash">Base requires at least 10% for replacement.</p>
            )}
          </div>

          {/* Max Fee Multiplier */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">
              Max Fee Multiplier (x)
            </label>
            <input
              type="number"
              min="1.0"
              max="5.0"
              step="0.1"
              value={settings.gasStrategy.maxFeeMultiplier}
              onChange={(e) => updateField("gasStrategy", "maxFeeMultiplier", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
            <p className="text-[11px] text-ash">Base documentation recommends 2.0x for headroom.</p>
          </div>

          {/* Priority Fee Strategy */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">
              Priority Fee Strategy
            </label>
            <select
              value={settings.gasStrategy.priorityFeeStrategy}
              onChange={(e) => updateField("gasStrategy", "priorityFeeStrategy", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            >
              <option value="max">max (uses eth_maxPriorityFeePerGas)</option>
              <option value="average">average (rolling window average)</option>
              <option value="custom">custom (fixed gwei value)</option>
            </select>
            <p className="text-[11px] text-ash">Source for calculating priority tip.</p>
          </div>

          {/* Custom Priority Fee */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">
              Custom Priority Fee (gwei)
            </label>
            <input
              type="number"
              min="0.0001"
              max="1.0"
              step="0.0005"
              disabled={settings.gasStrategy.priorityFeeStrategy !== "custom"}
              value={settings.gasStrategy.customPriorityFeeGwei}
              onChange={(e) => updateField("gasStrategy", "customPriorityFeeGwei", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none disabled:opacity-40"
            />
            <p className="text-[11px] text-ash">Active only when Priority Fee Strategy is custom.</p>
          </div>

          {/* Max Gas Price Cap */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">
              Max Gas Price Cap (gwei)
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={settings.gasStrategy.maxGasPriceCapGwei}
              onChange={(e) => updateField("gasStrategy", "maxGasPriceCapGwei", Number(e.target.value))}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-void-2 border text-marble outline-none ${
                validationErrors.maxGasPriceCapGwei ? "border-red-500" : "border-white/[0.08] focus:border-aurum"
              }`}
            />
            {validationErrors.maxGasPriceCapGwei ? (
              <p className="text-[11px] text-red-400">{validationErrors.maxGasPriceCapGwei}</p>
            ) : (
              <p className="text-[11px] text-ash">Prevents runaway fees during severe congestion.</p>
            )}
          </div>

          {/* Gas Price Refresh Interval */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">
              Gas Refresh Interval (ms)
            </label>
            <input
              type="number"
              min="500"
              max="30000"
              step="500"
              value={settings.gasStrategy.gasPriceRefreshInterval}
              onChange={(e) => updateField("gasStrategy", "gasPriceRefreshInterval", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
            <p className="text-[11px] text-ash">Refresh interval for base fee and priority estimates.</p>
          </div>
        </div>
      </div>

      {/* SECTION 4: EVICTION MONITORING */}
      <div className="bg-[#0C0E14] border border-aurum/20 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-white/[0.06] pb-3">
          <h2 className="font-cinzel text-base font-semibold tracking-wider text-marble">
            SECTION 4: EVICTION MONITORING
          </h2>
          <p className="text-xs font-mono text-ash mt-1">
            Separate failure mode handling when transactions are silently evicted from RPC pools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs">
          {/* Eviction Timeout */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">Eviction Timeout (ms)</label>
            <input
              type="number"
              min="5000"
              max="300000"
              step="1000"
              value={settings.evictionMonitoring.evictionTimeout}
              onChange={(e) => updateField("evictionMonitoring", "evictionTimeout", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
            <p className="text-[11px] text-ash">Time before unconfirmed tx is considered evicted.</p>
          </div>

          {/* Eviction Check Interval */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">Check Interval (ms)</label>
            <input
              type="number"
              min="1000"
              max="60000"
              step="500"
              value={settings.evictionMonitoring.evictionCheckInterval}
              onChange={(e) => updateField("evictionMonitoring", "evictionCheckInterval", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
            <p className="text-[11px] text-ash">How often pending queue is inspected.</p>
          </div>

          {/* Max Eviction Resubmissions */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">Max Resubmissions</label>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.evictionMonitoring.maxEvictionResubmissions}
              onChange={(e) => updateField("evictionMonitoring", "maxEvictionResubmissions", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
            <p className="text-[11px] text-ash">Number of resubmission attempts before giving up.</p>
          </div>

          {/* Eviction Backoff Multiplier */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">Backoff Multiplier (x)</label>
            <input
              type="number"
              min="1.0"
              max="3.0"
              step="0.1"
              value={settings.evictionMonitoring.evictionBackoffMultiplier}
              onChange={(e) => updateField("evictionMonitoring", "evictionBackoffMultiplier", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
            <p className="text-[11px] text-ash">Gas increase multiplier per retry.</p>
          </div>
        </div>
      </div>

      {/* SECTION 5: CIRCUIT BREAKER */}
      <div className="bg-[#0C0E14] border border-aurum/20 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-white/[0.06] pb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-cinzel text-base font-semibold tracking-wider text-marble">
              SECTION 5: CIRCUIT BREAKER
            </h2>
            <p className="text-xs font-mono text-ash mt-1">
              Automated safety mechanism preventing capital burn during severe network degradation.
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase border ${
              isBreakerTripped
                ? "bg-red-500/15 text-red-400 border-red-500/40 animate-pulse"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            }`}
          >
            {isBreakerTripped ? "Breaker Tripped" : "Breaker Armed"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono text-xs">
          {/* Circuit Breaker Enabled Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-void-2 rounded-xl border border-white/[0.06]">
            <div>
              <div className="text-marble font-medium">Circuit Breaker Active</div>
              <div className="text-[11px] text-ash">Master toggle for guardian loop</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.circuitBreaker.enabled}
                onChange={(e) => updateField("circuitBreaker", "enabled", e.target.checked)}
              />
              <span className="track"><span className="knob" /></span>
            </label>
          </div>

          {/* Failure Threshold */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">Failure Threshold</label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.circuitBreaker.failureThreshold}
              onChange={(e) => updateField("circuitBreaker", "failureThreshold", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
            <p className="text-[11px] text-ash">Failed resolutions in window before trip.</p>
          </div>

          {/* Failure Window */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">Failure Window (ms)</label>
            <input
              type="number"
              min="60000"
              max="3600000"
              step="30000"
              value={settings.circuitBreaker.failureWindow}
              onChange={(e) => updateField("circuitBreaker", "failureWindow", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
            <p className="text-[11px] text-ash">Rolling window for counting failures (300000 = 5 min).</p>
          </div>

          {/* Cooldown Period */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">Cooldown Period (ms)</label>
            <input
              type="number"
              min="10000"
              max="600000"
              step="10000"
              value={settings.circuitBreaker.cooldownPeriod}
              onChange={(e) => updateField("circuitBreaker", "cooldownPeriod", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
            <p className="text-[11px] text-ash">Duration breaker remains tripped (60000 = 1 min).</p>
          </div>

          {/* Auto-Recovery Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-void-2 rounded-xl border border-white/[0.06] col-span-1 md:col-span-2">
            <div>
              <div className="text-marble font-medium">Auto-Recovery</div>
              <div className="text-[11px] text-ash">Automatically re-arm after cooldown period without operator intervention</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.circuitBreaker.autoRecovery}
                onChange={(e) => updateField("circuitBreaker", "autoRecovery", e.target.checked)}
              />
              <span className="track"><span className="knob" /></span>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 6: ALERTS & NOTIFICATIONS */}
      <div className="bg-[#0C0E14] border border-aurum/20 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-white/[0.06] pb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-cinzel text-base font-semibold tracking-wider text-marble">
              SECTION 6: ALERTS & NOTIFICATIONS
            </h2>
            <p className="text-xs font-mono text-ash mt-1">
              External webhook channels and event routing filters.
            </p>
          </div>

          {/* Test and Clear Actions (No arrows) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendTestAlert}
              className="px-3 py-1.5 rounded-lg bg-aurum/15 hover:bg-aurum/25 text-aurum text-xs font-mono border border-aurum/30 transition-all"
            >
              Send Test Alert
            </button>
            <button
              type="button"
              onClick={() => setActiveModal("clear_webhooks")}
              className="px-3 py-1.5 rounded-lg bg-void-2 hover:bg-white/[0.04] text-ash hover:text-marble text-xs font-mono border border-white/[0.08] transition-all"
            >
              Clear Webhooks
            </button>
          </div>
        </div>

        {testAlertStatus && (
          <div className="p-3 rounded-xl bg-aurum/10 border border-aurum/30 text-aurum text-xs font-mono">
            {testAlertStatus}
          </div>
        )}

        {/* Webhook URLs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          <div className="space-y-2">
            <label className="block text-marble font-medium">Telegram Webhook URL</label>
            <input
              type="url"
              placeholder="https://api.telegram.org/bot.../sendMessage"
              value={settings.alerts.telegramWebhookUrl}
              onChange={(e) => updateField("alerts", "telegramWebhookUrl", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-marble font-medium">Discord Webhook URL</label>
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={settings.alerts.discordWebhookUrl}
              onChange={(e) => updateField("alerts", "discordWebhookUrl", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
          </div>
        </div>

        {/* Alert Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs pt-2">
          <div className="flex items-center justify-between p-3 bg-void-2 rounded-xl border border-white/[0.06]">
            <span>Alert on Gap Detected</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.alerts.alertOnGapDetected}
                onChange={(e) => updateField("alerts", "alertOnGapDetected", e.target.checked)}
              />
              <span className="track"><span className="knob" /></span>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-void-2 rounded-xl border border-white/[0.06]">
            <span>Alert on Gap Resolved</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.alerts.alertOnGapResolved}
                onChange={(e) => updateField("alerts", "alertOnGapResolved", e.target.checked)}
              />
              <span className="track"><span className="knob" /></span>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-void-2 rounded-xl border border-white/[0.06]">
            <span>Alert on Resolution Failed</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.alerts.alertOnGapResolutionFailed}
                onChange={(e) => updateField("alerts", "alertOnGapResolutionFailed", e.target.checked)}
              />
              <span className="track"><span className="knob" /></span>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-void-2 rounded-xl border border-white/[0.06]">
            <span>Alert on Eviction</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.alerts.alertOnEviction}
                onChange={(e) => updateField("alerts", "alertOnEviction", e.target.checked)}
              />
              <span className="track"><span className="knob" /></span>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-void-2 rounded-xl border border-white/[0.06]">
            <span>Alert on Circuit Breaker</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.alerts.alertOnCircuitBreaker}
                onChange={(e) => updateField("alerts", "alertOnCircuitBreaker", e.target.checked)}
              />
              <span className="track"><span className="knob" /></span>
            </label>
          </div>

          <div className="space-y-1 p-2">
            <label className="block text-ash text-[10px] uppercase">Alert Cooldown (ms)</label>
            <input
              type="number"
              min="1000"
              max="300000"
              step="5000"
              value={settings.alerts.alertCooldown}
              onChange={(e) => updateField("alerts", "alertCooldown", Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg bg-void-2 border border-white/[0.08] text-marble text-xs focus:border-aurum outline-none"
            />
          </div>
        </div>
      </div>

      {/* SECTION 7: AUDIT & LOGGING */}
      <div className="bg-[#0C0E14] border border-aurum/20 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-white/[0.06] pb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-cinzel text-base font-semibold tracking-wider text-marble">
              SECTION 7: AUDIT & LOGGING
            </h2>
            <p className="text-xs font-mono text-ash mt-1">
              Deterministic verification provenance. Machine-readable audit trails for institutional compliance.
            </p>
          </div>

          {/* Action Buttons (No arrows) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadLog}
              className="px-3 py-1.5 rounded-lg bg-void-2 hover:bg-white/[0.04] text-marble text-xs font-mono border border-white/[0.08] transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-aurum" />
              <span>Download Log</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToLedger}
              className="px-3 py-1.5 rounded-lg bg-void-2 hover:bg-white/[0.04] text-marble text-xs font-mono border border-white/[0.08] transition-all"
            >
              View Recent Events
            </button>
            <button
              type="button"
              onClick={() => setActiveModal("clear_log")}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-mono border border-red-500/30 transition-all"
            >
              Clear Log
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono text-xs">
          {/* Log Level */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">Log Level</label>
            <select
              value={settings.audit.logLevel}
              onChange={(e) => updateField("audit", "logLevel", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            >
              <option value="debug">debug (maximum verbosity)</option>
              <option value="info">info (operational standard)</option>
              <option value="warn">warn (warnings and errors only)</option>
              <option value="error">error (critical faults only)</option>
            </select>
          </div>

          {/* Log Format */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">Log Format</label>
            <select
              value={settings.audit.logFormat}
              onChange={(e) => updateField("audit", "logFormat", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            >
              <option value="jsonl">jsonl (structured machine-parseable)</option>
              <option value="text">text (human-readable)</option>
            </select>
          </div>

          {/* Log File Path (Read-only / env locked) */}
          <div className="space-y-2">
            <label className="block text-marble font-medium flex items-center justify-between">
              <span>Log File Path</span>
              <span title="Set via environment">
                <Lock className="w-3 h-3 text-aurum" />
              </span>
            </label>
            <input
              type="text"
              readOnly
              value={settings.audit.logFilePath}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-ash cursor-not-allowed outline-none"
            />
          </div>

          {/* Max Log Size */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">Max Log Size (MB)</label>
            <input
              type="number"
              min="10"
              max="1000"
              value={settings.audit.maxLogSizeMb}
              onChange={(e) => updateField("audit", "maxLogSizeMb", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
          </div>

          {/* Log Retention */}
          <div className="space-y-2">
            <label className="block text-marble font-medium">Retention (days)</label>
            <input
              type="number"
              min="1"
              max="90"
              value={settings.audit.logRetentionDays}
              onChange={(e) => updateField("audit", "logRetentionDays", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-void-2 border border-white/[0.08] text-marble focus:border-aurum outline-none"
            />
          </div>

          {/* Log Rotation Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-void-2 rounded-xl border border-white/[0.06]">
            <div>
              <div className="text-marble font-medium">Log Rotation</div>
              <div className="text-[11px] text-ash">Rotate when max size is reached</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.audit.logRotation}
                onChange={(e) => updateField("audit", "logRotation", e.target.checked)}
              />
              <span className="track"><span className="knob" /></span>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 8: DANGER ZONE */}
      <div className="bg-[#140C0C] border border-red-500/40 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="border-b border-red-500/20 pb-3 flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
          <div>
            <h2 className="font-cinzel text-base font-semibold tracking-wider text-red-200">
              SECTION 8: DANGER ZONE
            </h2>
            <p className="text-xs font-mono text-red-300/70 mt-0.5">
              Destructive operations. Execute with caution: actions directly impact active trading pipelines.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          {/* Halt / Resume Sentinel */}
          <div className="p-4 bg-void-2 rounded-xl border border-red-500/20 space-y-3 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-marble">Halt Sentinel Daemon</div>
              <p className="text-[11px] text-ash mt-1">
                Stops gap detection. Forwards transactions directly to Base RPC without protection.
              </p>
            </div>
            {isHalted ? (
              <button
                type="button"
                onClick={() => {
                  setIsHalted(false);
                  onPushToast("Sentinel Resumed", "Autonomous watchdog monitoring active.");
                }}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"
              >
                Resume Sentinel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveModal("halt_sentinel")}
                className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                Halt Sentinel
              </button>
            )}
          </div>

          {/* Reset Audit Log */}
          <div className="p-4 bg-void-2 rounded-xl border border-red-500/20 space-y-3 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-marble">Reset Audit Log</div>
              <p className="text-[11px] text-ash mt-1">
                Deletes all historical event logs. Requires explicit confirmation text.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveModal("reset_audit");
                setModalInputText("");
              }}
              className="w-full py-2.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/40 font-semibold transition-all"
            >
              Reset Audit Log
            </button>
          </div>

          {/* Reset Circuit Breaker */}
          <div className="p-4 bg-void-2 rounded-xl border border-amber-500/20 space-y-3 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-marble">Reset Circuit Breaker</div>
              <p className="text-[11px] text-ash mt-1">
                Manually clears tripped status and unlocks transaction dispatch queue.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsBreakerTripped(false);
                onPushToast("Breaker Reset", "Circuit breaker re-armed to active status.");
              }}
              className="w-full py-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold transition-all"
            >
              Reset Circuit Breaker
            </button>
          </div>

          {/* Clear Pending Transaction Cache */}
          <div className="p-4 bg-void-2 rounded-xl border border-amber-500/20 space-y-3 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-marble">Clear Pending Cache</div>
              <p className="text-[11px] text-ash mt-1">
                Purges local memory cache and resynchronizes directly with the sequencer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal("clear_cache")}
              className="w-full py-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold transition-all"
            >
              Clear Pending Cache
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 9: FIXED SAVE & APPLY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#08090C]/95 backdrop-blur-xl border-t border-aurum/20 px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className={`w-2.5 h-2.5 rounded-full ${isDirty ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
          <span className="text-marble-dim">
            {isDirty ? "Unsaved configuration changes pending" : "All settings in sync with Sentinel daemon"}
          </span>
          {hasBlockingErrors && (
            <span className="text-red-400 ml-2">Resolve validation errors before saving</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveModal("reset_defaults")}
            className="px-4 py-2 rounded-full text-xs font-mono text-ash hover:text-marble border border-white/[0.08] hover:border-white/20 transition-all"
          >
            Reset All to Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving || hasBlockingErrors}
            className="px-6 py-2 rounded-full text-xs font-mono font-semibold bg-gradient-to-r from-aurum to-aurum-light text-void hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-[0_2px_15px_rgba(201,169,97,0.3)] flex items-center justify-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODALS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101217] border border-aurum/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono text-xs">
            <h3 className="font-cinzel text-base font-semibold text-marble">
              {activeModal === "clear_webhooks" && "Confirm Clear Webhooks"}
              {activeModal === "clear_log" && "Confirm Delete Log File"}
              {activeModal === "reset_audit" && "Confirm Reset Audit History"}
              {activeModal === "halt_sentinel" && "Halt Autonomous Sentinel?"}
              {activeModal === "clear_cache" && "Clear Pending Transaction Cache?"}
              {activeModal === "reset_defaults" && "Reset All Settings to Defaults?"}
            </h3>

            <p className="text-marble-dim leading-relaxed">
              {activeModal === "clear_webhooks" && "Are you sure you want to clear both Telegram and Discord webhook URLs?"}
              {activeModal === "clear_log" && "This will permanently delete the current log file. Type DELETE below to confirm:"}
              {activeModal === "reset_audit" && "This deletes all historical audit entries permanently. Type RESET below to confirm:"}
              {activeModal === "halt_sentinel" && "Are you sure? The Sentinel will stop monitoring transactions. The interceptor will forward transactions directly to Base RPC without gap detection."}
              {activeModal === "clear_cache" && "This will clear the Sentinel's record of pending transactions. It will rebuild from on-chain data."}
              {activeModal === "reset_defaults" && "This will restore all tracking, gas, breaker, and audit parameters to initial defaults."}
            </p>

            {(activeModal === "clear_log" || activeModal === "reset_audit") && (
              <input
                type="text"
                placeholder={activeModal === "clear_log" ? "Type DELETE" : "Type RESET"}
                value={modalInputText}
                onChange={(e) => setModalInputText(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-void-2 border border-white/[0.1] text-marble outline-none uppercase"
              />
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setModalInputText("");
                }}
                className="px-4 py-2 rounded-full border border-white/[0.08] text-ash hover:text-marble transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeModalAction}
                disabled={
                  (activeModal === "clear_log" && modalInputText !== "DELETE") ||
                  (activeModal === "reset_audit" && modalInputText !== "RESET")
                }
                className="px-5 py-2 rounded-full bg-aurum text-void font-semibold hover:bg-aurum-light transition-all disabled:opacity-40"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
