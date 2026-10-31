import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { QuizSession } from '@/components/features/grammar/quiz-session';
import type { QuizQuestion } from '@/components/features/grammar/quiz';
import { ButtonLink } from '@/components/ui/button';
import { IconArrowBack } from '@/components/ui/icons';
import { Container, PageHeader } from '@/components/ui/primitives';
import { EmptyState, Skeleton } from '@/components/ui/states';
import { glossOf } from '@/lib/api/normalize';
import { getGrammarQuestions, getGrammarTopics } from '@/lib/api/queries';
import { SESSION_SIZE, resolveQuestionCount } from '@/lib/quiz/session';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/grammar/quiz'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);
  // A session is per-reader and per-seed; there is nothing stable to index.
  return { title: t('grammarTopicsCardQuizTitle'), robots: { index: false } };
}

/** `?topics=1,2,3` — ids, because topic names contain spaces and slashes. */
function parseTopicIds(value: string | string[] | undefined): number[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(',')
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((n) => Number.isInteger(n) && n > 0)
    ),
  ].slice(0, 20);
}

function parseNumber(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/**
 * A grammar session over one or more topics.
 *
 * The server fetches and merges the selected topics' questions, caps the pool
 * at one session's worth, and hands it to the browser. The final pick happens
 * there, because it depends on which questions the reader has already
 * attempted — and that lives in their own browser storage, which the server
 * cannot see. See src/lib/quiz/session.ts for the algorithm and what it can and
 * cannot match in the app.
 */
export default async function GrammarQuizPage({
  params,
  searchParams,
}: PageProps<'/[locale]/grammar/quiz'>) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();

  const topicIds = parseTopicIds(query.topics);
  const t = getTranslator(locale);
  const backHref = localeHref(locale, '/grammar');

  if (topicIds.length === 0) notFound();

  const allTopics = await getGrammarTopics();
  const chosen = allTopics.filter((topic) => topicIds.includes(topic.id));

  // Every id was deleted, or none was real.
  if (chosen.length === 0) notFound();

  return (
    <Container size="quiz">
      <ButtonLink href={backHref} variant="ghost" size="md" className="mb-5">
        <IconArrowBack className="size-5" />
        {t('grammarPracticeTitle')}
      </ButtonLink>

      <PageHeader
        title={t('grammarTopicsCardQuizTitle')}
        description={chosen.map((topic) => topic.topic).join(' · ')}
      />

      <Suspense
        fallback={<Skeleton className="h-96 w-full rounded-[var(--radius-card)]" />}
      >
        <Session
          locale={locale}
          topics={chosen.map((topic) => ({ id: topic.id, topic: topic.topic }))}
          requested={parseNumber(query.n)}
          seed={parseNumber(query.seed) ?? 1}
        />
      </Suspense>
    </Container>
  );
}

async function Session({
  locale,
  topics,
  requested,
  seed,
}: {
  locale: Locale;
  topics: Array<{ id: number; topic: string }>;
  requested: number | undefined;
  seed: number;
}) {
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);
  const backHref = localeHref(locale, '/grammar');

  // Each topic is its own cached call, so two sessions sharing a topic share
  // the fetch.
  const lists = await Promise.all(topics.map((topic) => getGrammarQuestions(topic.id)));

  const merged = lists.flat();
  if (merged.length === 0) {
    return (
      <EmptyState
        title={t('grammarNoQuestionsForTopics')}
        action={
          <ButtonLink href={backHref} variant="secondary" size="md">
            {t('back')}
          </ButtonLink>
        }
      />
    );
  }

  const want = resolveQuestionCount(requested, topics.length, merged.length);

  /*
   * Only a working pool crosses the wire, not the whole bank. A single topic
   * returns up to 300 questions (212 KB raw); this sends enough headroom for
   * the browser to prefer unattempted ones — three times the session, floor
   * 30 — capped at one session's worth. For a 10-question quiz that is 30
   * questions instead of 300.
   */
  const poolSize = Math.min(SESSION_SIZE, Math.max(want * 3, 30));
  const gloss = locale === 'ckb' ? 'ckb' : 'fa';
  const pool: Array<QuizQuestion & { topic: string }> = merged
    .slice(0, poolSize)
    .map((q) => ({
      id: q.id,
      topic: q.topic,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: glossOf(q.explanation, gloss) || q.explanation.en,
    }));

  return (
    <QuizSession
      pool={pool}
      want={want}
      seed={seed}
      locale={locale}
      explanationLang={locale}
      backHref={backHref}
      labels={{
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
