'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';

import { WordRow, type WordRowData } from '@/components/features/vocab/word-row';
import { WordSheet, type WordSheetLabels } from '@/components/features/vocab/word-sheet';
import { Badge } from '@/components/ui/primitives';
import { IconClose, IconSearch } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { formatClient } from '@/lib/i18n/client-format';
import type { Locale } from '@/lib/i18n/config';
import { searchBookWords } from '@/lib/vocab/search-words';

/**
 * A searchable, filterable word list.
 *
 * A book can hold ~1,900 words, so above `VIRTUALIZE_ABOVE` rows the list is
 * virtualised and only the visible window is in the DOM (ui-ux-spec.md §2.5,
 * §7). Below that it renders plainly, which keeps short unit lists simple and
 * lets the browser's own find-in-page work.
 */

const VIRTUALIZE_ABOVE = 200;
const ROW_ESTIMATE = 57;

export type WordListLabels = {
  searchHint: string;
  important: string;
  importantOnly: string;
  allTypes: string;
  /** Raw ICU, e.g. "{count, plural, ...}" — the count is a browser-side value. */
  resultsTemplate: string;
  noResults: string;
  sheet: WordSheetLabels;
};

export function WordList({
  words,
  labels,
  glossLang,
  types,
  locale,
  bookId,
  plain = false,
}: {
  words: WordRowData[];
  labels: WordListLabels;
  glossLang: 'fa' | 'ckb';
  types: string[];
  locale: Locale;
  /** When set, a typed query searches every word of the book, not just `words`. */
  bookId?: number;
  /** The study screen: headword search only, no type or important filters. */
  plain?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [importantOnly, setImportantOnly] = useState(false);
  // One sheet for the whole list, not one per row.
  const [selected, setSelected] = useState<WordRowData | null>(null);
  const [bookMatches, setBookMatches] = useState<WordRowData[] | null>(null);
  const searchId = useId();

  /*
   * `useDeferredValue` keeps typing responsive without a manual debounce:
   * React renders the keystroke immediately and the filtered list at lower
   * priority, which is the behaviour a 250 ms debounce approximates.
   */
  const deferredQuery = useDeferredValue(query);
  const needle = deferredQuery.trim().toLowerCase();

  useEffect(() => {
    if (!bookId || !needle) {
      setBookMatches(null);
      return;
    }
    let cancel = false;
    setBookMatches(null);
    searchBookWords(bookId, needle, locale)
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

  const filtered = useMemo(() => {
    if (bookMatches && needle) return bookMatches;
    return words.filter((w) => {
      if (!plain && importantOnly && !w.important) return false;
      if (!plain && type && w.type !== type) return false;
      if (!needle) return true;
      if (plain || bookId) return w.word.toLowerCase().includes(needle);
      return (
        w.word.toLowerCase().includes(needle) ||
        w.meaning.toLowerCase().includes(needle) ||
        w.example.toLowerCase().includes(needle)
      );
    });
  }, [bookId, bookMatches, importantOnly, needle, plain, type, words]);

  const anyImportant = useMemo(() => words.some((w) => w.important), [words]);
  const resultsLabel = formatClient(labels.resultsTemplate, locale, {
    count: filtered.length,
  });

  return (
    <div>
      <div className="bg-surface/95 sticky top-16 z-20 -mx-1 px-1 py-3 backdrop-blur">
        <div className="relative">
          <IconSearch className="text-on-surface-variant pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchHint}
            aria-label={labels.searchHint}
            className={cn(
              'bg-surface-3 h-12 w-full rounded-[var(--radius-input)] border-0 ps-11 pe-4',
              // 16px minimum, which also stops iOS zooming on focus.
              'text-on-surface placeholder:text-on-surface-variant pe-12 text-[length:var(--text-body)]',
              'dark:bg-surface-3'
            )}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-on-surface-variant absolute end-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full"
              aria-label={labels.sheet.close}
            >
              <IconClose className="size-4" />
            </button>
          ) : null}
        </div>

        {!plain && (types.length > 1 || anyImportant) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {types.length > 1 ? (
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                aria-label={labels.allTypes}
                className="border-outline-strong bg-surface-1 text-on-surface dark:bg-surface-2 h-11 rounded-[var(--radius-button)] border px-3 text-[length:var(--text-label)]"
              >
                <option value="">{labels.allTypes}</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            ) : null}

            {anyImportant ? (
              <button
                type="button"
                onClick={() => setImportantOnly((v) => !v)}
                aria-pressed={importantOnly}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-button)] border px-3',
                  'text-[length:var(--text-label)] font-semibold transition-colors duration-[var(--duration-fast)]',
                  importantOnly
                    ? 'bg-secondary-container text-on-secondary-container border-transparent'
                    : 'border-outline-strong text-on-surface-variant hover:bg-surface-3'
                )}
              >
                {labels.importantOnly}
              </button>
            ) : null}

            <Badge className="ms-auto">{resultsLabel}</Badge>
          </div>
        )}
      </div>

      {/* Announce the result count politely rather than silently refiltering. */}
      <p aria-live="polite" className="sr-only">
        {resultsLabel}
      </p>

      {filtered.length === 0 ? (
        <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-center">
          {labels.noResults}
        </p>
      ) : filtered.length > VIRTUALIZE_ABOVE ? (
        <VirtualRows
          rows={filtered}
          labels={labels}
          glossLang={glossLang}
          onOpen={setSelected}
        />
      ) : (
        <div className="border-outline-variant/60 bg-surface-1 dark:bg-surface-2 overflow-hidden rounded-[var(--radius-card)] border">
          {filtered.map((w) => (
            <WordRow
              key={w.id}
              data={w}
              glossLang={glossLang}
              labels={{ important: labels.important }}
              onOpen={setSelected}
            />
          ))}
        </div>
      )}

      <WordSheet
        word={selected}
        glossLang={glossLang}
        labels={labels.sheet}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

/**
 * Virtualised rendering for long lists.
 *
 * Rows are a fixed height now that detail opens in a sheet rather than inline,
 * so the estimate is exact and nothing reflows as the reader scrolls.
 */
function VirtualRows({
  rows,
  labels,
  glossLang,
  onOpen,
}: {
  rows: WordRowData[];
  labels: WordListLabels;
  glossLang: 'fa' | 'ckb';
  onOpen: (word: WordRowData) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // The virtualiser needs a real element before it can measure.
  useEffect(() => setReady(true), []);

  /*
   * React Compiler cannot memoize a hook that returns functions, so it skips
   * optimising this component and warns. That is expected here and harmless:
   * the virtualiser owns its own measurement cache, nothing it returns is
   * passed to a memoized child, and the alternative — 1,900 DOM rows — is far
   * worse than one unoptimised component.
   */
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 8,
  });

  return (
    <div
      ref={scrollRef}
      // A bounded scroller rather than window scrolling, so the sticky search
      // field stays put and the list never pushes the page height to 100k px.
      className="border-outline-variant/60 bg-surface-1 dark:bg-surface-2 max-h-[70dvh] overflow-y-auto overscroll-contain rounded-[var(--radius-card)] border"
    >
      {ready ? (
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index];
            if (!row) return null;
            return (
              <div
                key={row.id}
                ref={virtualizer.measureElement}
                data-index={item.index}
                style={{
                  position: 'absolute',
                  insetInlineStart: 0,
                  insetInlineEnd: 0,
                  transform: `translateY(${item.start}px)`,
                }}
              >
                <WordRow
                  data={row}
                  glossLang={glossLang}
                  labels={{ important: labels.important }}
                  onOpen={onOpen}
                />
              </div>
            );
          })}
        </div>
      ) : (
        // Pre-hydration, render the first screenful so the list is not blank
        // and the page has real content for search engines and no-JS readers.
        rows
          .slice(0, 20)
          .map((row) => (
            <WordRow
              key={row.id}
              data={row}
              glossLang={glossLang}
              labels={{ important: labels.important }}
              onOpen={onOpen}
            />
          ))
      )}
    </div>
  );
}
