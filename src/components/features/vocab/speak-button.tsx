'use client';

import { useSyncExternalStore } from 'react';

import { IconVoice, IconVolume } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { speakingText, subscribeSpeaking, toggleSpeak } from '@/lib/vocab/speak';

function useIsSpeaking(text: string) {
  const current = useSyncExternalStore(subscribeSpeaking, speakingText, () => '');
  return text.trim().length > 0 && current === text.trim();
}

export function SpeakButton({
  text,
  label,
  voice = false,
  className,
}: {
  text: string;
  label: string;
  voice?: boolean;
  className?: string;
}) {
  const speaking = useIsSpeaking(text);
  const Icon = voice ? IconVoice : IconVolume;
  if (!text.trim()) return null;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={speaking}
      title={label}
      onClick={() => toggleSpeak(text)}
      className={cn(
        'grid size-10 place-items-center rounded-full',
        speaking
          ? 'bg-primary-container text-on-primary-container'
          : 'bg-surface-3 text-on-surface-variant',
        className
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
