import Image from 'next/image';
import Link from 'next/link';

import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { MainNav } from '@/components/layout/main-nav';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { IconSearch } from '@/components/ui/icons';
import type { Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { NAV_ITEMS, localeHref } from '@/lib/nav';
import { getGloss } from '@/lib/request-context';

/**
 * The site header. A real header with real links — not a Material app bar.
 *
 * Sticky and deliberately short, so it does not eat the little vertical space a
 * landscape phone has (ui-ux-spec.md §2.1).
 *
 * It reads the gloss cookie, which makes it dynamic, so the layout renders it
 * inside `<Suspense>` with `HeaderSkeleton` below as the fallback. The skeleton
 * is the same height as the real header, so nothing shifts when it swaps in.
 */

const SHELL =
  'sticky top-0 z-30 border-b border-outline-variant/60 bg-surface/90 backdrop-blur';
const INNER =
  'page-gutter mx-auto flex h-16 w-full max-w-[var(--container-wide)] items-center gap-3';

export async function SiteHeader({ locale }: { locale: Locale }) {
  const gloss = await getGloss(locale);
  const t = getTranslator(locale);

  const navLabels: Record<string, string> = {
    navPrimary: t('primaryNavigation'),
    ...Object.fromEntries(NAV_ITEMS.map((item) => [item.key, t(item.labelKey)])),
  };

  return (
    <header className={SHELL}>
      <div className={INNER}>
        <Link
          href={localeHref(locale)}
          // The logo image is decorative and the wordmark is hidden below lg,
          // so without this the link has no accessible name on a phone.
          aria-label="Erfan Academy"
          className="flex shrink-0 items-center gap-2.5 no-underline"
        >
          {/* The logo is never mirrored in RTL. */}
          <Image
            src="/brand/logo.png"
            alt=""
            width={36}
            height={36}
            priority
            className="rounded-[var(--radius-logo)]"
          />
          {/*
            The wordmark appears only from lg up. At md the five destination
            links plus the three controls already fill the bar, and adding it
            pushed the header past the viewport at exactly 768px.
          */}
          <span className="text-on-surface hidden text-[length:var(--text-h4)] font-bold lg:inline">
            Erfan Academy
          </span>
        </Link>

        <div className="ms-auto flex min-w-0 items-center gap-1">
          <MainNav locale={locale} labels={navLabels} />

          <Link
            href={localeHref(locale, '/search')}
            aria-label={t('search')}
            title={t('search')}
            className="text-on-surface-variant hover:bg-surface-3 hover:text-on-surface inline-flex size-11 items-center justify-center rounded-[var(--radius-button)] no-underline transition-colors duration-[var(--duration-fast)]"
          >
            <IconSearch className="size-5" />
          </Link>

          <LocaleSwitcher
            locale={locale}
            gloss={gloss}
            labels={{
              interfaceLanguage: t('languageSelectionTitle'),
              meaningLanguage: t('sectionTranslationLanguage'),
            }}
          />

          <ThemeToggle labels={{ lightMode: t('lightMode'), darkMode: t('darkMode') }} />
        </div>
      </div>
    </header>
  );
}

/** Same height and shape as the real header, so the swap causes no shift. */
export function HeaderSkeleton() {
  return (
    <div className={SHELL}>
      <div className={INNER}>
        <div className="bg-surface-4 size-9 animate-pulse rounded-[var(--radius-logo)]" />
        <div className="bg-surface-4 ms-auto h-8 w-40 animate-pulse rounded-[var(--radius-button)]" />
      </div>
    </div>
  );
}
