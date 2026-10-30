'use client';

import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { IconCheck, IconRefresh } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * A matching game: pair each English word with its meaning.
 *
 * Deliberately small in scope — the brief asks for "a simple matching/quiz
 * game". Rounds are a fixed size so a 102-word category is still playable.
 *
 * The first round is derived deterministically from the props, so the server
 * and the client render identical markup and hydration is clean. The server
 * shuffles the pairs it passes in, which is what makes that first round differ
 * between visits; reshuffling happens only in an event handler afterwards,
 * never during render or in an effect.
 */

export type MatchPair = {
  id: string;
  word: string;
  meaning: string;
};

export type MatchLabels = {
  prompt: string;
  correct: string;
  wrong: string;
  newRound: string;
  finished: string;
};

/**
 * A score is a left-to-right run. Written as bare text inside an RTL page the
 * bidi algorithm reorders it, so "0 / 6" appears as "6 / 0" — which is simply
 * wrong, not merely ugly. Isolating it keeps the order, and the digits are
 * localised because this is display text.
 */
function Score({
  value,
  total,
  locale,
}: {
  value: number;
  total: number;
  locale: string;
}) {
  const format = (n: number) => new Intl.NumberFormat(locale).format(n);
  return (
    <bdi dir="ltr">
      {format(value)} / {format(total)}
    </bdi>
  );
}

const ROUND_SIZE = 6;

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Offsets the options against the prompts so the answer is never simply the
 * first button. Deterministic, so it is safe to compute during render.
 */
function rotate<T>(items: T[], by: number): T[] {
  if (items.length === 0) return items;
  const n = ((by % items.length) + items.length) % items.length;
  return [...items.slice(n), ...items.slice(0, n)];
}

function buildRound(pairs: MatchPair[], shuffled: boolean) {
  const picked = (shuffled ? shuffle(pairs) : pairs).slice(
    0,
    Math.min(ROUND_SIZE, pairs.length)
  );
  return {
    round: picked,
    options: shuffled ? shuffle(picked) : rotate(picked, 2),
  };
}

export function MatchingGame({
  pairs,
  labels,
  glossLang,
  locale,
}: {
  pairs: MatchPair[];
  labels: MatchLabels;
  glossLang: 'fa' | 'ckb';
  locale: string;
}) {
  // Lazy initialiser, not an effect: the first round is a pure function of the
  // props, so it is identical on the server and on the client.
  const [state, setState] = useState(() => buildRound(pairs, false));
  const [matched, setMatched] = useState<ReadonlySet<string>>(() => new Set());
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const newRound = useCallback(() => {
    setState(buildRound(pairs, true));
    setMatched(new Set());
    setWrongId(null);
    setAttempts(0);
  }, [pairs]);

  const current = useMemo(
    () => state.round.find((p) => !matched.has(p.id)) ?? null,
    [state.round, matched]
  );

  const done = state.round.length > 0 && matched.size === state.round.length;

  function choose(option: MatchPair) {
    if (!current || matched.has(option.id)) return;
    setAttempts((n) => n + 1);

    if (option.id === current.id) {
      setMatched((prev) => new Set(prev).add(option.id));
      setWrongId(null);
    } else {
      setWrongId(option.id);
      // Clear the wrong mark so the reader can try again.
      window.setTimeout(() => setWrongId(null), 700);
    }
  }

  if (state.round.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-[var(--container-quiz)]">
      <div className="border-outline-variant/60 bg-surface-1 dark:bg-surface-2 rounded-[var(--radius-card)] border p-6">
        {done ? (
          <div className="py-8 text-center">
            <IconCheck className="text-correct mx-auto size-10" />
            <p className="mt-3 text-[length:var(--text-h3)] font-bold">
              {labels.finished}
            </p>
            <p className="text-on-surface-variant mt-1">
              <Score value={state.round.length} total={attempts} locale={locale} />
            </p>
            <Button onClick={newRound} className="mt-6">
              <IconRefresh className="size-5" />
              {labels.newRound}
            </Button>
          </div>
        ) : (
          <>
            <p className="text-on-surface-variant text-[length:var(--text-caption)] font-semibold">
              {labels.prompt}
            </p>
            <p
              lang="en"
              dir="ltr"
              className="mt-2 text-center text-[length:var(--text-h1)] font-bold"
            >
              {current?.word}
            </p>

            <p aria-live="polite" className="sr-only">
              {wrongId ? labels.wrong : ''}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {state.options.map((option) => {
                const isMatched = matched.has(option.id);
                const isWrong = wrongId === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => choose(option)}
                    disabled={isMatched}
                    className={cn(
                      'flex min-h-14 items-center justify-center rounded-[var(--radius-input)] border-2 px-4 py-3 text-center',
                      'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-enter)]',
                      isMatched &&
                        'border-correct bg-correct-container text-on-correct-container opacity-60',
                      isWrong &&
                        'border-error bg-error-container text-on-error-container',
                      !isMatched &&
                        !isWrong &&
                        'border-outline-variant bg-surface-2 hover:border-primary/60 hover:bg-surface-3 dark:bg-surface-3'
                    )}
                  >
                    <bdi lang={glossLang}>{option.meaning}</bdi>
                  </button>
                );
              })}
            </div>

            <p className="text-on-surface-variant mt-6 text-center text-[length:var(--text-caption)]">
              <Score value={matched.size} total={state.round.length} locale={locale} />
            </p>
          </>
        )}
      </div>
    </div>
  );
}
