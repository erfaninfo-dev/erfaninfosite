'use client';

import type { Route } from 'next';
import { useMemo, useRef, useState } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { IconCheck, IconCross, IconLightbulb, IconRefresh } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { formatClient } from '@/lib/i18n/client-format';
import { defaultGlossFor, NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';

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
  explanation: { en: string; fa: string; ckb: string };
};

type ExplanationTab = 'fa' | 'ckb';

function explanationForTab(
  explanation: QuizQuestion['explanation'],
  tab: ExplanationTab
): { text: string; lang: 'fa' | 'ckb' | 'en' } {
  const fa = explanation.fa.trim();
  const ckb = explanation.ckb.trim();
  const en = explanation.en.trim();
  if (tab === 'fa') {
    if (fa) return { text: fa, lang: 'fa' };
    if (ckb) return { text: ckb, lang: 'ckb' };
    if (en) return { text: en, lang: 'en' };
    return { text: '', lang: 'fa' };
  }
  if (ckb) return { text: ckb, lang: 'ckb' };
  if (fa) return { text: fa, lang: 'fa' };
  if (en) return { text: en, lang: 'en' };
  return { text: '', lang: 'ckb' };
}

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
  explanationHeading: string;
  explanationTabFa: string;
  explanationTabCkb: string;
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
  locale,
  backHref,
  onAnswer,
}: {
  questions: QuizQuestion[];
  labels: QuizLabels;
  locale: Locale;
  backHref: Route;
  /** Called once per question, the first time it is answered. */
  onAnswer?: (index: number, key: string) => void;
}) {
  const [pool, setPool] = useState(questions);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [done, setDone] = useState(false);
  // Kurdish UI opens on the Kurdish explanation; fa/en open on Persian —
  // same default as Learn / gloss (defaultGlossFor).
  const defaultExplanationTab = defaultGlossFor(locale);
  const [explanationTab, setExplanationTab] =
    useState<ExplanationTab>(defaultExplanationTab);
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
    onAnswer?.(index, key);
  }

  function advance() {
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setExplanationTab(defaultExplanationTab);
    }
  }

  function restart(subset: QuizQuestion[]) {
    setPool(subset);
    setIndex(0);
    setAnswers({});
    setDone(false);
    setExplanationTab(defaultExplanationTab);
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
    question.options.find(
      (o) => o.key.toLowerCase() === question.correctAnswer.toLowerCase()
    )?.text ?? '';
  const resolvedExplanation = answered
    ? explanationForTab(question.explanation, explanationTab)
    : null;

  return (
    <div className="mx-auto w-full max-w-[var(--container-quiz)]">
      <div className="mb-4">
        <p className="text-on-surface-variant mb-2 text-center text-[length:var(--text-label)] font-semibold">
          {progressLabel}
        </p>
        <div
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={progressLabel}
          className="bg-surface-4 h-2 overflow-hidden rounded-full"
        >
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-[var(--duration-base)] ease-[var(--ease-enter)]"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-surface-1 shadow-[var(--shadow-soft)] rounded-[1.25rem] p-5 sm:p-6">
        {/* Questions and options are always English. */}
        <h2
          lang="en"
          dir="ltr"
          className="text-on-surface text-center text-[length:var(--text-h3)] leading-relaxed font-bold"
        >
          {question.questionText}
        </h2>

        <div className="mt-5 space-y-2.5" role="group">
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
                  'flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 px-4 py-3 text-center',
                  'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-enter)]',
                  !answered &&
                    'border-outline-variant bg-surface-2 hover:border-primary/60 hover:bg-surface-3 dark:bg-surface-3',
                  showCorrect &&
                    'border-correct bg-correct-container text-on-correct-container',
                  showWrong && 'border-error bg-error-container text-on-error-container',
                  answered &&
                    !showCorrect &&
                    !showWrong &&
                    'border-outline-variant/50 bg-surface-2 dark:bg-surface-3 opacity-60',
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
          /*
           * Translated verdict card (هەڵە / نادرست, …). Must be RTL under
           * fa/ckb even though the grammar page is an LTR island.
           */
          <div
            data-quiz-feedback=""
            dir={locale === 'en' ? 'ltr' : 'rtl'}
            lang={locale === 'en' ? undefined : locale}
            className={cn(
              'mt-6 rounded-[var(--radius-input)] p-4 text-start',
              correct
                ? 'bg-correct-container text-on-correct-container'
                : 'bg-error-container text-on-error-container'
            )}
          >
            <p className="flex w-full items-center justify-start gap-2 font-bold">
              {correct ? (
                <IconCheck className="size-5 shrink-0" />
              ) : (
                <IconCross className="size-5 shrink-0" />
              )}
              <span>{correct ? labels.correct : labels.wrong}</span>
            </p>

            {!correct && correctText ? (
              <p className="mt-1">
                <span>{labels.correctAnswerLabel}</span>{' '}
                <bdi lang="en" dir="ltr" className="font-semibold">
                  {correctText}
                </bdi>
              </p>
            ) : null}
          </div>
        ) : null}

        {answered && resolvedExplanation ? (
          /*
           * Grammar pages are an LTR island, but this card is translated UI +
           * Arabic-script copy — keep it RTL under fa/ckb (title, tabs, body).
           * English UI stays LTR; tab labels are still forced RTL below.
           */
          <div
            data-quiz-explanation=""
            dir={locale === 'en' ? 'ltr' : 'rtl'}
            lang={locale === 'en' ? undefined : locale}
            className="jelly-card mt-4 rounded-[var(--radius-card)] p-4 text-start"
          >
            <div className="text-primary mb-3 flex w-full items-center justify-start gap-2 font-extrabold">
              <IconLightbulb className="size-5 shrink-0" />
              <span>{labels.explanationHeading}</span>
            </div>
            <div
              dir="rtl"
              className="bg-surface-3 mb-5 grid grid-cols-2 gap-1 rounded-full p-1"
              role="tablist"
            >
              {(['fa', 'ckb'] as const).map((tab) => {
                const active = explanationTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setExplanationTab(tab)}
                    className={cn(
                      'min-h-10 rounded-full text-sm font-extrabold',
                      active
                        ? 'bg-primary text-on-primary shadow-[var(--shadow-soft)]'
                        : 'text-on-surface-variant'
                    )}
                  >
                    {tab === 'fa' ? labels.explanationTabFa : labels.explanationTabCkb}
                  </button>
                );
              })}
            </div>
            <p
              lang={resolvedExplanation.lang}
              dir={resolvedExplanation.lang === 'en' ? 'ltr' : 'rtl'}
              className={cn(
                'text-on-surface mt-1 text-base leading-relaxed',
                resolvedExplanation.lang === 'en' ? 'text-left' : 'text-right'
              )}
            >
              {resolvedExplanation.text || '—'}
            </p>
          </div>
        ) : null}

        {/* Correctness is announced, not only shown. */}
        <p ref={liveRef} aria-live="polite" className="sr-only">
          {answered ? (correct ? labels.correct : labels.wrong) : ''}
        </p>

        {answered ? (
          <Button onClick={advance} fullWidth className="mt-5 min-h-12 rounded-full">
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
  locale: Locale;
  backHref: Route;
  onRetryWrong: () => void;
  onRestart: () => void;
}) {
  const ratio = total === 0 ? 0 : score / total;

  return (
    <div className="mx-auto w-full max-w-[var(--container-quiz)]">
      <div className="border-outline-variant/60 bg-surface-1 dark:bg-surface-2 rounded-[var(--radius-card)] border p-8 text-center">
        {/*
          Isolated and forced LTR: a bare "17 / 20" inside an RTL page is
          reordered by the bidi algorithm into "20 / 17". Digits are localised
          because this is display text.
        */}
        <p className="text-primary text-[length:var(--text-display)] font-bold">
          <bdi dir="ltr">
            {new Intl.NumberFormat(NUMBER_LOCALE[locale]).format(score)} /{' '}
            {new Intl.NumberFormat(NUMBER_LOCALE[locale]).format(total)}
          </bdi>
        </p>
        <p className="text-on-surface-variant mt-2">
          {formatClient(labels.scoreTemplate, locale, { score, total })}
        </p>

        <div
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={total}
          className="bg-surface-4 mx-auto mt-6 h-2 max-w-sm overflow-hidden rounded-full"
        >
          <div
            className="bg-correct h-full rounded-full transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-enter)]"
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
