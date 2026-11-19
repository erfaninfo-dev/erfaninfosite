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
 * The web bottom bar matches the app when Play is on: Home, Grammar, Play, You,
 * Settings. Set [PLAY_SECTION_VISIBLE] to false to hide Play until the web
 * section is ready.
 */

/** When false, Play is omitted from nav and play routes redirect home. */
export const PLAY_SECTION_VISIBLE = true;

export type NavItem = {
  key: string;
  path: string;
  labelKey: MessageKey;
  icon: 'home' | 'grammar' | 'play' | 'you' | 'settings';
};

const ALL_NAV_ITEMS = [
  { key: 'home', path: '', labelKey: 'tabHome', icon: 'home' },
  { key: 'grammar', path: '/grammar', labelKey: 'tabGrammar', icon: 'grammar' },
  { key: 'play', path: '/play', labelKey: 'tabPlay', icon: 'play' },
  { key: 'you', path: '/you', labelKey: 'tabYou', icon: 'you' },
  { key: 'settings', path: '/settings', labelKey: 'tabSettings', icon: 'settings' },
] as const satisfies readonly NavItem[];

export const NAV_ITEMS: readonly NavItem[] = PLAY_SECTION_VISIBLE
  ? ALL_NAV_ITEMS
  : ALL_NAV_ITEMS.filter((item) => item.key !== 'play');

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

  if (item.key === 'you') {
    return (
      pathname === `${base}/you` ||
      pathname.startsWith(`${base}/you/`) ||
      pathname === `${base}/profile` ||
      pathname.startsWith(`${base}/profile/`) ||
      pathname === `${base}/stats` ||
      pathname.startsWith(`${base}/stats/`) ||
      pathname === `${base}/review` ||
      pathname.startsWith(`${base}/review/`) ||
      pathname === `${base}/student-panel` ||
      pathname.startsWith(`${base}/student-panel/`) ||
      pathname.startsWith(`${base}/admin/`) ||
      pathname.startsWith(`${base}/teacher/`)
    );
  }

  return (
    pathname === `${base}${item.path}` || pathname.startsWith(`${base}${item.path}/`)
  );
}
