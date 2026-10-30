import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Badge, Container, PageHeader, SectionHeading } from '@/components/ui/primitives';
import { CardGrid, CardLink } from '@/components/ui/card';
import { CardGridSkeleton } from '@/components/ui/states';
import { getBooks } from '@/lib/api/queries';
import type { Book } from '@/lib/api/normalize';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/books'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);
  return {
    title: t('tabVocabulary'),
    alternates: { canonical: `/${locale}/books` },
  };
}

export default async function BooksPage({ params }: PageProps<'/[locale]/books'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  return (
    <Container>
      <PageHeader title={t('tabVocabulary')} description={t('siteTagline')} />
      <Suspense fallback={<CardGridSkeleton count={8} />}>
        <BookCatalog locale={locale} />
      </Suspense>
    </Container>
  );
}

/**
 * Books grouped by series, then by track.
 *
 * `series_title` is null for 4 of the 33 books, so there is an explicit
 * "other books" bucket rather than an empty heading.
 */
async function BookCatalog({ locale }: { locale: Locale }) {
  const books = await getBooks();
  const t = getTranslator(locale);

  const series = new Map<string, Book[]>();
  const standalone: Book[] = [];

  for (const book of books) {
    if (book.seriesTitle) {
      const list = series.get(book.seriesTitle) ?? [];
      list.push(book);
      series.set(book.seriesTitle, list);
    } else {
      standalone.push(book);
    }
  }

  return (
    <div className="space-y-10">
      {[...series.entries()].map(([title, group]) => (
        <section key={title}>
          <SectionHeading>
            {/* Series titles are English product names: isolate them in RTL. */}
            <bdi lang="en">{title}</bdi>
          </SectionHeading>
          <CardGrid>
            {group.map((book) => (
              <BookCard key={book.id} book={book} locale={locale} />
            ))}
          </CardGrid>
        </section>
      ))}

      {standalone.length > 0 ? (
        <section>
          <SectionHeading>{t('homeBooksSeriesOther')}</SectionHeading>
          <CardGrid>
            {standalone.map((book) => (
              <BookCard key={book.id} book={book} locale={locale} />
            ))}
          </CardGrid>
        </section>
      ) : null}
    </div>
  );
}

function BookCard({ book, locale }: { book: Book; locale: Locale }) {
  const t = getTranslator(locale);
  return (
    <CardLink href={localeHref(locale, `/books/${book.id}`)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <BookCover title={book.title} />
        <Badge tone={book.track === 'ielts' ? 'primary' : 'neutral'}>
          {book.track === 'ielts' ? t('homeTrackIelts') : t('homeTrackGeneral')}
        </Badge>
      </div>
      <h3 className="text-on-surface text-[length:var(--text-h4)]">
        <bdi lang="en">{book.title}</bdi>
      </h3>
      {book.description ? (
        <p className="text-on-surface-variant mt-1.5 line-clamp-2 text-[length:var(--text-label)]">
          <bdi lang="en">{book.description}</bdi>
        </p>
      ) : null}
    </CardLink>
  );
}

/**
 * The generated cover placeholder, ported from the app's
 * `AppBrandLogoFallback`: a primary→tertiary diagonal gradient with a book
 * glyph. No book has a cover image in the API, so every card uses it, and
 * using the app's own recipe keeps the two products looking alike.
 */
function BookCover({ title }: { title: string }) {
  // A stable hue shift per title, so a shelf of books is not one flat colour.
  const shift = [...title].reduce((acc, ch) => (acc + ch.charCodeAt(0)) % 40, 0) - 20;

  return (
    <div
      aria-hidden="true"
      className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-logo)] text-white"
      style={{
        background: `linear-gradient(135deg,
          color-mix(in oklab, var(--color-primary) 90%, transparent),
          color-mix(in oklab, var(--color-tertiary) 78%, transparent))`,
        filter: `hue-rotate(${shift}deg)`,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H18a1 1 0 0 1 1 1v13" strokeLinecap="round" />
        <path d="M4 5.5v13A2 2 0 0 1 6 17h13v4H6a2 2 0 0 1-2-2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
