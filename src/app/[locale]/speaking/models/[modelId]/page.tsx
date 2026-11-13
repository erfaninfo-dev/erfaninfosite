import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import {
  ModelQuestions,
  type ModelQuestionLabels,
} from '@/components/features/speaking/model-questions';
import { Container } from '@/components/ui/primitives';
import { Skeleton } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import { getSpeakingModel, getSpeakingModelQuestions } from '@/lib/api/queries';
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
}: PageProps<'/[locale]/speaking/models/[modelId]'>): Promise<Metadata> {
  const { locale, modelId } = await params;
  if (!isLocale(locale)) return {};
  const id = parseId(modelId);
  if (id === null) return {};
  const model = await getSpeakingModel(id);
  if (!model) return {};
  const t = getTranslator(locale);

  return {
    title: t('speakingModelNumber', { number: model.modelNumber }),
    description: model.title || model.formula || undefined,
    alternates: { canonical: `/${locale}/speaking/models/${id}` },
  };
}

/**
 * A model answer pattern.
 *
 * `speaking_questions.php?model_id=` returns `{model, questions}`, while
 * `?topic_id=` returns `{topic, questions}`. Two shapes from one endpoint.
 */
export default async function SpeakingModelPage({
  params,
}: PageProps<'/[locale]/speaking/models/[modelId]'>) {
  const { locale, modelId } = await params;
  if (!isLocale(locale)) notFound();
  const id = parseId(modelId);
  if (id === null) notFound();

  const model = await getSpeakingModel(id);
  if (!model) notFound();

  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />}>
        <Model modelId={id} locale={locale} />
      </Suspense>
    </Container>
  );
}

async function Model({ modelId, locale }: { modelId: number; locale: Locale }) {
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);
  const gloss = await getGloss(locale);

  let data;
  try {
    data = await getSpeakingModelQuestions(modelId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const labels: ModelQuestionLabels = {
    back: t('back'),
    modelAnswer: t('speakingModelAnswer'),
    modelNumberTemplate: raw('speakingModelNumber'),
    subtitleTemplate: raw('speakingModelQuestionsSubtitle'),
    expandAll: t('speakingExpandAll'),
    collapseAll: t('speakingCollapseAll'),
    formula: t('speakingFormula'),
    template: t('speakingTemplate'),
    sampleAnswer: t('speakingSampleAnswer'),
    bandAnswerTemplate: raw('speakingBandAnswer'),
    copied: t('speakingAnswerCopied'),
    persian: t('grammarExplanationTabFa'),
    kurdish: t('translationLangKurdiTab'),
    noQuestions: t('speakingNoQuestions'),
  };

  return (
    <ModelQuestions
      model={data.model}
      questions={data.questions}
      locale={locale}
      gloss={gloss}
      labels={labels}
    />
  );
}
