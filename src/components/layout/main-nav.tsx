'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NavIcon } from '@/components/layout/nav-icon';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n/config';
import { NAV_ITEMS, isActiveSection, localeHref } from '@/lib/nav';

/**
 * Tablet and desktop navigation: the destinations as real links in the header,
 * from `md` up. No hamburger at any desktop width (ui-ux-spec.md §2.4).
 *
 * At `lg` the same list also renders as a persistent sidebar; both read the
 * active section from the pathname.
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
      <ul className="flex min-w-0 items-center gap-0.5 lg:gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActiveSection(pathname, locale, item);
          return (
            <li key={item.key}>
              <Link
                href={localeHref(locale, item.path)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-button)] px-2 py-2 lg:gap-2 lg:px-3',
                  'text-[length:var(--text-label)] font-semibold no-underline',
                  'transition-colors duration-[var(--duration-fast)]',
                  active
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-3 hover:text-on-surface'
                )}
              >
                <NavIcon name={item.icon} className="size-5" />
                <span>{labels[item.key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
