import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { CardGrid, CardLink } from '@/components/ui/card';
import { IconChevron } from '@/components/ui/icons';
import { Badge, Container, PageHeader, SectionHeading } from '@/components/ui/primitives';
import { CardGridSkeleton } from '@/components/ui/states';
import { getGrammarBooks, getGrammarTopics } from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/grammar'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);
  return {
    title: t('grammarPracticeTitle'),
    description: t('grammarTopicsIntroBody'),
    alternates: { canonical: `/${locale}/grammar` },
  };
}

export default async function GrammarPage({ params }: PageProps<'/[locale]/grammar'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  return (
    <Container>
      <PageHeader
        title={t('grammarTopicsIntroTitle')}
        description={t('grammarTopicsIntroBody')}
      />

      <section className="mb-12">
        <SectionHeading>{t('grammarTopicsCardLearnTitle')}</SectionHeading>
        <Suspense fallback={<CardGridSkeleton count={3} />}>
          <GrammarBookGrid locale={locale} />
        </Suspense>
      </section>

      <section>
        <SectionHeading>{t('grammarTopicsCardQuizTitle')}</SectionHeading>
        <Suspense fallback={<CardGridSkeleton count={9} />}>
          <TopicGrid locale={locale} />
        </Suspense>
      </section>
    </Container>
  );
}

/**
 * Grammar books lead to lesson texts, not quizzes.
 *
 * Every grammar book currently reports `question_count: 0`, and
 * `grammar_questions?unit_id=` comes back empty, so a unit-driven quiz would
 * lead nowhere. Quizzes hang off topics instead — see docs/api-contract.md §3.
 */
async function GrammarBookGrid({ locale }: { locale: Locale }) {
  const books = await getGrammarBooks();
  const t = getTranslator(locale);

  if (books.length === 0) return null;

  return (
    <CardGrid min="15rem">
      {books.map((book) => (
        <CardLink key={book.id} href={localeHref(locale, `/grammar/books/${book.id}`)}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-on-surface text-[length:var(--text-h4)]">
              <bdi lang="en">{book.title}</bdi>
            </h3>
            <IconChevron className="text-on-surface-variant size-5 shrink-0" />
          </div>
          {book.description ? (
            <p className="text-on-surface-variant mt-1.5 line-clamp-2 text-[length:var(--text-label)]">
              <bdi lang="en">{book.description}</bdi>
            </p>
          ) : null}
          <div className="mt-auto pt-4">
            <Badge>{t('unitCount', { count: book.unitCount })}</Badge>
          </div>
        </CardLink>
      ))}
    </CardGrid>
  );
}

async function TopicGrid({ locale }: { locale: Locale }) {
  const topics = await getGrammarTopics();
  const t = getTranslator(locale);

  if (topics.length === 0) {
    return (
      <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-center">
        {t('grammarNoTopicsEmpty')}
      </p>
    );
  }

  return (
    <CardGrid min="15rem">
      {topics.map((topic) => (
        <CardLink key={topic.id} href={localeHref(locale, `/grammar/topics/${topic.id}`)}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-on-surface text-[length:var(--text-h4)]">
              <bdi lang="en">{topic.topic}</bdi>
            </h3>
            {topic.isNew ? <Badge tone="new">{t('badgeNew')}</Badge> : null}
          </div>
          <div className="mt-auto pt-4">
            <Badge>
              {t('grammarTopicsQuestionsCount', { count: topic.questionCount })}
            </Badge>
          </div>
        </CardLink>
      ))}
    </CardGrid>
  );
}
