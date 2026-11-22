import { describe, expect, it } from 'vitest';

import {
  STAGES_PER_TIER,
  buildCampaignPlan,
  filterSpellableCatalogWords,
  isCampaignDifficulty,
  overallStageFromProgress,
  type BookTrackMap,
  type CampaignCatalogWord,
} from '@/lib/game/word-builder/campaign';
import { buildThemeStageLevels } from '@/lib/game/word-builder/levels';
import { canSpellFromPool, letterCounts } from '@/lib/game/word-builder/logic';

let rowSeq = 1;
function makeWord(word: string, bookId = 1): CampaignCatalogWord {
  return {
    rowId: rowSeq++,
    bookId,
    word,
    meaning: `معنی ${word}`,
    exampleEn: `Example with ${word}.`,
    exampleGloss: `مثال برای ${word}.`,
  };
}

describe('Normal Campaign planner & theme stages', () => {
  it('validates difficulty slugs strictly', () => {
    expect(isCampaignDifficulty('beginner')).toBe(true);
    expect(isCampaignDifficulty('intermediate')).toBe(true);
    expect(isCampaignDifficulty('advanced')).toBe(true);
    expect(isCampaignDifficulty('expert')).toBe(false);
    expect(isCampaignDifficulty('')).toBe(false);
  });

  it('computes overall stage 1..150 from tier progress', () => {
    expect(overallStageFromProgress({ beginner: 0, intermediate: 0, advanced: 0 })).toBe(1);
    expect(overallStageFromProgress({ beginner: 12, intermediate: 0, advanced: 0 })).toBe(13);
    expect(overallStageFromProgress({ beginner: 50, intermediate: 0, advanced: 0 })).toBe(51);
    expect(overallStageFromProgress({ beginner: 50, intermediate: 50, advanced: 50 })).toBe(150);
  });

  it('splits General vs IELTS books, avoids duplicates when pool suffices, and reshuffles on seed change', () => {
    // Generate 240 unique General 2-4 letter words (book 1) and 220 unique IELTS 4-6 letter words (book 2).
    const generalWords: CampaignCatalogWord[] = [];
    const ieltsWords: CampaignCatalogWord[] = [];
    const alpha = 'abcdefghijklmnopqrstuvwxyz';

    // 2-letter general
    for (let i = 0; i < 15; i += 1) {
      generalWords.push(makeWord(`${alpha[i]}${alpha[(i + 1) % 26]}`, 1));
    }
    // 3-letter general
    for (let i = 0; i < 140; i += 1) {
      const a = alpha[i % 26]!;
      const b = alpha[Math.floor(i / 26) % 26]!;
      const c = alpha[(i + 7) % 26]!;
      generalWords.push(makeWord(`${a}${b}${c}`, 1));
    }
    // 4-letter general
    for (let i = 0; i < 120; i += 1) {
      const a = alpha[i % 26]!;
      const b = alpha[(i + 3) % 26]!;
      const c = alpha[Math.floor(i / 26) % 26]!;
      const d = alpha[(i + 11) % 26]!;
      generalWords.push(makeWord(`${a}${b}${c}${d}`, 1));
    }
    // 5-letter IELTS
    for (let i = 0; i < 200; i += 1) {
      const a = alpha[i % 26]!;
      const b = alpha[(i + 5) % 26]!;
      const c = alpha[Math.floor(i / 26) % 26]!;
      const d = alpha[(i + 9) % 26]!;
      const e = alpha[(i + 13) % 26]!;
      ieltsWords.push(makeWord(`${a}${b}${c}${d}${e}`, 2));
    }

    const catalog = [...generalWords, ...ieltsWords];
    const tracks: BookTrackMap = { 1: 'general', 2: 'ielts' };
    const ieltsSet = new Set(ieltsWords.map((w) => w.word));

    const planA = buildCampaignPlan(catalog, 0, tracks);
    const allSeen = new Set<string>();

    for (const tier of ['beginner', 'intermediate', 'advanced'] as const) {
      expect(planA[tier]).toHaveLength(STAGES_PER_TIER);
      for (const level of planA[tier]) {
        expect(level.targetWords).toHaveLength(3);
        const pool = letterCounts(level.letters);
        for (const t of level.targetWords) {
          expect(canSpellFromPool(t.word, pool)).toBe(true);
          expect(allSeen.has(t.word)).toBe(false);
          allSeen.add(t.word);
        }
        // Advanced stages must come strictly from IELTS books when IELTS pool suffices.
        if (tier === 'advanced') {
          for (const t of level.targetWords) {
            expect(ieltsSet.has(t.word)).toBe(true);
          }
        }
      }
    }
    expect(allSeen.size).toBe(STAGES_PER_TIER * 3 * 3);

    // Reshuffle seed produces a fresh stage ordering.
    const planB = buildCampaignPlan(catalog, 987654, tracks);
    const sigA = planA.beginner.slice(0, 5).map((l) => l.targetWords.map((t) => t.word).join(',')).join('|');
    const sigB = planB.beginner.slice(0, 5).map((l) => l.targetWords.map((t) => t.word).join(',')).join('|');
    expect(sigA).not.toBe(sigB);
  });

  it('filters global catalog down to only spellable matching-length bonus words', () => {
    const level = {
      levelId: 1,
      difficulty: 'beginner' as const,
      category: 'campaign_beginner',
      letters: ['c', 'a', 't', 'b'],
      targetWords: [
        { word: 'cat', meaning: 'گربه', exampleEn: '', exampleGloss: '' },
        { word: 'bat', meaning: 'خفاش', exampleEn: '', exampleGloss: '' },
        { word: 'at', meaning: 'در', exampleEn: '', exampleGloss: '' },
      ],
    };
    const bigCatalog = [
      makeWord('cab'), // 3-letter & spellable -> INCLUDED
      makeWord('tab'), // 3-letter & spellable -> INCLUDED
      makeWord('act'), // 3-letter & spellable -> INCLUDED
      makeWord('ba'), // 2-letter & spellable -> INCLUDED
      makeWord('caba'), // 4-letter (not in target lengths 2,3) -> EXCLUDED
      makeWord('dog'), // not spellable from c,a,t,b -> EXCLUDED
    ];
    const filtered = filterSpellableCatalogWords(bigCatalog, level);
    expect(filtered.map((w) => w.word).sort()).toEqual(['act', 'ba', 'cab', 'tab']);
  });

  it('builds ceil(N/3) stages per theme topic including 1–2 word final stage', () => {
    const words = ['cat', 'dog', 'sun', 'tree', 'book', 'apple', 'river'].map((w) => makeWord(w));
    const stages = buildThemeStageLevels(words, { categoryLabel: 'nature' });
    expect(stages).toHaveLength(3);
    expect(stages[0]!.targetWords).toHaveLength(3);
    expect(stages[1]!.targetWords).toHaveLength(3);
    expect(stages[2]!.targetWords).toHaveLength(1);
    for (const stage of stages) {
      const pool = letterCounts(stage.letters);
      for (const t of stage.targetWords) {
        expect(canSpellFromPool(t.word, pool)).toBe(true);
      }
    }
  });
});
