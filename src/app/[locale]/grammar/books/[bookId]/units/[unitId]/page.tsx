import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconArrowBack } from '@/components/ui/icons';
import { Container, PageHeader, Prose, StudyText } from '@/components/ui/primitives';
import { EmptyState, Skeleton } from '@/components/ui/states';
import { bilingualFor, bilingualIsFallback } from '@/lib/api/normalize';
import { getGrammarBook, getGrammarUnit, getGrammarUnitTexts } from '@/lib/api/queries';
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
}: PageProps<'/[locale]/grammar/books/[bookId]/units/[unitId]'>): Promise<Metadata> {
  const { locale, bookId, unitId } = await params;
  if (!isLocale(locale)) return {};
  const bId = parseId(bookId);
  const uId = parseId(unitId);
  if (bId === null || uId === null) return {};
  const unit = await getGrammarUnit(bId, uId);
  if (!unit) return {};

  return {
    title: unit.title,
    description: unit.subtitle || undefined,
    alternates: { canonical: `/${locale}/grammar/books/${bId}/units/${uId}` },
  };
}

export default async function GrammarUnitPage({
  params,
}: PageProps<'/[locale]/grammar/books/[bookId]/units/[unitId]'>) {
  const { locale, bookId, unitId } = await params;
  if (!isLocale(locale)) notFound();
  const bId = parseId(bookId);
  const uId = parseId(unitId);
  if (bId === null || uId === null) notFound();

  const [book, unit] = await Promise.all([getGrammarBook(bId), getGrammarUnit(bId, uId)]);
  if (!book || !unit) notFound();

  const t = getTranslator(locale);

  return (
    <Container>
      <ButtonLink
        href={localeHref(locale, `/grammar/books/${bId}`)}
        variant="ghost"
        size="md"
        className="mb-5"
      >
        <IconArrowBack className="size-5" />
        {book.title}
      </ButtonLink>

      <PageHeader
        title={unit.title}
        description={unit.subtitle || undefined}
        meta={
          <span className="text-on-surface-variant text-[length:var(--text-label)]">
            {t('unitLabel', { unit: unit.unitNumber })}
          </span>
        }
      />

      <Suspense
        fallback={<Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />}
      >
        <LessonTexts unitId={uId} locale={locale} />
      </Suspense>
    </Container>
  );
}

/**
 * The unit's lesson text.
 *
 * `text_en_fa` and `text_en_kur` are two whole bilingual documents, not a
 * language triple, and the Kurdish one is often empty. When it is, the Persian
 * document is shown with a note, rather than a blank panel.
 */
async function LessonTexts({ unitId, locale }: { unitId: number; locale: Locale }) {
  const [texts, gloss] = await Promise.all([
    getGrammarUnitTexts(unitId),
    getGloss(locale),
  ]);
  const t = getTranslator(locale);

  const usable = texts
    .map((text) => ({
      id: text.id,
      title: text.title,
      body: bilingualFor(text.text, gloss),
      fallback: bilingualIsFallback(text.text, gloss),
    }))
    .filter((text) => text.body.length > 0);

  if (usable.length === 0) {
    return <EmptyState title={t('grammarNoLessonText')} />;
  }

  return (
    <div className="space-y-5">
      {usable.map((text) => (
        <Card key={text.id}>
          <h2 className="mb-3 text-[length:var(--text-h4)]">
            {text.title || t('lessonText')}
          </h2>
          {text.fallback ? (
            <p className="text-on-surface-variant mb-3 text-[length:var(--text-caption)]">
              {t('notAvailableInKurdish')}
            </p>
          ) : null}
          <Prose>
            <StudyText>{text.body}</StudyText>
          </Prose>
        </Card>
      ))}
    </div>
  );
}
