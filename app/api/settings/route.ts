import { NextResponse } from "next/server";
import { publicClient, chainLabel } from "@/lib/viem";
import {
  SettingsWriteError,
  WEBHOOK_MASK,
  authorize,
  defaultSettings,
  isSafeWebhookUrl,
  maskWebhooks,
  privateKeyLoaded,
  readSettings,
  restoreMaskedWebhooks,
  writeSettings,
} from "@/lib/server/settings";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 102_400;

function hasPrototypePollution(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  for (const key of Object.keys(obj)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") return true;
    const child = (obj as Record<string, unknown>)[key];
    if (child && typeof child === "object" && hasPrototypePollution(child)) return true;
  }
  return false;
}

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function authFailure(result: "unauthorized" | "disabled") {
  return result === "unauthorized"
    ? NextResponse.json({ error: "Unauthorized: a valid admin token is required.", code: "unauthorized" }, { status: 401 })
    : NextResponse.json(
        { error: "Settings are read-only: set SETTINGS_ADMIN_TOKEN on the server to enable changes.", code: "disabled" },
        { status: 403 }
      );
}

async function rpcStatus() {
  try {
    const block = await Promise.race([
      publicClient.getBlockNumber(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    return { rpcConnection: "Connected", currentBlock: Number(block) };
  } catch {
    return { rpcConnection: "Unreachable", currentBlock: 0 };
  }
}

export async function GET(req: Request) {
  const settings = readSettings();
  const authorized = authorize(req) === "ok";
  const status = await rpcStatus();

  const uptimeSeconds = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  return NextResponse.json({
    settings: authorized ? settings : maskWebhooks(settings),
    status: {
      ...status,
      uptime: `${hours}h ${minutes}m ${seconds}s`,
      version: settings.system.version,
      chainId: `${settings.system.chainId} (${chainLabel})`,
    },
    envOverrides: {
      rpcUrl: Boolean(process.env.RPC_URL),
      privateKey: privateKeyLoaded(),
      logFilePath: Boolean(process.env.LOG_FILE),
    },
    canEdit: authorize(req) === "ok",
  });
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Validates a full settings object and returns the cleaned version (known keys only, right types). */
function validate(input: any): { settings?: any; error?: string } {
  const defaults = defaultSettings();
  const out: any = {};

  for (const section of Object.keys(defaults)) {
    out[section] = {};
    const given = input[section] && typeof input[section] === "object" ? input[section] : {};
    for (const key of Object.keys(defaults[section])) {
      const dflt = defaults[section][key];
      const value = given[key];
      out[section][key] = value !== undefined && typeof value === typeof dflt ? value : dflt;
    }
  }

  const n = out.nonceTracking, g = out.gasStrategy, e = out.evictionMonitoring, c = out.circuitBreaker, a = out.alerts, au = out.audit, s = out.system;

  if (!["replace", "cancel", "cancel_first"].includes(n.gapResolutionStrategy))
    return { error: 'gapResolutionStrategy must be "replace" or "cancel".' };
  if (!Number.isInteger(n.gapDetectionInterval) || n.gapDetectionInterval < 100 || n.gapDetectionInterval > 5000)
    return { error: "gapDetectionInterval must be an integer between 100ms and 5000ms." };
  if (!isNum(g.minGasIncreasePct) || g.minGasIncreasePct < 10 || g.minGasIncreasePct > 1000)
    return { error: "minGasIncreasePct must be between 10% (Base protocol minimum) and 1000%." };
  if (!isNum(g.maxFeeMultiplier) || g.maxFeeMultiplier < 1 || g.maxFeeMultiplier > 10)
    return { error: "maxFeeMultiplier must be between 1 and 10." };
  if (!isNum(g.maxGasPriceCapGwei) || g.maxGasPriceCapGwei <= 0 || g.maxGasPriceCapGwei > 100000)
    return { error: "maxGasPriceCapGwei must be greater than 0 and at most 100000." };
  if (!isNum(e.evictionTimeout) || e.evictionTimeout < 1000) return { error: "evictionTimeout must be at least 1000ms." };
  if (!Number.isInteger(e.maxEvictionResubmissions) || e.maxEvictionResubmissions < 0 || e.maxEvictionResubmissions > 20)
    return { error: "maxEvictionResubmissions must be an integer between 0 and 20." };
  if (!isNum(e.evictionBackoffMultiplier) || e.evictionBackoffMultiplier < 1 || e.evictionBackoffMultiplier > 10)
    return { error: "evictionBackoffMultiplier must be between 1 and 10." };
  if (!Number.isInteger(c.failureThreshold) || c.failureThreshold < 1 || c.failureThreshold > 100)
    return { error: "circuitBreaker failureThreshold must be an integer between 1 and 100." };
  if (!isNum(c.failureWindow) || c.failureWindow < 1000) return { error: "circuitBreaker failureWindow must be at least 1000ms." };
  if (!isNum(c.cooldownPeriod) || c.cooldownPeriod < 0) return { error: "circuitBreaker cooldownPeriod must be 0 or more." };
  if (!isNum(a.alertCooldown) || a.alertCooldown < 0) return { error: "alertCooldown must be 0 or more." };

  for (const [label, key] of [["Telegram", "telegramWebhookUrl"], ["Discord", "discordWebhookUrl"]] as const) {
    if (a[key] && !isSafeWebhookUrl(a[key])) return { error: `${label} webhook must be a public https:// URL.` };
  }

  if (typeof au.logFilePath !== "string" || au.logFilePath.includes("..") || /^([a-zA-Z]:)?[\\/]/.test(au.logFilePath))
    return { error: "logFilePath must be a relative path inside the project." };
  if (!isNum(au.maxLogSizeMb) || au.maxLogSizeMb < 1) return { error: "maxLogSizeMb must be at least 1." };
  if (!isNum(au.logRetentionDays) || au.logRetentionDays < 1) return { error: "logRetentionDays must be at least 1." };

  if (s.walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(s.walletAddress)) return { error: "walletAddress is not a valid address." };
  if (s.rpcUrl && !/^https?:\/\//.test(s.rpcUrl)) return { error: "rpcUrl must be an http(s) URL." };

  return { settings: out };
}

export async function POST(req: Request) {
  const auth = authorize(req);
  if (auth !== "ok") return authFailure(auth);

  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) return fail("Payload exceeds 100KB limit.", 413);

    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return fail("Payload exceeds 100KB limit.", 413);
    const body = JSON.parse(text);

    if (!body || typeof body !== "object" || hasPrototypePollution(body)) {
      return fail("Invalid payload: forbidden prototype property detected.");
    }

    if (body.action === "test_alert") {
      const stored = readSettings();
      const urls: string[] = [];
      for (const [given, key] of [[body.telegramUrl, "telegramWebhookUrl"], [body.discordUrl, "discordWebhookUrl"]] as const) {
        const url = given === WEBHOOK_MASK ? stored.alerts[key] : given;
        if (url) {
          if (!isSafeWebhookUrl(url)) return fail(`${key === "telegramWebhookUrl" ? "Telegram" : "Discord"} webhook must be a public https:// URL.`);
          urls.push(url);
        }
      }
      if (urls.length === 0) return fail("No webhook URLs configured to test.");

      const results = await Promise.allSettled(
        urls.map(async (url) => {
          const text = "Sentinel test alert: webhook delivery works.";
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, content: text }),
            redirect: "error",
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        })
      );
      const delivered = results.filter((r) => r.status === "fulfilled").length;
      if (delivered === 0) {
        return NextResponse.json({ error: "Test alert could not be delivered to any webhook." }, { status: 502 });
      }
      return NextResponse.json({
        success: true,
        results: { delivered, failed: results.length - delivered },
        message: `Test alert delivered to ${delivered} of ${results.length} webhook(s).`,
      });
    }

    if (body.action === "reset_defaults") {
      const defaults = defaultSettings();
      writeSettings(defaults);
      return NextResponse.json({ success: true, settings: maskWebhooks(readSettings()) });
    }

    if (body.action === "save_settings") {
      if (!body.settings || typeof body.settings !== "object") return fail("Invalid settings object.");
      restoreMaskedWebhooks(body.settings, readSettings());
      const { settings, error } = validate(body.settings);
      if (error || !settings) return fail(error ?? "Invalid settings.");
      writeSettings(settings);
      return NextResponse.json({ success: true, message: "Settings saved. The Sentinel daemon applies them on its next start." });
    }

    return fail("Unknown action");
  } catch (err) {
    if (err instanceof SettingsWriteError) return fail(err.message, 503);
    if (err instanceof SyntaxError) return fail("Request body is not valid JSON.");
    console.error("Settings request failed:", err);
    return fail("Failed to process settings request", 500);
  }
}
