import { NUMBER_LOCALE, type Locale } from './config';

/**
 * Number formatting.
 *
 * ui-ux-spec.md §3: Persian/Arabic-Indic digits for fa and ckb *display* text,
 * Latin digits anywhere the value is copied or compared. The two functions are
 * deliberately separate so a call site has to choose.
 */

const numberFormatters = new Map<string, Intl.NumberFormat>();

function formatterFor(locale: Locale): Intl.NumberFormat {
  const tag = NUMBER_LOCALE[locale];
  let f = numberFormatters.get(tag);
  if (!f) {
    try {
      f = new Intl.NumberFormat(tag);
    } catch {
      // An unknown BCP-47 extension must never take a page down.
      f = new Intl.NumberFormat('en-US');
    }
    numberFormatters.set(tag, f);
  }
  return f;
}

/** Localised digits — for anything the reader only looks at. */
export function formatNumber(value: number, locale: Locale): string {
  return formatterFor(locale).format(value);
}

/**
 * Latin digits regardless of locale — for ids, version numbers, band scores,
 * and any value that is copied, compared or sent back to the API.
 */
export function formatPlain(value: number): string {
  return String(value);
}

/**
 * The API's timestamps are `"YYYY-MM-DD HH:MM:SS"` with no timezone and no `T`,
 * so they are **not** ISO 8601 and `new Date(...)` parses them inconsistently
 * across engines. `grammar_topics.topic_created_at` can also be the MySQL zero
 * date `"0000-00-00 00:00:00"`. Both cases are handled here rather than at
 * every call site. See docs/api-contract.md §4.
 */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('0000-00-00')) return null;

  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(trimmed);
  if (!m) return null;

  const [, y, mo, d, h, mi, s] = m;
  const date = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s)
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined, locale: Locale): string {
  const date = parseApiDate(value);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(NUMBER_LOCALE[locale], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Days since a timestamp, or null when it is missing or the zero date. */
export function daysSince(value: string | null | undefined): number | null {
  const date = parseApiDate(value);
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}
