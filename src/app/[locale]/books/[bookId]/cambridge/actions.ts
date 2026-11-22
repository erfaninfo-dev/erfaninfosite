'use server';

import { authRequest } from '@/lib/auth/api';
import { getAuthToken } from '@/lib/auth/session';
import type {
  CambridgeKeyedAnswer,
  CambridgeSavedHighlight,
  CambridgeScore,
  CambridgeScoreItem,
} from '@/lib/cambridge/api';
import { isCambridgeSkill } from '@/lib/cambridge/labels';

function rec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/**
 * Scores (and saves when signed in) a Cambridge 15 Listening / Reading test
 * via the live `POST /cambridge_submit.php` endpoint.
 */
export async function submitCambridgeAnswersAction(input: {
  slug: string;
  bookId: number;
  test: number;
  skill: string;
  answers: Record<string, string>;
  mode?: 'practice' | 'exam';
  durationSec?: number;
  timePacing?: string;
}): Promise<CambridgeScore | null> {
  if (!isCambridgeSkill(input.skill)) return null;
  if (input.test < 1 || input.test > 10) return null;
  if (!/^[a-z0-9-]{2,40}$/.test(input.slug)) return null;

  const token = await getAuthToken();
  const res = await authRequest('cambridge_submit.php', {
    method: 'POST',
    token,
    body: {
      slug: input.slug,
      book_id: input.bookId,
      test: input.test,
      skill: input.skill,
      answers: input.answers,
      mode: input.mode ?? 'practice',
      duration_sec:
        typeof input.durationSec === 'number' && Number.isFinite(input.durationSec)
          ? Math.max(0, Math.floor(input.durationSec))
          : undefined,
      time_pacing: input.timePacing ?? 'standard',
    },
    timeoutMs: 15_000,
  });

  if (res.status !== 200) return null;
  const root = rec(res.json);
  if (!root) return null;

  const rawItems = Array.isArray(root.items) ? root.items : [];
  const items: CambridgeScoreItem[] = rawItems
    .map((entry) => {
      const m = rec(entry);
      if (!m || typeof m.number !== 'number') return null;
      return {
        number: Math.floor(m.number),
        correct: m.correct === true,
        yours: typeof m.yours === 'string' ? m.yours : '',
        expected: typeof m.expected === 'string' ? m.expected : '',
      };
    })
    .filter((x): x is CambridgeScoreItem => x !== null);

  return {
    score: typeof root.score === 'number' ? root.score : null,
    max: typeof root.max === 'number' ? root.max : null,
    bandScore: typeof root.band_score === 'number' ? root.band_score : null,
    saved: root.saved === true,
    items,
  };
}

/**
 * Saves a signed-in user's in-progress answers, highlights/notes, flagged questions,
 * and remaining countdown time via `POST /cambridge_state.php`.
 */
export async function saveCambridgeStateAction(input: {
  slug: string;
  test: number;
  skill: string;
  mode: 'practice' | 'exam';
  answers: Record<string, string>;
  highlights: CambridgeSavedHighlight[];
  flagged: number[];
  remainingSec?: number | null;
  status?: 'in_progress' | 'completed';
}): Promise<boolean> {
  if (!isCambridgeSkill(input.skill)) return false;
  if (input.test < 1 || input.test > 10) return false;
  if (!/^[a-z0-9-]{2,40}$/.test(input.slug)) return false;

  const token = await getAuthToken();
  if (!token) return false;

  const res = await authRequest('cambridge_state.php', {
    method: 'POST',
    token,
    body: {
      slug: input.slug,
      test: input.test,
      skill: input.skill,
      mode: input.mode,
      answers: input.answers,
      highlights: input.highlights.slice(0, 300),
      flagged: input.flagged,
      remaining_sec:
        typeof input.remainingSec === 'number' && Number.isFinite(input.remainingSec)
          ? Math.max(0, Math.floor(input.remainingSec))
          : null,
      status: input.status ?? 'in_progress',
    },
    timeoutMs: 8_000,
  });

  return res.status === 200;
}

/**
 * Clears saved answers and/or highlights for a signed-in user via `POST /cambridge_state.php`.
 */
export async function clearCambridgeStateAction(input: {
  slug: string;
  test: number;
  skill: string;
  mode: 'practice' | 'exam';
  clearAnswers?: boolean;
  clearHighlights?: boolean;
}): Promise<boolean> {
  if (!isCambridgeSkill(input.skill)) return false;
  if (input.test < 1 || input.test > 10) return false;
  if (!/^[a-z0-9-]{2,40}$/.test(input.slug)) return false;

  const token = await getAuthToken();
  if (!token) return false;

  const res = await authRequest('cambridge_state.php', {
    method: 'POST',
    token,
    body: {
      slug: input.slug,
      test: input.test,
      skill: input.skill,
      mode: input.mode,
      action: 'clear',
      clear_answers: input.clearAnswers ?? true,
      clear_highlights: input.clearHighlights ?? false,
    },
    timeoutMs: 8_000,
  });

  return res.status === 200;
}

/**
 * Loads the official answer key from live `GET /cambridge_answers.php`.
 */
export async function fetchCambridgeAnswersAction(input: {
  slug: string;
  test: number;
  skill: string;
}): Promise<Record<string, CambridgeKeyedAnswer> | null> {
  if (!isCambridgeSkill(input.skill)) return null;
  if (input.test < 1 || input.test > 10) return null;
  if (!/^[a-z0-9-]{2,40}$/.test(input.slug)) return null;

  const token = await getAuthToken();
  const res = await authRequest('cambridge_answers.php', {
    token,
    params: {
      slug: input.slug,
      test: input.test,
      skill: input.skill,
    },
    timeoutMs: 12_000,
  });

  if (res.status !== 200) return null;
  const root = rec(res.json);
  const rawAnswers = rec(root?.answers);
  if (!rawAnswers) return null;

  const out: Record<string, CambridgeKeyedAnswer> = {};
  for (const [key, val] of Object.entries(rawAnswers)) {
    const m = rec(val);
    if (m) {
      out[key] = {
        answer: typeof m.answer === 'string' ? m.answer : String(m.answer ?? ''),
        raw: typeof m.raw === 'string' ? m.raw : String(m.answer ?? ''),
      };
    } else if (typeof val === 'string') {
      out[key] = { answer: val, raw: val };
    }
  }
  return out;
}
