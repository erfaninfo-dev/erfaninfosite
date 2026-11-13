'use client';

import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * The word screen's two tabs, in the app's order: the sample text first,
 * then the words. A unit or section that has only one of them shows that
 * one and no tab bar.
 */

export function StudyTabs({
  textLabel,
  wordsLabel,
  text,
  words,
}: {
  textLabel: string;
  wordsLabel: string;
  text: ReactNode | null;
  words: ReactNode | null;
}) {
  const both = Boolean(text) && Boolean(words);
  const [tab, setTab] = useState<'text' | 'words'>(text ? 'text' : 'words');

  return (
    <div>
      {both ? (
        <div
          role="tablist"
          aria-label={wordsLabel}
          className="border-outline-strong bg-surface-1 mb-4 grid grid-cols-2 overflow-hidden rounded-full border"
        >
          <TabButton
            selected={tab === 'text'}
            label={textLabel}
            onClick={() => setTab('text')}
          />
          <TabButton
            selected={tab === 'words'}
            label={wordsLabel}
            onClick={() => setTab('words')}
          />
        </div>
      ) : null}

      {text ? (
        <div hidden={both && tab !== 'text'} role={both ? 'tabpanel' : undefined}>
          {text}
        </div>
      ) : null}
      {words ? (
        <div hidden={both && tab !== 'words'} role={both ? 'tabpanel' : undefined}>
          {words}
        </div>
      ) : null}
    </div>
  );
}

function TabButton({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'min-h-11 px-3 text-sm font-extrabold',
        selected ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
      )}
    >
      {label}
    </button>
  );
}
