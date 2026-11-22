'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { MagicBackground } from '@/components/features/games/magic-background';
import { useWordBuilderCoins } from '@/components/features/games/use-word-builder-coins';
import { WordBuilderCoinsChip } from '@/components/features/games/word-builder-coins-chip';
import { IconArrowBack, IconCheck, IconLock } from '@/components/ui/icons';
import { STAGES_PER_TIER } from '@/lib/game/word-builder/campaign';
import {
  clearedForDifficulty,
  getServerCampaignProgress,
  isDifficultyUnlocked,
  isStageCompleted,
  isStageUnlocked,
  readCampaignProgress,
  subscribeCampaignProgress,
} from '@/lib/game/word-builder/campaign-progress';
import type { WordBuilderDifficulty } from '@/lib/game/word-builder/types';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import { formatClient } from '@/lib/i18n/client-format';
import { localeHref } from '@/lib/nav';

export type CampaignStagesLabels = {
  back: string;
  difficultyTitle: string;
  stageNTemplate: string;
  stageCompleted: string;
  stageReplayHint: string;
  stageLockedToast: string;
  tierLockedBody: string;
};

const STAGE_NUMBERS: readonly number[] = Array.from(
  { length: STAGES_PER_TIER },
  (_, i) => i + 1
);

/**
 * 50-Stage Glossy Grid for Normal Campaign (Beginner / Intermediate / Advanced),
 * without chapter banners, with sequential unlocking and auto-scroll to the
 * player's current unlocked stage.
 */
export function WordBuilderCampaignStages({
  locale,
  difficulty,
  unlockAll,
  labels,
}: {
  locale: Locale;
  difficulty: WordBuilderDifficulty;
  unlockAll: boolean;
  labels: CampaignStagesLabels;
}) {
  const router = useRouter();
  const coins = useWordBuilderCoins();
  const progress = useSyncExternalStore(
    subscribeCampaignProgress,
    readCampaignProgress,
    getServerCampaignProgress
  );

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const currentCellRef = useRef<HTMLButtonElement | null>(null);
  const scrolledKeyRef = useRef<string | null>(null);

  const numFmt = new Intl.NumberFormat(NUMBER_LOCALE[locale]);
  const tierUnlocked = isDifficultyUnlocked(progress, difficulty, unlockAll);
  const cleared = clearedForDifficulty(progress, difficulty);
  const nextStage = Math.max(1, Math.min(STAGES_PER_TIER, cleared + 1));

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
    if (!tierUnlocked) return;
    const key = `${difficulty}:${nextStage}`;
    if (scrolledKeyRef.current === key) return;
    scrolledKeyRef.current = key;
    if (nextStage <= 10) return;
    const id = window.requestAnimationFrame(() => {
      currentCellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [difficulty, nextStage, tierUnlocked]);

  return (
    <MagicBackground className="-mt-8 -mb-[calc(var(--size-bottom-nav)+1rem)] min-h-[100dvh] pt-6 pb-[calc(var(--size-bottom-nav)+3rem)] md:-mb-12 md:pb-20">
      <div className="page-gutter mx-auto flex w-full max-w-[34rem] flex-col gap-5">
        {/* ── Flutter AppBar: Back · Difficulty Title & Counter · Coins ── */}
        <header className="flex items-center gap-2.5">
          <Link
            href={localeHref(locale, '/play/normal')}
            aria-label={labels.back}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white/45 text-[#5D4037] transition-colors hover:bg-white/70 dark:bg-black/25 dark:text-[#FFF8E1] dark:hover:bg-black/40"
          >
            <IconArrowBack className="size-5" />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black text-[#5D4037] sm:text-2xl dark:text-[#FFF8E1]">
              {labels.difficultyTitle}
            </h1>
            <p className="text-xs font-extrabold text-[#6D4C41] tabular-nums dark:text-[#FFECB3]/85">
              <bdi dir="ltr">
                {numFmt.format(cleared)} / {numFmt.format(STAGES_PER_TIER)}
              </bdi>
            </p>
          </div>

          <WordBuilderCoinsChip coins={coins.coins} locale={locale} compact />
        </header>

        {!tierUnlocked ? (
          <div className="mt-6 rounded-[26px] border-2 border-[#FFB300]/80 bg-[linear-gradient(135deg,#FFF8E1,#FFE0E8)] p-6 text-center shadow-lg dark:border-[#FFB300]/50 dark:bg-[linear-gradient(135deg,#3E2A35,#2D2640)]">
            <span
              className="mx-auto grid size-14 place-items-center rounded-full text-white"
              style={{
                backgroundImage: 'linear-gradient(135deg, #FFB300, #E1306C)',
                boxShadow: '0 6px 16px rgba(225, 48, 108, 0.35)',
              }}
            >
              <IconLock className="size-7" />
            </span>
            <p className="mt-4 text-sm leading-relaxed font-extrabold text-[#5D4037] dark:text-[#FFF8E1]">
              {labels.tierLockedBody}
            </p>
            <Link
              href={localeHref(locale, '/play/normal')}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#FFB300] px-6 text-sm font-black text-[#4E342E] no-underline shadow-md transition-transform hover:brightness-105"
            >
              {labels.back}
            </Link>
          </div>
        ) : (
          /* ── Clean 5-Column Glossy Stage Grid (1..50) ── */
          <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
            {STAGE_NUMBERS.map((stage) => {
              const unlocked = isStageUnlocked(progress, difficulty, stage, unlockAll);
              const completed = isStageCompleted(progress, difficulty, stage);
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
                  onClick={() =>
                    router.push(localeHref(locale, `/play/normal/${difficulty}/${stage}`))
                  }
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
        )}
      </div>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--size-bottom-nav)+1rem)] z-50 mx-auto max-w-sm animate-[wb-pop-in_0.2s_ease-out] rounded-2xl bg-[#5D4037] px-4 py-2.5 text-center text-xs font-extrabold text-[#FFF8E1] shadow-lg md:bottom-6"
        >
          {toast}
        </div>
      ) : null}
    </MagicBackground>
  );
}
