'use client';

import { useState } from 'react';

import type { CambridgeScore } from '@/lib/cambridge/api';
import { estimateIeltsBand, formatBandScore } from '@/lib/cambridge/band-score';
import type { CambridgeSkill } from '@/lib/cambridge/labels';

/**
 * Mirrors Testino's Result / Report Sheet (`cambridge_report_dialog.dart`):
 * blurred backdrop, #F6F6F6 rounded-2xl sheet (max 722px), 3 white stat cards
 * (Answered Questions, Correct Answers, Official IELTS Band Score X/9),
 * Show-All toggle on Correct Answer column, eye-to-reveal per row, and click-to-jump.
 */
export function CambridgeReportDialog({
  title,
  skill,
  score,
  mode,
  reviewCtaLabel,
  onClose,
  onOpenQuestion,
  onSwitchToPractice,
}: {
  title: string;
  skill: CambridgeSkill;
  score: CambridgeScore;
  mode?: 'practice' | 'exam';
  reviewCtaLabel?: string;
  onClose: () => void;
  onOpenQuestion: (number: number) => void;
  onSwitchToPractice?: () => void;
}) {
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());

  const items = score.items;
  const total = score.max ?? items.length;
  const answered = items.filter((i) => i.yours.trim().length > 0).length;
  const correct = items.filter((i) => i.correct).length;
  const band = score.bandScore ?? estimateIeltsBand(skill, correct, total) ?? 0;
  const bandText = formatBandScore(band);
  const allRevealed = items.length > 0 && revealed.size >= items.length;

  function toggleAllAnswers() {
    if (allRevealed) {
      setRevealed(new Set());
    } else {
      setRevealed(new Set(items.map((it) => it.number)));
    }
  }

  return (
    <div
      dir="ltr"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-[#202327]/20 p-4 backdrop-blur-[4px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(740px,calc(100dvh-32px))] w-full max-w-[740px] flex-col overflow-hidden rounded-[16px] bg-[#F6F6F6] p-4 text-[#202327] shadow-2xl"
      >
        {/* Header */}
        <div className="relative flex h-[42px] shrink-0 items-center justify-center">
          <div className="flex items-center gap-2 px-10">
            <h2 className="truncate text-[20px] font-normal text-[#8E979F]">{title}</h2>
            {mode ? (
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase text-[#4F575E] ring-1 ring-[#E5E7EB]">
                {mode === 'exam' ? 'Exam mode' : 'Practice'}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report"
            className="absolute right-0 grid size-[42px] cursor-pointer place-items-center rounded-full text-[#202327] hover:bg-black/5"
          >
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* 3 Official Stat Pills */}
        <div className="mt-4 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-[268fr_240fr_164fr]">
          <div className="flex h-[44px] items-center gap-2 rounded-[12px] border border-[#E5E7EB] bg-white px-4 text-[#4F575E]">
            <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-[#8E979F]" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span className="flex-1 truncate text-[14.5px]">Answered Questions</span>
            <span className="text-[15px] font-semibold tabular-nums">
              {answered}/{total}
            </span>
          </div>

          <div className="flex h-[44px] items-center gap-2 rounded-[12px] border border-[#E5E7EB] bg-white px-4 text-[#4F575E]">
            <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-[#8E979F]" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span className="flex-1 truncate text-[14.5px]">Correct Answers</span>
            <span className="text-[15px] font-semibold tabular-nums">
              {correct}/{total}
            </span>
          </div>

          <div className="flex h-[44px] items-center gap-2 rounded-[12px] border border-[#077F83]/30 bg-white px-4 text-[#077F83]">
            <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="5" />
              <path d="M8.5 13 7 21l5-2.5L17 21l-1.5-8" />
            </svg>
            <span className="flex-1 truncate text-[14.5px] font-semibold">Band</span>
            <span className="text-[16px] font-extrabold tabular-nums">{bandText}/9</span>
          </div>
        </div>

        {/* Column Header + Show All Answers toggle */}
        <div className="mt-5 mb-2 grid shrink-0 grid-cols-[1fr_3.5fr_4.5fr_3fr] items-center gap-3 pe-3.5 text-[12px] font-semibold text-[#A7AEB4]">
          <span className="ps-4">Id</span>
          <span className="ps-2">Question</span>
          <div className="flex items-center justify-center gap-2">
            <span>Correct Answer</span>
            {items.length > 0 ? (
              <button
                type="button"
                onClick={toggleAllAnswers}
                className="cursor-pointer rounded bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#077F83] ring-1 ring-[#077F83]/30 hover:bg-[#077F83]/10"
              >
                {allRevealed ? 'Hide all' : 'Show all'}
              </button>
            ) : null}
          </div>
          <span className="text-center">Your Answer</span>
        </div>

        {/* Scrollable Rows */}
        <div className="ielts-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pe-2 pb-1">
          {items.map((item) => {
            const isRevealed = revealed.has(item.number);
            const yours = item.yours.trim();
            return (
              <div
                key={item.number}
                className="grid min-h-[42px] grid-cols-[1fr_3.5fr_4.5fr_3fr] items-center gap-3 rounded-[12px] border border-[#E5E7EB] bg-white py-2 text-[15px]"
              >
                <span className="text-center tabular-nums">{item.number}</span>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenQuestion(item.number);
                  }}
                  className="cursor-pointer truncate ps-2 text-left text-[#4F575E] underline decoration-[#4F575E] hover:text-[#202327]"
                >
                  question {item.number}
                </button>

                <div className="flex items-center justify-center px-1 text-center">
                  {isRevealed ? (
                    <span className="line-clamp-2 text-[14px] font-medium text-[#202327]">
                      {item.expected}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setRevealed((prev) => {
                          const next = new Set(prev);
                          next.add(item.number);
                          return next;
                        })
                      }
                      aria-label={`Reveal answer ${item.number}`}
                      className="grid size-7 cursor-pointer place-items-center rounded-full text-[#202327] hover:bg-black/5"
                    >
                      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  )}
                </div>

                <span
                  className="line-clamp-2 px-1 text-center text-[14px] font-medium"
                  style={{ color: item.correct ? '#22C55E' : '#EF4444' }}
                >
                  {yours || '–'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer CTA when finishing Exam Mode → Review in Practice Mode (exact Testino flow) */}
        {mode === 'exam' && onSwitchToPractice ? (
          <div className="mt-3 flex shrink-0 items-center justify-between gap-3 border-t border-[#E5E7EB] pt-3">
            <span className="text-xs font-medium text-[#6B767F]">
              {score.saved ? '✓ Saved to your account' : 'Official IELTS 40-question band scale'}
            </span>
            <button
              type="button"
              onClick={onSwitchToPractice}
              className="cursor-pointer rounded-[8px] bg-[#077F83] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
            >
              {reviewCtaLabel ?? 'Review in Practice mode'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
