import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import '../globals.css';

import { BottomNav } from '@/components/layout/bottom-nav';
import { NavigationProgress } from '@/components/layout/navigation-progress';
import { SiteHeader } from '@/components/layout/site-header';
import { LOCALES, THEME_COOKIE, dirOf, isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { NAV_ITEMS } from '@/lib/nav';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://erfaninfo.com';

/**
 * This is a root layout: it owns `<html>` and `<body>`, so `lang` and `dir` can
 * be per-locale. `/status` lives under its own root layout in a route group.
 *
 * Nothing here reads cookies. With Cache Components a cookie read outside
 * `<Suspense>` makes the whole route dynamic, so the shell stays prerenderable
 * and the one part that needs a cookie — the language menu's current gloss —
 * streams in behind a skeleton. The theme is applied by the inline script
 * before first paint, so it needs no server read at all.
 */

/**
 * No `<Suspense>` around the header or the bottom bar, deliberately.
 *
 * Next starts streaming the response at the first Suspense boundary, and once
 * it has started the status is fixed at 200 — so a `notFound()` further down
 * would render the 404 UI under a 200 (a soft 404). The definition of done
 * asks for a real 404 when an item is deleted, so this layout renders inline
 * and every route under it can still set its own status.
 *
 * It costs little: the header needs one cookie read and no API call, and all
 * catalog data is cached server-side, so this is a cache read rather than a
 * round trip to the API.
 */
export function generateStaticParams() {
  // Only the locale segment is pre-rendered. Book, topic and category ids are
  // deliberately not, so a deleted item cannot survive as a stale static page.
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: 'Erfan Academy',
      template: '%s · Erfan Academy',
    },
    description: t('speakingPart1HeroSubtitle'),
    applicationName: 'Erfan Academy',
    alternates: {
      canonical: `/${locale}`,
      // Next's Languages type is keyed by the locale tags it knows about, and
      // `ckb` (Central Kurdish) is not among them. It is a valid BCP-47 tag and
      // renders correctly; only the key type is too narrow.
      languages: {
        en: '/en',
        fa: '/fa',
        ckb: '/ckb',
        'x-default': '/en',
      } as Metadata['alternates'] extends { languages?: infer L } ? L : never,
    },
    openGraph: {
      type: 'website',
      siteName: 'Erfan Academy',
      locale,
      url: `/${locale}`,
    },
    icons: {
      icon: '/brand/app-icon.png',
      apple: '/brand/logo.png',
    },
    formatDetection: { telephone: false, address: false, email: false },
  };
}

/**
 * Applies the stored theme before first paint, so there is no flash of the
 * wrong one, and falls back to the system preference. Kept inline and tiny.
 */
const THEME_SCRIPT = `
(function(){try{
var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/);
var t=m?m[1]:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
document.documentElement.dataset.theme=t;
}catch(e){}})();
`.trim();

export default async function LocaleLayout({
  children,
  modal,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getTranslator(locale);

  const navLabels: Record<string, string> = {
    navPrimary: t('tabHome'),
    ...Object.fromEntries(NAV_ITEMS.map((item) => [item.key, t(item.labelKey)])),
  };

  return (
    <html lang={locale} dir={dirOf(locale)} suppressHydrationWarning>
      <head>
        {/* Only the above-the-fold face is preloaded. */}
        <link
          rel="preload"
          href={
            locale === 'en'
              ? '/fonts/open-sans-latin.woff2'
              : '/fonts/vazirmatn-arabic.woff2'
          }
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main"
          className="focus-visible:bg-primary focus-visible:text-on-primary sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:z-50 focus-visible:m-3 focus-visible:rounded-[var(--radius-sm)] focus-visible:px-4 focus-visible:py-2"
        >
          {t('skipToContent')}
        </a>

        <SiteHeader locale={locale} />

        {/*
          `tabIndex={-1}` so route changes can move focus here, telling screen
          reader users the page changed (ui-ux-spec.md §6).
        */}
        <main id="main" tabIndex={-1} className="pb-nav pt-8 outline-none">
          {children}
        </main>

        {/*
          The modal slot. Empty unless a route is intercepted into it — see
          @modal/default.tsx — which is how Learn opens as a sheet over the
          grammar list while keeping its own URL.
        */}
        {modal}

        <BottomNav locale={locale} labels={navLabels} />
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
      </body>
    </html>
  );
}
