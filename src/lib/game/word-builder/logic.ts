import type { LetterInstance, WordBuilderLevel, WordBuilderTargetWord } from './types';

export function normalizeWord(w: string): string {
  return w.trim().toLowerCase();
}

export function letterCounts(chars: Iterable<string>): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of chars) {
    if (!c) continue;
    const k = c.toLowerCase();
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export function multisetForWords(wordsLower: Iterable<string>): Map<string, number> {
  const m = new Map<string, number>();
  for (const w of wordsLower) {
    for (const ch of w) {
      const k = ch.toLowerCase();
      if (!k.trim()) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
  }
  return m;
}

/** Max count of each letter across the given words (union of needs, not sum). */
export function poolMaxPerLetterAcrossWords(
  wordsLower: Iterable<string>
): Map<string, number> {
  const maps = [...wordsLower].map((w) => multisetForWords([w]));
  if (maps.length === 0) return new Map();
  const keys = new Set<string>();
  for (const m of maps) for (const k of m.keys()) keys.add(k);
  const out = new Map<string, number>();
  for (const k of keys) {
    let mx = 0;
    for (const m of maps) {
      const v = m.get(k) ?? 0;
      if (v > mx) mx = v;
    }
    out.set(k, mx);
  }
  return out;
}

export function expandPoolLetters(pool: Map<string, number>): string[] {
  const keys = [...pool.keys()].sort();
  const out: string[] = [];
  for (const k of keys) {
    const n = pool.get(k) ?? 0;
    for (let i = 0; i < n; i += 1) out.push(k);
  }
  return out;
}

export function canSpellFromPool(
  wordLower: string,
  poolCounts: Map<string, number>
): boolean {
  const need = letterCounts(wordLower);
  for (const [ch, n] of need) {
    if ((poolCounts.get(ch) ?? 0) < n) return false;
  }
  return true;
}

export function isTargetWord(wordLower: string, level: WordBuilderLevel): boolean {
  return level.targetWords.some((t) => normalizeWord(t.word) === wordLower);
}

export function buildLetterInstances(letters: string[]): LetterInstance[] {
  const out: LetterInstance[] = [];
  let id = 0;
  for (const raw of letters) {
    for (const ch of raw) {
      if (!ch.trim()) continue;
      out.push({ id: id++, char: ch.toLowerCase() });
    }
  }
  return out;
}

export function shuffleInstances(
  items: LetterInstance[],
  random: () => number
): LetterInstance[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function isLevelComplete(
  level: WordBuilderLevel,
  solvedLower: ReadonlySet<string>
): boolean {
  return level.targetWords.every((t) => solvedLower.has(normalizeWord(t.word)));
}

export function solvedTargetCount(
  level: WordBuilderLevel,
  solvedLower: ReadonlySet<string>
): number {
  let n = 0;
  for (const t of level.targetWords) {
    if (solvedLower.has(normalizeWord(t.word))) n += 1;
  }
  return n;
}

export function firstUnsolvedTarget(
  level: WordBuilderLevel,
  solvedLower: ReadonlySet<string>
): WordBuilderTargetWord | null {
  for (const t of level.targetWords) {
    if (!solvedLower.has(normalizeWord(t.word))) return t;
  }
  return null;
}

export function unsolvedTargets(
  level: WordBuilderLevel,
  solvedLower: ReadonlySet<string>
): WordBuilderTargetWord[] {
  return level.targetWords.filter((t) => !solvedLower.has(normalizeWord(t.word)));
}

export function maxUnsolvedTargetLength(
  level: WordBuilderLevel,
  solvedLower: ReadonlySet<string>
): number {
  let max = 0;
  for (const t of unsolvedTargets(level, solvedLower)) {
    const len = normalizeWord(t.word).length;
    if (len > max) max = len;
  }
  return max;
}

export function anyUnsolvedTargetHasLength(
  level: WordBuilderLevel,
  solvedLower: ReadonlySet<string>,
  length: number
): boolean {
  return unsolvedTargets(level, solvedLower).some(
    (t) => normalizeWord(t.word).length === length
  );
}

export function pathCanExtendToLongerUnsolvedTarget(
  level: WordBuilderLevel,
  solvedLower: ReadonlySet<string>,
  builtLower: string
): boolean {
  const prefix = normalizeWord(builtLower);
  if (!prefix) return false;
  return unsolvedTargets(level, solvedLower).some((t) => {
    const w = normalizeWord(t.word);
    return w.length > prefix.length && w.startsWith(prefix);
  });
}

export function findUnsolvedTargetMatchingBuilt(
  level: WordBuilderLevel,
  solvedLower: ReadonlySet<string>,
  builtLower: string
): WordBuilderTargetWord | null {
  const built = normalizeWord(builtLower);
  if (!built) return null;
  for (const t of level.targetWords) {
    const w = normalizeWord(t.word);
    if (solvedLower.has(w)) continue;
    if (w === built) return t;
  }
  return null;
}

export function unsolvedTargetLengths(
  level: WordBuilderLevel,
  solvedLower: ReadonlySet<string>
): Set<number> {
  return new Set(
    unsolvedTargets(level, solvedLower).map((t) => normalizeWord(t.word).length)
  );
}

export function isCurrentLevelTarget(
  level: WordBuilderLevel,
  wordLower: string
): boolean {
  const norm = normalizeWord(wordLower);
  return level.targetWords.some((t) => normalizeWord(t.word) === norm);
}

/**
 * Flutter `_catalogMatchForBuilt`: a non-target lemma that fits the letter
 * pool, matches an unsolved target length, and has not been solved yet
 * (anywhere in the session).
 */
export function findCatalogMatch(opts: {
  level: WordBuilderLevel;
  /** Current-level solved set — used for unsolved target lengths. */
  solvedLower: ReadonlySet<string>;
  /** Session-wide solved set (Flutter `_wasSolvedAnywhere`). */
  solvedAnywhere?: ReadonlySet<string>;
  builtLower: string;
  catalog: ReadonlyMap<string, WordBuilderTargetWord>;
}): WordBuilderTargetWord | null {
  const norm = normalizeWord(opts.builtLower);
  if (norm.length < 2) return null;
  if (!unsolvedTargetLengths(opts.level, opts.solvedLower).has(norm.length)) {
    return null;
  }
  if (isCurrentLevelTarget(opts.level, norm)) return null;
  const anywhere = opts.solvedAnywhere ?? opts.solvedLower;
  if (anywhere.has(norm) || opts.solvedLower.has(norm)) return null;
  const target = opts.catalog.get(norm);
  if (!target) return null;
  if (!canSpellFromPool(norm, letterCounts(opts.level.letters))) return null;
  return target;
}

/** Flutter `_catalogCanExtendBuilt` — prefix of a longer unused catalog word. */
export function catalogCanExtendBuilt(opts: {
  level: WordBuilderLevel;
  solvedLower: ReadonlySet<string>;
  solvedAnywhere?: ReadonlySet<string>;
  builtLower: string;
  catalog: ReadonlyMap<string, WordBuilderTargetWord>;
}): boolean {
  const prefix = normalizeWord(opts.builtLower);
  if (!prefix) return false;
  const pool = letterCounts(opts.level.letters);
  const allowed = unsolvedTargetLengths(opts.level, opts.solvedLower);
  const anywhere = opts.solvedAnywhere ?? opts.solvedLower;
  for (const [word] of opts.catalog) {
    if (word.length <= prefix.length || !word.startsWith(prefix)) continue;
    if (!allowed.has(word.length)) continue;
    if (isCurrentLevelTarget(opts.level, word)) continue;
    if (anywhere.has(word) || opts.solvedLower.has(word)) continue;
    if (canSpellFromPool(word, pool)) return true;
  }
  return false;
}

/**
 * Flutter `_isKnownDuplicateBuilt`: already-solved current target or catalog
 * lemma (shows “already found”).
 */
export function isKnownDuplicateBuilt(opts: {
  level: WordBuilderLevel;
  /** Session-wide solved set (Flutter `_wasSolvedAnywhere`). */
  solvedAnywhere: ReadonlySet<string>;
  builtLower: string;
  catalog: ReadonlyMap<string, WordBuilderTargetWord>;
}): boolean {
  const norm = normalizeWord(opts.builtLower);
  if (norm.length < 2) return false;
  if (!opts.solvedAnywhere.has(norm)) return false;
  return isCurrentLevelTarget(opts.level, norm) || opts.catalog.has(norm);
}

/** Index of the first unsolved target of the given length (Flutter replace slot). */
export function firstReplaceableTargetIndex(
  level: WordBuilderLevel,
  solvedLower: ReadonlySet<string>,
  length: number
): number {
  for (let i = 0; i < level.targetWords.length; i += 1) {
    const t = level.targetWords[i]!;
    if (solvedLower.has(normalizeWord(t.word))) continue;
    if (normalizeWord(t.word).length === length) return i;
  }
  return -1;
}

/** Build lemma → target map for bonus/catalog matching (Flutter `_globalTargetsByLemma`). */
export function buildTargetCatalog(
  words: Iterable<{
    word: string;
    meaning: string;
    exampleEn: string;
    exampleGloss: string;
  }>
): Map<string, WordBuilderTargetWord> {
  const map = new Map<string, WordBuilderTargetWord>();
  for (const w of words) {
    const lemma = gameLemma(w.word);
    if (!lemma || map.has(lemma)) continue;
    map.set(lemma, {
      word: lemma,
      meaning: w.meaning,
      exampleEn: w.exampleEn,
      exampleGloss: w.exampleGloss,
    });
  }
  return map;
}

function levelWithTargets(
  level: WordBuilderLevel,
  targets: WordBuilderTargetWord[],
  preserveLetters: boolean
): WordBuilderLevel {
  const letters = preserveLetters
    ? [...level.letters]
    : expandPoolLetters(
        poolMaxPerLetterAcrossWords(targets.map((t) => normalizeWord(t.word)))
      );
  return {
    ...level,
    letters,
    targetWords: targets,
  };
}

/**
 * Flutter `_carryDisplacedTargetForward` — push a replaced target into a later
 * unfinished level (same length slot when possible).
 */
export function carryDisplacedTargetForward(opts: {
  levels: WordBuilderLevel[];
  startIndex: number;
  displaced: WordBuilderTargetWord;
  acceptedNorm: string;
  /** Words already solved this session (any level). */
  sessionSolved: ReadonlySet<string>;
}): WordBuilderLevel[] {
  let pending = opts.displaced;
  const nextLevels = opts.levels.map((l) => ({
    ...l,
    letters: [...l.letters],
    targetWords: [...l.targetWords],
  }));

  for (let levelIndex = opts.startIndex; levelIndex < nextLevels.length; levelIndex += 1) {
    const level = nextLevels[levelIndex]!;
    const solved = opts.sessionSolved;
    const targets = [...level.targetWords];

    let replaceIndex = -1;
    for (let i = 0; i < targets.length; i += 1) {
      const norm = normalizeWord(targets[i]!.word);
      if (solved.has(norm)) continue;
      if (norm === opts.acceptedNorm) {
        replaceIndex = i;
        break;
      }
    }
    if (replaceIndex === -1) {
      replaceIndex = firstReplaceableTargetIndex(
        level,
        solved,
        normalizeWord(pending.word).length
      );
    }
    if (replaceIndex === -1) continue;

    const outgoing = targets[replaceIndex]!;
    targets[replaceIndex] = pending;
    nextLevels[levelIndex] = levelWithTargets(level, targets, false);

    if (normalizeWord(outgoing.word) === opts.acceptedNorm) {
      return nextLevels;
    }
    pending = outgoing;
  }

  return nextLevels;
}

/**
 * Flutter `_replaceUnsolvedTargetWithCatalogWord` for the current level,
 * then carry the displaced target forward.
 */
export function replaceUnsolvedTargetWithCatalogWord(opts: {
  levels: WordBuilderLevel[];
  levelIndex: number;
  level: WordBuilderLevel;
  solvedLower: ReadonlySet<string>;
  sessionSolved: ReadonlySet<string>;
  accepted: WordBuilderTargetWord;
  revealedPositions: ReadonlyMap<string, ReadonlySet<number>>;
}): {
  levels: WordBuilderLevel[];
  level: WordBuilderLevel;
  revealedPositions: Map<string, Set<number>>;
} | null {
  const acceptedNorm = normalizeWord(opts.accepted.word);
  const currentReplaceIndex = firstReplaceableTargetIndex(
    opts.level,
    opts.solvedLower,
    acceptedNorm.length
  );
  if (currentReplaceIndex === -1) return null;

  const currentTargets = [...opts.level.targetWords];
  const displaced = currentTargets[currentReplaceIndex]!;
  currentTargets[currentReplaceIndex] = opts.accepted;

  let nextLevels = opts.levels.map((l, i) =>
    i === opts.levelIndex
      ? levelWithTargets(opts.level, currentTargets, true)
      : {
          ...l,
          letters: [...l.letters],
          targetWords: [...l.targetWords],
        }
  );
  nextLevels = carryDisplacedTargetForward({
    levels: nextLevels,
    startIndex: opts.levelIndex + 1,
    displaced,
    acceptedNorm,
    sessionSolved: opts.sessionSolved,
  });

  const revealed = new Map<string, Set<number>>();
  for (const [k, v] of opts.revealedPositions) {
    revealed.set(k, new Set(v));
  }
  revealed.delete(normalizeWord(displaced.word));

  return {
    levels: nextLevels,
    level: nextLevels[opts.levelIndex]!,
    revealedPositions: revealed,
  };
}

export function pickHiddenIndexForReveal(
  wordLower: string,
  alreadyRevealed: ReadonlySet<number>,
  random: () => number
): number | null {
  if (!wordLower) return null;
  const hidden: number[] = [];
  for (let i = 0; i < wordLower.length; i += 1) {
    if (!alreadyRevealed.has(i)) hidden.push(i);
  }
  if (hidden.length === 0) return null;
  return hidden[Math.floor(random() * hidden.length)]!;
}

/**
 * English lemma for Word Builder: only when the word is entirely letters a–z
 * (length 2…7). Same rule as Flutter `wordBuilderGameLemma`.
 */
export function gameLemma(word: string): string | null {
  const t = word.trim();
  if (t.length < 2 || t.length > 7) return null;
  for (const ch of t) {
    const u = ch.codePointAt(0) ?? 0;
    const isLetter = (u >= 65 && u <= 90) || (u >= 97 && u <= 122);
    if (!isLetter) return null;
  }
  return normalizeWord(t);
}
