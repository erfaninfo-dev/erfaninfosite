import 'server-only';

import { randomInt } from 'node:crypto';

import { buildUrl, type QueryParams } from '@/lib/api/client';
import { getGameCategories } from '@/lib/api/queries';

import { getMultilingualCampaignCatalog } from './campaign-server';
import type { DuelActor } from './duel-guest';
import { buildDuelRounds } from './duel-rounds';
import { DUEL_ROUNDS_COUNT, duelTimeLimitFor } from './duel-scoring';
import {
  duelListResponseSchema,
  duelSingleResponseSchema,
  type DuelListResponse,
  type DuelMultilingualSourceWord,
  type DuelRecord,
  type DuelRound,
  type DuelSourceType,
  type DuelWordSnapshot,
} from './duel-types';
import { gameLemma } from './logic';
import type { WordBuilderDifficulty } from './types';

const USER_AGENT =
  'ErfanAcademyWeb/1.0 (+https://erfaninfo.com; Next.js server; contact: erfaninfo.com)';

function extractErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === 'object' && 'error' in json) {
    const err = (json as { error?: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err.trim();
  }
  return fallback;
}

/**
 * Sends a `no-store` request to `wb_duel.php` authenticated either with a
 * signed-in Bearer token or a browser Guest Token (with UTF-8 Base64 display name).
 */
export async function duelApiRequest(
  actor: DuelActor,
  options: {
    method?: 'GET' | 'POST';
    params?: QueryParams;
    body?: unknown;
    timeoutMs?: number;
  } = {}
): Promise<{ status: number; json: unknown }> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    };

    const queryParams: QueryParams = { ...(options.params ?? {}) };

    if (actor.kind === 'user') {
      headers.Authorization = `Bearer ${actor.token}`;
    } else {
      const nameB64 = Buffer.from(actor.displayName, 'utf8').toString('base64');
      headers['X-Guest-Token'] = actor.guestToken;
      headers['X-Guest-Name-B64'] = nameB64;
      headers['X-Guest-Avatar'] = actor.avatar;
      // Fallback query params in case cPanel/Apache strips custom X-Guest-* headers.
      queryParams.guest_token = actor.guestToken;
      queryParams.guest_name_b64 = nameB64;
      queryParams.guest_avatar = actor.avatar;
    }

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
    }

    const response = await fetch(buildUrl('wb_duel.php', queryParams), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(options.timeoutMs ?? 12_000),
    });

    const text = await response.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    return { status: response.status, json };
  } catch {
    return { status: 0, json: null };
  }
}

export async function fetchDuelList(actor: DuelActor): Promise<
  | { ok: true; data: DuelListResponse }
  | { ok: false; status: number; error: string }
> {
  const res = await duelApiRequest(actor, {
    method: 'GET',
    params: { action: 'list' },
    timeoutMs: 10_000,
  });

  if (res.status !== 200) {
    return {
      ok: false,
      status: res.status,
      error: extractErrorMessage(res.json, 'Could not load duels'),
    };
  }

  const parsed = duelListResponseSchema.safeParse(res.json);
  if (!parsed.success) {
    return { ok: false, status: 502, error: 'Unexpected duel list format' };
  }

  return { ok: true, data: parsed.data };
}

/**
 * Best-effort count of actionable "Your Turn" duels for the Play hub badge
 * (works for both signed-in accounts and active guest sessions).
 */
export async function fetchPendingDuelCount(actor: DuelActor | null): Promise<number> {
  if (!actor) return 0;
  try {
    const res = await fetchDuelList(actor);
    if (!res.ok) return 0;
    return res.data.your_turn.length;
  } catch {
    return 0;
  }
}

export async function fetchDuelByCode(
  actor: DuelActor,
  code: string
): Promise<
  | { ok: true; duel: DuelRecord; remainingMs?: number }
  | { ok: false; status: number; error: string }
> {
  const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length < 4 || cleaned.length > 12) {
    return { ok: false, status: 400, error: 'Invalid duel code' };
  }

  const res = await duelApiRequest(actor, {
    method: 'GET',
    params: { code: cleaned },
    timeoutMs: 10_000,
  });

  if (res.status !== 200) {
    return {
      ok: false,
      status: res.status,
      error: extractErrorMessage(res.json, 'Duel not found'),
    };
  }

  const parsed = duelSingleResponseSchema.safeParse(res.json);
  if (!parsed.success) {
    return { ok: false, status: 502, error: 'Unexpected duel format' };
  }

  return {
    ok: true,
    duel: parsed.data.duel,
    remainingMs: parsed.data.remainingMs ?? parsed.data.duel.remainingMs,
  };
}

/**
 * Generates a fresh 3-round deterministic snapshot + compact per-round bonus
 * catalog on the server for either a Normal difficulty or a Theme Category.
 */
export async function generateDuelSnapshotServer({
  sourceType,
  difficulty,
  categorySlug,
}: {
  sourceType: DuelSourceType;
  difficulty: WordBuilderDifficulty;
  categorySlug: string;
}): Promise<
  | {
      ok: true;
      seed: number;
      categorySlug: string;
      categoryTitle: string;
      timeLimitSec: number;
      rounds: DuelRound[];
      bonusCatalog: DuelWordSnapshot[][];
    }
  | {
      ok: false;
      error: string;
    }
> {
  const seed = randomInt(1000, 9_999_999);
  const { words: globalWords, bookTrackById } = await getMultilingualCampaignCatalog();

  if (sourceType === 'normal') {
    const built = buildDuelRounds({
      sourceType: 'normal',
      difficulty,
      categoryTitle: '',
      seed,
      words: globalWords,
      bonusPoolWords: globalWords,
      bookTrackById,
    });
    if (built.rounds.length < DUEL_ROUNDS_COUNT) {
      return { ok: false, error: 'Not enough words available to build a duel' };
    }
    return {
      ok: true,
      seed,
      categorySlug: '',
      categoryTitle: '',
      timeLimitSec: duelTimeLimitFor('normal', difficulty),
      rounds: built.rounds,
      bonusCatalog: built.bonusCatalog,
    };
  }

  const categories = await getGameCategories();
  const cat = categories.find((c) => c.slug === categorySlug);
  if (!cat) {
    return { ok: false, error: 'Selected category was not found' };
  }

  const themeWords: DuelMultilingualSourceWord[] = [];
  for (const w of cat.words) {
    if (!w.word || !gameLemma(w.word)) continue;
    themeWords.push({
      word: w.word,
      meaningEn: w.meaning.en,
      meaningFa: w.meaning.fa,
      meaningCkb: w.meaning.ckb,
      exampleEn: w.example.en,
      exampleFa: w.example.fa,
      exampleCkb: w.example.ckb,
    });
  }

  const built = buildDuelRounds({
    sourceType: 'category',
    difficulty: 'intermediate',
    categoryTitle: cat.name.en || cat.slug,
    seed,
    words: themeWords,
    bonusPoolWords: [...themeWords, ...globalWords],
  });

  if (built.rounds.length < DUEL_ROUNDS_COUNT) {
    return { ok: false, error: 'This category does not have enough words for a 3-round duel' };
  }

  return {
    ok: true,
    seed,
    categorySlug: cat.slug,
    categoryTitle: cat.name.en || cat.slug,
    timeLimitSec: duelTimeLimitFor('category', 'intermediate'),
    rounds: built.rounds,
    bonusCatalog: built.bonusCatalog,
  };
}
