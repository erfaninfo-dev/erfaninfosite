import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import {
  Flashcards,
  type FlashcardData,
} from '@/components/features/flashcards/flashcards';
import { ButtonLink } from '@/components/ui/button';
import { IconArrowBack } from '@/components/ui/icons';
import { Container, PageHeader } from '@/components/ui/primitives';
import { EmptyState, Skeleton } from '@/components/ui/states';
import { glossOf } from '@/lib/api/normalize';
import { getBook, getUnitWords } from '@/lib/api/queries';
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
}: PageProps<'/[locale]/books/[bookId]/units/[unit]/flashcards'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);
  // Study tools are not useful search results; the word lists are.
  return { title: t('tabReview'), robots: { index: false } };
}

export default async function UnitFlashcardsPage({
  params,
}: PageProps<'/[locale]/books/[bookId]/units/[unit]/flashcards'>) {
  const { locale, bookId, unit } = await params;
  if (!isLocale(locale)) notFound();
  const id = parseId(bookId);
  const unitNo = parseId(unit);
  if (id === null || unitNo === null) notFound();

  const book = await getBook(id);
  if (!book) notFound();

  const t = getTranslator(locale);

  return (
    <Container size="quiz">
      <ButtonLink
        href={localeHref(locale, `/books/${id}/units/${unitNo}`)}
        variant="ghost"
        size="md"
        className="mb-5"
      >
        <IconArrowBack className="size-5" />
        {t('unitLabel', { unit: unitNo })}
      </ButtonLink>

      <PageHeader title={t('tabReview')} description={book.title} />

      <Suspense
        fallback={<Skeleton className="h-72 w-full rounded-[var(--radius-card)]" />}
      >
        <Cards bookId={id} unit={unitNo} locale={locale} />
      </Suspense>
    </Container>
  );
}

async function Cards({
  bookId,
  unit,
  locale,
}: {
  bookId: number;
  unit: number;
  locale: Locale;
}) {
  const [words, gloss] = await Promise.all([
    getUnitWords(bookId, unit),
    getGloss(locale),
  ]);
  const t = getTranslator(locale);

  // The gloss is resolved on the server, so the browser receives plain strings.
  const cards: FlashcardData[] = words
    .map((w) => ({
      id: String(w.id),
      front: w.word,
      back: glossOf(w.meaning, gloss),
      exampleEn: w.example.en,
      exampleGloss: glossOf(w.example, gloss),
    }))
    .filter((c) => c.front && c.back);

  if (cards.length === 0) {
    return (
      <EmptyState
        title={t('noMatchingWords')}
        action={
          <ButtonLink
            href={localeHref(locale, `/books/${bookId}/units/${unit}`)}
            variant="secondary"
            size="md"
          >
            {t('back')}
          </ButtonLink>
        }
      />
    );
  }

  return (
    <Flashcards
      cards={cards}
      glossLang={gloss}
      labels={{
        progress: t('wordCount', { count: cards.length }),
        reveal: t('tapCardToReveal'),
        next: t('next'),
        previous: t('previous'),
        restart: t('tryAgain'),
        finished: t('allCardsReviewed'),
        notSynced: t('progressNotSynced'),
      }}
    />
  );
}
