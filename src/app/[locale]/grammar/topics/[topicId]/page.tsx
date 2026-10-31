import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import {
  StudySheet,
  type StudyLabels,
  type StudyPart,
} from '@/components/features/grammar/study-sheet';
import { ButtonLink } from '@/components/ui/button';
import { IconArrowBack, IconGrammar } from '@/components/ui/icons';
import { Badge, Container, PageHeader } from '@/components/ui/primitives';
import { Skeleton } from '@/components/ui/states';
import { getGrammarTopic, getGrammarTopicPdfs } from '@/lib/api/queries';
import { defaultGlossFor, isLocale, type Locale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';
import { getGloss } from '@/lib/request-context';

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
  const t = getTranslator(locale);

  return {
    title: `${topic.topic} — ${t('grammarTopicsCardLearnTitle')}`,
    description: t('grammarTopicsCardLearnDesc'),
    alternates: { canonical: `/${locale}/grammar/topics/${id}` },
  };
}

/**
 * **Learn** for one grammar topic.
 *
 * Study material and nothing else — the PDF lessons, by language — which is
 * what the app's Learn sheet is. It deliberately shows no question count and
 * no session length: those belong to Quiz, the other action on the topic card.
 * Showing them here made Learn look like a quiz setup screen, which is the bug
 * this replaces.
 */
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
    <Container size="prose">
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
        meta={<Badge tone="primary">{t('grammarStudySheetEyebrow')}</Badge>}
        actions={
          <ButtonLink
            href={localeHref(locale, `/grammar/quiz?topics=${id}&seed=${id * 7919}`)}
            variant="secondary"
            size="md"
          >
            <IconGrammar className="size-5" />
            {t('grammarTopicsCardQuizTitle')}
          </ButtonLink>
        }
      />

      <Suspense
        fallback={<Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />}
      >
        <Study topic={topic.topic} locale={locale} />
      </Suspense>
    </Container>
  );
}

async function Study({ topic, locale }: { topic: string; locale: Locale }) {
  const [pdfs, gloss] = await Promise.all([getGrammarTopicPdfs(topic), getGloss(locale)]);
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);

  const parts: StudyPart[] = pdfs.map((pdf) => ({
    id: pdf.id,
    title: pdf.title,
    // `pdf_url` is the Persian lesson, `pdf_url_kur` the Kurdish one.
    fa: pdf.url,
    ckb: pdf.urlKurdish,
  }));

  if (parts.length === 0) {
    return (
      <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-center">
        {t('grammarStudyPdfUnavailable')}
      </p>
    );
  }

  const labels: StudyLabels = {
    chooseLevel: t('grammarStudySheetChooseLevel'),
    partLabel: t('grammarStudyPdfPartLabel'),
    view: t('grammarStudyPdfView'),
    unavailable: t('grammarStudyPdfUnavailable'),
    languages: [
      { id: 'fa', label: t('langPersian') },
      { id: 'ckb', label: t('langKurdishSorani') },
    ],
    partTemplate: raw('partNumber'),
  };

  return (
    <StudySheet
      parts={parts}
      labels={labels}
      locale={locale}
      // Open on the reader's own gloss language, falling back to the locale's.
      initialLanguage={gloss || defaultGlossFor(locale)}
    />
  );
}
