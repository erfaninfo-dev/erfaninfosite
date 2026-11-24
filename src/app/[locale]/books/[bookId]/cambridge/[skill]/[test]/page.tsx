import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CambridgeExamClient } from '@/components/features/cambridge/cambridge-exam-client';
import { IconArrowBack } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { fetchAccount } from '@/lib/auth/api';
import { getAuthToken } from '@/lib/auth/session';
import { getCambridgeReadingAnalysis } from '@/lib/cambridge/analysis';
import {
  getCambridgeAnswerKey,
  getCambridgeSection,
  getCambridgeTranslations,
  getCambridgeUserState,
  resolveCambridgeTarget,
} from '@/lib/cambridge/api';
import { cambridgeLabels, isCambridgeSkill } from '@/lib/cambridge/labels';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

function parseTestNum(value: string): number | null {
  if (!/^\d{1,2}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && n <= 10 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/books/[bookId]/cambridge/[skill]/[test]'>): Promise<Metadata> {
  const { locale, bookId, skill, test } = await params;
  if (!isLocale(locale) || !isCambridgeSkill(skill)) return {};
  const testNum = parseTestNum(test);
  if (!testNum) return {};
  const target = await resolveCambridgeTarget(bookId);
  if (!target) return {};
  const labels = cambridgeLabels(locale);
  return {
    title: `${labels[skill]} · ${labels.testPrefix} ${testNum} · ${target.title}`,
    robots: { index: false },
  };
}

/**
 * Live Cambridge IELTS Exam screen (volumes 15–21) — supports both
 * Testino-style Practice Mode (`?mode=practice`) and Exam Mode (`?mode=exam`).
 */
export default async function CambridgeExamPage({
  params,
  searchParams,
}: PageProps<'/[locale]/books/[bookId]/cambridge/[skill]/[test]'>) {
  const [{ locale, bookId, skill, test }, sp] = await Promise.all([params, searchParams]);
  if (!isLocale(locale) || !isCambridgeSkill(skill)) notFound();
  const testNum = parseTestNum(test);
  if (testNum === null) notFound();

  const target = await resolveCambridgeTarget(bookId);
  if (!target) notFound();

  const rawMode = typeof sp.mode === 'string' ? sp.mode.toLowerCase() : '';
  const initialMode: 'practice' | 'exam' | null =
    rawMode === 'exam' ? 'exam' : rawMode === 'practice' ? 'practice' : null;

  const token = await getAuthToken();
  const stateMode: 'practice' | 'exam' = initialMode === 'exam' ? 'exam' : 'practice';

  const [section, answerKey, account, initialServerState, translations, readingAnalysis] =
    await Promise.all([
      getCambridgeSection(target.slug, testNum, skill),
      getCambridgeAnswerKey(target.slug, testNum, skill),
      token ? fetchAccount(token) : Promise.resolve(null),
      token
        ? getCambridgeUserState(token, target.slug, testNum, skill, stateMode)
        : Promise.resolve(null),
      getCambridgeTranslations(target.slug, testNum, skill),
      skill === 'reading' ? getCambridgeReadingAnalysis(target.slug, testNum) : Promise.resolve(null),
    ]);

  const labels = cambridgeLabels(locale);
  const t = getTranslator(locale);

  if (!section || section.segments.length === 0) {
    return (
      <Container size="quiz">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href={localeHref(locale, `/books/${target.param}/cambridge/${skill}`)}
            aria-label={t('back')}
            className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
          >
            <IconArrowBack className="size-5" />
          </Link>
          <h1 className="text-on-surface truncate text-lg font-extrabold">
            {labels[skill]} · {labels.testPrefix} {testNum}
          </h1>
        </div>
        <p className="text-on-surface-variant px-2 py-10 text-center">{labels.couldNotLoad}</p>
      </Container>
    );
  }

  const userName =
    account && typeof account === 'object' ? account.displayName.trim() : '';

  return (
    <CambridgeExamClient
      locale={locale}
      bookId={target.bookId}
      bookParam={target.param}
      volume={target.volume}
      userName={userName}
      isSignedIn={Boolean(token)}
      section={section}
      initialAnswerKey={answerKey}
      initialMode={initialMode}
      initialServerState={initialServerState}
      translations={translations}
      readingAnalysis={readingAnalysis}
      labels={labels}
    />
  );
}
