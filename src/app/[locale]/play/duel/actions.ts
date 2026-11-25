'use server';

import {
  resolveDuelActor,
  setGuestDuelSession,
} from '@/lib/game/word-builder/duel-guest';
import {
  duelApiRequest,
  fetchDuelList,
  generateDuelSnapshotServer,
} from '@/lib/game/word-builder/duel-server';
import {
  duelSingleResponseSchema,
  type DuelListResponse,
  type DuelPlayEvent,
  type DuelRecord,
  type DuelSourceType,
} from '@/lib/game/word-builder/duel-types';
import type { WordBuilderDifficulty } from '@/lib/game/word-builder/types';

function readError(json: unknown, fallback: string): string {
  if (json && typeof json === 'object' && 'error' in json) {
    const err = (json as { error?: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err.trim();
  }
  return fallback;
}

export type DuelMutationResult =
  | { ok: true; duel: DuelRecord; remainingMs?: number }
  | { ok: false; error: string };

export async function startGuestDuelSessionAction(input: {
  displayName: string;
  avatar: string;
}): Promise<{ ok: true; displayName: string; avatar: string } | { ok: false; error: string }> {
  const session = await setGuestDuelSession(input.displayName, input.avatar);
  if (!session) {
    return { ok: false, error: 'Please enter a name (at least 2 characters)' };
  }
  return { ok: true, displayName: session.displayName, avatar: session.avatar };
}

export async function createDuelAction(input: {
  sourceType: DuelSourceType;
  difficulty: WordBuilderDifficulty;
  categorySlug?: string;
  opponentUserId?: number | null;
}): Promise<DuelMutationResult> {
  const actor = await resolveDuelActor();
  if (!actor) return { ok: false, error: 'Please choose a guest name or sign in first' };

  const snapshot = await generateDuelSnapshotServer({
    sourceType: input.sourceType,
    difficulty: input.difficulty,
    categorySlug: input.categorySlug ?? '',
  });
  if (!snapshot.ok) {
    return { ok: false, error: snapshot.error };
  }

  const res = await duelApiRequest(actor, {
    method: 'POST',
    body: {
      action: 'create',
      source_type: input.sourceType,
      difficulty: input.difficulty,
      category_slug: snapshot.categorySlug,
      category_title: snapshot.categoryTitle,
      seed: snapshot.seed,
      rounds: snapshot.rounds,
      bonus_catalog: snapshot.bonusCatalog,
      time_limit_sec: snapshot.timeLimitSec,
      opponent_user_id: actor.isGuest ? null : (input.opponentUserId ?? null),
    },
    timeoutMs: 12_000,
  });

  if (res.status < 200 || res.status >= 300) {
    return { ok: false, error: readError(res.json, 'Could not create duel') };
  }

  const parsed = duelSingleResponseSchema.safeParse(res.json);
  if (!parsed.success) {
    return { ok: false, error: 'Unexpected server response' };
  }

  return { ok: true, duel: parsed.data.duel };
}

export async function joinAndStartDuelAction(code: string): Promise<DuelMutationResult> {
  const actor = await resolveDuelActor();
  if (!actor) return { ok: false, error: 'Please choose a guest name or sign in first' };

  const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length < 4 || cleaned.length > 12) {
    return { ok: false, error: 'Invalid duel code' };
  }

  const res = await duelApiRequest(actor, {
    method: 'POST',
    body: {
      action: 'join_and_start',
      code: cleaned,
    },
    timeoutMs: 12_000,
  });

  if (res.status < 200 || res.status >= 300) {
    return { ok: false, error: readError(res.json, 'Could not start duel') };
  }

  const parsed = duelSingleResponseSchema.safeParse(res.json);
  if (!parsed.success) {
    return { ok: false, error: 'Unexpected server response' };
  }

  return {
    ok: true,
    duel: parsed.data.duel,
    remainingMs: parsed.data.remainingMs ?? parsed.data.duel.remainingMs,
  };
}

export async function submitDuelAttemptAction(input: {
  code: string;
  events: DuelPlayEvent[];
  hintsUsed: number;
  elapsedMs: number;
}): Promise<DuelMutationResult> {
  const actor = await resolveDuelActor();
  if (!actor) return { ok: false, error: 'Please choose a guest name or sign in first' };

  const cleaned = input.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const res = await duelApiRequest(actor, {
    method: 'POST',
    body: {
      action: 'submit',
      code: cleaned,
      events: input.events,
      hints_used: Math.max(0, Math.min(2, Math.floor(input.hintsUsed))),
      elapsed_ms: Math.max(0, Math.floor(input.elapsedMs)),
    },
    timeoutMs: 12_000,
  });

  if (res.status < 200 || res.status >= 300) {
    return { ok: false, error: readError(res.json, 'Could not submit duel result') };
  }

  const parsed = duelSingleResponseSchema.safeParse(res.json);
  if (!parsed.success) {
    return { ok: false, error: 'Unexpected server response' };
  }

  return { ok: true, duel: parsed.data.duel };
}

export async function rematchDuelAction(input: {
  duelId: number;
  sourceType: DuelSourceType;
  difficulty: WordBuilderDifficulty;
  categorySlug: string;
}): Promise<DuelMutationResult> {
  const actor = await resolveDuelActor();
  if (!actor) return { ok: false, error: 'Please choose a guest name or sign in first' };

  const snapshot = await generateDuelSnapshotServer({
    sourceType: input.sourceType,
    difficulty: input.difficulty,
    categorySlug: input.categorySlug,
  });
  if (!snapshot.ok) {
    return { ok: false, error: snapshot.error };
  }

  const res = await duelApiRequest(actor, {
    method: 'POST',
    body: {
      action: 'rematch',
      duel_id: input.duelId,
      source_type: input.sourceType,
      difficulty: input.difficulty,
      category_slug: snapshot.categorySlug,
      category_title: snapshot.categoryTitle,
      seed: snapshot.seed,
      rounds: snapshot.rounds,
      bonus_catalog: snapshot.bonusCatalog,
      time_limit_sec: snapshot.timeLimitSec,
    },
    timeoutMs: 12_000,
  });

  if (res.status < 200 || res.status >= 300) {
    return { ok: false, error: readError(res.json, 'Could not start rematch') };
  }

  const parsed = duelSingleResponseSchema.safeParse(res.json);
  if (!parsed.success) {
    return { ok: false, error: 'Unexpected server response' };
  }

  return { ok: true, duel: parsed.data.duel };
}

export async function declineDuelAction(
  duelId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await resolveDuelActor();
  if (!actor) return { ok: false, error: 'Session required' };

  const res = await duelApiRequest(actor, {
    method: 'POST',
    body: { action: 'decline', duel_id: duelId },
    timeoutMs: 10_000,
  });

  if (res.status < 200 || res.status >= 300) {
    return { ok: false, error: readError(res.json, 'Could not decline duel') };
  }
  return { ok: true };
}

export async function cancelDuelAction(
  duelId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await resolveDuelActor();
  if (!actor) return { ok: false, error: 'Session required' };

  const res = await duelApiRequest(actor, {
    method: 'POST',
    body: { action: 'cancel', duel_id: duelId },
    timeoutMs: 10_000,
  });

  if (res.status < 200 || res.status >= 300) {
    return { ok: false, error: readError(res.json, 'Could not cancel duel') };
  }
  return { ok: true };
}

export async function refreshDuelListAction(): Promise<
  { ok: true; data: DuelListResponse } | { ok: false; error: string }
> {
  const actor = await resolveDuelActor();
  if (!actor) return { ok: false, error: 'Session required' };
  const res = await fetchDuelList(actor);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, data: res.data };
}
