import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Quiz, type QuizQuestion } from '@/components/features/grammar/quiz';
import { ButtonLink } from '@/components/ui/button';
import { IconArrowBack } from '@/components/ui/icons';
import { Container, PageHeader } from '@/components/ui/primitives';
import { EmptyState, Skeleton } from '@/components/ui/states';
import { glossOf } from '@/lib/api/normalize';
import { getGrammarQuestions, getGrammarTopic } from '@/lib/api/queries';
import { SESSION_LENGTHS, selectSession } from '@/lib/quiz/scoring';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/grammar/topics/[topicId]/quiz'>): Promise<Metadata> {
  const { locale, topicId } = await params;
  if (!isLocale(locale)) return {};
  const id = parseId(topicId);
  if (id === null) return {};
  const topic = await getGrammarTopic(id);
  const t = getTranslator(locale);

  return {
    title: topic ? `${topic.topic} — ${t('grammarTopicsCardQuizTitle')}` : t('grammarTopicsCardQuizTitle'),
    alternates: { canonical: `/${locale}/grammar/topics/${id}/quiz` },
  };
}

export default async function QuizPage({
  params,
  searchParams,
}: PageProps<'/[locale]/grammar/topics/[topicId]/quiz'>) {
  const [{ locale, topicId }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const id = parseId(topicId);
  if (id === null) notFound();

  const topic = await getGrammarTopic(id);
  if (!topic) notFound();

  const t = getTranslator(locale);
  const backHref = localeHref(locale, `/grammar/topics/${id}`);

  // The session length is in the URL so a chosen quiz can be shared and resumed.
  const requested = Number(Array.isArray(query.n) ? query.n[0] : query.n);
  const length = SESSION_LENGTHS.includes(requested as (typeof SESSION_LENGTHS)[number])
    ? requested
    : 20;

  return (
    <Container size="quiz">
      <ButtonLink href={backHref} variant="ghost" size="md" className="mb-5">
        <IconArrowBack className="size-5" />
        {topic.topic}
      </ButtonLink>

      <PageHeader title={t('grammarTopicsCardQuizTitle')} description={topic.topic} />

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-[var(--radius-card)]" />}>
        <QuizBody topicId={id} locale={locale} length={length} />
      </Suspense>
    </Container>
  );
}

async function QuizBody({
  topicId,
  locale,
  length,
}: {
  topicId: number;
  locale: Locale;
  length: number;
}) {
  const all = await getGrammarQuestions(topicId);
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);
  const backHref = localeHref(locale, `/grammar/topics/${topicId}`);

  if (all.length === 0) {
    return (
      <EmptyState
        title={t('grammarNoQuestions')}
        action={
          <ButtonLink href={backHref} variant="secondary" size="md">
            {t('back')}
          </ButtonLink>
        }
      />
    );
  }

  /*
   * Up to 300 questions come back (212 KB). Only the session's questions are
   * sent to the browser, and the explanation is resolved to the reader's
   * language here so the client ships one string instead of three.
   */
  const session = selectSession(all, length);
  const questions: QuizQuestion[] = session.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: glossOf(q.explanation, locale === 'ckb' ? 'ckb' : 'fa') || q.explanation.en,
  }));

  return (
    <Quiz
      questions={questions}
      explanationLang={locale}
      locale={locale}
      backHref={backHref}
      labels={{
        // Raw ICU: the values are only known in the browser.
        progressTemplate: raw('questionProgress'),
        correct: t('answerCorrect'),
        wrong: t('answerWrong'),
        correctAnswerLabel: t('quizFeedbackCorrectLabel'),
        next: t('next'),
        finish: t('finish'),
        scoreTemplate: raw('grammarScoreOutOf'),
        retryWrong: t('onlyPastMistakes'),
        restart: t('practiseAgain'),
        backToTopics: t('grammarPracticeTitle'),
      }}
    />
  );
}
