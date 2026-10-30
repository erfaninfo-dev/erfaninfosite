import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/primitives';
import { glossOf, otherGlosses, type SpeakingQuestion } from '@/lib/api/normalize';
import type { GlossLang, Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';

/**
 * One speaking question with its model answer.
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
          <p className="mb-1 text-[length:var(--text-caption)] font-semibold text-on-surface-variant">
            {t('speakingSampleAnswer')}
          </p>
          <p lang="en" dir="ltr" className="text-on-surface">
            {question.answer.en}
          </p>
        </div>
      ) : null}

      {glossAnswer && glossAnswer !== question.answer.en ? (
        <div className="mt-4">
          <p className="mb-1 text-[length:var(--text-caption)] font-semibold text-on-surface-variant">
            {t('speakingModelAnswer')}
          </p>
          <p lang={gloss} className="text-on-surface-variant">
            {glossAnswer}
          </p>
        </div>
      ) : null}

      {others.length > 0 ? (
        <details className="mt-4">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-[length:var(--text-label)] font-semibold text-primary">
            {t('showOtherLanguages')}
          </summary>
          <div className="mt-2 space-y-2">
            {others.map((other) => (
              <p key={other.lang} lang={other.lang} className="text-on-surface-variant">
                {other.text}
              </p>
            ))}
          </div>
        </details>
      ) : null}

      {question.bandAnswers.length > 0 ? (
        <div className="mt-5 space-y-3 border-t border-outline-variant/60 pt-4">
          {question.bandAnswers.map((band, i) => (
            <div key={`${band.band}-${i}`}>
              {band.band ? (
                <Badge tone="primary">{t('speakingBandAnswer', { band: band.band })}</Badge>
              ) : null}
              <p lang="en" dir="ltr" className="mt-1.5 text-on-surface">
                {band.answer}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {question.modelFormula ? (
        <div className="mt-5 rounded-[var(--radius-input)] bg-surface-3 p-4 dark:bg-surface-3">
          <p className="text-[length:var(--text-caption)] font-semibold text-on-surface-variant">
            {t('speakingFormula')}
          </p>
          <p lang="en" dir="ltr" className="mt-1 text-on-surface">
            {question.modelFormula}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
