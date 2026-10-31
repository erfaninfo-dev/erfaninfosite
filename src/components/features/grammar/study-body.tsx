import {
  StudySheet,
  type StudyLabels,
  type StudyPart,
} from '@/components/features/grammar/study-sheet';
import { getGrammarTopicPdfs } from '@/lib/api/queries';
import { defaultGlossFor, type Locale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
import { getGloss } from '@/lib/request-context';

/**
 * The study material for a topic.
 *
 * Shared by the full page and the intercepted sheet so the two cannot drift —
 * the only difference between them is the frame around this.
 */
export async function StudyBody({ topic, locale }: { topic: string; locale: Locale }) {
  const [pdfs, gloss] = await Promise.all([getGrammarTopicPdfs(topic), getGloss(locale)]);
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);

  const parts: StudyPart[] = pdfs.map((pdf) => ({
    id: pdf.id,
    title: pdf.title,
    // `pdf_url` is the Persian lesson, `pdf_url_kur` the Kurdish one.
    fa: pdf.url,
    ckb: pdf.urlKurdish,
  }));

  if (parts.length === 0) {
    return (
      <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-center">
        {t('grammarStudyPdfUnavailable')}
      </p>
    );
  }

  const labels: StudyLabels = {
    chooseLevel: t('grammarStudySheetChooseLevel'),
    partLabel: t('grammarStudyPdfPartLabel'),
    view: t('grammarStudyPdfView'),
    unavailable: t('grammarStudyPdfUnavailable'),
    languages: [
      { id: 'fa', label: t('langPersian') },
      { id: 'ckb', label: t('langKurdishSorani') },
    ],
    partTemplate: raw('partNumber'),
  };

  return (
    <StudySheet
      parts={parts}
      labels={labels}
      locale={locale}
      // Open on the reader's own gloss language, falling back to the locale's.
      initialLanguage={gloss || defaultGlossFor(locale)}
    />
  );
}
