'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  WordInfoOverlay,
  type WordInfoOverlayLabels,
} from '@/components/features/games/word-info-overlay';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import {
  IconCheck,
  IconCopy,
  IconLogin,
  IconRefresh,
  IconShare,
  IconSparkle,
  IconTrophy,
  IconVolume,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import {
  localizedDuelExampleGloss,
  localizedDuelMeaning,
} from '@/lib/game/word-builder/duel-scoring';
import type { DuelRecord, DuelWordSnapshot } from '@/lib/game/word-builder/duel-types';
import { normalizeWord } from '@/lib/game/word-builder/logic';
import type { WordBuilderTargetWord } from '@/lib/game/word-builder/types';
import { formatClient } from '@/lib/i18n/client-format';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

export type DuelResultLabels = WordInfoOverlayLabels & {
  victory: string;
  defeat: string;
  draw: string;
  waitingOpponentTitle: string;
  waitingOpponentBody: string;
  scoreBreakdown: string;
  metricTarget: string;
  metricBonus: string;
  metricRounds: string;
  metricStreak: string;
  metricTimeBonus: string;
  metricHints: string;
  metricElapsed: string;
  metricTotal: string;
  wordsComparisonTitle: string;
  wordsComparisonHint: string;
  missedByYou: string;
  foundByBoth: string;
  foundOnlyYou: string;
  missedByBoth: string;
  roundBadgeTemplate: string;
  rematch: string;
  share: string;
  copyLink: string;
  copied: string;
  shareInviteTemplate: string;
  shareResultTemplate: string;
  backToHub: string;
  youLabel: string;
  pointsShortTemplate: string;
  guestUpgradeTitle: string;
  guestUpgradeBody: string;
  guestUpgradeCta: string;
};

function formatDuration(ms: number | undefined, locale: Locale): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '—';
  const totalSec = Math.max(0, Math.round(ms / 100) / 10);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec - mins * 60;
  const nf = new Intl.NumberFormat(NUMBER_LOCALE[locale], { maximumFractionDigits: 1 });
  if (mins > 0) {
    return `${nf.format(mins)}m ${nf.format(Math.round(secs))}s`;
  }
  return `${nf.format(secs)}s`;
}

export function WordBuilderDuelResult({
  duel,
  currentActorKey,
  currentUserId,
  isGuest,
  locale,
  glossLang,
  labels,
  rematchBusy,
  onRematch,
}: {
  duel: DuelRecord;
  currentActorKey: string;
  currentUserId: number;
  isGuest: boolean;
  locale: Locale;
  glossLang: 'fa' | 'ckb';
  labels: DuelResultLabels;
  rematchBusy: boolean;
  onRematch: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [sheetTarget, setSheetTarget] = useState<WordBuilderTargetWord | null>(null);
  const numFmt = useMemo(() => new Intl.NumberFormat(NUMBER_LOCALE[locale]), [locale]);

  const isCreator = duel.creator.actorKey
    ? duel.creator.actorKey === currentActorKey
    : duel.viewerRole === 'creator';
  const me = isCreator ? duel.creator : (duel.opponent ?? duel.creator);
  const rival = isCreator ? duel.opponent : duel.creator;
  const myAttempt = isCreator ? duel.creatorAttempt : duel.opponentAttempt;
  const rivalAttempt = isCreator ? duel.opponentAttempt : duel.creatorAttempt;

  const isCompleted = duel.status === 'completed';
  const iWon =
    isCompleted &&
    (duel.winnerKey
      ? duel.winnerKey === currentActorKey
      : currentUserId > 0 && duel.winnerUserId === currentUserId);
  const isDraw = isCompleted && duel.winnerKey === null && duel.winnerUserId === null;

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${localeHref(locale, `/play/duel/${duel.code}`)}`
      : localeHref(locale, `/play/duel/${duel.code}`);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard restrictions
    }
  }

  async function handleShare() {
    const shareText = isCompleted
      ? formatClient(labels.shareResultTemplate, locale, { score: myAttempt?.score ?? 0 })
      : formatClient(labels.shareInviteTemplate, locale, { code: duel.code });

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: shareText, url: inviteUrl });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    await handleCopy();
  }

  const openWord = (w: DuelWordSnapshot) => {
    setSheetTarget({
      word: w.word,
      meaning: localizedDuelMeaning(w, glossLang, locale),
      exampleEn: w.exampleEn,
      exampleGloss: localizedDuelExampleGloss(w, glossLang),
    });
  };

  // Build solved sets per round for educational comparison.
  const comparisonByRound = useMemo(() => {
    const rounds = duel.rounds ?? [];
    const bonusCatalog = duel.bonusCatalog ?? [];

    return rounds.map((round, rIdx) => {
      const mySolved = new Set(
        (myAttempt?.solvedWords ?? [])
          .filter((s) => s.roundIndex === rIdx)
          .map((s) => normalizeWord(s.word))
      );
      const rivalSolved = new Set(
        (rivalAttempt?.solvedWords ?? [])
          .filter((s) => s.roundIndex === rIdx)
          .map((s) => normalizeWord(s.word))
      );

      const bonusByWord = new Map<string, DuelWordSnapshot>();
      for (const b of bonusCatalog[rIdx] ?? []) {
        bonusByWord.set(normalizeWord(b.word), b);
      }

      const targets = round.targetWords.map((t) => {
        const norm = normalizeWord(t.word);
        return {
          snapshot: t,
          isBonus: false,
          foundByMe: mySolved.has(norm),
          foundByRival: rivalSolved.has(norm),
        };
      });

      const targetSet = new Set(round.targetWords.map((t) => normalizeWord(t.word)));
      const bonusWords: typeof targets = [];
      const seenBonus = new Set<string>();
      for (const word of [...mySolved, ...rivalSolved]) {
        if (targetSet.has(word) || seenBonus.has(word)) continue;
        seenBonus.add(word);
        const snap = bonusByWord.get(word) ?? {
          word,
          meaning: '',
          meaningEn: '',
          meaningFa: '',
          meaningCkb: '',
          exampleEn: '',
          exampleFa: '',
          exampleCkb: '',
          exampleGloss: '',
        };
        bonusWords.push({
          snapshot: snap,
          isBonus: true,
          foundByMe: mySolved.has(word),
          foundByRival: rivalSolved.has(word),
        });
      }

      return {
        roundIndex: rIdx,
        items: [...targets, ...bonusWords],
      };
    });
  }, [duel.bonusCatalog, duel.rounds, myAttempt?.solvedWords, rivalAttempt?.solvedWords]);

  // Waiting-for-opponent state when Player 1 finishes first.
  if (!isCompleted) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 py-3">
        <section className="wb-duel-preview-card relative mt-2 rounded-[30px] p-6 text-center sm:p-7">
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

          <div className="wb-duel-trophy-victory mx-auto mb-3.5 grid size-16 place-items-center rounded-full">
            <IconSparkle className="size-8" />
          </div>
          <h1 className="text-2xl font-black text-[#4A2508] dark:text-[#FFF8E1]">
            {labels.waitingOpponentTitle}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-[#6D4C41] dark:text-[#FFECB3]/85">
            {labels.waitingOpponentBody}
          </p>

          {myAttempt && !myAttempt.redacted ? (
            <div className="wb-duel-rule-pill mt-5 inline-flex items-center gap-3 rounded-full px-5 py-2">
              <span className="text-xs font-extrabold">{labels.metricTotal}</span>
              <span
                dir="ltr"
                className="text-2xl font-black text-[#E65100] tabular-nums dark:text-[#FFD54F]"
              >
                {numFmt.format(myAttempt.score ?? 0)}
              </span>
            </div>
          ) : null}

          <div className="wb-duel-code-bar mt-5 rounded-2xl px-4 py-3.5">
            <p
              dir="ltr"
              className="font-mono text-2xl font-black tracking-[0.28em] text-[#4A2508] dark:text-[#FFD54F]"
            >
              {duel.code}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="wb-duel-secondary-pill inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-extrabold transition-all"
            >
              {copied ? (
                <IconCheck className="size-4 text-[#2E7D32]" />
              ) : (
                <IconCopy className="size-4" />
              )}
              <span>{copied ? labels.copied : labels.copyLink}</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="wb-duel-cta-gold relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-full px-4 text-sm font-black text-[#4A2508] transition-all"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-4 top-1 h-2 rounded-full bg-white/40"
              />
              <IconShare className="size-4" />
              <span>{labels.share}</span>
            </button>
          </div>
        </section>

        <Link
          href={localeHref(locale, '/play/duel')}
          className="wb-duel-secondary-pill inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-extrabold no-underline transition-all"
        >
          {labels.backToHub}
        </Link>

        {isGuest ? (
          <GuestUpgradeNudge locale={locale} duelCode={duel.code} labels={labels} />
        ) : null}
      </div>
    );
  }

  const myBd = myAttempt?.breakdown;
  const rivalBd = rivalAttempt?.breakdown;

  const breakdownRows = [
    {
      label: labels.metricTarget,
      mine: numFmt.format(myBd?.targetPoints ?? 0),
      theirs: numFmt.format(rivalBd?.targetPoints ?? 0),
    },
    {
      label: labels.metricBonus,
      mine: numFmt.format(myBd?.bonusPoints ?? 0),
      theirs: numFmt.format(rivalBd?.bonusPoints ?? 0),
    },
    {
      label: labels.metricRounds,
      mine: numFmt.format(myBd?.roundClearBonus ?? 0),
      theirs: numFmt.format(rivalBd?.roundClearBonus ?? 0),
    },
    {
      label: labels.metricStreak,
      mine: numFmt.format(myBd?.streakBonus ?? 0),
      theirs: numFmt.format(rivalBd?.streakBonus ?? 0),
    },
    {
      label: labels.metricTimeBonus,
      mine: numFmt.format(myBd?.timeBonus ?? 0),
      theirs: numFmt.format(rivalBd?.timeBonus ?? 0),
    },
    {
      label: labels.metricHints,
      mine: myBd?.hintPenalty ? `-${numFmt.format(myBd.hintPenalty)}` : numFmt.format(0),
      theirs: rivalBd?.hintPenalty ? `-${numFmt.format(rivalBd.hintPenalty)}` : numFmt.format(0),
    },
    {
      label: labels.metricElapsed,
      mine: formatDuration(myAttempt?.elapsedMs, locale),
      theirs: formatDuration(rivalAttempt?.elapsedMs, locale),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-3">
      {/* ── Victory / Defeat / Draw Hero ── */}
      <section
        className={cn(
          'relative mt-2 rounded-[30px] p-6 text-center sm:p-7',
          iWon
            ? 'wb-duel-hero-victory'
            : isDraw
              ? 'wb-duel-hero-draw'
              : 'wb-duel-hero-defeat'
        )}
      >
        {iWon ? (
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
        ) : null}

        <div
          className={cn(
            'mx-auto mb-3.5 grid size-16 place-items-center rounded-full',
            iWon
              ? 'wb-duel-trophy-victory'
              : isDraw
                ? 'wb-duel-trophy-draw'
                : 'wb-duel-trophy-defeat'
          )}
        >
          <IconTrophy className="size-8" />
        </div>

        <h1 className="text-2xl font-black text-[#4A2508] sm:text-3xl dark:text-[#FFF8E1]">
          {iWon ? labels.victory : isDraw ? labels.draw : labels.defeat}
        </h1>

        {/* Side-by-side avatars & total scores */}
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full bg-white p-1 shadow-[0_6px_16px_rgba(37,99,235,0.2)] ring-2 ring-[#60A5FA]/80">
              <ProfileAvatar avatarId={me.avatar} userId={me.userId} size={54} />
            </div>
            <span className="wb-duel-name-you max-w-[126px] truncate rounded-full px-3 py-0.5 text-xs font-black">
              {labels.youLabel}
            </span>
            <span
              dir="ltr"
              className="text-3xl font-black text-[#D95B00] tabular-nums dark:text-[#FFD54F]"
            >
              {numFmt.format(myAttempt?.score ?? 0)}
            </span>
          </div>

          <span className="wb-duel-1v1-pill rounded-full px-3.5 py-1 text-xs font-black tracking-wide">
            VS
          </span>

          <div className="flex flex-col items-center gap-2">
            {rival ? (
              <div className="rounded-full bg-white p-1 shadow-[0_6px_16px_rgba(124,58,237,0.2)] ring-2 ring-[#C084FC]/80">
                <ProfileAvatar avatarId={rival.avatar} userId={rival.userId} size={54} />
              </div>
            ) : null}
            <span className="wb-duel-name-friend max-w-[126px] truncate rounded-full px-3 py-0.5 text-xs font-black">
              {rival?.displayName ?? '—'}
            </span>
            <span
              dir="ltr"
              className="text-3xl font-black text-[#5D4037] tabular-nums dark:text-[#FFECB3]"
            >
              {numFmt.format(rivalAttempt?.score ?? 0)}
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            disabled={rematchBusy}
            onClick={onRematch}
            className="wb-duel-cta-gold relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-full px-6 text-sm font-black text-[#4A2508] transition-all disabled:opacity-55"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-4 top-1 h-2 rounded-full bg-white/40"
            />
            <IconRefresh className={cn('size-4', rematchBusy && 'animate-spin')} />
            <span>{labels.rematch}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="wb-duel-secondary-pill inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-extrabold transition-all"
          >
            {copied ? <IconCheck className="size-4 text-[#2E7D32]" /> : <IconShare className="size-4" />}
            <span>{copied ? labels.copied : labels.share}</span>
          </button>

          <Link
            href={localeHref(locale, '/play/duel')}
            className="wb-duel-secondary-pill inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-extrabold no-underline transition-all"
          >
            {labels.backToHub}
          </Link>
        </div>
      </section>

      {/* ── Score Breakdown Table ── */}
      <section className="wb-duel-surface-card rounded-[26px] p-5 sm:p-6">
        <div className="mb-3 grid grid-cols-[1fr_auto_auto] items-center gap-4">
          <h2 className="text-base font-black text-[#4A2508] dark:text-[#FFF8E1]">
            {labels.scoreBreakdown}
          </h2>
          <span className="min-w-16 text-end text-[11px] font-black text-[#D95B00] dark:text-[#FFD54F]">
            {labels.youLabel}
          </span>
          <span className="max-w-20 min-w-16 truncate text-end text-[11px] font-extrabold text-[#6D4C41] dark:text-white/70">
            {rival?.displayName ?? '—'}
          </span>
        </div>
        <div className="divide-y divide-[#5D4037]/10 dark:divide-white/10">
          {breakdownRows.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-2.5 text-sm">
              <span className="font-semibold text-[#6D4C41] dark:text-[#FFECB3]/80">{row.label}</span>
              <span
                dir="ltr"
                className="min-w-16 text-end font-extrabold text-[#E65100] tabular-nums dark:text-[#FFD54F]"
              >
                {row.mine}
              </span>
              <span
                dir="ltr"
                className="min-w-16 text-end font-bold text-[#5D4037]/80 tabular-nums dark:text-white/75"
              >
                {row.theirs}
              </span>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 pt-3 text-base font-black">
            <span className="text-[#4A2508] dark:text-[#FFF8E1]">{labels.metricTotal}</span>
            <span dir="ltr" className="min-w-16 text-end text-[#E65100] tabular-nums dark:text-[#FFD54F]">
              {numFmt.format(myAttempt?.score ?? 0)}
            </span>
            <span dir="ltr" className="min-w-16 text-end text-[#5D4037] tabular-nums dark:text-white">
              {numFmt.format(rivalAttempt?.score ?? 0)}
            </span>
          </div>
        </div>
      </section>

      {/* ── Educational Word Comparison ── */}
      <section className="wb-duel-surface-card rounded-[26px] p-5 sm:p-6">
        <h2 className="text-base font-black text-[#4A2508] dark:text-[#FFF8E1]">
          {labels.wordsComparisonTitle}
        </h2>
        <p className="mt-0.5 text-xs font-semibold text-[#6D4C41] dark:text-[#FFECB3]/75">
          {labels.wordsComparisonHint}
        </p>

        <div className="mt-4 flex flex-col gap-4">
          {comparisonByRound.map((group) => (
            <div key={group.roundIndex} className="flex flex-col gap-2">
              <h3 className="text-xs font-extrabold tracking-wide text-[#8D6E63] uppercase dark:text-[#FFD54F]/85">
                {formatClient(labels.roundBadgeTemplate, locale, {
                  current: group.roundIndex + 1,
                  total: comparisonByRound.length,
                })}
              </h3>
              <div className="flex flex-col gap-2">
                {group.items.map((item) => {
                  const missedByMeFoundByRival = !item.foundByMe && item.foundByRival;
                  const foundByBoth = item.foundByMe && item.foundByRival;
                  const foundOnlyMe = item.foundByMe && !item.foundByRival;

                  const badgeText = missedByMeFoundByRival
                    ? labels.missedByYou
                    : foundByBoth
                      ? labels.foundByBoth
                      : foundOnlyMe
                        ? labels.foundOnlyYou
                        : labels.missedByBoth;

                  const meaning = localizedDuelMeaning(item.snapshot, glossLang, locale);

                  return (
                    <button
                      key={`${group.roundIndex}-${item.snapshot.word}`}
                      type="button"
                      onClick={() => openWord(item.snapshot)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-start transition-transform active:scale-[0.99]',
                        missedByMeFoundByRival
                          ? 'border-[#FF9800] bg-[#FFF3E0] shadow-xs dark:border-[#FFB300]/75 dark:bg-[#4A3214]/75'
                          : foundOnlyMe
                            ? 'border-[#66BB6A]/65 bg-[#E8F5E9]/80 dark:border-[#66BB6A]/40 dark:bg-[#1B3B22]/60'
                            : 'border-[#5D4037]/12 bg-white/75 dark:border-white/10 dark:bg-white/5'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            lang="en"
                            dir="ltr"
                            className="text-base font-black text-[#4E342E] uppercase dark:text-[#FFF8E1]"
                          >
                            {item.snapshot.word}
                          </span>
                          {item.isBonus ? (
                            <span className="rounded-full bg-[#7C3AED]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#6D28D9] dark:bg-[#7C3AED]/30 dark:text-[#DDD6FE]">
                              +Bonus
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-extrabold',
                              missedByMeFoundByRival
                                ? 'bg-[#E65100] text-white'
                                : foundByBoth
                                  ? 'bg-[#2E7D32]/15 text-[#1B5E20] dark:bg-[#66BB6A]/20 dark:text-[#A5D6A7]'
                                  : foundOnlyMe
                                    ? 'bg-[#2E7D32] text-white'
                                    : 'bg-black/10 text-[#6D4C41] dark:bg-white/10 dark:text-white/65'
                            )}
                          >
                            {badgeText}
                          </span>
                        </div>
                        {meaning ? (
                          <p
                            lang={glossLang}
                            dir="rtl"
                            className="mt-1 truncate text-xs font-bold text-[#6D4C41] dark:text-[#FFECB3]/80"
                          >
                            {meaning}
                          </p>
                        ) : null}
                      </div>

                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#FFB300]/20 text-[#5D4037] dark:bg-white/10 dark:text-[#FFD54F]">
                        <IconVolume className="size-4" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {isGuest ? (
        <GuestUpgradeNudge locale={locale} duelCode={duel.code} labels={labels} />
      ) : null}

      {sheetTarget ? (
        <WordInfoOverlay
          target={sheetTarget}
          glossLang={glossLang}
          labels={labels}
          onClose={() => setSheetTarget(null)}
        />
      ) : null}
    </div>
  );
}

function GuestUpgradeNudge({
  locale,
  duelCode,
  labels,
}: {
  locale: Locale;
  duelCode: string;
  labels: DuelResultLabels;
}) {
  const next = encodeURIComponent(localeHref(locale, `/play/duel/${duelCode}`));
  return (
    <aside className="wb-duel-guest-nudge flex flex-col items-start justify-between gap-3 rounded-[24px] p-4 sm:flex-row sm:items-center sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-[#4C1D95] dark:text-[#EDE9FE]">
          {labels.guestUpgradeTitle}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-[#5B21B6]/80 dark:text-[#DDD6FE]/80">
          {labels.guestUpgradeBody}
        </p>
      </div>
      <Link
        href={`${localeHref(locale, '/login')}?next=${next}`}
        className="wb-duel-cta-purple inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-extrabold no-underline transition-all"
      >
        <IconLogin className="size-4" />
        <span>{labels.guestUpgradeCta}</span>
      </Link>
    </aside>
  );
}
