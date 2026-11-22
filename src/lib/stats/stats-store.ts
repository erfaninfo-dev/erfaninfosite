/**
 * Study streak & daily activity store matching Flutter's `lib/core/stats/stats_service.dart`.
 */

export type DayActivity = {
  date: Date;
  dateKey: string;
  wordsReviewed: number;
  quizCorrect: number;
  quizTotal: number;
};

export type StatsData = {
  studyDays: string[]; // 'YYYY-MM-DD'
  wordsReviewedPerDay: Record<string, number>;
  quizSessionsPerDay: Record<string, { correct: number; total: number }>;
};

export type ComputedStats = {
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
  studiedToday: boolean;
  last7Days: DayActivity[];
  totalWordsReviewed: number;
  totalQuizAnswered: number;
  totalQuizCorrect: number;
  quizAccuracy: number;
};

export const STATS_STORAGE_KEY = 'erfan_study_stats_v1';

export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeStats(data: StatsData, now = new Date()): ComputedStats {
  const daySet = new Set(data.studyDays);
  const todayKey = formatDateKey(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  // Current streak (counts only if studied today or yesterday)
  let currentStreak = 0;
  if (daySet.has(todayKey) || daySet.has(yesterdayKey)) {
    const cursor = daySet.has(todayKey)
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    while (daySet.has(formatDateKey(cursor))) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // Longest streak
  let longestStreak = 0;
  if (daySet.size > 0) {
    const sorted = [...daySet].sort();
    longestStreak = 1;
    let streak = 1;
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = new Date(`${sorted[i - 1]}T00:00:00`);
      const curr = new Date(`${sorted[i]}T00:00:00`);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
      if (diffDays === 1) {
        streak += 1;
        if (streak > longestStreak) longestStreak = streak;
      } else if (diffDays > 1) {
        streak = 1;
      }
    }
  }

  // Last 7 days
  const last7Days: DayActivity[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    const dateKey = formatDateKey(date);
    const quiz = data.quizSessionsPerDay[dateKey];
    return {
      date,
      dateKey,
      wordsReviewed: data.wordsReviewedPerDay[dateKey] ?? 0,
      quizCorrect: quiz?.correct ?? 0,
      quizTotal: quiz?.total ?? 0,
    };
  });

  const totalWordsReviewed = Object.values(data.wordsReviewedPerDay).reduce((a, b) => a + b, 0);
  let totalQuizAnswered = 0;
  let totalQuizCorrect = 0;
  for (const q of Object.values(data.quizSessionsPerDay)) {
    totalQuizAnswered += q.total ?? 0;
    totalQuizCorrect += q.correct ?? 0;
  }

  return {
    currentStreak,
    longestStreak,
    totalStudyDays: daySet.size,
    studiedToday: daySet.has(todayKey),
    last7Days,
    totalWordsReviewed,
    totalQuizAnswered,
    totalQuizCorrect,
    quizAccuracy: totalQuizAnswered > 0 ? totalQuizCorrect / totalQuizAnswered : 0,
  };
}

/* ── browser storage ─────────────────────────────────────────────────────── */

const EMPTY_STATS: StatsData = {
  studyDays: [],
  wordsReviewedPerDay: {},
  quizSessionsPerDay: {},
};

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined = undefined;
let cachedStats: StatsData = EMPTY_STATS;

function emit() {
  for (const fn of listeners) fn();
}

export function readStatsData(): StatsData {
  if (typeof window === 'undefined') return EMPTY_STATS;
  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
    if (raw === cachedRaw) return cachedStats;
    cachedRaw = raw;
    if (!raw) {
      cachedStats = EMPTY_STATS;
      return cachedStats;
    }
    const parsed = JSON.parse(raw) as Partial<StatsData> | null;
    cachedStats = {
      studyDays: Array.isArray(parsed?.studyDays)
        ? parsed.studyDays.filter((s): s is string => typeof s === 'string')
        : [],
      wordsReviewedPerDay:
        parsed?.wordsReviewedPerDay && typeof parsed.wordsReviewedPerDay === 'object'
          ? parsed.wordsReviewedPerDay
          : {},
      quizSessionsPerDay:
        parsed?.quizSessionsPerDay && typeof parsed.quizSessionsPerDay === 'object'
          ? parsed.quizSessionsPerDay
          : {},
    };
    return cachedStats;
  } catch {
    return EMPTY_STATS;
  }
}

function writeStatsData(next: StatsData) {
  if (typeof window === 'undefined') return;
  try {
    const raw = JSON.stringify(next);
    cachedRaw = raw;
    cachedStats = next;
    window.localStorage.setItem(STATS_STORAGE_KEY, raw);
    emit();
  } catch {
    /* ignore */
  }
}

export function subscribeStats(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== 'undefined') {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STATS_STORAGE_KEY) {
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

export function logWordReviewActivity(now = new Date()): void {
  const current = readStatsData();
  const key = formatDateKey(now);
  const days = current.studyDays.includes(key)
    ? current.studyDays
    : [...current.studyDays, key];
  writeStatsData({
    ...current,
    studyDays: days,
    wordsReviewedPerDay: {
      ...current.wordsReviewedPerDay,
      [key]: (current.wordsReviewedPerDay[key] ?? 0) + 1,
    },
  });
}

export function logQuizActivity(correct: boolean, now = new Date()): void {
  const current = readStatsData();
  const key = formatDateKey(now);
  const days = current.studyDays.includes(key)
    ? current.studyDays
    : [...current.studyDays, key];
  const prev = current.quizSessionsPerDay[key] ?? { correct: 0, total: 0 };
  writeStatsData({
    ...current,
    studyDays: days,
    quizSessionsPerDay: {
      ...current.quizSessionsPerDay,
      [key]: {
        correct: prev.correct + (correct ? 1 : 0),
        total: prev.total + 1,
      },
    },
  });
}
