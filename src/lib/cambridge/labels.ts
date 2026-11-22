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
    testPrefix: pick(locale, 'Test', 'تست', 'تێست'),
    empty: pick(
      locale,
      'No tests are published for this skill yet.',
      'هنوز تستی برای این مهارت منتشر نشده.',
      'هێشتا تێستێک بۆ ئەم لێهاتوویییە بڵاونەکراوەتەوە.'
    ),
    start: pick(locale, 'Start', 'شروع', 'دەستپێبکە'),
    partsUnit: pick(locale, 'parts', 'بخش', 'بەش'),
    passagesUnit: pick(locale, 'passages', 'متن', 'دەق'),
    tasksUnit: pick(locale, 'tasks', 'تسک', 'ئەرک'),
    exitTest: pick(locale, 'Exit', 'خروج', 'دەرچوون'),
    practiceMode: pick(locale, 'Practice mode', 'حالت تمرین', 'دۆخی مەشق'),
    practiceModeDesc: pick(
      locale,
      'Unlimited time, Answer check, Dictionary, Translate, Highlight & Audio controls.',
      'بدون محدودیت زمان، بررسی پاسخ هر سؤال، دیکشنری، ترجمه، هایلایت و کنترل کامل صوت.',
      'بێ سنووری کات، پشکنینی وەڵام، فەرهەنگ، وەرگێڕان، هایلایت و کۆنترۆڵی تەواوی دەنگ.'
    ),
    startPracticeCta: pick(locale, 'Start (Practice mode)', 'شروع (حالت تمرین)', 'دەستپێکردن (مەشق)'),
    examMode: pick(locale, 'Exam mode', 'حالت آزمون', 'دۆخی تاقیکردنەوە'),
    examModeDesc: pick(
      locale,
      'Real IELTS exam conditions: countdown timer, restricted tools, Notes & Highlight only.',
      'شرایط واقعی آزمون آیلتس: تایمر معکوس، ابزارهای محدود، فقط یادداشت و هایلایت، بدون کلید پاسخ.',
      'مەرجی ڕاستەقینەی تاقیکردنەوەی ئایڵتس: کاتژمێری بەرەو خوار، ئامرازی سنووردار، تەنها تێبینی و هایلایت.'
    ),
    timePacingLabel: pick(locale, 'Time pacing', 'سرعت و زمان آزمون', 'خێرایی و کاتی تاقیکردنەوە'),
    startExamCta: pick(locale, 'Start (Exam mode)', 'شروع (حالت آزمون)', 'دەستپێکردن (تاقیکردنەوە)'),
    examPausedMsg: pick(
      locale,
      'Your answers have been stored. The time has been paused.',
      'پاسخ‌های شما ذخیره شده و زمان آزمون متوقف شده است.',
      'وەڵامەکانت پاشەکەوت کراون و کاتی تاقیکردنەوە وەستێنراوە.'
    ),
    saveAndQuit: pick(locale, 'Save & quit', 'ذخیره و خروج', 'پاشەکەوت و دەرچوون'),
    resumeTest: pick(locale, 'Resume test', 'ادامه آزمون', 'بەردەوامبوون'),
    switchToReview: pick(
      locale,
      'Review in Practice mode',
      'بررسی پاسخ‌ها در حالت تمرین',
      'پێداچوونەوە لە دۆخی مەشقدا'
    ),
    couldNotLoad: pick(
      locale,
      'Could not load this test. Deploy the Cambridge API files, then try again.',
      'این تست بار نشد. فایل‌های API کمبریج را روی سرور بگذار و دوباره تلاش کن.',
      'ئەم تێستە بارنەبوو. فایلی APIی کەیمبریج لەسەر سێرڤەر دابنێ و دووبارە هەوڵبدە.'
    ),
  };
}

export const CAMBRIDGE_SKILLS: CambridgeSkill[] = [...SKILLS];

export type CambridgeLabels = ReturnType<typeof cambridgeLabels>;
