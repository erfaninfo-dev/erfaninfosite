import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { WordListSection } from '@/components/features/vocab/word-list-server';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconArrowBack, IconCards } from '@/components/ui/icons';
import {
  Badge,
  Container,
  PageHeader,
  SectionHeading,
  StudyText,
} from '@/components/ui/primitives';
import { ListSkeleton } from '@/components/ui/states';
import { bilingualFor, bilingualIsFallback } from '@/lib/api/normalize';
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

  return (
    <Container size="wide">
      <ButtonLink
        href={localeHref(locale, `/books/${id}`)}
        variant="ghost"
        size="md"
        className="mb-5"
      >
        <IconArrowBack className="size-5" />
        {book.title}
      </ButtonLink>

      <PageHeader
        title={t('unitLabel', { unit: unitNo })}
        description={current.details || undefined}
        actions={
          <ButtonLink
            href={localeHref(locale, `/books/${id}/units/${unitNo}/flashcards`)}
            variant="secondary"
            size="md"
          >
            <IconCards className="size-5" />
            {t('tabReview')}
          </ButtonLink>
        }
      />

      {/* Each section streams independently: one slow fetch never blocks the page. */}
      <Suspense fallback={null}>
        <UnitSections bookId={id} unit={unitNo} locale={locale} />
      </Suspense>

      <Suspense fallback={<ListSkeleton rows={8} />}>
        <UnitWords bookId={id} unit={unitNo} locale={locale} />
      </Suspense>

      <Suspense fallback={null}>
        <UnitSamples bookId={id} unit={unitNo} locale={locale} />
      </Suspense>
    </Container>
  );
}

async function UnitWords({
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

  if (words.length === 0) {
    return (
      <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-center">
        {t('noMatchingWords')}
      </p>
    );
  }

  return <WordListSection words={words} locale={locale} gloss={gloss} />;
}

/**
 * Sections exist for some books and not others — book 1 unit 1 has three,
 * book 2 unit 1 has none. When a unit has none, this renders nothing at all
 * rather than an empty heading.
 */
async function UnitSections({
  bookId,
  unit,
  locale,
}: {
  bookId: number;
  unit: number;
  locale: Locale;
}) {
  const sections = await getSections(bookId, unit);
  if (sections.length === 0) return null;

  const t = getTranslator(locale);

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {sections.map((section) => (
        <Badge key={section.section} tone="neutral">
          {section.details || t('sectionLabel', { section: section.section })}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Bilingual reading samples. `text_en_fa` and `text_en_kur` are two whole
 * documents, not a language triple, so when the reader's own language is
 * missing the other is shown with a note rather than a blank panel.
 */
async function UnitSamples({
  bookId,
  unit,
  locale,
}: {
  bookId: number;
  unit: number;
  locale: Locale;
}) {
  const [samples, gloss] = await Promise.all([
    getUnitSamples(bookId, unit),
    getGloss(locale),
  ]);
  if (samples.length === 0) return null;

  const t = getTranslator(locale);

  return (
    <section className="mt-10">
      <SectionHeading>{t('unitSamplesOpen')}</SectionHeading>
      <div className="space-y-4">
        {samples.map((sample) => {
          const text = bilingualFor(sample.text, gloss);
          if (!text) return null;
          const fallback = bilingualIsFallback(sample.text, gloss);

          return (
            <Card key={sample.id}>
              {sample.title ? (
                <h3 className="mb-3 text-[length:var(--text-h4)]">
                  <bdi lang="en">{sample.title}</bdi>
                </h3>
              ) : null}
              {fallback ? (
                <p className="text-on-surface-variant mb-3 text-[length:var(--text-caption)]">
                  {t('notAvailableInKurdish')}
                </p>
              ) : null}
              <StudyText>{text}</StudyText>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
