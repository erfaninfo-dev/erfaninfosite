import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { StudySheetModal } from '@/components/features/grammar/study-sheet-modal';
import { StudyBody } from '@/components/features/grammar/study-body';
import { Skeleton } from '@/components/ui/states';
import { getGrammarTopic } from '@/lib/api/queries';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';

/**
 * Learn, intercepted into a sheet.
 *
 * Opening Learn from the grammar list shows this over the list, the way the
 * app's bottom sheet does — the list keeps its scroll position and its
 * selection. The same URL loaded directly still renders the full page next to
 * this file, so the screen remains linkable, shareable and indexable.
 */
export default async function LearnSheet({
  params,
}: PageProps<'/[locale]/grammar/topics/[topicId]'>) {
  const { locale, topicId } = await params;
  if (!isLocale(locale)) notFound();

  const id = /^\d+$/.test(topicId) ? Number(topicId) : 0;
  if (id <= 0) notFound();

  const topic = await getGrammarTopic(id);
  if (!topic) notFound();

  const t = getTranslator(locale);

  return (
    <StudySheetModal
      label={`${t('grammarStudySheetEyebrow')} — ${topic.topic}`}
      eyebrow={t('grammarStudySheetEyebrow')}
      title={topic.topic}
      quizLabel={t('grammarTopicsCardQuizTitle')}
      quizHref={`/${locale}/grammar/quiz?topics=${id}&seed=${id * 7919}`}
      closeLabel={t('close')}
    >
      <Suspense
        fallback={<Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />}
      >
        <StudyBody topic={topic.topic} locale={locale} />
      </Suspense>
    </StudySheetModal>
  );
}
