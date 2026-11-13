import { SampleReader, type SampleReading } from '@/components/features/vocab/sample-reader';
import { SectionHeading } from '@/components/ui/primitives';
import { bilingualFor, bilingualIsFallback, glossOf, type UnitSample } from '@/lib/api/normalize';
import { getBookWords } from '@/lib/api/queries';
import type { Locale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
import { getGloss } from '@/lib/request-context';
import { parseSamplePairs } from '@/lib/vocab/sample-pairs';
import type { CatalogEntry } from '@/lib/vocab/sample-word-lookup';

/**
 * Bilingual reading samples, in the app's Text-tab layout.
 *
 * Each passage is a jelly card: the title, then English paired with the
 * reader's gloss. Book mode pages through those pairs. Playback and
 * highlighting stay in the app.
 */
export async function SampleList({
  samples,
  locale,
  heading,
  bookId,
  unit,
  bookTitle,
}: {
  samples: UnitSample[];
  locale: Locale;
  heading?: string;
  bookId: number;
  unit: number;
  bookTitle: string;
}) {
  const [gloss, bookWords] = await Promise.all([getGloss(locale), getBookWords(bookId)]);
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);

  const catalog: CatalogEntry[] = bookWords.map((word) => ({
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
    bookId,
  }));
  const readings: SampleReading[] = samples.flatMap((sample) => {
    const text = bilingualFor(sample.text, gloss);
    const pairs = parseSamplePairs(text);
    if (pairs.length === 0) return [];
    return [
      {
        id: sample.id,
        title: sample.title || t('unitSampleUntitled'),
        pairs,
        fallback: bilingualIsFallback(sample.text, gloss) ? t('notAvailableInKurdish') : null,
      },
    ];
  });
  if (readings.length === 0) return null;

  return (
    <section>
      {heading === '' ? null : <SectionHeading>{heading ?? t('samplesTabLabel')}</SectionHeading>}
      <SampleReader
        samples={readings}
        locale={locale}
        glossLang={gloss}
        bookId={bookId}
        unit={unit}
        bookTitle={bookTitle}
        catalog={catalog}
        labels={{
          bookMode: t('sampleBookMode'),
          pageTemplate: raw('sampleBookPageOf'),
          turnHint: t('sampleBookTurnHint'),
          previous: t('previous'),
          next: t('next'),
          close: t('close'),
          play: t('samplePlayFullText'),
        }}
        cardLabels={{
          example: t('wordExample'),
          important: t('important'),
          favorite: t('favorite'),
          pronounceWord: t('pronounceWord'),
          pronounceExample: t('pronounceExample'),
          close: t('close'),
          noMatches: t('noMatchingWords'),
        }}
      />
    </section>
  );
}
