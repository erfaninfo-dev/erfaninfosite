/**
 * Per-category Word Builder level completion tracker stored in localStorage.
 * Pure helpers so stages progress is SSR-safe and easy to reset.
 */

export const WB_PROGRESS_KEY = 'erfan_wb_progress_v1';

export type CategoryProgressMap = Record<string, number[]>; // slug -> sorted completed 0-based level indices

const EMPTY_PROGRESS: CategoryProgressMap = {};
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined = undefined;
let cachedMap: CategoryProgressMap = EMPTY_PROGRESS;

export function readWbProgress(): CategoryProgressMap {
  if (typeof window === 'undefined') return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(WB_PROGRESS_KEY);
    if (raw === cachedRaw) return cachedMap;
    cachedRaw = raw;
    if (!raw) {
      cachedMap = EMPTY_PROGRESS;
      return cachedMap;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      cachedMap = EMPTY_PROGRESS;
      return cachedMap;
    }
    const out: CategoryProgressMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        out[k] = [...new Set(v.filter((n): n is number => typeof n === 'number' && n >= 0))].sort(
          (a, b) => a - b
        );
      }
    }
    cachedMap = out;
    return cachedMap;
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function getServerWbProgress(): CategoryProgressMap {
  return EMPTY_PROGRESS;
}

export function subscribeWbProgress(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== 'undefined') {
    const onStorage = (e: StorageEvent) => {
      if (e.key === WB_PROGRESS_KEY) {
        cachedRaw = undefined;
        listener();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }
  return () => {
    listeners.delete(listener);
  };
}

function writeWbProgress(next: CategoryProgressMap) {
  if (typeof window === 'undefined') return;
  try {
    const raw = JSON.stringify(next);
    cachedRaw = raw;
    cachedMap = next;
    window.localStorage.setItem(WB_PROGRESS_KEY, raw);
    for (const fn of listeners) fn();
  } catch {
    /* ignore */
  }
}

export function markCategoryLevelCompleted(slug: string, levelIndex: number): void {
  const cur = readWbProgress();
  const list = cur[slug] ?? [];
  if (list.includes(levelIndex)) return;
  writeWbProgress({
    ...cur,
    [slug]: [...list, levelIndex].sort((a, b) => a - b),
  });
}

export function clearCategoryProgress(slug: string): void {
  const cur = readWbProgress();
  if (!(slug in cur)) return;
  const next = { ...cur };
  delete next[slug];
  writeWbProgress(next);
}

export function clearAllWbProgress(): void {
  writeWbProgress({});
}
