'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { syncWordBuilderProgressAction } from '@/app/[locale]/play/actions';

import { AnswerSlots } from '@/components/features/games/answer-slots';
import { CircularLetterTray } from '@/components/features/games/circular-letter-tray';
import { MagicBackground } from '@/components/features/games/magic-background';
import { useWordBuilderCoins } from '@/components/features/games/use-word-builder-coins';
import { WordBuilderCoinsChip } from '@/components/features/games/word-builder-coins-chip';
import {
  IconArrowBack,
  IconCheck,
  IconClose,
  IconGrid,
  IconLightbulb,
  IconLogout,
  IconMusic,
  IconRefresh,
  IconSettings,
  IconShuffle,
  IconTranslate,
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
import {
  markCampaignStageCleared,
  readSolvedWords,
  recordSolvedWord,
} from '@/lib/game/word-builder/campaign-progress';
import {
  clearCategoryProgress,
  getServerWbProgress,
  markCategoryLevelCompleted,
  readWbProgress,
  subscribeWbProgress,
} from '@/lib/game/word-builder/progress';
import type {
  LetterInstance,
  WordBuilderDifficulty,
  WordBuilderLevel,
  WordBuilderSourceWord,
  WordBuilderTargetWord,
} from '@/lib/game/word-builder/types';
import { formatClient } from '@/lib/i18n/client-format';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';
import { speakingText, subscribeSpeaking, toggleSpeak } from '@/lib/vocab/speak';

/** Hold ~400ms then fade ~260ms — Flutter tray wrong-path timing. */
const WRONG_PATH_CLEAR_MS = 660;

export type WordBuilderLabels = {
  /** Raw ICU: `Level {current} of {total}`. */
  levelOfTemplate: string;
  stageNTemplate: string;
  back: string;
  exit: string;
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
  resetProgress: string;
  targetsHeading: string;
  meaning: string;
  example: string;
  speakWord: string;
  speakExample: string;
  close: string;
  soundTitle: string;
  bgmSwitch: string;
  bgmSubtitle: string;
  sfxSwitch: string;
  sfxSubtitle: string;
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

function formatNum(n: number, locale: Locale): string {
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
 * Word Builder session matching Flutter's `WordBuilderSessionScreen`
 * (MagicBackground, AnswerSlotsPanel, golden built-word/meaning card,
 * CircularLetterTray with orbiting glow & FancyLetters, 3 glowing corner
 * buttons, audio settings sheet, stages picker, WordInfoSheet with TTS,
 * and golden Level Complete card — without water / train / prison).
 */
export type WordBuilderCampaignMeta = {
  difficulty: WordBuilderDifficulty;
  difficultyLabel: string;
  stage: number;
  totalStages: number;
  signedIn: boolean;
  stageOfTemplate: string;
  nextTierDifficulty: WordBuilderDifficulty | null;
  nextTierLabel: string | null;
  tierCompleteTitle: string;
  tierCompleteBody: string;
};

export type WordBuilderThemeStageMeta = {
  slug: string;
  stage: number;
  totalStages: number;
  stageOfTemplate: string;
};

export function WordBuilderGame({
  categorySlug,
  categoryTitle,
  levels: initialLevels,
  catalogWords,
  locale,
  glossLang,
  labels,
  campaign,
  themeStage,
}: {
  categorySlug: string;
  categoryTitle: string;
  levels: WordBuilderLevel[];
  catalogWords: WordBuilderSourceWord[];
  locale: Locale;
  glossLang: 'fa' | 'ckb';
  labels: WordBuilderLabels;
  campaign?: WordBuilderCampaignMeta;
  themeStage?: WordBuilderThemeStageMeta;
}) {
  const router = useRouter();
  const catalog = useMemo(() => buildTargetCatalog(catalogWords), [catalogWords]);

  const solvedScope = campaign
    ? 'campaign'
    : themeStage
      ? `theme:${themeStage.slug}`
      : `theme:${categorySlug}`;

  const [sessionLevels, setSessionLevels] = useState(initialLevels);
  const [levelIndex, setLevelIndex] = useState(0);
  const [sessionSolved, setSessionSolved] = useState(() => new Set<string>());
  const [state, setState] = useState<GameState | null>(() =>
    initialLevels[0]
      ? createLevelState(initialLevels[0], initialLevels[0].levelId * 9973)
      : null
  );

  const [sheetTarget, setSheetTarget] = useState<WordBuilderTargetWord | null>(null);
  const [audioSheetOpen, setAudioSheetOpen] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  const coins = useWordBuilderCoins();
  const audioPrefs = useSyncExternalStore(
    subscribeAudioPrefs,
    getAudioPrefsSnapshot,
    getServerAudioPrefsSnapshot
  );
  const progressMap = useSyncExternalStore(
    subscribeWbProgress,
    readWbProgress,
    getServerWbProgress
  );
  const completedStages = useMemo(
    () => new Set(progressMap[categorySlug] ?? []),
    [progressMap, categorySlug]
  );

  const pathRef = useRef<LetterInstance[]>([]);
  const snapRef = useRef<GameSnapshot | null>(null);
  const catalogRef = useRef(catalog);
  const sessionLevelsRef = useRef(sessionLevels);
  const sessionSolvedRef = useRef(sessionSolved);
  const persistedSolvedRef = useRef<Set<string>>(new Set());
  const wrongClearTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);

  const level = sessionLevels[levelIndex] ?? null;

  const showToast = useCallback((msg: string) => {
    setToastText(msg);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToastText(null);
      toastTimer.current = null;
    }, 2200);
  }, []);

  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);

  // Hydrate previously solved words across stages (`_wasSolvedAnywhere`) so
  // already-solved bonus catalog words cannot be reused in later stages.
  useEffect(() => {
    const persisted = readSolvedWords(solvedScope);
    persistedSolvedRef.current = persisted;
    const merged = new Set(persisted);
    for (const w of sessionSolvedRef.current) merged.add(w);
    sessionSolvedRef.current = merged;
    if (snapRef.current) {
      snapRef.current = { ...snapRef.current, sessionSolved: merged };
    }
  }, [solvedScope]);

  useEffect(() => {
    sessionLevelsRef.current = sessionLevels;
    const merged = new Set(persistedSolvedRef.current);
    for (const w of sessionSolved) merged.add(w);
    sessionSolvedRef.current = merged;
    if (state && level) {
      snapRef.current = {
        state,
        level,
        levelIndex,
        sessionLevels,
        sessionSolved: merged,
      };
    }
  }, [state, level, levelIndex, sessionLevels, sessionSolved]);

  // Full-screen session mode: hide site top header & bottom nav while playing.
  useEffect(() => {
    document.documentElement.dataset.wordBuilderSession = '1';
    return () => {
      delete document.documentElement.dataset.wordBuilderSession;
    };
  }, []);

  // Session BGM lifecycle + tab visibility pause/resume (matching Flutter WidgetsBindingObserver).
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
    };
  }, []);

  const syncPath = useCallback((path: LetterInstance[], extra?: Partial<GameState>) => {
    pathRef.current = path;
    setState((s) => (s ? { ...s, path, ...extra } : s));
  }, []);

  const resetLevel = useCallback(
    (index: number, levelsOverride?: WordBuilderLevel[]) => {
      const levels = levelsOverride ?? sessionLevelsRef.current;
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
      setStagesOpen(false);
    },
    []
  );

  const replayFromStart = useCallback(() => {
    setSessionSolved(new Set());
    setSessionLevels(initialLevels);
    resetLevel(0, initialLevels);
  }, [initialLevels, resetLevel]);

  const commitWrong = useCallback(() => {
    playWordBuilderSfx('wrong');
    const path = pathRef.current;
    setState((s) => (s ? { ...s, path, pathWrong: true, feedback: null } : s));
    if (wrongClearTimer.current !== null) window.clearTimeout(wrongClearTimer.current);
    wrongClearTimer.current = window.setTimeout(() => {
      pathRef.current = [];
      setState((s) => (s ? { ...s, path: [], pathWrong: false, feedback: null } : s));
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
      const activeIdx = snapRef.current?.levelIndex ?? 0;
      const levelForComplete = nextLevels
        ? (nextLevels[activeIdx] ?? currentLevel)
        : currentLevel;
      const complete = isLevelComplete(levelForComplete, newSolved);
      const newCircle = complete
        ? []
        : shuffleInstances(buildLetterInstances(levelForComplete.letters), () => Math.random());

      let reward = coinsPerCorrectWord();
      if (complete) {
        reward += coinsLevelCompleteBonus();
        if (campaign) {
          const nextProg = markCampaignStageCleared(campaign.difficulty, campaign.stage);
          if (campaign.signedIn) {
            void syncWordBuilderProgressAction({
              beginnerStagesCleared: nextProg.beginner,
              intermediateStagesCleared: nextProg.intermediate,
              advancedStagesCleared: nextProg.advanced,
              coins: coins.coins + reward,
            }).catch(() => {});
          }
        } else if (themeStage) {
          markCategoryLevelCompleted(themeStage.slug, themeStage.stage - 1);
        } else {
          markCategoryLevelCompleted(categorySlug, activeIdx);
        }
        playWordBuilderSfx('levelComplete');
      } else {
        playWordBuilderSfx('correct');
      }
      coins.addCoins(reward);

      const nextSessionSolved = new Set(sessionSolvedRef.current);
      nextSessionSolved.add(norm);
      persistedSolvedRef.current.add(norm);
      sessionSolvedRef.current = nextSessionSolved;
      recordSolvedWord(solvedScope, norm);
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
        feedback: null,
        revealedPositions: current.revealedPositions,
      };
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
    [coins, categorySlug, campaign, themeStage, solvedScope]
  );

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
      showToast(labels.alreadyFound);
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
      pathCanExtendToLongerUnsolvedTarget(currentLevel, current.solvedLower, builtLower) ||
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
  }, [applyCorrect, commitWrong, labels.alreadyFound, showToast]);

  const appendLetter = useCallback(
    (letter: LetterInstance) => {
      unlockSessionBgmOnGesture();
      const snap = snapRef.current;
      if (!snap || snap.state.pathWrong) return;
      if (pathRef.current.some((p) => p.id === letter.id)) return;
      playWordBuilderSfx('letterPop');
      syncPath([...pathRef.current, letter], { feedback: null });
    },
    [syncPath]
  );

  const popLastLetter = useCallback(() => {
    const snap = snapRef.current;
    if (!snap || snap.state.pathWrong) return;
    if (pathRef.current.length === 0) return;
    playWordBuilderSfx('letterPop');
    syncPath(pathRef.current.slice(0, -1), { feedback: null });
  }, [syncPath]);

  const clearPath = useCallback(() => {
    if (pathRef.current.length === 0) return;
    pathRef.current = [];
    setState((s) => (s ? { ...s, path: [], pathWrong: false, feedback: null } : s));
  }, []);

  const shuffleCircle = useCallback(() => {
    unlockSessionBgmOnGesture();
    playWordBuilderSfx('letterPop');
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
    unlockSessionBgmOnGesture();
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
      showToast(labels.notEnoughCoins);
      return;
    }

    playWordBuilderSfx('letterPop');
    baseSet.add(chosenIdx);
    revealed.set(chosenLw, baseSet);
    setState({
      ...current,
      revealedPositions: revealed,
      hintTargetCycleIndex: (chosenSlot + 1) % n,
      feedback: '__hint_letter',
    });
    showToast(labels.hintLetter);
  }, [coins, labels.hintLetter, labels.notEnoughCoins, showToast]);

  const hintMeaning = useCallback(() => {
    unlockSessionBgmOnGesture();
    const snap = snapRef.current;
    if (!snap || snap.state.pathWrong) return;
    const { state: current, level: currentLevel } = snap;
    if (isLevelComplete(currentLevel, current.solvedLower)) return;
    const target = firstUnsolvedTarget(currentLevel, current.solvedLower);
    if (!target) return;
    if (!coins.trySpend(coinsCostHintMeaning())) {
      setState({ ...current, feedback: '__not_enough_coins' });
      showToast(labels.notEnoughCoins);
      return;
    }
    playWordBuilderSfx('letterPop');
    setState({
      ...current,
      feedback: `${MEANING_FEEDBACK_PREFIX}${target.meaning}`,
    });
  }, [coins, labels.notEnoughCoins, showToast]);

  // Desktop keyboard support (A-Z pick letter, Backspace pop, Enter submit, Space shuffle).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (sheetTarget || audioSheetOpen || stagesOpen) {
        if (e.key === 'Escape') {
          setSheetTarget(null);
          setAudioSheetOpen(false);
          setStagesOpen(false);
        }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const snap = snapRef.current;
      if (!snap || snap.state.pathWrong) return;
      if (isLevelComplete(snap.level, snap.state.solvedLower)) return;

      if (/^[a-zA-Z]$/.test(e.key)) {
        const lower = e.key.toLowerCase();
        const usedIds = new Set(pathRef.current.map((p) => p.id));
        const match = snap.state.circleLetters.find(
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
  }, [
    appendLetter,
    popLastLetter,
    evaluatePath,
    shuffleCircle,
    sheetTarget,
    audioSheetOpen,
    stagesOpen,
  ]);

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
  const costLabel = (n: number) => formatClient(labels.coinsCostTemplate, locale, { coins: n });

  const backHref = campaign
    ? localeHref(locale, `/play/normal/${campaign.difficulty}`)
    : themeStage
      ? localeHref(locale, `/play/${themeStage.slug}`)
      : localeHref(locale, '/play');
  const campaignTierDone = Boolean(campaign && campaign.stage >= campaign.totalStages);
  const themeAllDone = Boolean(themeStage && themeStage.stage >= themeStage.totalStages);
  const stageMode = Boolean(campaign || themeStage);

  return (
    <MagicBackground className="flex min-h-[100dvh] w-full flex-col">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[30rem] flex-col justify-between px-3.5 pt-3 pb-5 sm:px-5 sm:pt-4 sm:pb-6">
        {/* ── Flutter-style Top AppBar (Back · Title/Stages · Settings · Coins) ── */}
        <header className="flex items-center gap-2">
          <Link
            href={backHref}
            aria-label={labels.back}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white/40 text-[#5D4037] transition-colors hover:bg-white/60 dark:bg-black/20 dark:text-[#FFF8E1] dark:hover:bg-black/35"
          >
            <IconArrowBack className="size-5" />
          </Link>

          <button
            type="button"
            onClick={() => {
              if (stageMode) {
                router.push(backHref);
              } else {
                setStagesOpen(true);
              }
            }}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white/40 px-3 py-1.5 text-start transition-colors hover:bg-white/60 dark:bg-black/20 dark:hover:bg-black/35"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm leading-tight font-extrabold text-[#5D4037] dark:text-[#FFF8E1]">
                {campaign ? campaign.difficultyLabel : categoryTitle}
              </span>
              <span className="block truncate text-[11px] leading-tight font-bold text-[#6D4C41] dark:text-[#FFECB3]/80">
                {campaign
                  ? formatClient(campaign.stageOfTemplate, locale, {
                      stage: campaign.stage,
                      total: campaign.totalStages,
                    })
                  : themeStage
                    ? formatClient(themeStage.stageOfTemplate, locale, {
                        stage: themeStage.stage,
                        total: themeStage.totalStages,
                      })
                    : formatClient(labels.levelOfTemplate, locale, {
                        current: levelIndex + 1,
                        total: sessionLevels.length,
                      })}{' '}
                ·{' '}
                <bdi dir="ltr">
                  {formatNum(solvedCount, locale)}/{formatNum(level.targetWords.length, locale)}
                </bdi>
              </span>
            </span>
            <IconGrid className="size-4 shrink-0 text-[#5D4037]/80 dark:text-[#FFECB3]" />
          </button>

          {/* Settings Gear Button (exact Flutter AppBar audio/settings button) */}
          <button
            type="button"
            onClick={() => {
              unlockSessionBgmOnGesture();
              setAudioSheetOpen(true);
            }}
            aria-label={labels.soundTitle}
            title={labels.soundTitle}
            className="grid size-10 shrink-0 place-items-center rounded-full border-[1.8px] border-[#FFB300]/75 bg-[#5D4037]/12 text-[#5D4037] shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-transform hover:scale-105 active:scale-95 dark:border-[#FFB300]/50 dark:bg-[#2D2640]/60 dark:text-[#FFF8E1]"
          >
            <IconSettings className="size-5" />
          </button>

          <WordBuilderCoinsChip coins={coins.coins} locale={locale} compact />
        </header>

        {/* ── Answer Slots + Golden Built-Word / Embedded-Meaning Card ── */}
        <div className="my-auto flex flex-col gap-[clamp(0.55rem,1.6dvh,1rem)] py-2">
          <p className="sr-only">{labels.targetsHeading}</p>
          <AnswerSlots
            level={level}
            solvedLower={state.solvedLower}
            revealedPositions={state.revealedPositions}
            onSolvedWordTap={setSheetTarget}
          />

          {/* Selected-letters / Translation Banner Card (exact Flutter `word_builder_session_screen.dart` lines 625–835) */}
          <div
            className={cn(
              'mx-auto w-full max-w-[23rem] rounded-[18px] border-[2.2px] px-4 py-[clamp(0.5rem,1.2dvh,0.75rem)] text-center transition-colors duration-150',
              state.pathWrong
                ? 'animate-[wb-shake_0.48s_ease-out] border-[#D32F2F] bg-[linear-gradient(90deg,#FFCDD2,#FF8A80)] shadow-[0_3px_14px_rgba(244,67,54,0.35)]'
                : 'border-[#FFB300] bg-[linear-gradient(90deg,#FFF8E1,#FFECB3)] shadow-[0_3px_14px_rgba(255,152,0,0.34)] dark:border-[#FFB300]/80 dark:bg-[linear-gradient(90deg,#5D4037,#2D2640)]'
            )}
          >
            {meaningFromFeedback ? (
              /* Exact Flutter `WordBuilderEmbeddedMeaning` */
              <div dir="rtl" lang={glossLang} className="flex items-center gap-2.5 text-right">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#E65100]/45 bg-[linear-gradient(135deg,#FFD54F,#FFB300)] text-[#5D4037] shadow-[0_2px_6px_rgba(255,152,0,0.35)]">
                  <IconTranslate className="size-4" />
                </span>
                <p className="min-w-0 flex-1 text-sm leading-snug font-bold text-[#5D4037] dark:text-white/95">
                  <span className="text-xs font-bold text-[#E65100] dark:text-[#FFB300]">
                    {labels.translation} ·{' '}
                  </span>
                  {meaningFromFeedback}
                </p>
              </div>
            ) : (
              <p
                dir="ltr"
                lang="en"
                className={cn(
                  'min-h-[1.3em] text-[length:clamp(1.25rem,3.6dvh,1.9rem)] leading-tight font-extrabold tracking-[0.2em] uppercase',
                  state.pathWrong
                    ? 'text-[#B71C1C]'
                    : 'text-[#5D4037] dark:text-[#FFF8E1]'
                )}
              >
                {built ? built.toUpperCase() : '\u00a0'}
              </p>
            )}
          </div>
        </div>

        {/* ── Bottom Area: Level Complete Panel OR Circular Tray + 3 Glowing Corner Buttons ── */}
        {levelDone ? (
          <div className="mx-auto my-2 w-full max-w-[22rem] animate-[wb-pop-in_0.32s_ease-out] rounded-[28px] border-[2.2px] border-[#FFB300] bg-[linear-gradient(135deg,#FFFDE7,#FFECB3)] p-5 text-center shadow-[0_10px_28px_rgba(255,152,0,0.36),0_5px_16px_rgba(0,0,0,0.08)] dark:border-[#FFB300]/80 dark:bg-[linear-gradient(135deg,#5D4037,#2D2640)]">
            <p className="text-4xl leading-none" aria-hidden="true">
              {campaignTierDone || themeAllDone || (!stageMode && allDone) ? '👑🏆🎉' : '🏆🎉'}
            </p>
            <h2 className="mt-2.5 text-xl font-black text-[#4E342E] dark:text-[#FFF8E1]">
              {campaign
                ? campaignTierDone
                  ? campaign.tierCompleteTitle
                  : labels.levelCompleteTitle
                : themeStage
                  ? themeAllDone
                    ? labels.allLevelsDone
                    : labels.levelCompleteTitle
                  : allDone
                    ? labels.allLevelsDone
                    : labels.levelCompleteTitle}
            </h2>
            {campaign ? (
              <p className="mt-1 text-xs font-semibold text-[#6D4C41] dark:text-[#FFECB3]/85">
                {campaignTierDone ? campaign.tierCompleteBody : labels.levelCompleteBody}
              </p>
            ) : themeStage ? (
              !themeAllDone ? (
                <p className="mt-1 text-xs font-semibold text-[#6D4C41] dark:text-[#FFECB3]/85">
                  {labels.levelCompleteBody}
                </p>
              ) : null
            ) : !allDone ? (
              <p className="mt-1 text-xs font-semibold text-[#6D4C41] dark:text-[#FFECB3]/85">
                {labels.levelCompleteBody}
              </p>
            ) : null}

            <div className="mt-4 flex flex-col gap-2.5">
              {campaign ? (
                !campaignTierDone ? (
                  <Link
                    href={localeHref(
                      locale,
                      `/play/normal/${campaign.difficulty}/${campaign.stage + 1}`
                    )}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFB300] px-4 text-base font-black text-[#4E342E] no-underline shadow-md transition-transform hover:brightness-105 active:scale-[0.98]"
                  >
                    <span>{labels.nextLevel}</span>
                  </Link>
                ) : campaign.nextTierDifficulty && campaign.nextTierLabel ? (
                  <Link
                    href={localeHref(locale, `/play/normal/${campaign.nextTierDifficulty}`)}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFB300] px-4 text-base font-black text-[#4E342E] no-underline shadow-md transition-transform hover:brightness-105 active:scale-[0.98]"
                  >
                    <span>{campaign.nextTierLabel}</span>
                  </Link>
                ) : null
              ) : themeStage ? (
                !themeAllDone ? (
                  <Link
                    href={localeHref(locale, `/play/${themeStage.slug}/${themeStage.stage + 1}`)}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFB300] px-4 text-base font-black text-[#4E342E] no-underline shadow-md transition-transform hover:brightness-105 active:scale-[0.98]"
                  >
                    <span>{labels.nextLevel}</span>
                  </Link>
                ) : null
              ) : !allDone ? (
                <button
                  type="button"
                  onClick={() => resetLevel(levelIndex + 1)}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFB300] px-4 text-base font-black text-[#4E342E] shadow-md transition-transform hover:brightness-105 active:scale-[0.98]"
                >
                  <span>{labels.nextLevel}</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => (!stageMode && allDone ? replayFromStart() : resetLevel(levelIndex))}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border-[1.6px] border-[#FFB300] bg-[#FFF8E1]/75 px-4 text-sm font-extrabold text-[#5D4037] transition-colors hover:bg-[#FFF8E1] dark:border-[#FFD54F]/85 dark:bg-[#3E3228]/65 dark:text-[#FFECB3]"
              >
                <IconRefresh className="size-4" />
                <span>{labels.replay}</span>
              </button>

              <Link
                href={backHref}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border-[1.6px] border-[#FFB300]/80 bg-[#FFF8E1]/60 px-4 text-sm font-extrabold text-[#5D4037] no-underline transition-colors hover:bg-[#FFF8E1] dark:border-[#FFD54F]/75 dark:bg-[#3E3228]/55 dark:text-[#FFECB3]"
              >
                <IconLogout className="size-4" />
                <span>{labels.exit}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative mx-auto w-full max-w-[23rem] py-1">
            {/* 3 Corner Circular Action Buttons (exact Flutter `WordBuilderTrayCircleButton`) */}
            <div className="pointer-events-none absolute inset-0 z-20">
              {/* Top-start: Lamp-glow Hint Reveal Letter */}
              <button
                type="button"
                disabled={!canHint}
                onClick={hintLetter}
                title={`${labels.hintReveal} — ${costLabel(letterCost)}`}
                aria-label={`${labels.hintReveal} — ${costLabel(letterCost)}`}
                className="pointer-events-auto absolute start-1 top-1 grid size-12 place-items-center rounded-full border-2 border-[#C99400]/80 text-[#5D4037] transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 sm:size-[52px]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 34% 26%, #FFFDE7 0%, #FFECB3 45%, #FFE082 100%)',
                  boxShadow:
                    '0 0 16px rgba(255, 179, 0, 0.5), 0 0 30px 1px rgba(255, 224, 130, 0.35)',
                }}
              >
                <IconLightbulb className="size-5 drop-shadow-[0_0_6px_rgba(255,179,0,0.65)]" />
                <span
                  dir="ltr"
                  className="absolute -bottom-1.5 rounded-full border border-[#FFB300] bg-[#5D4037] px-1.5 py-0.5 text-[10px] leading-none font-black text-[#FFF8E1] tabular-nums"
                >
                  {formatNum(letterCost, locale)}
                </span>
              </button>

              {/* Bottom-start: Vibrant Amber Shuffle */}
              <button
                type="button"
                disabled={state.pathWrong}
                onClick={shuffleCircle}
                title={labels.shuffle}
                aria-label={labels.shuffle}
                className="pointer-events-auto absolute start-1 bottom-1 grid size-12 place-items-center rounded-full border-[1.75px] border-[#E65100]/65 text-[#5D4037] transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 sm:size-[52px]"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #FFD54F, #FFB300)',
                  boxShadow:
                    '0 0 14px rgba(255, 152, 0, 0.45), 0 4px 12px rgba(255, 152, 0, 0.35)',
                }}
              >
                <IconShuffle className="size-5" />
              </button>

              {/* Bottom-end: Vibrant Amber Translate / Meaning Hint */}
              <button
                type="button"
                disabled={!canMeaning}
                onClick={hintMeaning}
                title={`${labels.hintMeaning} — ${costLabel(meaningCost)}`}
                aria-label={`${labels.hintMeaning} — ${costLabel(meaningCost)}`}
                className="pointer-events-auto absolute end-1 bottom-1 grid size-12 place-items-center rounded-full border-[1.75px] border-[#E65100]/65 text-[#5D4037] transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 sm:size-[52px]"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #FFD54F, #FFB300)',
                  boxShadow:
                    '0 0 14px rgba(255, 152, 0, 0.45), 0 4px 12px rgba(255, 152, 0, 0.35)',
                }}
              >
                <IconTranslate className="size-5" />
                <span
                  dir="ltr"
                  className="absolute -bottom-1.5 rounded-full border border-[#FFB300] bg-[#5D4037] px-1.5 py-0.5 text-[10px] leading-none font-black text-[#FFF8E1] tabular-nums"
                >
                  {formatNum(meaningCost, locale)}
                </span>
              </button>
            </div>

            <CircularLetterTray
              letters={state.circleLetters}
              path={state.path}
              pathWrong={state.pathWrong}
              onAppend={appendLetter}
              onPopLast={popLastLetter}
              onRelease={evaluatePath}
              onCancel={clearPath}
              onClearTap={clearPath}
            />
          </div>
        )}
      </div>

      {/* ── Flutter-style floating SnackBar Toast ── */}
      <p aria-live="polite" className="sr-only">
        {toastText ?? ''}
      </p>
      {toastText ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--size-bottom-nav)+1rem)] z-40 flex justify-center md:bottom-6"
        >
          <div className="animate-[wb-pop-in_0.2s_ease-out] rounded-2xl bg-[#5D4037] px-4 py-2.5 text-sm font-bold text-[#FFFDE7] shadow-lg">
            {toastText}
          </div>
        </div>
      ) : null}

      {/* ── Word Info Bottom Sheet (with TTS Pronounce!) ── */}
      {sheetTarget ? (
        <WordInfoOverlay
          target={sheetTarget}
          glossLang={glossLang}
          labels={labels}
          onClose={() => setSheetTarget(null)}
        />
      ) : null}

      {/* ── Session Audio & Options Sheet (matching Flutter `WordBuilderSessionAudioSheet`) ── */}
      {audioSheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={() => setAudioSheetOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-[24px] border-2 border-[#FFB300]/85 bg-[linear-gradient(135deg,#FFF8E1,#FFECB3)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.2)] sm:rounded-[24px] dark:border-[#FFB300]/55 dark:bg-[linear-gradient(135deg,#2D2640,#1E1B24)]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#5D4037]/25 dark:bg-white/25" />

            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <IconVolume className="text-primary size-6" />
                <h2 className="text-lg font-extrabold text-[#5D4037] dark:text-[#FFF8E1]">
                  {labels.soundTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAudioSheetOpen(false)}
                aria-label={labels.close}
                className="grid size-9 place-items-center rounded-full bg-black/5 text-[#5D4037] dark:bg-white/10 dark:text-[#FFF8E1]"
              >
                <IconClose className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Background music toggle */}
              <AudioToggleTile
                icon={<IconMusic className="size-5" />}
                title={labels.bgmSwitch}
                subtitle={labels.bgmSubtitle}
                enabled={audioPrefs.bgm}
                onToggle={() => setBgmEnabled(!audioPrefs.bgm)}
              />

              {/* Game sounds (SFX) toggle */}
              <AudioToggleTile
                icon={<IconVolume className="size-5" />}
                title={labels.sfxSwitch}
                subtitle={labels.sfxSubtitle}
                enabled={audioPrefs.sfx}
                onToggle={() => setSfxEnabled(!audioPrefs.sfx)}
              />

              <div className="mt-1 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setAudioSheetOpen(false);
                    resetLevel(levelIndex);
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#FFB300]/75 bg-white/65 px-3 text-sm font-extrabold text-[#5D4037] dark:bg-white/10 dark:text-[#FFF8E1]"
                >
                  <IconRefresh className="size-4" />
                  <span>{labels.replay}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAudioSheetOpen(false);
                    if (stageMode) {
                      router.push(backHref);
                    } else {
                      setStagesOpen(true);
                    }
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#FFB300] px-3 text-sm font-extrabold text-[#4E342E]"
                >
                  <IconGrid className="size-4" />
                  <span>
                    {campaign
                      ? formatClient(campaign.stageOfTemplate, locale, {
                          stage: campaign.stage,
                          total: campaign.totalStages,
                        })
                      : themeStage
                        ? formatClient(themeStage.stageOfTemplate, locale, {
                            stage: themeStage.stage,
                            total: themeStage.totalStages,
                          })
                        : formatClient(labels.levelOfTemplate, locale, {
                            current: levelIndex + 1,
                            total: sessionLevels.length,
                          })}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Stages Picker Sheet (matching Flutter `word_builder_theme_stages_screen.dart` glossy tiles!) ── */}
      {stagesOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={() => setStagesOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[82dvh] w-full max-w-md overflow-y-auto rounded-t-[24px] border-2 border-[#FFB300]/85 bg-[linear-gradient(135deg,#FFF8E1,#FFECB3)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.22)] sm:rounded-[24px] dark:border-[#FFB300]/55 dark:bg-[linear-gradient(135deg,#2D2640,#1E1B24)]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#5D4037]/25 dark:bg-white/25" />
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="truncate text-lg font-black text-[#5D4037] dark:text-[#FFF8E1]">
                {categoryTitle}
              </h2>
              <button
                type="button"
                onClick={() => setStagesOpen(false)}
                aria-label={labels.close}
                className="grid size-9 place-items-center rounded-full bg-black/5 text-[#5D4037] dark:bg-white/10 dark:text-[#FFF8E1]"
              >
                <IconClose className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {sessionLevels.map((lvl, idx) => {
                const isDone = completedStages.has(idx);
                const isCurrent = idx === levelIndex;
                const bg = isCurrent
                  ? 'linear-gradient(135deg, #81C784, #2E7D32)'
                  : isDone
                    ? 'linear-gradient(135deg, #FFD54F, #FFB300)'
                    : 'linear-gradient(135deg, #FFE0B2, #FFB74D)';
                const glow = isCurrent
                  ? '0 4px 12px rgba(67,160,71,0.45)'
                  : '0 4px 12px rgba(255,152,0,0.35)';

                return (
                  <button
                    key={lvl.levelId}
                    type="button"
                    onClick={() => resetLevel(idx)}
                    aria-label={formatClient(labels.stageNTemplate, locale, { n: idx + 1 })}
                    className="relative grid aspect-square place-items-center rounded-[16px] border-[1.5px] border-white/55 text-base font-black text-white transition-transform hover:scale-105 active:scale-95"
                    style={{
                      backgroundImage: bg,
                      boxShadow: glow,
                      textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  >
                    <span className="pointer-events-none absolute inset-x-2 top-1.5 h-2 rounded-full bg-white/40" />
                    <span className="tabular-nums">{formatNum(idx + 1, locale)}</span>
                    {isDone ? (
                      <span className="absolute end-1 top-1 grid size-4 place-items-center rounded-full bg-white text-[#2E7D32]">
                        <IconCheck className="size-3" />
                      </span>
                    ) : null}
                    {isCurrent ? (
                      <span className="absolute bottom-1.5 h-1 w-6 rounded-full bg-white/90" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {completedStages.size > 0 ? (
              <button
                type="button"
                onClick={() => {
                  clearCategoryProgress(categorySlug);
                  replayFromStart();
                }}
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[#D32F2F]/40 bg-[#FFCDD2]/45 px-4 text-xs font-extrabold text-[#B71C1C] dark:bg-[#B71C1C]/20 dark:text-[#FF8A80]"
              >
                <IconRefresh className="size-4" />
                <span>{labels.resetProgress}</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </MagicBackground>
  );
}

function AudioToggleTile({
  icon,
  title,
  subtitle,
  enabled,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-2xl border border-[#5D4037]/15 bg-white/65 px-3.5 py-3 text-start transition-colors hover:bg-white/80 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-full',
          enabled
            ? 'bg-primary text-on-primary shadow-sm'
            : 'bg-surface-3 text-on-surface-variant'
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-[#5D4037] dark:text-[#FFF8E1]">
          {title}
        </span>
        <span className="block text-xs leading-snug text-[#6D4C41] dark:text-[#FFECB3]/75">
          {subtitle}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          enabled ? 'bg-primary' : 'bg-black/20 dark:bg-white/25'
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow transition-transform',
            enabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0.5 rtl:-translate-x-0.5'
          )}
        />
      </span>
    </button>
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
  const spoken = useSyncExternalStore(subscribeSpeaking, speakingText, () => '');
  const speakingWord = spoken === target.word.trim();
  const speakingExample = Boolean(target.exampleEn && spoken === target.exampleEn.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={labels.meaning}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[26px] border-2 border-[#FFB300]/80 bg-[linear-gradient(135deg,#FFFDE7,#FFECB3)] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.22)] sm:rounded-[26px] dark:border-[#FFB300]/55 dark:bg-[linear-gradient(135deg,#2D2640,#1E1B24)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#5D4037]/25 dark:bg-white/25" />

        <div className="flex items-center justify-between gap-3">
          <p
            lang="en"
            dir="ltr"
            className="text-2xl font-black text-[#5D4037] dark:text-[#FFF8E1]"
          >
            {target.word}
          </p>
          <button
            type="button"
            onClick={() => toggleSpeak(target.word)}
            aria-label={labels.speakWord}
            title={labels.speakWord}
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-full transition-colors',
              speakingWord
                ? 'bg-primary text-on-primary'
                : 'bg-[#FFB300]/30 text-[#5D4037] hover:bg-[#FFB300]/50 dark:bg-white/15 dark:text-[#FFF8E1]'
            )}
          >
            <IconVolume className="size-5" />
          </button>
        </div>

        {target.meaning ? (
          <p
            lang={glossLang}
            dir="rtl"
            className="text-primary mt-2.5 text-right text-lg font-extrabold"
          >
            {target.meaning}
          </p>
        ) : null}

        {target.exampleEn ? (
          <div className="mt-4 rounded-2xl border border-[#FFB300]/35 bg-white/60 p-3.5 dark:border-white/15 dark:bg-white/10">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-[#8D6E63] dark:text-[#FFECB3]/75">
                {labels.example}
              </p>
              <button
                type="button"
                onClick={() => toggleSpeak(target.exampleEn)}
                aria-label={labels.speakExample}
                title={labels.speakExample}
                className={cn(
                  'grid size-8 place-items-center rounded-full transition-colors',
                  speakingExample
                    ? 'bg-primary text-on-primary'
                    : 'bg-black/5 text-[#5D4037] dark:bg-white/10 dark:text-[#FFF8E1]'
                )}
              >
                <IconVolume className="size-4" />
              </button>
            </div>
            <p
              lang="en"
              dir="ltr"
              className="mt-1 text-sm leading-relaxed text-[#5D4037] italic dark:text-white/90"
            >
              {target.exampleEn}
            </p>
            {target.exampleGloss && target.exampleGloss !== target.exampleEn ? (
              <p
                lang={glossLang}
                dir="rtl"
                className="text-primary mt-1.5 text-right text-sm font-bold"
              >
                {target.exampleGloss}
              </p>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-12 w-full rounded-full bg-[#FFB300] font-extrabold text-[#4E342E] shadow-sm transition-transform active:scale-[0.98]"
        >
          {labels.close}
        </button>
      </div>
    </div>
  );
}
