import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { CardGrid, CardLink } from '@/components/ui/card';
import { IconChevron } from '@/components/ui/icons';
import { Badge, Container, PageHeader, SectionHeading } from '@/components/ui/primitives';
import { CardGridSkeleton } from '@/components/ui/states';
import { getSpeakingModels, getSpeakingTopics } from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

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
 * Speaking.
 *
 * Deliberately not split by part: `speaking_topics.php?part=2` and `?part=3`
 * both return empty, and the app's own route is `/speaking/part1`. Building a
 * part switcher would lead readers to blank pages. The route is part-agnostic
 * so parts 2 and 3 can appear later without breaking any link.
 */
export default async function SpeakingPage({ params }: PageProps<'/[locale]/speaking'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  return (
    <Container>
      <PageHeader
        title={t('speakingPart1HeroTitle')}
        description={t('speakingPart1HeroSubtitle')}
        meta={<Badge tone="primary">{t('speakingPart1Badge')}</Badge>}
      />

      <section className="mb-12">
        <SectionHeading>{t('speakingViewTopics')}</SectionHeading>
        <Suspense fallback={<CardGridSkeleton count={9} />}>
          <TopicGrid locale={locale} />
        </Suspense>
      </section>

      <section>
        <SectionHeading>{t('speakingViewModelQuestions')}</SectionHeading>
        <Suspense fallback={<CardGridSkeleton count={6} />}>
          <ModelGrid locale={locale} />
        </Suspense>
      </section>
    </Container>
  );
}

async function TopicGrid({ locale }: { locale: Locale }) {
  const topics = await getSpeakingTopics();
  const t = getTranslator(locale);

  if (topics.length === 0) {
    return (
      <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-center">
        {t('speakingNoTopics')}
      </p>
    );
  }

  return (
    <CardGrid min="14rem">
      {topics.map((topic) => (
        <CardLink
          key={topic.id}
          href={localeHref(locale, `/speaking/topics/${topic.id}`)}
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-on-surface text-[length:var(--text-h4)]">
              <bdi lang="en">{topic.title}</bdi>
            </h3>
            <IconChevron className="text-on-surface-variant size-5 shrink-0" />
          </div>
          <div className="mt-auto pt-4">
            <Badge>
              {t('speakingModelQuestionsSubtitle', { count: topic.questionCount })}
            </Badge>
          </div>
        </CardLink>
      ))}
    </CardGrid>
  );
}

async function ModelGrid({ locale }: { locale: Locale }) {
  const models = await getSpeakingModels();
  const t = getTranslator(locale);

  if (models.length === 0) {
    return (
      <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-center">
        {t('speakingNoModels')}
      </p>
    );
  }

  return (
    <CardGrid min="18rem">
      {models.map((model) => (
        <CardLink
          key={model.id}
          href={localeHref(locale, `/speaking/models/${model.id}`)}
        >
          <p className="text-on-surface-variant text-[length:var(--text-caption)] font-semibold">
            {t('speakingModelNumber', { number: model.modelNumber })}
          </p>
          <h3 className="text-on-surface mt-0.5 text-[length:var(--text-h4)]">
            <bdi lang="en">{model.title}</bdi>
          </h3>
          {model.formula ? (
            <p className="text-on-surface-variant mt-2 text-[length:var(--text-label)]">
              <bdi lang="en">{model.formula}</bdi>
            </p>
          ) : null}
          <div className="mt-auto pt-4">
            <Badge>
              {t('speakingModelQuestionsSubtitle', { count: model.questionCount })}
            </Badge>
          </div>
        </CardLink>
      ))}
    </CardGrid>
  );
}
