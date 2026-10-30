/**
 * A deterministic shuffle.
 *
 * Server rendering must be pure: the same inputs produce the same output. That
 * matters twice over here — React Compiler rejects `Math.random()` during
 * render, and a cached page would serve the same "random" order to every
 * visitor for the life of the cache entry anyway, so true randomness there
 * buys nothing.
 *
 * A seed derived from the content (a category id, say) gives a different order
 * per category, stable across renders and safe to hydrate. Genuine randomness
 * belongs in an event handler, where the reader asks for a new round.
 */

/** mulberry32: small, fast, good enough for ordering a word list. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const random = seededRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
