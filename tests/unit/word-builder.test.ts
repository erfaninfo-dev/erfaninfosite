import { describe, expect, it } from 'vitest';

import {
  coinsCostHintLetter,
  coinsCostHintMeaning,
  coinsLevelCompleteBonus,
  coinsPerCorrectWord,
  COINS_INITIAL_BALANCE,
  WORDS_PER_LEVEL,
} from '@/lib/game/word-builder/constants';
import { buildWordBuilderLevels, mulberry32 } from '@/lib/game/word-builder/levels';
import {
  buildLetterInstances,
  canSpellFromPool,
  expandPoolLetters,
  findUnsolvedTargetMatchingBuilt,
  gameLemma,
  isLevelComplete,
  letterCounts,
  normalizeWord,
  pathCanExtendToLongerUnsolvedTarget,
  poolMaxPerLetterAcrossWords,
  shuffleInstances,
} from '@/lib/game/word-builder/logic';
import type { WordBuilderSourceWord } from '@/lib/game/word-builder/types';

describe('gameLemma — a–z length 2…7 only', () => {
  it('accepts plain English lemmas', () => {
    expect(gameLemma('cat')).toBe('cat');
    expect(gameLemma(' Rabbit ')).toBe('rabbit');
  });

  it('rejects digits, hyphens, spaces, and out-of-range lengths', () => {
    expect(gameLemma('21st')).toBeNull();
    expect(gameLemma('pre-order')).toBeNull();
    expect(gameLemma('a')).toBeNull();
    expect(gameLemma('elephant')).toBeNull(); // 8 letters
    expect(gameLemma('ice cream')).toBeNull();
  });
});

describe('letter pool helpers', () => {
  it('takes the max count per letter across words, not the sum', () => {
    const pool = poolMaxPerLetterAcrossWords(['cat', 'bat', 'cab']);
    expect(pool.get('a')).toBe(1);
    expect(pool.get('c')).toBe(1);
    expect(pool.get('t')).toBe(1);
    expect(pool.get('b')).toBe(1);
    expect(expandPoolLetters(pool).sort().join('')).toBe('abct');
  });

  it('canSpellFromPool checks multiset membership', () => {
    const pool = letterCounts(['c', 'a', 't', 'b']);
    expect(canSpellFromPool('cat', pool)).toBe(true);
    expect(canSpellFromPool('cab', pool)).toBe(true);
    expect(canSpellFromPool('catch', pool)).toBe(false);
  });
});

describe('path matching', () => {
  const level = {
    levelId: 1,
    difficulty: 'beginner' as const,
    category: 'test',
    letters: ['c', 'a', 't', 'd', 'o', 'g'],
    targetWords: [
      { word: 'cat', meaning: 'گربه', exampleEn: '', exampleGloss: '' },
      { word: 'dog', meaning: 'سگ', exampleEn: '', exampleGloss: '' },
      { word: 'god', meaning: 'خدا', exampleEn: '', exampleGloss: '' },
    ],
  };

  it('finds an unsolved exact match and ignores solved ones', () => {
    expect(
      findUnsolvedTargetMatchingBuilt(level, new Set(), 'cat')?.word
    ).toBe('cat');
    expect(
      findUnsolvedTargetMatchingBuilt(level, new Set(['cat']), 'cat')
    ).toBeNull();
  });

  it('detects a prefix of a longer unsolved target', () => {
    const longLevel = {
      ...level,
      targetWords: [
        { word: 'cat', meaning: '', exampleEn: '', exampleGloss: '' },
        { word: 'cattle', meaning: '', exampleEn: '', exampleGloss: '' },
        { word: 'dog', meaning: '', exampleEn: '', exampleGloss: '' },
      ],
    };
    expect(
      pathCanExtendToLongerUnsolvedTarget(longLevel, new Set(), 'cat')
    ).toBe(true);
    expect(
      pathCanExtendToLongerUnsolvedTarget(longLevel, new Set(['cattle']), 'cat')
    ).toBe(false);
  });

  it('reports level complete only when every target is solved', () => {
    expect(isLevelComplete(level, new Set(['cat', 'dog']))).toBe(false);
    expect(isLevelComplete(level, new Set(['cat', 'dog', 'god']))).toBe(true);
  });
});

describe('letter instances', () => {
  it('assigns stable ids and shuffles without losing letters', () => {
    const built = buildLetterInstances(['a', 'b', 'c']);
    expect(built.map((l) => l.char).join('')).toBe('abc');
    expect(new Set(built.map((l) => l.id)).size).toBe(3);
    const shuffled = shuffleInstances(built, () => 0.5);
    expect(shuffled.map((l) => l.char).sort().join('')).toBe('abc');
  });
});

describe('buildWordBuilderLevels', () => {
  const words: WordBuilderSourceWord[] = [
    'cat',
    'dog',
    'bat',
    'rat',
    'fox',
    'cow',
    'pig',
    'hen',
    'ant',
    'bee',
    'owl',
    'elk',
    'bird',
    'wolf',
    'deer',
    'goat',
    'lion',
    'bear',
    'duck',
    'frog',
    'horse',
    'sheep',
    'mouse',
    'tiger',
    'zebra',
    'whale',
    'eagle',
    'camel',
    'snake',
    'shark',
    'rabbit',
    'monkey',
    'turtle',
    'donkey',
    'parrot',
    'falcon',
  ].map((word) => ({
    word,
    meaning: word,
    exampleEn: '',
    exampleGloss: '',
  }));

  it('builds deterministic levels from a seed', () => {
    const a = buildWordBuilderLevels(words, mulberry32(42), {
      categoryLabel: 'Animals',
    });
    const b = buildWordBuilderLevels(words, mulberry32(42), {
      categoryLabel: 'Animals',
    });
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b);
    expect(a[0]!.targetWords).toHaveLength(WORDS_PER_LEVEL);
    for (const level of a) {
      for (const t of level.targetWords) {
        expect(normalizeWord(t.word)).toBe(t.word);
        expect(gameLemma(t.word)).toBe(t.word);
      }
      const pool = letterCounts(level.letters);
      for (const t of level.targetWords) {
        expect(canSpellFromPool(t.word, pool)).toBe(true);
      }
    }
  });

  it('returns empty when nothing is playable', () => {
    expect(
      buildWordBuilderLevels(
        [{ word: 'a', meaning: 'x', exampleEn: '', exampleGloss: '' }],
        mulberry32(1),
        { categoryLabel: 'x' }
      )
    ).toEqual([]);
  });
});

describe('coin economy — matches Flutter constants', () => {
  it('uses the app ratios from words-per-level', () => {
    expect(COINS_INITIAL_BALANCE).toBe(36);
    expect(coinsPerCorrectWord()).toBe(12);
    expect(coinsLevelCompleteBonus()).toBe(9);
    expect(coinsCostHintLetter()).toBe(6);
    expect(coinsCostHintMeaning()).toBe(12);
  });
});

describe('release clears selection (Flutter parity)', () => {
  /**
   * On pointer-up the tray always calls evaluate/clear. Prefixes of longer
   * unsolved words are discarded without marking wrong — same as the app's
   * clearPathOnly path — so a held selection never survives a release.
   */
  it('treats a short prefix as extendable (release should discard, not sticky-select)', () => {
    const longLevel = {
      levelId: 1,
      difficulty: 'beginner' as const,
      category: 'test',
      letters: ['c', 'a', 't', 't', 'l', 'e'],
      targetWords: [
        { word: 'cat', meaning: '', exampleEn: '', exampleGloss: '' },
        { word: 'cattle', meaning: '', exampleEn: '', exampleGloss: '' },
        { word: 'late', meaning: '', exampleEn: '', exampleGloss: '' },
      ],
    };
    // "ca" is a prefix of "cat" / "cattle" — release clears without wrong flash.
    expect(pathCanExtendToLongerUnsolvedTarget(longLevel, new Set(), 'ca')).toBe(
      true
    );
    // Exact match is not "extendable" — release validates as correct and clears.
    expect(
      findUnsolvedTargetMatchingBuilt(longLevel, new Set(), 'cat')?.word
    ).toBe('cat');
  });
});
