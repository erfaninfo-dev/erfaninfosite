'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n/config';
import { NAV_ITEMS, isActiveSection, localeHref } from '@/lib/nav';

/**
 * Tablet and desktop navigation: the destinations as a row of pills in the
 * centre of the header, from `md` up. No hamburger at any desktop width
 * (ui-ux-spec.md §2.4).
 *
 * The active section is a filled pill; the rest are plain text until hover.
 * Labels only, no icons — the icons live in the phone bottom bar, where the
 * labels have to be tiny and need the help.
 */
export function MainNav({
  locale,
  labels,
}: {
  locale: Locale;
  labels: Record<string, string>;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={labels.navPrimary ?? 'Main'} className="hidden md:block">
      <ul className="flex min-w-0 items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActiveSection(pathname, locale, item);
          return (
            <li key={item.key}>
              <Link
                href={localeHref(locale, item.path)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-full px-3 py-2 lg:px-4',
                  'text-[length:var(--text-label)] font-semibold whitespace-nowrap no-underline',
                  'transition-colors duration-[var(--duration-fast)]',
                  active
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-2 hover:text-on-surface'
                )}
              >
                {labels[item.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
