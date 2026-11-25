import { buildCampaignPlan, type BookTrackMap, type CampaignCatalogWord } from './campaign';
import { DUEL_ROUNDS_COUNT } from './duel-scoring';
import type {
  DuelMultilingualSourceWord,
  DuelRound,
  DuelSourceType,
  DuelWordSnapshot,
} from './duel-types';
import { buildWordBuilderLevels, mulberry32 } from './levels';
import { canSpellFromPool, gameLemma, letterCounts, normalizeWord } from './logic';
import type { WordBuilderDifficulty, WordBuilderLevel } from './types';

function toWordSnapshot(src: DuelMultilingualSourceWord): DuelWordSnapshot {
  return {
    word: normalizeWord(src.word),
    meaning: src.meaningFa || src.meaningCkb || src.meaningEn,
    meaningEn: src.meaningEn,
    meaningFa: src.meaningFa,
    meaningCkb: src.meaningCkb,
    exampleEn: src.exampleEn,
    exampleFa: src.exampleFa,
    exampleCkb: src.exampleCkb,
    exampleGloss: src.exampleFa || src.exampleCkb,
  };
}

function buildLookupByLemma(
  words: readonly DuelMultilingualSourceWord[]
): Map<string, DuelMultilingualSourceWord> {
  const map = new Map<string, DuelMultilingualSourceWord>();
  for (const w of words) {
    const lemma = gameLemma(w.word);
    if (!lemma || map.has(lemma)) continue;
    map.set(lemma, w);
  }
  return map;
}

/**
 * Deterministically generates 3 Word Builder duel rounds + a compact per-round
 * bonus catalog (only words spellable from that round's letter pool).
 *
 * Pure function — runs identically on server and in unit tests.
 */
export function buildDuelRounds({
  sourceType,
  difficulty,
  categoryTitle,
  seed,
  words,
  bonusPoolWords,
  bookTrackById,
}: {
  sourceType: DuelSourceType;
  difficulty: WordBuilderDifficulty;
  categoryTitle: string;
  seed: number;
  words: readonly DuelMultilingualSourceWord[];
  /** Optional broader vocabulary pool for valid bonus catalog words. */
  bonusPoolWords?: readonly DuelMultilingualSourceWord[];
  bookTrackById?: BookTrackMap;
}): {
  rounds: DuelRound[];
  bonusCatalog: DuelWordSnapshot[][];
} {
  const safeSeed = Math.max(1, Math.floor(Math.abs(seed)) || 1);
  const byLemma = buildLookupByLemma(words);
  const bonusLookup = buildLookupByLemma(bonusPoolWords ?? words);

  let pickedLevels: WordBuilderLevel[] = [];

  if (sourceType === 'normal') {
    const campaignWords: CampaignCatalogWord[] = words.map((w) => ({
      rowId: w.rowId,
      bookId: w.bookId,
      word: w.word,
      meaning: w.meaningFa || w.meaningCkb || w.meaningEn || w.word,
      exampleEn: w.exampleEn,
      exampleGloss: w.exampleFa || w.exampleCkb,
    }));
    const plan = buildCampaignPlan(campaignWords, safeSeed, bookTrackById);
    const tierLevels = plan[difficulty] ?? [];
    if (tierLevels.length >= DUEL_ROUNDS_COUNT) {
      // Pick 3 well-spaced distinct stages using seeded rng so every duel feels fresh.
      const rng = mulberry32(safeSeed ^ 0x51f23a91);
      const indices = Array.from({ length: tierLevels.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [indices[i], indices[j]] = [indices[j]!, indices[i]!];
      }
      const usedWords = new Set<string>();
      for (const idx of indices) {
        if (pickedLevels.length >= DUEL_ROUNDS_COUNT) break;
        const lvl = tierLevels[idx]!;
        const overlaps = lvl.targetWords.some((t) => usedWords.has(normalizeWord(t.word)));
        if (overlaps) continue;
        for (const t of lvl.targetWords) usedWords.add(normalizeWord(t.word));
        pickedLevels.push(lvl);
      }
      if (pickedLevels.length < DUEL_ROUNDS_COUNT) {
        for (const idx of indices) {
          if (pickedLevels.length >= DUEL_ROUNDS_COUNT) break;
          const lvl = tierLevels[idx]!;
          if (!pickedLevels.includes(lvl)) pickedLevels.push(lvl);
        }
      }
    }
  } else {
    const rng = mulberry32(safeSeed);
    const themeWords = words.map((w) => ({
      word: w.word,
      meaning: w.meaningFa || w.meaningCkb || w.meaningEn || w.word,
      exampleEn: w.exampleEn,
      exampleGloss: w.exampleFa || w.exampleCkb,
    }));
    const built = buildWordBuilderLevels(themeWords, rng, {
      categoryLabel: categoryTitle,
      maxLevelsPerWordLength: 20,
    });
    if (built.length >= DUEL_ROUNDS_COUNT) {
      const pickRng = mulberry32(safeSeed ^ 0x2c1b3c6d);
      const indices = Array.from({ length: built.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i -= 1) {
        const j = Math.floor(pickRng() * (i + 1));
        [indices[i], indices[j]] = [indices[j]!, indices[i]!];
      }
      pickedLevels = indices.slice(0, DUEL_ROUNDS_COUNT).map((i) => built[i]!);
    } else {
      pickedLevels = built.slice(0, DUEL_ROUNDS_COUNT);
    }
  }

  const rounds: DuelRound[] = pickedLevels.map((lvl, idx) => ({
    levelId: idx + 1,
    difficulty: sourceType === 'normal' ? difficulty : lvl.difficulty,
    category: categoryTitle || lvl.category,
    letters: [...lvl.letters],
    targetWords: lvl.targetWords.map((t) => {
      const norm = normalizeWord(t.word);
      const full = byLemma.get(norm) ?? bonusLookup.get(norm);
      if (full) return toWordSnapshot(full);
      return {
        word: norm,
        meaning: t.meaning,
        meaningEn: '',
        meaningFa: t.meaning,
        meaningCkb: '',
        exampleEn: t.exampleEn,
        exampleFa: t.exampleGloss,
        exampleCkb: '',
        exampleGloss: t.exampleGloss,
      };
    }),
  }));

  // Build compact per-round bonus catalog (words spellable from that round's pool,
  // excluding target words of that round, capped at 60 per round to keep payloads small).
  const bonusCatalog: DuelWordSnapshot[][] = rounds.map((round) => {
    const pool = letterCounts(round.letters);
    const targetSet = new Set(round.targetWords.map((t) => normalizeWord(t.word)));
    const out: DuelWordSnapshot[] = [];

    for (const [lemma, src] of bonusLookup) {
      if (out.length >= 60) break;
      if (targetSet.has(lemma)) continue;
      if (lemma.length < 2 || lemma.length > round.letters.length) continue;
      if (!canSpellFromPool(lemma, pool)) continue;
      out.push(toWordSnapshot(src));
    }
    return out;
  });

  return { rounds, bonusCatalog };
}
