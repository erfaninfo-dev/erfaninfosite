import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { ButtonLink } from '@/components/ui/button';
import { Card, CardGrid, CardLink } from '@/components/ui/card';
import { ExternalLink } from '@/components/ui/external-link';
import { IconChevron, IconPdf, IconSearch } from '@/components/ui/icons';
import { Badge, Container, PageHeader, SectionHeading } from '@/components/ui/primitives';
import { CardGridSkeleton } from '@/components/ui/states';
import { getBook, getBookPdfs, getUnits } from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
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

  return {
    title: book.title,
    description: book.description || undefined,
    alternates: { canonical: `/${locale}/books/${id}` },
  };
}

/**
 * The page body reads `params` inside `<Suspense>` rather than at the top.
 *
 * Book ids are deliberately not pre-rendered (a deleted book must not survive
 * as a stale static page), so without this the whole route would be blocked
 * from prerendering and every visitor would wait on the API for the shell too.
 * This way the header, navigation and page frame are static, and only the data
 * streams.
 */
export default async function BookPage({ params }: PageProps<'/[locale]/books/[bookId]'>) {
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

  return (
    <Container>
      <PageHeader
        title={book.title}
        description={book.description || undefined}
        meta={
          <Badge tone={book.track === 'ielts' ? 'primary' : 'neutral'}>
            {book.track === 'ielts' ? t('homeTrackIelts') : t('homeTrackGeneral')}
          </Badge>
        }
        actions={
          <ButtonLink
            href={localeHref(locale, `/books/${id}/words`)}
            variant="secondary"
            size="md"
          >
            <IconSearch className="size-5" />
            {t('searchWordWholeBook')}
          </ButtonLink>
        }
      />

      <section className="mb-10">
        <SectionHeading>{t('unitPlural')}</SectionHeading>
        <Suspense fallback={<CardGridSkeleton count={6} />}>
          <UnitGrid bookId={id} locale={locale} />
        </Suspense>
      </section>

      {/* PDFs are a small, separate fetch: they stream in on their own. */}
      <Suspense fallback={null}>
        <BookPdfs bookId={id} locale={locale} />
      </Suspense>
    </Container>
  );
}

async function UnitGrid({ bookId, locale }: { bookId: number; locale: Locale }) {
  const units = await getUnits(bookId);
  const t = getTranslator(locale);

  if (units.length === 0) {
    // A book with no units yet is legitimate — an empty state, not a 404.
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-outline-variant px-6 py-10 text-center text-on-surface-variant">
        {t('noMatchingUnits')}
      </p>
    );
  }

  return (
    <CardGrid min="13rem">
      {units.map((unit) => (
        <CardLink
          key={unit.unit}
          href={localeHref(locale, `/books/${bookId}/units/${unit.unit}`)}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[length:var(--text-h4)] text-on-surface">
              {t('unitLabel', { unit: unit.unit })}
            </h3>
            <IconChevron className="size-5 shrink-0 text-on-surface-variant" />
          </div>
          {unit.details ? (
            <p className="mt-1.5 text-[length:var(--text-label)] text-on-surface-variant">
              <bdi lang="en">{unit.details}</bdi>
            </p>
          ) : null}
        </CardLink>
      ))}
    </CardGrid>
  );
}

async function BookPdfs({ bookId, locale }: { bookId: number; locale: Locale }) {
  // book_pdfs.php takes no book_id: it returns every PDF, filtered here.
  const pdfs = await getBookPdfs(bookId);
  if (pdfs.length === 0) return null;

  const t = getTranslator(locale);

  return (
    <section>
      <SectionHeading>{t('bookStudyPdfTooltip')}</SectionHeading>
      <Card className="divide-y divide-outline-variant/50 p-0">
        {pdfs.map((pdf) => (
          <ExternalLink
            key={pdf.id}
            href={pdf.url}
            className="flex min-h-14 items-center gap-3 px-5 py-4 hover:bg-surface-2 dark:hover:bg-surface-3"
          >
            <IconPdf className="size-5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 text-on-surface">
              <bdi lang="en">{pdf.title}</bdi>
            </span>
            <span className="text-[length:var(--text-caption)] text-on-surface-variant">
              {t('bookStudyPdfView')}
            </span>
          </ExternalLink>
        ))}
      </Card>
    </section>
  );
}
