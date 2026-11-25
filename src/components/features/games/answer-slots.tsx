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
  variant = 'classic',
}: {
  level: WordBuilderLevel;
  solvedLower: ReadonlySet<string>;
  revealedPositions: ReadonlyMap<string, ReadonlySet<number>>;
  onSolvedWordTap?: (target: WordBuilderTargetWord) => void;
  variant?: 'classic' | 'duel';
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
            className="flex flex-wrap items-center justify-center gap-[clamp(0.38rem,1.05dvh,0.68rem)]"
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
                  variant={variant}
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
  variant,
  onClick,
}: {
  letter: string | null;
  solved: boolean;
  hint: boolean;
  variant: 'classic' | 'duel';
  onClick?: () => void;
}) {
  const show = letter !== null;
  const Tag = onClick ? 'button' : 'span';

  if (variant === 'duel') {
    const style =
      solved && show
        ? {
            backgroundImage: 'linear-gradient(180deg, #62EA5A 0%, #27B63B 58%, #1A942D 100%)',
            borderColor: '#167D27',
            boxShadow:
              '0 4px 0 #136B22, 0 8px 16px rgba(26, 148, 45, 0.36), inset 0 2px 3px rgba(255, 255, 255, 0.55)',
          }
        : hint && show
          ? {
              backgroundImage: 'linear-gradient(180deg, #DCEDC8 0%, #9CCC65 100%)',
              borderColor: '#558B2F',
              boxShadow:
                '0 3px 0 rgba(51, 105, 30, 0.38), inset 0 2px 3px rgba(255, 255, 255, 0.65)',
            }
          : undefined;

    return (
      <Tag
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        style={style}
        className={cn(
          'relative grid h-[clamp(2.55rem,5.7dvh,3.25rem)] w-[clamp(2.35rem,5.2dvh,3rem)] place-items-center rounded-[14px] text-[length:clamp(1.1rem,2.7dvh,1.5rem)] font-black tracking-wide transition-transform duration-150',
          show ? 'border-2' : 'border-[1.5px]',
          solved && show && 'text-white hover:scale-105 active:scale-95 [text-shadow:0_2px_3px_rgba(0,0,0,0.28)]',
          hint && show && !solved && 'text-[#1B5E20]',
          !show &&
            'border-[#FFF0CC]/90 bg-[linear-gradient(180deg,#FFF6E0,#F4D7A1)] shadow-[0_3.5px_0_rgba(166,108,42,0.28),inset_0_2px_3px_rgba(255,255,255,0.8)] dark:border-white/25 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))] dark:shadow-[0_3px_0_rgba(0,0,0,0.32)]'
        )}
      >
        {solved && show ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-1.5 top-1 h-2 rounded-full bg-white/35"
          />
        ) : null}
        {show ? letter : null}
      </Tag>
    );
  }

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
