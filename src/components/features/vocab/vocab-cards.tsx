'use client';

import { useEffect, useMemo, useState } from 'react';

import { VocabCardView } from '@/components/features/vocab/vocab-card-view';
import { IconClose, IconSearch } from '@/components/ui/icons';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import { searchBookCards, type VocabSearchHit } from '@/lib/vocab/search-words';
import { useWordMarks } from '@/components/features/vocab/word-marks';

/**
 * The word cards the app opens from a section.
 *
 * Same pieces as the app's word card: book title, accent bar, number, headword,
 * type, English meaning, gloss, example, favorite, important, speech, and the
 * U/S mark. Marks stay in this browser. A typed query searches the whole book
 * by headword, which is the app's search rule.
 */

export type VocabCardData = VocabSearchHit & { number: number };

export function VocabCards({
  cards,
  bookId,
  bookTitle,
  locale,
  glossLang,
  labels,
}: {
  cards: VocabCardData[];
  bookId: number;
  bookTitle: string;
  locale: Locale;
  glossLang: 'fa' | 'ckb';
  labels: {
    search: string;
    empty: string;
    clear: string;
    example: string;
    important: string;
    favorite: string;
    pronounceWord: string;
    pronounceExample: string;
  };
}) {
  const [query, setQuery] = useState('');
  const [bookMatches, setBookMatches] = useState<VocabSearchHit[] | null>(null);
  const needle = query.trim().toLowerCase();
  const numbers = useMemo(() => new Intl.NumberFormat(NUMBER_LOCALE[locale]), [locale]);
  const marks = useWordMarks();

  useEffect(() => {
    if (!needle) {
      setBookMatches(null);
      return;
    }
    let cancel = false;
    setBookMatches(null);
    searchBookCards(bookId, needle, locale)
      .then((rows) => {
        if (!cancel) setBookMatches(rows);
      })
      .catch(() => {
        if (!cancel) setBookMatches([]);
      });
    return () => {
      cancel = true;
    };
  }, [bookId, locale, needle]);

  const visible = useMemo(() => {
    if (!needle) return cards;
    const source =
      bookMatches ?? cards.filter((card) => card.word.toLowerCase().includes(needle));
    return source.map((card, index) => ({ ...card, number: index + 1 }));
  }, [bookMatches, cards, needle]);

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
              <VocabCardView
                card={card}
                bookTitle={bookTitle}
                glossLang={glossLang}
                uiRtl={locale !== 'en'}
                numberLabel={numbers.format(card.number)}
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
  );
}
