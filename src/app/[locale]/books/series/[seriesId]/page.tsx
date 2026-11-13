import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { IconArrowBack, IconBook, IconPdf } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import {
  compareSeriesVolumes,
  isCambridgeVolume15,
  type Book,
} from '@/lib/api/normalize';
import { getBookPdfs, getBooks, getUnits } from '@/lib/api/queries';
import { cn } from '@/lib/cn';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

async function seriesVolumes(seriesId: number): Promise<Book[]> {
  const books = await getBooks();
  return books.filter((book) => book.seriesId === seriesId).slice().sort(compareSeriesVolumes);
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/books/series/[seriesId]'>): Promise<Metadata> {
  const { locale, seriesId } = await params;
  if (!isLocale(locale)) return {};
  const id = parseId(seriesId);
  if (id === null) return {};
  const volumes = await seriesVolumes(id);
  const title = volumes[0]?.seriesTitle;
  if (!title) return {};
  return { title, alternates: { canonical: `/${locale}/books/series/${id}` } };
}

/**
 * One series, the screen the app opens from a series card on Home.
 *
 * The grid is left-to-right at the app's series breakpoints, so volume order
 * stays left-first in Persian and Kurdish. A volume with no units is "Soon"
 * and cannot be opened, except Cambridge 15, which stays tappable.
 */
export default async function SeriesPage({
  params,
}: PageProps<'/[locale]/books/series/[seriesId]'>) {
  const { locale, seriesId } = await params;
  if (!isLocale(locale)) notFound();
  const id = parseId(seriesId);
  if (id === null) notFound();

  const volumes = await seriesVolumes(id);
  const title = volumes[0]?.seriesTitle;
  if (!title) notFound();

  const t = getTranslator(locale);
  const [unitCounts, pdfs] = await Promise.all([
    Promise.all(volumes.map(async (book) => [book.id, (await getUnits(book.id)).length] as const)),
    getBookPdfs(),
  ]);
  const units = new Map(unitCounts);
  const pdfCounts = new Map<number, number>();
  for (const pdf of pdfs) {
    pdfCounts.set(pdf.bookId, (pdfCounts.get(pdf.bookId) ?? 0) + 1);
  }

  return (
    <Container>
      <div className="mb-3 flex items-center gap-2">
        <Link
          href={localeHref(locale)}
          aria-label={t('backToBooks')}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
        <h1 className="text-on-surface truncate text-lg font-extrabold">
          <bdi lang="en">{title}</bdi>
        </h1>
      </div>

      <p className="text-on-surface-variant mb-3 text-sm">
        {t('seriesBooksGridHint', { count: volumes.length })}
      </p>

      {/*
        Series columns: 1 below 500px, 2 from 500, 3 from 760, 4 from 1000.
        A single column is taller (2.15); every wider column is 1.48.
      */}
      <div
        dir="ltr"
        className="grid grid-cols-1 gap-3 min-[500px]:grid-cols-2 min-[760px]:grid-cols-3 min-[1000px]:grid-cols-4"
      >
        {volumes.map((book, index) => (
          <VolumeCard
            key={book.id}
            book={book}
            locale={locale}
            index={index}
            unitCount={units.get(book.id) ?? 0}
            unitCountLabel={t('unitCount', { count: units.get(book.id) ?? 0 })}
            pdfLabel={t('bookStudyPdfOpen')}
            hasPdf={(pdfCounts.get(book.id) ?? 0) > 0}
            alignEnd={locale !== 'en'}
          />
        ))}
      </div>
    </Container>
  );
}

/** The app's five book-card hues, on the site's accent tokens. */
const VOLUME_ACCENTS = ['4', '1', '2', '6', 'error'] as const;

function VolumeCard({
  book,
  locale,
  index,
  unitCount,
  unitCountLabel,
  pdfLabel,
  hasPdf,
  alignEnd,
}: {
  book: Book;
  locale: Locale;
  index: number;
  unitCount: number;
  unitCountLabel: string;
  pdfLabel: string;
  hasPdf: boolean;
  alignEnd: boolean;
}) {
  const cambridge = isCambridgeVolume15(book);
  const soon = unitCount === 0 && !cambridge;
  const accent = VOLUME_ACCENTS[index % VOLUME_ACCENTS.length] ?? '4';
  const pill = cambridge ? '4 tests' : soon ? 'Soon...' : unitCountLabel;
  const bookHref = localeHref(locale, `/books/${book.id}`);
  const href = cambridge
    ? localeHref(locale, `/books/${book.id}/cambridge`)
    : bookHref;

  return (
    <article
      data-accent={accent}
      aria-disabled={soon || undefined}
      className={cn(
        'accent-card border-outline-variant/70 relative flex aspect-[2.15/1] flex-col overflow-hidden rounded-[var(--radius-card)] border p-3.5',
        'min-[500px]:aspect-[1.48/1]',
        soon && 'opacity-80'
      )}
    >
      {soon ? null : (
        <Link href={href} aria-label={book.title} className="absolute inset-0 z-10 rounded-[inherit]" />
      )}

      <div className="pointer-events-none relative z-0 flex items-start justify-between gap-3">
        <span className="accent-dot grid size-10 shrink-0 place-items-center rounded-full">
          {soon ? <Hourglass /> : <IconBook className="size-5" />}
        </span>
        {soon ? <span className="size-5" /> : <ArrowOut />}
      </div>

      <h2 className="text-on-surface pointer-events-none relative z-0 mt-2.5 line-clamp-2 text-base leading-[1.15] font-extrabold">
        <bdi lang="en">{book.title}</bdi>
      </h2>
      {soon ? (
        <p className="text-on-surface-variant pointer-events-none relative z-0 mt-1 truncate text-xs font-bold">
          New lessons are coming soon
        </p>
      ) : null}

      <div className={cn('relative z-20 mt-auto flex items-center gap-2 pt-2', alignEnd && 'justify-end')}>
        <span
          className={cn(
            'pointer-events-none inline-flex w-fit items-center gap-1.5 rounded-xl px-3 py-1.5',
            'text-xs font-semibold',
            soon ? 'accent-dot-text' : 'bg-surface-1/80 text-on-surface-variant'
          )}
        >
          {pill}
        </span>
        {hasPdf && !soon ? (
          <Link
            href={`${bookHref}#study-pdfs`}
            className="text-[var(--accent)] relative inline-flex min-h-8 items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--accent)_45%,transparent)] px-2.5 text-xs font-bold"
          >
            <IconPdf className="size-4" />
            {pdfLabel}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function Hourglass() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M7 4h10M7 20h10M8 4c0 4 8 4 8 8s-8 4-8 8M16 4c0 4-8 4-8 8s8 4 8 8" />
    </svg>
  );
}

function ArrowOut() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="text-on-surface-variant size-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}
