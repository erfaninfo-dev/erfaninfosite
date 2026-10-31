import type { Route } from 'next';

import type { MessageKey } from '@/lib/i18n/messages';
import type { Locale } from '@/lib/i18n/config';

/**
 * The site's primary destinations — the app's own, verified by running it.
 *
 * The Flutter app's bottom bar is **Home · Grammar · Play · You · Settings**
 * (lib/features/shell/shell_scaffold.dart). Books and speaking are *not* tabs:
 * the home screen is the book browser, and "Speaking Part 1" is a card in that
 * same list. The app's onboarding says so outright — "Start from Home: pick a
 * book, open units, then browse words."
 *
 * So the web carries Home, Grammar and Play. `You` and `Settings` are account
 * screens and arrive with Phase 2; the language and theme controls that live
 * under Settings in the app are in the web header instead, where they are
 * reachable at every size.
 */

export type NavItem = {
  key: string;
  path: string;
  labelKey: MessageKey;
  icon: 'home' | 'grammar' | 'play';
};

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'home', path: '', labelKey: 'tabHome', icon: 'home' },
  { key: 'grammar', path: '/grammar', labelKey: 'tabGrammar', icon: 'grammar' },
  { key: 'play', path: '/play', labelKey: 'tabPlay', icon: 'play' },
] as const;

/**
 * Build a locale-prefixed href.
 *
 * `typedRoutes` checks literal hrefs against the real route tree, but every
 * link here is assembled at runtime from a locale and a path, which it cannot
 * verify. The cast is confined to this one function so nothing else in the app
 * has to opt out of route typing.
 */
export function localeHref(locale: Locale, path = ''): Route {
  return `/${locale}${path}` as Route;
}

/**
 * Whether a nav item is the active section for a pathname.
 *
 * Home matches exactly, and also owns the book routes — a book page is reached
 * from Home and belongs to it, the way it does in the app.
 */
export function isActiveSection(
  pathname: string,
  locale: Locale,
  item: NavItem
): boolean {
  const base = `/${locale}`;

  if (item.path === '') {
    return (
      pathname === base ||
      pathname === `${base}/` ||
      pathname.startsWith(`${base}/books/`) ||
      pathname.startsWith(`${base}/speaking`)
    );
  }

  return (
    pathname === `${base}${item.path}` || pathname.startsWith(`${base}${item.path}/`)
  );
}
