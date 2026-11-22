/**
 * `league.php` leaderboard. Rows come from the response only.
 */

export type LeagueSeason = {
  id: number | null;
  title: string;
  seasonType: string;
  status: string;
};

export type LeagueStanding = {
  userId: number;
  rank: number | null;
  name: string;
  avatar: string;
  bio: string;
  points: number;
  accuracy: number;
  correctCount: number;
  wrongCount: number;
  answeredCount: number;
  completedCount: number;
  sessionCount: number;
  activeDays: number;
  eligible: boolean;
  grammarReportCount: number;
  badge: string;
};

export type LeagueBoard = {
  season: LeagueSeason;
  rows: LeagueStanding[];
  you: LeagueStanding | null;
  participants: number;
  totalPoints: number;
  minimumAnswered: number;
  hasMore: boolean;
  nextOffset: number;
};

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function standing(value: unknown): LeagueStanding | null {
  const row = record(value);
  if (!row) return null;
  const name = typeof row.display_name === 'string' ? row.display_name.trim() : '';
  const avatar = typeof row.avatar === 'string' ? row.avatar.trim() : '';
  const bio = typeof row.bio === 'string' ? row.bio.trim() : '';
  const badge = typeof row.badge === 'string' ? row.badge.trim() : '';
  return {
    userId: num(row.user_id),
    rank: typeof row.rank === 'number' ? row.rank : null,
    name: (name || 'Learner').slice(0, 80),
    avatar: avatar || 'm1',
    bio: bio.slice(0, 200),
    points: num(row.points),
    accuracy: typeof row.accuracy === 'number' && Number.isFinite(row.accuracy) ? row.accuracy : 0,
    correctCount: num(row.correct_count),
    wrongCount: num(row.wrong_count),
    answeredCount: num(row.answered_count),
    completedCount: num(row.completed_count),
    sessionCount: num(row.session_count),
    activeDays: num(row.active_days),
    eligible: row.eligible !== false,
    grammarReportCount: num(row.grammar_report_count),
    badge: badge.slice(0, 40),
  };
}

export function parseLeague(json: unknown): LeagueBoard | null {
  const root = record(json);
  if (!root || !Array.isArray(root.leaderboard)) return null;
  const rows = root.leaderboard.map(standing).filter((row): row is LeagueStanding => row != null);
  const summary = record(root.summary);
  const seasonRaw = record(root.season);
  const season: LeagueSeason = {
    id: typeof seasonRaw?.id === 'number' ? seasonRaw.id : null,
    title: typeof seasonRaw?.title === 'string' ? seasonRaw.title.trim() : '',
    seasonType: typeof seasonRaw?.season_type === 'string' ? seasonRaw.season_type.trim() : '',
    status: typeof seasonRaw?.status === 'string' ? seasonRaw.status.trim() : '',
  };
  return {
    season,
    rows,
    you: standing(root.current_user_rank),
    participants: num(summary?.participants),
    totalPoints: num(summary?.total_points),
    minimumAnswered: num(root.minimum_answered),
    hasMore: root.has_more === true,
    nextOffset: num(root.next_offset),
  };
}

const TYPES = ['all', 'grammar', 'vocab'] as const;
const PERIODS = ['weekly', 'monthly', 'lifetime'] as const;
const SORTS = ['points', 'accuracy'] as const;

export type LeagueType = (typeof TYPES)[number];
export type LeaguePeriod = (typeof PERIODS)[number];
export type LeagueSort = (typeof SORTS)[number];

export const LEAGUE_TYPES: readonly { id: LeagueType; label: string; title: string }[] = [
  { id: 'all', label: 'All', title: 'All League' },
  { id: 'grammar', label: 'Grammar', title: 'Grammar Practice' },
  { id: 'vocab', label: 'Vocab', title: 'Vocabulary League' },
];

export const LEAGUE_PERIODS: readonly { id: LeaguePeriod; label: string }[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'lifetime', label: 'Lifetime' },
];

export const LEAGUE_SORTS: readonly { id: LeagueSort; label: string }[] = [
  { id: 'points', label: 'Points' },
  { id: 'accuracy', label: 'Accuracy' },
];

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.find((item) => item === value) ?? fallback;
}

export function readLeagueQuery(query: {
  type?: string | string[];
  period?: string | string[];
  sort?: string | string[];
}): { type: LeagueType; period: LeaguePeriod; sort: LeagueSort } {
  const pick = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return {
    type: oneOf(pick(query.type), TYPES, 'all'),
    period: oneOf(pick(query.period), PERIODS, 'monthly'),
    sort: oneOf(pick(query.sort), SORTS, 'points'),
  };
}
