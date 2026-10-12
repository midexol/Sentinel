import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cached } from "../lib/cache.js";

describe("cached()", () => {
  it("shares one load between concurrent callers", async () => {
    let calls = 0;
    const load = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 20));
      return calls;
    };
    const results = await Promise.all([cached("t:concurrent", 1000, load), cached("t:concurrent", 1000, load), cached("t:concurrent", 1000, load)]);
    assert.deepEqual(results, [1, 1, 1]);
    assert.equal(calls, 1);
  });

  it("serves from cache within the TTL and reloads after it", async () => {
    let calls = 0;
    const load = async () => ++calls;
    assert.equal(await cached("t:ttl", 30, load), 1);
    assert.equal(await cached("t:ttl", 30, load), 1);
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(await cached("t:ttl", 30, load), 2);
  });

  it("never caches a failure", async () => {
    let calls = 0;
    const load = async () => {
      calls++;
      if (calls === 1) throw new Error("rpc down");
      return "ok";
    };
    await assert.rejects(cached("t:fail", 1000, load), /rpc down/);
    assert.equal(await cached("t:fail", 1000, load), "ok");
  });

  it("keeps keys independent", async () => {
    assert.equal(await cached("t:a", 1000, async () => "a"), "a");
    assert.equal(await cached("t:b", 1000, async () => "b"), "b");
  });
});
