'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { Sheet } from '@/components/ui/sheet';
import { IconClose, IconGrammar } from '@/components/ui/icons';

/**
 * The frame around Learn when it is opened from the grammar list.
 *
 * Closing goes *back* rather than to a fixed URL, so the list returns with its
 * scroll position and topic selection intact — which is the whole point of a
 * sheet over a page. The brief delay before `router.back()` lets the close
 * animation finish instead of the sheet vanishing mid-frame.
 */
export function StudySheetModal({
  label,
  eyebrow,
  title,
  quizLabel,
  quizHref,
  closeLabel,
  children,
}: {
  label: string;
  eyebrow: string;
  title: string;
  quizLabel: string;
  quizHref: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  function close() {
    setOpen(false);
    window.setTimeout(() => router.back(), 120);
  }

  return (
    <Sheet open={open} onClose={close} label={label}>
      <div className="p-6 pt-2 sm:pt-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="bg-secondary-container text-on-secondary-container grid size-12 shrink-0 place-items-center rounded-[var(--radius-logo)]">
            <IconGrammar className="size-6" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-on-surface-variant text-[length:var(--text-caption)] font-semibold">
              {eyebrow}
            </p>
            <h2 className="text-on-surface text-[length:var(--text-h3)] font-bold">
              <bdi lang="en">{title}</bdi>
            </h2>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label={closeLabel}
            className="text-on-surface-variant hover:bg-surface-2 -me-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full"
          >
            <IconClose className="size-5" />
          </button>
        </div>

        {children}

        <Link
          href={quizHref as Route}
          className="bg-primary text-on-primary mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 font-bold no-underline"
        >
          <IconGrammar className="size-5" />
          {quizLabel}
        </Link>
      </div>
    </Sheet>
  );
}
