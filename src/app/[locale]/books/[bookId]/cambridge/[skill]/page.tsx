import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { IconArrowBack, IconChevron, IconPlay } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { getAuthToken } from '@/lib/auth/session';
import {
  countForSkill,
  getCambridgeManifest,
  getCambridgeResultsSummary,
  resolveCambridgeTarget,
  type CambridgeResultSummary,
} from '@/lib/cambridge/api';
import { formatBandScore } from '@/lib/cambridge/band-score';
import { cambridgeLabels, isCambridgeSkill } from '@/lib/cambridge/labels';
import { NUMBER_LOCALE, isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/books/[bookId]/cambridge/[skill]'>): Promise<Metadata> {
  const { locale, bookId, skill } = await params;
  if (!isLocale(locale) || !isCambridgeSkill(skill)) return {};
  const target = await resolveCambridgeTarget(bookId);
  if (!target) return {};
  const labels = cambridgeLabels(locale);
  return { title: `${labels[skill]} · ${target.title}`, robots: { index: false } };
}

/**
 * Live Cambridge IELTS Tests Picker (volumes 11–21) — fetched from `cambridge_manifest.php`.
 * For Reading & Listening, offers both Practice Mode and Exam Mode launches plus saved Band badges.
 */
export default async function CambridgeSkillTestsPage({
  params,
}: PageProps<'/[locale]/books/[bookId]/cambridge/[skill]'>) {
  const { locale, bookId, skill } = await params;
  if (!isLocale(locale) || !isCambridgeSkill(skill)) notFound();

  const target = await resolveCambridgeTarget(bookId);
  if (!target) notFound();

  const token = await getAuthToken();
  const [manifest, resultsByTest] = await Promise.all([
    getCambridgeManifest(target.slug),
    token
      ? getCambridgeResultsSummary(token, target.slug, skill)
      : Promise.resolve<Record<number, CambridgeResultSummary>>({}),
  ]);

  const labels = cambridgeLabels(locale);
  const t = getTranslator(locale);
  const numFmt = new Intl.NumberFormat(NUMBER_LOCALE[locale]);

  const title = labels[skill];
  const isDualMode = skill === 'reading' || skill === 'listening';
  const timeText = {
    listening: labels.listeningTime,
    reading: labels.readingTime,
    writing: labels.writingTime,
    speaking: labels.speakingTime,
  }[skill];

  const countUnit = {
    listening: labels.partsUnit,
    reading: labels.passagesUnit,
    writing: labels.tasksUnit,
    speaking: labels.partsUnit,
  }[skill];

  return (
    <Container size="quiz">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href={localeHref(locale, `/books/${target.param}/cambridge`)}
          aria-label={t('back')}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-on-surface truncate text-xl font-extrabold">{title}</h1>
          <p className="text-on-surface-variant truncate text-xs font-semibold">
            <bdi lang="en">{target.title}</bdi> · {timeText}
          </p>
        </div>
      </div>

      {!manifest ? (
        <div className="border-outline-variant/60 bg-surface-1 rounded-[var(--radius-card)] border px-5 py-10 text-center">
          <p className="text-on-surface-variant text-sm font-semibold">{labels.couldNotLoad}</p>
        </div>
      ) : manifest.tests.length === 0 ? (
        <div className="border-outline-variant/60 bg-surface-1 rounded-[var(--radius-card)] border px-5 py-10 text-center">
          <p className="text-on-surface-variant text-sm font-semibold">{labels.empty}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {manifest.tests.map((item) => {
            const count = countForSkill(item, skill);
            const base = `/books/${target.param}/cambridge/${skill}/${item.test}`;
            const summary = resultsByTest[item.test] ?? null;
            const inProgressLabel =
              locale === 'fa' ? 'در حال انجام' : locale === 'ckb' ? 'لە جێبەجێکردندایە' : 'In progress';
            const completedLabel =
              locale === 'fa' ? 'تکمیل‌شده' : locale === 'ckb' ? 'تەواوبوو' : 'Completed';

            const statusBadge = summary ? (
              summary.status === 'completed' ? (
                <span
                  dir="ltr"
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300"
                >
                  <span>✓</span>
                  {summary.bestBand !== null ? (
                    <span>Band {formatBandScore(summary.bestBand)}</span>
                  ) : (
                    <span>{completedLabel}</span>
                  )}
                  {summary.latestScore !== null && summary.max !== null ? (
                    <span className="opacity-75">
                      ({summary.latestScore}/{summary.max})
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/14 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-700 dark:text-amber-300">
                  <span>●</span>
                  <span>{inProgressLabel}</span>
                </span>
              )
            ) : null;

            if (!isDualMode) {
              return (
                <li key={item.test}>
                  <Link
                    href={localeHref(locale, base)}
                    className="jelly-card group flex items-center gap-3.5 rounded-[var(--radius-card)] px-4 py-4 no-underline transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    <span className="bg-primary/14 text-primary grid size-12 shrink-0 place-items-center rounded-2xl text-lg font-black tabular-nums">
                      {numFmt.format(item.test)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-on-surface text-base font-extrabold">
                          {labels.testPrefix} {numFmt.format(item.test)}
                        </p>
                        {statusBadge}
                      </div>
                      <p className="text-on-surface-variant mt-0.5 text-xs font-semibold">
                        {numFmt.format(count)} {countUnit} · {timeText}
                      </p>
                    </div>
                    <span className="bg-primary text-on-primary inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-extrabold shadow-xs transition-transform group-hover:scale-[1.02]">
                      <IconPlay className="rtl-flip size-3.5" />
                      <span>{labels.start}</span>
                    </span>
                    <IconChevron className="rtl-flip text-on-surface-variant hidden size-5 shrink-0 sm:block" />
                  </Link>
                </li>
              );
            }

            return (
              <li
                key={item.test}
                className="jelly-card flex flex-col gap-3 rounded-[var(--radius-card)] px-4 py-4 sm:flex-row sm:items-center sm:gap-3.5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <span className="bg-primary/14 text-primary grid size-12 shrink-0 place-items-center rounded-2xl text-lg font-black tabular-nums">
                    {numFmt.format(item.test)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-on-surface text-base font-extrabold">
                        {labels.testPrefix} {numFmt.format(item.test)}
                      </p>
                      {statusBadge}
                    </div>
                    <p className="text-on-surface-variant mt-0.5 text-xs font-semibold">
                      {numFmt.format(count)} {countUnit} · {timeText}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={localeHref(locale, `${base}?mode=practice`)}
                    className="bg-surface-2 text-on-surface border-outline-strong/40 hover:bg-surface-3 inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border px-4 text-xs font-extrabold no-underline transition-colors sm:flex-initial"
                  >
                    <IconPlay className="rtl-flip text-primary size-3.5" />
                    <span>{labels.practiceMode}</span>
                  </Link>
                  <Link
                    href={localeHref(locale, `${base}?mode=exam`)}
                    className="bg-primary text-on-primary inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-extrabold no-underline shadow-xs transition-opacity hover:opacity-90 sm:flex-initial"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="size-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    <span>{labels.examMode}</span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
