'use client';

import { useState } from 'react';

import { EnglishWordTapText } from '@/components/features/vocab/english-word-tap';
import { SpeakButton } from '@/components/features/vocab/speak-button';
import { IconArrowBack, IconArticle, IconChevron, IconClose } from '@/components/ui/icons';
import { formatClient } from '@/lib/i18n/client-format';
import type { Locale } from '@/lib/i18n/config';
import type { SamplePair } from '@/lib/vocab/sample-pairs';
import type { CatalogEntry } from '@/lib/vocab/sample-word-lookup';

/**
 * One sample passage, as the app shows it on the Text tab.
 *
 * English and the gloss sit in pairs. Book mode turns those pairs into pages.
 * The speaker reads the English aloud. Highlights and the page-turn sound stay in the app.
 */

export type SampleReading = {
  id: number;
  title: string;
  pairs: SamplePair[];
  fallback: string | null;
};

export function SampleReader({
  samples,
  locale,
  glossLang,
  labels,
  bookId,
  unit,
  bookTitle,
  catalog,
  cardLabels,
}: {
  samples: SampleReading[];
  locale: Locale;
  glossLang: 'fa' | 'ckb';
  labels: {
    bookMode: string;
    pageTemplate: string;
    turnHint: string;
    previous: string;
    next: string;
    close: string;
    play: string;
  };
  bookId: number;
  unit: number;
  bookTitle: string;
  catalog: CatalogEntry[];
  cardLabels: {
    example: string;
    important: string;
    favorite: string;
    pronounceWord: string;
    pronounceExample: string;
    close: string;
    noMatches: string;
  };
}) {
  return (
    <div className="flex flex-col gap-3">
      {samples.map((sample) => (
        <SampleCard
          key={sample.id}
          sample={sample}
          locale={locale}
          glossLang={glossLang}
          labels={labels}
          bookId={bookId}
          unit={unit}
          bookTitle={bookTitle}
          catalog={catalog}
          cardLabels={cardLabels}
        />
      ))}
    </div>
  );
}

function SampleCard({
  sample,
  locale,
  glossLang,
  labels,
  bookId,
  unit,
  bookTitle,
  catalog,
  cardLabels,
}: {
  sample: SampleReading;
  locale: Locale;
  glossLang: 'fa' | 'ckb';
  labels: {
    bookMode: string;
    pageTemplate: string;
    turnHint: string;
    previous: string;
    next: string;
    close: string;
    play: string;
  };
  bookId: number;
  unit: number;
  bookTitle: string;
  catalog: CatalogEntry[];
  cardLabels: {
    example: string;
    important: string;
    favorite: string;
    pronounceWord: string;
    pronounceExample: string;
    close: string;
    noMatches: string;
  };
}) {
  const [page, setPage] = useState<number | null>(null);
  const open = page !== null;
  const current = open ? sample.pairs[page] : undefined;

  return (
    <article className="jelly-card rounded-[1.5rem] p-4">
      <div className="flex items-center gap-3">
        <span className="bg-primary-container text-on-primary-container grid size-[2.375rem] shrink-0 place-items-center rounded-xl">
          <IconArticle className="size-5" />
        </span>
        <h2 className="text-on-surface min-w-0 flex-1 truncate text-base leading-[1.15] font-extrabold">
          <bdi lang="en">{sample.title}</bdi>
        </h2>
      </div>

      {sample.fallback ? (
        <p className="text-on-surface-variant mt-3 text-xs">{sample.fallback}</p>
      ) : null}

      {sample.pairs.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(0)}
            className="bg-primary text-on-primary inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold"
          >
            {labels.bookMode}
          </button>
          <SpeakButton
            text={sample.pairs.map((pair) => pair.en).filter(Boolean).join('\n\n')}
            label={labels.play}
          />
        </div>
      ) : null}

      <div className="border-outline-variant/70 bg-surface-1 mt-3 rounded-2xl border p-4">
        {sample.pairs.map((pair, index) => (
          <Pair
            key={index}
            pair={pair}
            glossLang={glossLang}
            divided={index > 0}
            locale={locale}
            bookId={bookId}
            unit={unit}
            bookTitle={bookTitle}
            catalog={catalog}
            cardLabels={cardLabels}
          />
        ))}
      </div>

      {open && current ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labels.bookMode}
          className="fixed inset-0 z-40 grid place-items-center bg-black/45 p-4"
        >
          <div className="bg-surface-1 flex max-h-[85vh] w-full max-w-lg flex-col rounded-[1.5rem] p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-on-surface min-w-0 flex-1 truncate text-base font-extrabold">
                <bdi lang="en">{sample.title}</bdi>
              </h3>
              <button
                type="button"
                onClick={() => setPage(null)}
                aria-label={labels.close}
                className="text-on-surface-variant grid size-10 place-items-center rounded-full"
              >
                <IconClose className="size-5" />
              </button>
            </div>
            <p
              dir={locale === 'en' ? 'ltr' : 'rtl'}
              className={`text-on-surface-variant text-xs font-bold${locale === 'en' ? '' : ' text-right'}`}
            >
              {formatClient(labels.pageTemplate, locale, {
                current: page + 1,
                total: sample.pairs.length,
              })}
            </p>
            <div className="mt-4 min-h-0 flex-1 overflow-auto">
              <Pair
                pair={current}
                glossLang={glossLang}
                divided={false}
                locale={locale}
                bookId={bookId}
                unit={unit}
                bookTitle={bookTitle}
                catalog={catalog}
                cardLabels={cardLabels}
              />
            </div>
            <p
              dir={locale === 'en' ? 'ltr' : 'rtl'}
              className="text-on-surface-variant mt-4 text-center text-xs"
            >
              {labels.turnHint}
            </p>
            <div dir="ltr" className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPage((value) => (value === null ? 0 : Math.max(0, value - 1)))}
                disabled={page === 0}
                aria-label={labels.previous}
                className="bg-surface-3 text-on-surface inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-sm font-bold disabled:opacity-40"
              >
                <IconArrowBack className="size-4 !transform-none" />
                <span dir={locale === 'en' ? 'ltr' : 'rtl'}>{labels.previous}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((value) =>
                    value === null ? 0 : Math.min(sample.pairs.length - 1, value + 1)
                  )
                }
                disabled={page === sample.pairs.length - 1}
                aria-label={labels.next}
                className="bg-primary text-on-primary inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-sm font-bold disabled:opacity-40"
              >
                <span dir={locale === 'en' ? 'ltr' : 'rtl'}>{labels.next}</span>
                <IconChevron className="size-4 !transform-none" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Pair({
  pair,
  glossLang,
  divided,
  locale,
  bookId,
  unit,
  bookTitle,
  catalog,
  cardLabels,
}: {
  pair: SamplePair;
  glossLang: 'fa' | 'ckb';
  divided: boolean;
  locale: Locale;
  bookId: number;
  unit: number;
  bookTitle: string;
  catalog: CatalogEntry[];
  cardLabels: {
    example: string;
    important: string;
    favorite: string;
    pronounceWord: string;
    pronounceExample: string;
    close: string;
    noMatches: string;
  };
}) {
  return (
    <div className={divided ? 'border-outline-variant/50 mt-4 border-t pt-4' : undefined}>
      {pair.en ? (
        <div lang="en" dir="ltr" className="text-on-surface text-start text-[0.9375rem] leading-relaxed whitespace-pre-wrap">
          <EnglishWordTapText
            text={pair.en}
            bookId={bookId}
            unit={unit}
            bookTitle={bookTitle}
            catalog={catalog}
            locale={locale}
            glossLang={glossLang}
            cardLabels={cardLabels}
            noMatches={cardLabels.noMatches}
          />
        </div>
      ) : null}
      {pair.local ? (
        <p
          lang={glossLang}
          dir="rtl"
          className="text-primary mt-2 text-right text-[0.9375rem] leading-relaxed font-bold whitespace-pre-wrap"
        >
          {pair.local}
        </p>
      ) : null}
    </div>
  );
}
