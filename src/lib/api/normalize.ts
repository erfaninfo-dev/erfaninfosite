import type { GlossLang } from '@/lib/i18n/config';

import type {
  RawAppUpdate,
  RawBook,
  RawBookPdf,
  RawGameCategory,
  RawGrammarBook,
  RawGrammarQuestion,
  RawGrammarTopic,
  RawGrammarTopicPdf,
  RawGrammarUnit,
  RawGrammarUnitText,
  RawSection,
  RawSpeakingIdeas,
  RawSpeakingIdeasSearch,
  RawSpeakingModel,
  RawSpeakingQuestion,
  RawSpeakingTopic,
  RawUnit,
  RawUnitSample,
  RawWord,
} from './schemas';

/**
 * The one adapter that knows the API's naming chaos.
 *
 * Across the endpoints Kurdish is spelled four ways (`kur`, `ckb`, `ku`, and
 * inside `text_en_kur`) across seven field conventions. Everything below maps
 * to a single `Trilingual` shape, and nothing downstream ever sees a raw field
 * name. See docs/api-contract.md §2.
 */

export type Trilingual = {
  en: string;
  fa: string;
  ckb: string;
};

const EMPTY: Trilingual = { en: '', fa: '', ckb: '' };

function tri(en: string, fa: string, ckb: string): Trilingual {
  return { en: en.trim(), fa: fa.trim(), ckb: ckb.trim() };
}

/* ── the mojibake guard, ported from the app ─────────────────────────────── */

/**
 * The app's `_looksCorruptLocalText` in lib/core/language/language_provider.dart.
 *
 * Some rows in the database hold text that was mangled on the way in and comes
 * back as replacement characters or a run of question marks. The app skips
 * those candidates when picking a gloss; without this the website would show
 * `????` where a real word belongs.
 *
 * Intent: strip punctuation and whitespace *noise*, then reject what is left if
 * it contains U+FFFD, or is at least 3 characters and 60 % or more question
 * marks.
 *
 * **Deliberate divergence from the app.** The Dart strips `[\s\p{P}\p{S}]`
 * before testing — but `?` is itself punctuation (`\p{P}`) and U+FFFD is itself
 * a symbol (`\p{S}`), so that strip removes exactly the characters the test
 * then looks for. The app's guard therefore almost never fires. Reproducing the
 * bug would mean shipping `?????` to readers on purpose, so the strip here
 * excludes those two characters and the check works as intended. Flagged for
 * Erfan: the same one-line fix is worth making in the app.
 */
const NOISE = /(?![?�])[\s\p{P}\p{S}]/gu;

export function looksCorrupt(value: string): boolean {
  const compact = value.replace(NOISE, '');
  if (compact.length === 0) return false;
  if (compact.includes('�')) return true;

  const questionMarks = (compact.match(/\?/g) ?? []).length;
  return compact.length >= 3 && questionMarks / compact.length >= 0.6;
}

/** First candidate that is non-empty and not corrupt. */
function firstClean(values: readonly string[]): string {
  for (const raw of values) {
    const value = raw.trim();
    if (value.length > 0 && !looksCorrupt(value)) return value;
  }
  return '';
}

/**
 * Resolve a trilingual value to the reader's gloss, with the app's exact
 * fallback chain:
 *   Kurdish selected → ckb, then fa, then en
 *   Persian selected → fa, then ckb, then en
 */
export function glossOf(value: Trilingual, gloss: GlossLang): string {
  return gloss === 'ckb'
    ? firstClean([value.ckb, value.fa, value.en])
    : firstClean([value.fa, value.ckb, value.en]);
}

/** The other two languages, for the "one tap away" secondary display. */
export function otherGlosses(
  value: Trilingual,
  gloss: GlossLang
): Array<{ lang: 'en' | 'fa' | 'ckb'; text: string }> {
  const order: Array<'en' | 'fa' | 'ckb'> =
    gloss === 'ckb' ? ['fa', 'en'] : ['ckb', 'en'];
  return order
    .map((lang) => ({ lang, text: value[lang].trim() }))
    .filter((entry) => entry.text.length > 0 && !looksCorrupt(entry.text));
}

/**
 * `app_update` serves its download URLs over plain `http://`, which browsers
 * treat as mixed content on an HTTPS page. Decision D4/R2: upgrade the scheme
 * — the same host serves HTTPS correctly.
 */
export function secureUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://')) return `https://${trimmed.slice('http://'.length)}`;
  return trimmed;
}

/* ── books and vocabulary ────────────────────────────────────────────────── */

export type Book = {
  id: number;
  title: string;
  description: string;
  sortOrder: number;
  isPublic: boolean;
  isStudent: boolean;
  track: string;
  seriesId: number | null;
  seriesTitle: string | null;
  seriesSortOrder: number;
  volumeOrder: number;
};

/**
 * Cambridge IELTS volumes whose tests are served by `cambridge_manifest.php`
 * (`11-academic` through `21-academic`).
 */
export const CAMBRIDGE_LIVE_VOLUMES = [21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11] as const;

const CAMBRIDGE_LIVE_SET: ReadonlySet<number> = new Set(CAMBRIDGE_LIVE_VOLUMES);

/** Numeric volume from a title such as `Cambridge IELTS 14 — Academic`. */
export function cambridgeVolumeNumber(book: Pick<Book, 'title'>): number | null {
  const m = book.title.match(/cambridge\s+ielts\s+(\d+)\b/i);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Live folder slug, e.g. `14-academic`, when this volume has interactive tests. */
export function cambridgeSlugForBook(book: Pick<Book, 'title'>): string | null {
  const vol = cambridgeVolumeNumber(book);
  if (vol === null || !CAMBRIDGE_LIVE_SET.has(vol)) return null;
  return `${vol}-academic`;
}

/** True when the book opens the Cambridge exam hub instead of the unit grid. */
export function isCambridgePracticeBook(book: Pick<Book, 'title'>): boolean {
  return cambridgeSlugForBook(book) !== null;
}

/** Backward-compatible check for Cambridge IELTS 15. */
export function isCambridgeVolume15(book: Pick<Book, 'title'>): boolean {
  return cambridgeVolumeNumber(book) === 15;
}

/**
 * The app's `kIdiomsSpeakingBookId`. That book opens an illustrated unit
 * grid rather than the ordinary unit cards.
 */
export const IDIOMS_SPEAKING_BOOK_ID = 37;

/**
 * Same order as the app's `Book.compareSeriesVolumes`: volume, then sort
 * order, then title. The API's `volume_order` is a display index, so Cambridge
 * 18 comes before 17.
 */
export function compareSeriesVolumes(a: Book, b: Book): number {
  if (a.volumeOrder !== b.volumeOrder) return a.volumeOrder - b.volumeOrder;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
}

export function normalizeBook(raw: RawBook): Book {
  return {
    id: raw.id,
    title: raw.title.trim(),
    description: (raw.description ?? '').trim(),
    sortOrder: raw.sort_order,
    isPublic: raw.is_public,
    isStudent: raw.is_student,
    track: raw.track.trim(),
    seriesId: raw.series_id ?? null,
    seriesTitle: raw.series_title?.trim() || null,
    seriesSortOrder: raw.series_sort_order,
    volumeOrder: raw.volume_order,
  };
}

export type Unit = {
  unit: number;
  details: string;
};

export function normalizeUnit(raw: RawUnit): Unit {
  return { unit: raw.unit, details: (raw.unit_details ?? '').trim() };
}

export type Word = {
  id: number;
  bookId: number;
  unit: number;
  section: number;
  sectionDetails: string;
  word: string;
  type: string;
  important: boolean;
  meaning: Trilingual;
  example: Trilingual;
};

export function normalizeWord(raw: RawWord): Word {
  return {
    id: raw.id,
    bookId: raw.book_id,
    unit: raw.unit,
    section: raw.section,
    sectionDetails: (raw.section_details ?? '').trim(),
    word: raw.word.trim(),
    type: raw.type.trim(),
    important: raw.important,
    meaning: tri(raw.meaning_en, raw.meaning_fa, raw.meaning_kur),
    example: tri(raw.example_en, raw.example_fa, raw.example_kur),
  };
}

export type Section = {
  section: number;
  details: string;
};

export function normalizeSection(raw: RawSection): Section {
  return { section: raw.section, details: (raw.section_details ?? '').trim() };
}

/**
 * `text_en_fa` and `text_en_kur` are **not** a language triple — they are two
 * bilingual documents, each mixing English with one local language. So the
 * normalized form has no `en`.
 */
export type BilingualText = {
  fa: string;
  ckb: string;
};

export type UnitSample = {
  id: number;
  bookId: number;
  unit: number;
  section: number | null;
  title: string;
  text: BilingualText;
};

export function normalizeUnitSample(raw: RawUnitSample): UnitSample {
  return {
    id: raw.id,
    bookId: raw.book_id,
    unit: raw.unit,
    section: raw.section ?? null,
    title: raw.title.trim(),
    text: { fa: raw.text_en_fa.trim(), ckb: raw.text_en_kur.trim() },
  };
}

/** Bilingual blobs fall back to the other language when one is missing. */
export function bilingualFor(text: BilingualText, gloss: GlossLang): string {
  return gloss === 'ckb'
    ? firstClean([text.ckb, text.fa])
    : firstClean([text.fa, text.ckb]);
}

/** True when the reader's own language is genuinely unavailable. */
export function bilingualIsFallback(text: BilingualText, gloss: GlossLang): boolean {
  const own = gloss === 'ckb' ? text.ckb : text.fa;
  return own.trim().length === 0 && bilingualFor(text, gloss).length > 0;
}

export type BookPdf = {
  id: number;
  bookId: number;
  title: string;
  url: string;
  sortOrder: number;
};

export function normalizeBookPdf(raw: RawBookPdf): BookPdf {
  return {
    id: raw.id,
    bookId: raw.book_id,
    title: raw.title.trim(),
    url: secureUrl(raw.pdf_url),
    sortOrder: raw.sort_order,
  };
}

/* ── grammar ─────────────────────────────────────────────────────────────── */

export type GrammarBook = {
  id: number;
  title: string;
  level: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  unitCount: number;
  questionCount: number;
};

export function normalizeGrammarBook(raw: RawGrammarBook): GrammarBook {
  return {
    id: raw.id,
    title: raw.title.trim(),
    level: raw.level.trim(),
    description: raw.description.trim(),
    sortOrder: raw.sort_order,
    isActive: raw.is_active,
    unitCount: raw.unit_count,
    questionCount: raw.question_count,
  };
}

export type GrammarUnit = {
  id: number;
  bookId: number;
  unitNumber: number;
  title: string;
  subtitle: string;
  sortOrder: number;
  isActive: boolean;
  textCount: number;
  questionCount: number;
};

export function normalizeGrammarUnit(raw: RawGrammarUnit): GrammarUnit {
  return {
    id: raw.id,
    bookId: raw.grammar_book_id,
    unitNumber: raw.unit_number,
    title: raw.title.trim(),
    subtitle: (raw.subtitle ?? '').trim(),
    sortOrder: raw.sort_order,
    isActive: raw.is_active,
    textCount: raw.text_count,
    questionCount: raw.question_count,
  };
}

export type GrammarUnitText = {
  id: number;
  unitId: number;
  title: string;
  text: BilingualText;
  sortOrder: number;
  isActive: boolean;
};

export function normalizeGrammarUnitText(raw: RawGrammarUnitText): GrammarUnitText {
  return {
    id: raw.id,
    unitId: raw.grammar_unit_id,
    title: raw.title.trim(),
    text: { fa: raw.text_en_fa.trim(), ckb: raw.text_en_kur.trim() },
    sortOrder: raw.sort_order,
    isActive: raw.is_active,
  };
}

export type GrammarTopic = {
  id: number;
  topic: string;
  questionCount: number;
  sortOrder: number;
  createdAt: string | null;
  isNew: boolean;
};

export function normalizeGrammarTopic(raw: RawGrammarTopic): GrammarTopic {
  const created = (raw.topic_created_at ?? '').trim();
  const sortOrder = raw.sort_order ?? raw.sort ?? 0;
  return {
    id: raw.topic_id,
    topic: raw.topic.trim(),
    questionCount: raw.question_count,
    sortOrder,
    // The MySQL zero date means "unknown", not a real timestamp.
    createdAt: created && !created.startsWith('0000-00-00') ? created : null,
    isNew: raw.is_new,
  };
}

export const OPTION_KEYS = ['option1', 'option2', 'option3', 'option4'] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];

export type GrammarQuestion = {
  id: number;
  topic: string;
  questionText: string;
  /** Only options with non-empty text, in option1→option4 order, unshuffled. */
  options: Array<{ key: OptionKey; text: string }>;
  correctAnswer: string;
  orderNum: number;
  explanation: Trilingual;
};

export function normalizeGrammarQuestion(raw: RawGrammarQuestion): GrammarQuestion {
  const byKey: Record<OptionKey, string> = {
    option1: raw.option1.trim(),
    option2: raw.option2.trim(),
    option3: raw.option3.trim(),
    option4: raw.option4.trim(),
  };

  return {
    id: raw.id,
    topic: raw.topic.trim(),
    questionText: raw.question_text.trim(),
    options: OPTION_KEYS.filter((key) => byKey[key].length > 0).map((key) => ({
      key,
      text: byKey[key],
    })),
    correctAnswer: raw.correct_answer.trim(),
    orderNum: raw.order_num ?? 0,
    // Note the prefix convention here: `eng_`, not `en_`.
    explanation: tri(raw.eng_explanation, raw.fa_explanation, raw.kur_explanation),
  };
}

export type GrammarTopicPdf = {
  id: number;
  topic: string;
  title: string;
  url: string;
  urlKurdish: string;
  sortOrder: number;
};

export function normalizeGrammarTopicPdf(raw: RawGrammarTopicPdf): GrammarTopicPdf {
  return {
    id: raw.id,
    topic: raw.topic.trim(),
    title: raw.title.trim(),
    url: secureUrl(raw.pdf_url),
    urlKurdish: secureUrl(raw.pdf_url_kur),
    sortOrder: raw.sort_order,
  };
}

/* ── speaking ────────────────────────────────────────────────────────────── */

export type SpeakingTopic = {
  id: number;
  title: string;
  questionCount: number;
  sortOrder: number;
};

export function normalizeSpeakingTopic(raw: RawSpeakingTopic): SpeakingTopic {
  return {
    id: raw.id,
    title: raw.title.trim(),
    questionCount: raw.question_count,
    sortOrder: raw.sort_order,
  };
}

export type SpeakingModel = {
  id: number;
  modelNumber: number;
  title: string;
  formula: string;
  template: string;
  questionCount: number;
};

export function normalizeSpeakingModel(raw: RawSpeakingModel): SpeakingModel {
  return {
    id: raw.id,
    modelNumber: raw.model_number,
    title: raw.title.trim(),
    formula: raw.formula.trim(),
    template: raw.template.trim(),
    questionCount: raw.question_count ?? 0,
  };
}

export type SpeakingQuestion = {
  id: number;
  questionText: string;
  /** `answer` has no language prefix; fa and kur do. */
  answer: Trilingual;
  sortOrder: number;
  topicId: number | null;
  topicTitle: string;
  modelId: number | null;
  /** App label is `speakingModelNumber(modelNumber)`, not the row id. */
  modelNumber: number;
  modelTitle: string;
  modelFormula: string;
  modelTemplate: string;
  /**
   * Band samples. `answer` is the English text the copy button uses.
   * `fa` / `ckb` are the gloss, with the same fallback as the sample answer
   * (the other local language, never English).
   */
  bandAnswers: Array<{ band: string; answer: string; fa: string; ckb: string }>;
};

export function normalizeSpeakingQuestion(raw: RawSpeakingQuestion): SpeakingQuestion {
  return {
    id: raw.id,
    questionText: raw.question_text.trim(),
    answer: tri(raw.answer, raw.fa_answer, raw.kur_answer),
    sortOrder: raw.sort_order ?? 0,
    topicId: raw.topic?.id ?? null,
    topicTitle: raw.topic?.title.trim() ?? '',
    modelId: raw.model?.id ?? null,
    modelNumber: raw.model?.model_number ?? 0,
    modelTitle: raw.model?.title.trim() ?? '',
    modelFormula: raw.model?.formula.trim() ?? '',
    modelTemplate: raw.model?.template.trim() ?? '',
    bandAnswers: (raw.band_answers ?? [])
      .map((b) => ({
        band: (b.band ?? '').trim(),
        answer: b.answer.trim(),
        fa: b.fa_answer.trim(),
        ckb: b.kur_answer.trim(),
      }))
      .filter((b) => b.band.length > 0 && b.answer.length > 0)
      .sort((a, b) => (Number.parseFloat(a.band) || 0) - (Number.parseFloat(b.band) || 0)),
  };
}

export type SpeakingIdeaCategory = {
  category: string;
  titleEn: string;
  ideas: Array<{
    id: number;
    phrase: string;
    example: string;
    /** A band like "6.5". A string: never coerce, or "6" becomes "6.0". */
    band: string;
    sortOrder: number;
  }>;
};

export function normalizeSpeakingIdeas(raw: RawSpeakingIdeas): {
  topic: { id: number; title: string };
  categories: SpeakingIdeaCategory[];
} {
  return {
    topic: { id: raw.topic.id, title: raw.topic.title.trim() },
    categories: raw.categories.map((c) => ({
      category: c.category.trim(),
      titleEn: c.title_en.trim(),
      ideas: c.ideas
        .map((i) => ({
          id: i.id,
          phrase: i.phrase.trim(),
          example: i.example.trim(),
          band: (i.band_text ?? '').trim(),
          sortOrder: i.sort_order ?? 0,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    })),
  };
}

export type SpeakingIdeaSearchHit = {
  id: number;
  topicId: number;
  topicTitle: string;
  category: string;
  categoryTitleEn: string;
  phrase: string;
  example: string;
  band: string;
  sortOrder: number;
  isCurrentTopic: boolean;
};

export function normalizeSpeakingIdeasSearch(raw: RawSpeakingIdeasSearch): SpeakingIdeaSearchHit[] {
  return raw.results.map((hit) => ({
    id: hit.id,
    topicId: hit.topic?.id ?? 0,
    topicTitle: hit.topic?.title.trim() ?? '',
    category: hit.category.trim(),
    categoryTitleEn: hit.category_title_en.trim(),
    phrase: hit.phrase.trim(),
    example: hit.example.trim(),
    band: (hit.band_text ?? '').trim(),
    sortOrder: hit.sort_order ?? 0,
    isCurrentTopic: hit.is_current_topic,
  }));
}

/* ── word games ──────────────────────────────────────────────────────────── */

export type GameWord = {
  word: string;
  meaning: Trilingual;
  example: Trilingual;
};

export type GameCategory = {
  id: number;
  slug: string;
  /** `name_ckb` here, while the nested words use `meaning_kur`. */
  name: Trilingual;
  icon: string;
  sortOrder: number;
  words: GameWord[];
};

export function normalizeGameCategory(raw: RawGameCategory): GameCategory {
  return {
    id: raw.id,
    slug: raw.slug.trim(),
    name: tri(raw.name_en, raw.name_fa, raw.name_ckb),
    icon: raw.icon.trim(),
    sortOrder: raw.sort_order,
    words: raw.words.map((w) => ({
      word: w.word.trim(),
      meaning: tri(w.meaning_en, w.meaning_fa, w.meaning_kur),
      example: tri(w.example_en, w.example_fa, w.example_kur),
    })),
  };
}

/* ── app update ──────────────────────────────────────────────────────────── */

export type AppUpdate = {
  android: { versionCode: number; versionName: string; url: string; force: boolean };
  windows: { versionCode: number; versionName: string; url: string; force: boolean };
  /** Keyed `ku` on the wire; normalized to `ckb` like everything else. */
  releaseNotes: Trilingual;
};

export function normalizeAppUpdate(raw: RawAppUpdate): AppUpdate {
  const notes = raw.release_notes;
  return {
    android: {
      versionCode: raw.android_version_code ?? 0,
      versionName: raw.android_version_name.trim(),
      url: secureUrl(raw.apk_url),
      force: raw.android_force_update ?? raw.force_update ?? false,
    },
    windows: {
      versionCode: raw.windows_version_code ?? 0,
      versionName: raw.windows_version_name.trim(),
      url: secureUrl(raw.windows_url),
      force: raw.windows_force_update ?? raw.force_update ?? false,
    },
    releaseNotes: notes ? tri(notes.en, notes.fa, notes.ku) : EMPTY,
  };
}

/**
 * Release-note selection, matching `AppReleaseNotes.bodyFor` in the app:
 * the reader's language first, then the first non-empty of en, fa, ckb.
 */
export function releaseNoteFor(notes: Trilingual, locale: 'en' | 'fa' | 'ckb'): string {
  const own = notes[locale].trim();
  if (own) return own;
  return firstClean([notes.en, notes.fa, notes.ckb]);
}
