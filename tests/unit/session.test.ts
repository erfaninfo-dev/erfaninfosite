import { describe, expect, it } from 'vitest';

import { normalizeGrammarQuestion } from '@/lib/api/normalize';
import type { RawGrammarQuestion } from '@/lib/api/schemas';
import {
  DEFAULT_QUESTION_COUNT,
  SESSION_SIZE,
  minQuestionsForTopics,
  pickSession,
  resolveQuestionCount,
} from '@/lib/quiz/session';

/**
 * The session rules, ported from the app's
 * `pickGrammarQuizSessionQuestions` and its sizing constants.
 */

function makeQuestions(count: number, startId = 1) {
  return Array.from({ length: count }, (_, i) => {
    const raw: RawGrammarQuestion = {
      id: startId + i,
      topic: 'Test Topic',
      question_text: `Question ${startId + i} ___ .`,
      option1: 'a',
      option2: 'b',
      option3: 'c',
      option4: 'd',
      correct_answer: 'option1',
      order_num: i + 1,
      fa_explanation: '',
      kur_explanation: '',
      eng_explanation: '',
      grammar_book_id: null,
      grammar_unit_id: null,
    };
    return normalizeGrammarQuestion(raw);
  });
}

describe('minQuestionsForTopics', () => {
  it('is at least 5', () => {
    expect(minQuestionsForTopics(1)).toBe(5);
    expect(minQuestionsForTopics(3)).toBe(5);
  });

  it('rises to one per topic when more are selected', () => {
    expect(minQuestionsForTopics(7)).toBe(7);
    expect(minQuestionsForTopics(20)).toBe(20);
  });

  it('never returns zero', () => {
    expect(minQuestionsForTopics(0)).toBe(1);
    expect(minQuestionsForTopics(-3)).toBe(1);
  });
});

describe('resolveQuestionCount', () => {
  it('defaults to 15', () => {
    expect(resolveQuestionCount(undefined, 1, 300)).toBe(DEFAULT_QUESTION_COUNT);
  });

  it('raises a request below the floor', () => {
    expect(resolveQuestionCount(2, 1, 300)).toBe(5);
    expect(resolveQuestionCount(3, 9, 300)).toBe(9);
  });

  it('caps at one session', () => {
    expect(resolveQuestionCount(500, 1, 1000)).toBe(SESSION_SIZE);
  });

  it('never asks for more than the bank holds', () => {
    expect(resolveQuestionCount(50, 1, 12)).toBe(12);
  });
});

describe('pickSession', () => {
  const pool = makeQuestions(40);
  const none: ReadonlySet<number> = new Set();

  it('returns exactly the number asked for', () => {
    expect(pickSession(pool, none, 15, 1234)).toHaveLength(15);
  });

  it('never returns more than the pool holds', () => {
    expect(pickSession(makeQuestions(6), none, 20, 1)).toHaveLength(6);
  });

  it('returns nothing for an empty pool or a non-positive length', () => {
    expect(pickSession([], none, 10, 1)).toEqual([]);
    expect(pickSession(pool, none, 0, 1)).toEqual([]);
  });

  it('is reproducible from a seed', () => {
    const a = pickSession(pool, none, 10, 99);
    const b = pickSession(pool, none, 10, 99);
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
  });

  it('gives a different session for a different seed', () => {
    const a = pickSession(pool, none, 10, 1);
    const b = pickSession(pool, none, 10, 2);
    expect(a.map((q) => q.id)).not.toEqual(b.map((q) => q.id));
  });

  it('does shuffle — a session is not the pool in order', () => {
    // The quiz screen does not shuffle, but the session built upstream does.
    const session = pickSession(pool, none, 20, 7);
    const inOrder = pool.slice(0, 20).map((q) => q.id);
    expect(session.map((q) => q.id)).not.toEqual(inOrder);
  });

  it('prefers questions that have not been attempted', () => {
    // Mark the first 30 as attempted; a 10-question session should avoid them.
    const solved = new Set(pool.slice(0, 30).map((q) => q.id));
    const session = pickSession(pool, solved, 10, 42);

    expect(session).toHaveLength(10);
    expect(session.every((q) => !solved.has(q.id))).toBe(true);
  });

  it('tops up from attempted questions when there are too few fresh ones', () => {
    // Only 4 unattempted, but 10 asked for.
    const solved = new Set(pool.slice(0, 36).map((q) => q.id));
    const session = pickSession(pool, solved, 10, 42);

    expect(session).toHaveLength(10);
    expect(session.filter((q) => !solved.has(q.id))).toHaveLength(4);
  });

  it('never repeats a question within one session', () => {
    const solved = new Set(pool.slice(0, 36).map((q) => q.id));
    const session = pickSession(pool, solved, 10, 5);
    expect(new Set(session.map((q) => q.id)).size).toBe(session.length);
  });

  it('merges topics into one pool', () => {
    const merged = [...makeQuestions(20, 1), ...makeQuestions(20, 100)];
    const session = pickSession(merged, none, 40, 3);
    const fromFirst = session.filter((q) => q.id < 100).length;
    const fromSecond = session.length - fromFirst;

    expect(fromFirst).toBe(20);
    expect(fromSecond).toBe(20);
  });
});
