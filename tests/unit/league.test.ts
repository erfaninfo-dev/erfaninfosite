import { describe, expect, it } from 'vitest';

import { parseLeague, readLeagueQuery } from '@/lib/auth/league';

describe('readLeagueQuery', () => {
  it('defaults to All / Monthly / Points like the Flutter app', () => {
    expect(readLeagueQuery({})).toEqual({
      type: 'all',
      period: 'monthly',
      sort: 'points',
    });
  });

  it('accepts valid values and falls back cleanly on unknown values', () => {
    expect(
      readLeagueQuery({ type: 'grammar', period: 'lifetime', sort: 'accuracy' })
    ).toEqual({
      type: 'grammar',
      period: 'lifetime',
      sort: 'accuracy',
    });
    expect(readLeagueQuery({ type: 'bogus', period: 'daily', sort: 'speed' })).toEqual({
      type: 'all',
      period: 'monthly',
      sort: 'points',
    });
  });
});

describe('parseLeague', () => {
  it('parses full Flutter leaderboard fields including avatar, bio, season and stats', () => {
    const parsed = parseLeague({
      season: {
        id: 12,
        title: 'Monthly League',
        season_type: 'monthly',
        status: 'active',
      },
      summary: { participants: 42, total_points: 9100 },
      minimum_answered: 100,
      has_more: true,
      next_offset: 50,
      leaderboard: [
        {
          user_id: 7,
          display_name: 'Erfan',
          avatar: 'custom',
          bio: 'Efforts pay off',
          rank: 1,
          points: 820,
          accuracy: 94.5,
          correct_count: 189,
          wrong_count: 11,
          answered_count: 200,
          completed_count: 10,
          session_count: 15,
          active_days: 9,
          eligible: true,
          badge: 'Grammar Master',
          grammar_report_count: 3,
        },
      ],
      current_user_rank: {
        user_id: 7,
        display_name: 'Erfan',
        avatar: 'custom',
        rank: 1,
        points: 820,
        accuracy: 94.5,
        badge: 'Grammar Master',
      },
    });

    expect(parsed).not.toBeNull();
    expect(parsed!.season.title).toBe('Monthly League');
    expect(parsed!.participants).toBe(42);
    expect(parsed!.minimumAnswered).toBe(100);
    expect(parsed!.hasMore).toBe(true);
    expect(parsed!.rows[0]).toMatchObject({
      userId: 7,
      name: 'Erfan',
      avatar: 'custom',
      bio: 'Efforts pay off',
      rank: 1,
      points: 820,
      accuracy: 94.5,
      correctCount: 189,
      wrongCount: 11,
      answeredCount: 200,
      activeDays: 9,
      sessionCount: 15,
      grammarReportCount: 3,
      badge: 'Grammar Master',
    });
    expect(parsed!.you?.rank).toBe(1);
  });
});
