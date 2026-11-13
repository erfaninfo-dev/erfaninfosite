'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { IconArrowBack, IconChevron, IconRefresh } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

export type FlashcardData = {
  id: string;
  /** Always English — the source language. */
  front: string;
  /** The gloss, in the reader's language. */
  back: string;
  /** Optional example sentences, shown once the card is turned. */
  exampleEn: string;
  exampleGloss: string;
};

export type FlashcardLabels = {
  progress: string;
  reveal: string;
  next: string;
  previous: string;
  restart: string;
  finished: string;
  notSynced: string;
};

/**
 * Flashcards over a word set.
 *
 * Deliberately *not* spaced repetition. The app's SM-2 state lives on the
 * device with no server endpoint behind it, so web progress could never agree
 * with the phone — see docs/app-inventory.md §4.2. Rather than invent a second,
 * silently diverging schedule, this is a plain pass through the set, and the UI
 * says plainly that progress stays in this browser.
 */
export function Flashcards({
  cards,
  labels,
  glossLang,
}: {
  cards: FlashcardData[];
  labels: FlashcardLabels;
  glossLang: 'fa' | 'ckb';
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const total = cards.length;
  const card = cards[index];

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(Math.max(i + delta, 0), total - 1));
      setRevealed(false);
    },
    [total]
  );

  // Keyboard: space/enter turns the card, arrows move. The quiz and the cards
  // must both be fully operable without a mouse.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setRevealed((v) => !v);
      } else if (event.key === 'ArrowRight') {
        go(document.dir === 'rtl' ? -1 : 1);
      } else if (event.key === 'ArrowLeft') {
        go(document.dir === 'rtl' ? 1 : -1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const progress = useMemo(
    () => (total === 0 ? 0 : ((index + 1) / total) * 100),
    [index, total]
  );

  if (!card) return null;

  const atEnd = index === total - 1;

  return (
    <div className="mx-auto w-full max-w-[var(--container-quiz)]">
      <div className="mb-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="text-on-surface-variant text-[length:var(--text-label)] font-semibold">
            {labels.progress}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={labels.progress}
          className="bg-surface-4 h-1.5 overflow-hidden rounded-full"
        >
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-[var(--duration-base)] ease-[var(--ease-enter)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        aria-expanded={revealed}
        className={cn(
          'flex min-h-64 w-full flex-col items-center justify-center gap-4 p-8 text-center',
          'border-outline-variant/60 bg-surface-1 dark:bg-surface-2 rounded-[var(--radius-card)] border',
          'hover:bg-surface-2 dark:hover:bg-surface-3 transition-colors duration-[var(--duration-fast)]'
        )}
      >
        <bdi lang="en" dir="ltr" className="text-[length:var(--text-h1)] font-bold">
          {card.front}
        </bdi>

        {revealed ? (
          <div className="w-full space-y-3">
            <bdi
              lang={glossLang}
              dir="rtl"
              className="text-primary block w-full text-right text-[length:var(--text-h3)]"
            >
              {card.back}
            </bdi>
            {card.exampleEn ? (
              <p lang="en" dir="ltr" className="text-on-surface-variant">
                {card.exampleEn}
              </p>
            ) : null}
            {card.exampleGloss && card.exampleGloss !== card.exampleEn ? (
              <p lang={glossLang} dir="rtl" className="text-on-surface-variant w-full text-right">
                {card.exampleGloss}
              </p>
            ) : null}
          </div>
        ) : (
          <span className="text-on-surface-variant text-[length:var(--text-label)]">
            {labels.reveal}
          </span>
        )}
      </button>

      {/* Announce the turned side, so a screen reader is not left behind. */}
      <p aria-live="polite" className="sr-only">
        {revealed ? card.back : ''}
      </p>

      <div className="mt-5 flex items-center gap-3">
        <Button
          variant="ghost"
          size="md"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="flex-1"
        >
          <IconArrowBack className="size-5" />
          {labels.previous}
        </Button>

        {atEnd ? (
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setIndex(0);
              setRevealed(false);
            }}
            className="flex-1"
          >
            <IconRefresh className="size-5" />
            {labels.restart}
          </Button>
        ) : (
          <Button size="md" onClick={() => go(1)} className="flex-1">
            {labels.next}
            <IconChevron className="size-5" />
          </Button>
        )}
      </div>

      <p className="text-on-surface-variant mt-6 text-center text-[length:var(--text-caption)]">
        {labels.notSynced}
      </p>
    </div>
  );
}
