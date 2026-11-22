/**
 * Client-side Normal Campaign progress & cross-stage solved words store
 * (localStorage + useSyncExternalStore).
 *
 * Mirrors Flutter's:
 * - `WordBuilderCampaignProgressSnapshot` (`bc`, `ic`, `ac`)
 * - `kWordBuilderCampaignPlanSeedPrefsKey` (synced to a cookie on Reset so the
 *   server builds a fresh shuffled 150-stage plan)
 * - `WordBuilderProgressRepository` per-scope solved words set so bonus catalog
 *   words already solved in earlier stages are treated as duplicates
 *   (`_wasSolvedAnywhere`), never accepted twice!
 */

import { STAGES_PER_TIER } from './campaign';
import type { WordBuilderDifficulty } from './types';

export const WB_CAMPAIGN_PROGRESS_KEY = 'erfan_wb_campaign_v1';
export const WB_CAMPAIGN_SEED_COOKIE = 'wb_campaign_seed';
export const WB_SOLVED_WORDS_KEY = 'erfan_wb_solved_v1';

export type CampaignProgress = {
  beginner: number;
  intermediate: number;
  advanced: number;
  /** Optional reshuffle seed bumped when the user clicks Reset. */
  seed: number;
};

const EMPTY: CampaignProgress = {
  beginner: 0,
  intermediate: 0,
  advanced: 0,
  seed: 0,
};

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined = undefined;
let cachedVal: CampaignProgress = EMPTY;

function clampStageCount(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(STAGES_PER_TIER, Math.floor(v)));
}

export function readCampaignProgress(): CampaignProgress {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(WB_CAMPAIGN_PROGRESS_KEY);
    if (raw === cachedRaw) return cachedVal;
    cachedRaw = raw;
    if (!raw) {
      cachedVal = EMPTY;
      return cachedVal;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object') {
      cachedVal = EMPTY;
      return cachedVal;
    }
    cachedVal = {
      beginner: clampStageCount(parsed.bc),
      intermediate: clampStageCount(parsed.ic),
      advanced: clampStageCount(parsed.ac),
      seed: typeof parsed.seed === 'number' && Number.isFinite(parsed.seed) ? parsed.seed : 0,
    };
    return cachedVal;
  } catch {
    return EMPTY;
  }
}

export function getServerCampaignProgress(): CampaignProgress {
  return EMPTY;
}

export function subscribeCampaignProgress(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== 'undefined') {
    const onStorage = (e: StorageEvent) => {
      if (e.key === WB_CAMPAIGN_PROGRESS_KEY) {
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

function writeCampaignProgress(next: CampaignProgress): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify({
      v: 1,
      bc: next.beginner,
      ic: next.intermediate,
      ac: next.advanced,
      seed: next.seed,
    });
    cachedRaw = payload;
    cachedVal = next;
    window.localStorage.setItem(WB_CAMPAIGN_PROGRESS_KEY, payload);
    for (const fn of listeners) fn();
  } catch {
    /* ignore */
  }
}

function setSeedCookie(seed: number): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${WB_CAMPAIGN_SEED_COOKIE}=${seed}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function clearedForDifficulty(
  progress: CampaignProgress,
  difficulty: WordBuilderDifficulty
): number {
  switch (difficulty) {
    case 'beginner':
      return progress.beginner;
    case 'intermediate':
      return progress.intermediate;
    case 'advanced':
      return progress.advanced;
  }
}

export function isDifficultyUnlocked(
  progress: CampaignProgress,
  difficulty: WordBuilderDifficulty,
  unlockAll = false
): boolean {
  if (unlockAll) return true;
  switch (difficulty) {
    case 'beginner':
      return true;
    case 'intermediate':
      return progress.beginner >= STAGES_PER_TIER;
    case 'advanced':
      return progress.intermediate >= STAGES_PER_TIER;
  }
}

export function isStageUnlocked(
  progress: CampaignProgress,
  difficulty: WordBuilderDifficulty,
  stage1Based: number,
  unlockAll = false
): boolean {
  if (stage1Based < 1 || stage1Based > STAGES_PER_TIER) return false;
  if (unlockAll) return true;
  if (!isDifficultyUnlocked(progress, difficulty)) return false;
  return stage1Based <= clearedForDifficulty(progress, difficulty) + 1;
}

export function isStageCompleted(
  progress: CampaignProgress,
  difficulty: WordBuilderDifficulty,
  stage1Based: number
): boolean {
  return (
    stage1Based >= 1 &&
    stage1Based <= STAGES_PER_TIER &&
    stage1Based <= clearedForDifficulty(progress, difficulty)
  );
}

/**
 * Exact Flutter `afterClearingStage`: advances cleared count when the player
 * finishes the next sequential stage (`stage1Based === cleared + 1`).
 */
export function markCampaignStageCleared(
  difficulty: WordBuilderDifficulty,
  stage1Based: number
): CampaignProgress {
  const cur = readCampaignProgress();
  if (stage1Based < 1 || stage1Based > STAGES_PER_TIER) return cur;
  const cleared = clearedForDifficulty(cur, difficulty);
  if (stage1Based <= cleared) return cur;
  const updatedCount = Math.min(
    STAGES_PER_TIER,
    Math.max(cleared + 1, stage1Based === cleared + 1 ? cleared + 1 : cleared)
  );
  if (updatedCount === cleared) return cur;
  const next: CampaignProgress = {
    ...cur,
    [difficulty]: updatedCount,
  };
  writeCampaignProgress(next);
  return next;
}

/**
 * Resets all Normal campaign progress, clears solved-word history for Normal,
 * and rolls a fresh reshuffle seed (stored in cookie so SSR picks fresh stages).
 */
export function resetCampaignProgress(): CampaignProgress {
  const cur = readCampaignProgress();
  let seed = (Date.now() & 0x7fffffff) || 1;
  if (seed === cur.seed) seed = ((seed + 1) & 0x7fffffff) || 1;
  const next: CampaignProgress = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
    seed,
  };
  writeCampaignProgress(next);
  setSeedCookie(seed);
  clearSolvedWords('campaign');
  return next;
}

/* ── Cross-stage solved words persistence (`_wasSolvedAnywhere`) ─────────── */

type SolvedStore = Record<string, string[]>;

function readSolvedStore(): SolvedStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(WB_SOLVED_WORDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as SolvedStore;
  } catch {
    return {};
  }
}

function writeSolvedStore(store: SolvedStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WB_SOLVED_WORDS_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function readSolvedWords(scope: string): Set<string> {
  const list = readSolvedStore()[scope];
  return new Set(Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string') : []);
}

export function recordSolvedWord(scope: string, normalizedWord: string): void {
  if (!normalizedWord) return;
  const store = readSolvedStore();
  const existing = Array.isArray(store[scope]) ? store[scope] : [];
  if (existing.includes(normalizedWord)) return;
  store[scope] = [...existing, normalizedWord];
  writeSolvedStore(store);
}

export function clearSolvedWords(scope: string): void {
  const store = readSolvedStore();
  if (!(scope in store)) return;
  delete store[scope];
  writeSolvedStore(store);
}
