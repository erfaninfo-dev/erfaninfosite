import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { SpeakingAnswerCard } from '@/components/features/speaking/answer-card';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconArrowBack } from '@/components/ui/icons';
import { Container, PageHeader } from '@/components/ui/primitives';
import { EmptyState, Skeleton } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import { getSpeakingModel, getSpeakingModelQuestions } from '@/lib/api/queries';
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
}: PageProps<'/[locale]/speaking/models/[modelId]'>): Promise<Metadata> {
  const { locale, modelId } = await params;
  if (!isLocale(locale)) return {};
  const id = parseId(modelId);
  if (id === null) return {};
  const model = await getSpeakingModel(id);
  if (!model) return {};

  return {
    title: model.title,
    description: model.formula || undefined,
    alternates: { canonical: `/${locale}/speaking/models/${id}` },
  };
}

/**
 * A model answer pattern.
 *
 * Note the envelope: `speaking_questions.php?model_id=` returns
 * `{model, questions}`, while `?topic_id=` returns `{topic, questions}`. Two
 * shapes from one endpoint — see docs/api-contract.md §1.
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
        title={model.title}
        meta={
          <span className="text-[length:var(--text-label)] text-on-surface-variant">
            {t('speakingModelNumber', { number: model.modelNumber })}
          </span>
        }
      />

      {model.formula || model.template ? (
        <Card className="mb-8 space-y-4">
          {model.formula ? (
            <div>
              <p className="text-[length:var(--text-caption)] font-semibold text-on-surface-variant">
                {t('speakingFormula')}
              </p>
              <p lang="en" dir="ltr" className="mt-1">
                {model.formula}
              </p>
            </div>
          ) : null}
          {model.template ? (
            <div>
              <p className="text-[length:var(--text-caption)] font-semibold text-on-surface-variant">
                {t('speakingTemplate')}
              </p>
              {/* The [brackets] in a template are literal content, not markup. */}
              <p lang="en" dir="ltr" className="mt-1">
                {model.template}
              </p>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Suspense fallback={<Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />}>
        <ModelQuestions modelId={id} locale={locale} />
      </Suspense>
    </Container>
  );
}

async function ModelQuestions({ modelId, locale }: { modelId: number; locale: Locale }) {
  const t = getTranslator(locale);
  const gloss = await getGloss(locale);

  let data;
  try {
    data = await getSpeakingModelQuestions(modelId);
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
