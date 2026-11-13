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
