import 'server-only';

import { cache } from 'react';

import { fetchAccount, fetchStudentBooks } from '@/lib/auth/api';
import { hasClassAccess } from '@/lib/auth/account';
import { getAuthToken } from '@/lib/auth/session';

import { CATALOG, CATALOG_SLOW, apiGet } from './client';
import { ENDPOINTS, TAGS, entityTag } from './endpoints';
import * as N from './normalize';
import * as S from './schemas';

/**
 * The cached, tagged accessors that pages call. Nothing else in the project
 * talks to `apiGet` directly.
 *
 * Two layers of caching, doing different jobs:
 *
 *  - **Next's Data Cache**, configured per call with `CATALOG` (60 s) or
 *    `CATALOG_SLOW` (300 s) plus tags. It is shared by every visitor and
 *    survives between requests, with stale-while-revalidate so nobody waits on
 *    the origin after the first fetch. This is what keeps the shared host to a
 *    bounded number of calls regardless of traffic.
 *  - **React's `cache()`**, which deduplicates within a single render. A page
 *    that reads the book list in `generateMetadata` and again in the body
 *    fetches once.
 *
 * Both windows are far shorter than the Flutter app's own disk cache
 * (25 min – 3 days), so the website is always fresher than the phone.
 */

/* ── books and vocabulary ────────────────────────────────────────────────── */

export const getBooks = cache(async (): Promise<N.Book[]> => {
  const raw = await apiGet(ENDPOINTS.books, S.booksSchema, {
    ...CATALOG,
    tags: [TAGS.books],
  });

  return (
    raw
      .map(N.normalizeBook)
      // The brief requires hiding non-public books. Every book is currently
      // public, but the flag exists so that it can change, and it will.
      .filter((book) => book.isPublic && !book.isStudent)
      .sort(
        (a, b) =>
          a.seriesSortOrder - b.seriesSortOrder ||
          a.volumeOrder - b.volumeOrder ||
          a.sortOrder - b.sortOrder ||
          a.title.localeCompare(b.title)
      )
  );
});

/**
 * A single book, resolved from the list.
 *
 * This is how deletion becomes a 404. The API returns `200 []` for a missing
 * book's children rather than a 404, so "does this book exist" can only be
 * answered by the list endpoint. See docs/api-contract.md §0.
 */
export async function getBook(bookId: number): Promise<N.Book | null> {
  const books = await getBooks();
  return books.find((b) => b.id === bookId) ?? null;
}

export const getUnits = cache(async (bookId: number): Promise<N.Unit[]> => {
  const raw = await apiGet(
    ENDPOINTS.units,
    S.unitsSchema,
    { ...CATALOG, tags: [TAGS.books, entityTag.book(bookId)] },
    { book_id: bookId }
  );
  return raw.map(N.normalizeUnit).sort((a, b) => a.unit - b.unit);
});

/**
 * Every word of a book — the heaviest call in the API (176 KB–864 KB,
 * 2.2 s–10.4 s). Cached whole on the server and then sliced per view; the full
 * payload never reaches a browser.
 */
export const getBookWords = cache(async (bookId: number): Promise<N.Word[]> => {
  const raw = await apiGet(
    ENDPOINTS.words,
    S.wordsSchema,
    { ...CATALOG, tags: [TAGS.books, entityTag.bookWords(bookId)] },
    { book_id: bookId }
  );
  return raw.map(N.normalizeWord);
});

/** The slice a unit page actually renders. */
export async function getUnitWords(bookId: number, unit: number): Promise<N.Word[]> {
  const words = await getBookWords(bookId);
  return words
    .filter((w) => w.unit === unit)
    .sort((a, b) => a.section - b.section || a.id - b.id);
}

export async function getSectionWords(
  bookId: number,
  unit: number,
  section: number
): Promise<N.Word[]> {
  const words = await getUnitWords(bookId, unit);
  return words.filter((w) => w.section === section);
}

/**
 * Sections of a unit. Requires `book_id` AND `unit` — the brief's table says
 * `book_id` alone, which returns a 400. See docs/api-contract.md §3 item 1.
 */
export const getSections = cache(
  async (bookId: number, unit: number): Promise<N.Section[]> => {
    const raw = await apiGet(
      ENDPOINTS.sections,
      S.sectionsSchema,
      { ...CATALOG, tags: [TAGS.books, entityTag.book(bookId)] },
      { book_id: bookId, unit }
    );
    return raw.map(N.normalizeSection).sort((a, b) => a.section - b.section);
  }
);

/**
 * Also requires both params. Coverage is patchy; an empty list is normal.
 *
 * Passing `section` is what the app does on a section's word screen. Without
 * it this endpoint often returns `[]` even when that section has a passage.
 */
export const getUnitSamples = cache(
  async (bookId: number, unit: number, section?: number): Promise<N.UnitSample[]> => {
    const raw = await apiGet(
      ENDPOINTS.unitSamples,
      S.unitSamplesSchema,
      { ...CATALOG, tags: [TAGS.books, entityTag.book(bookId)] },
      {
        book_id: bookId,
        unit,
        ...(section != null && section > 0 ? { section } : {}),
      }
    );
    return raw.map(N.normalizeUnitSample).sort((a, b) => a.id - b.id);
  }
);

/** Takes no book_id — returns every PDF for every book, so filter locally. */
export const getBookPdfs = cache(async (bookId?: number): Promise<N.BookPdf[]> => {
  const raw = await apiGet(ENDPOINTS.bookPdfs, S.bookPdfsSchema, {
    ...CATALOG_SLOW,
    tags: [TAGS.books],
  });
  const all = raw.map(N.normalizeBookPdf).sort((a, b) => a.sortOrder - b.sortOrder);
  return bookId === undefined ? all : all.filter((p) => p.bookId === bookId);
});

/* ── grammar ─────────────────────────────────────────────────────────────── */

export const getGrammarBooks = cache(async (): Promise<N.GrammarBook[]> => {
  const raw = await apiGet(ENDPOINTS.grammarBooks, S.grammarBooksSchema, {
    ...CATALOG,
    tags: [TAGS.grammar],
  });
  return raw
    .map(N.normalizeGrammarBook)
    .filter((b) => b.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
});

export async function getGrammarBook(bookId: number): Promise<N.GrammarBook | null> {
  const books = await getGrammarBooks();
  return books.find((b) => b.id === bookId) ?? null;
}

export const getGrammarUnits = cache(async (bookId: number): Promise<N.GrammarUnit[]> => {
  const raw = await apiGet(
    ENDPOINTS.grammarUnits,
    S.grammarUnitsSchema,
    { ...CATALOG, tags: [TAGS.grammar, entityTag.grammarBook(bookId)] },
    { book_id: bookId }
  );
  return (
    raw
      .map(N.normalizeGrammarUnit)
      .filter((u) => u.isActive)
      // sort_order is 0 for every unit observed, so unit_number is the real
      // ordering and ids are not contiguous.
      .sort((a, b) => a.sortOrder - b.sortOrder || a.unitNumber - b.unitNumber)
  );
});

export async function getGrammarUnit(
  bookId: number,
  unitId: number
): Promise<N.GrammarUnit | null> {
  const units = await getGrammarUnits(bookId);
  return units.find((u) => u.id === unitId) ?? null;
}

export const getGrammarUnitTexts = cache(
  async (unitId: number): Promise<N.GrammarUnitText[]> => {
    const raw = await apiGet(
      ENDPOINTS.grammarUnitTexts,
      S.grammarUnitTextsSchema,
      { ...CATALOG, tags: [TAGS.grammar, entityTag.grammarUnit(unitId)] },
      { unit_id: unitId }
    );
    return raw
      .map(N.normalizeGrammarUnitText)
      .filter((t) => t.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }
);

export const getGrammarTopics = cache(async (): Promise<N.GrammarTopic[]> => {
  const raw = await apiGet(ENDPOINTS.grammarTopics, S.grammarTopicsSchema, {
    ...CATALOG,
    tags: [TAGS.grammar],
  });
  const topics = raw.map(N.normalizeGrammarTopic).filter((t) => t.questionCount > 0);
  const hasSortField = raw.some((row) => row.sort_order != null || row.sort != null);
  // The app follows `grammar_topics.sort`. The API usually returns rows already
  // ordered; reshuffle only when the endpoint exposes sort values.
  if (hasSortField) {
    topics.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }
  return topics;
});

export async function getGrammarTopic(topicId: number): Promise<N.GrammarTopic | null> {
  const topics = await getGrammarTopics();
  return topics.find((t) => t.id === topicId) ?? null;
}

/**
 * Questions for a topic. Up to 300 come back (212 KB); the quiz page slices to
 * the requested length before sending anything to the browser.
 *
 * Deliberately topic-only: `?unit_id=` returns `[]` and the book/unit columns
 * are null on every row, so there is no unit-driven quiz to build yet.
 */
export const getGrammarQuestions = cache(
  async (topicId: number): Promise<N.GrammarQuestion[]> => {
    const raw = await apiGet(
      ENDPOINTS.grammarQuestions,
      S.grammarQuestionsSchema,
      { ...CATALOG, tags: [TAGS.grammar, entityTag.grammarTopic(topicId)] },
      { topic_id: topicId }
    );
    return (
      raw
        .map(N.normalizeGrammarQuestion)
        // A question with fewer than two options or no correct key is unanswerable.
        .filter((q) => q.questionText && q.options.length >= 2 && q.correctAnswer)
        .sort((a, b) => a.orderNum - b.orderNum || a.id - b.id)
    );
  }
);

export const getGrammarTopicPdfs = cache(
  async (topic?: string): Promise<N.GrammarTopicPdf[]> => {
    const raw = await apiGet(ENDPOINTS.grammarTopicPdfs, S.grammarTopicPdfsSchema, {
      ...CATALOG_SLOW,
      tags: [TAGS.grammar],
    });
    const all = raw
      .map(N.normalizeGrammarTopicPdf)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

    if (topic === undefined) return all;
    // PDFs join to topics by the topic *name*, not by topic_id.
    const needle = topic.trim().toLowerCase();
    return all.filter((p) => p.topic.toLowerCase() === needle);
  }
);

/* ── speaking ────────────────────────────────────────────────────────────── */

export const getSpeakingTopics = cache(async (): Promise<N.SpeakingTopic[]> => {
  const raw = await apiGet(
    ENDPOINTS.speakingTopics,
    S.speakingTopicsSchema,
    { ...CATALOG, tags: [TAGS.speaking] },
    { part: 1 }
  );
  return raw
    .map(N.normalizeSpeakingTopic)
    .filter((t) => t.questionCount > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
});

export async function getSpeakingTopic(topicId: number): Promise<N.SpeakingTopic | null> {
  const topics = await getSpeakingTopics();
  return topics.find((t) => t.id === topicId) ?? null;
}

export const getSpeakingModels = cache(async (): Promise<N.SpeakingModel[]> => {
  const raw = await apiGet(
    ENDPOINTS.speakingModels,
    S.speakingModelsSchema,
    { ...CATALOG, tags: [TAGS.speaking] },
    { part: 1 }
  );
  return raw
    .map(N.normalizeSpeakingModel)
    .sort((a, b) => a.modelNumber - b.modelNumber || a.id - b.id);
});

export async function getSpeakingModel(modelId: number): Promise<N.SpeakingModel | null> {
  const models = await getSpeakingModels();
  return models.find((m) => m.id === modelId) ?? null;
}

/** `?topic_id=` returns a `{topic, questions}` envelope. */
export const getSpeakingTopicQuestions = cache(
  async (
    topicId: number
  ): Promise<{
    topic: { id: number; title: string };
    questions: N.SpeakingQuestion[];
  }> => {
    const raw = await apiGet(
      ENDPOINTS.speakingQuestions,
      S.speakingTopicQuestionsSchema,
      { ...CATALOG, tags: [TAGS.speaking, entityTag.speakingTopic(topicId)] },
      { topic_id: topicId }
    );
    return {
      topic: { id: raw.topic.id, title: raw.topic.title.trim() },
      questions: raw.questions
        .map(N.normalizeSpeakingQuestion)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    };
  }
);

/** `?model_id=` returns `{model, questions}` — a different envelope entirely. */
export const getSpeakingModelQuestions = cache(
  async (
    modelId: number
  ): Promise<{ model: N.SpeakingModel; questions: N.SpeakingQuestion[] }> => {
    const raw = await apiGet(
      ENDPOINTS.speakingQuestions,
      S.speakingModelQuestionsSchema,
      { ...CATALOG, tags: [TAGS.speaking, entityTag.speakingModel(modelId)] },
      { model_id: modelId }
    );
    return {
      model: N.normalizeSpeakingModel({
        ...raw.model,
        question_count: raw.questions.length,
      }),
      // The app lists these in payload order. sort_order belongs to the
      // question's own topic, so sorting here would reshuffle the model.
      questions: raw.questions.map(N.normalizeSpeakingQuestion),
    };
  }
);

export const getSpeakingTopicIdeas = cache(
  async (
    topicId: number
  ): Promise<{
    topic: { id: number; title: string };
    categories: N.SpeakingIdeaCategory[];
  }> => {
    const raw = await apiGet(
      ENDPOINTS.speakingTopicIdeas,
      S.speakingTopicIdeasSchema,
      { ...CATALOG, tags: [TAGS.speaking, entityTag.speakingTopic(topicId)] },
      { topic_id: topicId }
    );
    return N.normalizeSpeakingIdeas(raw);
  }
);

/** Ideas search across topics, with the open topic ranked first. `part=1`. */
export const searchSpeakingTopicIdeas = cache(
  async (topicId: number, query: string): Promise<N.SpeakingIdeaSearchHit[]> => {
    const raw = await apiGet(
      ENDPOINTS.speakingIdeasSearch,
      S.speakingIdeasSearchSchema,
      { ...CATALOG, tags: [TAGS.speaking, entityTag.speakingTopic(topicId)] },
      { q: query, topic_id: topicId, part: 1 }
    );
    return N.normalizeSpeakingIdeasSearch(raw);
  }
);

/* ── word games ──────────────────────────────────────────────────────────── */

/**
 * All 51 categories with all 2,851 words — 402 KB in one response, with no
 * per-category variant. Fetched and cached whole on the server; a category page
 * sends the browser only its own words.
 */
export const getGameCategories = cache(async (): Promise<N.GameCategory[]> => {
  const raw = await apiGet(ENDPOINTS.gameCategories, S.gameCategoriesSchema, {
    ...CATALOG_SLOW,
    tags: [TAGS.games],
  });
  return raw
    .map(N.normalizeGameCategory)
    .filter((c) => c.words.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
});

/** Category summaries without the words — what the index page needs. */
export async function getGameCategorySummaries(): Promise<
  Array<Omit<N.GameCategory, 'words'> & { wordCount: number }>
> {
  const categories = await getGameCategories();
  return categories.map(({ words, ...rest }) => ({ ...rest, wordCount: words.length }));
}

export async function getGameCategory(slug: string): Promise<N.GameCategory | null> {
  const categories = await getGameCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

/* ── app update ──────────────────────────────────────────────────────────── */

export const getAppUpdate = cache(async (): Promise<N.AppUpdate> => {
  const raw = await apiGet(ENDPOINTS.appUpdate, S.appUpdateSchema, {
    ...CATALOG_SLOW,
    tags: [TAGS.appUpdate],
  });
  return N.normalizeAppUpdate(raw);
});
