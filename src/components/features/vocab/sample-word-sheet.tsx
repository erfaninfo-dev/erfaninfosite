'use client';

import { useEffect } from 'react';

import { VocabCardView } from '@/components/features/vocab/vocab-card-view';
import { IconArticle, IconClose } from '@/components/ui/icons';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import type { VocabSearchHit } from '@/lib/vocab/search-words';
import { useWordMarks } from '@/components/features/vocab/word-marks';

export function SampleWordSheet({
  matches,
  tappedWord,
  bookTitle,
  locale,
  glossLang,
  labels,
  onClose,
}: {
  matches: VocabSearchHit[];
  tappedWord?: string;
  bookTitle: string;
  locale: Locale;
  glossLang: 'fa' | 'ckb';
  labels: {
    example: string;
    important: string;
    favorite: string;
    pronounceWord: string;
    pronounceExample: string;
    close: string;
    empty: string;
  };
  onClose: () => void;
}) {
  const marks = useWordMarks();
  const numbers = new Intl.NumberFormat(NUMBER_LOCALE[locale]);
  const count = matches.length;
  const title =
    locale === 'en'
      ? count === 1
        ? '1 match'
        : `${count} matches`
      : `${numbers.format(count)} مورد یافت شد`;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-1 flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-[1.5rem] shadow-[var(--shadow-soft)] sm:rounded-[1.5rem]">
        <div className="border-outline-variant/50 flex shrink-0 items-center gap-3 border-b px-4 py-3">
          <span className="bg-primary-container text-on-primary-container grid size-10 place-items-center rounded-xl">
            <IconArticle className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-on-surface text-base font-extrabold">{title}</p>
            {tappedWord ? (
              <p lang="en" className="text-on-surface-variant truncate text-sm font-bold">
                {tappedWord}
              </p>
            ) : matches[0] ? (
              <p lang="en" className="text-on-surface-variant truncate text-sm font-bold">
                {matches[0].word}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="text-on-surface-variant grid size-10 place-items-center rounded-full"
          >
            <IconClose className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {matches.length === 0 ? (
            <p className="text-on-surface-variant py-8 text-center font-semibold">{labels.empty}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {matches.map((card, index) => (
                <li key={card.id}>
                  <VocabCardView
                    card={card}
                    bookTitle={bookTitle}
                    glossLang={glossLang}
                    uiRtl={locale !== 'en'}
                    numberLabel={numbers.format(index + 1)}
                    labels={labels}
                    favorite={marks.isFavorite(card.id)}
                    important={marks.isImportant(card.id, card.important)}
                    onFavorite={() => marks.toggleFavorite(card.id)}
                    onImportant={() => marks.toggleImportant(card.id, card.important)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div
          aria-hidden="true"
          className="bg-outline-variant/40 mx-auto mb-2 mt-1 h-1 w-10 shrink-0 rounded-full sm:hidden"
        />
      </div>
    </div>
  );
}
