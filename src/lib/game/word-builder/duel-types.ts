import { z } from 'zod';

import type { WordBuilderDifficulty } from './types';

export const duelSourceTypeSchema = z.enum(['normal', 'category']);
export type DuelSourceType = z.infer<typeof duelSourceTypeSchema>;

export const duelDifficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);

export const duelStatusSchema = z.enum([
  'waiting_creator',
  'open',
  'in_progress',
  'completed',
  'expired',
  'declined',
]);
export type DuelStatus = z.infer<typeof duelStatusSchema>;

export const duelPlayerSchema = z.object({
  actorKey: z.string().optional().default(''),
  userId: z.number().int(),
  isGuest: z.boolean().optional().default(false),
  displayName: z.string(),
  avatar: z.string(),
});
export type DuelPlayer = z.infer<typeof duelPlayerSchema>;

const optStr = z.string().nullish().transform((v) => v ?? '');

export const duelWordSnapshotSchema = z.object({
  word: z.string(),
  meaning: optStr,
  meaningEn: optStr,
  meaningFa: optStr,
  meaningCkb: optStr,
  exampleEn: optStr,
  exampleFa: optStr,
  exampleCkb: optStr,
  exampleGloss: optStr,
});
export type DuelWordSnapshot = z.infer<typeof duelWordSnapshotSchema>;

export const duelRoundSchema = z.object({
  levelId: z.number().int(),
  difficulty: duelDifficultySchema,
  category: z.string(),
  letters: z.array(z.string()),
  targetWords: z.array(duelWordSnapshotSchema),
});
export type DuelRound = z.infer<typeof duelRoundSchema>;

export const duelSolvedWordSchema = z.object({
  roundIndex: z.number().int(),
  word: z.string(),
  kind: z.enum(['target', 'bonus']),
  tMs: z.number().int(),
});
export type DuelSolvedWord = z.infer<typeof duelSolvedWordSchema>;

export const duelScoreBreakdownSchema = z.object({
  targetPoints: z.number().int(),
  bonusPoints: z.number().int(),
  roundClearBonus: z.number().int(),
  streakBonus: z.number().int(),
  timeBonus: z.number().int(),
  hintPenalty: z.number().int(),
  totalScore: z.number().int(),
  bestStreak: z.number().int().optional().default(0),
  roundsCleared: z.number().int().optional().default(0),
});
export type DuelScoreBreakdown = z.infer<typeof duelScoreBreakdownSchema>;

export const duelAttemptSchema = z.object({
  actorKey: z.string().optional().default(''),
  userId: z.number().int(),
  status: z.enum(['playing', 'submitted', 'timed_out']),
  startedAt: z.string().nullable().optional(),
  submittedAt: z.string().nullable().optional(),
  elapsedMs: z.number().int().optional(),
  score: z.number().int().optional(),
  targetSolvedCount: z.number().int().optional(),
  bonusSolvedCount: z.number().int().optional(),
  wrongCount: z.number().int().optional(),
  hintsUsed: z.number().int().optional(),
  solvedWords: z.array(duelSolvedWordSchema).optional(),
  breakdown: z
    .preprocess(
      (val) =>
        val && typeof val === 'object' && !Array.isArray(val) && 'totalScore' in val ? val : null,
      duelScoreBreakdownSchema.nullable()
    )
    .optional(),
  redacted: z.boolean().optional().default(false),
});
export type DuelAttempt = z.infer<typeof duelAttemptSchema>;

export const duelGhostEventSchema = z.object({
  tMs: z.number().int().nonnegative(),
  round: z.number().int().nonnegative(),
  kind: z.enum(['target', 'bonus', 'round_clear']),
  deltaScore: z.number().int().nonnegative(),
  roundSolvedCount: z.number().int().nonnegative(),
});
export type DuelGhostEvent = z.infer<typeof duelGhostEventSchema>;

export const duelSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  sourceType: duelSourceTypeSchema,
  difficulty: duelDifficultySchema,
  categorySlug: z.string(),
  categoryTitle: z.string(),
  seed: z.number().int(),
  timeLimitSec: z.number().int(),
  status: duelStatusSchema,
  winnerKey: z.string().nullable().optional().default(null),
  winnerUserId: z.number().int().nullable(),
  rematchOfId: z.number().int().nullable(),
  expiresAt: z.string(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  creator: duelPlayerSchema,
  opponent: duelPlayerSchema.nullable(),
  creatorAttempt: duelAttemptSchema.nullable(),
  opponentAttempt: duelAttemptSchema.nullable(),
  viewerRole: z.enum(['creator', 'opponent', 'guest']),
  canPlay: z.boolean(),
  canCancel: z.boolean(),
  canDecline: z.boolean(),
  mySubmitted: z.boolean(),
  opponentSubmitted: z.boolean(),
  hasGhost: z.boolean(),
  rounds: z.array(duelRoundSchema).optional(),
  bonusCatalog: z.array(z.array(duelWordSnapshotSchema)).optional(),
  ghostTimeline: z.array(duelGhostEventSchema).optional(),
  remainingMs: z.number().int().optional(),
});
export type DuelRecord = z.infer<typeof duelSchema>;

export const duelStatsSchema = z.object({
  wins: z.number().int(),
  losses: z.number().int(),
  draws: z.number().int(),
  total: z.number().int(),
  winStreak: z.number().int(),
});
export type DuelStats = z.infer<typeof duelStatsSchema>;

export const duelListResponseSchema = z.object({
  ok: z.literal(true),
  your_turn: z.array(duelSchema),
  waiting: z.array(duelSchema),
  completed: z.array(duelSchema),
  stats: duelStatsSchema,
});
export type DuelListResponse = z.infer<typeof duelListResponseSchema>;

export const duelSingleResponseSchema = z.object({
  ok: z.literal(true),
  duel: duelSchema,
  remainingMs: z.number().int().optional(),
  duplicate: z.boolean().optional(),
});

export type DuelPlayEvent =
  | {
      kind: 'target' | 'bonus';
      roundIndex: number;
      word: string;
      tMs: number;
    }
  | {
      kind: 'wrong';
      roundIndex: number;
      tMs: number;
    };

export type DuelMultilingualSourceWord = {
  rowId?: number;
  bookId?: number;
  word: string;
  meaningEn: string;
  meaningFa: string;
  meaningCkb: string;
  exampleEn: string;
  exampleFa: string;
  exampleCkb: string;
};

export type DuelBuildOptions = {
  sourceType: DuelSourceType;
  difficulty: WordBuilderDifficulty;
  categorySlug: string;
  categoryTitle: string;
  seed: number;
};
