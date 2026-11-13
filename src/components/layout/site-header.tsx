import Image from 'next/image';
import Link from 'next/link';

import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { MainNav } from '@/components/layout/main-nav';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { IconSearch, IconSettings } from '@/components/ui/icons';
import { fetchAccount } from '@/lib/auth/api';
import { getAuthToken } from '@/lib/auth/session';
import type { Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { NAV_ITEMS, localeHref } from '@/lib/nav';
import { getGloss } from '@/lib/request-context';

/**
 * The site header: logo and wordmark at the start, the section pills in the
 * centre, the actions at the end.
 *
 * A real header with real links — not a Material app bar. Sticky and short, so
 * it does not eat the little vertical space a landscape phone has.
 */

const SHELL =
  'sticky top-0 z-30 border-b border-outline-variant/70 bg-surface-1/95 backdrop-blur';
const INNER =
  'page-gutter mx-auto flex h-16 w-full max-w-[var(--container-wide)] items-center gap-3';

export async function SiteHeader({ locale }: { locale: Locale }) {
  const gloss = await getGloss(locale);
  const t = getTranslator(locale);
  const token = await getAuthToken();
  let signedIn = false;
  if (token) {
    const me = await fetchAccount(token);
    signedIn = me !== 'unauthorized' && me !== 'unavailable';
  }

  const navLabels: Record<string, string> = {
    navPrimary: t('primaryNavigation'),
    ...Object.fromEntries(NAV_ITEMS.map((item) => [item.key, t(item.labelKey)])),
  };

  return (
    <header className={SHELL}>
      <div className={INNER}>
        <Link
          href={localeHref(locale)}
          // The logo image is decorative and the wordmark is hidden below sm,
          // so without this the link has no accessible name on a phone.
          aria-label="Erfan Academy"
          className="flex shrink-0 items-center gap-2.5 no-underline"
        >
          <Image
            src="/brand/logo.png"
            alt=""
            width={36}
            height={36}
            priority
            className="rounded-[var(--radius-logo)]"
          />
          {/*
            The wordmark appears only from lg. At md the section pills plus
            the controls already fill the bar.
          */}
          <span className="text-on-surface hidden text-[length:var(--text-h4)] font-bold lg:inline">
            Erfan Academy
          </span>
        </Link>

        {/* The pills sit in the middle of the bar, as the design shows. */}
        <div className="mx-auto hidden md:block">
          <MainNav locale={locale} labels={navLabels} />
        </div>

        <div className="ms-auto flex min-w-0 items-center gap-1 md:ms-0">
          <Link
            href={localeHref(locale, '/search')}
            aria-label={t('search')}
            title={t('search')}
            className="text-on-surface-variant hover:bg-surface-2 hover:text-on-surface inline-flex size-11 items-center justify-center rounded-full no-underline transition-colors duration-[var(--duration-fast)]"
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

          <Link
            href={localeHref(locale, signedIn ? '/you' : `/login?next=/${locale}/you`)}
            className="bg-primary text-on-primary ms-1 hidden min-h-10 items-center rounded-full px-4 font-semibold no-underline lg:inline-flex"
          >
            {signedIn ? t('tabYou') : t('signIn')}
          </Link>

          <Link
            href={localeHref(locale, '/settings')}
            aria-label={t('settingsLabel')}
            title={t('settingsTitle')}
            className="text-on-surface hover:bg-surface-2 hidden size-11 items-center justify-center rounded-full no-underline transition-colors duration-[var(--duration-fast)] sm:inline-flex"
          >
            <IconSettings className="size-5" />
          </Link>
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
        <div className="bg-surface-4 ms-auto h-8 w-40 animate-pulse rounded-full" />
      </div>
    </div>
  );
}
