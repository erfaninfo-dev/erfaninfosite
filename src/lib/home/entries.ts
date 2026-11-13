import { compareSeriesVolumes, type Book } from '@/lib/api/normalize';

/** `books.php` uses this when a book has no `book_series` row. */
const NO_SERIES_SORT = 999999;

export type HomeSeriesEntry = {
  kind: 'series';
  title: string;
  books: Book[];
  rank: number;
};

export type HomeBookEntry = {
  kind: 'book';
  book: Book;
  rank: number;
};

export type HomeEntry = HomeSeriesEntry | HomeBookEntry;

/**
 * Home rows for one track, in the app's order.
 *
 * Ported from `_trackHomeEntriesForTrack` in the Flutter home screen: books
 * that share a `series_id` collapse to one row, title-prefix groups do the
 * same when the API omitted the id, and everything is ranked by series sort
 * order (or the book's own sort order when it stands alone).
 */
export function homeEntries(books: Book[]): HomeEntry[] {
  const bySeriesId = new Map<number, Book[]>();
  const withoutSeriesId: Book[] = [];

  for (const book of books) {
    if (book.seriesId != null) {
      const list = bySeriesId.get(book.seriesId) ?? [];
      list.push(book);
      bySeriesId.set(book.seriesId, list);
    } else {
      withoutSeriesId.push(book);
    }
  }

  const ranked: HomeEntry[] = [];

  for (const list of bySeriesId.values()) {
    const volumes = list.slice().sort(compareSeriesVolumes);
    ranked.push({
      kind: 'series',
      title: seriesTitle(volumes, ''),
      books: volumes,
      rank: seriesRank(volumes),
    });
  }

  for (const entry of legacyEntries(withoutSeriesId)) {
    ranked.push(entry);
  }

  ranked.sort(compareEntries);
  return ranked;
}

function seriesRank(books: Book[]): number {
  const sort = books[0]?.seriesSortOrder ?? NO_SERIES_SORT;
  if (sort >= NO_SERIES_SORT) return minSort(books);
  return sort;
}

function minSort(books: Book[]): number {
  return books.reduce((min, book) => Math.min(min, book.sortOrder), Number.POSITIVE_INFINITY);
}

function seriesTitle(books: Book[], groupKey: string): string {
  const titled = books.find((book) => book.seriesTitle?.trim())?.seriesTitle?.trim();
  if (titled) return titled;
  if (groupKey.startsWith('named:')) return groupKey.slice('named:'.length);
  if (groupKey === 'cambridge_ielts') return 'Cambridge IELTS';
  return books[0]?.title ?? '';
}

/** Same title-prefix groups the app uses when `series_id` is missing. */
function seriesGroupKey(book: Book): string {
  const titled = (book.seriesTitle ?? '').trim();
  if (titled) {
    if (titled === 'Cambridge IELTS') return 'cambridge_ielts';
    return `named:${titled}`;
  }
  const low = book.title.toLowerCase();
  if (low.startsWith('cambridge ielts')) return 'cambridge_ielts';
  if (low.startsWith('oxford word skills')) return 'named:Oxford Word Skills';
  if (low.startsWith('official ielts practice')) return 'named:Official IELTS Practice';
  if (low.startsWith('ielts vocabulary in use')) return 'named:IELTS Vocabulary in Use';
  return 'other';
}

function legacyEntries(books: Book[]): HomeEntry[] {
  const sorted = books.slice().sort((a, b) => {
    if (a.seriesSortOrder !== b.seriesSortOrder) return a.seriesSortOrder - b.seriesSortOrder;
    if (a.volumeOrder !== b.volumeOrder) return a.volumeOrder - b.volumeOrder;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
  });

  const groups: Array<{ key: string; books: Book[] }> = [];
  for (const book of sorted) {
    const key = seriesGroupKey(book);
    const last = groups.at(-1);
    if (last && last.key === key) last.books.push(book);
    else groups.push({ key, books: [book] });
  }

  const out: HomeEntry[] = [];
  for (const group of groups) {
    if (group.key === 'other') {
      for (const book of group.books) {
        out.push({ kind: 'book', book, rank: book.sortOrder });
      }
      continue;
    }
    const volumes = group.books.slice().sort(compareSeriesVolumes);
    out.push({
      kind: 'series',
      title: seriesTitle(volumes, group.key),
      books: volumes,
      rank: seriesRank(volumes),
    });
  }
  return out;
}

function compareEntries(a: HomeEntry, b: HomeEntry): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  if (a.kind !== b.kind) return a.kind === 'series' ? -1 : 1;
  if (a.kind === 'series' && b.kind === 'series') {
    const firstA = a.books[0];
    const firstB = b.books[0];
    if (!firstA || !firstB) return a.title.localeCompare(b.title);
    if (firstA.seriesSortOrder !== firstB.seriesSortOrder) {
      return firstA.seriesSortOrder - firstB.seriesSortOrder;
    }
    const ida = firstA.seriesId;
    const idb = firstB.seriesId;
    if (ida != null && idb != null && ida !== idb) return ida - idb;
    return a.title.localeCompare(b.title);
  }
  if (a.kind === 'book' && b.kind === 'book') {
    if (a.book.sortOrder !== b.book.sortOrder) return a.book.sortOrder - b.book.sortOrder;
    return a.book.id - b.book.id;
  }
  return 0;
}
