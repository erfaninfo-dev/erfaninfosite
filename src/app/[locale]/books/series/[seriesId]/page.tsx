import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { IconArrowBack, IconBook, IconPdf } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import {
  cambridgeVolumeNumber,
  compareSeriesVolumes,
  type Book,
} from '@/lib/api/normalize';
import { getBookPdfs, getBooks, getUnits } from '@/lib/api/queries';
import {
  getExtraLiveCambridgeVolumes,
  getLiveCambridgeManifestCounts,
} from '@/lib/cambridge/api';
import { cn } from '@/lib/cn';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

async function seriesVolumes(seriesId: number): Promise<Book[]> {
  const books = await getBooks();
  const sorted = books
    .filter((book) => book.seriesId === seriesId)
    .slice()
    .sort(compareSeriesVolumes);

  // Deduplicate legacy duplicate Cambridge rows (e.g. duplicate 17/18 at bottom of series).
  const seenCamVols = new Set<number>();
  return sorted.filter((book) => {
    const vol = cambridgeVolumeNumber(book);
    if (vol === null) return true;
    if (seenCamVols.has(vol)) return false;
    seenCamVols.add(vol);
    return true;
  });
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
 * stays left-first in Persian and Kurdish. Live Cambridge IELTS volumes
 * (11–21, including volumes published directly on `cambridge_manifest.php`
 * before DB rows exist) open the interactive test hub.
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

  const existingCamVols = volumes
    .map((b) => cambridgeVolumeNumber(b))
    .filter((v): v is number => v !== null);
  const isCambridgeSeries = existingCamVols.length > 0;

  const t = getTranslator(locale);
  const [unitCounts, pdfs, liveCambridgeCounts, extraCambridge] = await Promise.all([
    Promise.all(volumes.map(async (book) => [book.id, (await getUnits(book.id)).length] as const)),
    getBookPdfs(),
    isCambridgeSeries ? getLiveCambridgeManifestCounts(existingCamVols) : Promise.resolve(new Map<number, number>()),
    isCambridgeSeries ? getExtraLiveCambridgeVolumes(existingCamVols) : Promise.resolve([]),
  ]);
  const units = new Map(unitCounts);
  const pdfCounts = new Map<number, number>();
  for (const pdf of pdfs) {
    pdfCounts.set(pdf.bookId, (pdfCounts.get(pdf.bookId) ?? 0) + 1);
  }

  const totalCount = extraCambridge.length + volumes.length;

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
        {t('seriesBooksGridHint', { count: totalCount })}
      </p>

      {/*
        Series columns: 1 below 500px, 2 from 500, 3 from 760, 4 from 1000.
        A single column is taller (2.15); every wider column is 1.48.
      */}
      <div
        dir="ltr"
        className="grid grid-cols-1 gap-3 min-[500px]:grid-cols-2 min-[760px]:grid-cols-3 min-[1000px]:grid-cols-4"
      >
        {extraCambridge.map((vol, index) => (
          <VolumeCard
            key={vol.slug}
            title={vol.title}
            href={localeHref(locale, `/books/${vol.slug}/cambridge`)}
            pdfHref={null}
            index={index}
            pill={`${vol.testsCount} tests`}
            soon={false}
            pdfLabel={t('bookStudyPdfOpen')}
            alignEnd={locale !== 'en'}
          />
        ))}
        {volumes.map((book, idx) => {
          const index = extraCambridge.length + idx;
          const unitCount = units.get(book.id) ?? 0;
          const camVol = cambridgeVolumeNumber(book);
          const camTestCount = camVol !== null ? (liveCambridgeCounts.get(camVol) ?? 0) : 0;
          const cambridge = camTestCount > 0;
          const soon = unitCount === 0 && !cambridge;
          const pill = cambridge
            ? `${camTestCount} tests`
            : soon
              ? 'Soon...'
              : t('unitCount', { count: unitCount });
          const bookHref = localeHref(locale, `/books/${book.id}`);
          const href = cambridge
            ? localeHref(locale, `/books/${book.id}/cambridge`)
            : bookHref;
          const hasPdf = (pdfCounts.get(book.id) ?? 0) > 0;

          return (
            <VolumeCard
              key={book.id}
              title={book.title}
              href={href}
              pdfHref={hasPdf && !soon ? (`${bookHref}#study-pdfs` as Route) : null}
              index={index}
              pill={pill}
              soon={soon}
              pdfLabel={t('bookStudyPdfOpen')}
              alignEnd={locale !== 'en'}
            />
          );
        })}
      </div>
    </Container>
  );
}

/** The app's five book-card hues, on the site's accent tokens. */
const VOLUME_ACCENTS = ['4', '1', '2', '6', 'error'] as const;

function VolumeCard({
  title,
  href,
  pdfHref,
  index,
  pill,
  soon,
  pdfLabel,
  alignEnd,
}: {
  title: string;
  href: Route;
  pdfHref: Route | null;
  index: number;
  pill: string;
  soon: boolean;
  pdfLabel: string;
  alignEnd: boolean;
}) {
  const accent = VOLUME_ACCENTS[index % VOLUME_ACCENTS.length] ?? '4';

  return (
    <article
      data-accent={accent}
      data-soon={soon || undefined}
      className={cn(
        'accent-card border-outline-variant/70 relative flex aspect-[2.15/1] flex-col overflow-hidden rounded-[var(--radius-card)] border p-3.5',
        'min-[500px]:aspect-[1.48/1]',
        soon && 'opacity-80'
      )}
    >
      {soon ? null : (
        <Link href={href} aria-label={title} className="absolute inset-0 z-10 rounded-[inherit]" />
      )}

      <div className="pointer-events-none relative z-0 flex items-start justify-between gap-3">
        <span className="accent-dot grid size-10 shrink-0 place-items-center rounded-full">
          {soon ? <Hourglass /> : <IconBook className="size-5" />}
        </span>
        {soon ? <span className="size-5" /> : <ArrowOut />}
      </div>

      <h2 className="text-on-surface pointer-events-none relative z-0 mt-2.5 line-clamp-2 text-base leading-[1.15] font-extrabold">
        <bdi lang="en">{title}</bdi>
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
        {pdfHref ? (
          <Link
            href={pdfHref}
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
