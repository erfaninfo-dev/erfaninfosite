import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import {
  TopicPicker,
  type PickerLabels,
  type TopicRow,
} from '@/components/features/grammar/topic-picker';
import { CardLink } from '@/components/ui/card';
import { IconChevron } from '@/components/ui/icons';
import { Badge, Container, PageHeader, SectionHeading } from '@/components/ui/primitives';
import { ListSkeleton } from '@/components/ui/states';
import { getGrammarBooks, getGrammarTopics } from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
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

/**
 * Grammar, built to match the app's screen: a searchable list of numbered topic
 * cards, each showing attempted progress with **Quiz** and **Learn** actions,
 * and a checkbox so several topics can be combined into one session.
 *
 * Grammar *books* are a second, smaller thing in the API — three of them, all
 * reporting `question_count: 0`, reachable only for their lesson texts. They
 * sit below the topics rather than competing with them.
 */
export default async function GrammarPage({ params }: PageProps<'/[locale]/grammar'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  return (
    <Container>
      <PageHeader
        title={t('grammarTopicsIntroTitle')}
        description={t('grammarTopicsIntroHint')}
      />

      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Topics locale={locale} />
      </Suspense>

      <Suspense fallback={null}>
        <GrammarBooks locale={locale} />
      </Suspense>
    </Container>
  );
}

async function Topics({ locale }: { locale: Locale }) {
  const topics = await getGrammarTopics();
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);

  if (topics.length === 0) {
    return (
      <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-center">
        {t('grammarNoTopicsEmpty')}
      </p>
    );
  }

  const rows: TopicRow[] = topics.map((topic) => ({
    id: topic.id,
    topic: topic.topic,
    questionCount: topic.questionCount,
    isNew: topic.isNew,
    learnHref: localeHref(locale, `/grammar/topics/${topic.id}`),
  }));

  const labels: PickerLabels = {
    searchHint: t('grammarTopicsSearchHint'),
    noResults: t('grammarTopicsSearchNoResults'),
    quizTitle: t('grammarTopicsCardQuizTitle'),
    quizDesc: t('grammarTopicsCardQuizDesc'),
    learnTitle: t('grammarTopicsCardLearnTitle'),
    learnDesc: t('grammarTopicsCardLearnDesc'),
    badgeNew: t('badgeNew'),
    // Raw ICU: these counts are only known in the browser.
    selectedTemplate: raw('grammarTopicsSelectedCount'),
    solvedTemplate: raw('solvedOf'),
    questionsTemplate: raw('grammarTopicsQuestionsCount'),
    startQuiz: t('grammarTopicsStartQuiz'),
    clear: t('clearSelection'),
    chooseLength: t('chooseQuestionCount'),
    notSynced: t('progressThisBrowser'),
    notEnoughTemplate: raw('grammarNotEnoughInBank'),
  };

  return (
    <TopicPicker
      topics={rows}
      labels={labels}
      locale={locale}
      quizHref={localeHref(locale, '/grammar/quiz')}
    />
  );
}

/** The three grammar books, which hold lesson texts rather than questions. */
async function GrammarBooks({ locale }: { locale: Locale }) {
  const books = await getGrammarBooks();
  if (books.length === 0) return null;

  const t = getTranslator(locale);

  return (
    <section className="mt-12">
      <SectionHeading>{t('grammarTopicsCardLearnDesc')}</SectionHeading>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(16rem, 100%), 1fr))',
        }}
      >
        {books.map((book) => (
          <CardLink key={book.id} href={localeHref(locale, `/grammar/books/${book.id}`)}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-on-surface text-[length:var(--text-h4)]">
                <bdi lang="en">{book.title}</bdi>
              </h2>
              <IconChevron className="text-on-surface-variant size-5 shrink-0" />
            </div>
            {book.description ? (
              <p className="text-on-surface-variant mt-1.5 line-clamp-2 text-[length:var(--text-label)]">
                <bdi lang="en">{book.description}</bdi>
              </p>
            ) : null}
            {book.unitCount > 0 ? (
              <div className="mt-auto pt-4">
                <Badge>{t('unitCount', { count: book.unitCount })}</Badge>
              </div>
            ) : null}
          </CardLink>
        ))}
      </div>
    </section>
  );
}
