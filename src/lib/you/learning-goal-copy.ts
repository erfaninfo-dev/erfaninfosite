import type { Locale } from '@/lib/i18n/config';

/** Mirrors the app's `_GoalCopy` strings (not in .arb). */
export function learningGoalCopy(locale: Locale) {
  if (locale === 'fa') {
    return {
      sectionTitle: 'هدف',
      cardTitle: 'هدف تسلط زبانی',
      cardPromptSubtitle: 'بنویسید به چه چیزی می‌رسید.',
      dialogTitle: 'هدف خود را تنظیم کنید',
      dialogGoalLabel: 'هدف شما چیست؟',
      dialogGoalHint: 'مثلاً نمره ۷ آیلتس، مکالمه روان، ۵۰۰ لغت جدید',
      dialogGoalRequired: 'هدف را وارد کنید',
      dialogFieldLabel: 'روز تا تسلط',
      dialogInvalid: 'تعداد روز معتبر وارد کنید',
      dialogTooLong: 'حداکثر ۳۶۵۰ روز',
      cancel: 'انصراف',
      save: 'ذخیره',
      clear: 'پاک کردن',
      summarySubtitle: (remaining: number, total: number) =>
        `${remaining} روز مانده از ${total} روز`,
    };
  }
  return {
    sectionTitle: 'Goal',
    cardTitle: 'Language mastery goal',
    cardPromptSubtitle: "Write down what you're working towards.",
    dialogTitle: 'Set your goal',
    dialogGoalLabel: "What's your goal?",
    dialogGoalHint: 'e.g. IELTS band 7, fluent conversation, 500 new words',
    dialogGoalRequired: 'Enter your goal',
    dialogFieldLabel: 'Days until fluency',
    dialogInvalid: 'Enter a valid number of days',
    dialogTooLong: 'Choose 3650 days or fewer',
    cancel: 'Cancel',
    save: 'Save',
    clear: 'Clear',
    summarySubtitle: (remaining: number, total: number) =>
      `${remaining} days left from ${total} days`,
  };
}
