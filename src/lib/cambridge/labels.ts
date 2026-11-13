import type { Locale } from '@/lib/i18n/config';

/**
 * Cambridge 15 copy.
 *
 * These strings live in the app's `cambridge_labels.dart`, not in the .arb
 * catalog, so they are copied here verbatim rather than rewritten.
 */

const SKILLS = ['listening', 'reading', 'writing', 'speaking'] as const;
export type CambridgeSkill = (typeof SKILLS)[number];

export function isCambridgeSkill(value: string): value is CambridgeSkill {
  return (SKILLS as readonly string[]).includes(value);
}

function pick(locale: Locale, en: string, fa: string, ckb: string): string {
  if (locale === 'fa') return fa;
  if (locale === 'ckb') return ckb;
  return en;
}

export function cambridgeLabels(locale: Locale) {
  return {
    chooseSkill: pick(locale, 'Choose a skill', 'یک مهارت را انتخاب کن', 'لێهاتوویییەک هەڵبژێرە'),
    fourTests: pick(locale, '4 tests', '۴ تست', '٤ تێست'),
    listening: pick(locale, 'Listening', 'شنیداری', 'گوێگرتن'),
    reading: pick(locale, 'Reading', 'خواندن', 'خوێندنەوە'),
    writing: pick(locale, 'Writing', 'نوشتاری', 'نووسین'),
    speaking: pick(locale, 'Speaking', 'گفتاری', 'قسەکردن'),
    listeningTime: pick(locale, 'About 30 minutes', 'حدود ۳۰ دقیقه', 'نزیکەی ٣٠ خولەک'),
    readingTime: pick(locale, 'About 60 minutes', 'حدود ۶۰ دقیقه', 'نزیکەی ٦٠ خولەک'),
    writingTime: pick(locale, 'About 60 minutes', 'حدود ۶۰ دقیقه', 'نزیکەی ٦٠ خولەک'),
    speakingTime: pick(locale, 'About 11–14 minutes', 'حدود ۱۱ تا ۱۴ دقیقه', 'نزیکەی ١١–١٤ خولەک'),
    couldNotLoad: pick(
      locale,
      'Could not load this test. Deploy the Cambridge API files, then try again.',
      'این تست بار نشد. فایل‌های API کمبریج را روی سرور بگذار و دوباره تلاش کن.',
      'ئەم تێستە بارنەبوو. فایلی APIی کەیمبریج لەسەر سێرڤەر دابنێ و دووبارە هەوڵبدە.'
    ),
  };
}

export const CAMBRIDGE_SKILLS: CambridgeSkill[] = [...SKILLS];
