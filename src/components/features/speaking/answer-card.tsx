import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/primitives';
import { glossOf, otherGlosses, type SpeakingQuestion } from '@/lib/api/normalize';
import type { GlossLang, Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';

/**
 * One speaking question with its model answer.
 *
 * Answers are long study text, so each paragraph is capped at the prose
 * measure rather than filling the card — ui-ux-spec.md §2.3 asks for 60–75
 * characters a line, and a 1,152 px card would otherwise give about 100.
 *
 * The English answer is the one a learner practises; the Persian and Kurdish
 * versions are the gloss. All three are rendered server-side — there is no
 * interaction here, so this stays a Server Component and ships no JavaScript.
 *
 * `band_answers` exists in the schema but was empty on every question sampled,
 * so the band section renders only when there is something in it.
 */
export function SpeakingAnswerCard({
  question,
  locale,
  gloss,
}: {
  question: SpeakingQuestion;
  locale: Locale;
  gloss: GlossLang;
}) {
  const t = getTranslator(locale);
  const glossAnswer = glossOf(question.answer, gloss);
  const others = otherGlosses(question.answer, gloss).filter((o) => o.lang !== 'en');

  return (
    <Card>
      <h3 lang="en" dir="ltr" className="text-[length:var(--text-h4)]">
        {question.questionText}
      </h3>

      {question.answer.en ? (
        <div className="mt-4">
          <p className="text-on-surface-variant mb-1 text-[length:var(--text-caption)] font-semibold">
            {t('speakingSampleAnswer')}
          </p>
          <p
            lang="en"
            dir="ltr"
            className="text-on-surface max-w-[var(--container-prose)]"
          >
            {question.answer.en}
          </p>
        </div>
      ) : null}

      {glossAnswer && glossAnswer !== question.answer.en ? (
        <div className="mt-4">
          <p className="text-on-surface-variant mb-1 text-[length:var(--text-caption)] font-semibold">
            {t('speakingModelAnswer')}
          </p>
          <p
            lang={gloss}
            dir="rtl"
            className="text-on-surface-variant max-w-[var(--container-prose)] text-right"
          >
            {glossAnswer}
          </p>
        </div>
      ) : null}

      {others.length > 0 ? (
        <details className="mt-4">
          <summary className="text-primary inline-flex min-h-11 cursor-pointer items-center text-[length:var(--text-label)] font-semibold">
            {t('showOtherLanguages')}
          </summary>
          <div className="mt-2 space-y-2">
            {others.map((other) => (
              <p
                key={other.lang}
                lang={other.lang}
                dir={other.lang === 'en' ? 'ltr' : 'rtl'}
                className={cn(
                  'text-on-surface-variant max-w-[var(--container-prose)]',
                  other.lang !== 'en' && 'text-right'
                )}
              >
                {other.text}
              </p>
            ))}
          </div>
        </details>
      ) : null}

      {question.bandAnswers.length > 0 ? (
        <div className="border-outline-variant/60 mt-5 space-y-3 border-t pt-4">
          {question.bandAnswers.map((band, i) => (
            <div key={`${band.band}-${i}`}>
              {band.band ? (
                <Badge tone="primary">
                  {t('speakingBandAnswer', { band: band.band })}
                </Badge>
              ) : null}
              <p
                lang="en"
                dir="ltr"
                className="text-on-surface mt-1.5 max-w-[var(--container-prose)]"
              >
                {band.answer}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {question.modelFormula ? (
        <div className="bg-surface-3 dark:bg-surface-3 mt-5 rounded-[var(--radius-input)] p-4">
          <p className="text-on-surface-variant text-[length:var(--text-caption)] font-semibold">
            {t('speakingFormula')}
          </p>
          <p lang="en" dir="ltr" className="text-on-surface mt-1">
            {question.modelFormula}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
