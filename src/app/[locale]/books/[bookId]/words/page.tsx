import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { WordListSection } from '@/components/features/vocab/word-list-server';
import { Container, PageHeader } from '@/components/ui/primitives';
import { ListSkeleton } from '@/components/ui/states';
import { getBook, getBookWords } from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { getGloss } from '@/lib/request-context';

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/books/[bookId]/words'>): Promise<Metadata> {
  const { locale, bookId } = await params;
  if (!isLocale(locale)) return {};
  const id = parseId(bookId);
  if (id === null) return {};
  const book = await getBook(id);
  if (!book) return {};
  const t = getTranslator(locale);

  return {
    title: `${book.title} — ${t('allWordsChip')}`,
    alternates: { canonical: `/${locale}/books/${id}/words` },
  };
}

/**
 * Every word in a book — up to ~1,900 rows.
 *
 * The 176 KB–864 KB payload is fetched and cached on the server; what reaches
 * the browser is a flat, gloss-resolved list, rendered through a virtualiser so
 * the DOM holds only the visible window.
 */
export default async function BookWordsPage({
  params,
}: PageProps<'/[locale]/books/[bookId]/words'>) {
  const { locale, bookId } = await params;
  if (!isLocale(locale)) notFound();
  const id = parseId(bookId);
  if (id === null) notFound();

  const book = await getBook(id);
  if (!book) notFound();

  const t = getTranslator(locale);

  return (
    <Container size="wide">
      <PageHeader title={book.title} description={t('allWordsChip')} />
      <Suspense fallback={<ListSkeleton rows={10} />}>
        <AllWords bookId={id} locale={locale} />
      </Suspense>
    </Container>
  );
}

async function AllWords({ bookId, locale }: { bookId: number; locale: Locale }) {
  const [words, gloss] = await Promise.all([getBookWords(bookId), getGloss(locale)]);
  return <WordListSection words={words} locale={locale} gloss={gloss} />;
}
