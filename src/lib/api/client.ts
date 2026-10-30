import 'server-only';

import type { z } from 'zod';

import { ApiError, logApiError } from './errors';

/**
 * The HTTP client for wordsapi. This is the only module in the project that
 * performs a network request to the API, and it only ever runs on the server.
 *
 * Politeness rules from the brief, all enforced here: a descriptive
 * User-Agent, reused connections, no parallel bursts, concurrency capped at 3.
 */

const BASE_URL = (
  process.env.WORDSAPI_BASE_URL ?? 'https://erfaninfo.com/wordsapi'
).replace(/\/+$/, '');

const USER_AGENT =
  'ErfanAcademyWeb/1.0 (+https://erfaninfo.com; Next.js server; contact: erfaninfo.com)';

/** Default budget. `words.php` gets its own — see TIMEOUTS. */
const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * `words.php` measured 176 KB–864 KB and 2.2 s–10.4 s depending on the book,
 * which would blow the 8 s default on the largest ones. Decision D4 was to
 * solve this on the web side only, so it gets a wider budget instead of a
 * backend change.
 */
const TIMEOUTS: Record<string, number> = {
  'words.php': 20_000,
  'game_word_categories.php': 15_000,
  'grammar_questions.php': 12_000,
};

const MAX_RETRIES = 2;
const MAX_CONCURRENCY = 3;

/** A tiny FIFO semaphore so we never fire a burst at the shared host. */
let active = 0;
const waiting: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENCY) {
    active += 1;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
  active += 1;
}

function release(): void {
  active -= 1;
  const next = waiting.shift();
  if (next) next();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type QueryParams = Record<string, string | number | undefined>;

/**
 * Cache policy for one request, applied by Next's Data Cache.
 *
 * `revalidate` is the background refresh window in seconds; a stale entry is
 * served immediately while the refresh runs, which is what keeps the shared
 * host from being hammered. `tags` allow on-demand invalidation through
 * `/internal/revalidate`.
 */
export type CachePolicy = {
  revalidate: number;
  tags: string[];
};

/** The brief's 30–60 s window for catalog data. */
export const CATALOG: Omit<CachePolicy, 'tags'> = { revalidate: 60 };

/** Large payloads that are edited rarely: the 400 KB games list, PDFs, update info. */
export const CATALOG_SLOW: Omit<CachePolicy, 'tags'> = { revalidate: 300 };

/**
 * Builds the request URL. Parameters are encoded by URLSearchParams and the
 * endpoint name is checked against a strict pattern, so nothing a route
 * parameter contains can alter the path.
 */
export function buildUrl(endpoint: string, params?: QueryParams): string {
  if (!/^[a-z0-9_]+\.php$/.test(endpoint)) {
    throw new Error(`Refusing to build a URL for suspicious endpoint: ${endpoint}`);
  }

  const url = new URL(`${BASE_URL}/${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function fetchOnce(
  url: string,
  endpoint: string,
  timeoutMs: number,
  cache: CachePolicy
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      // Next's Data Cache: shared across all visitors on the server, with
      // stale-while-revalidate and tag-based invalidation.
      next: { revalidate: cache.revalidate, tags: cache.tags },
    });

    const body = await response.text();

    if (!response.ok) {
      // Errors are `{"error": "..."}` with 400 / 401 / 404 / 405.
      let detail = body.slice(0, 300);
      try {
        const parsed: unknown = JSON.parse(body);
        if (parsed && typeof parsed === 'object' && 'error' in parsed) {
          detail = String((parsed as { error: unknown }).error);
        }
      } catch {
        // Not JSON — an HTML error page. Keep the truncated body as detail.
      }
      throw new ApiError({
        kind: 'http',
        endpoint,
        status: response.status,
        message: `${endpoint} returned ${response.status}`,
        detail,
      });
    }

    // An unknown .php path on this host returns a 404 HTML page, and a
    // misconfigured server could return HTML with a 200. Guard both.
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) {
      throw new ApiError({
        kind: 'not-json',
        endpoint,
        status: response.status,
        message: `${endpoint} returned ${contentType || 'no content-type'}, not JSON`,
        detail: body.slice(0, 200),
      });
    }

    return body;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError({
        kind: 'timeout',
        endpoint,
        message: `${endpoint} timed out after ${timeoutMs}ms`,
        cause: error,
      });
    }

    throw new ApiError({
      kind: 'network',
      endpoint,
      message: `${endpoint} could not be reached`,
      cause: error,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET an endpoint, validate it, return typed data.
 *
 * Retries are for idempotent GETs only (every public endpoint is one) and only
 * for network, timeout and 5xx failures — never for a 4xx, which would just ask
 * wrongly a second time, and never for a validation failure, which is a
 * backend shape change that retrying cannot fix.
 */
export async function apiGet<T>(
  endpoint: string,
  schema: z.ZodType<T>,
  cache: CachePolicy,
  params?: QueryParams
): Promise<T> {
  const url = buildUrl(endpoint, params);
  const timeoutMs = TIMEOUTS[endpoint] ?? DEFAULT_TIMEOUT_MS;

  let lastError: ApiError | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    await acquire();
    let body: string;
    try {
      body = await fetchOnce(url, endpoint, timeoutMs, cache);
    } catch (error) {
      lastError = error as ApiError;
      if (!lastError.retryable || attempt === MAX_RETRIES) {
        logApiError(lastError);
        throw lastError;
      }
      // 400 ms, then 800 ms.
      await sleep(400 * 2 ** attempt);
      continue;
    } finally {
      release();
    }

    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch (error) {
      const parseError = new ApiError({
        kind: 'not-json',
        endpoint,
        message: `${endpoint} returned a JSON content-type but unparseable body`,
        detail: body.slice(0, 200),
        cause: error,
      });
      logApiError(parseError);
      throw parseError;
    }

    const result = schema.safeParse(json);
    if (!result.success) {
      const issues = result.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      const validationError = new ApiError({
        kind: 'validation',
        endpoint,
        message: `${endpoint} did not match its schema — the backend shape may have changed`,
        detail: issues,
      });
      logApiError(validationError);
      throw validationError;
    }

    return result.data;
  }

  // Unreachable: the loop either returns or throws.
  throw (
    lastError ?? new ApiError({ kind: 'network', endpoint, message: 'unknown failure' })
  );
}

/** Exposed for the contract check and the status page. */
export const clientConfig = {
  baseUrl: BASE_URL,
  userAgent: USER_AGENT,
  defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
  timeouts: TIMEOUTS,
  maxConcurrency: MAX_CONCURRENCY,
} as const;
