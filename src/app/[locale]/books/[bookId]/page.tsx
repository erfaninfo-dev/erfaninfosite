import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { UnitGrid } from '@/components/features/books/unit-grid';
import { QuizFab } from '@/components/features/quiz/quiz-fab';
import { Card } from '@/components/ui/card';
import { ExternalLink } from '@/components/ui/external-link';
import { IconArrowBack, IconPdf } from '@/components/ui/icons';
import { Container, SectionHeading } from '@/components/ui/primitives';
import { CardGridSkeleton } from '@/components/ui/states';
import { IDIOMS_SPEAKING_BOOK_ID } from '@/lib/api/normalize';
import { getBook, getBookPdfs, getUnits } from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

/** Route params are strings; anything not a positive integer is a 404. */
function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/books/[bookId]'>): Promise<Metadata> {
  const { locale, bookId } = await params;
  if (!isLocale(locale)) return {};
  const id = parseId(bookId);
  if (id === null) return {};

  const book = await getBook(id);
  if (!book) return {};

  const t = getTranslator(locale);
  return {
    title: `${t('unitsTitle')} · ${book.title}`,
    description: book.description || undefined,
    alternates: { canonical: `/${locale}/books/${id}` },
  };
}

/**
 * A book's units. The app bar says "Units", not the book title, and the grid
 * is the same 2 / 3 / 4 columns the app uses. Column order follows the locale;
 * only the inside of a card is left-to-right. Study PDFs stay on this page
 * because the series card's PDF button links here.
 */
export default async function BookPage({
  params,
}: PageProps<'/[locale]/books/[bookId]'>) {
  const { locale, bookId } = await params;
  if (!isLocale(locale)) notFound();
  const id = parseId(bookId);
  if (id === null) notFound();

  /*
   * This is where a deletion becomes a 404. The API answers a missing book's
   * children with `200 []` rather than a 404, so existence can only be decided
   * from the list endpoint. See docs/api-contract.md §0.
   */
  const book = await getBook(id);
  if (!book) notFound();

  const t = getTranslator(locale);
  const backHref = book.seriesId
    ? localeHref(locale, `/books/series/${book.seriesId}`)
    : localeHref(locale);

  return (
    <Container className="pb-28">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={backHref}
          aria-label={t('backToBooks')}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
        <h1 className="text-on-surface truncate text-lg font-extrabold">{t('unitsTitle')}</h1>
      </div>

      <Suspense fallback={<CardGridSkeleton count={6} />}>
        <UnitBrowser bookId={id} locale={locale} idioms={id === IDIOMS_SPEAKING_BOOK_ID} />
      </Suspense>

      <Suspense fallback={null}>
        <BookPdfs bookId={id} locale={locale} />
      </Suspense>
    </Container>
  );
}

async function UnitBrowser({
  bookId,
  locale,
  idioms,
}: {
  bookId: number;
  locale: Locale;
  idioms: boolean;
}) {
  const units = await getUnits(bookId);
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);

  return (
    <>
      <UnitGrid
        bookId={bookId}
        units={units}
        locale={locale}
        layout={idioms ? 'idioms' : 'units'}
        labels={{
          search: t('searchUnitsHint'),
          hintTemplate: raw('unitsGridHint'),
          unitLabelTemplate: raw('unitLabel'),
          tapToOpen: t('tapToOpen'),
          noMatch: t('noMatchingUnits'),
          none: t('noUnitsFound'),
          retry: t('retry'),
          clear: t('close'),
        }}
      />
      {units.length > 0 && !idioms ? (
        <QuizFab href={localeHref(locale, `/books/${bookId}/quiz`)} label={t('tooltipQuiz')} />
      ) : null}
    </>
  );
}

async function BookPdfs({ bookId, locale }: { bookId: number; locale: Locale }) {
  // book_pdfs.php takes no book_id: it returns every PDF, filtered here.
  const pdfs = await getBookPdfs(bookId);
  if (pdfs.length === 0) return null;

  const t = getTranslator(locale);

  return (
    <section id="study-pdfs" className="mt-10">
      <SectionHeading>{t('bookStudyPdfTooltip')}</SectionHeading>
      <Card className="divide-outline-variant/50 divide-y p-0">
        {pdfs.map((pdf) => (
          <ExternalLink
            key={pdf.id}
            href={pdf.url}
            className="hover:bg-surface-2 dark:hover:bg-surface-3 flex min-h-14 items-center gap-3 px-5 py-4"
          >
            <IconPdf className="text-primary size-5 shrink-0" />
            <span className="text-on-surface min-w-0 flex-1">
              <bdi lang="en">{pdf.title}</bdi>
            </span>
            <span className="text-on-surface-variant text-[length:var(--text-caption)]">
              {t('bookStudyPdfView')}
            </span>
          </ExternalLink>
        ))}
      </Card>
    </section>
  );
}
