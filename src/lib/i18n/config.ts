/**
 * Locales and content languages.
 *
 * The app keeps these as two separate settings and so do we — see
 * docs/app-inventory.md §2. The UI locale is en/fa/ckb. The *content* language
 * (the gloss shown under an English word) is only fa or ckb, because the API
 * has no English gloss: English is the source language.
 */

export const LOCALES = ['en', 'fa', 'ckb'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Persian and Sorani Kurdish are both right-to-left. */
export function dirOf(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'en' ? 'ltr' : 'rtl';
}

/** `lang` attribute. `ckb` is the correct ISO code for Central Kurdish. */
export function htmlLang(locale: Locale): string {
  return locale;
}

/**
 * Content gloss languages. Mirrors the app's `TranslationLang` enum, which has
 * exactly two members: fa and kur. There is deliberately no 'en'.
 */
export const GLOSS_LANGS = ['fa', 'ckb'] as const;
export type GlossLang = (typeof GLOSS_LANGS)[number];

export function isGlossLang(value: string): value is GlossLang {
  return (GLOSS_LANGS as readonly string[]).includes(value);
}

/**
 * Which gloss a locale implies when the reader has not chosen one.
 * A Kurdish interface defaults to Kurdish meanings; English and Persian
 * interfaces default to Persian, matching the app's own default.
 */
export function defaultGlossFor(locale: Locale): GlossLang {
  return locale === 'ckb' ? 'ckb' : 'fa';
}

export const GLOSS_COOKIE = 'erfan_gloss';
export const THEME_COOKIE = 'erfan_theme';

/** Locale names, written in their own language. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  fa: 'فارسی',
  ckb: 'کوردی (سۆرانی)',
};

export const GLOSS_LABELS: Record<GlossLang, string> = {
  fa: 'فارسی',
  ckb: 'کوردی',
};

/**
 * Locale used for number and date formatting.
 *
 * ui-ux-spec.md §3 requires Persian/Arabic-Indic digits for fa and ckb display
 * text. `fa` gives Persian digits (۱۲۳); `ckb-IQ` with the arab numbering system
 * gives the Arabic-Indic forms used in Sorani. Anything copied or compared —
 * ids, version numbers, scores — must use `formatPlain` instead.
 */
export const NUMBER_LOCALE: Record<Locale, string> = {
  en: 'en-US',
  fa: 'fa-IR',
  ckb: 'ckb-IQ-u-nu-arab',
};
