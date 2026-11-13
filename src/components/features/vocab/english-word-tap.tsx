'use client';

import { useCallback, useMemo, useState } from 'react';

import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n/config';
import type { VocabSearchHit } from '@/lib/vocab/search-words';
import {
  lookupCatalogMatches,
  tokenizeEnglishWords,
  type CatalogEntry,
} from '@/lib/vocab/sample-word-lookup';

import { SampleWordSheet } from '@/components/features/vocab/sample-word-sheet';

export function EnglishWordTapText({
  text,
  bookId,
  unit,
  bookTitle,
  catalog,
  locale,
  glossLang,
  cardLabels,
  noMatches,
}: {
  text: string;
  bookId: number;
  unit: number;
  bookTitle: string;
  catalog: CatalogEntry[];
  locale: Locale;
  glossLang: 'fa' | 'ckb';
  cardLabels: {
    example: string;
    important: string;
    favorite: string;
    pronounceWord: string;
    pronounceExample: string;
    close: string;
  };
  noMatches: string;
}) {
  const tokens = useMemo(() => tokenizeEnglishWords(text), [text]);
  const [sheet, setSheet] = useState<{ matches: VocabSearchHit[]; tapped?: string } | null>(null);
  const [activeToken, setActiveToken] = useState<number | null>(null);

  const onTap = useCallback(
    (index: number) => {
      const matches = lookupCatalogMatches(tokens, index, catalog, bookId, unit);
      setActiveToken(index);
      if (matches.length === 0) {
        setSheet({ matches: [], tapped: tokens[index]?.text });
        return;
      }
      setSheet({ matches: matches.slice(0, 8) });
    },
    [bookId, catalog, tokens, unit]
  );

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  tokens.forEach((token, index) => {
    if (token.start > cursor) {
      parts.push(text.slice(cursor, token.start));
    }
    parts.push(
      <button
        key={`${token.start}-${index}`}
        type="button"
        onClick={() => onTap(index)}
        className={cn(
          'cursor-pointer rounded px-0.5 font-inherit text-inherit underline decoration-transparent underline-offset-2',
          'hover:text-primary hover:decoration-primary/40',
          activeToken === index && 'bg-primary/15 text-primary decoration-primary/50'
        )}
      >
        {text.slice(token.start, token.end)}
      </button>
    );
    cursor = token.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return (
    <>
      <span lang="en" dir="ltr" className="text-start">
        {parts}
      </span>
      {sheet ? (
        <SampleWordSheet
          matches={sheet.matches}
          tappedWord={sheet.tapped}
          bookTitle={bookTitle}
          locale={locale}
          glossLang={glossLang}
          labels={{ ...cardLabels, empty: noMatches }}
          onClose={() => {
            setSheet(null);
            setActiveToken(null);
          }}
        />
      ) : null}
    </>
  );
}
