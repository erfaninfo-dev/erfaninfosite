/**
 * The complete list of wordsapi endpoints this website uses, and the cache tag
 * each one belongs to.
 *
 * This is the only place endpoint names exist. Pages and components never see
 * a `.php` string. Phase 1 is read-only and public, so every endpoint here is
 * a token-free GET.
 */

export const ENDPOINTS = {
  books: 'books.php',
  units: 'units.php',
  words: 'words.php',
  sections: 'sections.php',
  unitSamples: 'unit_samples.php',
  bookPdfs: 'book_pdfs.php',

  grammarBooks: 'grammar_books.php',
  grammarUnits: 'grammar_units.php',
  grammarUnitTexts: 'grammar_unit_texts.php',
  grammarTopics: 'grammar_topics.php',
  grammarQuestions: 'grammar_questions.php',
  grammarTopicPdfs: 'grammar_topic_pdfs.php',

  speakingTopics: 'speaking_topics.php',
  speakingModels: 'speaking_model_questions.php',
  speakingQuestions: 'speaking_questions.php',
  speakingTopicIdeas: 'speaking_topic_ideas.php',
  speakingIdeasSearch: 'speaking_topic_ideas_search.php',

  gameCategories: 'game_word_categories.php',
  appUpdate: 'app_update.php',
} as const;

export type EndpointName = keyof typeof ENDPOINTS;

/**
 * Cache tags. `/internal/revalidate` accepts only tags from this allowlist, so
 * a caller cannot invalidate something arbitrary.
 */
export const TAGS = {
  books: 'books',
  grammar: 'grammar',
  speaking: 'speaking',
  games: 'games',
  appUpdate: 'app-update',
} as const;

export type TagName = (typeof TAGS)[keyof typeof TAGS];

export const ALL_TAGS: readonly TagName[] = Object.values(TAGS);

export function isKnownTag(value: string): value is TagName {
  return (ALL_TAGS as readonly string[]).includes(value);
}

/** Per-entity tags, so one book can be revalidated without the whole catalog. */
export const entityTag = {
  book: (id: number) => `book:${id}`,
  bookWords: (id: number) => `book:${id}:words`,
  grammarBook: (id: number) => `grammar:book:${id}`,
  grammarUnit: (id: number) => `grammar:unit:${id}`,
  grammarTopic: (id: number) => `grammar:topic:${id}`,
  speakingTopic: (id: number) => `speaking:topic:${id}`,
  speakingModel: (id: number) => `speaking:model:${id}`,
} as const;
