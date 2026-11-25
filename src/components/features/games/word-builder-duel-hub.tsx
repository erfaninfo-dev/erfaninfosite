'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import {
  cancelDuelAction,
  createDuelAction,
  declineDuelAction,
  refreshDuelListAction,
  rematchDuelAction,
  startGuestDuelSessionAction,
} from '@/app/[locale]/play/duel/actions';
import { MagicBackground } from '@/components/features/games/magic-background';
import { ALL_AVATAR_PRESETS, ProfileAvatar } from '@/components/profile/profile-avatar';
import {
  IconArrowBack,
  IconCheck,
  IconChevron,
  IconClock,
  IconClose,
  IconCopy,
  IconEdit,
  IconFire,
  IconKey,
  IconLogin,
  IconPlay,
  IconRefresh,
  IconShare,
  IconShuffle,
  IconSparkle,
  IconSwords,
  IconTrophy,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { WordBuilderLeagueRow } from '@/lib/game/word-builder/campaign-server';
import type {
  DuelListResponse,
  DuelRecord,
  DuelSourceType,
} from '@/lib/game/word-builder/duel-types';
import type { WordBuilderDifficulty } from '@/lib/game/word-builder/types';
import { formatClient } from '@/lib/i18n/client-format';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

export type DuelCategoryOption = {
  slug: string;
  label: string;
  wordCount: number;
};

export type DuelHubLabels = {
  title: string;
  subtitle: string;
  back: string;
  createButton: string;
  joinPlaceholder: string;
  joinAction: string;
  statWins: string;
  statLosses: string;
  statDraws: string;
  statStreak: string;
  tabYourTurn: string;
  tabWaiting: string;
  tabHistory: string;
  emptyYourTurn: string;
  emptyWaiting: string;
  emptyHistory: string;
  createTitle: string;
  sourceNormal: string;
  sourceCategory: string;
  difficultyLabel: string;
  categoryLabel: string;
  opponentLabel: string;
  openInvite: string;
  createAndPlay: string;
  creating: string;
  openOpponent: string;
  copyLink: string;
  copied: string;
  share: string;
  shareInviteTemplate: string;
  playNow: string;
  acceptChallenge: string;
  viewResult: string;
  rematch: string;
  decline: string;
  cancel: string;
  victory: string;
  defeat: string;
  draw: string;
  statusExpired: string;
  statusDeclined: string;
  expiresHoursTemplate: string;
  expiresMinutesTemplate: string;
  pointsShortTemplate: string;
  close: string;
  signIn: string;
  guestBadge: string;
  guestHubNoteTemplate: string;
  guestEditName: string;
  guestNamePlaceholder: string;
  guestContinue: string;
  youLabel: string;
  rivalSlotLabel: string;
  orJoinCodeLabel: string;
  rulesRounds: string;
  ghostLabel: string;
  difficultyLabels: Record<WordBuilderDifficulty, string>;
};

type HubTab = 'your_turn' | 'waiting' | 'history';

function formatExpiry(
  expiresAt: string,
  locale: Locale,
  hoursTpl: string,
  minsTpl: string
): string | null {
  const parsed = Date.parse(expiresAt.replace(' ', 'T') + (expiresAt.includes('Z') ? '' : 'Z'));
  if (!Number.isFinite(parsed)) return null;
  const diffMs = parsed - Date.now();
  if (diffMs <= 0) return null;
  const mins = Math.max(1, Math.floor(diffMs / 60_000));
  if (mins >= 60) {
    return formatClient(hoursTpl, locale, { hours: Math.ceil(mins / 60) });
  }
  return formatClient(minsTpl, locale, { minutes: mins });
}

export function WordBuilderDuelHub({
  locale,
  currentActorKey,
  currentUserId,
  isGuest,
  currentPlayerName,
  currentPlayerAvatar,
  initialData,
  categories,
  leagueOpponents,
  labels,
}: {
  locale: Locale;
  currentActorKey: string;
  currentUserId: number;
  isGuest: boolean;
  currentPlayerName: string;
  currentPlayerAvatar: string;
  initialData: DuelListResponse;
  categories: DuelCategoryOption[];
  leagueOpponents: WordBuilderLeagueRow[];
  labels: DuelHubLabels;
}) {
  const router = useRouter();
  const numFmt = useMemo(() => new Intl.NumberFormat(NUMBER_LOCALE[locale]), [locale]);

  const [data, setData] = useState<DuelListResponse>(initialData);
  const [guestEditOpen, setGuestEditOpen] = useState(false);
  const [guestNameDraft, setGuestNameDraft] = useState(currentPlayerName);
  const [guestAvatarDraft, setGuestAvatarDraft] = useState(currentPlayerAvatar);
  const [guestSaving, setGuestSaving] = useState(false);
  const [tab, setTab] = useState<HubTab>(() =>
    initialData.your_turn.length > 0
      ? 'your_turn'
      : initialData.waiting.length > 0
        ? 'waiting'
        : 'history'
  );
  const [joinCode, setJoinCode] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [sourceType, setSourceType] = useState<DuelSourceType>('normal');
  const [difficulty, setDifficulty] = useState<WordBuilderDifficulty>('beginner');
  const [categorySlug, setCategorySlug] = useState<string>(categories[0]?.slug ?? '');
  const [opponentUserId, setOpponentUserId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyDuelId, setBusyDuelId] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const playableCategories = useMemo(
    () => categories.filter((c) => c.wordCount >= 12),
    [categories]
  );

  const filteredOpponents = useMemo(
    () => leagueOpponents.filter((u) => u.userId > 0 && u.userId !== currentUserId),
    [leagueOpponents, currentUserId]
  );

  const totalMatchesAnyTab =
    data.your_turn.length + data.waiting.length + data.completed.length;

  async function handleRefresh() {
    setRefreshing(true);
    const res = await refreshDuelListAction();
    setRefreshing(false);
    if (res.ok) setData(res.data);
  }

  function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length < 4) return;
    router.push(localeHref(locale, `/play/duel/${cleaned}`));
  }

  async function handleSaveGuestProfile(e: React.FormEvent) {
    e.preventDefault();
    if (guestNameDraft.trim().length < 2) return;
    setGuestSaving(true);
    const res = await startGuestDuelSessionAction({
      displayName: guestNameDraft.trim(),
      avatar: guestAvatarDraft,
    });
    setGuestSaving(false);
    if (res.ok) {
      setGuestEditOpen(false);
      router.refresh();
    } else {
      setErrorMsg(res.error);
    }
  }

  async function handleCreate() {
    setErrorMsg(null);
    setCreating(true);
    const res = await createDuelAction({
      sourceType,
      difficulty,
      categorySlug: sourceType === 'category' ? categorySlug : '',
      opponentUserId: isGuest ? null : opponentUserId,
    });
    setCreating(false);
    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }
    setCreateOpen(false);
    router.push(localeHref(locale, `/play/duel/${res.duel.code}?start=1`));
  }

  async function handleCopyInvite(code: string) {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}${localeHref(locale, `/play/duel/${code}`)}`
        : localeHref(locale, `/play/duel/${code}`);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode((cur) => (cur === code ? null : cur)), 2000);
    } catch {
      // ignore
    }
  }

  async function handleShareInvite(code: string) {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}${localeHref(locale, `/play/duel/${code}`)}`
        : localeHref(locale, `/play/duel/${code}`);
    const text = formatClient(labels.shareInviteTemplate, locale, { code });
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text, url });
        return;
      } catch {
        // fallback
      }
    }
    await handleCopyInvite(code);
  }

  async function handleRematch(duel: DuelRecord) {
    setBusyDuelId(duel.id);
    const res = await rematchDuelAction({
      duelId: duel.id,
      sourceType: duel.sourceType,
      difficulty: duel.difficulty,
      categorySlug: duel.categorySlug,
    });
    setBusyDuelId(null);
    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }
    router.push(localeHref(locale, `/play/duel/${res.duel.code}?start=1`));
  }

  async function handleDecline(duelId: number) {
    setBusyDuelId(duelId);
    const res = await declineDuelAction(duelId);
    setBusyDuelId(null);
    if (res.ok) await handleRefresh();
    else setErrorMsg(res.error);
  }

  async function handleCancel(duelId: number) {
    setBusyDuelId(duelId);
    const res = await cancelDuelAction(duelId);
    setBusyDuelId(null);
    if (res.ok) await handleRefresh();
    else setErrorMsg(res.error);
  }

  const activeList =
    tab === 'your_turn' ? data.your_turn : tab === 'waiting' ? data.waiting : data.completed;

  const emptyMessage =
    tab === 'your_turn'
      ? labels.emptyYourTurn
      : tab === 'waiting'
        ? labels.emptyWaiting
        : labels.emptyHistory;

  return (
    <MagicBackground className="-mt-8 -mb-[calc(var(--size-bottom-nav)+1rem)] min-h-[100dvh] pt-5 pb-[calc(var(--size-bottom-nav)+2.5rem)] md:-mb-12 md:pb-16">
      {/* Subtle warm organic corner waves matching reference atmosphere */}
      <svg
        aria-hidden="true"
        viewBox="0 0 800 900"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 size-full opacity-35 dark:opacity-15"
      >
        <path
          d="M800,180 C670,220 630,360 720,500 C780,590 730,740 580,900 L800,900 Z"
          fill="#F59E0B"
        />
        <path
          d="M0,680 C130,660 210,770 290,900 L0,900 Z"
          fill="#F59E0B"
        />
      </svg>

      <div className="page-gutter relative mx-auto flex w-full max-w-lg flex-col">
        {/* ── 1. Header ── */}
        <header className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={localeHref(locale, '/play')}
              aria-label={labels.back}
              className="wb-duel-header-back grid size-11 shrink-0 place-items-center rounded-full text-[#4A2508] transition-transform hover:scale-105 active:scale-95 dark:text-[#FFF8E1]"
            >
              <IconArrowBack className="size-5" />
            </Link>
            <h1 className="truncate text-xl font-black tracking-tight text-[#4A2508] sm:text-2xl dark:text-[#FFF8E1]">
              {labels.title}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isGuest ? (
              <button
                type="button"
                onClick={() => setGuestEditOpen(true)}
                className="wb-duel-profile-pill inline-flex h-11 items-center gap-2 rounded-full ps-1.5 pe-3.5 text-xs font-extrabold text-[#4A2508] backdrop-blur-xs transition-transform hover:scale-[1.02] active:scale-95 dark:text-[#FFF8E1]"
              >
                <ProfileAvatar avatarId={currentPlayerAvatar} size={32} />
                <span className="max-w-[6.75rem] truncate">{currentPlayerName}</span>
                <IconEdit className="size-3.5 text-[#6B3A14] dark:text-[#FFD54F]" />
              </button>
            ) : (
              <Link
                href={localeHref(locale, '/profile')}
                className="wb-duel-profile-pill inline-flex h-11 items-center gap-2 rounded-full ps-1.5 pe-3.5 text-xs font-extrabold text-[#4A2508] no-underline backdrop-blur-xs transition-transform hover:scale-[1.02] active:scale-95 dark:text-[#FFF8E1]"
              >
                <ProfileAvatar
                  avatarId={currentPlayerAvatar}
                  userId={currentUserId > 0 ? currentUserId : undefined}
                  size={32}
                />
                <span className="max-w-[6.75rem] truncate">{currentPlayerName}</span>
                <IconEdit className="size-3.5 text-[#6B3A14] dark:text-[#FFD54F]" />
              </Link>
            )}

            {totalMatchesAnyTab > 0 ? (
              <button
                type="button"
                onClick={handleRefresh}
                aria-label="Refresh"
                className="wb-duel-header-back grid size-10 place-items-center rounded-full text-[#4A2508] transition-transform active:scale-95 dark:text-[#FFF8E1]"
              >
                <IconRefresh className={cn('size-4.5', refreshing && 'animate-spin')} />
              </button>
            ) : null}
          </div>
        </header>

        {/* ── 2. Duel Preview Card (with subtle Crown accent peeking on top) ── */}
        <div className="relative mt-8">
          <svg
            aria-hidden="true"
            viewBox="0 0 120 44"
            className="wb-duel-crown"
          >
            <path
              d="M28,38 L22,16 L39,25 L50,9 L61,25 L78,16 L72,38 Z"
              fill="currentColor"
            />
            <line
              x1="90"
              y1="19"
              x2="101"
              y2="10"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="96"
              y1="30"
              x2="110"
              y2="26"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>

          <section className="wb-duel-preview-card relative rounded-[28px] px-5 pt-6 pb-5 sm:px-6">
            {/* Player vs Friend 3-Column Row */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
              {/* Left: Player Avatar + Pastel Blue Name Pill */}
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-white p-1 ring-[3px] ring-[#38BDF8] shadow-[0_5px_14px_rgba(56,189,248,0.28)]">
                  <ProfileAvatar
                    avatarId={currentPlayerAvatar}
                    userId={currentUserId > 0 ? currentUserId : undefined}
                    size={58}
                  />
                </div>
                <span className="wb-duel-name-you relative z-10 -mt-2 max-w-[7.5rem] truncate rounded-full px-3.5 py-1 text-xs font-extrabold">
                  {currentPlayerName || labels.youLabel}
                </span>
              </div>

              {/* Center: 1 vs 1 Crossed Swords Badge + Subtle Burst Rays */}
              <div className="relative flex flex-col items-center px-1">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 110 36"
                  style={{ color: '#F59E0B' }}
                  className="pointer-events-none absolute -top-3.5 left-1/2 h-7 w-24 -translate-x-1/2"
                >
                  <line
                    x1="20"
                    y1="14"
                    x2="11"
                    y2="6"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="15"
                    y1="24"
                    x2="4"
                    y2="20"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="90"
                    y1="14"
                    x2="99"
                    y2="6"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="95"
                    y1="24"
                    x2="106"
                    y2="20"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="wb-duel-vs-badge grid place-items-center rounded-full">
                  <IconSwords className="size-6 stroke-[2.1]" />
                </div>
                <span
                  dir="ltr"
                  className="wb-duel-1v1-pill relative z-10 -mt-2.5 rounded-full px-3.5 py-0.5 text-[11px] leading-tight font-black tracking-wide"
                >
                  1 vs 1
                </span>
              </div>

              {/* Right: Warm Cream Sparkle Friend Placeholder + Soft Lavender Pill */}
              <div className="flex flex-col items-center">
                <div className="wb-duel-friend-orb grid place-items-center rounded-full">
                  <IconSparkle className="size-7" />
                </div>
                <span className="wb-duel-name-friend relative z-10 -mt-2 max-w-[7.5rem] truncate rounded-full px-3.5 py-1 text-xs font-extrabold">
                  {labels.rivalSlotLabel}
                </span>
              </div>
            </div>

            {/* Compact Rule Badges (`3 rounds · same letters` & `Live Ghost`) */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <span className="wb-duel-rule-pill inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold">
                <IconShuffle className="size-3.5" />
                <span>{labels.rulesRounds}</span>
              </span>

              <span className="wb-duel-ghost-pill inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold">
                <span className="wb-duel-ghost-dot" />
                <span>{labels.ghostLabel}</span>
              </span>
            </div>

            {/* Compact 1-line Stats strip — only rendered once player has >= 1 completed duel */}
            {data.stats.total > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-[#5D4037]/10 pt-3 text-xs font-extrabold dark:border-white/10">
                <span className="text-[#2E7D32] dark:text-[#81C784]">
                  {numFmt.format(data.stats.wins)} {labels.statWins}
                </span>
                <span className="text-[#5D4037]/25 dark:text-white/20">·</span>
                <span className="text-[#C62828] dark:text-[#EF9A9A]">
                  {numFmt.format(data.stats.losses)} {labels.statLosses}
                </span>
                <span className="text-[#5D4037]/25 dark:text-white/20">·</span>
                <span className="text-[#1565C0] dark:text-[#90CAF9]">
                  {numFmt.format(data.stats.draws)} {labels.statDraws}
                </span>
                {data.stats.winStreak > 0 ? (
                  <>
                    <span className="text-[#5D4037]/25 dark:text-white/20">·</span>
                    <span className="inline-flex items-center gap-0.5 text-[#E65100] dark:text-[#FFD54F]">
                      <IconFire className="size-3.5" />
                      {numFmt.format(data.stats.winStreak)}
                    </span>
                  </>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        {/* ── 3. Description ── */}
        <p className="mx-auto mt-5 max-w-sm text-center text-sm leading-relaxed font-bold text-[#5D4037] dark:text-[#FFF8E1]/90">
          {labels.subtitle}
        </p>

        {/* ── 4. Primary CTA: Create Duel Button (with subtle side rays) ── */}
        <div className="wb-duel-cta-wrap mt-4 flex items-center justify-center">
          {/* Left Spark Rays */}
          <svg
            aria-hidden="true"
            viewBox="0 0 28 36"
            className="wb-duel-side-ray wb-duel-side-ray-left max-sm:hidden"
          >
            <line
              x1="22"
              y1="13"
              x2="8"
              y2="5"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="20"
              y1="24"
              x2="4"
              y2="21"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>

          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setCreateOpen(true);
            }}
            className="wb-duel-cta-gold relative inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-full px-7 text-base font-black text-[#4E2A14] transition-all duration-150"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-7 top-1 h-2.5 rounded-full bg-white/45"
            />
            <IconSwords className="size-5.5 stroke-[2.2]" />
            <span>{labels.createButton}</span>
          </button>

          {/* Right Spark Rays */}
          <svg
            aria-hidden="true"
            viewBox="0 0 28 36"
            className="wb-duel-side-ray wb-duel-side-ray-right max-sm:hidden"
          >
            <line
              x1="6"
              y1="13"
              x2="20"
              y2="5"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="24"
              x2="24"
              y2="21"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* ── 5. Join Duel Section ── */}
        <div className="mt-5 flex items-center gap-3.5 px-3">
          <span className="wb-duel-divider-line" />
          <span className="text-xs font-bold text-[#6D4C41] dark:text-[#FFECB3]/75">
            {labels.orJoinCodeLabel}
          </span>
          <span className="wb-duel-divider-line" />
        </div>

        <form
          onSubmit={handleJoinSubmit}
          className="wb-duel-code-bar mt-3.5 flex items-center gap-2 rounded-full p-1.5 transition-shadow"
        >
          <span className="ms-3.5 text-[#5D4037] dark:text-[#FBBF24]">
            <IconKey className="size-5" />
          </span>
          <input
            type="text"
            value={joinCode}
            onChange={(e) =>
              setJoinCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 8)
              )
            }
            placeholder={labels.joinPlaceholder}
            dir="ltr"
            className="h-10 min-w-0 flex-1 bg-transparent px-2 text-start font-mono text-sm font-extrabold tracking-[0.14em] text-[#4E2A14] uppercase placeholder:font-sans placeholder:text-xs placeholder:font-bold placeholder:tracking-wide placeholder:text-[#8D6E63] focus:outline-none dark:text-[#FFF8E1] dark:placeholder:text-[#FFECB3]/45"
          />
          <button
            type="submit"
            disabled={joinCode.trim().length < 4}
            className="wb-duel-cta-join relative inline-flex h-11 shrink-0 items-center justify-center overflow-hidden rounded-full px-7 text-sm font-black text-white transition-all duration-150"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 top-0.5 h-2 rounded-full bg-white/30"
            />
            <span>{labels.joinAction}</span>
          </button>
        </form>

        {errorMsg ? (
          <div className="mt-4 rounded-2xl border border-[#D32F2F]/40 bg-[#FFEBEE] px-4 py-3 text-xs font-bold text-[#B71C1C] dark:bg-[#4A1C1C] dark:text-[#FFCDD2]">
            {errorMsg}
          </div>
        ) : null}

        {/* ── Existing Matches & Tabs (Only shown once there is at least 1 match) ── */}
        {totalMatchesAnyTab > 0 ? (
          <section className="mt-6 flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-1 rounded-full bg-white/65 p-1 shadow-xs backdrop-blur-sm dark:bg-black/25">
              {(
                [
                  { id: 'your_turn', label: labels.tabYourTurn, count: data.your_turn.length },
                  { id: 'waiting', label: labels.tabWaiting, count: data.waiting.length },
                  { id: 'history', label: labels.tabHistory, count: data.completed.length },
                ] as const
              ).map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={cn(
                      'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-extrabold transition-all',
                      active
                        ? 'bg-[#FFB300] text-[#4E2A14] shadow-xs'
                        : 'text-[#6D4C41] hover:bg-white/50 dark:text-[#FFECB3]/80 dark:hover:bg-white/10'
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.count > 0 ? (
                      <span
                        dir="ltr"
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] leading-none font-black tabular-nums',
                          active
                            ? 'bg-[#4E2A14] text-[#FFF8E1]'
                            : 'bg-[#5D4037]/15 text-[#5D4037] dark:bg-white/15 dark:text-[#FFF8E1]'
                        )}
                      >
                        {numFmt.format(item.count)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {activeList.length === 0 ? (
              <p className="py-6 text-center text-xs font-bold text-[#6D4C41]/80 dark:text-[#FFECB3]/70">
                {emptyMessage}
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {activeList.map((duel) => {
                  const isCreator = duel.creator.actorKey
                    ? duel.creator.actorKey === currentActorKey
                    : duel.viewerRole === 'creator';
                  const rival = isCreator ? duel.opponent : duel.creator;
                  const myAttempt = isCreator ? duel.creatorAttempt : duel.opponentAttempt;
                  const rivalAttempt = isCreator ? duel.opponentAttempt : duel.creatorAttempt;
                  const sourceLabel =
                    duel.sourceType === 'category' && duel.categoryTitle
                      ? duel.categoryTitle
                      : labels.difficultyLabels[duel.difficulty];
                  const expiry =
                    duel.status !== 'completed' &&
                    duel.status !== 'expired' &&
                    duel.status !== 'declined'
                      ? formatExpiry(
                          duel.expiresAt,
                          locale,
                          labels.expiresHoursTemplate,
                          labels.expiresMinutesTemplate
                        )
                      : null;

                  const outcome =
                    duel.status === 'completed'
                      ? (
                          duel.winnerKey
                            ? duel.winnerKey === currentActorKey
                            : currentUserId > 0 && duel.winnerUserId === currentUserId
                        )
                        ? 'win'
                        : duel.winnerKey === null && duel.winnerUserId === null
                          ? 'draw'
                          : 'loss'
                      : duel.status;

                  return (
                    <div
                      key={duel.id}
                      className="rounded-[22px] border border-white/85 bg-white/82 p-3.5 shadow-xs backdrop-blur-sm dark:border-white/15 dark:bg-[#241E33]/85"
                    >
                      <div className="flex items-center gap-3">
                        {rival ? (
                          <ProfileAvatar
                            avatarId={rival.avatar}
                            userId={rival.userId}
                            size={42}
                            showBorder
                          />
                        ) : (
                          <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-dashed border-[#FFB300] bg-[#FFF8E1] text-sm font-black text-[#E65100] dark:bg-white/10 dark:text-[#FFD54F]">
                            ?
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-black text-[#4E2A14] dark:text-[#FFF8E1]">
                              {rival ? rival.displayName : labels.openOpponent}
                            </span>
                            <span className="rounded-full bg-[#FFB300]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#5D4037] dark:text-[#FFD54F]">
                              {sourceLabel}
                            </span>
                            {outcome === 'win' ? (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#2E7D32] px-2 py-0.5 text-[10px] font-extrabold text-white">
                                <IconTrophy className="size-2.5" />
                                {labels.victory}
                              </span>
                            ) : outcome === 'loss' ? (
                              <span className="rounded-full bg-[#C62828]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#C62828] dark:text-[#EF9A9A]">
                                {labels.defeat}
                              </span>
                            ) : outcome === 'draw' ? (
                              <span className="rounded-full bg-[#1565C0]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#1565C0] dark:text-[#90CAF9]">
                                {labels.draw}
                              </span>
                            ) : outcome === 'expired' ? (
                              <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-extrabold text-[#6D4C41] dark:bg-white/10 dark:text-white/65">
                                {labels.statusExpired}
                              </span>
                            ) : outcome === 'declined' ? (
                              <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-extrabold text-[#6D4C41] dark:bg-white/10 dark:text-white/65">
                                {labels.statusDeclined}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#795548] dark:text-[#FFECB3]/75">
                            <span dir="ltr" className="font-mono font-extrabold tracking-wider">
                              #{duel.code}
                            </span>
                            {expiry ? (
                              <span
                                suppressHydrationWarning
                                className="inline-flex items-center gap-1"
                              >
                                <IconClock className="size-3" />
                                {expiry}
                              </span>
                            ) : null}
                            {duel.status === 'completed' ? (
                              <span
                                dir="ltr"
                                className="font-black text-[#E65100] tabular-nums dark:text-[#FFD54F]"
                              >
                                {numFmt.format(myAttempt?.score ?? 0)} —{' '}
                                {numFmt.format(rivalAttempt?.score ?? 0)}
                              </span>
                            ) : myAttempt && !myAttempt.redacted ? (
                              <span>
                                {formatClient(labels.pointsShortTemplate, locale, {
                                  points: myAttempt.score ?? 0,
                                })}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {tab === 'your_turn' ? (
                          <Link
                            href={localeHref(locale, `/play/duel/${duel.code}`)}
                            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-[#FFB300] px-3.5 text-xs font-black text-[#4E2A14] no-underline shadow-xs"
                          >
                            <IconPlay className="size-3.5" />
                            <span>{isCreator ? labels.playNow : labels.acceptChallenge}</span>
                          </Link>
                        ) : (
                          <Link
                            href={localeHref(locale, `/play/duel/${duel.code}`)}
                            aria-label={labels.viewResult}
                            className="grid size-9 shrink-0 place-items-center rounded-full bg-[#5D4037]/10 text-[#5D4037] dark:bg-white/10 dark:text-[#FFF8E1]"
                          >
                            <IconChevron className="rtl-flip size-4" />
                          </Link>
                        )}
                      </div>

                      {tab === 'waiting' ? (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[#5D4037]/10 pt-2.5 dark:border-white/10">
                          <button
                            type="button"
                            onClick={() => handleCopyInvite(duel.code)}
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#5D4037]/20 bg-white/80 px-3 text-xs font-extrabold text-[#5D4037] dark:border-white/15 dark:bg-white/10 dark:text-[#FFF8E1]"
                          >
                            {copiedCode === duel.code ? (
                              <IconCheck className="size-3.5 text-[#2E7D32]" />
                            ) : (
                              <IconCopy className="size-3.5" />
                            )}
                            <span>{copiedCode === duel.code ? labels.copied : labels.copyLink}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShareInvite(duel.code)}
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[#FFB300]/25 px-3 text-xs font-extrabold text-[#5D4037] dark:text-[#FFD54F]"
                          >
                            <IconShare className="size-3.5" />
                            <span>{labels.share}</span>
                          </button>
                          {duel.canCancel ? (
                            <button
                              type="button"
                              disabled={busyDuelId === duel.id}
                              onClick={() => handleCancel(duel.id)}
                              className="ms-auto inline-flex min-h-8 items-center rounded-full px-3 text-xs font-extrabold text-[#C62828] hover:bg-[#FFCDD2]/30 dark:text-[#EF9A9A]"
                            >
                              {labels.cancel}
                            </button>
                          ) : null}
                        </div>
                      ) : tab === 'your_turn' && duel.canDecline ? (
                        <div className="mt-2 flex justify-end border-t border-[#5D4037]/10 pt-2 dark:border-white/10">
                          <button
                            type="button"
                            disabled={busyDuelId === duel.id}
                            onClick={() => handleDecline(duel.id)}
                            className="inline-flex min-h-8 items-center rounded-full px-3 text-xs font-extrabold text-[#C62828] hover:bg-[#FFCDD2]/30 dark:text-[#EF9A9A]"
                          >
                            {labels.decline}
                          </button>
                        </div>
                      ) : tab === 'history' && duel.status === 'completed' ? (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[#5D4037]/10 pt-2.5 dark:border-white/10">
                          <Link
                            href={localeHref(locale, `/play/duel/${duel.code}`)}
                            className="inline-flex min-h-8 items-center rounded-full border border-[#5D4037]/20 bg-white/80 px-3 text-xs font-extrabold text-[#5D4037] no-underline dark:border-white/15 dark:bg-white/10 dark:text-[#FFF8E1]"
                          >
                            {labels.viewResult}
                          </Link>
                          <button
                            type="button"
                            disabled={busyDuelId === duel.id}
                            onClick={() => handleRematch(duel)}
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[#FFB300] px-3 text-xs font-black text-[#4E2A14]"
                          >
                            <IconRefresh
                              className={cn('size-3.5', busyDuelId === duel.id && 'animate-spin')}
                            />
                            <span>{labels.rematch}</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </div>

      {/* ── Create Duel Bottom Sheet / Modal ── */}
      {createOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={() => !creating && setCreateOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={labels.createTitle}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border-2 border-[#FFB300]/80 bg-[linear-gradient(135deg,#FFFDE7,#FFECB3)] p-5 shadow-2xl sm:rounded-[28px] dark:border-[#FFB300]/50 dark:bg-[linear-gradient(135deg,#2D2640,#1E1B24)]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#5D4037]/25 dark:bg-white/25" />
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <IconSwords className="size-5 text-[#E65100] dark:text-[#FFD54F]" />
                <h2 className="text-lg font-black text-[#4E342E] dark:text-[#FFF8E1]">
                  {labels.createTitle}
                </h2>
              </div>
              <button
                type="button"
                disabled={creating}
                onClick={() => setCreateOpen(false)}
                aria-label={labels.close}
                className="grid size-9 place-items-center rounded-full bg-black/5 text-[#5D4037] dark:bg-white/10 dark:text-[#FFF8E1]"
              >
                <IconClose className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/5 p-1 dark:bg-white/10">
              <button
                type="button"
                onClick={() => setSourceType('normal')}
                className={cn(
                  'min-h-10 rounded-xl text-xs font-extrabold transition-colors',
                  sourceType === 'normal'
                    ? 'bg-[#FFB300] text-[#4E342E] shadow-xs'
                    : 'text-[#6D4C41] dark:text-[#FFECB3]/80'
                )}
              >
                {labels.sourceNormal}
              </button>
              <button
                type="button"
                onClick={() => setSourceType('category')}
                disabled={playableCategories.length === 0}
                className={cn(
                  'min-h-10 rounded-xl text-xs font-extrabold transition-colors disabled:opacity-45',
                  sourceType === 'category'
                    ? 'bg-[#FFB300] text-[#4E342E] shadow-xs'
                    : 'text-[#6D4C41] dark:text-[#FFECB3]/80'
                )}
              >
                {labels.sourceCategory}
              </button>
            </div>

            {sourceType === 'normal' ? (
              <div className="mt-4">
                <label className="mb-2 block text-xs font-extrabold text-[#5D4037] dark:text-[#FFECB3]">
                  {labels.difficultyLabel}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setDifficulty(tier)}
                      className={cn(
                        'min-h-11 rounded-2xl border-2 px-2 text-xs font-extrabold transition-all',
                        difficulty === tier
                          ? 'border-[#FF9800] bg-white text-[#E65100] shadow-xs dark:bg-[#FFB300]/20 dark:text-[#FFD54F]'
                          : 'border-transparent bg-white/60 text-[#5D4037] dark:bg-white/10 dark:text-[#FFF8E1]'
                      )}
                    >
                      {labels.difficultyLabels[tier]}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <label
                  htmlFor="duel-category-select"
                  className="mb-2 block text-xs font-extrabold text-[#5D4037] dark:text-[#FFECB3]"
                >
                  {labels.categoryLabel}
                </label>
                <select
                  id="duel-category-select"
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  className="h-12 w-full rounded-2xl border-2 border-white/80 bg-white/90 px-3.5 text-sm font-bold text-[#4E342E] focus:border-[#FFB300] focus:outline-none dark:border-white/15 dark:bg-[#1B1726] dark:text-[#FFF8E1]"
                >
                  {playableCategories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!isGuest ? (
              <div className="mt-4">
                <label
                  htmlFor="duel-opponent-select"
                  className="mb-2 block text-xs font-extrabold text-[#5D4037] dark:text-[#FFECB3]"
                >
                  {labels.opponentLabel}
                </label>
                <select
                  id="duel-opponent-select"
                  value={opponentUserId ?? ''}
                  onChange={(e) =>
                    setOpponentUserId(e.target.value ? Number.parseInt(e.target.value, 10) : null)
                  }
                  className="h-12 w-full rounded-2xl border-2 border-white/80 bg-white/90 px-3.5 text-sm font-bold text-[#4E342E] focus:border-[#FFB300] focus:outline-none dark:border-white/15 dark:bg-[#1B1726] dark:text-[#FFF8E1]"
                >
                  <option value="">{labels.openInvite}</option>
                  {filteredOpponents.map((player) => (
                    <option key={player.userId} value={player.userId}>
                      {player.displayName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {errorMsg ? (
              <p className="mt-3 rounded-xl bg-[#FFCDD2]/60 px-3 py-2 text-xs font-bold text-[#B71C1C] dark:bg-[#4A1C1C] dark:text-[#FFCDD2]">
                {errorMsg}
              </p>
            ) : null}

            <button
              type="button"
              disabled={creating}
              onClick={handleCreate}
              className="wb-duel-cta-gold mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-black text-[#4A2508] transition-all disabled:opacity-60"
            >
              <IconPlay className="size-4.5" />
              <span>{creating ? labels.creating : labels.createAndPlay}</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Guest Profile & Sign-in Sheet (opened from top-bar pill) ── */}
      {guestEditOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={() => !guestSaving && setGuestEditOpen(false)}
        >
          <form
            onSubmit={handleSaveGuestProfile}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-[26px] border-2 border-[#FFB300]/80 bg-[linear-gradient(135deg,#FFFDE7,#FFECB3)] p-5 shadow-2xl sm:rounded-[26px] dark:border-[#FFB300]/50 dark:bg-[linear-gradient(135deg,#2D2640,#1E1B24)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-[#4E342E] dark:text-[#FFF8E1]">
                  {labels.guestEditName}
                </h2>
                <span className="rounded-full bg-[#7C3AED]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#6D28D9] dark:bg-[#7C3AED]/30 dark:text-[#DDD6FE]">
                  {labels.guestBadge}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setGuestEditOpen(false)}
                aria-label={labels.close}
                className="grid size-8 place-items-center rounded-full bg-black/5 text-[#5D4037] dark:bg-white/10 dark:text-[#FFF8E1]"
              >
                <IconClose className="size-4" />
              </button>
            </div>
            <input
              type="text"
              value={guestNameDraft}
              onChange={(e) => setGuestNameDraft(e.target.value.slice(0, 24))}
              placeholder={labels.guestNamePlaceholder}
              maxLength={24}
              className="h-11 w-full rounded-2xl border-2 border-white/80 bg-white/95 px-3.5 text-sm font-bold text-[#4E342E] focus:border-[#FFB300] focus:outline-none dark:border-white/15 dark:bg-[#1B1726] dark:text-[#FFF8E1]"
            />
            <div className="mt-3 grid max-h-56 grid-cols-5 gap-2 overflow-y-auto p-0.5">
              {ALL_AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setGuestAvatarDraft(preset.id)}
                  aria-label={preset.label}
                  title={preset.label}
                  className={cn(
                    'grid h-12 place-items-center rounded-xl border-2 transition-transform active:scale-95',
                    guestAvatarDraft === preset.id
                      ? 'scale-105 border-[#4E342E] bg-white shadow-xs dark:border-[#FFD54F] dark:bg-white/15'
                      : 'border-transparent bg-white/55 hover:bg-white/80 dark:bg-white/5'
                  )}
                >
                  <ProfileAvatar avatarId={preset.id} size={36} />
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={guestSaving || guestNameDraft.trim().length < 2}
              className="mt-4 min-h-11 w-full rounded-full bg-[#FFB300] text-sm font-black text-[#4E342E] disabled:opacity-50"
            >
              {labels.guestContinue}
            </button>

            <div className="mt-4 border-t border-[#5D4037]/15 pt-3.5 text-center dark:border-white/15">
              <p className="mb-2.5 text-[11px] font-semibold text-[#6D4C41] dark:text-[#FFECB3]/75">
                {formatClient(labels.guestHubNoteTemplate, locale, { name: currentPlayerName })}
              </p>
              <Link
                href={`${localeHref(locale, '/login')}?next=${encodeURIComponent(localeHref(locale, '/play/duel'))}`}
                className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[#7C3AED] px-4 text-xs font-extrabold text-white no-underline"
              >
                <IconLogin className="size-4" />
                <span>{labels.signIn}</span>
              </Link>
            </div>
          </form>
        </div>
      ) : null}
    </MagicBackground>
  );
}
