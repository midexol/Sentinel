import type { SentinelConfig } from "./config.js";
import type { GapInfo, NonceState } from "./nonceTracker.js";
import { clampBumpPct } from "./resolver.js";
import type { AuditLogger } from "./logger.js";

export type GapCategory = "cache_desync" | "eviction" | "underpriced" | "unknown";

export interface Diagnosis {
  category: GapCategory;
  explanation: string;
  /** Already clamped to [minGasBumpPct, maxGasBumpPct] - safe to use directly. */
  recommendedBumpPct: number;
  /** What the model actually asked for, before clamping - kept for the audit log. */
  rawRequestedBumpPct: number;
}

interface RecentEvent {
  timestamp: number;
  kind: "gap" | "eviction" | "resolved" | "failed";
}

const SAFE_FALLBACK: Omit<Diagnosis, "recommendedBumpPct" | "rawRequestedBumpPct"> = {
  category: "unknown",
  explanation:
    "Diagnosis unavailable (no API key configured, or the model call failed) - using the minimum configured gas bump as a safe default.",
};

/**
 * Reasons about *why* a gap happened and *how aggressively* to respond,
 * given recent history. It never touches gas fees or signs anything
 * itself - it returns a recommendation that the resolver clamps into
 * [minGasBumpPct, maxGasBumpPct] no matter what comes back. If the model
 * is unavailable, misconfigured, or returns something unparseable, this
 * falls back to the safety floor rather than guessing or throwing.
 */
export class GapDiagnostician {
  constructor(private readonly config: SentinelConfig, private readonly logger: AuditLogger) {}

  async diagnose(gap: GapInfo, state: NonceState, recentEvents: RecentEvent[]): Promise<Diagnosis> {
    if (!this.config.anthropicApiKey) {
      const fallback = {
        ...SAFE_FALLBACK,
        recommendedBumpPct: this.config.minGasBumpPct,
        rawRequestedBumpPct: this.config.minGasBumpPct,
      };
      return fallback;
    }

    try {
      const raw = await this.callModel(gap, state, recentEvents);
      const clamped = clampBumpPct(raw.requestedBumpPct, this.config);

      const diagnosis: Diagnosis = {
        category: raw.category,
        explanation: raw.explanation,
        recommendedBumpPct: clamped,
        rawRequestedBumpPct: raw.requestedBumpPct,
      };

      await this.logger.log({
        action: "diagnosis",
        wallet: this.config.walletAddress,
        gapNonce: gap.gapNonce,
        category: diagnosis.category,
        explanation: diagnosis.explanation,
        rawRequestedBumpPct: diagnosis.rawRequestedBumpPct,
        clampedBumpPct: diagnosis.recommendedBumpPct,
        wasClamped: diagnosis.rawRequestedBumpPct !== diagnosis.recommendedBumpPct,
      });

      return diagnosis;
    } catch (err) {
      const fallback = {
        ...SAFE_FALLBACK,
        explanation: `Diagnosis failed (${err instanceof Error ? err.message : String(err)}) - using the minimum configured gas bump as a safe default.`,
        recommendedBumpPct: this.config.minGasBumpPct,
        rawRequestedBumpPct: this.config.minGasBumpPct,
      };
      await this.logger.log({
        action: "diagnosis",
        wallet: this.config.walletAddress,
        gapNonce: gap.gapNonce,
        category: fallback.category,
        explanation: fallback.explanation,
        error: true,
      });
      return fallback;
    }
  }

  private async callModel(
    gap: GapInfo,
    state: NonceState,
    recentEvents: RecentEvent[]
  ): Promise<{ category: GapCategory; explanation: string; requestedBumpPct: number }> {
    const recentSummary = recentEvents
      .slice(-10)
      .map((e) => `${e.kind} @ ${new Date(e.timestamp).toISOString()}`)
      .join("; ") || "no recent events";

    const systemPrompt = `You are the diagnostic layer of Nonce Sentinel, a nonce-gap watchdog for a trading bot on Base.
A nonce gap was just detected. Your job is to classify the likely cause and recommend a gas-fee bump percentage.
You do NOT set the final gas fee - your number is a recommendation that gets clamped to a safe range by the caller regardless of what you say. Be honest even if you're uncertain.

Respond with ONLY a JSON object, no markdown fences, no preamble, matching exactly this shape:
{"category": "cache_desync" | "eviction" | "underpriced" | "unknown", "explanation": "<one or two plain sentences>", "requestedBumpPct": <number between 5 and 100>}`;

    const userPrompt = `Gap detected at nonce ${gap.gapNonce}.
Stuck transaction: ${gap.stuckTx ? gap.stuckTx.hash : "none tracked"}
Current confirmed nonce: ${state.latestNonce}
Current pending nonce (Flashblocks-aware): ${state.pendingNonce}
Number of transactions currently tracked as in-flight: ${state.trackedTxs.length}
Recent Sentinel events: ${recentSummary}

Classify this gap and recommend a bump percentage.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.anthropicApiKey as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.config.agentModel,
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API returned ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
    };

    const textBlock = data.content.find((b) => b.type === "text");
    if (!textBlock?.text) {
      throw new Error("Model response contained no text block");
    }

    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const validCategories: GapCategory[] = ["cache_desync", "eviction", "underpriced", "unknown"];
    if (!validCategories.includes(parsed.category)) {
      throw new Error(`Model returned invalid category: ${parsed.category}`);
    }
    if (typeof parsed.explanation !== "string" || typeof parsed.requestedBumpPct !== "number") {
      throw new Error("Model response missing required fields");
    }

    return {
      category: parsed.category,
      explanation: parsed.explanation,
      requestedBumpPct: parsed.requestedBumpPct,
    };
  }
}
