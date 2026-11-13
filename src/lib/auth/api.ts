import 'server-only';

import { cache } from 'react';

import { buildUrl, type QueryParams } from '@/lib/api/client';
import { normalizeBook, type Book } from '@/lib/api/normalize';
import { booksSchema } from '@/lib/api/schemas';

import { parseAccount, type Account } from './account';

/**
 * Authenticated calls stay off the shared Next data cache.
 *
 * `apiGet` caches by URL for every visitor. A league board or a class-book
 * list is one person's response, and a 401 must not be stored for the next
 * reader. These requests are `no-store` and are deduped only inside one render.
 */

const USER_AGENT =
  'ErfanAcademyWeb/1.0 (+https://erfaninfo.com; Next.js server; contact: erfaninfo.com)';

export type AuthResult = {
  status: number;
  json: unknown;
};

export async function authRequest(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST';
    token?: string | null;
    params?: QueryParams;
    body?: unknown;
    timeoutMs?: number;
  } = {}
): Promise<AuthResult> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
    }

    const response = await fetch(buildUrl(endpoint, options.params), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(options.timeoutMs ?? 20_000),
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

export type AccountResult = Account | 'unauthorized' | 'unavailable';

export const fetchAccount = cache(async (token: string): Promise<AccountResult> => {
  const result = await authRequest('me.php', { token, timeoutMs: 10_000 });
  if (result.status === 401) return 'unauthorized';
  if (result.status !== 200) return 'unavailable';
  return parseAccount(result.json) ?? 'unavailable';
});

/**
 * `books.php?scope=student` with the reader's token.
 *
 * Returned as the API sent it. Anonymous callers never reach this, and the
 * public catalog in `getBooks` still drops `is_student` books.
 */
export const fetchStudentBooks = cache(async (token: string): Promise<Book[] | null> => {
  const result = await authRequest('books.php', {
    token,
    params: { scope: 'student' },
  });
  if (result.status !== 200) return null;
  const parsed = booksSchema.safeParse(result.json);
  if (!parsed.success) return null;
  return parsed.data
    .map(normalizeBook)
    .sort(
      (a, b) =>
        a.seriesSortOrder - b.seriesSortOrder ||
        a.volumeOrder - b.volumeOrder ||
        a.sortOrder - b.sortOrder ||
        a.title.localeCompare(b.title)
    );
});
