'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { syncWordBuilderProgressAction } from '@/app/[locale]/play/actions';
import { MagicBackground } from '@/components/features/games/magic-background';
import { useWordBuilderCoins } from '@/components/features/games/use-word-builder-coins';
import { WordBuilderCoinsChip } from '@/components/features/games/word-builder-coins-chip';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import {
  IconArrowBack,
  IconChevron,
  IconClose,
  IconCoin,
  IconFlag,
  IconLock,
  IconPlay,
  IconRefresh,
  IconTrophy,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import {
  STAGES_PER_TIER,
  overallStageFromProgress,
} from '@/lib/game/word-builder/campaign';
import {
  getServerCampaignProgress,
  isDifficultyUnlocked,
  readCampaignProgress,
  resetCampaignProgress,
  subscribeCampaignProgress,
} from '@/lib/game/word-builder/campaign-progress';
import type { WordBuilderLeagueData } from '@/lib/game/word-builder/campaign-server';
import type { WordBuilderDifficulty } from '@/lib/game/word-builder/types';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

export type NormalHubLabels = {
  back: string;
  title: string;
  subtitle: string;
  reset: string;
  resetConfirm: string;
  resetDone: string;
  cancel: string;
  close: string;
  beginner: string;
  intermediate: string;
  advanced: string;
  lockedIntermediateSub: string;
  lockedIntermediateMsg: string;
  lockedAdvancedSub: string;
  lockedAdvancedMsg: string;
  stageNTemplate: string;
  leagueTitle: string;
  leagueSubtitle: string;
  yourCoins: string;
  yourLevel: string;
  leagueEmpty: string;
  signInLeagueHint: string;
};

/**
 * Normal Campaign Hub matching Flutter's `WordBuilderLobbyScreen`
 * (`lib/features/word_builder/presentation/word_builder_lobby_screen.dart`),
 * without water/train/prison mode switches or PvP.
 */
export function WordBuilderNormalHub({
  locale,
  unlockAll,
  signedIn,
  league,
  labels,
}: {
  locale: Locale;
  unlockAll: boolean;
  signedIn: boolean;
  league: WordBuilderLeagueData | null;
  labels: NormalHubLabels;
}) {
  const router = useRouter();
  const coins = useWordBuilderCoins();
  const progress = useSyncExternalStore(
    subscribeCampaignProgress,
    readCampaignProgress,
    getServerCampaignProgress
  );

  const [resetOpen, setResetOpen] = useState(false);
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const syncedOnceRef = useRef(false);

  const numFmt = new Intl.NumberFormat(NUMBER_LOCALE[locale]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Best-effort sync of local campaign progress + coins to backend league if signed in.
  useEffect(() => {
    if (!signedIn || syncedOnceRef.current) return;
    syncedOnceRef.current = true;
    void syncWordBuilderProgressAction({
      beginnerStagesCleared: progress.beginner,
      intermediateStagesCleared: progress.intermediate,
      advancedStagesCleared: progress.advanced,
      coins: coins.coins,
    }).catch(() => {});
  }, [signedIn, progress.beginner, progress.intermediate, progress.advanced, coins.coins]);

  useEffect(() => {
    if (!resetOpen && !leagueOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setResetOpen(false);
        setLeagueOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetOpen, leagueOpen]);

  const interUnlocked = isDifficultyUnlocked(progress, 'intermediate', unlockAll);
  const advUnlocked = isDifficultyUnlocked(progress, 'advanced', unlockAll);
  const currentStage = overallStageFromProgress(progress);

  const stageLabel = (overall: number) => {
    const tierName =
      overall <= STAGES_PER_TIER
        ? labels.beginner
        : overall <= STAGES_PER_TIER * 2
          ? labels.intermediate
          : labels.advanced;
    const localStage = ((overall - 1) % STAGES_PER_TIER) + 1;
    return `${tierName} · ${numFmt.format(localStage)}/${numFmt.format(STAGES_PER_TIER)}`;
  };

  const handleConfirmReset = () => {
    const next = resetCampaignProgress();
    setResetOpen(false);
    showToast(labels.resetDone);
    if (signedIn) {
      void syncWordBuilderProgressAction({
        beginnerStagesCleared: next.beginner,
        intermediateStagesCleared: next.intermediate,
        advancedStagesCleared: next.advanced,
        coins: coins.coins,
      }).catch(() => {});
    }
  };

  const tiers: Array<{
    key: WordBuilderDifficulty;
    title: string;
    subtitle: string;
    locked: boolean;
    lockedMsg: string;
    cleared: number;
  }> = [
    {
      key: 'beginner',
      title: labels.beginner,
      subtitle: `${numFmt.format(progress.beginner)}/${numFmt.format(STAGES_PER_TIER)}`,
      locked: false,
      lockedMsg: '',
      cleared: progress.beginner,
    },
    {
      key: 'intermediate',
      title: labels.intermediate,
      subtitle: interUnlocked
        ? `${numFmt.format(progress.intermediate)}/${numFmt.format(STAGES_PER_TIER)}`
        : labels.lockedIntermediateSub,
      locked: !interUnlocked,
      lockedMsg: labels.lockedIntermediateMsg,
      cleared: progress.intermediate,
    },
    {
      key: 'advanced',
      title: labels.advanced,
      subtitle: advUnlocked
        ? `${numFmt.format(progress.advanced)}/${numFmt.format(STAGES_PER_TIER)}`
        : labels.lockedAdvancedSub,
      locked: !advUnlocked,
      lockedMsg: labels.lockedAdvancedMsg,
      cleared: progress.advanced,
    },
  ];

  return (
    <MagicBackground className="-mt-8 -mb-[calc(var(--size-bottom-nav)+1rem)] min-h-[100dvh] pt-4 pb-[calc(var(--size-bottom-nav)+2.5rem)] md:-mb-12 md:pb-16">
      <div className="page-gutter mx-auto flex w-full max-w-[36rem] flex-col gap-5">
        {/* ── Flutter AppBar: Back · Reset Pill · Coins Chip ── */}
        <header className="flex items-center justify-between gap-2">
          <Link
            href={localeHref(locale, '/play')}
            aria-label={labels.back}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white/45 text-[#5D4037] transition-colors hover:bg-white/70 dark:bg-black/25 dark:text-[#FFF8E1] dark:hover:bg-black/40"
          >
            <IconArrowBack className="size-5" />
          </Link>

          <div className="flex items-center gap-2">
            {/* Glossy Coral Reset Pill matching Flutter `_ResetTopCard` */}
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#FF7043]/45 bg-[linear-gradient(135deg,#FFF3E0,#FFCCBC)] ps-1.5 pe-3.5 py-1 shadow-[0_4px_14px_rgba(255,112,67,0.22)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span
                className="grid size-7 place-items-center rounded-full text-white"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #FFAB91, #FF7043)',
                  boxShadow: '0 3px 8px rgba(255, 112, 67, 0.35)',
                }}
              >
                <IconRefresh className="size-4" />
              </span>
              <span className="text-xs font-black text-[#BF360C] sm:text-[13px]">
                {labels.reset}
              </span>
            </button>

            <WordBuilderCoinsChip coins={coins.coins} locale={locale} compact />
          </div>
        </header>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-black text-[#5D4037] sm:text-3xl dark:text-[#FFF8E1]">
            {labels.title}
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#6D4C41] dark:text-[#FFECB3]/85">
            {labels.subtitle}
          </p>
        </div>

        {/* ── 3 Difficulty Tier Launch Cards (exact Flutter `_TierLaunchCard`) ── */}
        <div className="flex flex-col gap-3.5">
          {tiers.map((tier) => {
            const pct = Math.round((tier.cleared / STAGES_PER_TIER) * 100);
            return (
              <button
                key={tier.key}
                type="button"
                onClick={() => {
                  if (tier.locked) {
                    showToast(tier.lockedMsg);
                    return;
                  }
                  router.push(localeHref(locale, `/play/normal/${tier.key}`));
                }}
                className={cn(
                  'group relative w-full overflow-hidden rounded-[22px] border-2 px-5 py-5 text-start transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.99]',
                  tier.locked
                    ? 'border-[#FFB300]/80 bg-[linear-gradient(135deg,#FFF8E1,#FFE0E8,#E9E4FF)] shadow-[0_6px_20px_rgba(225,48,108,0.18),0_3px_14px_rgba(255,179,0,0.18)] dark:border-[#FFB300]/55 dark:bg-[linear-gradient(135deg,#3E2A35,#2D2640)]'
                    : 'border-white/60 bg-[linear-gradient(135deg,#FFF8E1,#FFECB3)] shadow-[0_6px_18px_rgba(255,152,0,0.35)] dark:border-[#FFB300]/60 dark:bg-[linear-gradient(135deg,#5D4037,#2D2640)]'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-black text-[#5D4037] dark:text-[#FFF8E1]">
                      {tier.title}
                    </h2>
                    <p
                      className={cn(
                        'mt-1 text-sm',
                        tier.locked
                          ? 'font-extrabold text-[#7A4E32] dark:text-[#FFD54F]'
                          : 'font-bold text-[#8D6E63] dark:text-[#FFECB3]/85'
                      )}
                    >
                      {tier.subtitle}
                    </p>
                    {!tier.locked ? (
                      <div className="mt-2.5 h-2 w-full max-w-[14rem] overflow-hidden rounded-full bg-[#5D4037]/12 dark:bg-white/12">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#66BB6A,#FFB300)] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    ) : null}
                  </div>

                  <span
                    className="grid size-13 shrink-0 place-items-center rounded-full transition-transform duration-150 group-hover:scale-105"
                    style={
                      tier.locked
                        ? {
                            backgroundImage: 'linear-gradient(135deg, #FFB300, #E1306C)',
                            boxShadow: '0 4px 16px rgba(225, 48, 108, 0.42)',
                          }
                        : {
                            backgroundImage: 'linear-gradient(135deg, #FFD54F, #FFB300)',
                            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.45)',
                          }
                    }
                  >
                    {tier.locked ? (
                      <IconLock className="size-6.5 text-white" />
                    ) : (
                      <IconPlay className="rtl-flip size-7 text-[#5D4037]" />
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Word Builder League Card (exact Flutter `_WordBuilderLeagueCard`) ── */}
        <button
          type="button"
          onClick={() => setLeagueOpen(true)}
          className="mt-1 w-full rounded-[26px] border-2 border-[#FFB300]/95 bg-[linear-gradient(135deg,#FFF8E1,#FFDDE8,#FFECB3)] p-4.5 text-start shadow-[0_9px_24px_rgba(225,48,108,0.18),0_5px_14px_rgba(0,0,0,0.06)] transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.99] dark:border-[#FFB300]/70 dark:bg-[linear-gradient(135deg,#24152B,#4A2341,#2D2640)]"
        >
          <div className="flex items-center gap-3">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-full text-white"
              style={{
                backgroundImage: 'linear-gradient(135deg, #FFB300, #E1306C)',
                boxShadow: '0 5px 14px rgba(225, 48, 108, 0.35)',
              }}
            >
              <IconTrophy className="size-6.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-black text-[#4E342E] dark:text-[#FFF8E1]">
                {labels.leagueTitle}
              </p>
              <p className="truncate text-xs font-bold text-[#7A4E32] dark:text-[#FFECB3]/85">
                {labels.leagueSubtitle}
              </p>
            </div>
            <IconChevron className="rtl-flip size-5 shrink-0 text-[#4E342E] dark:text-[#FFF8E1]" />
          </div>

          {/* 2 Metric Pills */}
          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            <div className="flex items-center gap-2 rounded-2xl border border-[#FFB300]/45 bg-white/75 px-3 py-2 dark:border-white/15 dark:bg-black/25">
              <IconCoin className="size-5 shrink-0 text-[#F57C00]" />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-[#7A4E32] dark:text-[#FFECB3]/75">
                  {labels.yourCoins}
                </p>
                <p className="truncate text-sm font-black text-[#4E342E] tabular-nums dark:text-[#FFF8E1]">
                  <bdi dir="ltr">{numFmt.format(coins.coins)}</bdi>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-[#FFB300]/45 bg-white/75 px-3 py-2 dark:border-white/15 dark:bg-black/25">
              <IconFlag className="size-5 shrink-0 text-[#E1306C]" />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-[#7A4E32] dark:text-[#FFECB3]/75">
                  {labels.yourLevel}
                </p>
                <p className="truncate text-xs font-black text-[#4E342E] dark:text-[#FFF8E1]">
                  {stageLabel(currentStage)}
                </p>
              </div>
            </div>
          </div>

          {/* Top 3 Preview */}
          {league && league.rows.length > 0 ? (
            <div className="mt-3.5 flex flex-col gap-1.5">
              {league.rows.slice(0, 3).map((row, idx) => (
                <div
                  key={row.userId || idx}
                  className="flex items-center gap-2.5 rounded-xl bg-white/65 px-2.5 py-1.5 dark:bg-black/20"
                >
                  <span
                    dir="ltr"
                    className="grid size-6 shrink-0 place-items-center rounded-full bg-[#FFB300]/25 text-xs font-black text-[#5D4037] tabular-nums dark:text-[#FFD54F]"
                  >
                    {row.rank ?? idx + 1}
                  </span>
                  <ProfileAvatar avatarId={row.avatar} userId={row.userId} size={28} />
                  <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-[#4E342E] dark:text-[#FFF8E1]">
                    {row.displayName}
                  </span>
                  <span
                    dir="ltr"
                    className="shrink-0 text-xs font-black text-[#E65100] tabular-nums dark:text-[#FFD54F]"
                  >
                    {numFmt.format(row.points)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-center text-xs font-bold text-[#7A4E32]/85 dark:text-[#FFECB3]/75">
              {signedIn ? labels.leagueEmpty : labels.signInLeagueHint}
            </p>
          )}
        </button>
      </div>

      {/* ── Floating Warm-Brown Toast ── */}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--size-bottom-nav)+1rem)] z-50 mx-auto max-w-sm animate-[wb-pop-in_0.2s_ease-out] rounded-2xl bg-[#5D4037] px-4 py-2.5 text-center text-xs font-extrabold text-[#FFF8E1] shadow-lg md:bottom-6"
        >
          {toast}
        </div>
      ) : null}

      {/* ── Reset Confirmation Dialog ── */}
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
                onClick={handleConfirmReset}
                className="min-h-10 rounded-full bg-[#E65100] px-5 text-sm font-black text-white shadow-sm hover:brightness-105"
              >
                {labels.reset}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Full Word Builder League Overlay ── */}
      {leagueOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLeagueOpen(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 backdrop-blur-xs sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[82dvh] w-full max-w-md animate-[sheet-in_0.22s_ease-out] overflow-y-auto rounded-[28px] border-2 border-[#FFB300]/80 bg-[linear-gradient(135deg,#FFFDF7,#FFF3E0)] p-5 shadow-2xl dark:border-[#FFB300]/50 dark:bg-[linear-gradient(135deg,#24152B,#2D2640)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="grid size-9 place-items-center rounded-full text-white"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, #FFB300, #E1306C)',
                  }}
                >
                  <IconTrophy className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-black text-[#4E342E] dark:text-[#FFF8E1]">
                    {labels.leagueTitle}
                  </h2>
                  <p className="text-xs font-semibold text-[#7A4E32] dark:text-[#FFECB3]/80">
                    {labels.leagueSubtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLeagueOpen(false)}
                aria-label={labels.close}
                className="grid size-9 place-items-center rounded-full bg-black/8 text-[#5D4037] dark:bg-white/10 dark:text-[#FFF8E1]"
              >
                <IconClose className="size-4.5" />
              </button>
            </div>

            {league && league.rows.length > 0 ? (
              <div className="mt-4 flex flex-col gap-2">
                {league.rows.map((row, idx) => (
                  <div
                    key={row.userId || idx}
                    className="flex items-center gap-3 rounded-2xl border border-[#FFB300]/35 bg-white/80 px-3 py-2.5 dark:border-white/10 dark:bg-white/5"
                  >
                    <span
                      dir="ltr"
                      className={cn(
                        'grid size-7 shrink-0 place-items-center rounded-full text-xs font-black tabular-nums',
                        idx === 0
                          ? 'bg-[#FFB300] text-[#4E342E]'
                          : idx === 1
                            ? 'bg-[#CFD8DC] text-[#37474F]'
                            : idx === 2
                              ? 'bg-[#FFAB91] text-[#5D4037]'
                              : 'bg-black/8 text-[#5D4037] dark:bg-white/10 dark:text-[#FFECB3]'
                      )}
                    >
                      {row.rank ?? idx + 1}
                    </span>
                    <ProfileAvatar avatarId={row.avatar} userId={row.userId} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[#4E342E] dark:text-[#FFF8E1]">
                        {row.displayName}
                      </p>
                      {row.completedCount > 0 ? (
                        <p className="text-[11px] font-semibold text-[#8D6E63] dark:text-[#FFECB3]/75">
                          {stageLabel(Math.min(STAGES_PER_TIER * 3, row.completedCount + 1))}
                        </p>
                      ) : null}
                    </div>
                    <span
                      dir="ltr"
                      className="inline-flex items-center gap-1 rounded-full bg-[#FFF8E1] px-2.5 py-1 text-xs font-black text-[#E65100] tabular-nums dark:bg-black/30 dark:text-[#FFD54F]"
                    >
                      <IconCoin className="size-3.5 text-[#FFB300]" />
                      {numFmt.format(row.points)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-sm font-bold text-[#7A4E32] dark:text-[#FFECB3]/80">
                {signedIn ? labels.leagueEmpty : labels.signInLeagueHint}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </MagicBackground>
  );
}
