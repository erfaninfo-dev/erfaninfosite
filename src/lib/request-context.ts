import 'server-only';

import { cookies } from 'next/headers';

import {
  GLOSS_COOKIE,
  THEME_COOKIE,
  defaultGlossFor,
  isGlossLang,
  type GlossLang,
  type Locale,
} from '@/lib/i18n/config';

export type Theme = 'light' | 'dark' | 'system';

/**
 * Reader preferences that live in cookies rather than the URL.
 *
 * These are read outside cached scopes and passed into them as arguments,
 * which is the pattern `use cache` requires — a cached function cannot read
 * cookies, and a per-reader value must never become part of a shared cache
 * entry anyway.
 */

/**
 * Which language the glosses are shown in.
 *
 * Separate from the UI locale because the app treats them separately: the
 * content languages are fa and ckb only, since English is the source language
 * rather than a translation. See docs/app-inventory.md §2.
 */
export async function getGloss(locale: Locale): Promise<GlossLang> {
  const store = await cookies();
  const value = store.get(GLOSS_COOKIE)?.value;
  if (value && isGlossLang(value)) return value;
  return defaultGlossFor(locale);
}

export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return value === 'light' || value === 'dark' ? value : 'system';
}
