import { WordList, type WordListLabels } from '@/components/features/vocab/word-list';
import type { WordRowData } from '@/components/features/vocab/word-row';
import { glossOf, otherGlosses, type Word } from '@/lib/api/normalize';
import type { GlossLang, Locale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';

/**
 * Turns `Word` objects into the flat rows the browser receives.
 *
 * Everything language-related happens here, on the server: the gloss chain,
 * the mojibake guard, and dropping the two languages the reader did not pick
 * down to plain strings. The client bundle therefore carries no language logic,
 * and a unit of ~130 words ships a fraction of what the raw API rows weigh.
 */
export function toWordRows(words: Word[], gloss: GlossLang): WordRowData[] {
  return words.map((w) => ({
    id: w.id,
    word: w.word,
    type: w.type,
    important: w.important,
    meaning: glossOf(w.meaning, gloss),
    example: glossOf(w.example, gloss),
    exampleEn: w.example.en,
    others: otherGlosses(w.meaning, gloss),
  }));
}

export function WordListSection({
  words,
  locale,
  gloss,
}: {
  words: Word[];
  locale: Locale;
  gloss: GlossLang;
}) {
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);
  const rows = toWordRows(words, gloss);

  const types = [...new Set(words.map((w) => w.type).filter(Boolean))].sort();

  const labels: WordListLabels = {
    searchHint: t('searchWordWholeBook'),
    important: t('important'),
    importantOnly: t('importantOnlyChip'),
    otherLanguages: t('showOtherLanguages'),
    allTypes: t('allTypes'),
    resultsTemplate: raw('resultsCount'),
    noResults: t('noMatchingWords'),
  };

  return (
    <WordList
      words={rows}
      labels={labels}
      glossLang={gloss}
      types={types}
      locale={locale}
    />
  );
}
