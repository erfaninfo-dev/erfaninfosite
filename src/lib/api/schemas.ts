import { z } from 'zod';

/**
 * zod schemas mirroring the live wordsapi responses.
 *
 * Every shape here was verified with a real request on 2026-10-30 and matched
 * against the Dart model and the PHP source. Where they disagreed, the live
 * response won. See docs/api-contract.md.
 *
 * Two principles, both from the brief:
 *   - Tolerant: unknown extra fields are ignored (zod objects strip by default),
 *     and a missing optional field must not crash a page.
 *   - Honest: a field that the API actually always sends is required, so a
 *     backend rename fails `pnpm contract:check` loudly instead of silently
 *     rendering blanks.
 */

/* ── shared primitives ───────────────────────────────────────────────────── */

/**
 * The API is inconsistent about booleans. `is_public`, `is_active` and `is_new`
 * are real JSON booleans, but `important` and the three `force_update` flags
 * are ints 0/1. This accepts either, matching the Dart `== 1` reading.
 */
const flexibleBool = z.union([z.boolean(), z.number(), z.string()]).transform((v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  return v === '1' || v.toLowerCase() === 'true';
});

/**
 * `unit_samples.php` returns quoted strings for every numeric field
 * (`"id":"36"`), unlike every other endpoint. Used only there.
 */
const numericString = z.coerce.number();

/** Nullable text that the API sometimes sends as null and sometimes as "". */
const nullableText = z
  .string()
  .nullish()
  .transform((v) => v ?? '');

/* ── books and vocabulary ────────────────────────────────────────────────── */

export const bookSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullish(),
  sort_order: z.number(),
  is_public: flexibleBool,
  is_student: flexibleBool,
  track: z.string(),
  series_id: z.number().nullish(),
  volume_order: z.number(),
  series_title: z.string().nullish(),
  series_sort_order: z.number(),
});
export const booksSchema = z.array(bookSchema);
export type RawBook = z.infer<typeof bookSchema>;

export const unitSchema = z.object({
  unit: z.number(),
  unit_details: z.string().nullish(),
});
export const unitsSchema = z.array(unitSchema);
export type RawUnit = z.infer<typeof unitSchema>;

export const wordSchema = z.object({
  id: z.number(),
  book_id: z.number(),
  unit: z.number(),
  section: z.number(),
  section_details: z.string().nullish(),
  word: z.string(),
  type: nullableText,
  important: flexibleBool,
  meaning_en: nullableText,
  meaning_fa: nullableText,
  meaning_kur: nullableText,
  example_en: nullableText,
  example_fa: nullableText,
  example_kur: nullableText,
});
export const wordsSchema = z.array(wordSchema);
export type RawWord = z.infer<typeof wordSchema>;

export const sectionSchema = z.object({
  section: z.number(),
  section_details: z.string().nullish(),
});
export const sectionsSchema = z.array(sectionSchema);
export type RawSection = z.infer<typeof sectionSchema>;

/** The one endpoint that returns numbers as strings. */
export const unitSampleSchema = z.object({
  id: numericString,
  book_id: numericString,
  unit: numericString,
  section: numericString.nullish(),
  title: nullableText,
  text_en_fa: nullableText,
  text_en_kur: nullableText,
});
export const unitSamplesSchema = z.array(unitSampleSchema);
export type RawUnitSample = z.infer<typeof unitSampleSchema>;

export const bookPdfSchema = z.object({
  id: z.number(),
  book_id: z.number(),
  title: z.string(),
  pdf_url: z.string(),
  sort_order: z.number(),
  updated_at: z.string().nullish(),
});
export const bookPdfsSchema = z.array(bookPdfSchema);
export type RawBookPdf = z.infer<typeof bookPdfSchema>;

/* ── grammar ─────────────────────────────────────────────────────────────── */

export const grammarBookSchema = z.object({
  id: z.number(),
  title: z.string(),
  level: nullableText,
  description: nullableText,
  sort_order: z.number(),
  is_active: flexibleBool,
  created_at: z.string().nullish(),
  unit_count: z.number(),
  question_count: z.number(),
});
export const grammarBooksSchema = z.array(grammarBookSchema);
export type RawGrammarBook = z.infer<typeof grammarBookSchema>;

export const grammarUnitSchema = z.object({
  id: z.number(),
  grammar_book_id: z.number(),
  unit_number: z.number(),
  title: z.string(),
  subtitle: z.string().nullish(),
  sort_order: z.number(),
  is_active: flexibleBool,
  created_at: z.string().nullish(),
  text_count: z.number(),
  question_count: z.number(),
});
export const grammarUnitsSchema = z.array(grammarUnitSchema);
export type RawGrammarUnit = z.infer<typeof grammarUnitSchema>;

export const grammarUnitTextSchema = z.object({
  id: z.number(),
  grammar_unit_id: z.number(),
  title: nullableText,
  text_en_fa: nullableText,
  text_en_kur: nullableText,
  sort_order: z.number(),
  is_active: flexibleBool,
  created_at: z.string().nullish(),
});
export const grammarUnitTextsSchema = z.array(grammarUnitTextSchema);
export type RawGrammarUnitText = z.infer<typeof grammarUnitTextSchema>;

export const grammarTopicSchema = z.object({
  topic: z.string(),
  topic_id: z.number(),
  question_count: z.number(),
  /** Can be the MySQL zero date `"0000-00-00 00:00:00"`. Kept as a string. */
  topic_created_at: z.string().nullish(),
  is_new: flexibleBool,
});
export const grammarTopicsSchema = z.array(grammarTopicSchema);
export type RawGrammarTopic = z.infer<typeof grammarTopicSchema>;

export const grammarQuestionSchema = z.object({
  id: z.number(),
  topic: z.string(),
  question_text: nullableText,
  option1: nullableText,
  option2: nullableText,
  option3: nullableText,
  option4: nullableText,
  /** The literal key `option1`…`option4`, never the answer text. */
  correct_answer: nullableText,
  order_num: z.number().nullish(),
  fa_explanation: nullableText,
  kur_explanation: nullableText,
  eng_explanation: nullableText,
  /** Null on every row observed; the book/unit link carries no data yet. */
  grammar_book_id: z.number().nullish(),
  grammar_unit_id: z.number().nullish(),
});
export const grammarQuestionsSchema = z.array(grammarQuestionSchema);
export type RawGrammarQuestion = z.infer<typeof grammarQuestionSchema>;

export const grammarTopicPdfSchema = z.object({
  id: z.number(),
  topic: z.string(),
  title: nullableText,
  pdf_url: nullableText,
  pdf_url_kur: nullableText,
  sort_order: z.number(),
  updated_at: z.string().nullish(),
});
export const grammarTopicPdfsSchema = z.array(grammarTopicPdfSchema);
export type RawGrammarTopicPdf = z.infer<typeof grammarTopicPdfSchema>;

/* ── speaking ────────────────────────────────────────────────────────────── */

export const speakingTopicSchema = z.object({
  id: z.number(),
  title: z.string(),
  question_count: z.number(),
  sort_order: z.number(),
});
export const speakingTopicsSchema = z.array(speakingTopicSchema);
export type RawSpeakingTopic = z.infer<typeof speakingTopicSchema>;

export const speakingModelSchema = z.object({
  id: z.number(),
  model_number: z.number(),
  title: z.string(),
  formula: nullableText,
  template: nullableText,
  question_count: z.number().nullish(),
});
export const speakingModelsSchema = z.array(speakingModelSchema);
export type RawSpeakingModel = z.infer<typeof speakingModelSchema>;

const speakingBandAnswerSchema = z.object({
  band: z.union([z.string(), z.number()]).transform(String).nullish(),
  answer: nullableText,
  fa_answer: nullableText,
  kur_answer: nullableText,
});

export const speakingQuestionSchema = z.object({
  id: z.number(),
  question_text: nullableText,
  answer: nullableText,
  fa_answer: nullableText,
  kur_answer: nullableText,
  sort_order: z.number().nullish(),
  topic: z.object({ id: z.number(), title: z.string() }).nullish(),
  model: speakingModelSchema.partial({ question_count: true }).nullish(),
  /** Present on the topic_id form, absent on the model_id form. */
  band_answers: z.array(speakingBandAnswerSchema).nullish(),
});

/** `?topic_id=` returns `{topic, questions}`. */
export const speakingTopicQuestionsSchema = z.object({
  topic: z.object({ id: z.number(), title: z.string() }),
  questions: z.array(speakingQuestionSchema),
});

/** `?model_id=` returns `{model, questions}` — a different envelope. */
export const speakingModelQuestionsSchema = z.object({
  model: speakingModelSchema.partial({ question_count: true }),
  questions: z.array(speakingQuestionSchema),
});

export type RawSpeakingQuestion = z.infer<typeof speakingQuestionSchema>;

const speakingIdeaSchema = z.object({
  id: z.number(),
  phrase: nullableText,
  example: nullableText,
  /** A band score like "6" or "6.5". A string — never coerce it to a number. */
  band_text: z.union([z.string(), z.number()]).transform(String).nullish(),
  sort_order: z.number().nullish(),
});

export const speakingTopicIdeasSchema = z.object({
  topic: z.object({ id: z.number(), title: z.string() }),
  categories: z.array(
    z.object({
      category: z.string(),
      title_en: nullableText,
      ideas: z.array(speakingIdeaSchema),
    })
  ),
});
export type RawSpeakingIdeas = z.infer<typeof speakingTopicIdeasSchema>;

/** `speaking_topic_ideas_search.php?q=&topic_id=&part=1` */
export const speakingIdeasSearchSchema = z.object({
  query: z.string().nullish(),
  priority_topic_id: z.number().nullish(),
  results: z.array(
    z.object({
      id: z.number(),
      topic: z.object({ id: z.number(), title: z.string() }).nullish(),
      category: z.string(),
      category_title_en: nullableText,
      phrase: nullableText,
      example: nullableText,
      band_text: z.union([z.string(), z.number()]).transform(String).nullish(),
      sort_order: z.number().nullish(),
      is_current_topic: z
        .union([z.boolean(), z.number()])
        .nullish()
        .transform((value) => value === true || value === 1),
    })
  ),
});
export type RawSpeakingIdeasSearch = z.infer<typeof speakingIdeasSearchSchema>;

/* ── word games ──────────────────────────────────────────────────────────── */

const gameWordSchema = z.object({
  word: z.string(),
  meaning_en: nullableText,
  meaning_fa: nullableText,
  meaning_kur: nullableText,
  example_en: nullableText,
  example_fa: nullableText,
  example_kur: nullableText,
});

/**
 * The only endpoint that names Kurdish `ckb` — and in the same response its
 * nested words use `meaning_kur`. One payload, two conventions.
 */
export const gameCategorySchema = z.object({
  id: z.number(),
  slug: z.string(),
  name_en: nullableText,
  name_fa: nullableText,
  name_ckb: nullableText,
  /** A Flutter Material icon identifier, e.g. `pets_rounded`. */
  icon: nullableText,
  sort_order: z.number(),
  words: z.array(gameWordSchema),
});
export const gameCategoriesSchema = z.array(gameCategorySchema);
export type RawGameCategory = z.infer<typeof gameCategorySchema>;

/* ── app update ──────────────────────────────────────────────────────────── */

export const appUpdateSchema = z.object({
  android_version_code: z.number().nullish(),
  android_version_name: nullableText,
  apk_url: nullableText,
  android_force_update: flexibleBool.nullish(),
  windows_version_code: z.number().nullish(),
  windows_version_name: nullableText,
  windows_url: nullableText,
  windows_force_update: flexibleBool.nullish(),
  force_update: flexibleBool.nullish(),
  /** Keyed `ku` here — a third spelling of Kurdish. */
  release_notes: z
    .object({
      en: nullableText,
      fa: nullableText,
      ku: nullableText,
    })
    .nullish(),
});
export type RawAppUpdate = z.infer<typeof appUpdateSchema>;
