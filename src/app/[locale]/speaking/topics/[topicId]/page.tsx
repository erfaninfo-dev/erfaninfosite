import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { SpeakingAnswerCard } from '@/components/features/speaking/answer-card';
import { ButtonLink } from '@/components/ui/button';
import { IconArrowBack, IconLightbulb } from '@/components/ui/icons';
import { Container, PageHeader } from '@/components/ui/primitives';
import { EmptyState, Skeleton } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import { getSpeakingTopic, getSpeakingTopicQuestions } from '@/lib/api/queries';
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

  const t = getTranslator(locale);

  return (
    <Container>
      <ButtonLink
        href={localeHref(locale, '/speaking')}
        variant="ghost"
        size="md"
        className="mb-5"
      >
        <IconArrowBack className="size-5" />
        {t('speakingPart1Title')}
      </ButtonLink>

      <PageHeader
        title={topic.title}
        actions={
          <ButtonLink
            href={localeHref(locale, `/speaking/topics/${id}/ideas`)}
            variant="secondary"
            size="md"
          >
            <IconLightbulb className="size-5" />
            {t('speakingTabIdeas')}
          </ButtonLink>
        }
      />

      <Suspense
        fallback={<Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />}
      >
        <Questions topicId={id} locale={locale} />
      </Suspense>
    </Container>
  );
}

async function Questions({ topicId, locale }: { topicId: number; locale: Locale }) {
  const t = getTranslator(locale);
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

  if (data.questions.length === 0) {
    return <EmptyState title={t('speakingNoQuestions')} />;
  }

  return (
    <div className="space-y-5">
      {data.questions.map((question) => (
        <SpeakingAnswerCard
          key={question.id}
          question={question}
          locale={locale}
          gloss={gloss}
        />
      ))}
    </div>
  );
}
