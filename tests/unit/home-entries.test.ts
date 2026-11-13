import { describe, expect, it } from 'vitest';

import type { Book } from '@/lib/api/normalize';
import { homeEntries } from '@/lib/home/entries';

function book(partial: Partial<Book> & Pick<Book, 'id' | 'title'>): Book {
  return {
    description: '',
    sortOrder: partial.id,
    isPublic: true,
    isStudent: false,
    track: 'ielts',
    seriesId: null,
    seriesTitle: null,
    seriesSortOrder: 999999,
    volumeOrder: 0,
    ...partial,
  };
}

describe('homeEntries', () => {
  it('collapses a series into one row and ranks it ahead of a later standalone book', () => {
    const entries = homeEntries([
      book({
        id: 2,
        title: 'Idioms For Speaking',
        sortOrder: 20,
      }),
      book({
        id: 18,
        title: 'Cambridge IELTS 18',
        seriesId: 1,
        seriesTitle: 'Cambridge IELTS',
        seriesSortOrder: 1,
        volumeOrder: 1,
      }),
      book({
        id: 17,
        title: 'Cambridge IELTS 17',
        seriesId: 1,
        seriesTitle: 'Cambridge IELTS',
        seriesSortOrder: 1,
        volumeOrder: 2,
      }),
    ]);

    expect(entries.map((entry) => entry.kind)).toEqual(['series', 'book']);
    expect(entries[0]).toMatchObject({
      kind: 'series',
      title: 'Cambridge IELTS',
    });
    if (entries[0]?.kind === 'series') {
      expect(entries[0].books.map((item) => item.id)).toEqual([18, 17]);
    }
    expect(entries[1]).toMatchObject({ kind: 'book', book: { id: 2 } });
  });

  it('groups title-prefix series when the API omitted series_id', () => {
    const entries = homeEntries([
      book({ id: 1, title: 'IELTS Vocabulary in Use', sortOrder: 5 }),
      book({ id: 2, title: 'IELTS Vocabulary in Use Advanced', sortOrder: 6 }),
      book({ id: 3, title: 'Essential Words', sortOrder: 4 }),
    ]);

    const series = entries.find((entry) => entry.kind === 'series');
    expect(series).toMatchObject({ title: 'IELTS Vocabulary in Use' });
    if (series?.kind === 'series') {
      expect(series.books).toHaveLength(2);
    }
  });
});