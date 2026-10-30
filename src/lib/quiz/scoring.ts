import type { GrammarQuestion, OptionKey } from '@/lib/api/normalize';

/**
 * Grammar quiz scoring, ported from the Flutter app.
 *
 * The definition of done requires that "a quiz scored on the web gives the same
 * result as the same quiz in the app, on the same data", so every rule here is
 * taken from the app rather than invented:
 *
 *   lib/data/models/grammar_question.dart      isCorrectKey, nonEmptyOptionKeys
 *   lib/features/grammar/grammar_quiz_screen.dart   _onSelect, _score
 *
 * The rules:
 *   - `correct_answer` holds a key (`option1`…`option4`), never the answer text.
 *   - Matching is trimmed and case-insensitive; an empty key is never correct.
 *   - Options appear in option1→option4 order and are never shuffled.
 *   - An option whose text is empty after trimming is dropped.
 *   - Score is a plain count of correct answers. No partial credit, no penalty,
 *     no time factor.
 *   - An answer is final once given.
 *   - League points are score × 2.
 */

/** The app's `_kQuizLeaguePointsPerCorrect`. */
export const LEAGUE_POINTS_PER_CORRECT = 2;

/**
 * The app's `GrammarQuestion.isCorrectKey`:
 *
 * ```dart
 * final a = (correctAnswer ?? '').trim().toLowerCase();
 * final b = (selectedKey ?? '').trim().toLowerCase();
 * return a.isNotEmpty && a == b;
 * ```
 */
export function isCorrectKey(
  correctAnswer: string | null | undefined,
  selectedKey: string | null | undefined
): boolean {
  const a = (correctAnswer ?? '').trim().toLowerCase();
  const b = (selectedKey ?? '').trim().toLowerCase();
  return a.length > 0 && a === b;
}

export type Answers = Record<number, OptionKey | undefined>;

/** Score a finished or partial session: the number of correct answers. */
export function scoreAnswers(questions: GrammarQuestion[], answers: Answers): number {
  let score = 0;
  for (const [index, question] of questions.entries()) {
    if (isCorrectKey(question.correctAnswer, answers[index])) score += 1;
  }
  return score;
}

export function leaguePoints(score: number): number {
  return score * LEAGUE_POINTS_PER_CORRECT;
}

/** The indices a "retry wrong ones" run should cover: answered and wrong. */
export function wrongIndices(questions: GrammarQuestion[], answers: Answers): number[] {
  const out: number[] = [];
  for (const [index, question] of questions.entries()) {
    const selected = answers[index];
    if (selected !== undefined && !isCorrectKey(question.correctAnswer, selected)) {
      out.push(index);
    }
  }
  return out;
}

/**
 * Pick the questions for a session of a chosen length.
 *
 * The app offers a question-count sheet rather than serving all 300 at once.
 * Questions are taken in their server order (order_num, then id) — the app does
 * not shuffle the question list for a topic quiz, so neither do we, or the two
 * clients would present different questions for the same session.
 */
export function selectSession(
  questions: GrammarQuestion[],
  length: number
): GrammarQuestion[] {
  if (length <= 0) return [];
  return questions.slice(0, Math.min(length, questions.length));
}

/** Session lengths offered on the quiz setup screen. */
export const SESSION_LENGTHS = [10, 20, 30, 50] as const;
