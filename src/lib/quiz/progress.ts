'use client';

/**
 * Local grammar progress: which question ids the reader has attempted, by topic.
 *
 * Ported from `GrammarQuestionProgressStore` in
 * lib/core/grammar/grammar_question_progress.dart, down to the storage key and
 * the JSON shape (`{ "Topic name": [12, 34] }`), so the two clients at least
 * agree on what "solved" means: a question counts the moment it is answered,
 * right or wrong.
 *
 * **It does not sync.** The app keeps this in SharedPreferences on the device
 * and there is no endpoint behind it, so the website keeps its own copy in this
 * browser. The UI says so rather than implying a shared number.
 */

const KEY = 'grammar_topic_solved_v1';
const CHANGED = 'erfan:grammar-progress';

type Store = Record<string, number[]>;

function parse(raw: string): Store {
  try {
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const out: Store = {};
    for (const [topic, value] of Object.entries(parsed as Record<string, unknown>)) {
      const key = topic.trim();
      if (!key || !Array.isArray(value)) continue;
      const ids = value
        .map((v) => (typeof v === 'number' ? v : Number.parseInt(String(v), 10)))
        .filter((n) => Number.isInteger(n) && n > 0);
      if (ids.length > 0) out[key] = ids;
    }
    return out;
  } catch {
    // A corrupt value: start empty rather than taking the page down.
    return {};
  }
}

function read(): Store {
  if (typeof window === 'undefined') return {};
  try {
    return parse(window.localStorage.getItem(KEY) ?? '');
  } catch {
    // Private mode or blocked storage.
    return {};
  }
}

function write(store: Store): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: Store = {};
    for (const [topic, ids] of Object.entries(store)) {
      payload[topic] = [...ids].sort((a, b) => a - b);
    }
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Storage can be unavailable or full. Progress is a convenience, never a
    // requirement, so a failed write is silent by design.
  }
}

/** How many questions of a topic have been attempted. */
export function solvedCountForTopic(topic: string): number {
  return read()[topic.trim()]?.length ?? 0;
}

/** Attempted counts for many topics at once — one storage read, not N. */
export function solvedCounts(topics: readonly string[]): Record<string, number> {
  const store = read();
  const out: Record<string, number> = {};
  for (const topic of topics) {
    const key = topic.trim();
    out[key] = store[key]?.length ?? 0;
  }
  return out;
}

/** Every attempted id that appears in this pool, across all topics. */
export function solvedIdsForPool(poolIds: readonly number[]): Set<number> {
  const store = read();
  const inPool = new Set(poolIds);
  const out = new Set<number>();
  for (const ids of Object.values(store)) {
    for (const id of ids) {
      if (inPool.has(id)) out.add(id);
    }
  }
  return out;
}

/** Record that a question was answered. Returns true if this is the first time. */
export function markAttempted(topic: string, questionId: number): boolean {
  if (!Number.isInteger(questionId) || questionId <= 0) return false;
  const key = topic.trim();
  if (!key) return false;

  const store = read();
  const ids = store[key] ?? [];
  if (ids.includes(questionId)) return false;

  store[key] = [...ids, questionId];
  write(store);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGED));
  }
  return true;
}

/** Forget everything. Offered in the UI so the reader can start over. */
export function clearProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // Nothing to do; see write().
  }
}

/* ── reading it from React ─────────────────────────────────────────────────
 *
 * localStorage is an external store, so components subscribe to it rather than
 * copying it into state inside an effect — which would cause the cascading
 * render React warns about, and would also miss a change made in another tab.
 *
 * The snapshot is the raw string. That matters: `useSyncExternalStore` compares
 * snapshots by identity, and a fresh object each call would loop forever. The
 * string is stable until the value actually changes, and callers parse it with
 * `useMemo`.
 */

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  // `storage` fires for other tabs; the custom event covers this one.
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

function getSnapshot(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * On the server there is no storage, so it renders as *no progress recorded*
 * rather than as unknown.
 *
 * That choice is what lets the quiz be server-rendered. The first client render
 * during hydration uses this same value, so the markup matches; React then
 * calls `getSnapshot`, sees the real storage, and re-picks before the reader
 * can interact. A returning reader's session is corrected within a frame, and a
 * first-time reader — who has no progress — never sees a change at all.
 *
 * Returning `null` here instead would mean rendering a skeleton until
 * hydration, which cost about two seconds of LCP on a throttled phone.
 */
function getServerSnapshot(): string {
  return '';
}

export const progressStore = { subscribe, getSnapshot, getServerSnapshot };

/**
 * A subscription that never fires, for readers that must see progress as it was
 * when they mounted.
 *
 * A running quiz is one: it records an answer the moment you give it, and if
 * the session rebuilt on every write the remaining questions would change
 * underneath you. Reading once is the correct behaviour here, not a shortcut.
 */
export const frozenProgressStore = {
  subscribe: (): (() => void) => () => {},
  getSnapshot,
  getServerSnapshot,
};

/** Parse a raw snapshot into attempted counts per topic. */
export function countsFromSnapshot(
  snapshot: string,
  topics: readonly string[]
): Record<string, number> {
  const store = parse(snapshot);
  const out: Record<string, number> = {};
  for (const topic of topics) {
    const key = topic.trim();
    out[key] = store[key]?.length ?? 0;
  }
  return out;
}

/** Parse a raw snapshot into the attempted ids that appear in a pool. */
export function solvedFromSnapshot(
  snapshot: string,
  poolIds: readonly number[]
): Set<number> {
  const store = parse(snapshot);
  const inPool = new Set(poolIds);
  const out = new Set<number>();
  for (const ids of Object.values(store)) {
    for (const id of ids) {
      if (inPool.has(id)) out.add(id);
    }
  }
  return out;
}
