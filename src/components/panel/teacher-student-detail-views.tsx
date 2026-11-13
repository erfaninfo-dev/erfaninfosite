import type { Route } from 'next';
import Link from 'next/link';

import type {
  ClassScheduleSlot,
  GrammarResultRow,
  StudentClassSessions,
  VocabQuizResultRow,
} from '@/lib/auth/panel-types';
import { ClassSessionsView } from '@/components/panel/class-sessions-view';
import { WeeklyScheduleList } from '@/components/panel/weekly-schedule-list';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

function formatWhen(raw: string, locale: Locale) {
  const d = Date.parse(raw);
  if (!Number.isFinite(d)) return raw;
  return new Intl.DateTimeFormat(NUMBER_LOCALE[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(d));
}

export function TeacherStudentVocabList({
  locale,
  rows,
}: {
  locale: Locale;
  rows: VocabQuizResultRow[];
}) {
  const t = getTranslator(locale);
  const numbers = new Intl.NumberFormat(NUMBER_LOCALE[locale]);

  if (rows.length === 0) {
    return <p className="text-on-surface-variant font-semibold">{t('teacherNoResults')}</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const title = r.quizName?.trim() || r.bookTitle?.trim() || `Book ${r.bookId}`;
        const unitsLine =
          r.units.length > 0
            ? t('vocabQuizHistoryUnitsLine', { units: r.units.map((u) => numbers.format(u)).join(', ') })
            : null;
        return (
          <li key={r.id} className="jelly-card rounded-[var(--radius-card)] px-4 py-3">
            <p className="text-on-surface font-extrabold">{title}</p>
            {unitsLine ? (
              <p className="text-on-surface-variant mt-1 text-sm">{unitsLine}</p>
            ) : null}
            <p className="text-primary mt-2 text-sm font-extrabold">
              {t('vocabQuizCorrectWrongLine', {
                correct: numbers.format(r.correct),
                wrong: numbers.format(r.wrong),
              })}
            </p>
            {r.createdAt ? (
              <p className="text-on-surface-variant mt-2 text-end text-xs" dir="ltr">
                {formatWhen(r.createdAt, locale)}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function TeacherStudentGrammarList({
  locale,
  rows,
}: {
  locale: Locale;
  rows: GrammarResultRow[];
}) {
  const t = getTranslator(locale);
  const numbers = new Intl.NumberFormat(NUMBER_LOCALE[locale]);

  if (rows.length === 0) {
    return <p className="text-on-surface-variant font-semibold">{t('teacherNoResults')}</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const scoreLine =
          r.score != null && r.totalQuestions != null
            ? `${numbers.format(r.score)} / ${numbers.format(r.totalQuestions)}`
            : r.score != null
              ? numbers.format(r.score)
              : null;
        return (
          <li key={r.id}>
            <Link
              href={localeHref(locale, `/grammar/result/${r.id}` as Route)}
              className="jelly-card block rounded-[var(--radius-card)] px-4 py-3 no-underline"
            >
              <p className="text-on-surface font-extrabold">{r.quizName || t('tabGrammar')}</p>
              {scoreLine ? (
                <p className="text-primary mt-1 text-sm font-extrabold">{scoreLine}</p>
              ) : null}
              {r.createdAt ? (
                <p className="text-on-surface-variant mt-2 text-end text-xs" dir="ltr">
                  {formatWhen(r.createdAt, locale)}
                </p>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function TeacherStudentSessionsTab({
  locale,
  data,
}: {
  locale: Locale;
  data: StudentClassSessions;
}) {
  const t = getTranslator(locale);
  return (
    <ClassSessionsView locale={locale} data={data} empty={t('youClassSessionsEmpty')} />
  );
}

export function TeacherStudentScheduleTab({
  locale,
  slots,
}: {
  locale: Locale;
  slots: ClassScheduleSlot[];
}) {
  const t = getTranslator(locale);
  return <WeeklyScheduleList locale={locale} slots={slots} empty={t('classScheduleEmpty')} />;
}
