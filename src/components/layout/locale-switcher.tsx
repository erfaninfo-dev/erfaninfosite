'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { IconChevron, IconGlobe } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { setPreferenceCookie } from '@/lib/cookies';
import {
  GLOSS_COOKIE,
  GLOSS_LABELS,
  GLOSS_LANGS,
  LOCALES,
  LOCALE_LABELS,
  type GlossLang,
  type Locale,
} from '@/lib/i18n/config';

/**
 * Language control: the interface locale *and* the gloss language, in one menu.
 *
 * Two settings rather than one, because the app keeps them separate: the
 * interface can be English while the meanings are still Persian or Kurdish,
 * since the API has no English gloss. See docs/app-inventory.md §2.
 *
 * It is in the header at every size, never behind a menu button, because it is
 * how a reader recovers from landing in the wrong language (ui-ux-spec.md §2.4).
 */
export function LocaleSwitcher({
  locale,
  gloss,
  labels,
}: {
  locale: Locale;
  gloss: GlossLang;
  labels: Record<string, string>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  /** Swap the locale segment, keeping the rest of the path and the query. */
  function hrefFor(next: Locale): string {
    const rest = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '');
    return `/${next}${rest}` || `/${next}`;
  }

  function chooseGloss(next: GlossLang) {
    // A year-long cookie: a reading preference, not a session value.
    setPreferenceCookie(GLOSS_COOKIE, next);
    setOpen(false);
    // Re-render the server tree so meanings switch language immediately.
    startTransition(() => router.refresh());
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        // Below lg the label is hidden and the globe is decorative, so the
        // button would otherwise be announced as just "button".
        aria-label={`${labels.interfaceLanguage}: ${LOCALE_LABELS[locale]}`}
        className={cn(
          'inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-button)] px-3 py-2',
          'text-[length:var(--text-label)] font-semibold',
          'text-on-surface-variant hover:bg-surface-3 hover:text-on-surface',
          'transition-colors duration-[var(--duration-fast)]'
        )}
      >
        <IconGlobe className="size-5" />
        {/* Label from lg up only; below that the globe icon carries it, and
            the header has no room for a second piece of text. */}
        <span className="hidden lg:inline">{LOCALE_LABELS[locale]}</span>
        <IconChevron className="size-4 rotate-90" />
      </button>

      {open ? (
        <>
          {/* Click-away. Not focusable, and Escape also closes via onKeyDown. */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
            className={cn(
              'absolute end-0 z-50 mt-2 min-w-56',
              'border-outline-variant bg-surface-1 rounded-[var(--radius-card)] border p-2',
              'dark:bg-surface-3 shadow-[var(--shadow-overlay)]'
            )}
          >
            <p className="text-on-surface-variant px-3 py-1.5 text-[length:var(--text-caption)] font-semibold">
              {labels.interfaceLanguage}
            </p>
            {LOCALES.map((l) => (
              <a
                key={l}
                role="menuitem"
                href={hrefFor(l)}
                hrefLang={l}
                lang={l}
                aria-current={l === locale ? 'true' : undefined}
                className={cn(
                  'flex min-h-11 items-center rounded-[var(--radius-sm)] px-3 py-2 no-underline',
                  l === locale
                    ? 'bg-secondary-container text-on-secondary-container font-semibold'
                    : 'text-on-surface hover:bg-surface-3'
                )}
              >
                {LOCALE_LABELS[l]}
              </a>
            ))}

            <hr className="border-outline-variant/60 my-2 border-0 border-t" />

            <p className="text-on-surface-variant px-3 py-1.5 text-[length:var(--text-caption)] font-semibold">
              {labels.meaningLanguage}
            </p>
            {GLOSS_LANGS.map((g) => (
              <button
                key={g}
                type="button"
                role="menuitemradio"
                aria-checked={g === gloss}
                lang={g}
                onClick={() => chooseGloss(g)}
                className={cn(
                  'flex min-h-11 w-full items-center rounded-[var(--radius-sm)] px-3 py-2 text-start',
                  g === gloss
                    ? 'bg-secondary-container text-on-secondary-container font-semibold'
                    : 'text-on-surface hover:bg-surface-3'
                )}
              >
                {GLOSS_LABELS[g]}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
