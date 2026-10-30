import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

import { ALL_TAGS, isKnownTag } from '@/lib/api/endpoints';

/**
 * On-demand cache invalidation.
 *
 * Optional: the site is correct without it, because every catalog entry
 * revalidates on its own within 60 seconds. This exists so the PHP admin could
 * later ping the website after an edit and have the change appear instantly.
 *
 * It is at `/internal/revalidate`, NOT Next's default `/api/revalidate`:
 * `/api/` already exists on disk on this host and serves real downloads
 * (`/api/Erf.apk`). See docs/decisions.md D1.
 *
 * Nothing about the PHP API or the database needs to change for this to exist.
 */


/** Constant-time compare, so a wrong secret leaks nothing through timing. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still do a comparison so the failure takes a similar amount of time.
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const provided = request.headers.get('x-revalidate-secret') ?? '';
  if (!secretMatches(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }

  const requested =
    body && typeof body === 'object' && 'tags' in body
      ? (body as { tags: unknown }).tags
      : null;

  if (!Array.isArray(requested) || requested.length === 0) {
    return NextResponse.json(
      { error: 'Expected { tags: string[] }', knownTags: ALL_TAGS },
      { status: 400 }
    );
  }

  // Only tags this site actually uses, so a caller cannot invalidate anything
  // arbitrary or flood the cache with unknown keys.
  const valid = requested.filter(
    (tag): tag is string => typeof tag === 'string' && isKnownTag(tag)
  );
  const rejected = requested.filter((tag) => !valid.includes(tag as string));

  /*
   * `{ expire: 0 }` drops the stale copy immediately rather than letting it be
   * served while the refresh runs. That is the point of an on-demand ping: the
   * admin has just changed something and wants it visible now. Ordinary
   * time-based revalidation keeps its stale-while-revalidate behaviour.
   */
  for (const tag of valid) revalidateTag(tag, { expire: 0 });

  return NextResponse.json({ revalidated: valid, rejected, knownTags: ALL_TAGS });
}

export function GET() {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 });
}
