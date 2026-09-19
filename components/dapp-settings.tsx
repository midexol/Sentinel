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
      logFilePath: "./sentinel.log",
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
    a.download = "sentinel.log";
    a.click();
    URL.revokeObjectURL(url);
    onPushToast("Log Downloaded", "sentinel.log exported.");
  };

  const handleResetCircuitBreaker = () => {
    setIsBreakerTripped(false);
    onPushToast("Circuit Breaker Reset", "Sliding window and failure counters reset to 0.");
  };

  const handleToggleHalt = () => {
    if (!isHalted) {
      setActiveModal("halt_sentinel");
    } else {
      setIsHalted(false);
      onPushToast("Sentinel Resumed", "Automated nonce watchdog loop reactivated.");
    }
  };

  const executeModalAction = () => {
    if (activeModal === "clear_webhooks") {
      updateField("alerts", "telegramWebhookUrl", "");
      updateField("alerts", "discordWebhookUrl", "");
      onPushToast("Webhooks Cleared", "Webhook endpoints reset to empty.");
    } else if (activeModal === "reset_audit") {
      onPushToast("Audit Reset", "All historical audit events wiped.");
    } else if (activeModal === "halt_sentinel") {
      setIsHalted(true);
      onPushToast("Sentinel Halted", "Mempool watcher paused. Transactions routing directly to RPC.");
    } else if (activeModal === "reset_defaults") {
      setSettings(JSON.parse(JSON.stringify(initialSettings)));
      setIsDirty(false);
      onPushToast("Reset Complete", "All parameters restored to default values.");
    }
    setActiveModal(null);
    setModalInputText("");
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 text-marble font-mono text-xs space-y-6">
      {/* WIREFRAME CONTAINER CARD */}
      <div className="rounded-2xl bg-[#0C0E14] border border-[#C9A961]/30 shadow-2xl overflow-hidden">
        {/* TOP BAR: SETTINGS & [Connected ●] */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#101216] border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <Sliders className="w-4 h-4 text-aurum" />
            <span className="font-cinzel text-base sm:text-lg font-bold tracking-[0.16em] text-white">
              SETTINGS
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{rpcStatus === "Connected" ? "Connected" : rpcStatus}</span>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* SECTION 1: SYSTEM STATUS */}
          <section className="space-y-4">
            <div className="text-xs font-bold tracking-widest text-[#C9A961] uppercase border-b border-white/[0.06] pb-2">
              SYSTEM STATUS
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-xs font-mono bg-void-2/60 p-4 rounded-xl border border-white/[0.05]">
              {/* Row 1 */}
              <div className="flex items-center justify-between py-1">
                <span className="text-[#686660]">Wallet:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium truncate max-w-[180px]" title={settings.system.walletAddress}>
                    {settings.system.walletAddress.slice(0, 10)}...{settings.system.walletAddress.slice(-4)}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyWallet}
                    className="text-[#686660] hover:text-[#C9A961] transition-colors p-1"
                    title="Copy full address"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#686660]">Private Key:</span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Loaded
                </span>
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between py-1">
                <span className="text-[#686660]">RPC:</span>
                <span className="text-white truncate max-w-[200px]" title={settings.system.rpcUrl}>
                  {settings.system.rpcUrl}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#686660]">Block:</span>
                <span className="text-white font-semibold">
                  {currentBlock.toLocaleString()}
                </span>
              </div>

              {/* Row 3 */}
              <div className="flex items-center justify-between py-1">
                <span className="text-[#686660]">Chain:</span>
                <span className="text-[#C9A961] font-medium">84532 (Base Sepolia)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#686660]">Uptime:</span>
                <span className="text-emerald-400 font-medium">{uptime}</span>
              </div>
            </div>
          </section>

          {/* SECTION 2: NONCE TRACKING */}
          <section className="space-y-4">
            <div className="text-xs font-bold tracking-widest text-[#C9A961] uppercase border-b border-white/[0.06] pb-2">
              NONCE TRACKING
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-void-2/40 rounded-xl border border-white/[0.05]">
                <label className="text-[#C2BEB4]">Gap Detection Interval:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="100"
                    max="5000"
                    step="50"
                    value={settings.nonceTracking.gapDetectionInterval}
                    onChange={(e) => updateField("nonceTracking", "gapDetectionInterval", Number(e.target.value))}
                    className="w-24 px-3 py-1.5 rounded-lg bg-[#08090C] border border-white/[0.1] text-white text-right focus:border-[#C9A961] outline-none"
                  />
                  <span className="text-[#686660] w-6">ms</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-void-2/40 rounded-xl border border-white/[0.05]">
                <label className="text-[#C2BEB4]">Pending Nonce Tag:</label>
                <select
                  value={settings.nonceTracking.pendingNonceTag}
                  onChange={(e) => updateField("nonceTracking", "pendingNonceTag", e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#08090C] border border-white/[0.1] text-white focus:border-[#C9A961] outline-none cursor-pointer"
                >
                  <option value="pending">pending</option>
                  <option value="latest">latest</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-void-2/40 rounded-xl border border-white/[0.05]">
                <label className="text-[#C2BEB4]">Max Pending Transactions:</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={settings.nonceTracking.maxPendingTransactions}
                  onChange={(e) => updateField("nonceTracking", "maxPendingTransactions", Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-lg bg-[#08090C] border border-white/[0.1] text-white text-right focus:border-[#C9A961] outline-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-void-2/40 rounded-xl border border-white/[0.05]">
                <label className="text-[#C2BEB4]">Gap Resolution Strategy:</label>
                <select
                  value={settings.nonceTracking.gapResolutionStrategy}
                  onChange={(e) => updateField("nonceTracking", "gapResolutionStrategy", e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#08090C] border border-white/[0.1] text-white focus:border-[#C9A961] outline-none cursor-pointer"
                >
                  <option value="replace">replace</option>
                  <option value="cancel_first">cancel_first</option>
                </select>
              </div>
            </div>
          </section>

          {/* SECTION 3: GAS STRATEGY */}
          <section className="space-y-4">
            <div className="text-xs font-bold tracking-widest text-[#C9A961] uppercase border-b border-white/[0.06] pb-2">
              GAS STRATEGY
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-void-2/40 rounded-xl border border-white/[0.05]">
                <label className="text-[#C2BEB4]">Minimum Gas Increase:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.gasStrategy.minGasIncreasePct}
                    onChange={(e) => updateField("gasStrategy", "minGasIncreasePct", Number(e.target.value))}
                    className="w-24 px-3 py-1.5 rounded-lg bg-[#08090C] border border-white/[0.1] text-white text-right focus:border-[#C9A961] outline-none"
                  />
                  <span className="text-[#686660] w-6">%</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-void-2/40 rounded-xl border border-white/[0.05]">
                <label className="text-[#C2BEB4]">Max Fee Multiplier:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1.1"
                    max="5.0"
                    step="0.1"
                    value={settings.gasStrategy.maxFeeMultiplier}
                    onChange={(e) => updateField("gasStrategy", "maxFeeMultiplier", Number(e.target.value))}
                    className="w-24 px-3 py-1.5 rounded-lg bg-[#08090C] border border-white/[0.1] text-white text-right focus:border-[#C9A961] outline-none"
                  />
                  <span className="text-[#686660] w-6">x</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-void-2/40 rounded-xl border border-white/[0.05]">
                <label className="text-[#C2BEB4]">Priority Fee Strategy:</label>
                <select
                  value={settings.gasStrategy.priorityFeeStrategy}
                  onChange={(e) => updateField("gasStrategy", "priorityFeeStrategy", e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#08090C] border border-white/[0.1] text-white focus:border-[#C9A961] outline-none cursor-pointer"
                >
                  <option value="max">max</option>
                  <option value="market_average">market_average</option>
                  <option value="aggressive">aggressive</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-void-2/40 rounded-xl border border-white/[0.05]">
                <label className="text-[#C2BEB4]">Max Gas Price Cap:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={settings.gasStrategy.maxGasPriceCapGwei}
                    onChange={(e) => updateField("gasStrategy", "maxGasPriceCapGwei", Number(e.target.value))}
                    className="w-24 px-3 py-1.5 rounded-lg bg-[#08090C] border border-white/[0.1] text-white text-right focus:border-[#C9A961] outline-none"
                  />
                  <span className="text-[#686660] w-10">gwei</span>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: CIRCUIT BREAKER */}
          <section className="space-y-4">
            <div className="text-xs font-bold tracking-widest text-[#C9A961] uppercase border-b border-white/[0.06] pb-2">
              CIRCUIT BREAKER
            </div>
            <div className="p-4 bg-void-2/50 rounded-xl border border-white/[0.05] space-y-4">
              {/* Row 1: Enabled, Threshold, Window */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="flex items-center gap-3">
                  <span className="text-[#C2BEB4]">Enabled:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.circuitBreaker.enabled}
                      onChange={(e) => updateField("circuitBreaker", "enabled", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C9A961]"></div>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[#C2BEB4]">Threshold:</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.circuitBreaker.failureThreshold}
                    onChange={(e) => updateField("circuitBreaker", "failureThreshold", Number(e.target.value))}
                    className="w-20 px-2.5 py-1 rounded-lg bg-[#08090C] border border-white/[0.1] text-white text-right focus:border-[#C9A961] outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[#C2BEB4]">Window:</span>
                  <input
                    type="number"
                    min="10000"
                    max="3600000"
                    step="10000"
                    value={settings.circuitBreaker.failureWindow}
                    onChange={(e) => updateField("circuitBreaker", "failureWindow", Number(e.target.value))}
                    className="w-24 px-2.5 py-1 rounded-lg bg-[#08090C] border border-white/[0.1] text-white text-right focus:border-[#C9A961] outline-none"
                  />
                  <span className="text-[#686660]">ms</span>
                </div>
              </div>

              {/* Row 2: Cooldown, Auto-Recovery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2 border-t border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <span className="text-[#C2BEB4]">Cooldown:</span>
                  <input
                    type="number"
                    min="5000"
                    max="600000"
                    step="5000"
                    value={settings.circuitBreaker.cooldownPeriod}
                    onChange={(e) => updateField("circuitBreaker", "cooldownPeriod", Number(e.target.value))}
                    className="w-24 px-2.5 py-1 rounded-lg bg-[#08090C] border border-white/[0.1] text-white text-right focus:border-[#C9A961] outline-none"
                  />
                  <span className="text-[#686660]">ms</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[#C2BEB4]">Auto-Recovery:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.circuitBreaker.autoRecovery}
                      onChange={(e) => updateField("circuitBreaker", "autoRecovery", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C9A961]"></div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 5: ALERTS */}
          <section className="space-y-4">
            <div className="text-xs font-bold tracking-widest text-[#C9A961] uppercase border-b border-white/[0.06] pb-2">
              ALERTS
            </div>
            <div className="p-4 bg-void-2/50 rounded-xl border border-white/[0.05] space-y-4">
              {/* Webhook URLs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#C2BEB4] block">Telegram Webhook:</label>
                  <input
                    type="url"
                    placeholder="https://api.telegram.org/bot.../sendMessage"
                    value={settings.alerts.telegramWebhookUrl}
                    onChange={(e) => updateField("alerts", "telegramWebhookUrl", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#08090C] border border-white/[0.1] text-white placeholder:text-[#686660] focus:border-[#C9A961] outline-none font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#C2BEB4] block">Discord Webhook:</label>
                  <input
                    type="url"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={settings.alerts.discordWebhookUrl}
                    onChange={(e) => updateField("alerts", "discordWebhookUrl", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#08090C] border border-white/[0.1] text-white placeholder:text-[#686660] focus:border-[#C9A961] outline-none font-mono text-xs"
                  />
                </div>
              </div>

              {/* Webhook Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSendTestAlert}
                  className="px-4 py-2 rounded-lg bg-[#171A20] hover:bg-[#20242D] border border-white/[0.1] hover:border-[#C9A961] text-white font-mono text-xs transition-colors flex items-center gap-2"
                >
                  <Bell className="w-3.5 h-3.5 text-[#C9A961]" />
                  <span>Send Test Alert</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal("clear_webhooks")}
                  className="px-4 py-2 rounded-lg bg-[#171A20] hover:bg-red-500/10 border border-white/[0.1] hover:border-red-500/40 text-[#C2BEB4] hover:text-red-400 font-mono text-xs transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Webhooks</span>
                </button>

                {testAlertStatus && (
                  <span className="text-xs text-[#C9A961] font-mono animate-fadeIn">
                    {testAlertStatus}
                  </span>
                )}
              </div>

              {/* Alert Triggers Checkboxes */}
              <div className="pt-2 border-t border-white/[0.04] flex flex-wrap items-center gap-6 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.alerts.alertOnGapDetected}
                    onChange={(e) => updateField("alerts", "alertOnGapDetected", e.target.checked)}
                    className="rounded bg-[#08090C] border-white/20 text-[#C9A961] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[#C2BEB4]">On Gap Detected</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.alerts.alertOnGapResolved}
                    onChange={(e) => updateField("alerts", "alertOnGapResolved", e.target.checked)}
                    className="rounded bg-[#08090C] border-white/20 text-[#C9A961] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[#C2BEB4]">On Resolved</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.alerts.alertOnGapResolutionFailed}
                    onChange={(e) => updateField("alerts", "alertOnGapResolutionFailed", e.target.checked)}
                    className="rounded bg-[#08090C] border-white/20 text-[#C9A961] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[#C2BEB4]">On Failed</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.alerts.alertOnCircuitBreaker}
                    onChange={(e) => updateField("alerts", "alertOnCircuitBreaker", e.target.checked)}
                    className="rounded bg-[#08090C] border-white/20 text-[#C9A961] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[#C2BEB4]">On CB</span>
                </label>
              </div>
            </div>
          </section>

          {/* MAIN ACTIONS: SAVE & RESET */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || hasBlockingErrors || !isDirty}
              className={`px-6 py-3 rounded-xl font-bold font-mono text-xs transition-all flex items-center gap-2 ${
                isDirty && !hasBlockingErrors
                  ? "bg-[#C9A961] hover:bg-[#E5C989] text-black shadow-[0_0_20px_rgba(201,169,97,0.35)] cursor-pointer"
                  : "bg-white/10 text-[#686660] cursor-not-allowed"
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save Settings"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("reset_defaults")}
              className="px-6 py-3 rounded-xl bg-[#171A20] hover:bg-white/5 border border-white/[0.1] hover:border-white/20 text-white font-mono text-xs transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-[#C2BEB4]" />
              <span>Reset to Defaults</span>
            </button>

            {isDirty && (
              <span className="text-[11px] font-mono text-[#C9A961]">
                Unsaved changes pending application
              </span>
            )}
          </div>

          {/* DIVIDER LINE */}
          <hr className="border-white/[0.08] my-6" />

          {/* SECTION 6: DANGER ZONE */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-red-400 uppercase">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>DANGER ZONE</span>
            </div>

            <div className="p-4 rounded-xl bg-red-950/10 border border-red-500/20 space-y-4">
              <p className="text-[11px] text-[#C2BEB4]">
                Irreversible and critical interventions. Proceed with caution when modifying real-time mempool loops.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleHalt}
                  className={`px-4 py-2.5 rounded-lg font-mono text-xs font-semibold transition-colors flex items-center gap-2 ${
                    isHalted
                      ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>{isHalted ? "Resume Sentinel" : "Halt Sentinel"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal("reset_audit")}
                  className="px-4 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-mono text-xs font-semibold transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Audit Log</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetCircuitBreaker}
                  className="px-4 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-mono text-xs font-semibold transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Circuit Breaker</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* CONFIRMATION MODALS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#101216] border border-[#C9A961]/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-cinzel text-base font-bold text-white">
                  {activeModal === "clear_webhooks" && "Clear All Webhooks?"}
                  {activeModal === "reset_audit" && "Reset Audit Log?"}
                  {activeModal === "halt_sentinel" && "Halt Sentinel Watchdog?"}
                  {activeModal === "reset_defaults" && "Reset Settings to Defaults?"}
                </h3>
              </div>
            </div>

            <p className="text-xs text-[#C2BEB4] leading-relaxed">
              {activeModal === "clear_webhooks" &&
                "This will erase configured Telegram and Discord alert URLs. Alert notifications will be disabled."}
              {activeModal === "reset_audit" &&
                "This will permanently purge the local audit log file. All historical receipts will be lost."}
              {activeModal === "halt_sentinel" &&
                "Halting pauses the automated watchdog loop. Gap detection and automatic nonce healing will stop."}
              {activeModal === "reset_defaults" &&
                "This will revert all 6 configuration sections to their factory default values."}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setModalInputText("");
                }}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#C2BEB4] font-mono text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeModalAction}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-mono text-xs font-semibold transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
