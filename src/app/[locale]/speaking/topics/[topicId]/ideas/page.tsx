import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SpeakButton } from '@/components/features/speaking/speak-button';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconArrowBack } from '@/components/ui/icons';
import { Badge, Container, PageHeader, SectionHeading } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import { getSpeakingTopic, getSpeakingTopicIdeas } from '@/lib/api/queries';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/speaking/topics/[topicId]/ideas'>): Promise<Metadata> {
  const { locale, topicId } = await params;
  if (!isLocale(locale)) return {};
  const id = parseId(topicId);
  if (id === null) return {};
  const topic = await getSpeakingTopic(id);
  const t = getTranslator(locale);
  if (!topic) return {};

  return {
    title: `${topic.title} — ${t('speakingTabIdeas')}`,
    alternates: { canonical: `/${locale}/speaking/topics/${id}/ideas` },
  };
}

export default async function SpeakingIdeasPage({
  params,
}: PageProps<'/[locale]/speaking/topics/[topicId]/ideas'>) {
  const { locale, topicId } = await params;
  if (!isLocale(locale)) notFound();
  const id = parseId(topicId);
  if (id === null) notFound();

  const topic = await getSpeakingTopic(id);
  if (!topic) notFound();

  const t = getTranslator(locale);

  let data;
  try {
    data = await getSpeakingTopicIdeas(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const categories = data.categories.filter((c) => c.ideas.length > 0);

  return (
    <Container>
      <ButtonLink
        href={localeHref(locale, `/speaking/topics/${id}`)}
        variant="ghost"
        size="md"
        className="mb-5"
      >
        <IconArrowBack className="size-5" />
        {topic.title}
      </ButtonLink>

      <PageHeader title={t('speakingTabIdeas')} description={topic.title} />

      {categories.length === 0 ? (
        <EmptyState title={t('speakingNoIdeas')} />
      ) : (
        <div className="space-y-8">
          {categories.map((category) => (
            <section key={category.category}>
              <SectionHeading>
                <bdi lang="en">{category.titleEn || category.category}</bdi>
              </SectionHeading>
              <Card className="divide-outline-variant/50 divide-y p-0">
                {category.ideas.map((idea) => (
                  <div key={idea.id} className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <bdi lang="en" dir="ltr" className="text-on-surface font-semibold">
                          {idea.phrase}
                        </bdi>
                        {/*
                          band_text is a string like "6.5". Never coerced to a
                          number, or "6" would display as "6.0".
                        */}
                        {idea.band ? (
                          <Badge tone="primary">
                            {t('speakingBandAnswer', { band: idea.band })}
                          </Badge>
                        ) : null}
                      </div>
                      {idea.example ? (
                        <p
                          lang="en"
                          dir="ltr"
                          className="text-on-surface-variant mt-1.5 max-w-[var(--container-prose)]"
                        >
                          {idea.example}
                        </p>
                      ) : null}
                    </div>
                    <SpeakButton
                      text={idea.example ? `${idea.phrase}. ${idea.example}` : idea.phrase}
                      size="sm"
                    />
                  </div>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
