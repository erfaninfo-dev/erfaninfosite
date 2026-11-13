'use client';

import { useMemo, useState } from 'react';

import { IconBookmark, IconClose, IconFire, IconSearch } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import { SpeakButton } from '@/components/features/vocab/speak-button';
import { useWordMarks } from '@/components/features/vocab/word-marks';

/**
 * The idioms that open when a topic card is tapped.
 *
 * Same pieces as the app's idiom card: a number, the English idiom, speech,
 * the meaning, the gloss, the example, and a favorite mark. Illustrations stay
 * in the app's local assets, so the topic chip is text. Marks stay in this browser.
 */

export type IdiomCardData = {
  id: number;
  number: number;
  word: string;
  meaningEn: string;
  gloss: string;
  exampleEn: string;
  exampleGloss: string;
  topic: string;
};

export function IdiomCards({
  cards,
  locale,
  glossLang,
  labels,
}: {
  cards: IdiomCardData[];
  locale: Locale;
  glossLang: 'fa' | 'ckb';
  labels: {
    search: string;
    empty: string;
    clear: string;
    example: string;
    favorite: string;
    important: string;
    pronounceWord: string;
    pronounceExample: string;
  };
}) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      needle
        ? cards.filter((card) =>
            `${card.word} ${card.meaningEn} ${card.gloss}`.toLowerCase().includes(needle)
          )
        : cards,
    [cards, needle]
  );
  const numbers = new Intl.NumberFormat(NUMBER_LOCALE[locale]);
  const marks = useWordMarks();

  return (
    <div>
      <div className="relative mb-4">
        <IconSearch className="text-on-surface-variant pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.search}
          aria-label={labels.search}
          className="bg-surface-1 text-on-surface placeholder:text-on-surface-variant h-14 w-full rounded-full border-0 ps-12 pe-12 font-semibold shadow-[var(--shadow-soft)]"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={labels.clear}
            className="text-on-surface-variant absolute end-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full"
          >
            <IconClose className="size-4" />
          </button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="text-on-surface-variant px-6 py-16 text-center">{labels.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((card) => (
            <li key={card.id}>
              <article
                data-accent="1"
                dir="ltr"
                className="border-outline-variant/80 bg-surface-1 rounded-[1.5rem] border p-4 shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-start gap-3">
                  <span className="text-on-surface grid size-[3.25rem] shrink-0 place-items-center rounded-full border-4 border-[var(--accent)] text-base font-extrabold">
                    {numbers.format(card.number)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <h2 className="text-on-surface min-w-0 flex-1 text-lg leading-snug font-extrabold">
                        <bdi lang="en">{card.word}</bdi>
                      </h2>
                      <SpeakButton text={card.word} label={labels.pronounceWord} className="size-9" />
                    </div>
                    {card.meaningEn ? (
                      <p className="text-on-surface-variant mt-1 text-sm leading-snug">
                        <bdi lang="en">{card.meaningEn}</bdi>
                      </p>
                    ) : null}
                  </div>
                </div>

                {card.gloss ? (
                  <p lang={glossLang} dir="rtl" className="text-primary mt-3 text-right text-[0.9375rem] leading-snug font-bold">
                    {card.gloss}
                  </p>
                ) : null}

                {card.exampleEn || card.exampleGloss ? (
                  <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-[color-mix(in_oklab,var(--accent)_12%,var(--color-surface-1))] p-3">
                    <span className="bg-[var(--accent)] grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white">
                      “
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        dir={locale !== 'en' ? 'rtl' : 'ltr'}
                        className={cn(
                          'text-on-surface text-sm font-extrabold',
                          locale !== 'en' && 'text-right'
                        )}
                      >
                        {labels.example}
                      </p>
                      {card.exampleEn ? (
                        <div className="mt-1 flex items-start gap-2">
                          <p lang="en" className="text-on-surface-variant min-w-0 flex-1 text-sm italic">
                            {card.exampleEn}
                          </p>
                          <SpeakButton
                            text={card.exampleEn}
                            label={labels.pronounceExample}
                            voice
                            className="size-9"
                          />
                        </div>
                      ) : null}
                      {card.exampleGloss && card.exampleGloss !== card.exampleEn ? (
                        <p lang={glossLang} dir="rtl" className="text-primary mt-1.5 text-right text-sm font-bold">
                          {card.exampleGloss}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={marks.isFavorite(card.id)}
                    aria-label={labels.favorite}
                    title={labels.favorite}
                    onClick={() => marks.toggleFavorite(card.id)}
                    className={cn(
                      'grid size-10 place-items-center rounded-full',
                      marks.isFavorite(card.id)
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-3 text-on-surface-variant'
                    )}
                  >
                    <IconBookmark className={cn('size-5', marks.isFavorite(card.id) && 'fill-current')} />
                  </button>
                  <button
                    type="button"
                    aria-pressed={marks.isImportant(card.id, false)}
                    aria-label={labels.important}
                    title={labels.important}
                    onClick={() => marks.toggleImportant(card.id, false)}
                    className={cn(
                      'grid size-10 place-items-center rounded-full',
                      marks.isImportant(card.id, false)
                        ? 'bg-tertiary-container text-on-tertiary-container'
                        : 'bg-surface-3 text-on-surface-variant'
                    )}
                  >
                    <IconFire className={cn('size-5', marks.isImportant(card.id, false) && 'fill-current')} />
                  </button>
                </div>

                {card.topic ? (
                  <p className="border-outline-variant/70 text-on-surface-variant mt-3 inline-flex rounded-full border bg-[color-mix(in_oklab,var(--accent)_10%,var(--color-surface-1))] px-3 py-1 text-xs font-bold">
                    <bdi lang="en">{card.topic}</bdi>
                  </p>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
