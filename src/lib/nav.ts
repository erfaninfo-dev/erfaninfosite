import type { Route } from 'next';

import type { MessageKey } from '@/lib/i18n/messages';
import type { Locale } from '@/lib/i18n/config';

/**
 * The site's primary destinations.
 *
 * The app's bottom bar is Home / Grammar / Play / You / Settings. `You` and
 * `Settings` are account screens, and Phase 1 has no accounts (decision D2), so
 * the web carries the five things a logged-out visitor can actually do. The
 * shape — a five-item bar on the phone — is kept, which is what makes the IA
 * recognisable. See docs/design-tokens.md §8 item 5.
 */

export type NavItem = {
  key: string;
  path: string;
  labelKey: MessageKey;
  icon: 'home' | 'book' | 'grammar' | 'speaking' | 'play';
};

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'home', path: '', labelKey: 'tabHome', icon: 'home' },
  { key: 'books', path: '/books', labelKey: 'tabVocabulary', icon: 'book' },
  { key: 'grammar', path: '/grammar', labelKey: 'tabGrammar', icon: 'grammar' },
  // The app has no standalone "Speaking" string — speaking is not a tab there —
  // so this uses its approved full title rather than inventing a short Persian
  // or Kurdish word for it. The bottom bar lets it wrap to two lines.
  { key: 'speaking', path: '/speaking', labelKey: 'speakingPart1Title', icon: 'speaking' },
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
 * Home matches only exactly; the others match their subtree.
 */
export function isActiveSection(pathname: string, locale: Locale, item: NavItem): boolean {
  const base = `/${locale}`;
  if (item.path === '') return pathname === base || pathname === `${base}/`;
  return pathname === `${base}${item.path}` || pathname.startsWith(`${base}${item.path}/`);
}
