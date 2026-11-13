import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { SpeakingBrowser, type SpeakingLabels } from '@/components/features/speaking/speaking-browser';
import { Container } from '@/components/ui/primitives';
import { CardGridSkeleton } from '@/components/ui/states';
import { getSpeakingModels, getSpeakingTopics } from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/speaking'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);
  return {
    title: t('speakingPart1Title'),
    description: t('speakingPart1HeroSubtitle'),
    alternates: { canonical: `/${locale}/speaking` },
  };
}

/**
 * Speaking Part 1. Parts 2 and 3 stay off this page: the app asks for `part=1`,
 * and `part=2` / `part=3` still come back empty.
 */
export default async function SpeakingPage({ params }: PageProps<'/[locale]/speaking'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <Container>
      <Suspense fallback={<CardGridSkeleton count={8} />}>
        <Browser locale={locale} />
      </Suspense>
    </Container>
  );
}

async function Browser({ locale }: { locale: Locale }) {
  const [topics, models] = await Promise.all([getSpeakingTopics(), getSpeakingModels()]);
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);

  const labels: SpeakingLabels = {
    title: t('speakingPart1Title'),
    back: t('back'),
    topics: t('speakingViewTopics'),
    models: t('speakingViewModelQuestions'),
    searchTopics: t('speakingSearchTopicsHint'),
    searchModels: t('speakingSearchModelsHint'),
    topicsHintTemplate: raw('speakingTopicsLearnHint'),
    modelsHintTemplate: raw('speakingModelsLearnHint'),
    questionCountTemplate: raw('speakingTopicQuestionCount'),
    modelNumberTemplate: raw('speakingModelNumber'),
    noTopics: t('speakingNoTopics'),
    noModels: t('speakingNoModels'),
    untitled: t('speakingUntitledTopic'),
    clear: t('close'),
  };

  return <SpeakingBrowser topics={topics} models={models} locale={locale} labels={labels} />;
}
