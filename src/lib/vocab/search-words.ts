'use server';

import { glossOf, otherGlosses } from '@/lib/api/normalize';
import { getBookWords } from '@/lib/api/queries';
import type { WordRowData } from '@/components/features/vocab/word-row';
import type { Locale } from '@/lib/i18n/config';
import { getGloss } from '@/lib/request-context';

/** A word card's fields, without the on-screen number. */
export type VocabSearchHit = {
  id: number;
  word: string;
  type: string;
  important: boolean;
  meaningEn: string;
  gloss: string;
  exampleEn: string;
  exampleGloss: string;
  unit: number;
  section: number;
};

/**
 * Whole-book headword search for the word cards.
 * Same headword rule as `searchBookWords`, with the English meaning kept.
 */
export async function searchBookCards(
  bookId: number,
  query: string,
  locale: Locale
): Promise<VocabSearchHit[]> {
  const needle = query.trim().toLowerCase().slice(0, 80);
  if (!Number.isInteger(bookId) || bookId <= 0 || needle.length === 0) return [];

  const [words, gloss] = await Promise.all([getBookWords(bookId), getGloss(locale)]);
  return words
    .filter((word) => word.word.toLowerCase().includes(needle))
    .map((word) => ({
      id: word.id,
      word: word.word,
      type: word.type,
      important: word.important,
      meaningEn: word.meaning.en,
      gloss: glossOf(word.meaning, gloss),
      exampleEn: word.example.en,
      exampleGloss: glossOf(word.example, gloss),
      unit: word.unit,
      section: word.section,
    }));
}

/**
 * Whole-book word search, the same rule as the app's `matchesWordQuery`:
 * the headword only, not the meaning or the example.
 */
export async function searchBookWords(
  bookId: number,
  query: string,
  locale: Locale
): Promise<WordRowData[]> {
  const needle = query.trim().toLowerCase().slice(0, 80);
  if (!Number.isInteger(bookId) || bookId <= 0 || needle.length === 0) return [];

  const [words, gloss] = await Promise.all([getBookWords(bookId), getGloss(locale)]);
  return words
    .filter((word) => word.word.toLowerCase().includes(needle))
    .map((word) => ({
      id: word.id,
      word: word.word,
      type: word.type,
      important: word.important,
      meaning: glossOf(word.meaning, gloss),
      example: glossOf(word.example, gloss),
      exampleEn: word.example.en,
      others: otherGlosses(word.meaning, gloss),
    }));
}
