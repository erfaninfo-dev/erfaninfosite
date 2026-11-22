import { LEVELS_PER_LENGTH_BAND } from './constants';
import {
  expandPoolLetters,
  gameLemma,
  normalizeWord,
  poolMaxPerLetterAcrossWords,
} from './logic';
import type {
  WordBuilderDifficulty,
  WordBuilderLevel,
  WordBuilderSourceWord,
  WordBuilderTargetWord,
} from './types';

function lengthsForDifficulty(d: WordBuilderDifficulty): [number, number, number] {
  switch (d) {
    case 'beginner':
      return [2, 3, 3];
    case 'intermediate':
      return [3, 4, 4];
    case 'advanced':
      return [4, 5, 5];
  }
}

function maxTileCap(d: WordBuilderDifficulty): number {
  switch (d) {
    case 'beginner':
      return 6;
    case 'intermediate':
      return 10;
    case 'advanced':
      return 12;
  }
}

function minTileCount(d: WordBuilderDifficulty): number {
  return d === 'beginner' ? 3 : 4;
}

function maxTileCapFor(
  d: WordBuilderDifficulty,
  lens: [number, number, number]
): number {
  if (d === 'beginner' && lens[0] === 3 && lens[1] === 3 && lens[2] === 3) {
    return 9;
  }
  return maxTileCap(d);
}

function beginnerLens(
  byLen: Map<number, WordBuilderSourceWord[]>
): [number, number, number] {
  if ((byLen.get(2) ?? []).length > 0) return [2, 3, 3];
  return [3, 3, 3];
}

function tryPickTriple({
  byLen,
  lens,
  difficulty,
  random,
  usedHeads,
  attempts = 600,
}: {
  byLen: Map<number, WordBuilderSourceWord[]>;
  lens: [number, number, number];
  difficulty: WordBuilderDifficulty;
  random: () => number;
  usedHeads: Set<string>;
  attempts?: number;
}): [WordBuilderSourceWord, WordBuilderSourceWord, WordBuilderSourceWord] | null {
  const [la, lb, lc] = lens;
  const laList = byLen.get(la);
  const lbList = byLen.get(lb);
  const lcList = byLen.get(lc);
  if (!laList?.length || !lbList?.length || !lcList?.length) return null;

  const cap = maxTileCapFor(difficulty, lens);
  const minTiles = minTileCount(difficulty);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const ea = laList[Math.floor(random() * laList.length)]!;
    const eb = lbList[Math.floor(random() * lbList.length)]!;
    const ec = lcList[Math.floor(random() * lcList.length)]!;
    const ha = gameLemma(ea.word);
    const hb = gameLemma(eb.word);
    const hc = gameLemma(ec.word);
    if (!ha || !hb || !hc) continue;
    if (ha === hb || ha === hc || hb === hc) continue;
    if (usedHeads.has(ha) || usedHeads.has(hb) || usedHeads.has(hc)) continue;
    const pool = poolMaxPerLetterAcrossWords([ha, hb, hc]);
    let n = 0;
    for (const v of pool.values()) n += v;
    if (n < minTiles) continue;
    if (n > cap) continue;
    return [ea, eb, ec];
  }
  return null;
}

function toTarget(e: WordBuilderSourceWord): WordBuilderTargetWord {
  return {
    word: normalizeWord(e.word.trim()),
    meaning: e.meaning,
    exampleEn: e.exampleEn,
    exampleGloss: e.exampleGloss,
  };
}

/**
 * Build Classic Word Builder levels from a theme's words.
 * Port of Flutter `buildWordBuilderLevelsFromEntries`, seeded for SSR safety.
 */
export function buildWordBuilderLevels(
  raw: WordBuilderSourceWord[],
  random: () => number,
  {
    categoryLabel,
    maxLevelsPerWordLength = LEVELS_PER_LENGTH_BAND,
  }: { categoryLabel: string; maxLevelsPerWordLength?: number }
): WordBuilderLevel[] {
  const byHead = new Map<string, WordBuilderSourceWord[]>();
  for (const e of raw) {
    const w = gameLemma(e.word);
    if (!w) continue;
    const list = byHead.get(w) ?? [];
    list.push(e);
    byHead.set(w, list);
  }

  const byKey = new Map<string, WordBuilderSourceWord>();
  for (const [k, list] of byHead) {
    const pick = list.find((x) => gameLemma(x.word) === k) ?? list[0]!;
    byKey.set(k, pick);
  }
  if (byKey.size === 0) return [];

  const byLen = new Map<number, WordBuilderSourceWord[]>();
  for (const e of byKey.values()) {
    const h = gameLemma(e.word);
    if (!h) continue;
    const list = byLen.get(h.length) ?? [];
    list.push(e);
    byLen.set(h.length, list);
  }
  for (const list of byLen.values()) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [list[i], list[j]] = [list[j]!, list[i]!];
    }
  }

  const levels: WordBuilderLevel[] = [];
  let levelId = 1;
  const usedHeads = new Set<string>();
  const tierOrder: WordBuilderDifficulty[] = [
    'beginner',
    'intermediate',
    'advanced',
  ];

  for (const difficulty of tierOrder) {
    const lens =
      difficulty === 'beginner'
        ? beginnerLens(byLen)
        : lengthsForDifficulty(difficulty);
    for (let round = 0; round < maxLevelsPerWordLength; round += 1) {
      const triple = tryPickTriple({
        byLen,
        lens,
        difficulty,
        random,
        usedHeads,
      });
      if (!triple) break;
      const ordered = [...triple].sort(
        (a, b) => gameLemma(a.word)!.length - gameLemma(b.word)!.length
      );
      const targets = ordered.map((e) => {
        const w = gameLemma(e.word)!;
        usedHeads.add(w);
        return toTarget(e);
      });
      const wordsLower = targets.map((t) => normalizeWord(t.word));
      const letters = expandPoolLetters(poolMaxPerLetterAcrossWords(wordsLower));
      levels.push({
        levelId: levelId++,
        difficulty,
        category: categoryLabel,
        letters,
        targetWords: targets,
      });
    }
  }

  return levels;
}

/**
 * Build Theme Category stage levels — exact port of Flutter's
 * `buildThemeCategoryStageLevels` (`word_builder_vocab.dart`):
 * 3 target words per stage (`ceil(usable.length / 3)` stages; last stage may
 * have 1–2 words) so every playable word in a topic appears in a stage.
 */
export function buildThemeStageLevels(
  raw: WordBuilderSourceWord[],
  { categoryLabel }: { categoryLabel: string }
): WordBuilderLevel[] {
  const usable: WordBuilderSourceWord[] = [];
  const seen = new Set<string>();
  for (const e of raw) {
    const lemma = gameLemma(e.word);
    if (!lemma || seen.has(lemma)) continue;
    seen.add(lemma);
    usable.push(e);
  }
  if (usable.length === 0) return [];

  const WORDS_PER_STAGE = 3;
  const stageCount = Math.ceil(usable.length / WORDS_PER_STAGE);
  const levels: WordBuilderLevel[] = [];

  for (let stage = 0; stage < stageCount; stage += 1) {
    const start = stage * WORDS_PER_STAGE;
    const chunk = usable
      .slice(start, start + WORDS_PER_STAGE)
      .sort((a, b) => gameLemma(a.word)!.length - gameLemma(b.word)!.length);
    const targets = chunk.map(toTarget);
    const letters = expandPoolLetters(
      poolMaxPerLetterAcrossWords(targets.map((t) => normalizeWord(t.word)))
    );
    levels.push({
      levelId: stage + 1,
      difficulty: 'beginner',
      category: categoryLabel,
      letters,
      targetWords: targets,
    });
  }

  return levels;
}

/** mulberry32 — same family as `seededShuffle` for deterministic level builds. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
