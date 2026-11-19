'use client';

import { cn } from '@/lib/cn';
import { normalizeWord } from '@/lib/game/word-builder/logic';
import type { WordBuilderLevel, WordBuilderTargetWord } from '@/lib/game/word-builder/types';

/**
 * Blank letter cells for each target word. Solved rows fill in green;
 * hint-revealed letters show lightly. Always LTR — English spelling order.
 * Slot size tracks viewport height so three target rows stay compact.
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
    <div dir="ltr" lang="en" className="flex flex-col items-center gap-[clamp(0.35rem,1.1dvh,0.75rem)]">
      {level.targetWords.map((target) => {
        const key = normalizeWord(target.word);
        const solved = solvedLower.has(key);
        const revealed = revealedPositions.get(key) ?? new Set<number>();
        const chars = [...target.word];

        return (
          <div
            key={key}
            className="flex flex-wrap items-center justify-center gap-[clamp(0.25rem,0.9dvh,0.55rem)]"
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
                    solved && onSolvedWordTap
                      ? () => onSolvedWordTap(target)
                      : undefined
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

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'grid size-[clamp(1.65rem,4.2dvh,2.5rem)] place-items-center rounded-[var(--radius-sm)] border-2 text-[length:clamp(0.8rem,2.4dvh,1.05rem)] font-extrabold tracking-wide transition-[background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-enter)]',
        solved && show && 'border-correct bg-correct text-on-correct',
        hint &&
          show &&
          !solved &&
          'border-correct/70 bg-correct-container text-on-correct-container',
        !solved &&
          !hint &&
          'border-outline-variant/80 bg-surface-2 text-on-surface-variant/50 dark:bg-surface-3'
      )}
    >
      {show ? letter : '·'}
    </Tag>
  );
}
