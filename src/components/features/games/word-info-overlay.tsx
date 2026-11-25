'use client';

import { useSyncExternalStore } from 'react';

import { IconVolume } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { WordBuilderTargetWord } from '@/lib/game/word-builder/types';
import { speakingText, subscribeSpeaking, toggleSpeak } from '@/lib/vocab/speak';

export type WordInfoOverlayLabels = {
  meaning: string;
  example: string;
  speakWord: string;
  speakExample: string;
  close: string;
};

/**
 * Shared Word Info Bottom Sheet with TTS pronunciation for Word Builder
 * single-player sessions and 1v1 Duel educational word comparisons.
 */
export function WordInfoOverlay({
  target,
  glossLang,
  labels,
  onClose,
}: {
  target: WordBuilderTargetWord;
  glossLang: 'fa' | 'ckb';
  labels: WordInfoOverlayLabels;
  onClose: () => void;
}) {
  const spoken = useSyncExternalStore(subscribeSpeaking, speakingText, () => '');
  const speakingWord = spoken === target.word.trim();
  const speakingExample = Boolean(target.exampleEn && spoken === target.exampleEn.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={labels.meaning}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[26px] border-2 border-[#FFB300]/80 bg-[linear-gradient(135deg,#FFFDE7,#FFECB3)] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.22)] sm:rounded-[26px] dark:border-[#FFB300]/55 dark:bg-[linear-gradient(135deg,#2D2640,#1E1B24)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#5D4037]/25 dark:bg-white/25" />

        <div className="flex items-center justify-between gap-3">
          <p
            lang="en"
            dir="ltr"
            className="text-2xl font-black text-[#5D4037] dark:text-[#FFF8E1]"
          >
            {target.word}
          </p>
          <button
            type="button"
            onClick={() => toggleSpeak(target.word)}
            aria-label={labels.speakWord}
            title={labels.speakWord}
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-full transition-colors',
              speakingWord
                ? 'bg-primary text-on-primary'
                : 'bg-[#FFB300]/30 text-[#5D4037] hover:bg-[#FFB300]/50 dark:bg-white/15 dark:text-[#FFF8E1]'
            )}
          >
            <IconVolume className="size-5" />
          </button>
        </div>

        {target.meaning ? (
          <p
            lang={glossLang}
            dir="rtl"
            className="text-primary mt-2.5 text-right text-lg font-extrabold"
          >
            {target.meaning}
          </p>
        ) : null}

        {target.exampleEn ? (
          <div className="mt-4 rounded-2xl border border-[#FFB300]/35 bg-white/60 p-3.5 dark:border-white/15 dark:bg-white/10">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-[#8D6E63] dark:text-[#FFECB3]/75">
                {labels.example}
              </p>
              <button
                type="button"
                onClick={() => toggleSpeak(target.exampleEn)}
                aria-label={labels.speakExample}
                title={labels.speakExample}
                className={cn(
                  'grid size-8 place-items-center rounded-full transition-colors',
                  speakingExample
                    ? 'bg-primary text-on-primary'
                    : 'bg-black/5 text-[#5D4037] dark:bg-white/10 dark:text-[#FFF8E1]'
                )}
              >
                <IconVolume className="size-4" />
              </button>
            </div>
            <p
              lang="en"
              dir="ltr"
              className="mt-1 text-sm leading-relaxed text-[#5D4037] italic dark:text-white/90"
            >
              {target.exampleEn}
            </p>
            {target.exampleGloss && target.exampleGloss !== target.exampleEn ? (
              <p
                lang={glossLang}
                dir="rtl"
                className="text-primary mt-1.5 text-right text-sm font-bold"
              >
                {target.exampleGloss}
              </p>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-12 w-full rounded-full bg-[#FFB300] font-extrabold text-[#4E342E] shadow-sm transition-transform active:scale-[0.98]"
        >
          {labels.close}
        </button>
      </div>
    </div>
  );
}
