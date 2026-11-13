'use client';

import type { Route } from 'next';
import { useMemo, useSyncExternalStore } from 'react';

import {
  Quiz,
  type QuizLabels,
  type QuizQuestion,
} from '@/components/features/grammar/quiz';
import type { Locale } from '@/lib/i18n/config';
import {
  frozenProgressStore,
  markAttempted,
  solvedFromSnapshot,
} from '@/lib/quiz/progress';
import { pickSession } from '@/lib/quiz/session';

type PoolQuestion = QuizQuestion & { topic: string };

/**
 * Chooses the session from the pool the server sent.
 *
 * This has to happen in the browser: the app prefers questions you have not
 * attempted yet, and that record lives in this browser's storage, which the
 * server cannot read. Picking on the server would either ignore progress or
 * leak one reader's progress into a cache entry everyone shares.
 *
 * The server renders a session as if nothing had been attempted, which is what
 * a first-time reader gets anyway, so the first paint is real content rather
 * than a skeleton. Hydration starts from that same assumption and then re-picks
 * from real storage — before the reader can answer anything. See
 * `getServerSnapshot` in progress.ts for why that ordering is safe.
 */
export function QuizSession({
  pool,
  want,
  seed,
  locale,
  backHref,
  labels,
}: {
  pool: PoolQuestion[];
  want: number;
  seed: number;
  locale: Locale;
  backHref: Route;
  labels: QuizLabels;
}) {
  /*
   * The frozen store, not the live one: a session is fixed once it starts, so
   * recording an answer must not reshuffle the questions that are left.
   */
  const snapshot = useSyncExternalStore(
    frozenProgressStore.subscribe,
    frozenProgressStore.getSnapshot,
    frozenProgressStore.getServerSnapshot
  );

  const poolIds = useMemo(() => pool.map((q) => q.id), [pool]);
  const solved = useMemo(
    () => solvedFromSnapshot(snapshot, poolIds),
    [snapshot, poolIds]
  );

  const questions = useMemo(
    () => pickSession(pool, solved, want, seed),
    [pool, solved, want, seed]
  );

  return (
    <Quiz
      questions={questions}
      locale={locale}
      backHref={backHref}
      labels={labels}
      // Mirrors the app's `markAttempted`: a question counts as seen the moment
      // it is answered, right or wrong.
      onAnswer={(index) => {
        const question = questions[index];
        if (question) markAttempted(question.topic, question.id);
      }}
    />
  );
}
