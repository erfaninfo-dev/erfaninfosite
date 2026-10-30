import 'server-only';

import { cache } from 'react';
import IntlMessageFormat from 'intl-messageformat';

import { DEFAULT_LOCALE, NUMBER_LOCALE, type Locale } from './config';

import en from './messages/en.json';
import fa from './messages/fa.json';
import ckb from './messages/ckb.json';
import extras from './web-extras.json';

/**
 * Messages come from two places, in this order of authority:
 *
 *  1. `./messages/*.json` — generated from the Flutter app's .arb files by
 *     `pnpm i18n:import`. Never hand-edited: a change belongs in the app, where
 *     the Persian and Kurdish wording is reviewed, and is then re-imported.
 *  2. `./web-extras.json` — the handful of concepts a website has and the app
 *     does not (a skip link, a 404 page, "view all"). Kept separate so the new
 *     Persian and Kurdish copy is reviewable in one place.
 *
 * The app's wording always wins: an extras key that collides with an imported
 * one is ignored, so re-importing can never be silently overridden here.
 */
type ExtraEntry = { en: string; fa: string; ckb: string };

function buildCatalog(locale: Locale, base: Record<string, string>) {
  const out: Record<string, string> = { ...base };
  for (const [key, value] of Object.entries(extras)) {
    if (key.startsWith('_')) continue; // the README block
    if (key in base) continue; // the app's wording wins
    out[key] = (value as ExtraEntry)[locale];
  }
  return out;
}

const CATALOGS: Record<Locale, Record<string, string>> = {
  en: buildCatalog('en', en),
  fa: buildCatalog('fa', fa),
  ckb: buildCatalog('ckb', ckb),
};

type ExtraKey = Exclude<keyof typeof extras, '_README'>;
export type MessageKey = keyof typeof en | ExtraKey;
export type MessageValues = Record<string, string | number | Date>;

/**
 * 111 of the app's strings carry ICU placeholders, including plurals like
 * `{count, plural, =1{1 topic} other{{count} topics}}`, so messages are
 * compiled with intl-messageformat rather than interpolated by hand.
 * Compiled formatters are memoised per render pass.
 */
const formatterCache = new Map<string, IntlMessageFormat>();

/**
 * Localised digits in display text.
 *
 * ICU substitutes a bare `{count}` as raw ASCII digits; only `{count, number}`
 * (or `#`) runs it through the locale's number format. The app's .arb strings
 * use the bare form, and Flutter's generated code interpolates the int
 * directly, so **the app shows Latin digits even in Persian and Kurdish**.
 *
 * ui-ux-spec.md §3 requires Persian/Arabic-Indic digits for fa and ckb display
 * text and says to decide this deliberately and document it. The decision is to
 * follow the spec: better typography for those readers, and a visible
 * improvement on the app rather than a divergence that costs anything.
 *
 * This rewrites a bare `{name}` to `{name, number}` when the value supplied for
 * it is a number. A plural header like `{count, plural, …}` already contains a
 * comma, so it is left alone and plural selection still works; values passed as
 * strings — version numbers, band scores, ids, anything copied or compared —
 * are never touched, which is why `formatPlain` exists.
 */
function withNumberFormatting(message: string, values: MessageValues): string {
  const numeric = new Set(
    Object.entries(values)
      .filter(([, v]) => typeof v === 'number')
      .map(([k]) => k)
  );
  if (numeric.size === 0) return message;

  return message.replace(/\{\s*([A-Za-z0-9_]+)\s*\}/g, (match, name: string) =>
    numeric.has(name) ? `{${name}, number}` : match
  );
}

function formatMessage(
  locale: Locale,
  key: string,
  message: string,
  values?: MessageValues
): string {
  if (!values) return message;

  const cacheKey = `${locale}|${key}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    try {
      formatter = new IntlMessageFormat(
        withNumberFormatting(message, values),
        // The formatting tag, never the bare locale — see NUMBER_LOCALE.
        NUMBER_LOCALE[locale]
      );
      formatterCache.set(cacheKey, formatter);
    } catch {
      // A malformed ICU pattern should degrade to the raw string, never crash
      // a page. The import script is where bad patterns get caught.
      return message;
    }
  }

  try {
    const out = formatter.format(values);
    return typeof out === 'string' ? out : String(out);
  } catch {
    return message;
  }
}

export type Translator = (key: MessageKey, values?: MessageValues) => string;

/**
 * Returns the translator for a locale. Missing keys fall back to English and
 * then to the key itself, so a gap shows up as a visible token in the UI rather
 * than an empty space or a crash.
 */
export const getTranslator = cache((locale: Locale): Translator => {
  const catalog = CATALOGS[locale];
  const fallback = CATALOGS[DEFAULT_LOCALE];

  return (key, values) => {
    const message = catalog[key as string] ?? fallback[key as string];
    if (message === undefined) return key as string;
    if (!message.trim()) return fallback[key as string] ?? (key as string);
    return formatMessage(locale, key as string, message, values);
  };
});

/**
 * The raw, unformatted message for a key.
 *
 * Client Components cannot receive functions as props, so a label whose values
 * are only known in the browser — "Question 3 / 10" — is handed over as the raw
 * ICU string and formatted there with `formatClient`. Everything else is
 * formatted on the server and passed as a finished string.
 */
export const getRawMessage = cache((locale: Locale) => {
  const catalog = CATALOGS[locale];
  const fallback = CATALOGS[DEFAULT_LOCALE];
  return (key: MessageKey): string =>
    catalog[key as string] ?? fallback[key as string] ?? (key as string);
});

/**
 * The subset of messages handed to Client Components. Client bundles get only
 * the keys they need — shipping all 1,031 strings to the browser would be
 * roughly 60–80 KB of JSON per locale for no reason.
 */
export function pickMessages(
  locale: Locale,
  keys: readonly MessageKey[]
): Record<string, string> {
  const catalog = CATALOGS[locale];
  const fallback = CATALOGS[DEFAULT_LOCALE];
  const out: Record<string, string> = {};
  for (const key of keys) {
    const k = key as string;
    out[k] = catalog[k] ?? fallback[k] ?? k;
  }
  return out;
}
