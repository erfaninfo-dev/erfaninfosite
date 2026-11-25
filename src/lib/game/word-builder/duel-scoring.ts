import { normalizeWord } from './logic';
import type {
  DuelGhostEvent,
  DuelPlayEvent,
  DuelRound,
  DuelScoreBreakdown,
  DuelSolvedWord,
  DuelSourceType,
  DuelWordSnapshot,
} from './duel-types';
import type { WordBuilderDifficulty } from './types';

export const DUEL_ROUNDS_COUNT = 3;
export const DUEL_TIME_LIMIT_STANDARD_SEC = 120;
export const DUEL_TIME_LIMIT_ADVANCED_SEC = 150;
export const DUEL_MAX_HINTS = 2;
export const DUEL_HINT_PENALTY = 15;
export const DUEL_ROUND_CLEAR_BONUS = 30;
export const DUEL_BONUS_WORD_POINTS = 10;
export const DUEL_MAX_BONUS_PER_ROUND = 5;
export const DUEL_STREAK_BONUS = 5;
export const DUEL_TIME_BONUS_PER_SEC = 1;

export function duelTimeLimitFor(
  sourceType: DuelSourceType,
  difficulty: WordBuilderDifficulty
): number {
  if (sourceType === 'normal' && difficulty === 'advanced') {
    return DUEL_TIME_LIMIT_ADVANCED_SEC;
  }
  return DUEL_TIME_LIMIT_STANDARD_SEC;
}

export type ComputedDuelScore = {
  score: number;
  targetSolvedCount: number;
  bonusSolvedCount: number;
  wrongCount: number;
  hintsUsed: number;
  bestStreak: number;
  allCleared: boolean;
  elapsedMs: number;
  solvedWords: DuelSolvedWord[];
  timeline: DuelGhostEvent[];
  breakdown: DuelScoreBreakdown;
};

/**
 * Pure, deterministic duel scoring engine — mirrors `wb_duel_compute_score`
 * in `server-upload/wordsapi/wb_duel_helpers.php` 1:1.
 */
export function computeDuelScore({
  rounds,
  bonusCatalog,
  events,
  hintsUsed,
  elapsedMs,
  timeLimitSec,
}: {
  rounds: readonly DuelRound[];
  bonusCatalog: readonly (readonly DuelWordSnapshot[])[];
  events: readonly DuelPlayEvent[];
  hintsUsed: number;
  elapsedMs: number;
  timeLimitSec: number;
}): ComputedDuelScore {
  const roundCount = rounds.length;
  const timeLimitMs = Math.max(30, Math.floor(timeLimitSec)) * 1000;
  const clampedElapsedMs = Math.max(0, Math.min(Math.floor(elapsedMs), timeLimitMs));
  const clampedHints = Math.max(0, Math.min(DUEL_MAX_HINTS, Math.floor(hintsUsed)));

  const targetSets: Set<string>[] = [];
  const bonusSets: Set<string>[] = [];
  const solvedTargetsByRound: Set<string>[] = [];
  const solvedBonusByRound: Set<string>[] = [];
  const roundCleared: boolean[] = [];

  for (let r = 0; r < roundCount; r += 1) {
    targetSets.push(new Set(rounds[r]!.targetWords.map((t) => normalizeWord(t.word))));
    bonusSets.push(new Set((bonusCatalog[r] ?? []).map((b) => normalizeWord(b.word))));
    solvedTargetsByRound.push(new Set());
    solvedBonusByRound.push(new Set());
    roundCleared.push(false);
  }

  const ordered = events
    .map((ev, index) => ({
      index,
      tMs: Math.max(0, Math.min(Math.floor(ev.tMs), timeLimitMs)),
      ev,
    }))
    .sort((a, b) => (a.tMs === b.tMs ? a.index - b.index : a.tMs - b.tMs));

  let targetPoints = 0;
  let bonusPoints = 0;
  let roundClearBonus = 0;
  let streakBonus = 0;
  let wrongCount = 0;
  let currentStreak = 0;
  let bestStreak = 0;

  const timeline: DuelGhostEvent[] = [];
  const solvedWords: DuelSolvedWord[] = [];

  for (const { ev, tMs } of ordered) {
    const roundIdx = ev.roundIndex;
    if (roundIdx < 0 || roundIdx >= roundCount) continue;

    if (ev.kind === 'wrong') {
      wrongCount += 1;
      currentStreak = 0;
      continue;
    }

    const word = normalizeWord(ev.word);
    if (!word) continue;

    if (
      ev.kind === 'target' &&
      targetSets[roundIdx]!.has(word) &&
      !solvedTargetsByRound[roundIdx]!.has(word)
    ) {
      solvedTargetsByRound[roundIdx]!.add(word);
      const wordPts = word.length * 10;
      targetPoints += wordPts;

      currentStreak += 1;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
      const sBonus = currentStreak >= 2 ? DUEL_STREAK_BONUS : 0;
      streakBonus += sBonus;

      const delta = wordPts + sBonus;
      const solvedCountInRound = solvedTargetsByRound[roundIdx]!.size;

      solvedWords.push({
        roundIndex: roundIdx,
        word,
        kind: 'target',
        tMs,
      });

      timeline.push({
        tMs,
        round: roundIdx,
        kind: 'target',
        deltaScore: delta,
        roundSolvedCount: solvedCountInRound,
      });

      if (!roundCleared[roundIdx] && solvedCountInRound >= targetSets[roundIdx]!.size) {
        roundCleared[roundIdx] = true;
        roundClearBonus += DUEL_ROUND_CLEAR_BONUS;
        timeline.push({
          tMs,
          round: roundIdx,
          kind: 'round_clear',
          deltaScore: DUEL_ROUND_CLEAR_BONUS,
          roundSolvedCount: solvedCountInRound,
        });
      }
      continue;
    }

    if (
      ev.kind === 'bonus' &&
      bonusSets[roundIdx]!.has(word) &&
      !solvedBonusByRound[roundIdx]!.has(word)
    ) {
      if (solvedBonusByRound[roundIdx]!.size >= DUEL_MAX_BONUS_PER_ROUND) continue;
      solvedBonusByRound[roundIdx]!.add(word);
      bonusPoints += DUEL_BONUS_WORD_POINTS;

      currentStreak += 1;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
      const sBonus = currentStreak >= 2 ? DUEL_STREAK_BONUS : 0;
      streakBonus += sBonus;

      const delta = DUEL_BONUS_WORD_POINTS + sBonus;
      solvedWords.push({
        roundIndex: roundIdx,
        word,
        kind: 'bonus',
        tMs,
      });

      timeline.push({
        tMs,
        round: roundIdx,
        kind: 'bonus',
        deltaScore: delta,
        roundSolvedCount: solvedTargetsByRound[roundIdx]!.size,
      });
    }
  }

  let allCleared = roundCount > 0;
  let totalTargetSolved = 0;
  let totalBonusSolved = 0;
  let roundsCleared = 0;

  for (let r = 0; r < roundCount; r += 1) {
    totalTargetSolved += solvedTargetsByRound[r]!.size;
    totalBonusSolved += solvedBonusByRound[r]!.size;
    if (roundCleared[r]) roundsCleared += 1;
    else allCleared = false;
  }

  const remainingSec =
    allCleared && clampedElapsedMs < timeLimitMs
      ? Math.floor((timeLimitMs - clampedElapsedMs) / 1000)
      : 0;
  const timeBonus = remainingSec * DUEL_TIME_BONUS_PER_SEC;
  const hintPenalty = clampedHints * DUEL_HINT_PENALTY;
  const totalScore = Math.max(
    0,
    targetPoints + bonusPoints + roundClearBonus + streakBonus + timeBonus - hintPenalty
  );

  return {
    score: totalScore,
    targetSolvedCount: totalTargetSolved,
    bonusSolvedCount: totalBonusSolved,
    wrongCount,
    hintsUsed: clampedHints,
    bestStreak,
    allCleared,
    elapsedMs: clampedElapsedMs,
    solvedWords,
    timeline,
    breakdown: {
      targetPoints,
      bonusPoints,
      roundClearBonus,
      streakBonus,
      timeBonus,
      hintPenalty,
      totalScore,
      bestStreak,
      roundsCleared,
    },
  };
}

export type DuelTieBreakerComparable = {
  userId: number;
  score: number;
  elapsedMs: number;
  targetSolvedCount: number;
  wrongCount: number;
};

/**
 * Winner & tie-breaker hierarchy:
 * 1. Higher total score
 * 2. Faster elapsedMs
 * 3. Higher targetSolvedCount
 * 4. Lower wrongCount
 * 5. Otherwise null (draw)
 */
export function resolveDuelWinner(
  a: DuelTieBreakerComparable,
  b: DuelTieBreakerComparable
): number | null {
  if (a.score !== b.score) return a.score > b.score ? a.userId : b.userId;
  if (a.elapsedMs !== b.elapsedMs) return a.elapsedMs < b.elapsedMs ? a.userId : b.userId;
  if (a.targetSolvedCount !== b.targetSolvedCount) {
    return a.targetSolvedCount > b.targetSolvedCount ? a.userId : b.userId;
  }
  if (a.wrongCount !== b.wrongCount) return a.wrongCount < b.wrongCount ? a.userId : b.userId;
  return null;
}

export type GhostPlaybackSnapshot = {
  /** Cumulative ghost points earned up to `elapsedMs` (excluding end-of-match time bonus). */
  score: number;
  /** Highest round index the ghost has reached so far (0..2). */
  currentRoundIndex: number;
  /** Solved target count per round at `elapsedMs`. */
  roundSolvedCounts: number[];
  /** Number of rounds cleared by the ghost at `elapsedMs`. */
  roundsCleared: number;
  /** Most recent event that fired on or before `elapsedMs`. */
  lastEvent: DuelGhostEvent | null;
  /** True when the ghost scored within the last `pulseWindowMs` (triggers subtle HUD pulse). */
  justScored: boolean;
  /** True when all ghost events in the timeline have elapsed. */
  allEventsPlayed: boolean;
};

/**
 * Evaluates a sanitized Ghost Replay timeline at `elapsedMs` for live-feeling
 * head-to-head progress in the VS HUD without any polling.
 */
export function getGhostStateAtTime(
  timeline: readonly DuelGhostEvent[],
  elapsedMs: number,
  roundCount = DUEL_ROUNDS_COUNT,
  pulseWindowMs = 1400
): GhostPlaybackSnapshot {
  const counts = Array.from({ length: roundCount }, () => 0);
  const clearedRounds = new Set<number>();
  let score = 0;
  let currentRoundIndex = 0;
  let lastEvent: DuelGhostEvent | null = null;
  let playedCount = 0;

  for (const ev of timeline) {
    if (ev.tMs > elapsedMs) continue;
    playedCount += 1;
    score += ev.deltaScore;
    lastEvent = ev;

    if (ev.round >= 0 && ev.round < roundCount) {
      if (ev.roundSolvedCount > counts[ev.round]!) {
        counts[ev.round] = ev.roundSolvedCount;
      }
      if (ev.kind === 'round_clear') {
        clearedRounds.add(ev.round);
        currentRoundIndex = Math.min(roundCount - 1, Math.max(currentRoundIndex, ev.round + 1));
      } else {
        currentRoundIndex = Math.max(currentRoundIndex, ev.round);
      }
    }
  }

  const justScored =
    lastEvent !== null && elapsedMs >= lastEvent.tMs && elapsedMs - lastEvent.tMs <= pulseWindowMs;

  return {
    score,
    currentRoundIndex,
    roundSolvedCounts: counts,
    roundsCleared: clearedRounds.size,
    lastEvent,
    justScored,
    allEventsPlayed: timeline.length > 0 && playedCount >= timeline.length,
  };
}

/**
 * Picks the best localized meaning from a multi-lingual duel word snapshot.
 */
export function localizedDuelMeaning(
  word: DuelWordSnapshot,
  glossLang: 'fa' | 'ckb',
  locale: 'en' | 'fa' | 'ckb'
): string {
  if (locale === 'en') {
    return word.meaningEn || word.meaning || word.meaningFa || word.meaningCkb || '';
  }
  if (glossLang === 'ckb') {
    return word.meaningCkb || word.meaning || word.meaningFa || word.meaningEn || '';
  }
  return word.meaningFa || word.meaning || word.meaningCkb || word.meaningEn || '';
}

export function localizedDuelExampleGloss(
  word: DuelWordSnapshot,
  glossLang: 'fa' | 'ckb'
): string {
  if (glossLang === 'ckb') {
    return word.exampleCkb || word.exampleGloss || word.exampleFa || '';
  }
  return word.exampleFa || word.exampleGloss || word.exampleCkb || '';
}
