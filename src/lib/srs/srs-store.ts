/**
 * Spaced-repetition (SM-2) store matching Flutter's `lib/core/srs/srs_model.dart`
 * and `srs_provider.dart`.
 *
 * Pure SM-2 helpers are separated from localStorage I/O so they are unit-testable
 * and SSR-safe.
 */

export type SrsRating = 'again' | 'hard' | 'good' | 'easy';

export const SRS_RATING_QUALITY: Record<SrsRating, number> = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5,
};

export const SRS_RATINGS: readonly SrsRating[] = ['again', 'hard', 'good', 'easy'] as const;

export type SrsWordSnapshot = {
  word: string;
  meaningEn: string;
  meaningLocal: string;
  exampleEn: string;
};

export type SrsCard = {
  wordId: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  dueDate: string; // ISO date string
  snapshot?: SrsWordSnapshot;
};

export type WordMastery = {
  mastered: number; // interval >= 21
  learning: number; // interval 2..20
  seen: number; // interval <= 1
  total: number;
};

export const SRS_STORAGE_KEY = 'erfan_srs_cards_v1';

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSrsCardDueToday(card: SrsCard, now = new Date()): boolean {
  const parsed = Date.parse(card.dueDate);
  if (!Number.isFinite(parsed)) return true;
  const due = startOfDay(new Date(parsed));
  const today = startOfDay(now);
  return due.getTime() <= today.getTime();
}

/** Exact SuperMemo SM-2 algorithm matching Flutter `Sm2.rate`. */
export function rateSrsCard(card: SrsCard, rating: SrsRating, now = new Date()): SrsCard {
  const q = SRS_RATING_QUALITY[rating];
  let n = card.repetitions;
  let ef = card.easeFactor;
  let interval = card.interval;

  if (q >= 3) {
    if (n === 0) {
      interval = 1;
    } else if (n === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ef);
    }
    n += 1;
    ef = ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
    if (ef < 1.3) ef = 1.3;
  } else {
    n = 0;
    interval = 1;
  }

  const nextDue = new Date(now.getTime() + interval * 86_400_000);
  return {
    ...card,
    interval,
    easeFactor: ef,
    repetitions: n,
    dueDate: nextDue.toISOString(),
  };
}

export function computeWordMastery(cards: readonly SrsCard[]): WordMastery {
  let mastered = 0;
  let learning = 0;
  let seen = 0;
  for (const c of cards) {
    if (c.interval >= 21) mastered += 1;
    else if (c.interval >= 2) learning += 1;
    else seen += 1;
  }
  return { mastered, learning, seen, total: mastered + learning + seen };
}

/* ── browser storage & reactivity ────────────────────────────────────────── */

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined = undefined;
let cachedCards: Record<string, SrsCard> = {};

function emit() {
  for (const fn of listeners) fn();
}

export function readSrsCards(): Record<string, SrsCard> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SRS_STORAGE_KEY);
    if (raw === cachedRaw) return cachedCards;
    cachedRaw = raw;
    if (!raw) {
      cachedCards = {};
      return cachedCards;
    }
    const parsed = JSON.parse(raw) as unknown;
    const map: Record<string, SrsCard> = {};
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && typeof item === 'object' && typeof (item as SrsCard).wordId === 'string') {
          const c = item as SrsCard;
          map[c.wordId] = {
            wordId: c.wordId,
            interval: typeof c.interval === 'number' ? c.interval : 1,
            easeFactor: typeof c.easeFactor === 'number' ? c.easeFactor : 2.5,
            repetitions: typeof c.repetitions === 'number' ? c.repetitions : 0,
            dueDate: typeof c.dueDate === 'string' ? c.dueDate : new Date().toISOString(),
            snapshot: c.snapshot,
          };
        }
      }
    }
    cachedCards = map;
    return cachedCards;
  } catch {
    return {};
  }
}

function writeSrsCards(cards: Record<string, SrsCard>) {
  if (typeof window === 'undefined') return;
  try {
    const raw = JSON.stringify(Object.values(cards));
    cachedRaw = raw;
    cachedCards = cards;
    window.localStorage.setItem(SRS_STORAGE_KEY, raw);
    emit();
  } catch {
    /* ignore quota errors */
  }
}

export function subscribeSrs(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== 'undefined') {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SRS_STORAGE_KEY) {
        cachedRaw = undefined;
        listener();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }
  return () => {
    listeners.delete(listener);
  };
}

/** Add or refresh a word snapshot in the SRS queue (marked due today if new). */
export function ensureSrsWord(wordId: string, snapshot: SrsWordSnapshot): void {
  const current = readSrsCards();
  const existing = current[wordId];
  if (existing) {
    if (
      existing.snapshot?.word === snapshot.word &&
      existing.snapshot?.meaningLocal === snapshot.meaningLocal
    ) {
      return;
    }
    writeSrsCards({
      ...current,
      [wordId]: { ...existing, snapshot },
    });
    return;
  }
  writeSrsCards({
    ...current,
    [wordId]: {
      wordId,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      dueDate: new Date().toISOString(),
      snapshot,
    },
  });
}

export function rateStoredSrsWord(wordId: string, rating: SrsRating): SrsCard {
  const current = readSrsCards();
  const base: SrsCard = current[wordId] ?? {
    wordId,
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    dueDate: new Date().toISOString(),
  };
  const updated = rateSrsCard(base, rating);
  writeSrsCards({ ...current, [wordId]: updated });
  return updated;
}

export function getDueSrsCards(cards: Record<string, SrsCard>, now = new Date()): SrsCard[] {
  return Object.values(cards).filter(
    (card) => card.snapshot && card.snapshot.word && isSrsCardDueToday(card, now)
  );
}
