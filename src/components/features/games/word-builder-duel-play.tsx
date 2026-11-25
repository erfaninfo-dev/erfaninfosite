'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { AnswerSlots } from '@/components/features/games/answer-slots';
import { CircularLetterTray } from '@/components/features/games/circular-letter-tray';
import { MagicBackground } from '@/components/features/games/magic-background';
import {
  WordInfoOverlay,
  type WordInfoOverlayLabels,
} from '@/components/features/games/word-info-overlay';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import {
  IconBook,
  IconClose,
  IconFire,
  IconMusic,
  IconSparkle,
  IconVolume,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import {
  getAudioPrefsSnapshot,
  getServerAudioPrefsSnapshot,
  pauseSessionBgm,
  playWordBuilderSfx,
  setBgmEnabled,
  setSfxEnabled,
  startSessionBgm,
  stopSessionBgm,
  subscribeAudioPrefs,
  unlockSessionBgmOnGesture,
} from '@/lib/game/word-builder/audio';
import { MEANING_FEEDBACK_PREFIX } from '@/lib/game/word-builder/constants';
import {
  computeDuelScore,
  DUEL_BONUS_WORD_POINTS,
  DUEL_MAX_BONUS_PER_ROUND,
  DUEL_MAX_HINTS,
  DUEL_ROUND_CLEAR_BONUS,
  getGhostStateAtTime,
  localizedDuelExampleGloss,
  localizedDuelMeaning,
} from '@/lib/game/word-builder/duel-scoring';
import type {
  DuelGhostEvent,
  DuelPlayEvent,
  DuelPlayer,
  DuelRound,
  DuelWordSnapshot,
} from '@/lib/game/word-builder/duel-types';
import { mulberry32 } from '@/lib/game/word-builder/levels';
import {
  anyUnsolvedTargetHasLength,
  buildLetterInstances,
  findUnsolvedTargetMatchingBuilt,
  firstUnsolvedTarget,
  isLevelComplete,
  maxUnsolvedTargetLength,
  normalizeWord,
  pathCanExtendToLongerUnsolvedTarget,
  pickHiddenIndexForReveal,
  shuffleInstances,
  unsolvedTargets,
} from '@/lib/game/word-builder/logic';
import type {
  LetterInstance,
  WordBuilderLevel,
  WordBuilderTargetWord,
} from '@/lib/game/word-builder/types';
import { formatClient } from '@/lib/i18n/client-format';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';

const WRONG_PATH_CLEAR_MS = 660;
const ROUND_TRANSITION_MS = 950;
const TIMER_RING_RADIUS = 27;
const TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * TIMER_RING_RADIUS;

export type DuelPlayLabels = WordInfoOverlayLabels & {
  roundBadgeTemplate: string;
  roundClearedBannerTemplate: string;
  bonusWordToastTemplate: string;
  streakTemplate: string;
  hintsLeftTemplate: string;
  noHintsLeft: string;
  hintPenaltyTag: string;
  alreadyFound: string;
  hintLetter: string;
  shuffle: string;
  hintReveal: string;
  hintMeaning: string;
  translation: string;
  soundTitle: string;
  bgmSwitch: string;
  bgmSubtitle: string;
  sfxSwitch: string;
  sfxSubtitle: string;
  youLabel: string;
  ghostLabel: string;
  waitingLabel: string;
  submitting: string;
};

type RoundState = {
  circleLetters: LetterInstance[];
  path: LetterInstance[];
  solvedTargets: Set<string>;
  solvedBonus: Set<string>;
  revealedPositions: Map<string, Set<number>>;
  hintTargetCycleIndex: number;
  pathWrong: boolean;
  feedback: string | null;
};

function createRoundState(level: WordBuilderLevel, seed: number): RoundState {
  return {
    circleLetters: shuffleInstances(buildLetterInstances(level.letters), mulberry32(seed)),
    path: [],
    solvedTargets: new Set(),
    solvedBonus: new Set(),
    revealedPositions: new Map(),
    hintTargetCycleIndex: 0,
    pathWrong: false,
    feedback: null,
  };
}

function formatTimer(ms: number, locale: Locale): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const nf = new Intl.NumberFormat(NUMBER_LOCALE[locale], { minimumIntegerDigits: 2 });
  const minFmt = new Intl.NumberFormat(NUMBER_LOCALE[locale]);
  return `${minFmt.format(mins)}:${nf.format(secs)}`;
}

export function WordBuilderDuelPlay({
  rounds,
  bonusCatalog,
  timeLimitSec,
  initialRemainingMs,
  seed,
  you,
  opponent,
  ghostTimeline,
  locale,
  glossLang,
  labels,
  submitting,
  onComplete,
}: {
  rounds: DuelRound[];
  bonusCatalog: DuelWordSnapshot[][];
  timeLimitSec: number;
  initialRemainingMs: number;
  seed: number;
  you: DuelPlayer;
  opponent: DuelPlayer | null;
  ghostTimeline: DuelGhostEvent[];
  locale: Locale;
  glossLang: 'fa' | 'ckb';
  labels: DuelPlayLabels;
  submitting: boolean;
  onComplete: (result: {
    events: DuelPlayEvent[];
    hintsUsed: number;
    elapsedMs: number;
  }) => void;
}) {
  const numFmt = useMemo(() => new Intl.NumberFormat(NUMBER_LOCALE[locale]), [locale]);
  const timeLimitMs = timeLimitSec * 1000;
  const initialElapsedMs = Math.max(0, timeLimitMs - initialRemainingMs);

  const levels: WordBuilderLevel[] = useMemo(
    () =>
      rounds.map((r) => ({
        levelId: r.levelId,
        difficulty: r.difficulty,
        category: r.category,
        letters: r.letters,
        targetWords: r.targetWords.map((t) => ({
          word: t.word,
          meaning: localizedDuelMeaning(t, glossLang, locale),
          exampleEn: t.exampleEn,
          exampleGloss: localizedDuelExampleGloss(t, glossLang),
        })),
      })),
    [rounds, glossLang, locale]
  );

  const bonusMaps = useMemo(
    () =>
      bonusCatalog.map((bucket) => {
        const m = new Map<string, WordBuilderTargetWord>();
        for (const w of bucket) {
          const norm = normalizeWord(w.word);
          m.set(norm, {
            word: norm,
            meaning: localizedDuelMeaning(w, glossLang, locale),
            exampleEn: w.exampleEn,
            exampleGloss: localizedDuelExampleGloss(w, glossLang),
          });
        }
        return m;
      }),
    [bonusCatalog, glossLang, locale]
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() =>
    levels[0]
      ? createRoundState(levels[0], seed + 101)
      : createRoundState(
          { levelId: 1, difficulty: 'beginner', category: '', letters: [], targetWords: [] },
          seed
        )
  );
  const [events, setEvents] = useState<DuelPlayEvent[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(initialElapsedMs);
  const [roundBanner, setRoundBanner] = useState<string | null>(null);
  const [scorePop, setScorePop] = useState<{ id: number; points: number } | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const [sheetTarget, setSheetTarget] = useState<WordBuilderTargetWord | null>(null);
  const [audioSheetOpen, setAudioSheetOpen] = useState(false);

  const audioPrefs = useSyncExternalStore(
    subscribeAudioPrefs,
    getAudioPrefsSnapshot,
    getServerAudioPrefsSnapshot
  );

  const startEpochRef = useRef<number>(0);
  const pathRef = useRef<LetterInstance[]>([]);
  const stateRef = useRef(roundState);
  const roundIndexRef = useRef(roundIndex);
  const eventsRef = useRef(events);
  const hintsUsedRef = useRef(hintsUsed);
  const completedRef = useRef(false);
  const transitioningRef = useRef(false);
  const wrongClearTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  const scorePopTimer = useRef<number | null>(null);
  const roundTimer = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = roundState;
  }, [roundState]);

  useEffect(() => {
    roundIndexRef.current = roundIndex;
  }, [roundIndex]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    hintsUsedRef.current = hintsUsed;
  }, [hintsUsed]);

  // Full-screen session mode: hide site top header & bottom nav while playing.
  useEffect(() => {
    document.documentElement.dataset.wordBuilderSession = '1';
    return () => {
      delete document.documentElement.dataset.wordBuilderSession;
    };
  }, []);

  // BGM lifecycle.
  useEffect(() => {
    startSessionBgm();
    const onVis = () => {
      if (document.hidden) pauseSessionBgm();
      else startSessionBgm();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stopSessionBgm();
      if (wrongClearTimer.current !== null) window.clearTimeout(wrongClearTimer.current);
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      if (scorePopTimer.current !== null) window.clearTimeout(scorePopTimer.current);
      if (roundTimer.current !== null) window.clearTimeout(roundTimer.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastText(msg);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToastText(null);
      toastTimer.current = null;
    }, 1800);
  }, []);

  const triggerScorePop = useCallback((points: number) => {
    setScorePop({ id: Date.now(), points });
    if (scorePopTimer.current !== null) window.clearTimeout(scorePopTimer.current);
    scorePopTimer.current = window.setTimeout(() => {
      setScorePop(null);
      scorePopTimer.current = null;
    }, 1250);
  }, []);

  const currentElapsedMs = useCallback(() => {
    if (startEpochRef.current === 0) return initialElapsedMs;
    return Math.min(timeLimitMs, Math.max(0, Date.now() - startEpochRef.current));
  }, [initialElapsedMs, timeLimitMs]);

  const finishMatch = useCallback(
    (finalEvents?: DuelPlayEvent[], finalElapsed?: number) => {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete({
        events: finalEvents ?? eventsRef.current,
        hintsUsed: hintsUsedRef.current,
        elapsedMs: finalElapsed ?? currentElapsedMs(),
      });
    },
    [currentElapsedMs, onComplete]
  );

  // Live 120ms ticker for smooth timer ring + Ghost Replay.
  useEffect(() => {
    startEpochRef.current = Date.now() - initialElapsedMs;
    const id = window.setInterval(() => {
      if (completedRef.current) return;
      const nowElapsed = Math.min(timeLimitMs, Math.max(0, Date.now() - startEpochRef.current));
      setElapsedMs(nowElapsed);
      if (nowElapsed >= timeLimitMs) {
        window.clearInterval(id);
        finishMatch(eventsRef.current, timeLimitMs);
      }
    }, 120);
    return () => window.clearInterval(id);
  }, [finishMatch, initialElapsedMs, timeLimitMs]);

  const liveScore = useMemo(
    () =>
      computeDuelScore({
        rounds,
        bonusCatalog,
        events,
        hintsUsed,
        elapsedMs,
        timeLimitSec,
      }),
    [rounds, bonusCatalog, events, hintsUsed, elapsedMs, timeLimitSec]
  );

  const ghostSnapshot = useMemo(
    () => getGhostStateAtTime(ghostTimeline, elapsedMs, rounds.length),
    [ghostTimeline, elapsedMs, rounds.length]
  );

  const currentStreak = useMemo(() => {
    let s = 0;
    for (let i = events.length - 1; i >= 0; i -= 1) {
      if (events[i]!.kind === 'wrong') break;
      s += 1;
    }
    return s;
  }, [events]);

  const syncPath = useCallback((path: LetterInstance[], extra?: Partial<RoundState>) => {
    pathRef.current = path;
    setRoundState((s) => ({ ...s, path, ...extra }));
  }, []);

  const commitWrong = useCallback(() => {
    playWordBuilderSfx('wrong');
    const tMs = currentElapsedMs();
    const wrongEv: DuelPlayEvent = {
      kind: 'wrong',
      roundIndex: roundIndexRef.current,
      tMs,
    };
    const nextEvents = [...eventsRef.current, wrongEv];
    eventsRef.current = nextEvents;
    setEvents(nextEvents);

    const path = pathRef.current;
    setRoundState((s) => ({ ...s, path, pathWrong: true, feedback: null }));
    if (wrongClearTimer.current !== null) window.clearTimeout(wrongClearTimer.current);
    wrongClearTimer.current = window.setTimeout(() => {
      pathRef.current = [];
      setRoundState((s) => ({ ...s, path: [], pathWrong: false, feedback: null }));
    }, WRONG_PATH_CLEAR_MS);
  }, [currentElapsedMs]);

  const evaluatePath = useCallback(() => {
    if (completedRef.current || transitioningRef.current) return;
    const current = stateRef.current;
    const idx = roundIndexRef.current;
    const level = levels[idx];
    if (!level || current.pathWrong) return;

    const path = pathRef.current;
    if (path.length <= 1) {
      pathRef.current = [];
      setRoundState({ ...current, path: [], feedback: null, pathWrong: false });
      return;
    }

    const builtLower = normalizeWord(path.map((e) => e.char).join(''));
    const tMs = currentElapsedMs();

    // 1. Target word match
    const matched = findUnsolvedTargetMatchingBuilt(level, current.solvedTargets, builtLower);
    if (matched) {
      const norm = normalizeWord(matched.word);
      const nextSolved = new Set(current.solvedTargets);
      nextSolved.add(norm);

      const ev: DuelPlayEvent = {
        kind: 'target',
        roundIndex: idx,
        word: norm,
        tMs,
      };
      const nextEvents = [...eventsRef.current, ev];
      eventsRef.current = nextEvents;
      setEvents(nextEvents);

      const done = isLevelComplete(level, nextSolved);
      triggerScorePop(norm.length * 10 + (done ? DUEL_ROUND_CLEAR_BONUS : 0));
      pathRef.current = [];

      if (done) {
        playWordBuilderSfx('levelComplete');
        setRoundState({
          ...current,
          path: [],
          pathWrong: false,
          solvedTargets: nextSolved,
          circleLetters: [],
          feedback: null,
        });

        const isLastRound = idx >= levels.length - 1;
        if (isLastRound) {
          finishMatch(nextEvents, tMs);
        } else {
          transitioningRef.current = true;
          setRoundBanner(
            formatClient(labels.roundClearedBannerTemplate, locale, {
              round: idx + 1,
              bonus: DUEL_ROUND_CLEAR_BONUS,
            })
          );
          roundTimer.current = window.setTimeout(() => {
            const nextIdx = idx + 1;
            roundIndexRef.current = nextIdx;
            setRoundIndex(nextIdx);
            const nextState = createRoundState(levels[nextIdx]!, seed + (nextIdx + 1) * 101);
            stateRef.current = nextState;
            setRoundState(nextState);
            setRoundBanner(null);
            transitioningRef.current = false;
          }, ROUND_TRANSITION_MS);
        }
      } else {
        playWordBuilderSfx('correct');
        setRoundState({
          ...current,
          path: [],
          pathWrong: false,
          solvedTargets: nextSolved,
          circleLetters: shuffleInstances(buildLetterInstances(level.letters), () => Math.random()),
          feedback: null,
        });
      }
      return;
    }

    // 2. Duplicate target or bonus word
    if (current.solvedTargets.has(builtLower) || current.solvedBonus.has(builtLower)) {
      pathRef.current = [];
      setRoundState({ ...current, path: [], pathWrong: false, feedback: null });
      showToast(labels.alreadyFound);
      return;
    }

    // 3. Valid bonus catalog word (+10 pts, up to 5/round)
    const roundBonusMap = bonusMaps[idx];
    if (roundBonusMap?.has(builtLower)) {
      const nextBonus = new Set(current.solvedBonus);
      nextBonus.add(builtLower);
      pathRef.current = [];

      if (current.solvedBonus.size < DUEL_MAX_BONUS_PER_ROUND) {
        playWordBuilderSfx('correct');
        const ev: DuelPlayEvent = {
          kind: 'bonus',
          roundIndex: idx,
          word: builtLower,
          tMs,
        };
        const nextEvents = [...eventsRef.current, ev];
        eventsRef.current = nextEvents;
        setEvents(nextEvents);
        triggerScorePop(DUEL_BONUS_WORD_POINTS);
        showToast(
          formatClient(labels.bonusWordToastTemplate, locale, {
            points: DUEL_BONUS_WORD_POINTS,
          })
        );
      } else {
        showToast(labels.alreadyFound);
      }

      setRoundState({
        ...current,
        path: [],
        pathWrong: false,
        solvedBonus: nextBonus,
        feedback: null,
      });
      return;
    }

    // 4. Prefix check vs wrong attempt
    const plen = path.length;
    const maxLen = maxUnsolvedTargetLength(level, current.solvedTargets);
    if (plen > maxLen) {
      commitWrong();
      return;
    }
    if (pathCanExtendToLongerUnsolvedTarget(level, current.solvedTargets, builtLower)) {
      pathRef.current = [];
      setRoundState({ ...current, path: [], pathWrong: false, feedback: null });
      return;
    }
    if (anyUnsolvedTargetHasLength(level, current.solvedTargets, plen)) {
      commitWrong();
      return;
    }

    pathRef.current = [];
    setRoundState({ ...current, path: [], pathWrong: false, feedback: null });
  }, [
    bonusMaps,
    commitWrong,
    currentElapsedMs,
    finishMatch,
    labels.alreadyFound,
    labels.bonusWordToastTemplate,
    labels.roundClearedBannerTemplate,
    levels,
    locale,
    seed,
    showToast,
    triggerScorePop,
  ]);

  const appendLetter = useCallback(
    (letter: LetterInstance) => {
      if (completedRef.current || transitioningRef.current) return;
      unlockSessionBgmOnGesture();
      if (stateRef.current.pathWrong) return;
      if (pathRef.current.some((p) => p.id === letter.id)) return;
      playWordBuilderSfx('letterPop');
      syncPath([...pathRef.current, letter], { feedback: null });
    },
    [syncPath]
  );

  const popLastLetter = useCallback(() => {
    if (completedRef.current || transitioningRef.current) return;
    if (stateRef.current.pathWrong || pathRef.current.length === 0) return;
    playWordBuilderSfx('letterPop');
    syncPath(pathRef.current.slice(0, -1), { feedback: null });
  }, [syncPath]);

  const clearPath = useCallback(() => {
    if (pathRef.current.length === 0) return;
    pathRef.current = [];
    setRoundState((s) => ({ ...s, path: [], pathWrong: false, feedback: null }));
  }, []);

  const shuffleCircle = useCallback(() => {
    if (completedRef.current || transitioningRef.current) return;
    unlockSessionBgmOnGesture();
    playWordBuilderSfx('letterPop');
    pathRef.current = [];
    setRoundState((s) => ({
      ...s,
      circleLetters: shuffleInstances([...s.circleLetters], () => Math.random()),
      path: [],
      pathWrong: false,
      feedback: null,
    }));
  }, []);

  const hintLetter = useCallback(() => {
    if (completedRef.current || transitioningRef.current) return;
    unlockSessionBgmOnGesture();
    const current = stateRef.current;
    const level = levels[roundIndexRef.current];
    if (!level || current.pathWrong || isLevelComplete(level, current.solvedTargets)) return;

    if (hintsUsedRef.current >= DUEL_MAX_HINTS) {
      showToast(labels.noHintsLeft);
      return;
    }

    const targets = level.targetWords;
    const n = targets.length;
    const start = current.hintTargetCycleIndex % n;
    const revealed = new Map(current.revealedPositions);

    let chosenSlot: number | null = null;
    let chosenLw: string | null = null;
    let chosenIdx: number | null = null;
    let baseSet: Set<number> | null = null;

    for (let i = 0; i < n; i += 1) {
      const slot = (start + i) % n;
      const target = targets[slot]!;
      const lw = normalizeWord(target.word);
      if (current.solvedTargets.has(lw)) continue;
      const setFor = new Set(revealed.get(lw) ?? []);
      const idx = pickHiddenIndexForReveal(lw, setFor, () => Math.random());
      if (idx === null) continue;
      chosenSlot = slot;
      chosenLw = lw;
      chosenIdx = idx;
      baseSet = setFor;
      break;
    }

    if (chosenSlot === null || chosenLw === null || chosenIdx === null || baseSet === null) {
      return;
    }

    playWordBuilderSfx('letterPop');
    const nextHints = hintsUsedRef.current + 1;
    hintsUsedRef.current = nextHints;
    setHintsUsed(nextHints);

    baseSet.add(chosenIdx);
    revealed.set(chosenLw, baseSet);
    setRoundState({
      ...current,
      revealedPositions: revealed,
      hintTargetCycleIndex: (chosenSlot + 1) % n,
      feedback: null,
    });
    showToast(labels.hintLetter);
  }, [labels.hintLetter, labels.noHintsLeft, levels, showToast]);

  const hintMeaning = useCallback(() => {
    if (completedRef.current || transitioningRef.current) return;
    unlockSessionBgmOnGesture();
    const current = stateRef.current;
    const level = levels[roundIndexRef.current];
    if (!level || current.pathWrong || isLevelComplete(level, current.solvedTargets)) return;

    if (hintsUsedRef.current >= DUEL_MAX_HINTS) {
      showToast(labels.noHintsLeft);
      return;
    }

    const target = firstUnsolvedTarget(level, current.solvedTargets);
    if (!target || !target.meaning) return;

    playWordBuilderSfx('letterPop');
    const nextHints = hintsUsedRef.current + 1;
    hintsUsedRef.current = nextHints;
    setHintsUsed(nextHints);

    setRoundState({
      ...current,
      feedback: `${MEANING_FEEDBACK_PREFIX}${target.meaning}`,
    });
  }, [labels.noHintsLeft, levels, showToast]);

  // Desktop keyboard support (A-Z, Backspace, Enter, Space).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (sheetTarget || audioSheetOpen) {
        if (e.key === 'Escape') {
          setSheetTarget(null);
          setAudioSheetOpen(false);
        }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (completedRef.current || transitioningRef.current || stateRef.current.pathWrong) return;

      if (/^[a-zA-Z]$/.test(e.key)) {
        const lower = e.key.toLowerCase();
        const usedIds = new Set(pathRef.current.map((p) => p.id));
        const match = stateRef.current.circleLetters.find(
          (l) => l.char.toLowerCase() === lower && !usedIds.has(l.id)
        );
        if (match) {
          e.preventDefault();
          appendLetter(match);
        }
      } else if (e.key === 'Backspace') {
        if (pathRef.current.length > 0) {
          e.preventDefault();
          popLastLetter();
        }
      } else if (e.key === 'Enter') {
        if (pathRef.current.length > 0) {
          e.preventDefault();
          evaluatePath();
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        shuffleCircle();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appendLetter, audioSheetOpen, evaluatePath, popLastLetter, sheetTarget, shuffleCircle]);

  const currentLevel = levels[roundIndex] ?? levels[0]!;
  const built = roundState.path.map((p) => p.char).join('');
  const meaningFromFeedback = roundState.feedback?.startsWith(MEANING_FEEDBACK_PREFIX)
    ? roundState.feedback.slice(MEANING_FEEDBACK_PREFIX.length)
    : null;

  const remainingMs = Math.max(0, timeLimitMs - elapsedMs);
  const progressRatio = timeLimitMs > 0 ? Math.max(0, Math.min(1, remainingMs / timeLimitMs)) : 0;
  const ringOffset = TIMER_RING_CIRCUMFERENCE * (1 - progressRatio);
  const isUrgent = remainingMs <= 10_000;
  const hintsLeft = Math.max(0, DUEL_MAX_HINTS - hintsUsed);
  const hasGhost = ghostTimeline.length > 0;
  const unsolvedLeft = unsolvedTargets(currentLevel, roundState.solvedTargets).length;

  // Tug-of-war score bar percentage (clamped 16%..84% so both sides remain visible).
  const myPts = liveScore.score;
  const ghostPts = hasGhost ? ghostSnapshot.score : 0;
  const totalPts = myPts + ghostPts;
  const myBarPct =
    totalPts === 0
      ? 50
      : hasGhost
        ? Math.max(16, Math.min(84, Math.round((myPts / totalPts) * 100)))
        : Math.min(84, 50 + Math.round(Math.min(34, myPts / 6)));

  const hintsDisabled = submitting || hintsLeft <= 0 || roundState.pathWrong || unsolvedLeft === 0;

  return (
    <MagicBackground className="flex min-h-[100dvh] w-full flex-col">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[29rem] flex-col justify-between px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-5">
        {/* ── Top 1v1 VS Capsule HUD + Radial Timer + Tug-of-War Bar ── */}
        <header className="flex flex-col gap-2">
          <div className="relative pt-1">
            {/* Glossy Cream Capsule Card */}
            <div className="grid grid-cols-[1fr_5rem_1fr] items-center rounded-[30px] border-2 border-white/90 bg-[linear-gradient(180deg,#FFFDF7,#FFEFC4)] px-2.5 py-2 shadow-[0_8px_22px_rgba(196,116,0,0.22),inset_0_2px_4px_rgba(255,255,255,0.95)] dark:border-[#FFB300]/40 dark:bg-[linear-gradient(180deg,#2F2644,#211A32)]">
              {/* Left: You */}
              <div className="flex min-w-0 items-center gap-2">
                <div className="rounded-full ring-[3px] ring-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.45)]">
                  <ProfileAvatar avatarId={you.avatar} userId={you.userId} size={40} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-xs font-extrabold text-[#1E3A8A] dark:text-[#93C5FD]">
                      {labels.youLabel}
                    </span>
                    {currentStreak >= 2 ? (
                      <span className="inline-flex items-center gap-0.5 text-[11px] leading-none font-black text-[#EA580C] dark:text-[#FBBF24]">
                        <IconFire className="size-3" />
                        {numFmt.format(currentStreak)}
                      </span>
                    ) : null}
                  </div>
                  <p
                    dir="ltr"
                    className="text-xl leading-none font-black text-[#1E3A8A] tabular-nums dark:text-[#FFF8E1]"
                  >
                    {numFmt.format(myPts)}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {levels.map((lvl, rIdx) => {
                      const cleared =
                        rIdx < roundIndex ||
                        (rIdx === roundIndex && isLevelComplete(lvl, roundState.solvedTargets));
                      const active = rIdx === roundIndex && !cleared;
                      return (
                        <span
                          key={lvl.levelId}
                          className={cn(
                            'size-2.5 rounded-full transition-all',
                            cleared
                              ? 'bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.65)]'
                              : active
                                ? 'bg-[#F59E0B] shadow-[0_0_6px_rgba(245,158,11,0.65)]'
                                : 'bg-[#D6C3A5] dark:bg-white/20'
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Center Spacer (Radial Timer sits absolutely centered above) */}
              <div aria-hidden="true" className="h-12" />

              {/* Right: Opponent / Live Ghost */}
              <div className="flex min-w-0 flex-row-reverse items-center gap-2 text-end">
                <div
                  className={cn(
                    'rounded-full ring-[3px] ring-[#A855F7] shadow-[0_0_12px_rgba(168,85,247,0.45)] transition-transform',
                    ghostSnapshot.justScored && 'scale-105 ring-[#D946EF]'
                  )}
                >
                  {opponent ? (
                    <ProfileAvatar avatarId={opponent.avatar} userId={opponent.userId} size={40} />
                  ) : (
                    <span className="grid size-10 place-items-center rounded-full bg-[linear-gradient(135deg,#A855F7,#7C3AED)] text-base font-black text-white">
                      ?
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-[#581C87] dark:text-[#DDD6FE]">
                    {opponent ? opponent.displayName : labels.waitingLabel}
                  </p>
                  <p
                    dir="ltr"
                    className={cn(
                      'text-xl leading-none font-black tabular-nums transition-transform',
                      hasGhost
                        ? ghostSnapshot.justScored
                          ? 'scale-105 text-[#9333EA] dark:text-[#E879F9]'
                          : 'text-[#4C1D95] dark:text-[#EDE9FE]'
                        : 'text-[#7C3AED]/45 dark:text-white/35'
                    )}
                  >
                    {hasGhost ? numFmt.format(ghostPts) : '—'}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-1.5">
                    {levels.map((lvl, rIdx) => {
                      const solvedInR = ghostSnapshot.roundSolvedCounts[rIdx] ?? 0;
                      const cleared = hasGhost && solvedInR >= lvl.targetWords.length;
                      const partial = hasGhost && !cleared && solvedInR > 0;
                      return (
                        <span
                          key={lvl.levelId}
                          className={cn(
                            'size-2.5 rounded-full transition-all',
                            cleared
                              ? 'bg-[#9333EA] shadow-[0_0_6px_rgba(147,51,234,0.65)]'
                              : partial
                                ? 'bg-[#C084FC]'
                                : 'bg-[#D6C3A5] dark:bg-white/20'
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Protruding Center Radial Timer Medal + Round Pill */}
            <div className="pointer-events-none absolute -top-1 left-1/2 flex -translate-x-1/2 flex-col items-center">
              <div className="relative grid size-[62px] place-items-center rounded-full bg-[linear-gradient(180deg,#FFE082,#FF9800)] p-1 shadow-[0_6px_16px_rgba(180,90,0,0.38)]">
                <svg
                  viewBox="0 0 64 64"
                  className="pointer-events-none absolute inset-0 size-full -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="32"
                    cy="32"
                    r={TIMER_RING_RADIUS}
                    fill="none"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="4.5"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r={TIMER_RING_RADIUS}
                    fill="none"
                    stroke={isUrgent ? '#FF5252' : '#FFFDE7'}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeDasharray={TIMER_RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div
                  dir="ltr"
                  className={cn(
                    'grid size-[46px] place-items-center rounded-full text-sm font-black text-white tabular-nums shadow-inner',
                    isUrgent ? 'animate-pulse bg-[#C62828]' : 'bg-[#4E2A14]'
                  )}
                >
                  {formatTimer(remainingMs, locale)}
                </div>
              </div>
              <span className="relative z-10 -mt-1.5 rounded-full border border-[#FFB300]/80 bg-[#FFFDF5] px-2.5 py-0.5 text-[10px] leading-tight font-extrabold whitespace-nowrap text-[#5D4037] shadow-xs dark:border-[#FFB300]/50 dark:bg-[#241E33] dark:text-[#FFD54F]">
                {formatClient(labels.roundBadgeTemplate, locale, {
                  current: roundIndex + 1,
                  total: levels.length,
                })}
              </span>
            </div>
          </div>

          {/* Tug-of-War VS Score Bar + Sound Settings Button */}
          <div className="mt-1 flex items-center gap-2 px-1">
            <div className="relative flex flex-1 items-center">
              <div className="flex h-3 w-full overflow-hidden rounded-full border border-white/80 bg-[#EAD9BE] shadow-[inset_0_2px_4px_rgba(0,0,0,0.18)] dark:border-white/20 dark:bg-black/35">
                <div
                  className="h-full bg-[linear-gradient(90deg,#2563EB,#38BDF8,#FBBF24)] transition-all duration-300"
                  style={{ width: `${myBarPct}%` }}
                />
                <div
                  className="h-full flex-1 bg-[linear-gradient(90deg,#E879F9,#9333EA,#6D28D9)] transition-all duration-300"
                />
              </div>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-[#FFF9C4] bg-[linear-gradient(180deg,#FFE082,#F57C00)] text-[10px] font-black text-[#4E2A14] shadow-[0_2px_10px_rgba(245,124,0,0.6)]"
              >
                VS
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAudioSheetOpen(true)}
              aria-label={labels.soundTitle}
              title={labels.soundTitle}
              className="grid size-8 shrink-0 place-items-center rounded-full border border-white/85 bg-[linear-gradient(180deg,#FFFDF5,#FFE8B3)] text-[#5D4037] shadow-[0_3px_0_rgba(180,105,0,0.28),0_4px_10px_rgba(0,0,0,0.1)] transition-transform active:scale-95 dark:border-white/20 dark:bg-[#2F2644] dark:text-[#FFD54F]"
            >
              <IconVolume className="size-4" />
            </button>
          </div>
        </header>

        {/* ── Frosted Soft-Bevel Answer Board + Floating +Score + Golden Built Pill ── */}
        <div className="relative my-2 flex flex-1 flex-col items-center justify-center">
          <div className="relative w-full rounded-[28px] border-2 border-white/65 bg-white/30 px-3.5 pt-5 pb-7 shadow-[0_12px_28px_rgba(180,95,0,0.14),inset_0_2px_6px_rgba(255,255,255,0.6)] backdrop-blur-md dark:border-white/15 dark:bg-black/25">
            {/* Floating +40 / +10 Score Pop Badge */}
            {scorePop ? (
              <div
                key={scorePop.id}
                dir="ltr"
                className="pointer-events-none absolute -end-1 -top-3 z-20 animate-[wb-pop-in_0.22s_ease-out] rounded-full border-2 border-[#DCFCE7] bg-[linear-gradient(180deg,#4ADE80,#16A34A)] px-3 py-1 text-sm font-black text-white shadow-[0_4px_14px_rgba(22,163,74,0.55)]"
              >
                +{numFmt.format(scorePop.points)}
              </div>
            ) : null}

            {/* Live Ghost pill indicator (subtle, top-start of board when racing ghost) */}
            {hasGhost ? (
              <div className="mb-2.5 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7C3AED]/15 px-2.5 py-0.5 text-[10px] font-extrabold text-[#5B21B6] dark:bg-[#7C3AED]/35 dark:text-[#EDE9FE]">
                  <span className="size-1.5 animate-ping rounded-full bg-[#7C3AED] dark:bg-[#D8B4FE]" />
                  {labels.ghostLabel}
                </span>
              </div>
            ) : null}

            {roundBanner ? (
              <div className="mx-auto my-6 max-w-xs animate-[wb-pop-in_0.2s_ease-out] rounded-2xl border-2 border-[#66BB6A] bg-[linear-gradient(135deg,#E8F5E9,#C8E6C9)] px-5 py-3 text-center text-base font-black text-[#1B5E20] shadow-lg dark:border-[#66BB6A]/60 dark:bg-[linear-gradient(135deg,#1B5E20,#2E7D32)] dark:text-white">
                {roundBanner}
              </div>
            ) : submitting ? (
              <div className="mx-auto my-6 max-w-xs rounded-2xl border border-[#FFB300]/60 bg-white/85 px-6 py-4 text-center text-sm font-extrabold text-[#5D4037] shadow-lg dark:bg-[#2D2640] dark:text-[#FFF8E1]">
                {labels.submitting}
              </div>
            ) : (
              <AnswerSlots
                level={currentLevel}
                solvedLower={roundState.solvedTargets}
                revealedPositions={roundState.revealedPositions}
                onSolvedWordTap={(target) => setSheetTarget(target)}
                variant="duel"
              />
            )}

            {/* Overlapping Golden Built-Word Pill OR Meaning Hint Pill */}
            <div className="pointer-events-none absolute inset-x-0 -bottom-5 flex justify-center px-3">
              {built ? (
                <div
                  dir="ltr"
                  lang="en"
                  className={cn(
                    'min-w-[7.5rem] rounded-full border-2 px-6 py-1.5 text-center text-xl font-black tracking-[0.16em] uppercase transition-colors',
                    roundState.pathWrong
                      ? 'border-[#FFCDD2] bg-[linear-gradient(180deg,#EF5350,#C62828)] text-white shadow-[0_4px_0_#8E0000,0_8px_16px_rgba(198,40,40,0.4)]'
                      : 'border-[#FFF9C4] bg-[linear-gradient(180deg,#FFEE58,#FFB300)] text-[#4E2A14] shadow-[0_4px_0_#C67C00,0_8px_18px_rgba(255,160,0,0.45)]'
                  )}
                >
                  {built}
                </div>
              ) : meaningFromFeedback ? (
                <div
                  lang={glossLang}
                  dir="rtl"
                  className="pointer-events-auto max-w-xs rounded-full border-2 border-[#FFF9C4] bg-white/95 px-4 py-1.5 text-center text-xs font-extrabold text-[#4E2A14] shadow-[0_4px_14px_rgba(0,0,0,0.14)] dark:border-[#FFB300]/50 dark:bg-[#2D2640] dark:text-[#FFF8E1]"
                >
                  <span className="me-1 text-[#E65100] dark:text-[#FFD54F]">
                    {labels.translation}:
                  </span>
                  {meaningFromFeedback}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Flanking Symmetrical 3D Hint Pills + Circular Letter Wheel (Center Shuffle) ── */}
        <div className="relative mt-4 flex flex-col items-center">
          {/* Flanking Emerald & Sky-Blue 3D Hint Pills */}
          <div className="mb-1 flex w-full items-start justify-between gap-2 px-0.5">
            {/* Reveal Letter Pill */}
            <div className="relative pb-2.5">
              <button
                type="button"
                onClick={hintLetter}
                disabled={hintsDisabled}
                aria-label={labels.hintReveal}
                className={cn(
                  'relative inline-flex min-h-11 items-center gap-2 overflow-hidden rounded-full px-3.5 py-1.5 text-start text-xs leading-tight font-black transition-transform active:scale-95',
                  hintsDisabled
                    ? 'border-2 border-white/65 bg-white/40 text-[#5D4037]/50 shadow-none backdrop-blur-xs dark:border-white/15 dark:bg-white/10 dark:text-white/45'
                    : 'wb-duel-hint-green text-white'
                )}
              >
                {!hintsDisabled ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-3 top-0.5 h-2 rounded-full bg-white/30"
                  />
                ) : null}
                <IconSparkle className="size-4.5 shrink-0" />
                <span className="whitespace-nowrap">{labels.hintReveal}</span>
              </button>
              <div className="pointer-events-none absolute start-2 -bottom-0.5 flex items-center gap-1">
                <span
                  dir="ltr"
                  className="rounded-full border border-[#FFD54F] bg-[#4E2A14] px-2 py-0.5 text-[10px] leading-none font-black text-[#FFF8E1] tabular-nums shadow-xs"
                >
                  ⚡ {labels.hintPenaltyTag}
                </span>
                <span className="rounded-full border border-white/80 bg-[#FFFDF5] px-2 py-0.5 text-[10px] leading-none font-extrabold text-[#5D4037] shadow-xs dark:bg-[#2F2644] dark:text-[#FFD54F]">
                  {formatClient(labels.hintsLeftTemplate, locale, { count: hintsLeft })}
                </span>
              </div>
            </div>

            {/* Meaning Hint Pill */}
            <div className="relative pb-2.5">
              <button
                type="button"
                onClick={hintMeaning}
                disabled={hintsDisabled}
                aria-label={labels.hintMeaning}
                className={cn(
                  'relative inline-flex min-h-11 items-center gap-2 overflow-hidden rounded-full px-3.5 py-1.5 text-start text-xs leading-tight font-black transition-transform active:scale-95',
                  hintsDisabled
                    ? 'border-2 border-white/65 bg-white/40 text-[#5D4037]/50 shadow-none backdrop-blur-xs dark:border-white/15 dark:bg-white/10 dark:text-white/45'
                    : 'wb-duel-hint-blue text-white'
                )}
              >
                {!hintsDisabled ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-3 top-0.5 h-2 rounded-full bg-white/30"
                  />
                ) : null}
                <IconBook className="size-4.5 shrink-0" />
                <span className="whitespace-nowrap">{labels.hintMeaning}</span>
              </button>
              <div className="pointer-events-none absolute end-2 -bottom-0.5 flex items-center">
                <span
                  dir="ltr"
                  className="rounded-full border border-[#FFD54F] bg-[#4E2A14] px-2 py-0.5 text-[10px] leading-none font-black text-[#FFF8E1] tabular-nums shadow-xs"
                >
                  ⚡ {labels.hintPenaltyTag}
                </span>
              </div>
            </div>
          </div>

          <CircularLetterTray
            letters={roundState.circleLetters}
            path={roundState.path}
            pathWrong={roundState.pathWrong}
            onAppend={appendLetter}
            onPopLast={popLastLetter}
            onRelease={evaluatePath}
            onCancel={clearPath}
            onClearTap={clearPath}
            swipeTheme="gold"
            centerControl={
              <button
                type="button"
                onClick={shuffleCircle}
                disabled={submitting || unsolvedLeft === 0}
                aria-label={labels.shuffle}
                title={labels.shuffle}
                className="wb-duel-shuffle-btn group relative flex size-[68px] items-center justify-center overflow-hidden rounded-full disabled:opacity-45"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-2.5 top-1 h-3.5 rounded-full"
                  style={{
                    backgroundImage:
                      'linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0) 100%)',
                  }}
                />
                <svg
                  viewBox="0 0 28 28"
                  aria-hidden="true"
                  className="relative size-9 shrink-0 transition-transform duration-150 group-active:scale-95"
                  style={{
                    filter: 'drop-shadow(0 1.5px 2px rgba(130, 48, 0, 0.35))',
                  }}
                >
                  {/* 3D Embossed Extruded Base */}
                  <g transform="translate(0 1.85)" opacity="0.62" className="text-[#9E4000]">
                    <path
                      d="M4.5 19.5C11 19.5 13 8.5 19.5 8.5H20.2M4.5 8.5C6.45 8.5 8 9.5 9.35 10.85M14.65 17.15C16 18.5 17.55 19.5 19.5 19.5H20.2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.25"
                      strokeLinecap="round"
                    />
                    <path
                      d="M18.6 4.7L24.3 8.5L18.6 12.3Z"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18.6 15.7L24.3 19.5L18.6 23.3Z"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </g>
                  {/* Crisp Raised White Foreground */}
                  <g className="text-white">
                    <path
                      d="M4.5 19.5C11 19.5 13 8.5 19.5 8.5H20.2M4.5 8.5C6.45 8.5 8 9.5 9.35 10.85M14.65 17.15C16 18.5 17.55 19.5 19.5 19.5H20.2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.25"
                      strokeLinecap="round"
                    />
                    <path
                      d="M18.6 4.7L24.3 8.5L18.6 12.3Z"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18.6 15.7L24.3 19.5L18.6 23.3Z"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>
              </button>
            }
          />
        </div>
      </div>

      {/* Floating toast */}
      <p aria-live="polite" className="sr-only">
        {toastText ?? ''}
      </p>
      {toastText ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-4 bottom-6 z-40 flex justify-center"
        >
          <div className="animate-[wb-pop-in_0.2s_ease-out] rounded-2xl bg-[#4E2A14] px-4 py-2 text-sm font-bold text-[#FFFDE7] shadow-lg">
            {toastText}
          </div>
        </div>
      ) : null}

      {/* Word Info Sheet */}
      {sheetTarget ? (
        <WordInfoOverlay
          target={sheetTarget}
          glossLang={glossLang}
          labels={labels}
          onClose={() => setSheetTarget(null)}
        />
      ) : null}

      {/* Audio settings sheet */}
      {audioSheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={() => setAudioSheetOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-[24px] border-2 border-[#FFB300]/85 bg-[linear-gradient(135deg,#FFF8E1,#FFECB3)] p-5 shadow-xl sm:rounded-[24px] dark:border-[#FFB300]/55 dark:bg-[linear-gradient(135deg,#2D2640,#1E1B24)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconVolume className="text-primary size-5" />
                <h2 className="text-base font-extrabold text-[#5D4037] dark:text-[#FFF8E1]">
                  {labels.soundTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAudioSheetOpen(false)}
                aria-label={labels.close}
                className="grid size-8 place-items-center rounded-full bg-black/5 text-[#5D4037] dark:bg-white/10 dark:text-[#FFF8E1]"
              >
                <IconClose className="size-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                role="switch"
                aria-checked={audioPrefs.bgm}
                onClick={() => setBgmEnabled(!audioPrefs.bgm)}
                className="flex items-center gap-3 rounded-2xl border border-[#5D4037]/15 bg-white/70 px-3.5 py-3 text-start dark:border-white/15 dark:bg-white/10"
              >
                <IconMusic className="text-primary size-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-[#5D4037] dark:text-[#FFF8E1]">
                    {labels.bgmSwitch}
                  </span>
                  <span className="block text-xs text-[#6D4C41] dark:text-[#FFECB3]/75">
                    {labels.bgmSubtitle}
                  </span>
                </span>
                <span
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                    audioPrefs.bgm ? 'bg-primary' : 'bg-black/20 dark:bg-white/25'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block size-5 rounded-full bg-white shadow transition-transform',
                      audioPrefs.bgm
                        ? 'translate-x-5 rtl:-translate-x-5'
                        : 'translate-x-0.5 rtl:-translate-x-0.5'
                    )}
                  />
                </span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={audioPrefs.sfx}
                onClick={() => setSfxEnabled(!audioPrefs.sfx)}
                className="flex items-center gap-3 rounded-2xl border border-[#5D4037]/15 bg-white/70 px-3.5 py-3 text-start dark:border-white/15 dark:bg-white/10"
              >
                <IconVolume className="text-primary size-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-[#5D4037] dark:text-[#FFF8E1]">
                    {labels.sfxSwitch}
                  </span>
                  <span className="block text-xs text-[#6D4C41] dark:text-[#FFECB3]/75">
                    {labels.sfxSubtitle}
                  </span>
                </span>
                <span
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                    audioPrefs.sfx ? 'bg-primary' : 'bg-black/20 dark:bg-white/25'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block size-5 rounded-full bg-white shadow transition-transform',
                      audioPrefs.sfx
                        ? 'translate-x-5 rtl:-translate-x-5'
                        : 'translate-x-0.5 rtl:-translate-x-0.5'
                    )}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MagicBackground>
  );
}
