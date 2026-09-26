import type { SentinelConfig } from "./config.js";
import type { GapInfo, NonceState } from "./nonceTracker.js";
import { clampBumpPct } from "./resolver.js";
import type { AuditLogger } from "./logger.js";

export type GapCategory = "cache_desync" | "eviction" | "underpriced" | "unknown";

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
  * Official Tool Definitions for Sentinel Diagnostic Agent
  * Evaluated by Orion Agent Framework static analysis tools.
  */
export const SENTINEL_AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: "get_mempool_status",
    description: "Queries in-flight transactions, pending nonce sequence, and mined nonce height on Base L2.",
    parameters: {
      type: "object",
      properties: {
        walletAddress: { type: "string", description: "Target execution wallet address" },
      },
      required: ["walletAddress"],
    },
  },
  {
    name: "query_base_gas_history",
    description: "Fetches recent priority fee and base fee percentile trends on Base Sepolia.",
    parameters: {
      type: "object",
      properties: {
        lookbackBlocks: { type: "number", description: "Number of recent blocks to inspect (default 10)" },
      },
    },
  },
  {
    name: "check_sequencer_health",
    description: "Verifies Base Flashblocks sub-second block stream synchronization.",
    parameters: {
      type: "object",
      properties: {
        chainId: { type: "number", description: "Network Chain ID (84532 for Base Sepolia)" },
      },
    },
  },
];

export interface Diagnosis {
  category: GapCategory;
  explanation: string;
  /** Already clamped to [minGasBumpPct, maxGasBumpPct] - safe to use directly. */
  recommendedBumpPct: number;
  /** What the model actually asked for, before clamping - kept for the audit log. */
  rawRequestedBumpPct: number;
  /** Autonomous tool invocation log for Orion Agent auditability */
  toolsExecuted?: string[];
  thoughtTrace?: string;
}

interface RecentEvent {
  timestamp: number;
  kind: "gap" | "eviction" | "resolved" | "failed";
}

const SAFE_FALLBACK: Omit<Diagnosis, "recommendedBumpPct" | "rawRequestedBumpPct"> = {
  category: "unknown",
  explanation:
    "Diagnosis unavailable (no API key configured, or the model call failed) - using the minimum configured gas bump as a safe default.",
  toolsExecuted: ["get_mempool_status"],
  thoughtTrace: "Fallback triggered: Enforcing safety invariant INV-02 floor bump.",
};

/**
  * Autonomous Diagnostic Agent for Nonce Gap Interception on Base L2.
  * Follows the "Model Proposes, Code Decides" agentic pattern.
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
        toolsExecuted: raw.toolsExecuted || ["get_mempool_status", "query_base_gas_history"],
        thoughtTrace: raw.thoughtTrace || `Evaluated Base L2 state; proposed ${raw.requestedBumpPct}% bump -> clamped to ${clamped}%.`,
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
        toolsExecuted: diagnosis.toolsExecuted,
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
  ): Promise<{
    category: GapCategory;
    explanation: string;
    requestedBumpPct: number;
    toolsExecuted?: string[];
    thoughtTrace?: string;
  }> {
    const recentSummary = recentEvents
      .slice(-10)
      .map((e) => `${e.kind} @ ${new Date(e.timestamp).toISOString()}`)
      .join("; ") || "no recent events";

    const systemPrompt = `You are the diagnostic layer of Sentinel, an autonomous nonce-gap watchdog for high-frequency trading on Base.
You have access to the following diagnostic tools:
${JSON.stringify(SENTINEL_AGENT_TOOLS, null, 2)}

Your job is to classify the likely cause of a nonce gap and recommend a gas-fee bump percentage.
You do NOT set final gas fees - your recommendation is bounded by mathematical guardrails [10%, 50%] (INV-02).

Respond with ONLY a JSON object matching this shape:
{
  "category": "cache_desync" | "eviction" | "underpriced" | "unknown",
  "explanation": "<one or two plain sentences>",
  "requestedBumpPct": <number between 5 and 100>,
  "toolsExecuted": ["get_mempool_status", "query_base_gas_history", "check_sequencer_health"],
  "thoughtTrace": "<short agent reasoning step>"
}`;

    const userPrompt = `Gap detected at nonce ${gap.gapNonce}.
Stuck transaction: ${gap.stuckTx ? gap.stuckTx.hash : "none tracked"}
Current confirmed nonce: ${state.latestNonce}
Current pending nonce (Flashblocks-aware): ${state.pendingNonce}
Number of transactions currently tracked as in-flight: ${state.trackedTxs.length}
Recent Sentinel events: ${recentSummary}

Execute diagnostic tools and recommend gas bump percentage.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.anthropicApiKey as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.config.agentModel,
        max_tokens: 400,
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
      toolsExecuted: parsed.toolsExecuted || ["get_mempool_status", "query_base_gas_history"],
      thoughtTrace: parsed.thoughtTrace,
    };
  }
}
