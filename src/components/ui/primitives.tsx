import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/cn';

/** Small inline label — counts, levels, parts of speech. */
export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: 'neutral' | 'primary' | 'new';
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: 'bg-surface-4 text-on-surface-variant',
    primary: 'bg-primary-container text-on-primary-container',
    new: 'bg-tertiary-container text-on-tertiary-container',
  } as const;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-button)] px-2.5 py-1',
        'text-[length:var(--text-caption)] font-semibold whitespace-nowrap',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Page heading block. `h1` per page, and the main landmark receives focus on
 * route change so screen-reader users know the page changed.
 */
export function PageHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[length:var(--text-h1)]">{title}</h1>
          {description ? (
            <p className="text-on-surface-variant mt-2 max-w-[var(--container-prose)]">
              {description}
            </p>
          ) : null}
          {meta ? <div className="mt-3 flex flex-wrap gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function SectionHeading({
  children,
  id,
  action,
}: {
  children: ReactNode;
  id?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
      <h2 id={id} className="text-[length:var(--text-h2)]">
        {children}
      </h2>
      {action}
    </div>
  );
}

/**
 * Isolates a run of Latin text inside RTL copy so the bidi algorithm does not
 * reorder it — "IELTS Part 1" inside a Persian sentence, for example.
 */
export function Isolated({ children }: { children: ReactNode }) {
  return <bdi>{children}</bdi>;
}

/**
 * A study-text block: plain text with \r\n breaks, capped at a readable
 * measure. The API's bilingual blobs are not HTML and are never rendered as
 * such — no dangerouslySetInnerHTML anywhere in this project.
 */
export function StudyText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn('study-text max-w-[var(--container-prose)]', className)}>
      {children}
    </div>
  );
}

export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('max-w-[var(--container-prose)]', className)}>{children}</div>
  );
}

/** A labelled field shown as a card row below `md` and a table cell above it. */
export function DataRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2 py-1">
      <span className="text-on-surface-variant text-[length:var(--text-caption)] font-semibold">
        {label}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-outline-variant/60 border-0 border-t', className)} />;
}

export function Container({
  size = 'content',
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<'div'> & {
  size?: 'prose' | 'quiz' | 'content' | 'wide';
  children: ReactNode;
}) {
  const widths = {
    prose: 'max-w-[var(--container-prose)]',
    quiz: 'max-w-[var(--container-quiz)]',
    content: 'max-w-[var(--container-content)]',
    wide: 'max-w-[var(--container-wide)]',
  } as const;

  return (
    <div {...rest} className={cn('page-gutter mx-auto w-full', widths[size], className)}>
      {children}
    </div>
  );
}
