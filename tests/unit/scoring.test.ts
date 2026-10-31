import { describe, expect, it } from 'vitest';

import { normalizeGrammarQuestion } from '@/lib/api/normalize';
import type { RawGrammarQuestion } from '@/lib/api/schemas';
import {
  isCorrectKey,
  leaguePoints,
  scoreAnswers,
  wrongIndices,
} from '@/lib/quiz/scoring';

/**
 * These fixtures are small, synthetic and clearly labelled, as the brief
 * requires. No real content from the API is copied into the repo.
 */
function makeQuestion(overrides: Partial<RawGrammarQuestion> = {}): RawGrammarQuestion {
  return {
    id: 1,
    topic: 'Test Topic',
    question_text: 'Placeholder question ___ .',
    option1: 'alpha',
    option2: 'beta',
    option3: 'gamma',
    option4: 'delta',
    correct_answer: 'option2',
    order_num: 1,
    fa_explanation: 'توضیح آزمایشی',
    kur_explanation: 'ڕوونکردنەوەی تاقیکردنەوە',
    eng_explanation: 'Test explanation',
    grammar_book_id: null,
    grammar_unit_id: null,
    ...overrides,
  };
}

describe('isCorrectKey — matches the app exactly', () => {
  it('accepts an exact key match', () => {
    expect(isCorrectKey('option2', 'option2')).toBe(true);
  });

  it('is case-insensitive, as the Dart does .toLowerCase()', () => {
    expect(isCorrectKey('Option2', 'option2')).toBe(true);
    expect(isCorrectKey('OPTION2', 'OpTiOn2')).toBe(true);
  });

  it('trims both sides', () => {
    expect(isCorrectKey('  option3  ', 'option3')).toBe(true);
    expect(isCorrectKey('option3', ' option3 ')).toBe(true);
  });

  it('is never correct when correct_answer is empty', () => {
    // a.isNotEmpty && a == b — an empty correct answer fails even against ''.
    expect(isCorrectKey('', '')).toBe(false);
    expect(isCorrectKey('   ', '')).toBe(false);
    expect(isCorrectKey(null, null)).toBe(false);
    expect(isCorrectKey(undefined, undefined)).toBe(false);
  });

  it('rejects a mismatch', () => {
    expect(isCorrectKey('option1', 'option2')).toBe(false);
  });

  it('rejects an unanswered question', () => {
    expect(isCorrectKey('option1', undefined)).toBe(false);
  });

  it('compares keys, not answer text — the text never matches', () => {
    expect(isCorrectKey('option2', 'beta')).toBe(false);
  });
});

describe('option handling', () => {
  it('keeps option1→option4 order and does not shuffle', () => {
    const q = normalizeGrammarQuestion(makeQuestion());
    expect(q.options.map((o) => o.key)).toEqual([
      'option1',
      'option2',
      'option3',
      'option4',
    ]);
    expect(q.options.map((o) => o.text)).toEqual(['alpha', 'beta', 'gamma', 'delta']);
  });

  it('drops options that are empty after trimming', () => {
    const q = normalizeGrammarQuestion(makeQuestion({ option3: '', option4: '   ' }));
    expect(q.options.map((o) => o.key)).toEqual(['option1', 'option2']);
  });

  it('drops a middle option without renumbering the ones after it', () => {
    // A question whose option2 is blank must still score option3 as option3.
    const q = normalizeGrammarQuestion(
      makeQuestion({ option2: '', correct_answer: 'option3' })
    );
    expect(q.options.map((o) => o.key)).toEqual(['option1', 'option3', 'option4']);
    expect(isCorrectKey(q.correctAnswer, 'option3')).toBe(true);
  });
});

describe('scoreAnswers', () => {
  const questions = [
    normalizeGrammarQuestion(makeQuestion({ id: 1, correct_answer: 'option1' })),
    normalizeGrammarQuestion(makeQuestion({ id: 2, correct_answer: 'option2' })),
    normalizeGrammarQuestion(makeQuestion({ id: 3, correct_answer: 'option3' })),
    normalizeGrammarQuestion(makeQuestion({ id: 4, correct_answer: 'option4' })),
  ];

  it('counts correct answers with no partial credit', () => {
    expect(
      scoreAnswers(questions, {
        0: 'option1',
        1: 'option2',
        2: 'option1',
        3: 'option4',
      })
    ).toBe(3);
  });

  it('scores a perfect run', () => {
    expect(
      scoreAnswers(questions, { 0: 'option1', 1: 'option2', 2: 'option3', 3: 'option4' })
    ).toBe(4);
  });

  it('scores an empty session as zero without throwing', () => {
    expect(scoreAnswers(questions, {})).toBe(0);
    expect(scoreAnswers([], {})).toBe(0);
  });

  it('does not penalise wrong answers', () => {
    expect(scoreAnswers(questions, { 0: 'option2', 1: 'option1' })).toBe(0);
  });

  it('ignores unanswered questions rather than counting them wrong against a total', () => {
    expect(scoreAnswers(questions, { 0: 'option1' })).toBe(1);
  });
});

describe('leaguePoints', () => {
  it('is score x 2, matching _kQuizLeaguePointsPerCorrect', () => {
    expect(leaguePoints(0)).toBe(0);
    expect(leaguePoints(7)).toBe(14);
    expect(leaguePoints(20)).toBe(40);
  });
});

describe('wrongIndices', () => {
  const questions = [
    normalizeGrammarQuestion(makeQuestion({ id: 1, correct_answer: 'option1' })),
    normalizeGrammarQuestion(makeQuestion({ id: 2, correct_answer: 'option2' })),
    normalizeGrammarQuestion(makeQuestion({ id: 3, correct_answer: 'option3' })),
  ];

  it('lists answered-and-wrong questions only', () => {
    expect(wrongIndices(questions, { 0: 'option2', 1: 'option2' })).toEqual([0]);
  });

  it('does not treat an unanswered question as wrong', () => {
    expect(wrongIndices(questions, { 0: 'option1' })).toEqual([]);
  });
});
