'use server';

import { glossOf } from '@/lib/api/normalize';
import { getBookWords } from '@/lib/api/queries';
import type { Locale } from '@/lib/i18n/config';
import { getGloss } from '@/lib/request-context';

export type QuizWord = {
  id: number;
  unit: number;
  section: number;
  word: string;
  meaning: string;
};

/** Words for a vocabulary quiz, gloss already resolved. */
export async function loadQuizWords(
  bookId: number,
  units: number[],
  locale: Locale,
  section?: number
): Promise<QuizWord[]> {
  if (!Number.isInteger(bookId) || bookId <= 0 || units.length === 0) return [];
  const wanted = new Set(units.filter((unit) => Number.isInteger(unit) && unit > 0));
  const sectionOnly = section != null && Number.isInteger(section) && section > 0 ? section : null;
  const [words, gloss] = await Promise.all([getBookWords(bookId), getGloss(locale)]);
  return words
    .filter(
      (word) =>
        wanted.has(word.unit) &&
        (sectionOnly === null || word.section === sectionOnly) &&
        word.word &&
        glossOf(word.meaning, gloss)
    )
    .map((word) => ({
      id: word.id,
      unit: word.unit,
      section: word.section,
      word: word.word,
      meaning: glossOf(word.meaning, gloss),
    }));
}
