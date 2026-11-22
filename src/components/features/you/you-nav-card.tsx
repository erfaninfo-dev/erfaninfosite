import Link from 'next/link';
import type { Route } from 'next';

import { JellyIconBubble } from '@/components/features/you/jelly-icon-bubble';
import { IconChevron } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

export function YouNavCard({
  href,
  title,
  subtitle,
  icon,
  tone = 'primary',
  badge,
  badgeTone = 'primary',
}: {
  href: Route;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'error';
  badge?: string;
  badgeTone?: 'primary' | 'secondary' | 'tertiary' | 'error';
}) {
  const badgeClasses = {
    primary: 'bg-primary-container text-on-primary-container',
    secondary: 'bg-secondary-container text-on-secondary-container',
    tertiary: 'bg-tertiary-container text-on-tertiary-container',
    error: 'bg-error text-on-error',
  } as const;
  return (
    <Link
      href={href}
      className={cn(
        'jelly-card flex min-h-[5.5rem] items-center gap-3.5 rounded-[var(--radius-card)] p-4 no-underline',
        'shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95'
      )}
    >
      <JellyIconBubble tone={tone}>{icon}</JellyIconBubble>
      <span className="min-w-0 flex-1">
        <span className="text-on-surface block font-extrabold">{title}</span>
        <span className="text-on-surface-variant mt-0.5 block text-sm leading-snug">{subtitle}</span>
      </span>
      {badge ? (
        <span
          className={cn(
            'min-w-8 rounded-full px-2 py-1 text-center text-xs font-extrabold tabular-nums',
            badgeClasses[badgeTone]
          )}
        >
          {badge}
        </span>
      ) : null}
      <IconChevron className="text-on-surface-variant size-5 shrink-0 opacity-70" />
    </Link>
  );
}
