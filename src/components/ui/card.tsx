import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * The app is strictly `elevation: 0` — cards are separated from the page by
 * surface tone, not by shadow. See docs/design-tokens.md §4.
 */
const CARD_BASE =
  'rounded-[var(--radius-card)] bg-surface-1 border border-outline-variant/60 ' +
  'dark:bg-surface-2 dark:border-outline-variant/40';

export function Card({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<'div'> & { children: ReactNode }) {
  return (
    <div {...rest} className={cn(CARD_BASE, 'p-5', className)}>
      {children}
    </div>
  );
}

/**
 * A card that is entirely a link.
 *
 * Equal heights in a grid row come from `h-full` plus the grid's default
 * `stretch`, so a long Kurdish title never shifts its neighbours.
 */
export function CardLink({
  href,
  className,
  children,
  ...rest
}: Omit<ComponentPropsWithoutRef<typeof Link>, 'className' | 'children'> & {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      {...rest}
      href={href}
      className={cn(
        CARD_BASE,
        'flex h-full flex-col p-5 no-underline',
        'transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-enter)]',
        'hover:border-primary/40 hover:bg-surface-2 dark:hover:bg-surface-3',
        className
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Auto-fitting card grid. The column count adapts to the width rather than
 * being switched at breakpoints, per ui-ux-spec.md §2.5.
 */
export function CardGrid({
  min = '17rem',
  className,
  children,
}: {
  min?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn('grid gap-4', className)}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}, 100%), 1fr))` }}
    >
      {children}
    </div>
  );
}
