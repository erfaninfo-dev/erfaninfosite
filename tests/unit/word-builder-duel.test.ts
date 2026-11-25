import { describe, expect, it } from 'vitest';

import { buildDuelRounds } from '@/lib/game/word-builder/duel-rounds';
import {
  computeDuelScore,
  DUEL_BONUS_WORD_POINTS,
  DUEL_HINT_PENALTY,
  DUEL_MAX_BONUS_PER_ROUND,
  DUEL_MAX_HINTS,
  DUEL_ROUND_CLEAR_BONUS,
  DUEL_ROUNDS_COUNT,
  DUEL_STREAK_BONUS,
  getGhostStateAtTime,
  resolveDuelWinner,
} from '@/lib/game/word-builder/duel-scoring';
import {
  duelSingleResponseSchema,
  type DuelGhostEvent,
  type DuelMultilingualSourceWord,
  type DuelPlayEvent,
  type DuelRound,
  type DuelWordSnapshot,
} from '@/lib/game/word-builder/duel-types';

function makeWord(word: string): DuelWordSnapshot {
  return {
    word,
    meaning: `${word} fa`,
    meaningEn: `${word} en`,
    meaningFa: `${word} fa`,
    meaningCkb: `${word} ckb`,
    exampleEn: `Example with ${word}.`,
    exampleFa: '',
    exampleCkb: '',
    exampleGloss: '',
  };
}

const SAMPLE_ROUNDS: DuelRound[] = [
  {
    levelId: 1,
    difficulty: 'beginner',
    category: 'test',
    letters: ['c', 'a', 't', 's'],
    targetWords: [makeWord('cat'), makeWord('act'), makeWord('sat')],
  },
  {
    levelId: 2,
    difficulty: 'beginner',
    category: 'test',
    letters: ['d', 'o', 'g', 's'],
    targetWords: [makeWord('dog'), makeWord('god'), makeWord('dogs')],
  },
  {
    levelId: 3,
    difficulty: 'beginner',
    category: 'test',
    letters: ['t', 'e', 'a', 'r', 's'],
    targetWords: [makeWord('tea'), makeWord('eat'), makeWord('star')],
  },
];

const SAMPLE_BONUS: DuelWordSnapshot[][] = [
  [makeWord('at'), makeWord('as'), makeWord('cats'), makeWord('cast'), makeWord('sac'), makeWord('ta')],
  [makeWord('do'), makeWord('go')],
  [makeWord('art'), makeWord('rat'), makeWord('set')],
];

describe('computeDuelScore', () => {
  it('computes target points, round clear bonuses, streak bonuses, and time bonus accurately', () => {
    const events: DuelPlayEvent[] = [
      // Round 0: cat (30), act (30 + 5 streak), sat (30 + 5 streak) + 30 clear
      { kind: 'target', roundIndex: 0, word: 'cat', tMs: 2_000 },
      { kind: 'target', roundIndex: 0, word: 'act', tMs: 4_000 },
      { kind: 'target', roundIndex: 0, word: 'sat', tMs: 6_000 },
      // Round 1: dog (30 + 5), god (30 + 5), dogs (40 + 5) + 30 clear
      { kind: 'target', roundIndex: 1, word: 'dog', tMs: 12_000 },
      { kind: 'target', roundIndex: 1, word: 'god', tMs: 15_000 },
      { kind: 'target', roundIndex: 1, word: 'dogs', tMs: 20_000 },
      // Round 2: tea (30 + 5), eat (30 + 5), star (40 + 5) + 30 clear
      { kind: 'target', roundIndex: 2, word: 'tea', tMs: 28_000 },
      { kind: 'target', roundIndex: 2, word: 'eat', tMs: 32_000 },
      { kind: 'target', roundIndex: 2, word: 'star', tMs: 40_000 },
    ];

    const res = computeDuelScore({
      rounds: SAMPLE_ROUNDS,
      bonusCatalog: SAMPLE_BONUS,
      events,
      hintsUsed: 0,
      elapsedMs: 40_000,
      timeLimitSec: 120,
    });

    // Target letters: (3+3+3) + (3+3+4) + (3+3+4) = 29 letters => 290 pts
    expect(res.breakdown.targetPoints).toBe(290);
    expect(res.breakdown.roundClearBonus).toBe(3 * DUEL_ROUND_CLEAR_BONUS);
    // 9 consecutive words => 8 streak bonuses
    expect(res.breakdown.streakBonus).toBe(8 * DUEL_STREAK_BONUS);
    // 80 remaining seconds => +80 time bonus
    expect(res.breakdown.timeBonus).toBe(80);
    expect(res.breakdown.hintPenalty).toBe(0);
    expect(res.allCleared).toBe(true);
    expect(res.score).toBe(290 + 90 + 40 + 80);
  });

  it('resets streak on wrong attempt, caps bonus words per round, and ignores duplicates/invalid words', () => {
    const events: DuelPlayEvent[] = [
      { kind: 'target', roundIndex: 0, word: 'cat', tMs: 1_000 },
      { kind: 'target', roundIndex: 0, word: 'cat', tMs: 1_500 }, // duplicate ignored
      { kind: 'target', roundIndex: 0, word: 'fake', tMs: 2_000 }, // invalid ignored
      { kind: 'wrong', roundIndex: 0, tMs: 3_000 }, // resets streak
      { kind: 'target', roundIndex: 0, word: 'act', tMs: 4_000 }, // streak back to 1 (no streak bonus)
      // 6 bonus words in round 0 => capped at 5
      { kind: 'bonus', roundIndex: 0, word: 'at', tMs: 5_000 },
      { kind: 'bonus', roundIndex: 0, word: 'as', tMs: 6_000 },
      { kind: 'bonus', roundIndex: 0, word: 'cats', tMs: 7_000 },
      { kind: 'bonus', roundIndex: 0, word: 'cast', tMs: 8_000 },
      { kind: 'bonus', roundIndex: 0, word: 'sac', tMs: 9_000 },
      { kind: 'bonus', roundIndex: 0, word: 'ta', tMs: 10_000 }, // 6th ignored
    ];

    const res = computeDuelScore({
      rounds: SAMPLE_ROUNDS,
      bonusCatalog: SAMPLE_BONUS,
      events,
      hintsUsed: 0,
      elapsedMs: 10_000,
      timeLimitSec: 120,
    });

    expect(res.targetSolvedCount).toBe(2);
    expect(res.bonusSolvedCount).toBe(DUEL_MAX_BONUS_PER_ROUND);
    expect(res.wrongCount).toBe(1);
    expect(res.breakdown.bonusPoints).toBe(DUEL_MAX_BONUS_PER_ROUND * DUEL_BONUS_WORD_POINTS);
    // act starts streak 1, then 5 bonus words give streaks 2..6 => 5 streak bonuses
    expect(res.breakdown.streakBonus).toBe(5 * DUEL_STREAK_BONUS);
    // Not all rounds cleared => no time bonus
    expect(res.breakdown.timeBonus).toBe(0);
    expect(res.allCleared).toBe(false);
  });

  it('applies hint penalties capped at DUEL_MAX_HINTS and floors total score at 0', () => {
    const res = computeDuelScore({
      rounds: SAMPLE_ROUNDS,
      bonusCatalog: SAMPLE_BONUS,
      events: [{ kind: 'target', roundIndex: 0, word: 'at', tMs: 1_000 }], // not a target => 0 pts
      hintsUsed: 5, // capped to 2
      elapsedMs: 5_000,
      timeLimitSec: 120,
    });

    expect(res.hintsUsed).toBe(DUEL_MAX_HINTS);
    expect(res.breakdown.hintPenalty).toBe(DUEL_MAX_HINTS * DUEL_HINT_PENALTY);
    expect(res.score).toBe(0);
  });
});

describe('resolveDuelWinner', () => {
  it('follows the exact 5-step tie-breaker hierarchy', () => {
    // 1. Higher score wins
    expect(
      resolveDuelWinner(
        { userId: 1, score: 200, elapsedMs: 90_000, targetSolvedCount: 5, wrongCount: 4 },
        { userId: 2, score: 180, elapsedMs: 40_000, targetSolvedCount: 9, wrongCount: 0 }
      )
    ).toBe(1);

    // 2. Faster elapsedMs wins on tied score
    expect(
      resolveDuelWinner(
        { userId: 1, score: 200, elapsedMs: 55_000, targetSolvedCount: 7, wrongCount: 2 },
        { userId: 2, score: 200, elapsedMs: 48_000, targetSolvedCount: 7, wrongCount: 2 }
      )
    ).toBe(2);

    // 3. Higher targetSolvedCount wins on tied score & time
    expect(
      resolveDuelWinner(
        { userId: 1, score: 200, elapsedMs: 50_000, targetSolvedCount: 8, wrongCount: 3 },
        { userId: 2, score: 200, elapsedMs: 50_000, targetSolvedCount: 7, wrongCount: 0 }
      )
    ).toBe(1);

    // 4. Lower wrongCount wins on tied score, time, & targets
    expect(
      resolveDuelWinner(
        { userId: 1, score: 200, elapsedMs: 50_000, targetSolvedCount: 8, wrongCount: 2 },
        { userId: 2, score: 200, elapsedMs: 50_000, targetSolvedCount: 8, wrongCount: 1 }
      )
    ).toBe(2);

    // 5. Exact tie => draw (null)
    expect(
      resolveDuelWinner(
        { userId: 1, score: 200, elapsedMs: 50_000, targetSolvedCount: 8, wrongCount: 1 },
        { userId: 2, score: 200, elapsedMs: 50_000, targetSolvedCount: 8, wrongCount: 1 }
      )
    ).toBeNull();
  });
});

describe('getGhostStateAtTime', () => {
  const timeline: DuelGhostEvent[] = [
    { tMs: 3_000, round: 0, kind: 'target', deltaScore: 30, roundSolvedCount: 1 },
    { tMs: 7_000, round: 0, kind: 'target', deltaScore: 35, roundSolvedCount: 2 },
    { tMs: 10_000, round: 0, kind: 'target', deltaScore: 35, roundSolvedCount: 3 },
    { tMs: 10_000, round: 0, kind: 'round_clear', deltaScore: 30, roundSolvedCount: 3 },
    { tMs: 18_000, round: 1, kind: 'target', deltaScore: 45, roundSolvedCount: 1 },
  ];

  it('replays cumulative score, round progress, and pulse window smoothly over time', () => {
    const before = getGhostStateAtTime(timeline, 1_500);
    expect(before.score).toBe(0);
    expect(before.roundSolvedCounts).toEqual([0, 0, 0]);
    expect(before.justScored).toBe(false);

    const mid = getGhostStateAtTime(timeline, 7_500);
    expect(mid.score).toBe(65);
    expect(mid.roundSolvedCounts).toEqual([2, 0, 0]);
    expect(mid.currentRoundIndex).toBe(0);
    expect(mid.justScored).toBe(true);

    const afterClear = getGhostStateAtTime(timeline, 13_000);
    expect(afterClear.score).toBe(130);
    expect(afterClear.roundsCleared).toBe(1);
    expect(afterClear.currentRoundIndex).toBe(1);
    expect(afterClear.justScored).toBe(false);

    const end = getGhostStateAtTime(timeline, 25_000);
    expect(end.score).toBe(175);
    expect(end.roundSolvedCounts).toEqual([3, 1, 0]);
    expect(end.allEventsPlayed).toBe(true);
  });
});

describe('buildDuelRounds', () => {
  const syntheticWords: DuelMultilingualSourceWord[] = [
    'cat', 'act', 'sat', 'bat', 'rat', 'mat', 'hat', 'pat', 'tap', 'cap',
    'dog', 'god', 'log', 'fog', 'bog', 'hog', 'jog', 'cog', 'nod', 'rod',
    'tea', 'eat', 'sea', 'pea', 'tar', 'car', 'bar', 'far', 'jar', 'war',
    'sun', 'run', 'fun', 'bun', 'gun', 'nun', 'cut', 'hut', 'nut', 'rut',
    'at', 'as', 'do', 'go', 'to', 'in', 'on', 'an', 'it', 'is',
    'cats', 'dogs', 'star', 'rate', 'tear', 'seat', 'east', 'fast', 'last', 'past',
  ].map((w, idx) => ({
    rowId: idx + 1,
    bookId: 1,
    word: w,
    meaningEn: `meaning ${w}`,
    meaningFa: `معنی ${w}`,
    meaningCkb: `مانا ${w}`,
    exampleEn: `Use ${w} in a sentence.`,
    exampleFa: '',
    exampleCkb: '',
  }));

  it('generates identical 3-round snapshots for the same seed and compact valid bonus catalogs', () => {
    const runA = buildDuelRounds({
      sourceType: 'category',
      difficulty: 'beginner',
      categoryTitle: 'Animals',
      seed: 424242,
      words: syntheticWords,
    });
    const runB = buildDuelRounds({
      sourceType: 'category',
      difficulty: 'beginner',
      categoryTitle: 'Animals',
      seed: 424242,
      words: syntheticWords,
    });

    expect(runA.rounds).toHaveLength(DUEL_ROUNDS_COUNT);
    expect(runA.rounds).toEqual(runB.rounds);
    expect(runA.bonusCatalog).toHaveLength(DUEL_ROUNDS_COUNT);

    // Ensure bonus catalog contains no target word duplicates for its round
    for (let r = 0; r < DUEL_ROUNDS_COUNT; r += 1) {
      const targetSet = new Set(runA.rounds[r]!.targetWords.map((t) => t.word));
      for (const b of runA.bonusCatalog[r]!) {
        expect(targetSet.has(b.word)).toBe(false);
      }
    }
  });
});

describe('duelSingleResponseSchema compatibility', () => {
  it('accepts PHP empty-array breakdown ([]) on an active playing attempt', () => {
    const phpJoinPayload = {
      ok: true,
      remainingMs: 120000,
      duel: {
        id: 1,
        code: '276MW4',
        sourceType: 'category',
        difficulty: 'intermediate',
        categorySlug: 'animals',
        categoryTitle: 'Animals',
        seed: 12345,
        timeLimitSec: 120,
        status: 'waiting_creator',
        winnerUserId: null,
        rematchOfId: null,
        expiresAt: '2026-11-26 00:00:00',
        createdAt: '2026-11-25 00:00:00',
        completedAt: null,
        creator: { userId: 7, displayName: 'Erfan Academy', avatar: 'm1' },
        opponent: null,
        creatorAttempt: {
          userId: 7,
          status: 'playing',
          startedAt: '2026-11-25 00:01:00',
          submittedAt: null,
          elapsedMs: 0,
          score: 0,
          targetSolvedCount: 0,
          bonusSolvedCount: 0,
          wrongCount: 0,
          hintsUsed: 0,
          solvedWords: [],
          breakdown: [], // PHP json_decode('{}', true) encodes empty array
          redacted: false,
        },
        opponentAttempt: null,
        viewerRole: 'creator',
        canPlay: true,
        canCancel: true,
        canDecline: false,
        mySubmitted: false,
        opponentSubmitted: false,
        hasGhost: false,
        rounds: SAMPLE_ROUNDS,
        bonusCatalog: SAMPLE_BONUS,
        remainingMs: 120000,
      },
    };

    const parsed = duelSingleResponseSchema.safeParse(phpJoinPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.duel.creatorAttempt?.breakdown).toBeNull();
    }
  });
});
