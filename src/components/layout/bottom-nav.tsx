'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NavIcon } from '@/components/layout/nav-icon';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n/config';
import { NAV_ITEMS, isActiveSection, localeHref } from '@/lib/nav';

/**
 * Phone navigation: a bottom bar, shown below `md` only.
 *
 * A bar rather than a drawer because the app uses one and this is a
 * browsing-heavy product — a drawer would hide the whole IA behind a tap. The
 * bar's height is reserved by the `pb-nav` utility on every page, so it never
 * covers the last list row or a submit button.
 *
 * It is a client component only because it needs the current pathname to mark
 * the active section; it ships no data.
 */
export function BottomNav({
  locale,
  labels,
}: {
  locale: Locale;
  labels: Record<string, string>;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={labels.navPrimary ?? 'Main'}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 md:hidden',
        'border-outline-variant/70 bg-surface-1/95 border-t backdrop-blur',
        'dark:bg-surface-2/95'
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex h-[var(--size-bottom-nav)] items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = isActiveSection(pathname, locale, item);
          return (
            // `min-w-0` matters: a flex item defaults to `min-width: auto`, so
            // without it the longest label — "Speaking Part 1", and its longer
            // Persian and Kurdish equivalents — pushes the bar wider than the
            // viewport and the whole page scrolls sideways.
            <li key={item.key} className="min-w-0 flex-1">
              <Link
                href={localeHref(locale, item.path)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full min-h-11 flex-col items-center justify-center gap-1 px-1 no-underline',
                  'transition-colors duration-[var(--duration-fast)]',
                  active ? 'text-primary' : 'text-on-surface-variant'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-14 items-center justify-center rounded-[var(--radius-button)]',
                    'transition-colors duration-[var(--duration-fast)]',
                    active && 'bg-secondary-container text-on-secondary-container'
                  )}
                >
                  <NavIcon name={item.icon} className="size-5" />
                </span>
                {/* No fixed height: a label may wrap to two lines, and
                    Persian and Kurdish labels are often longer than English. */}
                <span className="text-center text-[0.6875rem] leading-[1.15] font-semibold text-balance">
                  {labels[item.key]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
