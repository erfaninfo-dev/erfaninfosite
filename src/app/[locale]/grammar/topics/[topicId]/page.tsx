import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExternalLink } from '@/components/ui/external-link';
import { IconArrowBack, IconPdf } from '@/components/ui/icons';
import { Badge, Container, PageHeader, SectionHeading } from '@/components/ui/primitives';
import { getGrammarTopic, getGrammarTopicPdfs } from '@/lib/api/queries';
import { SESSION_LENGTHS } from '@/lib/quiz/scoring';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/grammar/topics/[topicId]'>): Promise<Metadata> {
  const { locale, topicId } = await params;
  if (!isLocale(locale)) return {};
  const id = parseId(topicId);
  if (id === null) return {};
  const topic = await getGrammarTopic(id);
  if (!topic) return {};

  return {
    title: topic.topic,
    alternates: { canonical: `/${locale}/grammar/topics/${id}` },
  };
}

export default async function GrammarTopicPage({
  params,
}: PageProps<'/[locale]/grammar/topics/[topicId]'>) {
  const { locale, topicId } = await params;
  if (!isLocale(locale)) notFound();
  const id = parseId(topicId);
  if (id === null) notFound();

  // A topic removed from the catalog 404s within one revalidation window.
  const topic = await getGrammarTopic(id);
  if (!topic) notFound();

  const t = getTranslator(locale);

  return (
    <Container>
      <ButtonLink
        href={localeHref(locale, '/grammar')}
        variant="ghost"
        size="md"
        className="mb-5"
      >
        <IconArrowBack className="size-5" />
        {t('grammarPracticeTitle')}
      </ButtonLink>

      <PageHeader
        title={topic.topic}
        meta={
          <>
            <Badge>{t('grammarTopicsQuestionsCount', { count: topic.questionCount })}</Badge>
            {topic.isNew ? <Badge tone="new">{t('badgeNew')}</Badge> : null}
          </>
        }
      />

      <Card className="mb-8">
        <SectionHeading>{t('quizLength')}</SectionHeading>
        <p className="mb-5 text-on-surface-variant">{t('grammarTopicsPick')}</p>
        <div className="flex flex-wrap gap-3">
          {SESSION_LENGTHS.filter((n) => n <= topic.questionCount).map((n) => (
            <ButtonLink
              key={n}
              href={localeHref(locale, `/grammar/topics/${id}/quiz?n=${n}`)}
              variant={n === 20 ? 'primary' : 'ghost'}
              size="md"
            >
              {t('grammarTopicsQuestionsCount', { count: n })}
            </ButtonLink>
          ))}
          {topic.questionCount < SESSION_LENGTHS[0] ? (
            <ButtonLink
              href={localeHref(locale, `/grammar/topics/${id}/quiz`)}
              size="md"
            >
              {t('startQuiz')}
            </ButtonLink>
          ) : null}
        </div>
      </Card>

      {/* PDFs join to topics by name, not id, and stream in separately. */}
      <Suspense fallback={null}>
        <TopicPdfs topic={topic.topic} locale={locale} />
      </Suspense>
    </Container>
  );
}

async function TopicPdfs({ topic, locale }: { topic: string; locale: Locale }) {
  const pdfs = await getGrammarTopicPdfs(topic);
  if (pdfs.length === 0) return null;

  const t = getTranslator(locale);

  return (
    <section>
      <SectionHeading>{t('grammarTopicsCardLearnDesc')}</SectionHeading>
      <Card className="space-y-2 p-4">
        {pdfs.map((pdf) => (
          <div key={pdf.id} className="flex flex-wrap items-center gap-2">
            <ExternalLink
              href={pdf.url}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] px-3 text-primary hover:bg-surface-3"
            >
              <IconPdf className="size-5" />
              <bdi lang="en">{pdf.title || topic}</bdi>
            </ExternalLink>

            {/* A separate Kurdish PDF exists for most topics. */}
            <ExternalLink
              href={pdf.urlKurdish}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] px-3 text-primary hover:bg-surface-3"
            >
              <IconPdf className="size-5" />
              {t('pdfKurdish')}
            </ExternalLink>
          </div>
        ))}
      </Card>
    </section>
  );
}
