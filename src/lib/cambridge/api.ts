import 'server-only';

import { cache } from 'react';

import { buildUrl } from '@/lib/api/client';
import {
  CAMBRIDGE_LIVE_VOLUMES,
  cambridgeVolumeNumber,
  secureUrl,
} from '@/lib/api/normalize';
import { getBook, getBooks } from '@/lib/api/queries';
import type { CambridgeSkill } from './labels';

const USER_AGENT =
  'ErfanAcademyWeb/1.0 (+https://erfaninfo.com; Next.js server; contact: erfaninfo.com)';

export const CAMBRIDGE_DEFAULT_SLUG = '15-academic';

export type CambridgeManifestTest = {
  test: number;
  listeningParts: number;
  readingPassages: number;
  writingTasks: number;
  speakingParts: number;
};

export type CambridgeManifest = {
  slug: string;
  title: string;
  tests: CambridgeManifestTest[];
};

export type CambridgeSection = {
  slug: string;
  test: number;
  skill: CambridgeSkill;
  audioUrl: string | null;
  segments: Record<string, unknown>[];
};

export type CambridgeScoreItem = {
  number: number;
  correct: boolean;
  yours: string;
  expected: string;
};

export type CambridgeScore = {
  score: number | null;
  max: number | null;
  bandScore?: number | null;
  saved: boolean;
  items: CambridgeScoreItem[];
};

export type CambridgeSavedHighlight = {
  id: string;
  scopeKey: string;
  start: number;
  end: number;
  quote: string;
  note?: string;
};

export type CambridgeUserState = {
  exists: boolean;
  slug: string;
  test: number;
  skill: CambridgeSkill;
  mode: 'practice' | 'exam';
  answers: Record<string, string>;
  highlights: CambridgeSavedHighlight[];
  flagged: number[];
  remainingSec: number | null;
  status: 'not_started' | 'in_progress' | 'completed';
};

export type CambridgeResultSummary = {
  slug: string;
  test: number;
  skill: CambridgeSkill;
  status: 'in_progress' | 'completed';
  latestScore: number | null;
  max: number | null;
  latestBand: number | null;
  bestBand: number | null;
  latestMode: 'practice' | 'exam';
  attemptsCount: number;
};

export type CambridgeTranslationPair = {
  fa?: string;
  ckb?: string;
};

export type CambridgeAudioscriptItem = {
  part: number;
  speaker: string;
  en: string;
  fa?: string;
  ckb?: string;
};

export type CambridgeSampleWritingItem = {
  kind: string;
  path: string;
  en: string;
  fa?: string;
  ckb?: string;
};

export type CambridgeTranslationBundle = {
  available: boolean;
  byEn: Record<string, CambridgeTranslationPair>;
  audioscript: CambridgeAudioscriptItem[];
  sampleWriting: CambridgeSampleWritingItem[];
};

export type CambridgeKeyedAnswer = {
  answer: string;
  raw: string;
};

export type CambridgeTarget = {
  /** Route segment used in `/books/[bookId]/cambridge/...` (numeric ID or slug like `19-academic`). */
  param: string;
  /** Database `book_id` (0 when served directly from a Cambridge slug before a DB row exists). */
  bookId: number;
  /** Live server Cambridge folder slug, e.g. `15-academic`..`21-academic`. */
  slug: string;
  /** Numeric volume string, e.g. `"15"`..`"21"`. */
  volume: string;
  /** Human-readable display title, e.g. `Cambridge IELTS 19 - Academic`. */
  title: string;
  /** Series id for the Back button (`1` for Cambridge IELTS). */
  seriesId: number | null;
};

function rec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : fallback;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function volumeFromSlug(slug: string): number | null {
  const m = slug.match(/^(\d+)-/);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Upgrades any `http://` media URLs returned inside live Cambridge segment payloads. */
function sanitizeSegmentUrls(node: unknown): unknown {
  if (typeof node === 'string') {
    return node.startsWith('http://') ? secureUrl(node) : node;
  }
  if (Array.isArray(node)) {
    return node.map(sanitizeSegmentUrls);
  }
  const obj = rec(node);
  if (!obj) return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = sanitizeSegmentUrls(v);
  }
  return out;
}

/**
 * Fetches live `GET /cambridge_manifest.php?slug=...` from the server.
 */
export const getCambridgeManifest = cache(
  async (slug = CAMBRIDGE_DEFAULT_SLUG): Promise<CambridgeManifest | null> => {
    try {
      const res = await fetch(buildUrl('cambridge_manifest.php', { slug }), {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
        ...(process.env.NODE_ENV === 'development'
          ? { cache: 'no-store' as const }
          : { next: { revalidate: 60 } }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return null;
      const root = rec(await res.json());
      if (!root) return null;

      const rawTests = Array.isArray(root.tests) ? root.tests : [];
      const tests: CambridgeManifestTest[] = rawTests
        .map((item) => {
          const m = rec(item);
          if (!m) return null;
          const test = num(m.test);
          if (test <= 0) return null;
          return {
            test,
            listeningParts: num(m.listening_parts),
            readingPassages: num(m.reading_passages),
            writingTasks: num(m.writing_tasks),
            speakingParts: num(m.speaking_parts),
          };
        })
        .filter((t): t is CambridgeManifestTest => t !== null)
        .sort((a, b) => a.test - b.test);

      if (tests.length === 0) return null;

      const vol = volumeFromSlug(slug);
      const rawTitle = str(root.title);
      // Guard against server fallback returning "Cambridge IELTS 15 Academic" for other slugs.
      const fallbackTitle = vol ? `Cambridge IELTS ${vol} Academic` : 'Cambridge IELTS Academic';
      const title =
        vol && rawTitle && !rawTitle.includes(String(vol))
          ? fallbackTitle
          : rawTitle || fallbackTitle;

      return {
        slug: str(root.slug, slug),
        title,
        tests,
      };
    } catch {
      return null;
    }
  }
);

/**
 * Resolves a route `[bookId]` param to a live Cambridge target.
 *
 * Supports both database book IDs (e.g. `28`–`31` or any future DB row for 19–21)
 * and direct slug params (e.g. `19-academic`, `20-academic`, `21-academic`) so
 * volumes uploaded to the Cambridge API work immediately even before DB rows exist.
 */
export const resolveCambridgeTarget = cache(
  async (bookParam: string): Promise<CambridgeTarget | null> => {
    if (/^\d+$/.test(bookParam)) {
      const id = Number(bookParam);
      if (id <= 0) return null;
      const book = await getBook(id);
      if (!book) return null;
      const vol = cambridgeVolumeNumber(book);
      if (vol === null) return null;
      const slug = `${vol}-academic`;
      const manifest = await getCambridgeManifest(slug);
      if (!manifest || manifest.tests.length === 0) return null;
      return {
        param: String(id),
        bookId: id,
        slug,
        volume: String(vol),
        title: book.title,
        seriesId: book.seriesId,
      };
    }

    const slugMatch = bookParam.match(/^(\d{1,2})-academic$/i);
    if (!slugMatch?.[1]) return null;
    const vol = Number(slugMatch[1]);
    if (!Number.isFinite(vol) || vol < 1 || vol > 50) return null;
    const slug = `${vol}-academic`;

    const [manifest, allBooks] = await Promise.all([
      getCambridgeManifest(slug),
      getBooks(),
    ]);
    if (!manifest) return null;

    // If a DB book already exists for this volume, attach its real book_id.
    const matchingDb = allBooks.find((b) => cambridgeVolumeNumber(b) === vol) ?? null;
    const cambridgeSeriesId =
      matchingDb?.seriesId ??
      allBooks.find((b) => cambridgeVolumeNumber(b) !== null && b.seriesId !== null)
        ?.seriesId ??
      null;

    return {
      param: matchingDb ? String(matchingDb.id) : slug,
      bookId: matchingDb?.id ?? 0,
      slug,
      volume: String(vol),
      title: matchingDb?.title ?? `Cambridge IELTS ${vol} - Academic`,
      seriesId: cambridgeSeriesId,
    };
  }
);

/**
 * Auto-discovers which Cambridge volume numbers currently have live tests published
 * on `cambridge_manifest.php` (`1-academic` .. `50-academic`).
 * Returns a map of `volumeNumber -> testCount`.
 */
export const getLiveCambridgeManifestCounts = cache(
  async (volumeNumbers: ReadonlyArray<number>): Promise<Map<number, number>> => {
    const unique = [...new Set(volumeNumbers.filter((v) => Number.isFinite(v) && v >= 1 && v <= 50))];
    if (unique.length === 0) return new Map();

    const checked = await Promise.all(
      unique.map(async (vol) => {
        const manifest = await getCambridgeManifest(`${vol}-academic`);
        return manifest && manifest.tests.length > 0 ? ([vol, manifest.tests.length] as const) : null;
      })
    );

    const out = new Map<number, number>();
    for (const pair of checked) {
      if (pair) out.set(pair[0], pair[1]);
    }
    return out;
  }
);

/** Future/newer volumes above DB rows that we auto-discover directly from `cambridge_manifest.php`. */
const EXTRA_CAMBRIDGE_SCAN_VOLUMES = [25, 24, 23, 22, ...CAMBRIDGE_LIVE_VOLUMES] as const;

/**
 * Returns live Cambridge volumes that exist on `cambridge_manifest.php`
 * but do not yet have a database row in `books.php` (e.g. Cambridge 19–25).
 */
export const getExtraLiveCambridgeVolumes = cache(
  async (
    existingVolumeNumbers: ReadonlyArray<number>
  ): Promise<Array<{ volume: number; slug: string; title: string; testsCount: number }>> => {
    const existing = new Set(existingVolumeNumbers);
    const missing = [...new Set(EXTRA_CAMBRIDGE_SCAN_VOLUMES)].filter((v) => !existing.has(v));
    if (missing.length === 0) return [];

    const checked = await Promise.all(
      missing.map(async (vol) => {
        const slug = `${vol}-academic`;
        const manifest = await getCambridgeManifest(slug);
        if (!manifest || manifest.tests.length === 0) return null;
        return {
          volume: vol,
          slug,
          title: `Cambridge IELTS ${vol} - Academic`,
          testsCount: manifest.tests.length,
        };
      })
    );

    return checked
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.volume - a.volume);
  }
);

/**
 * Fetches live `GET /cambridge_section.php?slug=...&test=...&skill=...` from the server.
 */
export const getCambridgeSection = cache(
  async (
    slug: string,
    test: number,
    skill: CambridgeSkill
  ): Promise<CambridgeSection | null> => {
    try {
      const res = await fetch(
        buildUrl('cambridge_section.php', { slug, test, skill }),
        {
          headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(15_000),
        }
      );
      if (!res.ok) return null;
      const root = rec(await res.json());
      if (!root || !Array.isArray(root.segments)) return null;

      const audioRaw = str(root.audio_url);
      const segments = root.segments
        .map((seg) => rec(sanitizeSegmentUrls(seg)))
        .filter((s): s is Record<string, unknown> => s !== null);

      return {
        slug: str(root.slug, slug),
        test: num(root.test, test),
        skill,
        audioUrl: audioRaw ? secureUrl(audioRaw) : null,
        segments,
      };
    } catch {
      return null;
    }
  }
);

export function countForSkill(t: CambridgeManifestTest, skill: CambridgeSkill): number {
  switch (skill) {
    case 'listening':
      return t.listeningParts;
    case 'reading':
      return t.readingPassages;
    case 'writing':
      return t.writingTasks;
    case 'speaking':
      return t.speakingParts;
  }
}

/**
 * Fetches live `GET /cambridge_answers.php?slug=...&test=...&skill=...`
 * so the per-question "Answer" button works immediately, matching Flutter's
 * `cambridgeAnswerKeyProvider`.
 */
export const getCambridgeAnswerKey = cache(
  async (
    slug: string,
    test: number,
    skill: CambridgeSkill
  ): Promise<Record<string, CambridgeKeyedAnswer>> => {
    if (skill !== 'listening' && skill !== 'reading') return {};
    try {
      const res = await fetch(
        buildUrl('cambridge_answers.php', { slug, test, skill }),
        {
          headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (!res.ok) return {};
      const root = rec(await res.json());
      const rawAnswers = root ? rec(root.answers) : null;
      if (!rawAnswers) return {};

      const out: Record<string, CambridgeKeyedAnswer> = {};
      for (const [qNum, val] of Object.entries(rawAnswers)) {
        const entry = rec(val);
        if (!entry) continue;
        const answer = typeof entry.answer === 'string' ? entry.answer : '';
        const raw = typeof entry.raw === 'string' ? entry.raw : answer;
        if (answer || raw) out[qNum] = { answer, raw };
      }
      return out;
    } catch {
      return {};
    }
  }
);

/**
 * Fetches a signed-in user's saved in-progress state from `GET /cambridge_state.php`.
 * Returns `null` silently if unauthenticated or if the endpoint is not yet deployed.
 */
export async function getCambridgeUserState(
  token: string | null,
  slug: string,
  test: number,
  skill: CambridgeSkill,
  mode: 'practice' | 'exam'
): Promise<CambridgeUserState | null> {
  if (!token) return null;
  try {
    const res = await fetch(
      buildUrl('cambridge_state.php', { slug, test, skill, mode }),
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': USER_AGENT,
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(5_000),
      }
    );
    if (!res.ok) return null;
    const root = rec(await res.json());
    if (!root || root.exists !== true) return null;

    const answersObj = rec(root.answers) ?? {};
    const answers: Record<string, string> = {};
    for (const [k, v] of Object.entries(answersObj)) {
      if (typeof v === 'string' && v.trim()) answers[k] = v;
    }

    const rawHighlights = Array.isArray(root.highlights) ? root.highlights : [];
    const highlights: CambridgeSavedHighlight[] = [];
    for (const entry of rawHighlights) {
      const m = rec(entry);
      if (!m) continue;
      const id = str(m.id);
      const scopeKey = str(m.scopeKey);
      const quote = str(m.quote);
      const start = typeof m.start === 'number' ? Math.floor(m.start) : -1;
      const end = typeof m.end === 'number' ? Math.floor(m.end) : -1;
      if (!id || !scopeKey || !quote || start < 0 || end <= start) continue;
      const item: CambridgeSavedHighlight = { id, scopeKey, start, end, quote };
      if (typeof m.note === 'string' && m.note) item.note = m.note;
      highlights.push(item);
    }

    const flagged = Array.isArray(root.flagged)
      ? root.flagged
          .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
          .map((n) => Math.floor(n))
      : [];

    const remainingSec =
      typeof root.remaining_sec === 'number' && Number.isFinite(root.remaining_sec)
        ? Math.max(0, Math.floor(root.remaining_sec))
        : null;

    const status =
      root.status === 'completed'
        ? 'completed'
        : root.status === 'in_progress'
          ? 'in_progress'
          : 'not_started';

    return {
      exists: true,
      slug,
      test,
      skill,
      mode,
      answers,
      highlights,
      flagged,
      remainingSec,
      status,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches a signed-in user's Cambridge result summaries from `GET /cambridge_results.php`.
 * Keyed by test number (`1..4`). Fails silently if not deployed yet.
 */
export async function getCambridgeResultsSummary(
  token: string | null,
  slug: string,
  skill: CambridgeSkill
): Promise<Record<number, CambridgeResultSummary>> {
  if (!token) return {};
  try {
    const res = await fetch(
      buildUrl('cambridge_results.php', { slug, skill, limit: 60 }),
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': USER_AGENT,
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(5_000),
      }
    );
    if (!res.ok) return {};
    const root = rec(await res.json());
    const rawSummary = Array.isArray(root?.summary) ? root.summary : [];

    const byTest: Record<number, CambridgeResultSummary> = {};
    for (const entry of rawSummary) {
      const m = rec(entry);
      if (!m) continue;
      const testNum = num(m.test);
      if (testNum <= 0) continue;
      byTest[testNum] = {
        slug: str(m.slug, slug),
        test: testNum,
        skill,
        status: m.status === 'completed' ? 'completed' : 'in_progress',
        latestScore: typeof m.latest_score === 'number' ? m.latest_score : null,
        max: typeof m.max === 'number' ? m.max : null,
        latestBand: typeof m.latest_band === 'number' ? m.latest_band : null,
        bestBand: typeof m.best_band === 'number' ? m.best_band : null,
        latestMode: m.latest_mode === 'exam' ? 'exam' : 'practice',
        attemptsCount: num(m.attempts_count),
      };
    }
    return byTest;
  } catch {
    return {};
  }
}

/**
 * Fetches Persian (`fa`) and Central Kurdish (`ckb`) translations for one test & skill
 * from live `GET /cambridge_translations.php`. Fails silently if not deployed or unavailable.
 */
export const getCambridgeTranslations = cache(
  async (
    slug: string,
    test: number,
    skill: CambridgeSkill
  ): Promise<CambridgeTranslationBundle | null> => {
    try {
      const res = await fetch(
        buildUrl('cambridge_translations.php', { slug, test, skill, lang: 'both' }),
        {
          headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
          ...(process.env.NODE_ENV === 'development'
            ? { cache: 'no-store' as const }
            : { next: { revalidate: 60 } }),
          signal: AbortSignal.timeout(8_000),
        }
      );
      if (!res.ok) return null;
      const root = rec(await res.json());
      if (!root || root.available !== true) return null;

      const byEn: Record<string, CambridgeTranslationPair> = {};
      const rawByEn = rec(root.by_en);
      if (rawByEn) {
        for (const [enText, val] of Object.entries(rawByEn)) {
          const m = rec(val);
          if (!m) continue;
          const pair: CambridgeTranslationPair = {};
          if (typeof m.fa === 'string' && m.fa.trim()) pair.fa = m.fa;
          if (typeof m.ckb === 'string' && m.ckb.trim()) pair.ckb = m.ckb;
          if (pair.fa || pair.ckb) byEn[enText] = pair;
        }
      }

      const audioscript: CambridgeAudioscriptItem[] = [];
      if (Array.isArray(root.audioscript)) {
        for (const entry of root.audioscript) {
          const m = rec(entry);
          if (!m) continue;
          const en = typeof m.en === 'string' ? m.en : '';
          if (!en) continue;
          const item: CambridgeAudioscriptItem = {
            part: num(m.part, 1),
            speaker: typeof m.speaker === 'string' ? m.speaker : '',
            en,
          };
          if (typeof m.fa === 'string' && m.fa.trim()) item.fa = m.fa;
          if (typeof m.ckb === 'string' && m.ckb.trim()) item.ckb = m.ckb;
          audioscript.push(item);
        }
      }

      const sampleWriting: CambridgeSampleWritingItem[] = [];
      if (Array.isArray(root.sample_writing)) {
        for (const entry of root.sample_writing) {
          const m = rec(entry);
          if (!m) continue;
          const en = typeof m.en === 'string' ? m.en : '';
          if (!en) continue;
          const item: CambridgeSampleWritingItem = {
            kind: typeof m.kind === 'string' ? m.kind : 'paragraph',
            path: typeof m.path === 'string' ? m.path : '',
            en,
          };
          if (typeof m.fa === 'string' && m.fa.trim()) item.fa = m.fa;
          if (typeof m.ckb === 'string' && m.ckb.trim()) item.ckb = m.ckb;
          sampleWriting.push(item);
        }
      }

      return { available: true, byEn, audioscript, sampleWriting };
    } catch {
      return null;
    }
  }
);
