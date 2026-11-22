'use client';

import { cn } from '@/lib/cn';
import { normalizeWord } from '@/lib/game/word-builder/logic';
import type { WordBuilderLevel, WordBuilderTargetWord } from '@/lib/game/word-builder/types';

/**
 * Target-word answer slots matching Flutter's `AnswerSlotsPanel`
 * (`lib/features/word_builder/presentation/widgets/answer_slots.dart`).
 *
 * - Empty cells: frosted white glass over MagicBackground with center dot `·`
 * - Hint-revealed cells: mint green gradient (`#C8E6C9 -> #81C784`)
 * - Solved word cells: emerald green gradient (`#66BB6A -> #2E7D32`) + white bold letter,
 *   tappable to inspect meaning, pronunciation, and examples.
 */
export function AnswerSlots({
  level,
  solvedLower,
  revealedPositions,
  onSolvedWordTap,
}: {
  level: WordBuilderLevel;
  solvedLower: ReadonlySet<string>;
  revealedPositions: ReadonlyMap<string, ReadonlySet<number>>;
  onSolvedWordTap?: (target: WordBuilderTargetWord) => void;
}) {
  return (
    <div
      dir="ltr"
      lang="en"
      className="flex flex-col items-center gap-[clamp(0.45rem,1.2dvh,0.75rem)]"
    >
      {level.targetWords.map((target) => {
        const key = normalizeWord(target.word);
        const solved = solvedLower.has(key);
        const revealed = revealedPositions.get(key) ?? new Set<number>();
        const chars = [...target.word];

        return (
          <div
            key={key}
            className="flex flex-wrap items-center justify-center gap-[clamp(0.35rem,1dvh,0.65rem)]"
          >
            {chars.map((ch, i) => {
              const show = solved || revealed.has(i);
              const letter = show ? ch.toUpperCase() : null;
              return (
                <SlotCell
                  key={`${key}-${i}`}
                  letter={letter}
                  solved={solved}
                  hint={!solved && revealed.has(i)}
                  onClick={
                    solved && onSolvedWordTap ? () => onSolvedWordTap(target) : undefined
                  }
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function SlotCell({
  letter,
  solved,
  hint,
  onClick,
}: {
  letter: string | null;
  solved: boolean;
  hint: boolean;
  onClick?: () => void;
}) {
  const show = letter !== null;
  const Tag = onClick ? 'button' : 'span';

  const style =
    solved && show
      ? {
          backgroundImage: 'linear-gradient(180deg, #66BB6A, #2E7D32)',
          borderColor: 'rgba(27, 94, 32, 0.85)',
          boxShadow: '0 3px 10px rgba(46, 125, 50, 0.34)',
        }
      : hint && show
        ? {
            backgroundImage: 'linear-gradient(180deg, #C8E6C9, #81C784)',
            borderColor: 'rgba(67, 160, 71, 0.72)',
            boxShadow: '0 3px 10px rgba(129, 199, 132, 0.25)',
          }
        : {
            boxShadow: '0 3px 8px rgba(0, 0, 0, 0.08)',
          };

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      style={style}
      className={cn(
        'grid h-[clamp(2.35rem,5.4dvh,3.15rem)] w-[clamp(2.05rem,4.7dvh,2.75rem)] place-items-center rounded-[13px] text-[length:clamp(0.95rem,2.5dvh,1.35rem)] font-extrabold tracking-wide transition-transform duration-150',
        show ? 'border-2' : 'border-[1.5px]',
        solved && show && 'text-white hover:scale-105 active:scale-95',
        hint && show && !solved && 'text-[#2E7D32]',
        !show &&
          'border-white/60 bg-white/38 text-[#5D4037]/50 dark:border-white/30 dark:bg-white/15 dark:text-white/50'
      )}
    >
      {show ? letter : '·'}
    </Tag>
  );
}
