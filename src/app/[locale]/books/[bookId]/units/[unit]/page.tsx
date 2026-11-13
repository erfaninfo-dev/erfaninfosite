import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { SectionList } from '@/components/features/books/section-list';
import { QuizFab } from '@/components/features/quiz/quiz-fab';
import { IdiomCards, type IdiomCardData } from '@/components/features/vocab/idiom-cards';
import { SampleList } from '@/components/features/vocab/sample-list';
import { StudyTabs } from '@/components/features/vocab/study-tabs';
import { VocabCards, type VocabCardData } from '@/components/features/vocab/vocab-cards';
import { IconArrowBack, IconCards } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { ListSkeleton } from '@/components/ui/states';
import { glossOf, IDIOMS_SPEAKING_BOOK_ID, type Word } from '@/lib/api/normalize';
import {
  getBook,
  getSections,
  getUnitSamples,
  getUnitWords,
  getUnits,
} from '@/lib/api/queries';
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
}: PageProps<'/[locale]/books/[bookId]/units/[unit]'>): Promise<Metadata> {
  const { locale, bookId, unit } = await params;
  if (!isLocale(locale)) return {};
  const id = parseId(bookId);
  const unitNo = parseId(unit);
  if (id === null || unitNo === null) return {};
  const book = await getBook(id);
  if (!book) return {};
  const t = getTranslator(locale);

  return {
    title: `${book.title} — ${t('unitLabel', { unit: unitNo })}`,
    alternates: { canonical: `/${locale}/books/${id}/units/${unitNo}` },
  };
}

export default async function UnitPage({
  params,
}: PageProps<'/[locale]/books/[bookId]/units/[unit]'>) {
  const { locale, bookId, unit } = await params;
  if (!isLocale(locale)) notFound();
  const id = parseId(bookId);
  const unitNo = parseId(unit);
  if (id === null || unitNo === null) notFound();

  const book = await getBook(id);
  if (!book) notFound();

  // A unit that is not in the book's unit list has been removed.
  const units = await getUnits(id);
  const current = units.find((u) => u.unit === unitNo);
  if (!current) notFound();

  const t = getTranslator(locale);
  const idioms = id === IDIOMS_SPEAKING_BOOK_ID;

  return (
    <Container className="pb-28">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={localeHref(locale, `/books/${id}`)}
          aria-label={t('backToUnits')}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
        <h1 className="text-on-surface min-w-0 flex-1 truncate text-lg font-extrabold">
          {idioms && current.details ? (
            <bdi lang="en">{current.details}</bdi>
          ) : (
            t('unitLabel', { unit: unitNo })
          )}
        </h1>
        <Link
          href={localeHref(locale, `/books/${id}/units/${unitNo}/flashcards`)}
          aria-label={t('tooltipFlashcards')}
          className="bg-surface-1 text-primary shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconCards className="size-5" />
        </Link>
      </div>
      {current.details && !idioms ? (
        <p className="text-on-surface-variant mb-4 text-sm">
          <bdi lang="en">{current.details}</bdi>
        </p>
      ) : null}

      <Suspense fallback={<ListSkeleton rows={6} />}>
        <UnitBody
          bookId={id}
          bookTitle={book.title}
          unit={unitNo}
          locale={locale}
          topic={current.details}
          idioms={idioms}
        />
      </Suspense>
      <QuizFab
        href={localeHref(locale, `/books/${id}/quiz?units=${unitNo}`)}
        label={t('tooltipQuiz')}
      />
    </Container>
  );
}

/**
 * A unit with sections is the section list. A unit without sections is the
 * word screen, with the sample text as the first tab when the unit has one.
 */
function toCards(words: Word[], gloss: 'fa' | 'ckb'): VocabCardData[] {
  return words
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
}

async function UnitBody({
  bookId,
  bookTitle,
  unit,
  locale,
  topic,
  idioms,
}: {
  bookId: number;
  bookTitle: string;
  unit: number;
  locale: Locale;
  topic: string;
  idioms: boolean;
}) {
  const sections = await getSections(bookId, unit);
  const t = getTranslator(locale);

  if (idioms) {
    const [words, gloss] = await Promise.all([getUnitWords(bookId, unit), getGloss(locale)]);
    const cards: IdiomCardData[] = words
      .filter((word) => word.word)
      .map((word, index) => ({
        id: word.id,
        number: index + 1,
        word: word.word,
        meaningEn: word.meaning.en,
        gloss: glossOf(word.meaning, gloss),
        exampleEn: word.example.en,
        exampleGloss: glossOf(word.example, gloss),
        topic: topic ? `${topic} Idioms` : '',
      }));
    if (cards.length === 0) {
      return (
        <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-center">
          {t('noMatchingWords')}
        </p>
      );
    }
    return (
      <IdiomCards
        cards={cards}
        locale={locale}
        glossLang={gloss}
        labels={{
          search: t('searchWordWholeBook'),
          empty: t('noMatchingWords'),
          clear: t('close'),
          example: t('wordExample'),
          favorite: t('favorite'),
          important: t('important'),
          pronounceWord: t('pronounceWord'),
          pronounceExample: t('pronounceExample'),
        }}
      />
    );
  }

  if (sections.length > 0) {
    return <SectionList bookId={bookId} unit={unit} sections={sections} locale={locale} t={t} />;
  }

  const [words, samples, gloss] = await Promise.all([
    getUnitWords(bookId, unit),
    getUnitSamples(bookId, unit),
    getGloss(locale),
  ]);

  if (words.length === 0 && samples.length === 0) {
    return (
      <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-center">
        {t('noMatchingWords')}
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
        words.length > 0 ? (
          <VocabCards
            cards={toCards(words, gloss)}
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
