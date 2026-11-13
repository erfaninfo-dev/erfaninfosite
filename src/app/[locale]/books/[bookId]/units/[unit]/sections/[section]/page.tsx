import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import Link from 'next/link';

import { QuizFab } from '@/components/features/quiz/quiz-fab';
import { SampleList } from '@/components/features/vocab/sample-list';
import { StudyTabs } from '@/components/features/vocab/study-tabs';
import { VocabCards, type VocabCardData } from '@/components/features/vocab/vocab-cards';
import { IconArrowBack, IconCards } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { ListSkeleton } from '@/components/ui/states';
import { glossOf } from '@/lib/api/normalize';
import { getBook, getSectionWords, getSections, getUnitSamples, getUnits } from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';
import { getGloss } from '@/lib/request-context';

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/books/[bookId]/units/[unit]/sections/[section]'>): Promise<Metadata> {
  const { locale, bookId, unit, section } = await params;
  if (!isLocale(locale)) return {};
  const id = parseId(bookId);
  const unitNo = parseId(unit);
  const sectionNo = parseId(section);
  if (id === null || unitNo === null || sectionNo === null) return {};
  const book = await getBook(id);
  if (!book) return {};
  const t = getTranslator(locale);
  return {
    title: `${book.title} — ${t('wordsUnitSection', { unit: unitNo, section: sectionNo })}`,
    alternates: {
      canonical: `/${locale}/books/${id}/units/${unitNo}/sections/${sectionNo}`,
    },
  };
}

/**
 * One section of a unit: the step the app takes after the sections list.
 *
 * Words are this section's words, drawn as the app's word cards. A search
 * looks through the whole book by headword. Samples tagged with this section
 * sit on the first tab when the section has any. Playback is still missing.
 */
export default async function SectionPage({
  params,
}: PageProps<'/[locale]/books/[bookId]/units/[unit]/sections/[section]'>) {
  const { locale, bookId, unit, section } = await params;
  if (!isLocale(locale)) notFound();
  const id = parseId(bookId);
  const unitNo = parseId(unit);
  const sectionNo = parseId(section);
  if (id === null || unitNo === null || sectionNo === null) notFound();

  const book = await getBook(id);
  if (!book) notFound();
  const units = await getUnits(id);
  if (!units.some((item) => item.unit === unitNo)) notFound();
  const sections = await getSections(id, unitNo);
  const current = sections.find((item) => item.section === sectionNo);
  if (!current) notFound();

  const t = getTranslator(locale);

  return (
    <Container className="pb-28">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={localeHref(locale, `/books/${id}/units/${unitNo}`)}
          aria-label={t('backToUnits')}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
        <h1 className="text-on-surface min-w-0 flex-1 truncate text-lg font-extrabold">
          {t('wordsUnitSection', { unit: unitNo, section: sectionNo })}
        </h1>
        <Link
          href={localeHref(locale, `/books/${id}/units/${unitNo}/flashcards?section=${sectionNo}`)}
          aria-label={t('tooltipFlashcards')}
          className="bg-surface-1 text-primary shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconCards className="size-5" />
        </Link>
      </div>

      <Suspense fallback={<ListSkeleton rows={8} />}>
        <SectionStudy
          bookId={id}
          bookTitle={book.title}
          unit={unitNo}
          section={sectionNo}
          locale={locale}
        />
      </Suspense>
      <QuizFab
        href={localeHref(locale, `/books/${id}/quiz?units=${unitNo}&section=${sectionNo}`)}
        label={t('tooltipQuiz')}
      />
    </Container>
  );
}

async function SectionStudy({
  bookId,
  bookTitle,
  unit,
  section,
  locale,
}: {
  bookId: number;
  bookTitle: string;
  unit: number;
  section: number;
  locale: Locale;
}) {
  const [words, samples, gloss] = await Promise.all([
    getSectionWords(bookId, unit, section),
    getUnitSamples(bookId, unit, section),
    getGloss(locale),
  ]);
  const t = getTranslator(locale);
  const cards: VocabCardData[] = words
    .filter((word) => word.word)
    .map((word, index) => ({
      id: word.id,
      number: index + 1,
      word: word.word,
      type: word.type,
      important: word.important,
      meaningEn: word.meaning.en,
      gloss: glossOf(word.meaning, gloss),
      exampleEn: word.example.en,
      exampleGloss: glossOf(word.example, gloss),
      unit: word.unit,
      section: word.section,
    }));

  if (cards.length === 0 && samples.length === 0) {
    return (
      <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-center">
        {t('noWordsForSection')}
      </p>
    );
  }

  return (
    <StudyTabs
      textLabel={t('samplesTabLabel')}
      wordsLabel={t('wordsTabLabel')}
      text={
        samples.length > 0 ? (
          <SampleList
            samples={samples}
            locale={locale}
            heading=""
            bookId={bookId}
            unit={unit}
            bookTitle={bookTitle}
          />
        ) : null
      }
      words={
        cards.length > 0 ? (
          <VocabCards
            cards={cards}
            bookId={bookId}
            bookTitle={bookTitle}
            locale={locale}
            glossLang={gloss}
            labels={{
              search: t('searchWordWholeBook'),
              empty: t('noMatchingWords'),
              clear: t('close'),
              example: t('wordExample'),
              important: t('important'),
              favorite: t('favorite'),
              pronounceWord: t('pronounceWord'),
              pronounceExample: t('pronounceExample'),
            }}
          />
        ) : null
      }
    />
  );
}
