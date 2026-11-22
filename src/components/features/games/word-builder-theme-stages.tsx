'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { MagicBackground } from '@/components/features/games/magic-background';
import { useWordBuilderCoins } from '@/components/features/games/use-word-builder-coins';
import { WordBuilderCoinsChip } from '@/components/features/games/word-builder-coins-chip';
import { IconArrowBack, IconCheck, IconLock, IconRefresh } from '@/components/ui/icons';
import { clearSolvedWords } from '@/lib/game/word-builder/campaign-progress';
import {
  clearCategoryProgress,
  getServerWbProgress,
  readWbProgress,
  subscribeWbProgress,
} from '@/lib/game/word-builder/progress';
import { formatClient } from '@/lib/i18n/client-format';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

export type ThemeStagesLabels = {
  back: string;
  stageNTemplate: string;
  stageCompleted: string;
  stageReplayHint: string;
  stageLockedToast: string;
  reset: string;
  resetConfirm: string;
  cancel: string;
};

/**
 * Glossy 5-column levels grid for a Word Builder Theme Category, matching
 * Flutter's `WordBuilderThemeStagesScreen` without chapter banner titles.
 */
export function WordBuilderThemeStages({
  locale,
  slug,
  title,
  totalStages,
  unlockAll,
  labels,
}: {
  locale: Locale;
  slug: string;
  title: string;
  totalStages: number;
  unlockAll: boolean;
  labels: ThemeStagesLabels;
}) {
  const router = useRouter();
  const coins = useWordBuilderCoins();
  const progressMap = useSyncExternalStore(
    subscribeWbProgress,
    readWbProgress,
    getServerWbProgress
  );

  const [toast, setToast] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const currentCellRef = useRef<HTMLButtonElement | null>(null);
  const scrolledKeyRef = useRef<string | null>(null);

  const numFmt = new Intl.NumberFormat(NUMBER_LOCALE[locale]);

  const completedSet = useMemo(() => new Set(progressMap[slug] ?? []), [progressMap, slug]);

  // Sequential cleared prefix count (matches Flutter `clearedThemeStages`).
  const sequentialCleared = useMemo(() => {
    let count = 0;
    for (let i = 0; i < totalStages; i += 1) {
      if (completedSet.has(i)) count += 1;
      else break;
    }
    return count;
  }, [completedSet, totalStages]);

  const totalCleared = useMemo(() => {
    let count = 0;
    for (const idx of completedSet) {
      if (idx >= 0 && idx < totalStages) count += 1;
    }
    return count;
  }, [completedSet, totalStages]);

  const nextStage = Math.max(1, Math.min(totalStages, sequentialCleared + 1));

  const stageNumbers = useMemo(
    () => Array.from({ length: totalStages }, (_, i) => i + 1),
    [totalStages]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    delete document.documentElement.dataset.wordBuilderSession;
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const key = `${slug}:${nextStage}`;
    if (scrolledKeyRef.current === key) return;
    scrolledKeyRef.current = key;
    if (nextStage <= 10) return;
    const id = window.requestAnimationFrame(() => {
      currentCellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [slug, nextStage]);

  useEffect(() => {
    if (!resetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setResetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetOpen]);

  return (
    <MagicBackground className="-mt-8 -mb-[calc(var(--size-bottom-nav)+1rem)] min-h-[100dvh] pt-6 pb-[calc(var(--size-bottom-nav)+3rem)] md:-mb-12 md:pb-20">
      <div className="page-gutter mx-auto flex w-full max-w-[34rem] flex-col gap-5">
        {/* ── Flutter AppBar: Back · Topic Title & Progress · Reset · Coins ── */}
        <header className="flex items-center gap-2">
          <Link
            href={localeHref(locale, '/play')}
            aria-label={labels.back}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white/45 text-[#5D4037] transition-colors hover:bg-white/70 dark:bg-black/25 dark:text-[#FFF8E1] dark:hover:bg-black/40"
          >
            <IconArrowBack className="size-5" />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black text-[#5D4037] sm:text-2xl dark:text-[#FFF8E1]">
              {title}
            </h1>
            <p className="text-xs font-extrabold text-[#6D4C41] tabular-nums dark:text-[#FFECB3]/85">
              <bdi dir="ltr">
                {numFmt.format(totalCleared)} / {numFmt.format(totalStages)}
              </bdi>
            </p>
          </div>

          {totalCleared > 0 ? (
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              aria-label={labels.reset}
              title={labels.reset}
              className="grid size-9.5 shrink-0 place-items-center rounded-full border border-[#FF7043]/45 bg-[linear-gradient(135deg,#FFF3E0,#FFCCBC)] text-[#BF360C] shadow-xs transition-transform hover:scale-105 active:scale-95"
            >
              <IconRefresh className="size-4.5" />
            </button>
          ) : null}

          <WordBuilderCoinsChip coins={coins.coins} locale={locale} compact />
        </header>

        {/* ── Clean 5-Column Glossy Stage Grid (1..N) ── */}
        <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
          {stageNumbers.map((stage) => {
            const idx = stage - 1;
            const completed = completedSet.has(idx);
            const unlocked = unlockAll || completed || stage <= sequentialCleared + 1;
            const isCurrent = unlocked && !completed && stage === nextStage;
            const stageLabel = formatClient(labels.stageNTemplate, locale, { n: stage });

            if (!unlocked) {
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => showToast(labels.stageLockedToast)}
                  aria-label={`${stageLabel} — ${labels.stageLockedToast}`}
                  className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-[18px] border-[1.5px] border-white/45 transition-transform active:scale-95"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, #B0BEC5, #78909C)',
                    boxShadow:
                      '0 5px 12px rgba(96, 125, 139, 0.35), 0 4px 0 rgba(120, 144, 156, 0.45)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-2 top-1.5 h-2 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0))]"
                  />
                  <IconLock className="size-5 text-[#263238] sm:size-6" />
                </button>
              );
            }

            const tileStyle = completed
              ? {
                  backgroundImage: 'linear-gradient(135deg, #FFD54F, #FFB300)',
                  boxShadow:
                    '0 5px 14px rgba(255, 152, 0, 0.45), 0 4px 0 rgba(255, 179, 0, 0.45)',
                }
              : isCurrent
                ? {
                    backgroundImage: 'linear-gradient(135deg, #81C784, #2E7D32)',
                    boxShadow:
                      '0 5px 14px rgba(67, 160, 71, 0.5), 0 4px 0 rgba(46, 125, 50, 0.5)',
                  }
                : {
                    backgroundImage: 'linear-gradient(135deg, #FFECB3, #FFB300)',
                    boxShadow:
                      '0 5px 12px rgba(255, 193, 7, 0.4), 0 4px 0 rgba(255, 179, 0, 0.4)',
                  };

            return (
              <button
                key={stage}
                ref={isCurrent ? currentCellRef : undefined}
                type="button"
                onClick={() => router.push(localeHref(locale, `/play/${slug}/${stage}`))}
                title={completed ? labels.stageReplayHint : stageLabel}
                aria-label={
                  completed ? `${stageLabel} — ${labels.stageCompleted}` : stageLabel
                }
                className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-[18px] border-[1.5px] border-white/50 transition-transform duration-150 hover:-translate-y-0.5 active:scale-95"
                style={tileStyle}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-2 top-1.5 h-2 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.6),rgba(255,255,255,0))]"
                />

                <span
                  dir="ltr"
                  className="text-lg font-black text-white tabular-nums drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)] sm:text-xl"
                >
                  {numFmt.format(stage)}
                </span>

                {completed ? (
                  <span className="absolute end-1 top-1 grid size-4 place-items-center rounded-full bg-white/95 text-[#2E7D32] shadow-xs">
                    <IconCheck className="size-3" />
                  </span>
                ) : null}

                {isCurrent ? (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1.5 h-1 w-[44%] rounded-full bg-white/90 shadow-xs"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Locked Stage Toast */}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--size-bottom-nav)+1rem)] z-50 mx-auto max-w-sm animate-[wb-pop-in_0.2s_ease-out] rounded-2xl bg-[#5D4037] px-4 py-2.5 text-center text-xs font-extrabold text-[#FFF8E1] shadow-lg md:bottom-6"
        >
          {toast}
        </div>
      ) : null}

      {/* Reset Category Progress Dialog */}
      {resetOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setResetOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm animate-[wb-pop-in_0.22s_ease-out] rounded-[26px] border-2 border-[#FFB300]/75 bg-[#FFFDF7] p-5 shadow-2xl dark:border-[#FFB300]/45 dark:bg-[#241E2B]"
          >
            <h2 className="text-lg font-black text-[#4E342E] dark:text-[#FFF8E1]">
              {labels.reset}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#6D4C41] dark:text-[#FFECB3]/85">
              {labels.resetConfirm}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetOpen(false)}
                className="min-h-10 rounded-full px-4 text-sm font-bold text-[#6D4C41] hover:bg-black/5 dark:text-[#FFECB3]"
              >
                {labels.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCategoryProgress(slug);
                  clearSolvedWords(`theme:${slug}`);
                  setResetOpen(false);
                }}
                className="min-h-10 rounded-full bg-[#E65100] px-5 text-sm font-black text-white shadow-sm hover:brightness-105"
              >
                {labels.reset}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MagicBackground>
  );
}
