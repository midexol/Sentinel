/**
 * Tiny in-memory TTL cache with in-flight de-duplication.
 *
 * Many viewers (and uptime probes) ask for the same chain data. Sharing one
 * RPC read per TTL window keeps serverless invocations short and stays well
 * inside public-RPC rate limits. The cache lives per server instance, so on
 * Vercel it is best-effort: it helps most under concurrent load.
 */
interface Entry<T> {
  expires: number;
  value?: T;
  pending?: Promise<T>;
}

const store = new Map<string, Entry<unknown>>();
const MAX_ENTRIES = 500;

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit) {
    if (hit.pending) return hit.pending;
    if (hit.expires > now && hit.value !== undefined) return hit.value;
  }

  const pending = load().then(
    (value) => {
      store.set(key, { expires: Date.now() + ttlMs, value });
      return value;
    },
    (err) => {
      store.delete(key); // never cache failures
      throw err;
    }
  );
  store.set(key, { expires: now + ttlMs, pending });

  if (store.size > MAX_ENTRIES) {
    for (const [k, e] of store) {
      if (e.expires <= now && !e.pending) store.delete(k);
    }
    // still too large (many distinct addresses): drop the oldest insertions
    while (store.size > MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest === undefined) break;
      store.delete(oldest);
    }
  }
  return pending;
}

/** Cache-Control for public, read-only JSON: shared by the CDN, refreshed in the background. */
export const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
} as const;
