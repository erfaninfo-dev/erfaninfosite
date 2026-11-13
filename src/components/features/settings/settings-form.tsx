'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { applyTheme } from '@/components/layout/theme-toggle';
import { setPreferenceCookie } from '@/lib/cookies';
import { localeHref } from '@/lib/nav';
import {
  GLOSS_COOKIE,
  GLOSS_LANGS,
  type GlossLang,
  type Locale,
} from '@/lib/i18n/config';

type Theme = 'light' | 'dark' | 'system';

/**
 * Logged-out settings: interface language, gloss, and theme.
 *
 * Accounts and the daily reminder stay out. Theme "system" clears the cookie
 * so the layout script follows the device again.
 */

export function SettingsForm({
  locale,
  gloss,
  theme,
  labels,
}: {
  locale: Locale;
  gloss: GlossLang;
  theme: Theme;
  labels: {
    appLanguage: string;
    glossLanguage: string;
    appearance: string;
    account: string;
    accountNote: string;
    signIn?: string;
    youTab: string;
    download: string;
    english: string;
    persian: string;
    kurdish: string;
    glossPersian: string;
    glossKurdish: string;
    system: string;
    light: string;
    dark: string;
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [glossValue, setGlossValue] = useState(gloss);
  const [themeValue, setThemeValue] = useState(theme);

  function hrefFor(next: Locale): string {
    const rest = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '');
    return `/${next}${rest}` || `/${next}`;
  }

  function chooseGloss(next: GlossLang) {
    setGlossValue(next);
    setPreferenceCookie(GLOSS_COOKIE, next);
    startTransition(() => router.refresh());
  }

  function chooseTheme(next: Theme) {
    setThemeValue(next);
    applyTheme(next);
  }

  const languages: { id: Locale; label: string }[] = [
    { id: 'en', label: labels.english },
    { id: 'fa', label: labels.persian },
    { id: 'ckb', label: labels.kurdish },
  ];

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="text-on-surface mb-2 text-sm font-bold">{labels.appLanguage}</legend>
        <div className="jelly-card overflow-hidden rounded-[var(--radius-card)]">
          {languages.map((item) => (
            <a
              key={item.id}
              href={hrefFor(item.id)}
              hrefLang={item.id}
              lang={item.id}
              aria-current={item.id === locale ? 'true' : undefined}
              className={
                item.id === locale
                  ? 'bg-primary-container text-on-primary-container flex min-h-12 items-center px-4 font-semibold no-underline'
                  : 'text-on-surface flex min-h-12 items-center px-4 font-semibold no-underline'
              }
            >
              {item.label}
            </a>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-on-surface mb-2 text-sm font-bold">{labels.glossLanguage}</legend>
        <div className="jelly-card overflow-hidden rounded-[var(--radius-card)]">
          {GLOSS_LANGS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={glossValue === item}
              onClick={() => chooseGloss(item)}
              className={
                glossValue === item
                  ? 'bg-primary-container text-on-primary-container flex min-h-12 w-full items-center px-4 text-start font-semibold'
                  : 'text-on-surface flex min-h-12 w-full items-center px-4 text-start font-semibold'
              }
            >
              {item === 'fa' ? labels.glossPersian : labels.glossKurdish}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-on-surface mb-2 text-sm font-bold">{labels.appearance}</legend>
        <div className="jelly-card overflow-hidden rounded-[var(--radius-card)]">
          {(['system', 'light', 'dark'] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={themeValue === item}
              onClick={() => chooseTheme(item)}
              className={
                themeValue === item
                  ? 'bg-primary-container text-on-primary-container flex min-h-12 w-full items-center px-4 text-start font-semibold'
                  : 'text-on-surface flex min-h-12 w-full items-center px-4 text-start font-semibold'
              }
            >
              {item === 'system' ? labels.system : item === 'light' ? labels.light : labels.dark}
            </button>
          ))}
        </div>
      </fieldset>

      <section>
        <h2 className="text-on-surface mb-2 text-sm font-bold">{labels.account}</h2>
        {labels.accountNote ? (
          <p className="text-on-surface-variant jelly-card mb-3 rounded-[var(--radius-card)] px-4 py-4">
            {labels.accountNote}
          </p>
        ) : null}
        <Link
          href={localeHref(locale, '/you')}
          className="text-primary inline-flex min-h-11 items-center font-bold"
        >
          {labels.youTab}
        </Link>
        <Link
          href={localeHref(locale, '/download')}
          className="text-primary mt-2 inline-flex min-h-11 items-center font-bold"
        >
          {labels.download}
        </Link>
      </section>
    </div>
  );
}
