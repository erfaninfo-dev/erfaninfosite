import 'server-only';

import { cache } from 'react';

import { buildUrl } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { glossOf, normalizeWord, type Word } from '@/lib/api/normalize';
import { getBooks, getGameCategories } from '@/lib/api/queries';
import { wordsSchema } from '@/lib/api/schemas';
import { authRequest } from '@/lib/auth/api';
import type { GlossLang } from '@/lib/i18n/config';

import {
  buildCampaignPlan,
  type BookTrackMap,
  type CampaignCatalogWord,
  type CampaignPlan,
} from './campaign';
import { gameLemma } from './logic';

const USER_AGENT =
  'ErfanAcademyWeb/1.0 (+https://erfaninfo.com; Next.js server; contact: erfaninfo.com)';

/** Compact server-side representation of a playable book word (`gameLemma` 2..7). */
type CompactBookWord = {
  id: number;
  bookId: number;
  word: string;
  meaning: Word['meaning'];
  example: Word['example'];
};

const GLOBAL_WORDS_TTL_MS = 15 * 60 * 1000; // 15 minutes
let globalWordsCache: { expiresAt: number; items: CompactBookWord[] } | null = null;
let globalWordsInFlight: Promise<CompactBookWord[] | null> | null = null;

/**
 * Fetches `GET /words.php?global=1` (matching Flutter `apiAllWordsCatalogProvider`).
 *
 * The raw JSON is ~4.7 MB (above Next.js's 2 MB Data Cache ceiling), so we
 * bypass Next's fetch cache (`no-store`) and keep a compact, filtered in-memory
 * cache of only the valid 2–7 letter playable lemmas for 15 minutes.
 */
async function loadGlobalBookWords(): Promise<CompactBookWord[] | null> {
  const now = Date.now();
  if (globalWordsCache && globalWordsCache.expiresAt > now) {
    return globalWordsCache.items;
  }
  if (globalWordsInFlight) return globalWordsInFlight;

  globalWordsInFlight = (async () => {
    try {
      const res = await fetch(buildUrl(ENDPOINTS.words, { global: 1 }), {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
        cache: 'no-store',
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) return null;
      const json: unknown = await res.json();
      const parsed = wordsSchema.safeParse(json);
      if (!parsed.success) return null;

      const items: CompactBookWord[] = [];
      for (const raw of parsed.data) {
        if (!gameLemma(raw.word)) continue;
        const w = normalizeWord(raw);
        items.push({
          id: w.id,
          bookId: w.bookId,
          word: w.word,
          meaning: w.meaning,
          example: w.example,
        });
      }
      globalWordsCache = {
        expiresAt: Date.now() + GLOBAL_WORDS_TTL_MS,
        items,
      };
      return items;
    } catch {
      return null;
    } finally {
      globalWordsInFlight = null;
    }
  })();

  return globalWordsInFlight;
}

/**
 * Builds the Normal Campaign catalog from public books (`words.php?global=1`
 * + `books.php`), matching Flutter's `wordBuilderCampaignPlanProvider` 1:1.
 * Falls back gracefully to `getGameCategories()` if `words.php?global=1` is
 * temporarily unreachable.
 */
export const getCampaignCatalog = cache(
  async (
    gloss: GlossLang
  ): Promise<{ words: CampaignCatalogWord[]; bookTrackById?: BookTrackMap }> => {
    const [globalWords, books] = await Promise.all([
      loadGlobalBookWords(),
      getBooks().catch(() => []),
    ]);

    if (globalWords && globalWords.length > 0 && books.length > 0) {
      const trackById: Record<number, 'general' | 'ielts'> = {};
      const publicBookIds = new Set<number>();
      for (const b of books) {
        if (!b.isPublic || b.isStudent) continue;
        publicBookIds.add(b.id);
        trackById[b.id] = b.track.trim().toLowerCase() === 'general' ? 'general' : 'ielts';
      }

      const words: CampaignCatalogWord[] = [];
      for (const w of globalWords) {
        if (!publicBookIds.has(w.bookId)) continue;
        const meaning = glossOf(w.meaning, gloss);
        if (!meaning) continue;
        words.push({
          rowId: w.id,
          bookId: w.bookId,
          word: w.word,
          meaning,
          exampleEn: w.example.en,
          exampleGloss: glossOf(w.example, gloss),
        });
      }

      if (words.length >= 150) {
        return { words, bookTrackById: trackById };
      }
    }

    // Fallback: game word categories if global words endpoint is unavailable.
    const categories = await getGameCategories();
    const out: CampaignCatalogWord[] = [];
    for (const cat of categories) {
      for (const w of cat.words) {
        const meaning = glossOf(w.meaning, gloss);
        if (!w.word || !meaning || !gameLemma(w.word)) continue;
        out.push({
          word: w.word,
          meaning,
          exampleEn: w.example.en,
          exampleGloss: glossOf(w.example, gloss),
        });
      }
    }
    return { words: out };
  }
);

export type MultilingualCatalogWord = {
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

/**
 * Loads the multilingual playable vocabulary catalog (reusing the same
 * 15-minute in-memory `words.php?global=1` cache) so 1v1 duel snapshots
 * carry `en`, `fa`, and `ckb` meanings for cross-locale opponents.
 */
export const getMultilingualCampaignCatalog = cache(
  async (): Promise<{
    words: MultilingualCatalogWord[];
    bookTrackById?: BookTrackMap;
  }> => {
    const [globalWords, books] = await Promise.all([
      loadGlobalBookWords(),
      getBooks().catch(() => []),
    ]);

    if (globalWords && globalWords.length > 0 && books.length > 0) {
      const trackById: Record<number, 'general' | 'ielts'> = {};
      const publicBookIds = new Set<number>();
      for (const b of books) {
        if (!b.isPublic || b.isStudent) continue;
        publicBookIds.add(b.id);
        trackById[b.id] = b.track.trim().toLowerCase() === 'general' ? 'general' : 'ielts';
      }

      const words: MultilingualCatalogWord[] = [];
      for (const w of globalWords) {
        if (!publicBookIds.has(w.bookId)) continue;
        if (!w.meaning.fa && !w.meaning.ckb && !w.meaning.en) continue;
        words.push({
          rowId: w.id,
          bookId: w.bookId,
          word: w.word,
          meaningEn: w.meaning.en,
          meaningFa: w.meaning.fa,
          meaningCkb: w.meaning.ckb,
          exampleEn: w.example.en,
          exampleFa: w.example.fa,
          exampleCkb: w.example.ckb,
        });
      }

      if (words.length >= 150) {
        return { words, bookTrackById: trackById };
      }
    }

    const categories = await getGameCategories();
    const out: MultilingualCatalogWord[] = [];
    for (const cat of categories) {
      for (const w of cat.words) {
        if (!w.word || !gameLemma(w.word)) continue;
        if (!w.meaning.fa && !w.meaning.ckb && !w.meaning.en) continue;
        out.push({
          word: w.word,
          meaningEn: w.meaning.en,
          meaningFa: w.meaning.fa,
          meaningCkb: w.meaning.ckb,
          exampleEn: w.example.en,
          exampleFa: w.example.fa,
          exampleCkb: w.example.ckb,
        });
      }
    }
    return { words: out };
  }
);

export const getCampaignPlan = cache(
  async (gloss: GlossLang, reshuffleSeed = 0): Promise<{
    plan: CampaignPlan;
    catalogWords: CampaignCatalogWord[];
  }> => {
    const { words, bookTrackById } = await getCampaignCatalog(gloss);
    const plan = buildCampaignPlan(words, reshuffleSeed, bookTrackById);
    return { plan, catalogWords: words };
  }
);

export type WordBuilderLeagueRow = {
  userId: number;
  rank: number | null;
  displayName: string;
  avatar: string;
  points: number;
  completedCount: number;
  badge: string;
};

export type WordBuilderLeagueData = {
  rows: WordBuilderLeagueRow[];
  you: WordBuilderLeagueRow | null;
  participants: number;
};

function rec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

function asInt(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0;
}

function parseRow(v: unknown): WordBuilderLeagueRow | null {
  const row = rec(v);
  if (!row) return null;
  const name = typeof row.display_name === 'string' ? row.display_name.trim() : '';
  const avatar = typeof row.avatar === 'string' ? row.avatar.trim() : 'm1';
  const badge = typeof row.badge === 'string' ? row.badge.trim() : '';
  return {
    userId: asInt(row.user_id),
    rank: typeof row.rank === 'number' && Number.isFinite(row.rank) ? row.rank : null,
    displayName: (name || 'Learner').slice(0, 80),
    avatar: avatar || 'm1',
    points: asInt(row.points),
    completedCount: asInt(row.completed_count),
    badge: badge.slice(0, 40),
  };
}

/**
 * Fetches `league.php?type=word_builder&period=lifetime` (public leaderboard;
 * optional auth token populates `current_user_rank`).
 */
export const getWordBuilderLeague = cache(
  async (token?: string | null): Promise<WordBuilderLeagueData | null> => {
    const res = await authRequest('league.php', {
      token,
      params: {
        type: 'word_builder',
        period: 'lifetime',
        sort: 'points',
        limit: 20,
        offset: 0,
      },
      timeoutMs: 8_000,
    });
    if (res.status !== 200) return null;
    const root = rec(res.json);
    if (!root || !Array.isArray(root.leaderboard)) return null;
    const rows = root.leaderboard
      .map(parseRow)
      .filter((r): r is WordBuilderLeagueRow => r !== null);
    const summary = rec(root.summary);
    return {
      rows,
      you: parseRow(root.current_user_rank),
      participants: asInt(summary?.participants) || rows.length,
    };
  }
);
