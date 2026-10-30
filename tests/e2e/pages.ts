/**
 * The pages every check runs over, and the matrix they run in.
 *
 * Ids are the real catalog entries the site is built against. If one is ever
 * deleted the suite fails loudly on a 404, which is the correct signal — the
 * page really is gone — rather than silently testing nothing.
 */

export const LOCALES = ['en', 'fa', 'ckb'] as const;
export type Locale = (typeof LOCALES)[number];

/** The widths ui-ux-spec.md §2.1 requires, plus the ones §9 names. */
export const WIDTHS = [320, 360, 390, 768, 1024, 1280, 1440, 1920] as const;

/** The subset §9 wants a screenshot for. */
export const SCREENSHOT_WIDTHS = [320, 390, 768, 1024, 1440] as const;

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export type PageDef = {
  name: string;
  path: (locale: Locale) => string;
  /** A landmark that proves the page actually rendered its data. */
  expect?: string;
};

export const MAIN_PAGES: PageDef[] = [
  { name: 'home', path: (l) => `/${l}` },
  { name: 'books', path: (l) => `/${l}/books` },
  { name: 'book', path: (l) => `/${l}/books/2` },
  { name: 'book-words', path: (l) => `/${l}/books/2/words` },
  { name: 'unit', path: (l) => `/${l}/books/2/units/1` },
  { name: 'flashcards', path: (l) => `/${l}/books/2/units/1/flashcards` },
  { name: 'grammar', path: (l) => `/${l}/grammar` },
  { name: 'grammar-book', path: (l) => `/${l}/grammar/books/1` },
  { name: 'grammar-unit', path: (l) => `/${l}/grammar/books/1/units/1` },
  { name: 'grammar-topic', path: (l) => `/${l}/grammar/topics/1` },
  { name: 'quiz', path: (l) => `/${l}/grammar/topics/1/quiz?n=10` },
  { name: 'speaking', path: (l) => `/${l}/speaking` },
  { name: 'speaking-topic', path: (l) => `/${l}/speaking/topics/5` },
  { name: 'speaking-ideas', path: (l) => `/${l}/speaking/topics/5/ideas` },
  { name: 'speaking-model', path: (l) => `/${l}/speaking/models/37` },
  { name: 'play', path: (l) => `/${l}/play` },
  { name: 'play-category', path: (l) => `/${l}/play/animals` },
  { name: 'download', path: (l) => `/${l}/download` },
  { name: 'search', path: (l) => `/${l}/search?q=book` },
];

/** The three pages the performance and a11y budgets name explicitly. */
export const KEY_PAGES = MAIN_PAGES.filter((p) =>
  ['home', 'book', 'quiz'].includes(p.name)
);

/** Sorani letters that must render, from the acceptance checklist. */
export const SORANI_LETTERS = ['ێ', 'ڵ', 'ڕ', 'ۆ', 'ە', 'ڤ'] as const;
