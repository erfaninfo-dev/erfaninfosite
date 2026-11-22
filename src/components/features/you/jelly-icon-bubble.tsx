import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function JellyIconBubble({
  children,
  className,
  tone = 'primary',
  size = 44,
}: {
  children: ReactNode;
  className?: string;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'error';
  size?: number;
}) {
  const tones = {
    primary: 'bg-primary text-on-primary',
    secondary: 'bg-secondary text-on-secondary',
    tertiary: 'bg-tertiary text-on-tertiary',
    error: 'bg-error text-on-error',
  } as const;
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-2xl', tones[tone], className)}
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  );
}

export function JellyCountBadge({
  label,
  tone = 'primary',
  className,
}: {
  label: string;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'error';
  className?: string;
}) {
  const tones = {
    primary: 'bg-primary-container text-on-primary-container',
    secondary: 'bg-secondary-container text-on-secondary-container',
    tertiary: 'bg-tertiary-container text-on-tertiary-container',
    error: 'bg-error text-on-error',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex min-w-7 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-center text-xs font-extrabold tabular-nums',
        tones[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
