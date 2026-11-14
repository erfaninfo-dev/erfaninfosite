import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import {
  TopicPicker,
  type PickerLabels,
  type TopicRow,
} from '@/components/features/grammar/topic-picker';
import { Container, PageHeader } from '@/components/ui/primitives';
import { ListSkeleton } from '@/components/ui/states';
import { getGrammarTopics } from '@/lib/api/queries';
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
 * Grammar *books* (Cambridge Basic / Intermediate / Advanced) stay in the API
 * at `/grammar/books/…` but are not linked from this list until we need them.
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

  const rows: TopicRow[] = topics.map((topic, index) => ({
    id: topic.id,
    topic: topic.topic,
    questionCount: topic.questionCount,
    isNew: topic.isNew,
    listNumber: index + 1,
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
