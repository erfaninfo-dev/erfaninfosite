/**
 * Normal Campaign planner — exact port of Flutter's `WordBuilderCampaignPlan`
 * (`word_builder_campaign_plan.dart`) & `pickCampaignStageEntries`
 * (`word_builder_vocab.dart`):
 *
 * - Draws from all public non-student books (`words.php?global=1` + `books.php`),
 *   split into `general` and `ielts` tracks.
 * - Uses a shared `usedHeads` set across Beginner → Intermediate → Advanced
 *   so words do NOT repeat across the 150 stages unless a pool is exhausted.
 * - Beginner (50 stages): General books first (length 2–3, fallback 2–4).
 * - Intermediate (50 stages): General books (length 3–4), fallback General + IELTS.
 * - Advanced (50 stages): IELTS books first (length 4+), General only when
 *   IELTS cannot fill a stage (`strictTrackFallback = true` — never mixes
 *   IELTS and General inside one Advanced stage).
 *
 * Pure module (zero browser/server globals) so it runs identically on server,
 * client, and unit tests.
 */

import { mulberry32 } from './levels';
import {
  canSpellFromPool,
  expandPoolLetters,
  gameLemma,
  letterCounts,
  normalizeWord,
  poolMaxPerLetterAcrossWords,
} from './logic';
import type {
  WordBuilderDifficulty,
  WordBuilderLevel,
  WordBuilderSourceWord,
  WordBuilderTargetWord,
} from './types';

export const STAGES_PER_TIER = 50;
export const CAMPAIGN_WORDS_PER_STAGE = 3;

export const CAMPAIGN_DIFFICULTIES: readonly WordBuilderDifficulty[] = [
  'beginner',
  'intermediate',
  'advanced',
] as const;

export function isCampaignDifficulty(value: string): value is WordBuilderDifficulty {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced';
}

export type BookTrack = 'general' | 'ielts';
export type BookTrackMap = Readonly<Record<number, BookTrack>>;

export type CampaignCatalogWord = WordBuilderSourceWord & {
  rowId?: number;
  bookId?: number;
};

export type CampaignPlan = Record<WordBuilderDifficulty, WordBuilderLevel[]>;

const IDEAL_PATTERNS: Record<WordBuilderDifficulty, readonly [number, number, number][]> = {
  beginner: [
    [2, 3, 3],
    [3, 3, 3],
    [2, 2, 3],
    [3, 3, 4],
  ],
  intermediate: [
    [3, 4, 4],
    [3, 4, 5],
    [3, 5, 5],
    [4, 4, 4],
    [4, 4, 5],
    [4, 5, 5],
    [5, 5, 5],
    [3, 3, 4],
    [4, 5, 6],
    [5, 6, 7],
  ],
  advanced: [
    [4, 5, 5],
    [4, 4, 5],
    [5, 5, 5],
    [4, 5, 6],
    [5, 5, 6],
    [5, 6, 6],
    [5, 6, 7],
    [6, 6, 7],
    [4, 4, 4],
    [6, 7, 7],
  ],
};

function minTileCount(d: WordBuilderDifficulty): number {
  return d === 'beginner' ? 3 : 4;
}

function toTarget(e: WordBuilderSourceWord): WordBuilderTargetWord {
  return {
    word: normalizeWord(e.word.trim()),
    meaning: e.meaning,
    exampleEn: e.exampleEn,
    exampleGloss: e.exampleGloss,
  };
}

function shuffleInPlace<T>(list: T[], random: () => number): void {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
}

/** Exact port of Flutter `_dedupePool` (sorted by rowId ascending, deduped by lemma). */
function dedupePool(raw: CampaignCatalogWord[]): CampaignCatalogWord[] {
  const sorted = [...raw].sort((a, b) => (a.rowId ?? 0) - (b.rowId ?? 0));
  const seen = new Set<string>();
  const out: CampaignCatalogWord[] = [];
  for (const item of sorted) {
    const lemma = gameLemma(item.word);
    if (!lemma || seen.has(lemma)) continue;
    seen.add(lemma);
    out.push(item);
  }
  return out;
}

function unusedLemmaPool(
  raw: CampaignCatalogWord[],
  usedHeads: Set<string>,
  { minLen = 2, maxLen = 7 }: { minLen?: number; maxLen?: number } = {}
): CampaignCatalogWord[] {
  return dedupePool(
    raw.filter((e) => {
      const h = gameLemma(e.word);
      if (!h || h.length < minLen || h.length > maxLen) return false;
      return !usedHeads.has(h);
    })
  );
}

function pickCampaignStageEntries(
  candidates: CampaignCatalogWord[],
  difficulty: WordBuilderDifficulty,
  usedHeads: Set<string>,
  random: () => number
): CampaignCatalogWord[] | null {
  const available: CampaignCatalogWord[] = [];
  const seen = new Set<string>();
  for (const e of candidates) {
    const k = gameLemma(e.word);
    if (!k || usedHeads.has(k) || seen.has(k)) continue;
    seen.add(k);
    available.push(e);
  }
  if (available.length < CAMPAIGN_WORDS_PER_STAGE) return null;

  const byLen = new Map<number, CampaignCatalogWord[]>();
  for (const e of available) {
    const len = gameLemma(e.word)!.length;
    const list = byLen.get(len) ?? [];
    list.push(e);
    byLen.set(len, list);
  }
  for (const list of byLen.values()) {
    shuffleInPlace(list, random);
  }

  const minTiles = minTileCount(difficulty);
  for (const [la, lb, lc] of IDEAL_PATTERNS[difficulty]) {
    const listA = byLen.get(la);
    const listB = byLen.get(lb);
    const listC = byLen.get(lc);
    if (!listA?.length || !listB?.length || !listC?.length) continue;

    for (let attempt = 0; attempt < 280; attempt += 1) {
      const ea = listA[Math.floor(random() * listA.length)]!;
      const eb = listB[Math.floor(random() * listB.length)]!;
      const ec = listC[Math.floor(random() * listC.length)]!;
      const ha = gameLemma(ea.word)!;
      const hb = gameLemma(eb.word)!;
      const hc = gameLemma(ec.word)!;
      if (ha === hb || ha === hc || hb === hc) continue;
      const pool = poolMaxPerLetterAcrossWords([ha, hb, hc]);
      let n = 0;
      for (const v of pool.values()) n += v;
      if (n < minTiles) continue;
      return [ea, eb, ec].sort(
        (x, y) => gameLemma(x.word)!.length - gameLemma(y.word)!.length
      );
    }
  }

  available.sort((a, b) => gameLemma(a.word)!.length - gameLemma(b.word)!.length);
  const scan = available.slice(0, 28);
  for (let a = 0; a < scan.length - 2; a += 1) {
    for (let b = a + 1; b < scan.length - 1; b += 1) {
      for (let c = b + 1; c < scan.length; c += 1) {
        const triple = [scan[a]!, scan[b]!, scan[c]!];
        const heads = triple.map((x) => gameLemma(x.word)!);
        const pool = poolMaxPerLetterAcrossWords(heads);
        let n = 0;
        for (const v of pool.values()) n += v;
        if (n >= minTiles) {
          return triple.sort(
            (x, y) => gameLemma(x.word)!.length - gameLemma(y.word)!.length
          );
        }
      }
    }
  }

  return null;
}

function buildTierLevels({
  difficulty,
  primary,
  fallback,
  usedHeads,
  random,
  levelIdStart,
  strictTrackFallback = false,
}: {
  difficulty: WordBuilderDifficulty;
  primary: CampaignCatalogWord[];
  fallback: CampaignCatalogWord[];
  usedHeads: Set<string>;
  random: () => number;
  levelIdStart: number;
  /** When true (Advanced), never mix primary + fallback in one stage. */
  strictTrackFallback?: boolean;
}): WordBuilderLevel[] {
  const levels: WordBuilderLevel[] = [];
  let prim = [...primary];
  let fall = [...fallback];

  for (let s = 0; s < STAGES_PER_TIER; s += 1) {
    let take = pickCampaignStageEntries(prim, difficulty, usedHeads, random);
    if (!take && fall.length > 0) {
      take = pickCampaignStageEntries(fall, difficulty, usedHeads, random);
    }
    if (!take && !strictTrackFallback) {
      take = pickCampaignStageEntries([...prim, ...fall], difficulty, usedHeads, random);
    }
    if (!take) {
      take = pickCampaignStageEntries(primary, difficulty, new Set(), random);
    }
    if (!take && fallback.length > 0) {
      take = pickCampaignStageEntries(fallback, difficulty, new Set(), random);
    }
    if (!take && !strictTrackFallback) {
      take = pickCampaignStageEntries([...primary, ...fallback], difficulty, new Set(), random);
    }

    if (!take || take.length < CAMPAIGN_WORDS_PER_STAGE) {
      levels.push({
        levelId: levelIdStart + s,
        difficulty,
        category: `campaign_${difficulty}`,
        letters: [],
        targetWords: [],
      });
      continue;
    }

    const heads = new Set(take.map((e) => gameLemma(e.word)!));
    for (const h of heads) usedHeads.add(h);
    prim = prim.filter((e) => !heads.has(gameLemma(e.word)!));
    fall = fall.filter((e) => !heads.has(gameLemma(e.word)!));

    const targets = take.map(toTarget);
    const letters = expandPoolLetters(
      poolMaxPerLetterAcrossWords(targets.map((t) => normalizeWord(t.word)))
    );
    levels.push({
      levelId: levelIdStart + s,
      difficulty,
      category: `campaign_${difficulty}`,
      letters,
      targetWords: targets,
    });
  }

  return levels;
}

/** Exact port of Flutter `WordBuilderCampaignPlan.stableRandomSeed`. */
export function stableCampaignSeed(words: CampaignCatalogWord[]): number {
  let h = 2166136261;
  for (let i = 0; i < words.length; i += 1) {
    const e = words[i]!;
    if (e.rowId != null) {
      h = 0x7fffffff & (h ^ Math.imul(e.rowId, 1000003));
      h = 0x7fffffff & (h ^ (e.bookId ?? 0));
    } else {
      const w = e.word;
      for (let j = 0; j < w.length; j += 1) {
        h = Math.imul(h ^ w.charCodeAt(j), 16777619) >>> 0;
      }
    }
  }
  return h === 0 ? 1 : h;
}

/**
 * Build the 3 × 50 = 150 Normal Campaign levels matching Flutter's
 * `WordBuilderCampaignPlan.build(catalog, books, random)`.
 *
 * When `bookTrackById` is provided (public books catalog), splits General vs
 * IELTS books identically to the app. When omitted (e.g. unit tests with a
 * flat word list), treats the full list as both pools cleanly.
 */
export function buildCampaignPlan(
  catalog: CampaignCatalogWord[],
  seedOverride?: number,
  bookTrackById?: BookTrackMap
): CampaignPlan {
  const baseSeed = stableCampaignSeed(catalog);
  const mixed =
    seedOverride && seedOverride > 0 ? (baseSeed ^ (seedOverride >>> 0)) >>> 0 : baseSeed >>> 0;
  const seed = mixed === 0 ? 1 : mixed;
  const random = mulberry32(seed);

  let general: CampaignCatalogWord[];
  let ielts: CampaignCatalogWord[];

  if (bookTrackById && Object.keys(bookTrackById).length > 0) {
    general = [];
    ielts = [];
    for (const e of catalog) {
      if (e.bookId != null && bookTrackById[e.bookId] === 'general') {
        general.push(e);
      } else {
        // Matches Flutter `_splitCatalog`: IELTS or unknown book defaults to IELTS.
        ielts.push(e);
      }
    }
    if (general.length === 0) general = ielts;
    if (ielts.length === 0) ielts = general;
  } else {
    general = catalog;
    ielts = catalog;
  }

  const usedHeads = new Set<string>();

  const beginnerPrimary = unusedLemmaPool(general, usedHeads, { maxLen: 3 });
  const beginnerFallback = unusedLemmaPool(general, usedHeads, { maxLen: 4 });
  const beginner = buildTierLevels({
    difficulty: 'beginner',
    primary: beginnerPrimary,
    fallback: beginnerFallback,
    usedHeads,
    random,
    levelIdStart: 900_000_001,
  });

  const interPrimary = unusedLemmaPool(general, usedHeads, { minLen: 3, maxLen: 4 });
  const interFallback = dedupePool([
    ...unusedLemmaPool(general, usedHeads),
    ...unusedLemmaPool(ielts, usedHeads),
  ]);
  const intermediate = buildTierLevels({
    difficulty: 'intermediate',
    primary: interPrimary,
    fallback: interFallback,
    usedHeads,
    random,
    levelIdStart: 900_000_051,
  });

  // Advanced: IELTS-tab books first; General-tab only when IELTS cannot fill a stage.
  const advPrimary = unusedLemmaPool(ielts, usedHeads, { minLen: 4 });
  const advFallback = unusedLemmaPool(general, usedHeads, { minLen: 4 });
  const advanced = buildTierLevels({
    difficulty: 'advanced',
    primary: advPrimary,
    fallback: advFallback,
    usedHeads,
    random,
    levelIdStart: 900_000_101,
    strictTrackFallback: true,
  });

  return { beginner, intermediate, advanced };
}

/**
 * Filters a large global catalog down to ONLY the words that can be spelled
 * from `level.letters` and match one of `level`'s target lengths.
 * Keeps browser payloads tiny (~2 KB) while remaining 100% equivalent to
 * scanning the full 13,000+ word catalog in Flutter `_catalogMatchForBuilt`.
 */
export function filterSpellableCatalogWords(
  catalog: WordBuilderSourceWord[],
  level: WordBuilderLevel
): WordBuilderSourceWord[] {
  const pool = letterCounts(level.letters);
  const lengths = new Set(level.targetWords.map((t) => normalizeWord(t.word).length));
  const seen = new Set<string>();
  const out: WordBuilderSourceWord[] = [];

  for (const item of catalog) {
    const lemma = gameLemma(item.word);
    if (!lemma || seen.has(lemma)) continue;
    if (!lengths.has(lemma.length)) continue;
    if (!canSpellFromPool(lemma, pool)) continue;
    seen.add(lemma);
    out.push({
      word: lemma,
      meaning: item.meaning,
      exampleEn: item.exampleEn,
      exampleGloss: item.exampleGloss,
    });
  }
  return out;
}

/**
 * Exact port of Flutter's `wordBuilderOverallStageFromProgress` (returns 1..150).
 */
export function overallStageFromProgress(progress: {
  beginner: number;
  intermediate: number;
  advanced: number;
}): number {
  const b = Math.max(0, Math.min(STAGES_PER_TIER, progress.beginner));
  const i = Math.max(0, Math.min(STAGES_PER_TIER, progress.intermediate));
  const a = Math.max(0, Math.min(STAGES_PER_TIER, progress.advanced));
  const total = b + i + a;
  return Math.max(1, Math.min(STAGES_PER_TIER * 3, total + 1));
}
