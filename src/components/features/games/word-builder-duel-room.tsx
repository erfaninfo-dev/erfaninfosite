'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  cancelDuelAction,
  declineDuelAction,
  joinAndStartDuelAction,
  rematchDuelAction,
  submitDuelAttemptAction,
} from '@/app/[locale]/play/duel/actions';
import { MagicBackground } from '@/components/features/games/magic-background';
import {
  WordBuilderDuelPlay,
  type DuelPlayLabels,
} from '@/components/features/games/word-builder-duel-play';
import {
  WordBuilderDuelResult,
  type DuelResultLabels,
} from '@/components/features/games/word-builder-duel-result';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import {
  IconArrowBack,
  IconCheck,
  IconClock,
  IconCopy,
  IconLightbulb,
  IconPlay,
  IconRefresh,
  IconShare,
  IconSparkle,
  IconSwords,
} from '@/components/ui/icons';
import type {
  DuelPlayEvent,
  DuelPlayer,
  DuelRecord,
} from '@/lib/game/word-builder/duel-types';
import { formatClient } from '@/lib/i18n/client-format';
import type { Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

export type DuelRoomLabels = {
  back: string;
  playNow: string;
  acceptChallenge: string;
  continuePlaying: string;
  decline: string;
  cancel: string;
  rulesRounds: string;
  rulesTimerTemplate: string;
  rulesHints: string;
  ghostReadyBanner: string;
  waitingCreatorNote: string;
  openOpponent: string;
  statusExpired: string;
  statusDeclined: string;
  copyLink: string;
  copied: string;
  share: string;
  shareInviteTemplate: string;
  backToHub: string;
  difficultyLabels: Record<'beginner' | 'intermediate' | 'advanced', string>;
  play: DuelPlayLabels;
  result: DuelResultLabels;
};

export function WordBuilderDuelRoom({
  initialDuel,
  initialRemainingMs,
  currentUser,
  locale,
  glossLang,
  labels,
  autoStart = false,
}: {
  initialDuel: DuelRecord;
  initialRemainingMs?: number;
  currentUser: DuelPlayer;
  locale: Locale;
  glossLang: 'fa' | 'ckb';
  labels: DuelRoomLabels;
  autoStart?: boolean;
}) {
  const router = useRouter();
  const [duel, setDuel] = useState<DuelRecord>(initialDuel);
  const [remainingMs, setRemainingMs] = useState<number>(
    initialRemainingMs ?? initialDuel.timeLimitSec * 1000
  );
  const initialCanResume =
    Boolean(initialDuel.rounds && initialDuel.rounds.length > 0) &&
    initialDuel.status !== 'completed' &&
    !initialDuel.mySubmitted &&
    typeof initialRemainingMs === 'number' &&
    initialRemainingMs > 0;
  const initialCanAutoStart =
    autoStart &&
    !initialCanResume &&
    !initialDuel.mySubmitted &&
    initialDuel.canPlay &&
    initialDuel.status !== 'completed' &&
    initialDuel.status !== 'expired' &&
    initialDuel.status !== 'declined';

  const [isPlaying, setIsPlaying] = useState<boolean>(initialCanResume);
  const [starting, setStarting] = useState<boolean>(initialCanAutoStart);
  const [submitting, setSubmitting] = useState(false);
  const [rematchBusy, setRematchBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const autoStartFiredRef = useRef(false);
  const mountedRef = useRef(true);

  const isCreator = duel.creator.actorKey
    ? duel.creator.actorKey === currentUser.actorKey
    : duel.viewerRole === 'creator';
  const rival = isCreator ? duel.opponent : duel.creator;
  const sourceLabel =
    duel.sourceType === 'category' && duel.categoryTitle
      ? duel.categoryTitle
      : labels.difficultyLabels[duel.difficulty];

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${localeHref(locale, `/play/duel/${duel.code}`)}`
      : localeHref(locale, `/play/duel/${duel.code}`);

  const handleStart = useCallback(async () => {
    setErrorMsg(null);
    setStarting(true);
    try {
      const res = await joinAndStartDuelAction(duel.code);
      if (!mountedRef.current) return;
      setStarting(false);
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      setDuel(res.duel);
      setRemainingMs(res.remainingMs ?? res.duel.timeLimitSec * 1000);
      setIsPlaying(true);
    } catch {
      if (!mountedRef.current) return;
      setStarting(false);
      setErrorMsg('Failed to start duel. Please try again.');
    }
  }, [duel.code]);

  // Automatically launch gameplay when navigated with `?start=1` (e.g. Create & Play / Rematch).
  // Uses `mountedRef` instead of a per-effect cancellation flag so React StrictMode's
  // dev remount does not discard the in-flight promise while `autoStartFiredRef` prevents double calls.
  useEffect(() => {
    mountedRef.current = true;
    if (initialCanAutoStart && !autoStartFiredRef.current) {
      autoStartFiredRef.current = true;

      if (typeof window !== 'undefined' && window.location.search.includes('start=')) {
        const cleanUrl = `${window.location.pathname}${window.location.hash}`;
        window.history.replaceState(null, '', cleanUrl);
      }

      void joinAndStartDuelAction(initialDuel.code)
        .then((res) => {
          if (!mountedRef.current) return;
          setStarting(false);
          if (!res.ok) {
            setErrorMsg(res.error);
            return;
          }
          setDuel(res.duel);
          setRemainingMs(res.remainingMs ?? res.duel.timeLimitSec * 1000);
          setIsPlaying(true);
        })
        .catch(() => {
          if (!mountedRef.current) return;
          setStarting(false);
          setErrorMsg('Failed to start duel. Please try again.');
        });
    }

    return () => {
      mountedRef.current = false;
    };
  }, [initialCanAutoStart, initialDuel.code]);

  async function handleComplete(payload: {
    events: DuelPlayEvent[];
    hintsUsed: number;
    elapsedMs: number;
  }) {
    setSubmitting(true);
    setErrorMsg(null);
    const res = await submitDuelAttemptAction({
      code: duel.code,
      events: payload.events,
      hintsUsed: payload.hintsUsed,
      elapsedMs: payload.elapsedMs,
    });
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error);
      setIsPlaying(false);
      return;
    }
    setDuel(res.duel);
    setIsPlaying(false);
  }

  async function handleRematch() {
    setRematchBusy(true);
    setErrorMsg(null);
    const res = await rematchDuelAction({
      duelId: duel.id,
      sourceType: duel.sourceType,
      difficulty: duel.difficulty,
      categorySlug: duel.categorySlug,
    });
    setRematchBusy(false);
    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }
    router.push(localeHref(locale, `/play/duel/${res.duel.code}?start=1`));
  }

  async function handleDecline() {
    setActionBusy(true);
    const res = await declineDuelAction(duel.id);
    setActionBusy(false);
    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }
    router.push(localeHref(locale, '/play/duel'));
    router.refresh();
  }

  async function handleCancel() {
    setActionBusy(true);
    const res = await cancelDuelAction(duel.id);
    setActionBusy(false);
    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }
    router.push(localeHref(locale, '/play/duel'));
    router.refresh();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function handleShare() {
    const text = formatClient(labels.shareInviteTemplate, locale, { code: duel.code });
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text, url: inviteUrl });
        return;
      } catch {
        // fallback to copy
      }
    }
    await handleCopy();
  }

  // Active full-screen gameplay
  if (isPlaying && duel.rounds && duel.rounds.length > 0) {
    return (
      <WordBuilderDuelPlay
        rounds={duel.rounds}
        bonusCatalog={duel.bonusCatalog ?? []}
        timeLimitSec={duel.timeLimitSec}
        initialRemainingMs={remainingMs}
        seed={duel.seed}
        you={currentUser}
        opponent={rival}
        ghostTimeline={duel.ghostTimeline ?? []}
        locale={locale}
        glossLang={glossLang}
        labels={labels.play}
        submitting={submitting}
        onComplete={handleComplete}
      />
    );
  }

  // Completed OR waiting for opponent after viewer submitted
  if (duel.status === 'completed' || duel.mySubmitted) {
    return (
      <MagicBackground className="-mt-8 -mb-[calc(var(--size-bottom-nav)+1rem)] min-h-[100dvh] pt-5 pb-[calc(var(--size-bottom-nav)+2.5rem)] md:-mb-12 md:pb-16">
        <div className="page-gutter mx-auto w-full max-w-[var(--container-content)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Link
                href={localeHref(locale, '/play/duel')}
                aria-label={labels.back}
                className="wb-duel-header-back grid size-10 place-items-center rounded-full text-[#4E2A14] transition-transform hover:scale-105 active:scale-95 dark:text-[#FFF8E1]"
              >
                <IconArrowBack className="size-5" />
              </Link>
              <span className="wb-duel-rule-pill inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold">
                <IconSwords className="size-3.5" />
                {sourceLabel}
              </span>
            </div>
            <span
              dir="ltr"
              className="wb-duel-rule-pill rounded-full px-3 py-1 font-mono text-xs font-black tracking-[0.18em]"
            >
              #{duel.code}
            </span>
          </div>

          {errorMsg ? (
            <div className="mx-auto mb-4 max-w-xl rounded-2xl border border-[#D32F2F]/40 bg-[#FFEBEE] px-4 py-3 text-sm font-bold text-[#B71C1C] dark:bg-[#4A1C1C] dark:text-[#FFCDD2]">
              {errorMsg}
            </div>
          ) : null}

          <WordBuilderDuelResult
            duel={duel}
            currentActorKey={currentUser.actorKey}
            currentUserId={currentUser.userId}
            isGuest={currentUser.isGuest}
            locale={locale}
            glossLang={glossLang}
            labels={labels.result}
            rematchBusy={rematchBusy}
            onRematch={handleRematch}
          />
        </div>
      </MagicBackground>
    );
  }

  const isClosed = duel.status === 'expired' || duel.status === 'declined';
  const hasResume = typeof initialRemainingMs === 'number' && initialRemainingMs > 0;
  const primaryCta = hasResume
    ? labels.continuePlaying
    : isCreator
      ? labels.playNow
      : labels.acceptChallenge;

  return (
    <MagicBackground className="-mt-8 -mb-[calc(var(--size-bottom-nav)+1rem)] min-h-[100dvh] pt-5 pb-[calc(var(--size-bottom-nav)+2.5rem)] md:-mb-12 md:pb-16">
      <div className="page-gutter mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={localeHref(locale, '/play/duel')}
            aria-label={labels.back}
            className="wb-duel-header-back grid size-10 place-items-center rounded-full text-[#4E2A14] transition-transform hover:scale-105 active:scale-95 dark:text-[#FFF8E1]"
          >
            <IconArrowBack className="size-5" />
          </Link>
          <span
            dir="ltr"
            className="wb-duel-rule-pill rounded-full px-3.5 py-1.5 font-mono text-xs font-black tracking-[0.2em]"
          >
            #{duel.code}
          </span>
        </div>

        {/* ── Pre-Match VS Lobby Card ── */}
        <section className="wb-duel-preview-card relative mt-2 rounded-[30px] p-6 sm:p-7">
          {/* Decorative crown matching Hub */}
          <svg
            aria-hidden="true"
            viewBox="0 0 96 34"
            className="wb-duel-crown"
            fill="currentColor"
          >
            <path d="M27 27 L31 12 L42 19 L48 7 L54 19 L65 12 L69 27 Z" />
            <rect x="75" y="13" width="3.5" height="12" rx="1.75" transform="rotate(35 76.7 19)" />
            <rect x="81" y="21" width="3.5" height="9" rx="1.75" transform="rotate(64 82.7 25.5)" />
          </svg>

          <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
            <span className="wb-duel-rule-pill inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold">
              <IconSwords className="size-3.5 text-[#E65100] dark:text-[#FFD54F]" />
              {sourceLabel}
            </span>
            {isClosed ? (
              <span className="wb-duel-danger-pill rounded-full px-3 py-1 text-xs font-extrabold">
                {duel.status === 'expired' ? labels.statusExpired : labels.statusDeclined}
              </span>
            ) : null}
          </div>

          {/* Avatars VS */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2 text-center">
            <div className="flex flex-col items-center gap-2.5">
              <div className="rounded-full bg-white p-1 shadow-[0_6px_16px_rgba(37,99,235,0.22)] ring-2 ring-[#60A5FA]/80">
                <ProfileAvatar
                  avatarId={duel.creator.avatar}
                  userId={duel.creator.userId}
                  size={60}
                />
              </div>
              <span className="wb-duel-name-you max-w-[165px] truncate rounded-full px-3.5 py-1 text-xs font-black">
                {duel.creator.displayName}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="wb-duel-vs-badge grid place-items-center rounded-full">
                <IconSwords className="size-6" />
              </div>
              <span className="wb-duel-1v1-pill -mt-2.5 rounded-full px-3 py-0.5 text-[11px] font-black tracking-wide">
                VS
              </span>
            </div>

            <div className="flex flex-col items-center gap-2.5">
              {duel.opponent ? (
                <>
                  <div className="rounded-full bg-white p-1 shadow-[0_6px_16px_rgba(124,58,237,0.22)] ring-2 ring-[#C084FC]/80">
                    <ProfileAvatar
                      avatarId={duel.opponent.avatar}
                      userId={duel.opponent.userId}
                      size={60}
                    />
                  </div>
                  <span className="wb-duel-name-friend max-w-[165px] truncate rounded-full px-3.5 py-1 text-xs font-black">
                    {duel.opponent.displayName}
                  </span>
                </>
              ) : (
                <>
                  <span className="wb-duel-friend-orb grid place-items-center rounded-full">
                    <IconSparkle className="size-7" />
                  </span>
                  <span className="wb-duel-name-friend max-w-[165px] truncate rounded-full px-3.5 py-1 text-xs font-black">
                    {labels.openOpponent}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Match Rules Pills */}
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="wb-duel-rule-pill flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-extrabold">
              <IconSparkle className="size-3.5 shrink-0 text-[#E65100] dark:text-[#FFD54F]" />
              <span>{labels.rulesRounds}</span>
            </div>
            <div className="wb-duel-rule-pill flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-extrabold">
              <IconClock className="size-3.5 shrink-0 text-[#1976D2] dark:text-[#90CAF9]" />
              <span>
                {formatClient(labels.rulesTimerTemplate, locale, {
                  seconds: duel.timeLimitSec,
                })}
              </span>
            </div>
            <div className="wb-duel-rule-pill flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-extrabold">
              <IconLightbulb className="size-3.5 shrink-0 text-[#2E7D32] dark:text-[#81C784]" />
              <span>{labels.rulesHints}</span>
            </div>
          </div>

          {/* Ghost Replay / Creator note */}
          {duel.hasGhost && !isClosed ? (
            <div className="wb-duel-ghost-pill mt-4 flex items-center justify-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-extrabold">
              <span className="wb-duel-ghost-dot shrink-0 animate-pulse" />
              <span>{labels.ghostReadyBanner}</span>
            </div>
          ) : isCreator && duel.status === 'waiting_creator' ? (
            <p className="mt-4 text-center text-xs font-bold text-[#6D4C41] dark:text-[#FFECB3]/80">
              {labels.waitingCreatorNote}
            </p>
          ) : null}

          {errorMsg ? (
            <div className="mt-4 rounded-2xl border border-[#D32F2F]/40 bg-[#FFEBEE] px-4 py-2.5 text-xs font-bold text-[#B71C1C] dark:bg-[#4A1C1C] dark:text-[#FFCDD2]">
              {errorMsg}
            </div>
          ) : null}

          {/* Primary Action */}
          {!isClosed && duel.canPlay ? (
            <button
              type="button"
              disabled={starting}
              onClick={handleStart}
              className="wb-duel-cta-gold relative mt-6 inline-flex min-h-13.5 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full px-6 text-base font-black text-[#4A2508] transition-all disabled:opacity-75"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 top-1 h-2.5 rounded-full bg-white/40"
              />
              {starting ? (
                <IconRefresh className="size-5 animate-spin" />
              ) : (
                <IconPlay className="size-5" />
              )}
              <span>{primaryCta}</span>
            </button>
          ) : (
            <Link
              href={localeHref(locale, '/play/duel')}
              className="wb-duel-cta-gold mt-6 inline-flex min-h-12.5 w-full items-center justify-center rounded-full px-6 text-sm font-black text-[#4A2508] no-underline transition-all"
            >
              {labels.backToHub}
            </Link>
          )}

          {/* Secondary Actions */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {isCreator && !isClosed ? (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="wb-duel-secondary-pill inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-xs font-extrabold transition-all"
                >
                  {copied ? (
                    <IconCheck className="size-3.5 text-[#2E7D32]" />
                  ) : (
                    <IconCopy className="size-3.5" />
                  )}
                  <span>{copied ? labels.copied : labels.copyLink}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="wb-duel-secondary-pill inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-xs font-extrabold transition-all"
                >
                  <IconShare className="size-3.5" />
                  <span>{labels.share}</span>
                </button>
              </>
            ) : null}

            {duel.canDecline ? (
              <button
                type="button"
                disabled={actionBusy}
                onClick={handleDecline}
                className="wb-duel-danger-pill inline-flex min-h-10 items-center rounded-full px-4 text-xs font-extrabold transition-all active:scale-95 disabled:opacity-50"
              >
                {labels.decline}
              </button>
            ) : null}

            {duel.canCancel ? (
              <button
                type="button"
                disabled={actionBusy}
                onClick={handleCancel}
                className="wb-duel-danger-pill inline-flex min-h-10 items-center rounded-full px-4 text-xs font-extrabold transition-all active:scale-95 disabled:opacity-50"
              >
                {labels.cancel}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </MagicBackground>
  );
}
