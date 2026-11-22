'use server';

import { authRequest } from '@/lib/auth/api';
import { getAuthToken } from '@/lib/auth/session';

/**
 * Best-effort sync of local Word Builder Normal campaign progress + coins
 * to `word_builder_league_progress.php`, matching Flutter's
 * `syncWordBuilderLeagueProgress`.
 */
export async function syncWordBuilderProgressAction(payload: {
  beginnerStagesCleared: number;
  intermediateStagesCleared: number;
  advancedStagesCleared: number;
  coins: number;
}): Promise<{ ok: boolean }> {
  const token = await getAuthToken();
  if (!token) return { ok: false };

  const res = await authRequest('word_builder_league_progress.php', {
    method: 'POST',
    token,
    body: {
      beginner_stages_cleared: Math.max(0, Math.min(50, Math.floor(payload.beginnerStagesCleared))),
      intermediate_stages_cleared: Math.max(
        0,
        Math.min(50, Math.floor(payload.intermediateStagesCleared))
      ),
      advanced_stages_cleared: Math.max(0, Math.min(50, Math.floor(payload.advancedStagesCleared))),
      coins: Math.max(0, Math.floor(payload.coins)),
    },
    timeoutMs: 8_000,
  });

  return { ok: res.status >= 200 && res.status < 300 };
}
