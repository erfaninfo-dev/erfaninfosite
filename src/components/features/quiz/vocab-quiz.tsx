'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { formatClient } from '@/lib/i18n/client-format';
import type { Locale } from '@/lib/i18n/config';
import { loadQuizWords, type QuizWord } from '@/lib/vocab/quiz-words';

/**
 * Book vocabulary quiz.
 *
 * The app builds multiple choice from the book's own words: the headword is
 * the prompt and three other meanings are the wrong answers. Nothing here is
 * stored; a new start shuffles again.
 */

type UnitChoice = { unit: number; label: string };

type Question = {
  prompt: string;
  promptEnglish: boolean;
  answer: string;
  options: string[];
};

export function VocabQuiz({
  bookId,
  units,
  locale,
  labels,
  initialUnits = [],
  section,
}: {
  bookId: number;
  units: UnitChoice[];
  locale: Locale;
  initialUnits?: number[];
  /** When opened from one section, only that section's words are used. */
  section?: number;
  labels: {
    start: string;
    checking: string;
    next: string;
    score: string;
    progress: string;
    empty: string;
    again: string;
    correct: string;
    wrong: string;
  };
}) {
  const [picked, setPicked] = useState<number[]>(() => {
    const known = new Set(units.map((unit) => unit.unit));
    const preset = initialUnits.filter((unit) => known.has(unit));
    return preset.length > 0 ? preset : units.map((unit) => unit.unit);
  });
  const [count, setCount] = useState(20);
  const [phase, setPhase] = useState<'setup' | 'loading' | 'play' | 'done'>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [right, setRight] = useState(0);

  const current = questions[index];

  async function start() {
    setPhase('loading');
    const words = await loadQuizWords(bookId, picked, locale, section);
    const built = buildQuestions(words, count);
    if (built.length === 0) {
      setQuestions([]);
      setPhase('done');
      return;
    }
    setQuestions(built);
    setIndex(0);
    setChoice(null);
    setRight(0);
    setPhase('play');
  }

  function answer(option: string) {
    if (!current || choice) return;
    setChoice(option);
    if (option === current.answer) setRight((value) => value + 1);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setPhase('done');
      return;
    }
    setIndex((value) => value + 1);
    setChoice(null);
  }

  if (phase === 'done') {
    return (
      <div className="mx-auto max-w-[var(--container-quiz)] py-10 text-center">
        <p className="text-on-surface text-lg font-extrabold">
          {questions.length === 0
            ? labels.empty
            : formatClient(labels.score, locale, { solved: right, total: questions.length })}
        </p>
        <Button type="button" className="mt-6" onClick={() => setPhase('setup')}>
          {labels.again}
        </Button>
      </div>
    );
  }

  if (phase === 'play' && current) {
    return (
      <div className="mx-auto flex w-full max-w-[var(--container-quiz)] flex-col gap-3">
        <p className="text-on-surface-variant text-sm font-semibold">
          {formatClient(labels.progress, locale, { current: index + 1, total: questions.length })}
        </p>
        <h2 className="text-on-surface text-2xl font-extrabold">
          <bdi
            lang={current.promptEnglish ? 'en' : undefined}
            dir={current.promptEnglish ? 'ltr' : 'rtl'}
            className={cn('block', !current.promptEnglish && 'text-right')}
          >
            {current.prompt}
          </bdi>
        </h2>
        <div className="flex flex-col gap-2">
          {current.options.map((option) => {
            const selected = choice === option;
            const isAnswer = option === current.answer;
            const show = choice != null;
            return (
              <button
                key={option}
                type="button"
                disabled={choice != null}
                onClick={() => answer(option)}
                className={cn(
                  'min-h-12 rounded-[var(--radius-card)] border px-4 text-start font-semibold',
                  !show && 'border-outline-variant bg-surface-1',
                  show && isAnswer && 'border-transparent bg-correct-container text-on-correct-container',
                  show && selected && !isAnswer && 'border-transparent bg-error-container text-on-error-container'
                )}
              >
                <bdi
                  dir={current.promptEnglish ? 'rtl' : 'ltr'}
                  className={cn('block w-full', current.promptEnglish ? 'text-right' : 'text-left')}
                >
                  {option}
                </bdi>
              </button>
            );
          })}
        </div>
        {choice ? (
          <p className="text-sm font-bold">
            {choice === current.answer ? labels.correct : labels.wrong}
          </p>
        ) : null}
        {choice ? (
          <Button type="button" onClick={next}>
            {labels.next}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[var(--container-quiz)] flex-col gap-4">
      <ul className="jelly-card overflow-hidden rounded-[var(--radius-card)]">
        {units.map((unit) => {
          const on = picked.includes(unit.unit);
          return (
            <li key={unit.unit}>
              <label className="flex min-h-12 items-center gap-3 px-4">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setPicked((currentUnits) =>
                      on
                        ? currentUnits.filter((value) => value !== unit.unit)
                        : [...currentUnits, unit.unit]
                    )
                  }
                  className="size-5 accent-[var(--color-primary)]"
                />
                <span className="font-semibold">{unit.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <label className="text-on-surface flex items-center justify-between gap-3 text-sm font-semibold">
        <span>{count}</span>
        <input
          type="range"
          min={5}
          max={30}
          step={5}
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
          className="w-full"
        />
      </label>
      <Button type="button" disabled={picked.length === 0 || phase === 'loading'} onClick={start}>
        {phase === 'loading' ? labels.checking : labels.start}
      </Button>
    </div>
  );
}

function buildQuestions(words: QuizWord[], count: number): Question[] {
  const pool = words.filter((word) => word.word && word.meaning);
  if (pool.length < 4) return [];
  const picked = shuffle(pool).slice(0, Math.min(count, pool.length));
  const questions: Question[] = [];
  picked.forEach((word, index) => {
    const meaningFirst = index % 2 === 1;
    const field = meaningFirst ? 'word' : 'meaning';
    const wrongs = distractors(pool, word, field);
    if (wrongs.length < 3) return;
    questions.push({
      prompt: meaningFirst ? word.meaning : word.word,
      promptEnglish: !meaningFirst,
      answer: word[field],
      options: shuffle([word[field], ...wrongs]),
    });
  });
  return questions;
}

/** Prefer another word from the same section, then the same unit, then the book. */
function distractors(pool: QuizWord[], word: QuizWord, field: 'word' | 'meaning'): string[] {
  const sameSection = pool.filter(
    (item) => item.unit === word.unit && item.section === word.section && item.id !== word.id
  );
  const sameUnit = pool.filter((item) => item.unit === word.unit && item.id !== word.id);
  const picked: string[] = [];
  for (const source of [shuffle(sameSection), shuffle(sameUnit), shuffle(pool)]) {
    for (const item of source) {
      if (picked.length >= 3) return picked;
      const value = item[field];
      if (!value || value === word[field] || picked.includes(value)) continue;
      picked.push(value);
    }
  }
  return picked;
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
