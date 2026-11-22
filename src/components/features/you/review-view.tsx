'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';

import { IconVolume } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { formatClient } from '@/lib/i18n/client-format';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';
import {
  getDueSrsCards,
  rateSrsCard,
  rateStoredSrsWord,
  readSrsCards,
  SRS_RATINGS,
  subscribeSrs,
  type SrsCard,
  type SrsRating,
} from '@/lib/srs/srs-store';
import { logWordReviewActivity } from '@/lib/stats/stats-store';
import { speakingText, subscribeSpeaking, toggleSpeak } from '@/lib/vocab/speak';

export type ReviewViewLabels = {
  title: string;
  dueCountTemplate: string;
  wordsProgressTemplate: string;
  answer: string;
  translateThisWord: string;
  tapToSeeAnswer: string;
  tapCardToReveal: string;
  howWellKnew: string;
  ratingAgain: string;
  ratingHard: string;
  ratingGood: string;
  ratingEasy: string;
  nextDaysTemplate: string;
  pronounce: string;
  speaking: string;
  noWordsDueTitle: string;
  noWordsDueBodyFlashcards: string;
  noWordsDueBodyGreatTemplate: string;
  sessionComplete: string;
  youReviewedTodayTemplate: string;
  tabHome: string;
};

const EMPTY_CARDS: Record<string, SrsCard> = {};

function cleanLabel(text: string): string {
  return text.replace(/^\?+\s*/, '').trim();
}

export function ReviewView({
  locale,
  labels,
  embedded = false,
}: {
  locale: Locale;
  labels: ReviewViewLabels;
  embedded?: boolean;
}) {
  const allCards = useSyncExternalStore(subscribeSrs, readSrsCards, () => EMPTY_CARDS);
  const [sessionCards, setSessionCards] = useState<SrsCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const activeSpoken = useSyncExternalStore(subscribeSpeaking, speakingText, () => '');

  const liveDue = getDueSrsCards(allCards);
  // Lock queue for the active review run so rating a card doesn't shift indices mid-session.
  const queue = sessionCards ?? liveDue;
  const totalStudied = Object.keys(allCards).length;
  const numFmt = new Intl.NumberFormat(NUMBER_LOCALE[locale]);

  function handleSpeak(word: string) {
    toggleSpeak(word);
  }

  function handleRate(card: SrsCard, rating: SrsRating) {
    const activeQueue = sessionCards ?? liveDue;
    if (!sessionCards) setSessionCards(activeQueue);

    rateStoredSrsWord(card.wordId, rating);
    logWordReviewActivity();

    if (index < activeQueue.length - 1) {
      setIndex((i) => i + 1);
      setShowBack(false);
    } else {
      setSessionDone(true);
    }
  }

  const ratingLabels: Record<SrsRating, string> = {
    again: `❌ ${cleanLabel(labels.ratingAgain)}`,
    hard: `😐 ${cleanLabel(labels.ratingHard)}`,
    good: `✅ ${cleanLabel(labels.ratingGood)}`,
    easy: `🔥 ${cleanLabel(labels.ratingEasy)}`,
  };

  const ratingStyles: Record<SrsRating, string> = {
    again: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200',
    hard: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200',
    good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
    easy: 'bg-primary-container text-primary',
  };

  const dueChip =
    liveDue.length > 0 ? (
      <span className="bg-primary-container text-on-primary-container rounded-full px-3 py-1 text-xs font-extrabold tabular-nums">
        {formatClient(labels.dueCountTemplate, locale, { count: liveDue.length })}
      </span>
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      {embedded ? (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-on-surface text-base font-extrabold">{labels.title}</h2>
          {dueChip}
        </div>
      ) : dueChip ? (
        <div className="flex justify-end">{dueChip}</div>
      ) : null}

      {sessionDone ? (
        <div className="jelly-card flex flex-col items-center gap-3 rounded-[var(--radius-card)] p-8 text-center">
          <span className="text-6xl" aria-hidden="true">
            ✅
          </span>
          <h2 className="text-on-surface text-xl font-extrabold">{labels.sessionComplete}</h2>
          <p className="text-on-surface-variant text-sm">
            {formatClient(labels.youReviewedTodayTemplate, locale, { count: queue.length })}
          </p>
        </div>
      ) : queue.length === 0 ? (
        <div className="jelly-card flex flex-col items-center gap-3 rounded-[var(--radius-card)] p-8 text-center">
          <span className="text-6xl" aria-hidden="true">
            🎉
          </span>
          <h2 className="text-on-surface text-xl font-extrabold">{labels.noWordsDueTitle}</h2>
          <p className="text-on-surface-variant max-w-sm text-sm leading-relaxed whitespace-pre-line">
            {totalStudied === 0
              ? labels.noWordsDueBodyFlashcards
              : formatClient(labels.noWordsDueBodyGreatTemplate, locale, { count: totalStudied })}
          </p>
          <Link
            href={localeHref(locale)}
            className="bg-primary text-on-primary mt-2 inline-flex min-h-11 items-center rounded-full px-6 text-sm font-extrabold no-underline"
          >
            {labels.tabHome}
          </Link>
        </div>
      ) : (
        (() => {
          const current = queue[Math.min(index, queue.length - 1)]!;
          const snap = current.snapshot!;
          const isSpeaking = activeSpoken === snap.word.trim();
          const currentNum = index + 1;
          const pct = Math.round((currentNum / queue.length) * 100);

          return (
            <div className="flex flex-col gap-3.5">
              {/* Progress Bar */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                  <span className="text-on-surface">
                    {formatClient(labels.wordsProgressTemplate, locale, {
                      current: currentNum,
                      total: queue.length,
                    })}
                  </span>
                  <span className="text-primary tabular-nums">{numFmt.format(pct)}%</span>
                </div>
                <div className="bg-surface-3 h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Flip Flashcard */}
              <button
                type="button"
                onClick={() => setShowBack((v) => !v)}
                aria-expanded={showBack}
                className="jelly-card flex min-h-72 w-full flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] p-6 text-center transition-transform active:scale-[0.99]"
              >
                <span className="text-on-surface-variant text-xs font-semibold tracking-wider uppercase">
                  {showBack ? labels.answer : labels.translateThisWord}
                </span>

                <span
                  lang="en"
                  dir="ltr"
                  className="text-on-surface text-3xl font-extrabold"
                >
                  {snap.word}
                </span>

                {showBack ? (
                  <div className="mt-2 flex w-full flex-col items-center gap-2.5">
                    {snap.meaningEn ? (
                      <>
                        <hr className="border-outline-variant/40 w-full border-0 border-t" />
                        <p lang="en" dir="ltr" className="text-on-surface text-base font-medium">
                          {snap.meaningEn}
                        </p>
                      </>
                    ) : null}
                    {snap.meaningLocal ? (
                      <p dir="rtl" className="text-primary text-lg font-extrabold">
                        {snap.meaningLocal}
                      </p>
                    ) : null}
                    {snap.exampleEn ? (
                      <div className="jelly-inset mt-1 w-full rounded-2xl px-3.5 py-2.5">
                        <p
                          lang="en"
                          dir="ltr"
                          className="text-on-surface-variant text-xs italic"
                        >
                          &ldquo;{snap.exampleEn}&rdquo;
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-on-surface-variant mt-3 text-xs font-medium">
                    {labels.tapToSeeAnswer}
                  </span>
                )}
              </button>

              {/* Pronounce button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => handleSpeak(snap.word)}
                  className={cn(
                    'inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-bold transition-colors',
                    isSpeaking
                      ? 'bg-primary text-on-primary'
                      : 'bg-primary-container text-on-primary-container'
                  )}
                >
                  <IconVolume className="size-4" />
                  <span>{isSpeaking ? labels.speaking : labels.pronounce}</span>
                </button>
              </div>

              {/* SM-2 Rating Row */}
              {showBack ? (
                <div className="flex flex-col gap-2">
                  <p className="text-on-surface-variant text-center text-xs font-semibold">
                    {labels.howWellKnew}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {SRS_RATINGS.map((rating) => {
                      const nextDays = rateSrsCard(current, rating).interval;
                      return (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => handleRate(current, rating)}
                          className={cn(
                            'flex flex-col items-center justify-center rounded-xl px-1.5 py-2.5 transition-transform active:scale-95',
                            ratingStyles[rating]
                          )}
                        >
                          <span className="text-xs font-extrabold">{ratingLabels[rating]}</span>
                          <span className="mt-0.5 text-[11px] opacity-80 tabular-nums">
                            {formatClient(labels.nextDaysTemplate, locale, { n: nextDays })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-on-surface-variant flex h-14 items-center justify-center text-center text-xs font-medium">
                  {labels.tapCardToReveal}
                </p>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}
