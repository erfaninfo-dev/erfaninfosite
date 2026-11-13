import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { VocabQuiz } from '@/components/features/quiz/vocab-quiz';
import { IconArrowBack } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { getBook, getUnits } from '@/lib/api/queries';
import { isLocale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

function parseUnits(value: string | string[] | undefined): number[] {
  const raw = Array.isArray(value) ? value.join(',') : (value ?? '');
  return raw
    .split(',')
    .map((part) => Number(part))
    .filter((unit) => Number.isInteger(unit) && unit > 0);
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/books/[bookId]/quiz'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('quizTitle'), robots: { index: false } };
}

/**
 * Vocabulary quiz for one book.
 *
 * Questions are built in the browser from the book's own words. A `units`
 * query pre-selects the unit the reader opened the quiz from.
 */
export default async function BookQuizPage({
  params,
  searchParams,
}: PageProps<'/[locale]/books/[bookId]/quiz'>) {
  const [{ locale, bookId }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const id = parseId(bookId);
  if (id === null) notFound();

  const book = await getBook(id);
  if (!book) notFound();
  const units = await getUnits(id);
  if (units.length === 0) notFound();

  const t = getTranslator(locale);
  const raw = getRawMessage(locale);

  return (
    <Container size="quiz">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={localeHref(locale, `/books/${id}`)}
          aria-label={t('backToBooks')}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
        <h1 className="text-on-surface min-w-0 flex-1 truncate text-lg font-extrabold">
          {t('quizTitle')}
        </h1>
      </div>
      <p className="text-on-surface-variant mb-4 text-sm">
        <bdi lang="en">{book.title}</bdi>
      </p>
      <VocabQuiz
        bookId={id}
        locale={locale}
        initialUnits={parseUnits(query.units)}
        section={
          parseId(
            (Array.isArray(query.section) ? query.section[0] : query.section) ?? ''
          ) ?? undefined
        }
        units={units.map((unit) => ({
          unit: unit.unit,
          label: t('unitLabel', { unit: unit.unit }),
        }))}
        labels={{
          start: t('startQuiz'),
          checking: t('checkingEllipsis'),
          next: t('next'),
          score: raw('solvedOf'),
          progress: raw('questionProgress'),
          empty: t('noMatchingWords'),
          again: t('tryAgain'),
          correct: t('quizFeedbackCorrectLabel'),
          wrong: t('quizFeedbackWrongPrefix'),
        }}
      />
    </Container>
  );
}
