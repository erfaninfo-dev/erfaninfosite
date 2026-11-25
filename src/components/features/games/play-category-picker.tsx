'use client';

import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore } from 'react';

import { MagicBackground } from '@/components/features/games/magic-background';
import { useWordBuilderCoins } from '@/components/features/games/use-word-builder-coins';
import { WordBuilderCoinsChip } from '@/components/features/games/word-builder-coins-chip';
import {
  CategoryIcon,
  IconCheck,
  IconChevron,
  IconClose,
  IconSearch,
  IconSparkle,
  IconSwords,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { STAGES_PER_TIER } from '@/lib/game/word-builder/campaign';
import {
  getServerCampaignProgress,
  readCampaignProgress,
  subscribeCampaignProgress,
} from '@/lib/game/word-builder/campaign-progress';
import {
  getServerWbProgress,
  readWbProgress,
  subscribeWbProgress,
} from '@/lib/game/word-builder/progress';
import { formatClient } from '@/lib/i18n/client-format';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

export type PlayCategoryCardItem = {
  id: number;
  slug: string;
  icon: string;
  label: string;
  searchKey: string;
  wordCount: number;
};

export type PlayCategoryPickerLabels = {
  title: string;
  subtitle: string;
  searchHint: string;
  normalTitle: string;
  normalSubtitle: string;
  duelTitle: string;
  duelSubtitle: string;
  duelPendingTemplate: string;
  sectionTitle: string;
  emptyResults: string;
  noWordsYet: string;
};

/**
 * Word Builder Category Picker matching Flutter's `WordBuilderCategoryPickerScreen`
 * (`lib/features/word_builder/presentation/word_builder_category_picker_screen.dart`),
 * including the prominent golden `_NormalTrackCard` and 1v1 Duel hero card right under the search bar.
 */
export function PlayCategoryPicker({
  locale,
  categories,
  pendingDuelCount = 0,
  labels,
}: {
  locale: Locale;
  categories: PlayCategoryCardItem[];
  pendingDuelCount?: number;
  labels: PlayCategoryPickerLabels;
}) {
  const [query, setQuery] = useState('');
  const coins = useWordBuilderCoins();
  const progressMap = useSyncExternalStore(
    subscribeWbProgress,
    readWbProgress,
    getServerWbProgress
  );
  const campaignProgress = useSyncExternalStore(
    subscribeCampaignProgress,
    readCampaignProgress,
    getServerCampaignProgress
  );
  const numFmt = new Intl.NumberFormat(NUMBER_LOCALE[locale]);
  const totalNormalCleared =
    campaignProgress.beginner + campaignProgress.intermediate + campaignProgress.advanced;
  const totalNormalStages = STAGES_PER_TIER * 3;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.searchKey.includes(q));
  }, [categories, query]);

  return (
    <MagicBackground className="-mt-8 -mb-[calc(var(--size-bottom-nav)+1rem)] min-h-[100dvh] pt-6 pb-[calc(var(--size-bottom-nav)+2.5rem)] md:-mb-12 md:pb-16">
      <div className="page-gutter mx-auto flex w-full max-w-[var(--container-content)] flex-col gap-5">
        {/* Top bar: Title + Coins chip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-[#5D4037] sm:text-3xl dark:text-[#FFF8E1]">
              {labels.title}
            </h1>
            {labels.subtitle ? (
              <p className="mt-1 text-sm font-semibold text-[#6D4C41] dark:text-[#FFECB3]/85">
                {labels.subtitle}
              </p>
            ) : null}
          </div>
          <WordBuilderCoinsChip coins={coins.coins} locale={locale} />
        </div>

        {/* Centered Pill Search Field */}
        <div className="relative mx-auto w-full max-w-xl">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute start-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-[#EFF6FF] text-[#2563EB] shadow-xs dark:bg-[#2563EB]/25 dark:text-[#93C5FD]"
          >
            <IconSearch className="size-4.5" />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchHint}
            aria-label={labels.searchHint}
            className="h-13 w-full rounded-full border-2 border-[#2563EB]/25 bg-white/95 ps-13 pe-11 text-sm font-semibold text-[#1E293B] shadow-[0_6px_20px_rgba(37,99,235,0.12),0_2px_6px_rgba(0,0,0,0.06)] transition-all placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15 focus:outline-none dark:border-[#93C5FD]/25 dark:bg-[#1B2138]/90 dark:text-white dark:placeholder:text-slate-300/75 dark:focus:border-[#93C5FD] dark:focus:ring-[#93C5FD]/20"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear"
              className="absolute end-2.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-slate-200/80 text-slate-600 transition-colors hover:bg-slate-300/80 dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
            >
              <IconClose className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Hero Cards: Normal Campaign + 1v1 Word Duel */}
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {/* Normal Track Card matching Flutter `_NormalTrackCard` */}
          <Link
            href={localeHref(locale, '/play/normal')}
            className="group relative flex items-center gap-4 rounded-[24px] border-2 border-white/65 bg-[linear-gradient(135deg,#FFF8E1,#FFECB3)] px-5 py-4.5 no-underline shadow-[0_8px_22px_rgba(255,152,0,0.32)] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(255,152,0,0.38)] active:scale-[0.99] dark:border-[#FFB300]/55 dark:bg-[linear-gradient(135deg,#5D4037,#2D2640)]"
          >
            <span
              className="grid size-13 shrink-0 place-items-center rounded-full text-[#5D4037] transition-transform duration-150 group-hover:scale-105"
              style={{
                backgroundImage: 'linear-gradient(135deg, #FFD54F, #FFB300)',
                boxShadow: '0 4px 12px rgba(255, 152, 0, 0.42)',
              }}
            >
              <IconSparkle className="size-6.5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-black text-[#5D4037] sm:text-xl dark:text-[#FFF8E1]">
                  {labels.normalTitle}
                </span>
                <span
                  dir="ltr"
                  className="inline-flex items-center rounded-full border border-[#FFB300]/60 bg-white/75 px-2.5 py-0.5 text-xs font-extrabold text-[#E65100] tabular-nums dark:bg-black/25 dark:text-[#FFD54F]"
                >
                  {numFmt.format(totalNormalCleared)}/{numFmt.format(totalNormalStages)}
                </span>
              </div>
              <p className="mt-0.5 text-sm font-semibold text-[#795548] dark:text-[#FFECB3]/85">
                {labels.normalSubtitle}
              </p>
            </div>

            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/60 text-[#5D4037] transition-transform duration-150 group-hover:translate-x-0.5 dark:bg-white/10 dark:text-[#FFF8E1]">
              <IconChevron className="rtl-flip size-5" />
            </span>
          </Link>

          {/* 1v1 Async Word Duel Card */}
          <Link
            href={localeHref(locale, '/play/duel')}
            className="group relative flex items-center gap-4 rounded-[24px] border-2 border-white/70 bg-[linear-gradient(135deg,#F3E8FF,#FFE8C2)] px-5 py-4.5 no-underline shadow-[0_8px_22px_rgba(124,58,237,0.22)] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(124,58,237,0.3)] active:scale-[0.99] dark:border-[#A78BFA]/45 dark:bg-[linear-gradient(135deg,#3B225E,#2D2640)]"
          >
            <span
              className="grid size-13 shrink-0 place-items-center rounded-full text-white transition-transform duration-150 group-hover:scale-105"
              style={{
                backgroundImage: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                boxShadow: '0 4px 12px rgba(109, 40, 217, 0.42)',
              }}
            >
              <IconSwords className="size-6.5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-black text-[#4C1D95] sm:text-xl dark:text-[#FFF8E1]">
                  {labels.duelTitle}
                </span>
                {pendingDuelCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#7C3AED] px-2.5 py-0.5 text-xs font-extrabold text-white shadow-xs">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#FDE68A]" />
                    {formatClient(labels.duelPendingTemplate, locale, {
                      count: pendingDuelCount,
                    })}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm font-semibold text-[#5B21B6]/85 dark:text-[#DDD6FE]/85">
                {labels.duelSubtitle}
              </p>
            </div>

            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/65 text-[#5B21B6] transition-transform duration-150 group-hover:translate-x-0.5 dark:bg-white/10 dark:text-[#EDE9FE]">
              <IconChevron className="rtl-flip size-5" />
            </span>
          </Link>
        </div>

        {filtered.length > 0 ? (
          <h2 className="text-base font-extrabold text-[#5D4037] dark:text-[#FFF8E1]/90">
            {labels.sectionTitle}
          </h2>
        ) : null}

        {filtered.length === 0 ? (
          <div className="rounded-[24px] border border-white/60 bg-white/55 px-6 py-12 text-center dark:border-white/15 dark:bg-white/10">
            <p className="text-sm font-bold text-[#6D4C41] dark:text-[#FFECB3]">
              {query.trim() ? labels.emptyResults : labels.noWordsYet}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {filtered.map((cat) => {
              const clearedCount = progressMap[cat.slug]?.length ?? 0;
              const disabled = cat.wordCount === 0;
              return (
                <Link
                  key={cat.id}
                  href={localeHref(locale, `/play/${cat.slug}`)}
                  className={cn(
                    'group relative flex flex-col items-center justify-center rounded-[18px] border-[1.6px] border-white/75 bg-[linear-gradient(135deg,#FFFFFF,#FFF3E0)] px-2.5 py-4 text-center no-underline shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(255,152,0,0.2)] active:scale-[0.97] dark:border-white/15 dark:bg-[linear-gradient(135deg,#3E3228,#2D2640)]',
                    disabled && 'opacity-45'
                  )}
                >
                  {clearedCount > 0 ? (
                    <span
                      dir="ltr"
                      className="absolute end-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-[#2E7D32] px-1.5 py-0.5 text-[10px] leading-none font-extrabold text-white shadow-xs"
                    >
                      <IconCheck className="size-2.5" />
                      {numFmt.format(clearedCount)}
                    </span>
                  ) : null}

                  <span
                    className="mb-2.5 grid size-11 place-items-center rounded-full text-white transition-transform duration-150 group-hover:scale-105"
                    style={{
                      backgroundImage: 'linear-gradient(135deg, #FFCC80, #FF9800)',
                      boxShadow: '0 3px 10px rgba(255, 152, 0, 0.38)',
                    }}
                  >
                    <CategoryIcon name={cat.icon} className="size-5.5" />
                  </span>

                  <span className="line-clamp-2 text-xs leading-tight font-extrabold text-[#5D4037] sm:text-[13px] dark:text-[#FFF8E1]">
                    {cat.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </MagicBackground>
  );
}
