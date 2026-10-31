/**
 * How a grammar session is assembled, ported from the app.
 *
 * Source: `pickGrammarQuizSessionQuestions` in
 * lib/core/grammar/grammar_question_progress.dart, and the sizing constants in
 * lib/domain/api_providers.dart.
 *
 * This corrects an earlier assumption in this project. The quiz *screen* does
 * not shuffle, so the first read of it said sessions were unshuffled — but the
 * session is built upstream, in the provider, and it does three things that
 * matter:
 *
 *   1. it merges the questions of every selected topic,
 *   2. it prefers questions the reader has not attempted yet,
 *   3. it shuffles with a seed.
 *
 * Scoring is unchanged and still matches the app exactly (see scoring.ts); what
 * changes is which questions appear and in what order.
 *
 * **What cannot match.** Dart's `Random(seed)` and JavaScript's generators
 * produce different sequences from the same seed, so the same seed does not
 * give the same questions on both clients. The algorithm matches; the exact
 * sequence does not, and cannot without reimplementing Dart's RNG. That is
 * acceptable because the app already gives a different session per seed — what
 * has to agree is the *score* for a given set of answers, and that does.
 */

/** Upper bound on how many questions one session loads. */
export const SESSION_SIZE = 100;

/** Default when a length is not given. */
export const DEFAULT_QUESTION_COUNT = 15;

/** Floor for a session's length. */
export const MIN_BASE_QUESTIONS = 5;

/** At least 5, or one per topic when more topics are selected. */
export function minQuestionsForTopics(topicCount: number): number {
  if (topicCount <= 0) return 1;
  return Math.max(MIN_BASE_QUESTIONS, topicCount);
}

/** The lengths offered on the "how many questions" sheet. */
export const SESSION_LENGTH_OPTIONS = [10, 15, 20, 30, 50] as const;

/** mulberry32 — small, fast, and reproducible from a seed. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWith<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Pick up to `want` questions: unattempted first in random order, topped up
 * with already-attempted ones if there are not enough, then shuffled again.
 *
 * This is a line-for-line port of the Dart. It is generic over anything with
 * an `id`, because selection needs nothing else — which lets the browser run it
 * over the trimmed question shape the server sends rather than the full model.
 */
export function pickSession<T extends { id: number }>(
  pool: readonly T[],
  solvedIds: ReadonlySet<number>,
  want: number,
  seed: number
): T[] {
  if (pool.length === 0 || want <= 0) return [];

  const random = seededRandom(seed);
  const take = Math.min(want, pool.length);

  const unsolved = shuffleWith(
    pool.filter((q) => !solvedIds.has(q.id)),
    random
  );
  const solved = shuffleWith(
    pool.filter((q) => solvedIds.has(q.id)),
    random
  );

  const result = unsolved.slice(0, take);
  if (result.length < take) {
    result.push(...solved.slice(0, take - result.length));
  }

  return shuffleWith(result, random);
}

/**
 * Clamp a requested length the way the app does: at least the floor for the
 * number of topics, at most one session's worth, and never more than the bank
 * actually holds.
 */
export function resolveQuestionCount(
  requested: number | undefined,
  topicCount: number,
  bankSize: number
): number {
  const floor = minQuestionsForTopics(topicCount);
  const want = Math.max(floor, requested ?? DEFAULT_QUESTION_COUNT);
  const capped = Math.min(Math.max(want, 1), SESSION_SIZE);
  return Math.min(capped, bankSize);
}

/** A seed that is stable for a URL but different between sessions. */
export function makeSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}
