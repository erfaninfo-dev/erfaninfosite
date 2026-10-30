import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * The four states every data screen must implement (ui-ux-spec.md §6):
 * loading, empty, error, loaded. Loading is a skeleton shaped like the real
 * content, never a centred spinner on a blank page.
 */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-[var(--radius-sm)] bg-surface-4', className)}
    />
  );
}

/** A skeleton shaped like a card grid, so nothing jumps when data arrives. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(17rem, 100%), 1fr))' }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-[var(--radius-card)] border border-outline-variant/60 bg-surface-1 p-5 dark:bg-surface-2"
        >
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** A skeleton shaped like a word list row. */
export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="divide-y divide-outline-variant/50 rounded-[var(--radius-card)] border border-outline-variant/60 bg-surface-1 dark:bg-surface-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-5 w-32 shrink-0" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-outline-variant bg-surface-2/50 px-6 py-12 text-center">
      <p className="text-[length:var(--text-h4)] font-semibold text-on-surface">{title}</p>
      {body ? (
        <p className="mx-auto mt-2 max-w-[42ch] text-on-surface-variant">{body}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

/**
 * An error the reader can act on: plain language in their own language, and a
 * way to try again. Never a stack trace, never an English message on a Kurdish
 * page.
 */
export function ErrorState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-card)] border border-error/40 bg-error-container/40 px-6 py-10 text-center"
    >
      <p className="text-[length:var(--text-h4)] font-semibold text-on-error-container">
        {title}
      </p>
      {body ? (
        <p className="mx-auto mt-2 max-w-[42ch] text-on-error-container/90">{body}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
