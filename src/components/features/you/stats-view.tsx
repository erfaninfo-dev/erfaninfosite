'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';

import { JellyIconBubble } from '@/components/features/you/jelly-icon-bubble';
import { SectionLabel } from '@/components/features/you/section-label';
import { IconChevron, IconClose, IconInsights, IconLogin } from '@/components/ui/icons';
import { fetchVocabQuizDetailAction } from '@/lib/auth/panel-actions';
import type {
  GrammarResultRow,
  VocabQuizResultDetail,
  VocabQuizResultRow,
} from '@/lib/auth/panel-types';
import { cn } from '@/lib/cn';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import { formatClient } from '@/lib/i18n/client-format';
import { localeHref } from '@/lib/nav';
import { computeWordMastery, readSrsCards, subscribeSrs } from '@/lib/srs/srs-store';
import {
  computeStats,
  readStatsData,
  subscribeStats,
  type StatsData,
} from '@/lib/stats/stats-store';

export type StatsViewLabels = {
  tabVocab: string;
  tabGrammar: string;
  tabProgress: string;
  signInTitle: string;
  vocabSignIn: string;
  grammarSignIn: string;
  goToAuth: string;
  vocabEmpty: string;
  grammarEmpty: string;
  unitsTemplate: string;
  correctWrongTemplate: string;
  detailTitle: string;
  wrongAnswers: string;
  mistakesEmpty: string;
  correctLabel: string;
  incorrectLabel: string;
  close: string;
  sortNewest: string;
  sortScore: string;
  streakDaysTemplate: string;
  studiedToday: string;
  studyToKeepStreak: string;
  longest: string;
  totalDays: string;
  daysOnlyTemplate: string;
  wordMastery: string;
  mastered: string;
  learning: string;
  seenOnce: string;
  wordsStudiedTotalTemplate: string;
  last7Days: string;
  wordsReviewedPerDay: string;
  quizInsights: string;
  vocabAndGrammar: string;
  insightsSubtitle: string;
  vocabDeviceAccuracyTemplate: string;
  allTime: string;
  totalReviews: string;
  studyDays: string;
  errorGeneric: string;
};

const EMPTY_STATS_SNAPSHOT: StatsData = {
  studyDays: [],
  wordsReviewedPerDay: {},
  quizSessionsPerDay: {},
};

const EMPTY_SRS_SNAPSHOT = {};

function cleanImportedText(text: string): string {
  return text.replace(/^\?+\s*/, '').replace(/\uFFFD/g, '·').trim();
}

function formatDateTime(raw: string | null, locale: Locale): string {
  if (!raw) return '—';
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) return raw;
  return new Intl.DateTimeFormat(NUMBER_LOCALE[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(parsed));
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function StatsView({
  locale,
  signedIn,
  vocabResults,
  grammarResults,
  labels,
  loginNext,
}: {
  locale: Locale;
  signedIn: boolean;
  vocabResults: VocabQuizResultRow[] | null;
  grammarResults: GrammarResultRow[] | null;
  labels: StatsViewLabels;
  loginNext: string;
}) {
  const [activeTab, setActiveTab] = useState<'vocab' | 'grammar' | 'progress'>('progress');
  const [grammarSort, setGrammarSort] = useState<'newest' | 'score'>('newest');
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [activeDetail, setActiveDetail] = useState<VocabQuizResultDetail | null>(null);
  const [detailError, setDetailError] = useState(false);

  const statsData = useSyncExternalStore(
    subscribeStats,
    readStatsData,
    () => EMPTY_STATS_SNAPSHOT
  );
  const srsCards = useSyncExternalStore(subscribeSrs, readSrsCards, () => EMPTY_SRS_SNAPSHOT);

  const stats = computeStats(statsData);
  const mastery = computeWordMastery(Object.values(srsCards));
  const numFmt = new Intl.NumberFormat(NUMBER_LOCALE[locale]);

  async function openVocabDetail(row: VocabQuizResultRow) {
    setDetailLoadingId(row.id);
    setDetailError(false);
    try {
      const detail = await fetchVocabQuizDetailAction(row.id);
      if (detail) {
        setActiveDetail(detail);
      } else {
        setDetailError(true);
      }
    } catch {
      setDetailError(true);
    } finally {
      setDetailLoadingId(null);
    }
  }

  const sortedGrammar = grammarResults
    ? [...grammarResults].sort((a, b) => {
        if (grammarSort === 'score') {
          const pctA =
            a.score != null && a.totalQuestions && a.totalQuestions > 0
              ? a.score / a.totalQuestions
              : -1;
          const pctB =
            b.score != null && b.totalQuestions && b.totalQuestions > 0
              ? b.score / b.totalQuestions
              : -1;
          return pctB - pctA;
        }
        return b.createdAt.localeCompare(a.createdAt);
      })
    : null;

  const tabs: Array<{ id: 'vocab' | 'grammar' | 'progress'; label: string }> = [
    { id: 'vocab', label: labels.tabVocab },
    { id: 'grammar', label: labels.tabGrammar },
    { id: 'progress', label: labels.tabProgress },
  ];

  const today = new Date();
  const maxDayWords = Math.max(1, ...stats.last7Days.map((d) => d.wordsReviewed));
  const dayFmt = new Intl.DateTimeFormat(NUMBER_LOCALE[locale], { weekday: 'short' });

  const serverVocabCount = vocabResults?.length ?? 0;
  const serverGrammarCount = grammarResults?.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* 3-tab bar matching Flutter `StatsScreen` (Vocab · Grammar · Progress) */}
      <div
        role="tablist"
        className="border-outline-variant/45 grid grid-cols-3 border-b"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'min-h-12 border-b-[3px] px-2 text-sm transition-colors',
                active
                  ? 'border-primary text-primary font-extrabold'
                  : 'text-on-surface-variant border-transparent font-medium'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Vocab Tab ── */}
      {activeTab === 'vocab' ? (
        !signedIn ? (
          <SignInRequiredCard
            locale={locale}
            title={labels.signInTitle}
            subtitle={labels.vocabSignIn}
            cta={labels.goToAuth}
            next={loginNext}
          />
        ) : vocabResults === null ? (
          <p className="text-on-surface-variant py-8 text-center text-sm font-semibold">
            {labels.errorGeneric}
          </p>
        ) : vocabResults.length === 0 ? (
          <p className="text-on-surface-variant py-10 text-center text-sm font-semibold">
            {labels.vocabEmpty}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {detailError ? (
              <p role="alert" className="text-error text-sm font-bold">
                {labels.errorGeneric}
              </p>
            ) : null}
            {vocabResults.map((row) => {
              const title = row.bookTitle?.trim() || `Book #${row.bookId}`;
              const showQuizName =
                row.quizName &&
                row.quizName.trim() !== '' &&
                row.quizName.trim().toLowerCase() !== 'vocabulary quiz';
              const unitsCsv = row.units.length > 0 ? row.units.join(', ') : '—';
              const correctWrong = cleanImportedText(
                formatClient(labels.correctWrongTemplate, locale, {
                  correct: row.correct,
                  wrong: row.wrong,
                })
              );

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openVocabDetail(row)}
                  disabled={detailLoadingId === row.id}
                  className="jelly-card flex w-full flex-col gap-1.5 rounded-[var(--radius-card)] p-4 text-start transition-transform active:scale-[0.99] disabled:opacity-70"
                >
                  {showQuizName ? (
                    <span className="text-on-surface font-extrabold">{row.quizName}</span>
                  ) : null}
                  <span className="text-on-surface font-bold">{title}</span>
                  <span className="text-on-surface-variant text-sm">
                    {formatClient(labels.unitsTemplate, locale, { units: unitsCsv })}
                  </span>
                  <span className="text-primary text-sm font-extrabold">{correctWrong}</span>
                  <span className="text-on-surface-variant mt-1 flex items-center justify-end gap-1.5 text-xs">
                    <span dir="ltr">{formatDateTime(row.createdAt, locale)}</span>
                    <IconChevron className="size-4 opacity-70" />
                  </span>
                </button>
              );
            })}
          </div>
        )
      ) : null}

      {/* ── Grammar Tab ── */}
      {activeTab === 'grammar' ? (
        !signedIn ? (
          <SignInRequiredCard
            locale={locale}
            title={labels.signInTitle}
            subtitle={labels.grammarSignIn}
            cta={labels.goToAuth}
            next={loginNext}
          />
        ) : sortedGrammar === null ? (
          <p className="text-on-surface-variant py-8 text-center text-sm font-semibold">
            {labels.errorGeneric}
          </p>
        ) : sortedGrammar.length === 0 ? (
          <p className="text-on-surface-variant py-10 text-center text-sm font-semibold">
            {labels.grammarEmpty}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setGrammarSort('newest')}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-bold',
                  grammarSort === 'newest'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-2 text-on-surface-variant'
                )}
              >
                {labels.sortNewest}
              </button>
              <button
                type="button"
                onClick={() => setGrammarSort('score')}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-bold',
                  grammarSort === 'score'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-2 text-on-surface-variant'
                )}
              >
                {labels.sortScore}
              </button>
            </div>
            {sortedGrammar.map((row) => {
              const hasScore = row.score != null && row.totalQuestions != null && row.totalQuestions > 0;
              const pct = hasScore ? Math.round(((row.score ?? 0) / (row.totalQuestions ?? 1)) * 100) : null;
              return (
                <Link
                  key={row.id}
                  href={localeHref(locale, `/grammar/result/${row.id}`)}
                  className="jelly-card flex items-center justify-between gap-3 rounded-[var(--radius-card)] p-4 no-underline transition-transform active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-on-surface truncate font-extrabold">
                      {row.quizName || `#${row.id}`}
                    </p>
                    <p className="text-on-surface-variant mt-1 text-xs" dir="ltr">
                      {formatDateTime(row.createdAt, locale)}
                    </p>
                  </div>
                  {hasScore ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="bg-primary-container text-on-primary-container rounded-full px-3 py-1 text-xs font-extrabold tabular-nums">
                        {numFmt.format(row.score!)} / {numFmt.format(row.totalQuestions!)}
                        {pct != null ? ` · ${numFmt.format(pct)}%` : ''}
                      </span>
                      <IconChevron className="text-on-surface-variant size-5 opacity-70" />
                    </div>
                  ) : (
                    <IconChevron className="text-on-surface-variant size-5 opacity-70" />
                  )}
                </Link>
              );
            })}
          </div>
        )
      ) : null}

      {/* ── Progress Tab (exact Flutter `_StatsProgressTab`) ── */}
      {activeTab === 'progress' ? (
        <div className="flex flex-col gap-4">
          {/* Streak Card */}
          <div className="streak-card rounded-[var(--radius-card)] p-5 text-white">
            <div className="flex items-center gap-3.5">
              <span className="text-4xl leading-none" aria-hidden="true">
                🔥
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-2xl leading-tight font-black">
                  {formatClient(labels.streakDaysTemplate, locale, {
                    count: stats.currentStreak,
                  })}
                </p>
                <p className="mt-0.5 text-sm text-white/80">
                  {cleanImportedText(
                    stats.studiedToday ? labels.studiedToday : labels.studyToKeepStreak
                  )}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 rounded-[14px] bg-white/20 px-3.5 py-2.5">
                <span className="text-xl" aria-hidden="true">
                  🏆
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold">
                    {formatClient(labels.daysOnlyTemplate, locale, {
                      count: stats.longestStreak,
                    })}
                  </p>
                  <p className="text-[11px] text-white/80">{labels.longest}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-[14px] bg-white/20 px-3.5 py-2.5">
                <span className="text-xl" aria-hidden="true">
                  📅
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold">
                    {formatClient(labels.daysOnlyTemplate, locale, {
                      count: stats.totalStudyDays,
                    })}
                  </p>
                  <p className="text-[11px] text-white/80">{labels.totalDays}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Word Mastery Card */}
          <section>
            <SectionLabel>{labels.wordMastery}</SectionLabel>
            <div className="jelly-card flex flex-col gap-3 rounded-[var(--radius-card)] p-4.5">
              <MasteryRow
                label={cleanImportedText(labels.mastered)}
                count={mastery.mastered}
                total={mastery.total}
                dotClass="bg-emerald-500"
                barClass="bg-emerald-500"
                textClass="text-emerald-600 dark:text-emerald-400"
                formatted={numFmt.format(mastery.mastered)}
              />
              <MasteryRow
                label={cleanImportedText(labels.learning)}
                count={mastery.learning}
                total={mastery.total}
                dotClass="bg-amber-500"
                barClass="bg-amber-500"
                textClass="text-amber-600 dark:text-amber-400"
                formatted={numFmt.format(mastery.learning)}
              />
              <MasteryRow
                label={cleanImportedText(labels.seenOnce)}
                count={mastery.seen}
                total={mastery.total}
                dotClass="bg-primary/70"
                barClass="bg-primary/70"
                textClass="text-primary"
                formatted={numFmt.format(mastery.seen)}
              />
              {mastery.total > 0 ? (
                <p className="text-on-surface-variant pt-1 text-center text-xs font-semibold">
                  {formatClient(labels.wordsStudiedTotalTemplate, locale, {
                    count: mastery.total,
                  })}
                </p>
              ) : null}
            </div>
          </section>

          {/* Last 7 Days Bar Chart */}
          <section>
            <SectionLabel>{labels.last7Days}</SectionLabel>
            <div className="jelly-card rounded-[var(--radius-card)] p-4.5">
              <div className="mb-4 flex items-center gap-2">
                <span className="bg-primary size-2.5 rounded-full" />
                <span className="text-on-surface-variant text-xs font-semibold">
                  {labels.wordsReviewedPerDay}
                </span>
              </div>
              <div className="grid h-28 grid-cols-7 items-end gap-2">
                {stats.last7Days.map((day) => {
                  const ratio = day.wordsReviewed / maxDayWords;
                  const heightPct = day.wordsReviewed === 0 ? 5 : Math.max(10, Math.round(ratio * 100));
                  const isToday = isSameLocalDay(day.date, today);
                  return (
                    <div
                      key={day.dateKey}
                      className="flex h-full flex-col items-center justify-end gap-1"
                    >
                      <span
                        className={cn(
                          'text-[10px] leading-none font-bold tabular-nums',
                          day.wordsReviewed > 0
                            ? isToday
                              ? 'text-primary'
                              : 'text-on-surface-variant'
                            : 'opacity-0'
                        )}
                      >
                        {numFmt.format(day.wordsReviewed)}
                      </span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className={cn(
                            'w-full rounded-t-md transition-all duration-300',
                            day.wordsReviewed === 0
                              ? 'bg-outline-variant/40'
                              : isToday
                                ? 'bg-primary'
                                : 'bg-primary/50'
                          )}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-[10px] leading-none',
                          isToday ? 'text-primary font-extrabold' : 'text-on-surface-variant'
                        )}
                      >
                        {dayFmt.format(day.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Quiz Insights Summary Card */}
          <section>
            <SectionLabel>{labels.quizInsights}</SectionLabel>
            <div className="jelly-card flex items-center gap-3.5 rounded-[var(--radius-card)] p-4.5">
              <JellyIconBubble tone="primary">
                <IconInsights className="size-5" />
              </JellyIconBubble>
              <div className="min-w-0 flex-1">
                <p className="text-on-surface font-extrabold">{labels.vocabAndGrammar}</p>
                <p className="text-on-surface-variant mt-0.5 text-xs leading-snug">
                  {labels.insightsSubtitle}
                </p>
                {stats.totalQuizAnswered > 0 ? (
                  <p className="text-primary mt-1.5 text-xs font-bold">
                    {formatClient(labels.vocabDeviceAccuracyTemplate, locale, {
                      pct: Math.round(stats.quizAccuracy * 100),
                      correct: stats.totalQuizCorrect,
                      answered: stats.totalQuizAnswered,
                    })}
                  </p>
                ) : signedIn && (serverVocabCount > 0 || serverGrammarCount > 0) ? (
                  <p className="text-primary mt-1.5 text-xs font-bold">
                    {labels.tabVocab}: {numFmt.format(serverVocabCount)} · {labels.tabGrammar}:{' '}
                    {numFmt.format(serverGrammarCount)}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {/* All-time Totals Row */}
          <section>
            <SectionLabel>{labels.allTime}</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <div className="jelly-card flex flex-col items-center rounded-[var(--radius-card)] p-4 text-center">
                <span className="text-3xl" aria-hidden="true">
                  📖
                </span>
                <p className="mt-2 text-2xl font-black text-blue-500 tabular-nums">
                  {numFmt.format(stats.totalWordsReviewed)}
                </p>
                <p className="text-on-surface-variant mt-1 text-xs font-semibold">
                  {labels.totalReviews}
                </p>
              </div>
              <div className="jelly-card flex flex-col items-center rounded-[var(--radius-card)] p-4 text-center">
                <span className="text-3xl" aria-hidden="true">
                  🗓️
                </span>
                <p className="mt-2 text-2xl font-black text-purple-500 tabular-nums">
                  {numFmt.format(stats.totalStudyDays)}
                </p>
                <p className="text-on-surface-variant mt-1 text-xs font-semibold">
                  {labels.studyDays}
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* ── Vocab Quiz Detail Sheet ── */}
      {activeDetail ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={() => setActiveDetail(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-1 border-outline-variant/60 max-h-[82dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] border p-5 sm:rounded-[2rem]"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-on-surface text-lg font-extrabold">{labels.detailTitle}</h2>
              <button
                type="button"
                onClick={() => setActiveDetail(null)}
                aria-label={labels.close}
                className="bg-surface-2 text-on-surface-variant grid size-9 place-items-center rounded-full"
              >
                <IconClose className="size-4" />
              </button>
            </div>
            <p className="text-on-surface font-bold">
              {activeDetail.bookTitle || `Book #${activeDetail.bookId}`}
            </p>
            <p className="text-primary mt-1 text-sm font-extrabold">
              {cleanImportedText(
                formatClient(labels.correctWrongTemplate, locale, {
                  correct: activeDetail.correct,
                  wrong: activeDetail.wrong,
                })
              )}
            </p>
            {activeDetail.items.length === 0 ? (
              <p className="text-on-surface-variant mt-4 text-sm">{labels.mistakesEmpty}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {activeDetail.items.map((item, idx) => (
                  <li
                    key={`${item.word}-${idx}`}
                    className={cn(
                      'rounded-2xl border px-3.5 py-2.5 text-sm',
                      item.correct
                        ? 'border-correct/30 bg-correct-container/35'
                        : 'border-error/30 bg-error-container/35'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-on-surface font-extrabold" dir="ltr">
                        {item.word}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-extrabold',
                          item.correct
                            ? 'bg-correct-container text-on-correct-container'
                            : 'bg-error-container text-on-error-container'
                        )}
                      >
                        {item.correct ? labels.correctLabel : labels.incorrectLabel}
                      </span>
                    </div>
                    {item.meaning ? (
                      <p className="text-on-surface-variant mt-1 text-xs">{item.meaning}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SignInRequiredCard({
  locale,
  title,
  subtitle,
  cta,
  next,
}: {
  locale: Locale;
  title: string;
  subtitle: string;
  cta: string;
  next: string;
}) {
  return (
    <div className="jelly-card flex flex-col items-center gap-3 rounded-[var(--radius-card)] p-6 text-center">
      <JellyIconBubble tone="tertiary" size={52}>
        <IconLogin className="size-6" />
      </JellyIconBubble>
      <h2 className="text-on-surface text-base font-extrabold">{title}</h2>
      <p className="text-on-surface-variant max-w-sm text-sm leading-relaxed">{subtitle}</p>
      <Link
        href={localeHref(locale, `/login?next=${encodeURIComponent(next)}`)}
        className="bg-primary text-on-primary mt-1 inline-flex min-h-11 items-center rounded-full px-6 text-sm font-extrabold no-underline"
      >
        {cta}
      </Link>
    </div>
  );
}

function MasteryRow({
  label,
  count,
  total,
  dotClass,
  barClass,
  textClass,
  formatted,
}: {
  label: string;
  count: number;
  total: number;
  dotClass: string;
  barClass: string;
  textClass: string;
  formatted: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className={cn('size-2.5 shrink-0 rounded-full', dotClass)} />
        <span className="text-on-surface text-sm font-semibold">{label}</span>
        <span className={cn('ms-auto text-sm font-extrabold tabular-nums', textClass)}>
          {formatted}
        </span>
      </div>
      <div className="bg-surface-3 h-2 w-full overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-all duration-300', barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
