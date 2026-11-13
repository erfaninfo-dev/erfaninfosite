import type { VocabSearchHit } from '@/lib/vocab/search-words';

/** English token inside sample prose (aligned with the app). */
export type EnWordToken = {
  start: number;
  end: number;
  text: string;
};

export type CatalogEntry = VocabSearchHit & { bookId: number };

const WORD_RE = /[A-Za-z]+(?:['\u2019\u2018\u02BC][A-Za-z]+)?/g;

export function tokenizeEnglishWords(s: string): EnWordToken[] {
  const out: EnWordToken[] = [];
  for (const m of s.matchAll(WORD_RE)) {
    const text = m[0];
    if (!text) continue;
    out.push({ start: m.index ?? 0, end: (m.index ?? 0) + text.length, text });
  }
  return out;
}

export function normalizeForLookup(s: string): string {
  const unified = s.replaceAll('\u2019', "'").replaceAll('\u2018', "'").replaceAll('\u02BC', "'");
  return unified
    .toLowerCase()
    .replace(/[^a-z']+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function isCommonCollocationTail(word: string): boolean {
  switch (word) {
    case 'in':
    case 'on':
    case 'at':
    case 'to':
    case 'for':
    case 'of':
    case 'with':
    case 'about':
    case 'from':
    case 'into':
    case 'over':
    case 'under':
    case 'after':
    case 'before':
    case 'between':
    case 'through':
      return true;
    default:
      return false;
  }
}

export function bestTappedPhrase(tokens: EnWordToken[], startTokenIndex: number): string | null {
  if (startTokenIndex < 0 || startTokenIndex >= tokens.length) return null;
  const head = normalizeForLookup(tokens[startTokenIndex]?.text ?? '');
  if (!head) return null;
  if (startTokenIndex + 1 < tokens.length) {
    const next = normalizeForLookup(tokens[startTokenIndex + 1]?.text ?? '');
    if (isCommonCollocationTail(next)) return `${head} ${next}`;
  }
  return head;
}

export function englishLemmaCandidates(
  word: string,
  catalogTokens: Set<string>,
  allowDerivations: boolean
): Set<string> {
  const w = normalizeForLookup(word);
  const out = new Set<string>();
  if (!w) return out;
  const add = (s: string) => {
    const t = normalizeForLookup(s);
    if (t) out.add(t);
  };
  out.add(w);
  if (w.endsWith("'s") && w.length > 2) add(w.slice(0, -2));
  if (w.endsWith('ies') && w.length > 3) add(`${w.slice(0, -3)}y`);
  if (w.endsWith('es') && w.length > 2) add(w.slice(0, -2));
  if (w.endsWith('s') && w.length > 1) add(w.slice(0, -1));
  if (w.endsWith('ing') && w.length > 4) {
    const base = w.slice(0, -3);
    add(base);
    if (!base.endsWith('e')) add(`${base}e`);
    if (base.length >= 2 && base.at(-1) === base.at(-2)) add(base.slice(0, -1));
  }
  if (w.endsWith('ed') && w.length > 3) {
    const base = w.slice(0, -2);
    add(base);
    if (w.endsWith('ied') && w.length > 3) add(`${w.slice(0, -3)}y`);
    if (!base.endsWith('e')) add(`${base}e`);
    if (base.length >= 2 && base.at(-1) === base.at(-2)) add(base.slice(0, -1));
  }
  if (!w.endsWith('ing')) add(`${w}ing`);
  if (!w.endsWith('ed')) add(`${w}ed`);
  if (!w.endsWith('s')) add(`${w}s`);
  if (allowDerivations) {
    for (const suf of ['ly', 'ful', 'fully', 'ingly'] as const) {
      const d = normalizeForLookup(`${w}${suf}`);
      if (d && catalogTokens.has(d)) out.add(d);
    }
  }
  return out;
}

function compareEntries(a: CatalogEntry, b: CatalogEntry, preferredBookId: number, preferredUnit: number) {
  const rank = (e: CatalogEntry) => {
    if (e.bookId !== preferredBookId) return 2;
    if (e.unit === preferredUnit) return 0;
    return 1;
  };
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (a.bookId !== b.bookId) return a.bookId - b.bookId;
  if (a.unit !== b.unit) return a.unit - b.unit;
  return a.id - b.id;
}

/** Same tiered matching rules as the app's [lookupCatalogMatches]. */
export function lookupCatalogMatches(
  tokens: EnWordToken[],
  startTokenIndex: number,
  catalog: CatalogEntry[],
  preferredBookId: number,
  preferredUnit: number
): VocabSearchHit[] {
  if (startTokenIndex < 0 || startTokenIndex >= tokens.length) return [];
  const tappedWord = normalizeForLookup(tokens[startTokenIndex]?.text ?? '');
  if (!tappedWord) return [];

  const tappedPhrase = bestTappedPhrase(tokens, startTokenIndex);
  const catalogTokens = new Set<string>();
  for (const e of catalog) {
    const t = normalizeForLookup(e.word);
    if (!t) continue;
    for (const piece of t.split(' ')) catalogTokens.add(piece);
  }
  const allowDerivations = tappedWord.length >= 5;
  const tappedWordCandidates = englishLemmaCandidates(tappedWord, catalogTokens, allowDerivations);
  const tappedPhraseHeadCandidates =
    tappedPhrase == null
      ? new Set<string>()
      : englishLemmaCandidates(tappedPhrase.split(' ')[0] ?? '', catalogTokens, allowDerivations);

  const tierCollocationSameUnit: CatalogEntry[] = [];
  const tierPhrase: CatalogEntry[] = [];
  const tierExactWord: CatalogEntry[] = [];
  const tierRelated: CatalogEntry[] = [];
  const seen = new Set<number>();

  const addTo = (bucket: CatalogEntry[], e: CatalogEntry) => {
    if (seen.has(e.id)) return;
    seen.add(e.id);
    bucket.push(e);
  };

  if (tappedPhrase?.includes(' ')) {
    for (const e of catalog) {
      if (e.bookId !== preferredBookId || e.unit !== preferredUnit) continue;
      if (normalizeForLookup(e.word) === tappedPhrase) addTo(tierCollocationSameUnit, e);
    }
  }

  const maxLen = Math.min(6, tokens.length - startTokenIndex);
  for (let len = maxLen; len >= 1; len--) {
    const phraseKey = normalizeForLookup(
      tokens
        .slice(startTokenIndex, startTokenIndex + len)
        .map((t) => t.text)
        .join(' ')
    );
    if (!phraseKey) continue;
    const exact = catalog.filter((e) => normalizeForLookup(e.word) === phraseKey);
    if (exact.length === 0) continue;
    for (const e of exact) {
      if (len === 1) addTo(tierExactWord, e);
      else addTo(tierPhrase, e);
    }
    break;
  }

  for (const e of catalog) {
    if (seen.has(e.id)) continue;
    const entryTokens = normalizeForLookup(e.word).split(' ');
    const hit =
      entryTokens.some((t) => tappedWordCandidates.has(t)) ||
      entryTokens.some((t) => tappedPhraseHeadCandidates.has(t));
    if (hit) addTo(tierRelated, e);
  }

  if (
    tierCollocationSameUnit.length === 0 &&
    tierPhrase.length === 0 &&
    tierExactWord.length === 0 &&
    tierRelated.length === 0
  ) {
    return [];
  }

  const cmp = (a: CatalogEntry, b: CatalogEntry) =>
    compareEntries(a, b, preferredBookId, preferredUnit);
  tierCollocationSameUnit.sort(cmp);
  tierPhrase.sort(cmp);
  tierExactWord.sort(cmp);
  tierRelated.sort(cmp);

  const merged = [...tierCollocationSameUnit, ...tierPhrase, ...tierExactWord, ...tierRelated];
  return merged.map(
    ({ id, word, type, important, meaningEn, gloss, exampleEn, exampleGloss, unit, section }) => ({
      id,
      word,
      type,
      important,
      meaningEn,
      gloss,
      exampleEn,
      exampleGloss,
      unit,
      section,
    })
  );
}
