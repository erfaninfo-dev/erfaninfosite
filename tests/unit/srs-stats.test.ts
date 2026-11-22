import { describe, expect, it } from 'vitest';

import {
  computeWordMastery,
  isSrsCardDueToday,
  rateSrsCard,
  type SrsCard,
} from '@/lib/srs/srs-store';
import { computeStats, formatDateKey, type StatsData } from '@/lib/stats/stats-store';

describe('SM-2 spaced repetition (matching Flutter srs_model.dart)', () => {
  const base: SrsCard = {
    wordId: 'w1',
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    dueDate: '2026-11-19T12:00:00.000Z',
  };

  it('advances intervals on Good ratings (1d -> 6d -> round(6 * ef))', () => {
    const now = new Date('2026-11-19T10:00:00Z');
    const first = rateSrsCard(base, 'good', now);
    expect(first.repetitions).toBe(1);
    expect(first.interval).toBe(1);

    const second = rateSrsCard(first, 'good', now);
    expect(second.repetitions).toBe(2);
    expect(second.interval).toBe(6);

    const third = rateSrsCard(second, 'good', now);
    expect(third.repetitions).toBe(3);
    expect(third.interval).toBe(Math.round(6 * second.easeFactor));
  });

  it('resets repetitions and interval to 1 on Again or Hard', () => {
    const now = new Date('2026-11-19T10:00:00Z');
    const learned: SrsCard = { ...base, interval: 15, repetitions: 3 };

    const again = rateSrsCard(learned, 'again', now);
    expect(again.repetitions).toBe(0);
    expect(again.interval).toBe(1);

    const hard = rateSrsCard(learned, 'hard', now);
    expect(hard.repetitions).toBe(0);
    expect(hard.interval).toBe(1);
  });

  it('checks due-today accurately by calendar day', () => {
    const now = new Date(2026, 10, 19, 14, 0, 0);
    expect(isSrsCardDueToday({ ...base, dueDate: new Date(2026, 10, 18).toISOString() }, now)).toBe(
      true
    );
    expect(isSrsCardDueToday({ ...base, dueDate: new Date(2026, 10, 19).toISOString() }, now)).toBe(
      true
    );
    expect(isSrsCardDueToday({ ...base, dueDate: new Date(2026, 10, 20).toISOString() }, now)).toBe(
      false
    );
  });

  it('categorizes mastery buckets like Flutter wordMasteryProvider', () => {
    const cards: SrsCard[] = [
      { ...base, wordId: 'a', interval: 25 },
      { ...base, wordId: 'b', interval: 21 },
      { ...base, wordId: 'c', interval: 6 },
      { ...base, wordId: 'd', interval: 2 },
      { ...base, wordId: 'e', interval: 1 },
    ];
    expect(computeWordMastery(cards)).toEqual({
      mastered: 2,
      learning: 2,
      seen: 1,
      total: 5,
    });
  });
});

describe('Study stats (matching Flutter stats_service.dart)', () => {
  it('computes current streak, longest streak, 7-day chart, and quiz accuracy', () => {
    const now = new Date(2026, 10, 19, 12, 0, 0);
    const data: StatsData = {
      studyDays: [
        '2026-11-10',
        '2026-11-11',
        '2026-11-12',
        '2026-11-13',
        '2026-11-18',
        '2026-11-19',
      ],
      wordsReviewedPerDay: {
        '2026-11-18': 5,
        '2026-11-19': 8,
      },
      quizSessionsPerDay: {
        '2026-11-19': { correct: 7, total: 10 },
      },
    };

    const stats = computeStats(data, now);
    expect(stats.studiedToday).toBe(true);
    expect(stats.currentStreak).toBe(2);
    expect(stats.longestStreak).toBe(4);
    expect(stats.totalStudyDays).toBe(6);
    expect(stats.totalWordsReviewed).toBe(13);
    expect(stats.totalQuizAnswered).toBe(10);
    expect(stats.totalQuizCorrect).toBe(7);
    expect(stats.quizAccuracy).toBeCloseTo(0.7);
    expect(stats.last7Days).toHaveLength(7);
    expect(stats.last7Days[6]?.dateKey).toBe(formatDateKey(now));
    expect(stats.last7Days[6]?.wordsReviewed).toBe(8);
  });

  it('drops current streak to 0 if neither today nor yesterday was studied', () => {
    const now = new Date(2026, 10, 19, 12, 0, 0);
    const data: StatsData = {
      studyDays: ['2026-11-15', '2026-11-16'],
      wordsReviewedPerDay: {},
      quizSessionsPerDay: {},
    };
    const stats = computeStats(data, now);
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(2);
    expect(stats.studiedToday).toBe(false);
  });
});
