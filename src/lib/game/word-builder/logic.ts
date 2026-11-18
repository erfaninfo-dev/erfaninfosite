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
