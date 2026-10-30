import { NextResponse, type NextRequest } from 'next/server';

import { DEFAULT_LOCALE, LOCALES } from '@/lib/i18n/config';

/**
 * Locale routing.
 *
 * A request without a locale prefix is redirected to the reader's best match
 * from `Accept-Language`, defaulting to English.
 *
 * In Next 16 this file is `proxy.ts`; the `middleware` convention is deprecated.
 */

/** Pick the best supported locale from an Accept-Language header. */
function negotiate(header: string | null): string {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      const quality = q ? Number.parseFloat(q.split('=')[1] ?? '1') : 1;
      return {
        tag: tag.trim().toLowerCase(),
        quality: Number.isNaN(quality) ? 0 : quality,
      };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    const base = tag.split('-')[0] ?? '';
    // Sorani may arrive as ckb, or as ku / kur from clients that do not
    // distinguish the Kurdish variants.
    if (tag === 'ckb' || base === 'ckb' || base === 'ku' || base === 'kur') return 'ckb';
    if (base === 'fa' || base === 'per') return 'fa';
    if (base === 'en') return 'en';
  }

  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest): NextResponse | undefined {
  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  if (hasLocale) return undefined;

  const locale = negotiate(request.headers.get('accept-language'));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  /*
   * Skip Next internals, static files, and the non-localised routes.
   *
   * `wordsapi`, `api` and `apk` are excluded for a specific reason: this app is
   * served from the root of erfaninfo.com, where Apache serves those paths from
   * disk (the PHP API, the APK downloads). They must never be rewritten to a
   * locale. See docs/decisions.md D1.
   */
  matcher: [
    '/((?!_next/|internal/|status|wordsapi/|api/|apk/|favicon\\.ico|robots\\.txt|sitemap\\.xml|brand/|fonts/).*)',
  ],
};
