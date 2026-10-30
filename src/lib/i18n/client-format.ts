'use client';

import IntlMessageFormat from 'intl-messageformat';

/**
 * ICU formatting in the browser.
 *
 * Most labels are resolved on the server and handed to Client Components as
 * plain strings. A few cannot be: a quiz's "Question 3 / 10" depends on state
 * that only exists in the browser. Functions cannot cross the server/client
 * boundary, so those components receive the raw ICU message instead and format
 * it here.
 *
 * This uses the same library as the server, so a message with a plural — and
 * 111 of the app's strings carry ICU syntax — formats identically in both
 * places, rather than being approximated by string replacement.
 */

const cache = new Map<string, IntlMessageFormat>();

/**
 * Same digit rule as the server: a bare `{name}` whose value is a number
 * becomes `{name, number}`, so fa and ckb get Persian/Arabic-Indic digits.
 * Plural headers already carry a comma and are left alone. See the long note in
 * messages.ts.
 */
function withNumberFormatting(
  message: string,
  values: Record<string, string | number>
): string {
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

export function formatClient(
  message: string,
  locale: string,
  values?: Record<string, string | number>
): string {
  if (!values) return message;

  const key = `${locale}|${message}`;
  let formatter = cache.get(key);
  if (!formatter) {
    try {
      formatter = new IntlMessageFormat(withNumberFormatting(message, values), locale);
      cache.set(key, formatter);
    } catch {
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
