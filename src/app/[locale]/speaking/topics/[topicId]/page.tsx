import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import {
  TopicQuestions,
  type TopicQuestionLabels,
} from '@/components/features/speaking/topic-questions';
import { Container } from '@/components/ui/primitives';
import { Skeleton } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import type { SpeakingIdeaCategory } from '@/lib/api/normalize';
import { getSpeakingTopic, getSpeakingTopicIdeas, getSpeakingTopicQuestions } from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
import { getGloss } from '@/lib/request-context';

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/speaking/topics/[topicId]'>): Promise<Metadata> {
  const { locale, topicId } = await params;
  if (!isLocale(locale)) return {};
  const id = parseId(topicId);
  if (id === null) return {};
  const topic = await getSpeakingTopic(id);
  if (!topic) return {};

  return {
    title: topic.title,
    alternates: { canonical: `/${locale}/speaking/topics/${id}` },
  };
}

export default async function SpeakingTopicPage({
  params,
}: PageProps<'/[locale]/speaking/topics/[topicId]'>) {
  const { locale, topicId } = await params;
  if (!isLocale(locale)) notFound();
  const id = parseId(topicId);
  if (id === null) notFound();

  const topic = await getSpeakingTopic(id);
  if (!topic) notFound();

  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />}>
        <Topic topicId={id} fallbackTitle={topic.title} locale={locale} />
      </Suspense>
    </Container>
  );
}

async function Topic({
  topicId,
  fallbackTitle,
  locale,
}: {
  topicId: number;
  fallbackTitle: string;
  locale: Locale;
}) {
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);
  const gloss = await getGloss(locale);

  /*
   * speaking_questions.php is the one public endpoint that returns a real 404
   * for a missing topic, so that status is used directly rather than inferring
   * deletion from an empty list.
   */
  let data;
  try {
    data = await getSpeakingTopicQuestions(topicId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  let categories: SpeakingIdeaCategory[] = [];
  try {
    const ideas = await getSpeakingTopicIdeas(topicId);
    categories = ideas.categories.filter((category) => category.ideas.length > 0);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }

  const title = data.topic.title.trim() || fallbackTitle.trim() || t('speakingUntitledTopic');

  const labels: TopicQuestionLabels = {
    back: t('back'),
    questions: t('speakingTabQuestions'),
    ideas: t('speakingTabIdeas'),
    noQuestions: t('speakingNoQuestions'),
    noIdeas: t('speakingNoIdeas'),
    modelAnswer: t('speakingModelAnswer'),
    modelNumberTemplate: raw('speakingModelNumber'),
    formula: t('speakingFormula'),
    template: t('speakingTemplate'),
    sampleAnswer: t('speakingSampleAnswer'),
    bandAnswerTemplate: raw('speakingBandAnswer'),
    copied: t('speakingAnswerCopied'),
    persian: t('grammarExplanationTabFa'),
    kurdish: t('translationLangKurdiTab'),
    searchIdeas: t('speakingSearchIdeasHint'),
    noSearchResults: t('speakingIdeasNoSearchResults'),
    otherTopics: t('speakingIdeasOtherTopics'),
    ideasErrorTemplate: raw('speakingIdeasLoadError'),
    retry: t('retry'),
    clear: t('close'),
  };

  return (
    <TopicQuestions
      topicId={topicId}
      title={title}
      questions={data.questions}
      categories={categories}
      locale={locale}
      gloss={gloss}
      labels={labels}
    />
  );
}
