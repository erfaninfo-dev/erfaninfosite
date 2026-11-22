'use client';

import { useSyncExternalStore } from 'react';

import { IconVolume } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import {
  cycleSpeakRate,
  getServerSpeakRate,
  getServerSpeakingText,
  getSpeakRate,
  speakingText,
  subscribeSpeakRate,
  subscribeSpeaking,
  toggleSpeak,
} from '@/lib/vocab/speak';

/**
 * Interactive speaker button for Speaking Part 1 questions, model answers,
 * band answers, and ideas. Highlights while reading its text and stops on
 * second click.
 */
export function SpeakButton({
  text,
  label = 'Listen',
  stopLabel = 'Stop',
  size = 'md',
  className,
}: {
  text: string;
  label?: string;
  stopLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const activeText = useSyncExternalStore(
    subscribeSpeaking,
    speakingText,
    getServerSpeakingText
  );
  const trimmed = text.trim();
  if (!trimmed) return null;

  const isPlaying = activeText === trimmed;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleSpeak(trimmed);
      }}
      aria-pressed={isPlaying}
      aria-label={isPlaying ? stopLabel : label}
      title={isPlaying ? stopLabel : label}
      className={cn(
        'grid shrink-0 place-items-center rounded-full transition-all duration-150 active:scale-95',
        size === 'sm' ? 'size-8' : 'size-9',
        isPlaying
          ? 'bg-[var(--accent,var(--color-primary))] text-white shadow-sm ring-2 ring-[color-mix(in_oklab,var(--accent,var(--color-primary))_35%,transparent)]'
          : 'bg-[color-mix(in_oklab,var(--accent,var(--color-primary))_12%,transparent)] text-[var(--accent,var(--color-primary))] hover:bg-[color-mix(in_oklab,var(--accent,var(--color-primary))_20%,transparent)]',
        className
      )}
    >
      {isPlaying ? (
        <StopSquareIcon className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      ) : (
        <IconVolume className={size === 'sm' ? 'size-4' : 'size-[18px]'} />
      )}
    </button>
  );
}

/**
 * Compact playback speed pill (`0.8×` / `1×` / `1.15×`) for Speaking Part 1
 * shadowing & listening practice.
 */
export function SpeakSpeedToggle({
  label = 'Speed',
  className,
}: {
  label?: string;
  className?: string;
}) {
  const rate = useSyncExternalStore(
    subscribeSpeakRate,
    getSpeakRate,
    getServerSpeakRate
  );

  const display = rate === 1 ? '1×' : `${rate}×`;

  return (
    <button
      type="button"
      onClick={() => cycleSpeakRate()}
      aria-label={`${label}: ${display}`}
      title={`${label}: ${display}`}
      dir="ltr"
      className={cn(
        'bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] hover:text-primary inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-extrabold tabular-nums transition-colors',
        className
      )}
    >
      <IconVolume className="text-primary size-3.5" />
      <span>{display}</span>
    </button>
  );
}

function StopSquareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <rect x="6" y="6" width="12" height="12" rx="2.5" />
    </svg>
  );
}
