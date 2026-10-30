'use client';

import type { Route } from 'next';
import { useMemo, useRef, useState } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { IconCheck, IconCross, IconRefresh } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { formatClient } from '@/lib/i18n/client-format';

/**
 * The grammar quiz.
 *
 * Scoring, option order and what counts as final are fixed by the app — see
 * src/lib/quiz/scoring.ts and docs/app-inventory.md §4.1. The rules that matter
 * visually here:
 *   - options render in option1→option4 order and are never shuffled;
 *   - an answer is final once chosen;
 *   - the explanation appears directly under the chosen option, so the reader
 *     never scrolls back up to see what they picked.
 */

export type QuizQuestion = {
  id: number;
  questionText: string;
  options: Array<{ key: string; text: string }>;
  correctAnswer: string;
  /** Already resolved to the reader's language on the server. */
  explanation: string;
};

/**
 * Labels are plain strings, never functions: functions cannot be passed from a
 * Server Component to a Client Component. The two that depend on runtime state
 * arrive as raw ICU messages and are formatted here with `formatClient`.
 */
export type QuizLabels = {
  /** ICU, e.g. "Question {current} / {total}". */
  progressTemplate: string;
  correct: string;
  wrong: string;
  correctAnswerLabel: string;
  next: string;
  finish: string;
  /** ICU, e.g. "You got {score} out of {total} correct." */
  scoreTemplate: string;
  retryWrong: string;
  restart: string;
  backToTopics: string;
};

/** The app's `isCorrectKey`: trimmed, case-insensitive, empty is never right. */
function isCorrectKey(correctAnswer: string, selected: string | undefined): boolean {
  const a = correctAnswer.trim().toLowerCase();
  const b = (selected ?? '').trim().toLowerCase();
  return a.length > 0 && a === b;
}

export function Quiz({
  questions,
  labels,
  explanationLang,
  locale,
  backHref,
}: {
  questions: QuizQuestion[];
  labels: QuizLabels;
  explanationLang: 'en' | 'fa' | 'ckb';
  locale: string;
  backHref: Route;
}) {
  const [pool, setPool] = useState(questions);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [done, setDone] = useState(false);
  const liveRef = useRef<HTMLParagraphElement>(null);

  const total = pool.length;
  const question = pool[index];
  const selected = question ? answers[index] : undefined;
  const answered = selected !== undefined;

  const score = useMemo(
    () =>
      pool.reduce(
        (sum, q, i) => (isCorrectKey(q.correctAnswer, answers[i]) ? sum + 1 : sum),
        0
      ),
    [pool, answers]
  );

  function choose(key: string) {
    // An answer is final, exactly as in the app's `_onSelect`.
    if (answered) return;
    setAnswers((prev) => ({ ...prev, [index]: key }));
  }

  function advance() {
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  function restart(subset: QuizQuestion[]) {
    setPool(subset);
    setIndex(0);
    setAnswers({});
    setDone(false);
  }

  if (done) {
    const wrong = pool.filter((q, i) => !isCorrectKey(q.correctAnswer, answers[i]));
    return (
      <ScoreSummary
        score={score}
        total={total}
        wrongCount={wrong.length}
        labels={labels}
        locale={locale}
        backHref={backHref}
        onRetryWrong={() => restart(wrong)}
        onRestart={() => restart(questions)}
      />
    );
  }

  if (!question) return null;

  const correct = answered && isCorrectKey(question.correctAnswer, selected);
  const progressLabel = formatClient(labels.progressTemplate, locale, {
    current: index + 1,
    total,
  });
  const correctText =
    question.options.find((o) => o.key.toLowerCase() === question.correctAnswer.toLowerCase())
      ?.text ?? '';

  return (
    <div className="mx-auto w-full max-w-[var(--container-quiz)]">
      <div className="mb-5">
        <p className="mb-2 text-[length:var(--text-label)] font-semibold text-on-surface-variant">
          {progressLabel}
        </p>
        <div
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={progressLabel}
          className="h-1.5 overflow-hidden rounded-full bg-surface-4"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-[var(--duration-base)] ease-[var(--ease-enter)]"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-outline-variant/60 bg-surface-1 p-6 dark:bg-surface-2">
        {/* Questions and options are always English. */}
        <h2 lang="en" dir="ltr" className="text-[length:var(--text-h3)] leading-relaxed">
          {question.questionText}
        </h2>

        <div className="mt-6 space-y-3" role="group">
          {question.options.map((option) => {
            const isChosen = selected === option.key;
            const isAnswer =
              option.key.toLowerCase() === question.correctAnswer.toLowerCase();

            // After answering, mark the right answer and the wrong pick. Never
            // by colour alone — each carries an icon and a text label.
            const showCorrect = answered && isAnswer;
            const showWrong = answered && isChosen && !isAnswer;

            return (
              <button
                key={option.key}
                type="button"
                lang="en"
                dir="ltr"
                onClick={() => choose(option.key)}
                disabled={answered}
                aria-pressed={isChosen}
                className={cn(
                  'flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-input)] border-2 px-4 py-3 text-start',
                  'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-enter)]',
                  !answered &&
                    'border-outline-variant bg-surface-2 hover:border-primary/60 hover:bg-surface-3 dark:bg-surface-3',
                  showCorrect && 'border-correct bg-correct-container text-on-correct-container',
                  showWrong && 'border-error bg-error-container text-on-error-container',
                  answered &&
                    !showCorrect &&
                    !showWrong &&
                    'border-outline-variant/50 bg-surface-2 opacity-60 dark:bg-surface-3',
                  answered && 'cursor-default'
                )}
              >
                <span className="min-w-0 flex-1">{option.text}</span>
                {showCorrect ? <IconCheck className="size-5 shrink-0" /> : null}
                {showWrong ? <IconCross className="size-5 shrink-0" /> : null}
              </button>
            );
          })}
        </div>

        {answered ? (
          <div
            className={cn(
              'mt-6 rounded-[var(--radius-input)] p-4',
              correct
                ? 'bg-correct-container text-on-correct-container'
                : 'bg-error-container text-on-error-container'
            )}
          >
            <p className="flex items-center gap-2 font-bold">
              {correct ? (
                <IconCheck className="size-5" />
              ) : (
                <IconCross className="size-5" />
              )}
              {correct ? labels.correct : labels.wrong}
            </p>

            {!correct && correctText ? (
              <p className="mt-1">
                {labels.correctAnswerLabel}{' '}
                <bdi lang="en" dir="ltr" className="font-semibold">
                  {correctText}
                </bdi>
              </p>
            ) : null}

            {question.explanation ? (
              <p
                lang={explanationLang}
                dir={explanationLang === 'en' ? 'ltr' : 'rtl'}
                className="mt-2"
              >
                {question.explanation}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Correctness is announced, not only shown. */}
        <p ref={liveRef} aria-live="polite" className="sr-only">
          {answered ? (correct ? labels.correct : labels.wrong) : ''}
        </p>

        {answered ? (
          <Button onClick={advance} fullWidth className="mt-6">
            {index + 1 >= total ? labels.finish : labels.next}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ScoreSummary({
  score,
  total,
  wrongCount,
  labels,
  locale,
  backHref,
  onRetryWrong,
  onRestart,
}: {
  score: number;
  total: number;
  wrongCount: number;
  labels: QuizLabels;
  locale: string;
  backHref: Route;
  onRetryWrong: () => void;
  onRestart: () => void;
}) {
  const ratio = total === 0 ? 0 : score / total;

  return (
    <div className="mx-auto w-full max-w-[var(--container-quiz)]">
      <div className="rounded-[var(--radius-card)] border border-outline-variant/60 bg-surface-1 p-8 text-center dark:bg-surface-2">
        <p className="text-[length:var(--text-display)] font-bold text-primary">
          {score} / {total}
        </p>
        <p className="mt-2 text-on-surface-variant">
          {formatClient(labels.scoreTemplate, locale, { score, total })}
        </p>

        <div
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={total}
          className="mx-auto mt-6 h-2 max-w-sm overflow-hidden rounded-full bg-surface-4"
        >
          <div
            className="h-full rounded-full bg-correct transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-enter)]"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {wrongCount > 0 ? (
            <Button onClick={onRetryWrong}>{labels.retryWrong}</Button>
          ) : null}
          <Button variant="secondary" onClick={onRestart}>
            <IconRefresh className="size-5" />
            {labels.restart}
          </Button>
          <ButtonLink href={backHref} variant="ghost">
            {labels.backToTopics}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
