/**
 * Import the Flutter app's approved translations into the web message catalog.
 *
 * The app ships 1,031 message keys in each of app_en.arb, app_fa.arb and
 * app_ckb.arb, already reviewed in Persian and Sorani Kurdish. The brief is
 * explicit that we must not invent Persian or Kurdish copy for anything the app
 * already names, so this script is the only way strings enter the website.
 *
 * Re-run it whenever the app's strings change:
 *   pnpm i18n:import [path-to-ielts_vocab_app]
 *
 * The app source is read-only. This script only reads from it.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DEFAULT_APP_PATH = 'C:\\Users\\Kwestan\\Ielts essential words\\ielts_vocab_app';
const LOCALES = ['en', 'fa', 'ckb'] as const;
const OUT_DIR = resolve(process.cwd(), 'src/lib/i18n/messages');

type Arb = Record<string, unknown>;

function readArb(appPath: string, locale: string): Arb {
  const file = join(appPath, 'lib', 'l10n', `app_${locale}.arb`);
  if (!existsSync(file)) {
    throw new Error(
      `Missing ${file}\n` +
        `Pass the app folder as an argument: pnpm i18n:import "<path to ielts_vocab_app>"`
    );
  }
  return JSON.parse(readFileSync(file, 'utf8')) as Arb;
}

/** ARB keys starting with `@` are metadata (descriptions, placeholder types). */
function messagesOnly(arb: Arb): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(arb)) {
    if (key.startsWith('@')) continue;
    if (typeof value !== 'string') continue;
    out[key] = value;
  }
  return out;
}

function main() {
  const appPath = process.argv[2] ?? DEFAULT_APP_PATH;
  console.log(`Reading .arb files from: ${appPath}`);

  const catalogs = Object.fromEntries(
    LOCALES.map((l) => [l, messagesOnly(readArb(appPath, l))])
  ) as Record<(typeof LOCALES)[number], Record<string, string>>;

  const enKeys = Object.keys(catalogs.en);
  let problems = 0;

  for (const locale of LOCALES) {
    const keys = Object.keys(catalogs[locale]);
    const missing = enKeys.filter((k) => !(k in catalogs[locale]));
    const empty = keys.filter((k) => !catalogs[locale][k]?.trim());

    console.log(
      `  ${locale}: ${keys.length} keys` +
        (missing.length ? `, ${missing.length} MISSING` : '') +
        (empty.length ? `, ${empty.length} empty` : '')
    );
    if (missing.length) {
      problems += missing.length;
      console.log(`    missing: ${missing.slice(0, 10).join(', ')}`);
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  for (const locale of LOCALES) {
    const sorted = Object.fromEntries(
      Object.entries(catalogs[locale]).sort(([a], [b]) => a.localeCompare(b))
    );
    writeFileSync(
      join(OUT_DIR, `${locale}.json`),
      JSON.stringify(sorted, null, 2) + '\n',
      'utf8'
    );
  }

  console.log(`Wrote ${LOCALES.length} catalogs to ${OUT_DIR}`);
  if (problems > 0) {
    console.error(`\n${problems} missing translations. Fix them in the app, not here.`);
    process.exit(1);
  }
}

main();
