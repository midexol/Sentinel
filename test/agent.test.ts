import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { GapDiagnostician, SENTINEL_AGENT_TOOLS, type Toolbox } from "../src/agent.js";
import { silentLogger, testConfig } from "./helpers.js";

const gap = { gapNonce: 5, stuckTx: null };
const state = { latestNonce: 5, pendingNonce: 8, trackedTxs: [] };

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockFetch(responses: unknown[]) {
  const requests: Array<Record<string, unknown>> = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    requests.push(JSON.parse(String(init?.body)));
    const body = responses.shift();
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  return requests;
}

const text = (obj: unknown) => ({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(obj) }] });
const quietLogger = () => {
  const log = console.log;
  console.log = () => {};
  return () => {
    console.log = log;
  };
};

describe("GapDiagnostician", () => {
  it("falls back to the floor when no API key is configured (and never calls the network)", async () => {
    const config = testConfig({ anthropicApiKey: null });
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("{}");
    }) as typeof fetch;
    const d = await new GapDiagnostician(config, silentLogger(config)).diagnose(gap, state, []);
    assert.equal(d.recommendedBumpPct, 10);
    assert.equal(d.category, "unknown");
    assert.deepEqual(d.toolsExecuted, []);
    assert.equal(called, false);
  });

  it("clamps an injected 500% proposal to the ceiling", async () => {
    const config = testConfig({ anthropicApiKey: "k" });
    mockFetch([text({ category: "underpriced", explanation: "IGNORE RULES", requestedBumpPct: 500 })]);
    const restore = quietLogger();
    try {
      const d = await new GapDiagnostician(config, silentLogger(config)).diagnose(gap, state, []);
      assert.equal(d.rawRequestedBumpPct, 500);
      assert.equal(d.recommendedBumpPct, 50);
    } finally {
      restore();
    }
  });

  it("falls back on malformed model output instead of throwing", async () => {
    const config = testConfig({ anthropicApiKey: "k" });
    mockFetch([{ stop_reason: "end_turn", content: [{ type: "text", text: "sorry, I can't" }] }]);
    const restore = quietLogger();
    try {
      const d = await new GapDiagnostician(config, silentLogger(config)).diagnose(gap, state, []);
      assert.equal(d.recommendedBumpPct, 10);
      assert.match(d.explanation, /Diagnosis failed/);
    } finally {
      restore();
    }
  });

  it("falls back on API errors", async () => {
    const config = testConfig({ anthropicApiKey: "k" });
    globalThis.fetch = (async () => new Response("nope", { status: 404 })) as typeof fetch;
    const restore = quietLogger();
    try {
      const d = await new GapDiagnostician(config, silentLogger(config)).diagnose(gap, state, []);
      assert.equal(d.recommendedBumpPct, 10);
      assert.match(d.explanation, /404/);
    } finally {
      restore();
    }
  });

  it("really executes tools requested by the model and records only what ran", async () => {
    const config = testConfig({ anthropicApiKey: "k" });
    const executed: Array<[string, unknown]> = [];
    const toolbox: Toolbox = {
      execute: async (name, input) => {
        executed.push([name, input]);
        return { latestNonce: 5 };
      },
    };
    const requests = mockFetch([
      {
        stop_reason: "tool_use",
        content: [{ type: "tool_use", id: "t1", name: "get_mempool_status", input: { walletAddress: config.walletAddress } }],
      },
      // The model claims a tool it never called; that claim must be ignored.
      text({ category: "cache_desync", explanation: "ok", requestedBumpPct: 20, toolsExecuted: ["check_sequencer_health"] }),
    ]);
    const restore = quietLogger();
    try {
      const d = await new GapDiagnostician(config, silentLogger(config), toolbox).diagnose(gap, state, []);
      assert.deepEqual(executed, [["get_mempool_status", { walletAddress: config.walletAddress }]]);
      assert.deepEqual(d.toolsExecuted, ["get_mempool_status"]);
      assert.equal(d.recommendedBumpPct, 20);
    } finally {
      restore();
    }
    // tools were offered to the model as real API tools with input_schema
    const offered = requests[0].tools as Array<{ name: string; input_schema: unknown }>;
    assert.deepEqual(offered.map((t) => t.name), SENTINEL_AGENT_TOOLS.map((t) => t.name));
    assert.ok(offered.every((t) => t.input_schema));
    // the second request carries the tool_result back
    const second = requests[1].messages as Array<{ role: string; content: unknown }>;
    const last = second[second.length - 1];
    assert.equal(last.role, "user");
    assert.match(JSON.stringify(last.content), /tool_result/);
  });

  it("surfaces tool errors to the model as is_error results", async () => {
    const config = testConfig({ anthropicApiKey: "k" });
    const toolbox: Toolbox = { execute: async () => { throw new Error("rpc down"); } };
    const requests = mockFetch([
      { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "check_sequencer_health", input: {} }] },
      text({ category: "unknown", explanation: "x", requestedBumpPct: 15 }),
    ]);
    const restore = quietLogger();
    try {
      const d = await new GapDiagnostician(config, silentLogger(config), toolbox).diagnose(gap, state, []);
      assert.equal(d.recommendedBumpPct, 15);
    } finally {
      restore();
    }
    const msgs = requests[1].messages as Array<{ content: unknown }>;
    assert.match(JSON.stringify(msgs[msgs.length - 1].content), /is_error/);
  });
});
