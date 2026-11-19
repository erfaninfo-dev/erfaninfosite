/**
 * Word Builder types — mirrors the Flutter app's domain models for CLASSIC mode,
 * without tray-scene / campaign-mode extras.
 */

export type WordBuilderDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type WordBuilderTargetWord = {
  word: string;
  meaning: string;
  exampleEn: string;
  exampleGloss: string;
};

export type WordBuilderLevel = {
  levelId: number;
  difficulty: WordBuilderDifficulty;
  category: string;
  /** Letter multiset expanded to individual characters (lowercase). */
  letters: string[];
  targetWords: WordBuilderTargetWord[];
};

export type LetterInstance = {
  id: number;
  char: string;
};

export type WordBuilderSourceWord = {
  word: string;
  meaning: string;
  exampleEn: string;
  exampleGloss: string;
};
