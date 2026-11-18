import { describe, expect, it } from 'vitest';

import {
  bilingualFor,
  bilingualIsFallback,
  glossOf,
  looksCorrupt,
  normalizeAppUpdate,
  normalizeGameCategory,
  normalizeGrammarQuestion,
  normalizeGrammarTopic,
  normalizeUnitSample,
  normalizeWord,
  otherGlosses,
  releaseNoteFor,
  secureUrl,
  type Trilingual,
} from '@/lib/api/normalize';
import { appUpdateSchema, unitSampleSchema, wordSchema } from '@/lib/api/schemas';

/** Small synthetic fixtures. Nothing is copied from the live API. */

describe('looksCorrupt — the app mojibake guard', () => {
  it('passes ordinary Persian and Kurdish text', () => {
    expect(looksCorrupt('کتاب')).toBe(false);
    expect(looksCorrupt('پشیلە')).toBe(false);
    expect(looksCorrupt('hello world')).toBe(false);
  });

  it('rejects text containing the replacement character', () => {
    expect(looksCorrupt('کت�اب')).toBe(true);
  });

  it('rejects text that is mostly question marks', () => {
    expect(looksCorrupt('?????')).toBe(true);
    expect(looksCorrupt('??? ???')).toBe(true);
  });

  it('allows a genuine question', () => {
    // One '?' in a real sentence is far below the 60 % threshold.
    expect(looksCorrupt('What is your name?')).toBe(false);
    expect(looksCorrupt('ناوت چییە؟')).toBe(false);
  });

  it('does not reject a short string that is punctuation only', () => {
    // compact becomes empty, so there is nothing to judge.
    expect(looksCorrupt('...')).toBe(false);
    expect(looksCorrupt('')).toBe(false);
  });

  it('needs at least 3 characters before the ratio rule applies', () => {
    expect(looksCorrupt('??')).toBe(false);
    expect(looksCorrupt('???')).toBe(true);
  });
});

describe('glossOf — the app fallback chain', () => {
  const full: Trilingual = { en: 'book', fa: 'کتاب', ckb: 'کتێب' };

  it('prefers the reader language', () => {
    expect(glossOf(full, 'fa')).toBe('کتاب');
    expect(glossOf(full, 'ckb')).toBe('کتێب');
  });

  it('falls back Kurdish → Persian → English', () => {
    expect(glossOf({ en: 'book', fa: 'کتاب', ckb: '' }, 'ckb')).toBe('کتاب');
    expect(glossOf({ en: 'book', fa: '', ckb: '' }, 'ckb')).toBe('book');
  });

  it('falls back Persian → Kurdish → English', () => {
    expect(glossOf({ en: 'book', fa: '', ckb: 'کتێب' }, 'fa')).toBe('کتێب');
    expect(glossOf({ en: 'book', fa: '', ckb: '' }, 'fa')).toBe('book');
  });

  it('skips a corrupt candidate and uses the next language', () => {
    // This is the whole point of porting the guard: the app shows کتاب here,
    // so the website must too rather than rendering '?????'.
    expect(glossOf({ en: 'book', fa: 'کتاب', ckb: '?????' }, 'ckb')).toBe('کتاب');
    expect(glossOf({ en: 'book', fa: '���', ckb: '' }, 'fa')).toBe('book');
  });

  it('returns an empty string when every candidate is unusable', () => {
    expect(glossOf({ en: '', fa: '', ckb: '' }, 'fa')).toBe('');
    expect(glossOf({ en: '???', fa: '???', ckb: '???' }, 'fa')).toBe('');
  });
});

describe('otherGlosses', () => {
  it('offers the two languages the reader did not pick', () => {
    const value: Trilingual = { en: 'book', fa: 'کتاب', ckb: 'کتێب' };
    expect(otherGlosses(value, 'fa')).toEqual([
      { lang: 'ckb', text: 'کتێب' },
      { lang: 'en', text: 'book' },
    ]);
  });

  it('omits empty and corrupt alternatives', () => {
    const value: Trilingual = { en: '', fa: 'کتاب', ckb: '????' };
    expect(otherGlosses(value, 'fa')).toEqual([]);
  });
});

describe('normalizeWord — the _kur convention', () => {
  it('maps meaning_kur and example_kur onto ckb', () => {
    const word = normalizeWord(
      wordSchema.parse({
        id: 1,
        book_id: 2,
        unit: 1,
        section: 0,
        section_details: null,
        word: '  sample  ',
        type: 'noun',
        important: 1,
        meaning_en: 'a sample',
        meaning_fa: 'نمونه',
        meaning_kur: 'نموونە',
        example_en: 'an example',
        example_fa: 'یک مثال',
        example_kur: 'نموونەیەک',
      })
    );

    expect(word.word).toBe('sample');
    expect(word.meaning).toEqual({ en: 'a sample', fa: 'نمونه', ckb: 'نموونە' });
    expect(word.example.ckb).toBe('نموونەیەک');
  });

  it('accepts null section and normalizes it to 0', () => {
    // Book 36 ("Speaking") sends section:null for some units. Rejecting that
    // used to fail the whole words.php payload and blank the unit page.
    const word = normalizeWord(
      wordSchema.parse({
        id: 11430,
        book_id: 36,
        unit: 1,
        section: null,
        section_details: null,
        word: 'introduction',
        type: 'word',
        important: 0,
        meaning_en: 'beginning part',
        meaning_fa: 'مقدمه',
        meaning_kur: 'پێشەکی',
        example_en: 'an example',
        example_fa: 'یک مثال',
        example_kur: 'نموونەیەک',
      })
    );

    expect(word.section).toBe(0);
    expect(word.word).toBe('introduction');
  });

  it('reads `important` as an int 0/1 through the schema, not as a boolean', () => {
    // The API sends `important` as an int. The conversion happens in the zod
    // schema, so this goes through the real pipeline: parse, then normalize.
    const wire = {
      id: 1,
      book_id: 2,
      unit: 1,
      section: 0,
      section_details: null,
      word: 'w',
      type: '',
      meaning_en: '',
      meaning_fa: '',
      meaning_kur: '',
      example_en: '',
      example_fa: '',
      example_kur: '',
    };

    expect(normalizeWord(wordSchema.parse({ ...wire, important: 1 })).important).toBe(
      true
    );
    expect(normalizeWord(wordSchema.parse({ ...wire, important: 0 })).important).toBe(
      false
    );
    // Real booleans must keep working too — other endpoints send those.
    expect(normalizeWord(wordSchema.parse({ ...wire, important: true })).important).toBe(
      true
    );
  });
});

describe('normalizeGrammarQuestion — the eng_/fa_/kur_ prefix convention', () => {
  it('maps eng_explanation onto en, not en_explanation', () => {
    const q = normalizeGrammarQuestion({
      id: 1,
      topic: 'Topic',
      question_text: 'Q',
      option1: 'a',
      option2: 'b',
      option3: '',
      option4: '',
      correct_answer: 'option1',
      order_num: 1,
      fa_explanation: 'فارسی',
      kur_explanation: 'کوردی',
      eng_explanation: 'english',
      grammar_book_id: null,
      grammar_unit_id: null,
    });
    expect(q.explanation).toEqual({ en: 'english', fa: 'فارسی', ckb: 'کوردی' });
  });
});

describe('normalizeGrammarTopic — the MySQL zero date', () => {
  const base = { topic: 'T', topic_id: 1, question_count: 10, is_new: false };

  it('treats "0000-00-00 00:00:00" as unknown, not a date', () => {
    expect(
      normalizeGrammarTopic({ ...base, topic_created_at: '0000-00-00 00:00:00' })
        .createdAt
    ).toBeNull();
  });

  it('treats null as unknown', () => {
    expect(
      normalizeGrammarTopic({ ...base, topic_created_at: null }).createdAt
    ).toBeNull();
  });

  it('keeps a real timestamp as a string', () => {
    expect(
      normalizeGrammarTopic({ ...base, topic_created_at: '2026-06-03 02:46:43' })
        .createdAt
    ).toBe('2026-06-03 02:46:43');
  });
});

describe('normalizeUnitSample — the quoted-numbers endpoint', () => {
  it('coerces string ids to numbers', () => {
    const sample = normalizeUnitSample({
      id: 36,
      book_id: 2,
      unit: 1,
      section: 0,
      title: 'Sample',
      text_en_fa: 'English\r\nفارسی',
      text_en_kur: '',
    });
    expect(sample.id).toBe(36);
    expect(typeof sample.id).toBe('number');
    expect(sample.text.ckb).toBe('');
  });

  it('keeps a null section as null', () => {
    // Book 36 samples use section:null (and \\n line endings). Samples already
    // accepted null; this locks that so a later schema tighten cannot regress.
    const sample = normalizeUnitSample(
      unitSampleSchema.parse({
        id: '1',
        book_id: '36',
        unit: '1',
        section: null,
        title: 'Sample 1',
        text_en_fa: 'English:\nHello\n\nفارسی:\nسلام',
        text_en_kur: '',
      })
    );
    expect(sample.section).toBeNull();
    expect(sample.bookId).toBe(36);
  });
});

describe('bilingual blobs — text_en_fa / text_en_kur are not a triple', () => {
  it('falls back to the other blob when the reader language is missing', () => {
    const text = { fa: 'English + فارسی', ckb: '' };
    expect(bilingualFor(text, 'ckb')).toBe('English + فارسی');
    expect(bilingualIsFallback(text, 'ckb')).toBe(true);
  });

  it('is not a fallback when the reader language exists', () => {
    const text = { fa: 'fa text', ckb: 'ckb text' };
    expect(bilingualFor(text, 'ckb')).toBe('ckb text');
    expect(bilingualIsFallback(text, 'ckb')).toBe(false);
  });

  it('reports no fallback when both are empty', () => {
    expect(bilingualIsFallback({ fa: '', ckb: '' }, 'fa')).toBe(false);
  });
});

describe('normalizeGameCategory — name_ckb and meaning_kur in one payload', () => {
  it('maps both conventions onto ckb', () => {
    const category = normalizeGameCategory({
      id: 1,
      slug: 'animals',
      name_en: 'Animals',
      name_fa: 'حیوانات',
      name_ckb: 'ئاژەڵەکان',
      icon: 'pets_rounded',
      sort_order: 0,
      words: [
        {
          word: 'cat',
          meaning_en: '',
          meaning_fa: 'گربه',
          meaning_kur: 'پشیلە',
          example_en: '',
          example_fa: '',
          example_kur: '',
        },
      ],
    });

    expect(category.name.ckb).toBe('ئاژەڵەکان');
    expect(category.words[0]?.meaning.ckb).toBe('پشیلە');
    // Empty English meanings are common here; the gloss chain must cope.
    expect(glossOf(category.words[0]!.meaning, 'fa')).toBe('گربه');
  });
});

describe('secureUrl — the mixed-content fix', () => {
  it('upgrades http to https', () => {
    expect(secureUrl('http://erfaninfo.com/apk/app.apk')).toBe(
      'https://erfaninfo.com/apk/app.apk'
    );
  });

  it('leaves https alone', () => {
    expect(secureUrl('https://erfaninfo.com/x.pdf')).toBe('https://erfaninfo.com/x.pdf');
  });

  it('returns an empty string for empty input', () => {
    expect(secureUrl('')).toBe('');
    expect(secureUrl('   ')).toBe('');
  });

  it('does not corrupt a URL that merely contains "http://" later on', () => {
    expect(secureUrl('https://x.com/?u=http://y.com')).toBe(
      'https://x.com/?u=http://y.com'
    );
  });
});

describe('normalizeAppUpdate — int flags and the `ku` key', () => {
  const base = {
    android_version_code: 22,
    android_version_name: '1.0.22',
    apk_url: 'http://erfaninfo.com/apk/app.apk',
    windows_version_code: 22,
    windows_version_name: '1.0.22',
    windows_url: 'http://erfaninfo.com/wordsapi/downloads/w.zip',
  };

  /** Parse like the real pipeline does: the API sends ints, zod converts. */
  const fromWire = (extra: Record<string, unknown>) =>
    normalizeAppUpdate(appUpdateSchema.parse({ ...base, ...extra }));

  it('maps release_notes.ku onto ckb', () => {
    const update = fromWire({
      android_force_update: 0,
      windows_force_update: 0,
      force_update: 0,
      release_notes: { en: 'notes', fa: 'یادداشت', ku: 'تێبینی' },
    });
    expect(update.releaseNotes).toEqual({ en: 'notes', fa: 'یادداشت', ckb: 'تێبینی' });
  });

  it('upgrades both download URLs to https', () => {
    const update = fromWire({ android_force_update: 0, release_notes: null });
    expect(update.android.url).toBe('https://erfaninfo.com/apk/app.apk');
    expect(update.windows.url.startsWith('https://')).toBe(true);
  });

  it('reads force flags as ints 0/1, not booleans', () => {
    expect(fromWire({ android_force_update: 1 }).android.force).toBe(true);
    expect(fromWire({ android_force_update: 0 }).android.force).toBe(false);
  });

  it('falls back to the shared force_update when the platform flag is absent', () => {
    // The Dart reads android_force_update ?? force_update ?? 0.
    const update = fromWire({ windows_force_update: 0, force_update: 1 });
    expect(update.android.force).toBe(true);
    expect(update.windows.force).toBe(false);
  });

  it('survives a response with no release_notes at all', () => {
    const update = fromWire({ release_notes: null });
    expect(update.releaseNotes).toEqual({ en: '', fa: '', ckb: '' });
  });
});

describe('releaseNoteFor', () => {
  it('prefers the reader language', () => {
    expect(releaseNoteFor({ en: 'e', fa: 'f', ckb: 'k' }, 'ckb')).toBe('k');
  });

  it('falls back to the first non-empty, as the app does', () => {
    expect(releaseNoteFor({ en: 'e', fa: '', ckb: '' }, 'ckb')).toBe('e');
    expect(releaseNoteFor({ en: '', fa: 'f', ckb: '' }, 'en')).toBe('f');
  });

  it('returns an empty string when there are no notes at all', () => {
    // The live API currently returns all three empty, so this is the real case.
    expect(releaseNoteFor({ en: '', fa: '', ckb: '' }, 'fa')).toBe('');
  });
});
