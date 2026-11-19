'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AnswerSlots } from '@/components/features/games/answer-slots';
import { CircularLetterTray } from '@/components/features/games/circular-letter-tray';
import { useWordBuilderCoins } from '@/components/features/games/use-word-builder-coins';
import { Button } from '@/components/ui/button';
import {
  IconCheck,
  IconLightbulb,
  IconLoop,
  IconRefresh,
  IconSparkle,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import {
  coinsCostHintLetter,
  coinsCostHintMeaning,
  coinsLevelCompleteBonus,
  coinsPerCorrectWord,
  MEANING_FEEDBACK_PREFIX,
} from '@/lib/game/word-builder/constants';
import { mulberry32 } from '@/lib/game/word-builder/levels';
import {
  anyUnsolvedTargetHasLength,
  buildLetterInstances,
  buildTargetCatalog,
  catalogCanExtendBuilt,
  findCatalogMatch,
  findUnsolvedTargetMatchingBuilt,
  firstUnsolvedTarget,
  isKnownDuplicateBuilt,
  isLevelComplete,
  maxUnsolvedTargetLength,
  normalizeWord,
  pathCanExtendToLongerUnsolvedTarget,
  pickHiddenIndexForReveal,
  replaceUnsolvedTargetWithCatalogWord,
  shuffleInstances,
  solvedTargetCount,
  unsolvedTargets,
} from '@/lib/game/word-builder/logic';
import type {
  LetterInstance,
  WordBuilderLevel,
  WordBuilderSourceWord,
  WordBuilderTargetWord,
} from '@/lib/game/word-builder/types';
import { formatClient } from '@/lib/i18n/client-format';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';

/** Hold ~400ms then fade ~260ms — Flutter tray wrong-path timing. */
const WRONG_PATH_CLEAR_MS = 660;

export type WordBuilderLabels = {
  /** Raw ICU: `Level {current} of {total}`. */
  levelOfTemplate: string;
  shuffle: string;
  hintReveal: string;
  hintMeaning: string;
  /** Raw ICU: `Costs {coins} coins`. */
  coinsCostTemplate: string;
  translation: string;
  correct: string;
  alreadyFound: string;
  notEnoughCoins: string;
  hintLetter: string;
  levelCompleteTitle: string;
  levelCompleteBody: string;
  nextLevel: string;
  allLevelsDone: string;
  replay: string;
  targetsHeading: string;
  meaning: string;
  example: string;
  close: string;
};

type GameState = {
  circleLetters: LetterInstance[];
  path: LetterInstance[];
  solvedLower: Set<string>;
  revealedPositions: Map<string, Set<number>>;
  hintTargetCycleIndex: number;
  pathWrong: boolean;
  feedback: string | null;
};

type GameSnapshot = {
  state: GameState;
  level: WordBuilderLevel;
  levelIndex: number;
  sessionLevels: WordBuilderLevel[];
  sessionSolved: Set<string>;
};

function formatCoins(n: number, locale: Locale): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[locale]).format(n);
}

function createLevelState(level: WordBuilderLevel, seed: number): GameState {
  return {
    circleLetters: shuffleInstances(
      buildLetterInstances(level.letters),
      mulberry32(seed)
    ),
    path: [],
    solvedLower: new Set(),
    revealedPositions: new Map(),
    hintTargetCycleIndex: 0,
    pathWrong: false,
    feedback: null,
  };
}

/**
 * Classic Word Builder — circular letter tray, answer slots, hints, coins,
 * and level progression. No tray-center scenes (water / train / prison).
 */
export function WordBuilderGame({
  levels: initialLevels,
  catalogWords,
  locale,
  glossLang,
  labels,
}: {
  levels: WordBuilderLevel[];
  /** Category lemmas for bonus/catalog matches (Flutter global catalog subset). */
  catalogWords: WordBuilderSourceWord[];
  locale: Locale;
  glossLang: 'fa' | 'ckb';
  labels: WordBuilderLabels;
}) {
  const catalog = useMemo(
    () => buildTargetCatalog(catalogWords),
    [catalogWords]
  );

  const [sessionLevels, setSessionLevels] = useState(initialLevels);
  const [levelIndex, setLevelIndex] = useState(0);
  const [sessionSolved, setSessionSolved] = useState(() => new Set<string>());
  const [state, setState] = useState<GameState | null>(() =>
    initialLevels[0]
      ? createLevelState(initialLevels[0], initialLevels[0].levelId * 9973)
      : null
  );

  const pathRef = useRef<LetterInstance[]>([]);
  const snapRef = useRef<GameSnapshot | null>(null);
  const catalogRef = useRef(catalog);
  const sessionLevelsRef = useRef(sessionLevels);
  const sessionSolvedRef = useRef(sessionSolved);
  const wrongClearTimer = useRef<number | null>(null);
  const [sheetTarget, setSheetTarget] = useState<WordBuilderTargetWord | null>(
    null
  );
  const coins = useWordBuilderCoins();

  const level = sessionLevels[levelIndex] ?? null;

  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);

  sessionLevelsRef.current = sessionLevels;
  sessionSolvedRef.current = sessionSolved;

  useEffect(() => {
    if (state && level) {
      snapRef.current = {
        state,
        level,
        levelIndex,
        sessionLevels: sessionLevelsRef.current,
        sessionSolved: sessionSolvedRef.current,
      };
    }
  }, [state, level, levelIndex, sessionLevels, sessionSolved]);

  useEffect(() => {
    return () => {
      if (wrongClearTimer.current !== null) {
        window.clearTimeout(wrongClearTimer.current);
      }
    };
  }, []);

  const syncPath = useCallback((path: LetterInstance[], extra?: Partial<GameState>) => {
    pathRef.current = path;
    setState((s) => (s ? { ...s, path, ...extra } : s));
  }, []);

  const resetLevel = useCallback(
    (index: number, levelsOverride?: WordBuilderLevel[]) => {
      const levels = levelsOverride ?? sessionLevels;
      const next = levels[index];
      if (!next) return;
      if (wrongClearTimer.current !== null) {
        window.clearTimeout(wrongClearTimer.current);
        wrongClearTimer.current = null;
      }
      pathRef.current = [];
      if (levelsOverride) setSessionLevels(levelsOverride);
      setLevelIndex(index);
      setState(createLevelState(next, next.levelId * 9973 + index));
      setSheetTarget(null);
    },
    [sessionLevels]
  );

  const replayFromStart = useCallback(() => {
    setSessionSolved(new Set());
    setSessionLevels(initialLevels);
    resetLevel(0, initialLevels);
  }, [initialLevels, resetLevel]);

  /**
   * Flutter `_commitWrongWithTray` (classic, no water): keep the path visible,
   * mark wrong, then clear after hold+fade.
   */
  const commitWrong = useCallback(() => {
    const path = pathRef.current;
    setState((s) => (s ? { ...s, path, pathWrong: true, feedback: null } : s));
    if (wrongClearTimer.current !== null) window.clearTimeout(wrongClearTimer.current);
    wrongClearTimer.current = window.setTimeout(() => {
      pathRef.current = [];
      setState((s) =>
        s ? { ...s, path: [], pathWrong: false, feedback: null } : s
      );
    }, WRONG_PATH_CLEAR_MS);
  }, []);

  const applyCorrect = useCallback(
    (
      matched: WordBuilderTargetWord,
      current: GameState,
      currentLevel: WordBuilderLevel,
      nextLevels?: WordBuilderLevel[]
    ) => {
      const norm = normalizeWord(matched.word);
      const newSolved = new Set(current.solvedLower);
      newSolved.add(norm);
      const levelForComplete = nextLevels
        ? (nextLevels[snapRef.current?.levelIndex ?? 0] ?? currentLevel)
        : currentLevel;
      const complete = isLevelComplete(levelForComplete, newSolved);
      const newCircle = complete
        ? []
        : shuffleInstances(
            buildLetterInstances(levelForComplete.letters),
            () => Math.random()
          );

      let reward = coinsPerCorrectWord();
      if (complete) reward += coinsLevelCompleteBonus();
      coins.addCoins(reward);

      const nextSessionSolved = new Set(sessionSolvedRef.current);
      nextSessionSolved.add(norm);
      sessionSolvedRef.current = nextSessionSolved;
      setSessionSolved(nextSessionSolved);
      if (nextLevels) {
        sessionLevelsRef.current = nextLevels;
        setSessionLevels(nextLevels);
      }

      pathRef.current = [];
      const nextState: GameState = {
        ...current,
        path: [],
        pathWrong: false,
        solvedLower: newSolved,
        circleLetters: newCircle,
        // Flutter localizeWordBuilderFeedback returns null for __correct.
        feedback: null,
        revealedPositions: current.revealedPositions,
      };
      // Keep snap current for any same-tick evaluate (path already cleared).
      if (snapRef.current) {
        snapRef.current = {
          ...snapRef.current,
          state: nextState,
          level: levelForComplete,
          sessionLevels: sessionLevelsRef.current,
          sessionSolved: nextSessionSolved,
        };
      }
      setState(nextState);
    },
    [coins]
  );

  /**
   * Validate the swipe on release (Flutter evaluatePathOnDragRelease). Always
   * clears the selection afterwards — immediately on match / discard, or after
   * the brief wrong-path flash via commitWrong.
   */
  const evaluatePath = useCallback(() => {
    const snap = snapRef.current;
    if (!snap || snap.state.pathWrong) return;
    const {
      state: current,
      level: currentLevel,
      sessionLevels: levels,
      sessionSolved: solvedAnywhere,
      levelIndex: idx,
    } = snap;
    const cat = catalogRef.current;

    const path = pathRef.current;
    if (path.length <= 1) {
      pathRef.current = [];
      setState({ ...current, path: [], feedback: null, pathWrong: false });
      return;
    }
    if (unsolvedTargets(currentLevel, current.solvedLower).length === 0) {
      pathRef.current = [];
      setState({ ...current, path: [], feedback: null, pathWrong: false });
      return;
    }

    const builtLower = normalizeWord(path.map((e) => e.char).join(''));
    const matched = findUnsolvedTargetMatchingBuilt(
      currentLevel,
      current.solvedLower,
      builtLower
    );
    if (matched) {
      applyCorrect(matched, current, currentLevel);
      return;
    }

    if (
      isKnownDuplicateBuilt({
        level: currentLevel,
        solvedAnywhere,
        builtLower,
        catalog: cat,
      })
    ) {
      pathRef.current = [];
      setState({
        ...current,
        path: [],
        pathWrong: false,
        feedback: '__already_found',
      });
      return;
    }

    const catalogMatch = findCatalogMatch({
      level: currentLevel,
      solvedLower: current.solvedLower,
      solvedAnywhere,
      builtLower,
      catalog: cat,
    });
    if (catalogMatch) {
      const replaced = replaceUnsolvedTargetWithCatalogWord({
        levels,
        levelIndex: idx,
        level: currentLevel,
        solvedLower: current.solvedLower,
        sessionSolved: solvedAnywhere,
        accepted: catalogMatch,
        revealedPositions: current.revealedPositions,
      });
      if (replaced) {
        applyCorrect(
          catalogMatch,
          { ...current, revealedPositions: replaced.revealedPositions },
          replaced.level,
          replaced.levels
        );
        return;
      }
    }

    const plen = path.length;
    const maxLen = maxUnsolvedTargetLength(currentLevel, current.solvedLower);
    const canExtendCatalog = catalogCanExtendBuilt({
      level: currentLevel,
      solvedLower: current.solvedLower,
      solvedAnywhere,
      builtLower,
      catalog: cat,
    });

    if (plen > maxLen && !canExtendCatalog) {
      commitWrong();
      return;
    }

    if (
      pathCanExtendToLongerUnsolvedTarget(
        currentLevel,
        current.solvedLower,
        builtLower
      ) ||
      canExtendCatalog
    ) {
      pathRef.current = [];
      setState({ ...current, path: [], feedback: null, pathWrong: false });
      return;
    }

    if (anyUnsolvedTargetHasLength(currentLevel, current.solvedLower, plen)) {
      commitWrong();
      return;
    }

    pathRef.current = [];
    setState({ ...current, path: [], feedback: null, pathWrong: false });
  }, [applyCorrect, commitWrong]);

  const appendLetter = useCallback(
    (letter: LetterInstance) => {
      const snap = snapRef.current;
      if (!snap || snap.state.pathWrong) return;
      // Same tile id cannot appear twice in one path (Flutter drag rule).
      if (pathRef.current.some((p) => p.id === letter.id)) return;
      syncPath([...pathRef.current, letter], { feedback: null });
    },
    [syncPath]
  );

  const clearPath = useCallback(() => {
    if (pathRef.current.length === 0) return;
    pathRef.current = [];
    setState((s) =>
      s ? { ...s, path: [], pathWrong: false, feedback: null } : s
    );
  }, []);

  const shuffleCircle = useCallback(() => {
    setState((s) => {
      if (!s) return s;
      pathRef.current = [];
      return {
        ...s,
        circleLetters: shuffleInstances([...s.circleLetters], () => Math.random()),
        path: [],
        pathWrong: false,
        feedback: null,
      };
    });
  }, []);

  const hintLetter = useCallback(() => {
    const snap = snapRef.current;
    if (!snap || snap.state.pathWrong) return;
    const { state: current, level: currentLevel } = snap;
    if (isLevelComplete(currentLevel, current.solvedLower)) return;

    const targets = currentLevel.targetWords;
    if (targets.length === 0) return;
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
      if (current.solvedLower.has(lw)) continue;
      const setFor = new Set(revealed.get(lw) ?? []);
      const idx = pickHiddenIndexForReveal(lw, setFor, () => Math.random());
      if (idx === null) continue;
      chosenSlot = slot;
      chosenLw = lw;
      chosenIdx = idx;
      baseSet = setFor;
      break;
    }

    if (
      chosenSlot === null ||
      chosenLw === null ||
      chosenIdx === null ||
      baseSet === null
    ) {
      return;
    }

    const cost = coinsCostHintLetter();
    if (!coins.trySpend(cost)) {
      setState({ ...current, feedback: '__not_enough_coins' });
      return;
    }

    baseSet.add(chosenIdx);
    revealed.set(chosenLw, baseSet);
    setState({
      ...current,
      revealedPositions: revealed,
      hintTargetCycleIndex: (chosenSlot + 1) % n,
      feedback: '__hint_letter',
    });
  }, [coins]);

  const hintMeaning = useCallback(() => {
    const snap = snapRef.current;
    if (!snap || snap.state.pathWrong) return;
    const { state: current, level: currentLevel } = snap;
    if (isLevelComplete(currentLevel, current.solvedLower)) return;
    const target = firstUnsolvedTarget(currentLevel, current.solvedLower);
    if (!target) return;
    if (!coins.trySpend(coinsCostHintMeaning())) {
      setState({ ...current, feedback: '__not_enough_coins' });
      return;
    }
    setState({
      ...current,
      feedback: `${MEANING_FEEDBACK_PREFIX}${target.meaning}`,
    });
  }, [coins]);

  if (!level || !state || sessionLevels.length === 0) return null;

  const built = state.path.map((p) => p.char).join('');
  const meaningFromFeedback = state.feedback?.startsWith(MEANING_FEEDBACK_PREFIX)
    ? state.feedback.slice(MEANING_FEEDBACK_PREFIX.length)
    : null;

  const levelDone = isLevelComplete(level, state.solvedLower);
  const allDone = levelDone && levelIndex >= sessionLevels.length - 1;
  const solvedCount = solvedTargetCount(level, state.solvedLower);

  const letterCost = coinsCostHintLetter();
  const meaningCost = coinsCostHintMeaning();
  const canHint = coins.coins >= letterCost && !state.pathWrong && !levelDone;
  const canMeaning = coins.coins >= meaningCost && !state.pathWrong && !levelDone;
  const costLabel = (n: number) =>
    formatClient(labels.coinsCostTemplate, locale, { coins: n });

  // Flutter: __correct → no snackbar text; meaning lives in the banner.
  const liveMessage = (() => {
    if (meaningFromFeedback) return null;
    switch (state.feedback) {
      case '__correct':
        return null;
      case '__already_found':
        return labels.alreadyFound;
      case '__not_enough_coins':
        return labels.notEnoughCoins;
      case '__hint_letter':
        return labels.hintLetter;
      default:
        return null;
    }
  })();

  const trayBtnClass =
    'bg-surface-1 text-on-surface border-outline-variant pointer-events-auto absolute grid size-[clamp(2.25rem,5.5dvh,2.75rem)] place-items-center rounded-full border-2 shadow-[var(--shadow-soft)] disabled:opacity-40';

  return (
    <div className="mx-auto w-full max-w-[var(--container-quiz)]">
      <div className="border-outline-variant/60 bg-surface-1 dark:bg-surface-2 relative overflow-hidden rounded-[var(--radius-card)] border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-primary)_12%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom,color-mix(in_oklab,var(--color-secondary)_10%,transparent),transparent_50%)]"
        />

        <div className="relative flex flex-wrap items-center justify-between gap-2 px-3 pt-2.5 sm:px-4 sm:pt-3">
          <p className="text-on-surface-variant text-[length:var(--text-caption)] font-semibold">
            {formatClient(labels.levelOfTemplate, locale, {
              current: levelIndex + 1,
              total: sessionLevels.length,
            })}
            <span className="text-on-surface-variant/80 ms-2">
              ·{' '}
              <bdi dir="ltr">
                {formatCoins(solvedCount, locale)}/
                {formatCoins(level.targetWords.length, locale)}
              </bdi>
            </span>
          </p>
          <div className="bg-tertiary-container text-on-tertiary-container inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold">
            <IconSparkle className="size-3.5" />
            <bdi dir="ltr">{formatCoins(coins.coins, locale)}</bdi>
          </div>
        </div>

        <div className="relative flex flex-col gap-[clamp(0.4rem,1.4dvh,0.9rem)] px-3 py-2.5 sm:px-4 sm:py-3">
          <p className="sr-only">{labels.targetsHeading}</p>
          <AnswerSlots
            level={level}
            solvedLower={state.solvedLower}
            revealedPositions={state.revealedPositions}
            onSolvedWordTap={setSheetTarget}
          />

          <div
            dir="ltr"
            className={cn(
              'rounded-[var(--radius-input)] border-2 px-3 py-[clamp(0.35rem,1dvh,0.65rem)] text-center transition-[border-color,background-color] duration-[var(--duration-fast)]',
              state.pathWrong
                ? 'border-error bg-error-container animate-[wb-shake_0.48s_ease-out]'
                : 'border-primary/40 bg-surface-2 dark:bg-surface-3'
            )}
          >
            <p
              lang="en"
              className={cn(
                'min-h-[1.25em] text-[length:clamp(1.1rem,3.2dvh,1.65rem)] font-extrabold tracking-[0.18em] uppercase',
                state.pathWrong ? 'text-on-error-container' : 'text-on-surface'
              )}
            >
              {built ? built.toUpperCase() : '\u00a0'}
            </p>
            {meaningFromFeedback ? (
              <div
                dir="rtl"
                lang={glossLang}
                className="border-outline-variant/50 mt-2 border-t pt-2 text-right"
              >
                <p className="text-primary text-[length:var(--text-caption)] font-semibold">
                  {labels.translation}
                </p>
                <p className="text-on-surface mt-0.5 text-sm font-bold sm:text-base">
                  {meaningFromFeedback}
                </p>
              </div>
            ) : null}
          </div>

          <p aria-live="polite" className="sr-only">
            {liveMessage ?? ''}
          </p>
          {liveMessage ? (
            <p
              aria-hidden
              className="text-on-surface-variant text-center text-[length:var(--text-caption)] font-semibold"
            >
              {liveMessage}
            </p>
          ) : null}

          {levelDone ? (
            <div className="py-4 text-center">
              <IconCheck className="text-correct mx-auto size-8" />
              <p className="mt-2 text-[length:var(--text-h3)] font-bold">
                {allDone ? labels.allLevelsDone : labels.levelCompleteTitle}
              </p>
              {!allDone ? (
                <p className="text-on-surface-variant mt-1 text-sm">
                  {labels.levelCompleteBody}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {!allDone ? (
                  <Button type="button" onClick={() => resetLevel(levelIndex + 1)}>
                    {labels.nextLevel}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant={allDone ? 'primary' : 'ghost'}
                  onClick={() =>
                    allDone ? replayFromStart() : resetLevel(levelIndex)
                  }
                >
                  <IconRefresh className="size-5" />
                  {labels.replay}
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative mx-auto w-full max-w-[min(100%,18.5rem,min(52vw,38dvh))]">
              <div className="pointer-events-none absolute inset-0 z-10">
                <button
                  type="button"
                  disabled={!canHint}
                  onClick={hintLetter}
                  title={`${labels.hintReveal} — ${costLabel(letterCost)}`}
                  aria-label={labels.hintReveal}
                  className={cn(trayBtnClass, 'start-0 top-0')}
                >
                  <IconLightbulb className="size-[1.05rem]" />
                </button>
                <button
                  type="button"
                  disabled={state.pathWrong}
                  onClick={shuffleCircle}
                  title={labels.shuffle}
                  aria-label={labels.shuffle}
                  className={cn(trayBtnClass, 'start-0 bottom-0')}
                >
                  <IconLoop className="size-[1.05rem]" />
                </button>
                <button
                  type="button"
                  disabled={!canMeaning}
                  onClick={hintMeaning}
                  title={`${labels.hintMeaning} — ${costLabel(meaningCost)}`}
                  aria-label={labels.hintMeaning}
                  className={cn(trayBtnClass, 'end-0 bottom-0')}
                >
                  <IconSparkle className="size-[1.05rem]" />
                </button>
              </div>

              <CircularLetterTray
                letters={state.circleLetters}
                path={state.path}
                pathWrong={state.pathWrong}
                onAppend={appendLetter}
                onRelease={evaluatePath}
                onCancel={clearPath}
                onClearTap={clearPath}
              />
            </div>
          )}
        </div>
      </div>

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

function WordInfoOverlay({
  target,
  glossLang,
  labels,
  onClose,
}: {
  target: WordBuilderTargetWord;
  glossLang: 'fa' | 'ckb';
  labels: WordBuilderLabels;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-label={labels.meaning}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="bg-surface-1 border-outline-variant w-full max-w-md rounded-[var(--radius-card)] border p-5 shadow-[var(--shadow-soft)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p lang="en" dir="ltr" className="text-[length:var(--text-h3)] font-extrabold">
          {target.word}
        </p>
        {target.meaning ? (
          <p lang={glossLang} dir="rtl" className="text-primary mt-2 text-right font-bold">
            {target.meaning}
          </p>
        ) : null}
        {target.exampleEn ? (
          <div className="mt-4">
            <p className="text-on-surface-variant text-[length:var(--text-caption)] font-semibold">
              {labels.example}
            </p>
            <p lang="en" dir="ltr" className="text-on-surface-variant mt-1 italic">
              {target.exampleEn}
            </p>
            {target.exampleGloss && target.exampleGloss !== target.exampleEn ? (
              <p
                lang={glossLang}
                dir="rtl"
                className="text-primary mt-1 text-right text-sm font-bold"
              >
                {target.exampleGloss}
              </p>
            ) : null}
          </div>
        ) : null}
        <Button type="button" className="mt-5 w-full" onClick={onClose}>
          {labels.close}
        </Button>
      </div>
    </div>
  );
}
