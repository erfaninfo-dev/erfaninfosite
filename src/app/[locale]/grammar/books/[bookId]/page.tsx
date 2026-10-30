import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { ButtonLink } from '@/components/ui/button';
import { CardGrid, CardLink } from '@/components/ui/card';
import { IconArrowBack, IconChevron } from '@/components/ui/icons';
import { Badge, Container, PageHeader } from '@/components/ui/primitives';
import { CardGridSkeleton } from '@/components/ui/states';
import { getGrammarBook, getGrammarUnits } from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/grammar/books/[bookId]'>): Promise<Metadata> {
  const { locale, bookId } = await params;
  if (!isLocale(locale)) return {};
  const id = parseId(bookId);
  if (id === null) return {};
  const book = await getGrammarBook(id);
  if (!book) return {};

  return {
    title: book.title,
    description: book.description || undefined,
    alternates: { canonical: `/${locale}/grammar/books/${id}` },
  };
}

export default async function GrammarBookPage({
  params,
}: PageProps<'/[locale]/grammar/books/[bookId]'>) {
  const { locale, bookId } = await params;
  if (!isLocale(locale)) notFound();
  const id = parseId(bookId);
  if (id === null) notFound();

  const book = await getGrammarBook(id);
  if (!book) notFound();

  const t = getTranslator(locale);

  return (
    <Container>
      <ButtonLink
        href={localeHref(locale, '/grammar')}
        variant="ghost"
        size="md"
        className="mb-5"
      >
        <IconArrowBack className="size-5" />
        {t('grammarPracticeTitle')}
      </ButtonLink>

      <PageHeader
        title={book.title}
        description={book.description || undefined}
        meta={book.level ? <Badge tone="primary">{book.level}</Badge> : undefined}
      />

      <Suspense fallback={<CardGridSkeleton count={6} />}>
        <UnitGrid bookId={id} locale={locale} />
      </Suspense>
    </Container>
  );
}

async function UnitGrid({ bookId, locale }: { bookId: number; locale: Locale }) {
  const units = await getGrammarUnits(bookId);
  const t = getTranslator(locale);

  if (units.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-outline-variant px-6 py-10 text-center text-on-surface-variant">
        {t('noMatchingUnits')}
      </p>
    );
  }

  return (
    <CardGrid min="15rem">
      {units.map((unit) => (
        <CardLink
          key={unit.id}
          href={localeHref(locale, `/grammar/books/${bookId}/units/${unit.id}`)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[length:var(--text-caption)] font-semibold text-on-surface-variant">
                {t('unitLabel', { unit: unit.unitNumber })}
              </p>
              <h3 className="mt-0.5 text-[length:var(--text-h4)] text-on-surface">
                <bdi lang="en">{unit.title}</bdi>
              </h3>
            </div>
            <IconChevron className="size-5 shrink-0 text-on-surface-variant" />
          </div>
          {unit.subtitle ? (
            <p className="mt-1.5 text-[length:var(--text-label)] text-on-surface-variant">
              <bdi lang="en">{unit.subtitle}</bdi>
            </p>
          ) : null}
        </CardLink>
      ))}
    </CardGrid>
  );
}
