'use client';

import { useState } from 'react';

import { Flashcards, type FlashcardData, type FlashcardLabels } from '@/components/features/flashcards/flashcards';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { formatClient } from '@/lib/i18n/client-format';
import type { Locale } from '@/lib/i18n/config';

/**
 * The app's flashcard setup, then the existing card pass.
 *
 * Pool is all words or the ones the API marks important. Favorites and the
 * spaced-repetition schedule stay on the device in the app, with no server
 * copy, so they are not offered here.
 */

export type SetupCard = FlashcardData & { important: boolean };

type Pool = 'all' | 'important';
type Direction = 'word' | 'meaning';

export function FlashcardSetup({
  cards,
  labels,
  glossLang,
  locale,
  progressTemplate,
}: {
  cards: SetupCard[];
  labels: FlashcardLabels & {
    title: string;
    deck: string;
    all: string;
    important: string;
    order: string;
    shuffle: string;
    direction: string;
    wordToMeaning: string;
    meaningToWord: string;
    start: string;
    empty: string;
  };
  glossLang: 'fa' | 'ckb';
  locale: Locale;
  progressTemplate: string;
}) {
  const [pool, setPool] = useState<Pool>('all');
  const [shuffle, setShuffle] = useState(false);
  const [direction, setDirection] = useState<Direction>('word');
  const [deck, setDeck] = useState<FlashcardData[] | null>(null);

  const importantCount = cards.filter((card) => card.important).length;
  const selected = pool === 'important' ? cards.filter((card) => card.important) : cards;

  if (deck) {
    return (
      <Flashcards
        cards={deck}
        labels={{
          ...labels,
          progress: formatClient(progressTemplate, locale, { count: deck.length }),
        }}
        glossLang={glossLang}
      />
    );
  }

  function start() {
    const next = selected.map((card) =>
      direction === 'word'
        ? card
        : { ...card, front: card.back, back: card.front }
    );
    setDeck(shuffle ? shuffleCards(next) : next);
  }

  return (
    <div className="mx-auto flex w-full max-w-[var(--container-quiz)] flex-col gap-4">
      <p className="text-on-surface text-sm font-bold">{labels.deck}</p>
      <div className="jelly-card overflow-hidden rounded-[var(--radius-card)]">
        <Choice
          pressed={pool === 'all'}
          label={labels.all}
          count={cards.length}
          onClick={() => setPool('all')}
        />
        <Choice
          pressed={pool === 'important'}
          label={labels.important}
          count={importantCount}
          onClick={() => setPool('important')}
        />
      </div>

      <p className="text-on-surface text-sm font-bold">{labels.order}</p>
      <label className="jelly-card flex min-h-12 items-center justify-between gap-3 rounded-[var(--radius-card)] px-4">
        <span className="font-semibold">{labels.shuffle}</span>
        <input
          type="checkbox"
          checked={shuffle}
          onChange={(event) => setShuffle(event.target.checked)}
          className="size-5 accent-[var(--color-primary)]"
        />
      </label>

      <p className="text-on-surface text-sm font-bold">{labels.direction}</p>
      <div className="jelly-card overflow-hidden rounded-[var(--radius-card)]">
        <Choice
          pressed={direction === 'word'}
          label={labels.wordToMeaning}
          onClick={() => setDirection('word')}
        />
        <Choice
          pressed={direction === 'meaning'}
          label={labels.meaningToWord}
          onClick={() => setDirection('meaning')}
        />
      </div>

      {selected.length === 0 ? (
        <p className="text-on-surface-variant px-2 py-6 text-center">{labels.empty}</p>
      ) : (
        <Button type="button" onClick={start}>
          {labels.start}
        </Button>
      )}
    </div>
  );
}

function Choice({
  pressed,
  label,
  count,
  onClick,
}: {
  pressed: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'flex min-h-12 w-full items-center justify-between gap-3 px-4 text-start font-semibold',
        pressed ? 'bg-primary-container text-on-primary-container' : 'text-on-surface'
      )}
    >
      <span>{label}</span>
      {count != null ? <span className="text-sm">{count}</span> : null}
    </button>
  );
}

function shuffleCards(cards: FlashcardData[]): FlashcardData[] {
  const out = [...cards];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
