/** Same as Flutter `kWordBuilderWordsPerLevel`. */
export const WORDS_PER_LEVEL = 3;

/** Same as Flutter `kWordBuilderLevelsPerLengthBand`. */
export const LEVELS_PER_LENGTH_BAND = 3;

export const MEANING_FEEDBACK_PREFIX = '__hint_meaning\x1f';

export const COINS_INITIAL_BALANCE = 36;

export function coinsPerCorrectWord(): number {
  return WORDS_PER_LEVEL * 4;
}

export function coinsLevelCompleteBonus(): number {
  return WORDS_PER_LEVEL * 3;
}

export function coinsCostHintLetter(): number {
  return WORDS_PER_LEVEL * 2;
}

export function coinsCostHintMeaning(): number {
  return WORDS_PER_LEVEL * 4;
}

export const COINS_STORAGE_KEY = 'word_builder_coins_v1';
