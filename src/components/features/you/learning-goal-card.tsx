'use client';

import { useEffect, useState } from 'react';

import { JellyIconBubble } from '@/components/features/you/jelly-icon-bubble';
import { IconFlag } from '@/components/ui/icons';
import {
  decodeGoal,
  encodeGoal,
  goalProgress,
  LEARNING_GOAL_KEY,
  newGoal,
  type LearningGoal,
} from '@/lib/you/learning-goal';
import { learningGoalCopy } from '@/lib/you/learning-goal-copy';
import type { Locale } from '@/lib/i18n/config';

export function LearningGoalCard({ locale }: { locale: Locale }) {
  const copy = learningGoalCopy(locale);
  const [goal, setGoal] = useState<LearningGoal | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [days, setDays] = useState('30');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LEARNING_GOAL_KEY);
      if (raw) setGoal(decodeGoal(raw));
    } catch {
      /* ignore */
    }
  }, []);

  function persist(next: LearningGoal | null) {
    setGoal(next);
    try {
      if (next) localStorage.setItem(LEARNING_GOAL_KEY, encodeGoal(next));
      else localStorage.removeItem(LEARNING_GOAL_KEY);
    } catch {
      /* ignore */
    }
  }

  function openSetup() {
    setTitle('');
    setDays('30');
    setEditing(true);
  }

  function save() {
    const trimmed = title.trim();
    const n = Number.parseInt(days, 10);
    if (!trimmed) return;
    if (!Number.isFinite(n) || n <= 0) return;
    if (n > 3650) return;
    persist(newGoal(n, trimmed));
    setEditing(false);
  }

  const progress = goal ? goalProgress(goal) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => (goal ? setEditing(true) : openSetup())}
        className="jelly-card flex w-full items-center gap-3.5 rounded-[var(--radius-card)] p-4 text-start shadow-[var(--shadow-soft)]"
      >
        <JellyIconBubble tone="primary">
          <IconFlag className="size-5" />
        </JellyIconBubble>
        <span className="min-w-0 flex-1">
          <span className="text-on-surface block font-extrabold">
            {goal?.title.trim() || copy.cardTitle}
          </span>
          <span className="text-on-surface-variant mt-0.5 block text-sm leading-snug">
            {goal && progress
              ? copy.summarySubtitle(progress.remaining, goal.totalDays)
              : copy.cardPromptSubtitle}
          </span>
          {goal && progress ? (
            <span className="bg-surface-3 mt-3 block h-2 overflow-hidden rounded-full">
              <span
                className="bg-primary block h-full rounded-full transition-all"
                style={{ width: `${progress.pct}%` }}
              />
            </span>
          ) : null}
        </span>
        {!goal ? (
          <JellyIconBubble tone="secondary" size={36}>
            <IconAdd className="size-5" />
          </JellyIconBubble>
        ) : null}
      </button>

      {editing ? (
        <div
          className="border-outline-variant/60 bg-surface-1 fixed inset-x-4 bottom-[calc(var(--size-bottom-nav)+1rem)] z-50 rounded-[var(--radius-card)] border p-5 shadow-[var(--shadow-soft)] sm:inset-x-auto sm:start-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 rtl:sm:translate-x-1/2"
          role="dialog"
          aria-modal="true"
        >
          <h3 className="text-on-surface mb-4 text-lg font-extrabold">{copy.dialogTitle}</h3>
          <div className="flex flex-col gap-3">
            <label className="text-on-surface text-sm font-bold">
              {copy.dialogGoalLabel}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={copy.dialogGoalHint}
                className="bg-surface-3 text-on-surface mt-1 h-12 w-full rounded-[var(--radius-input)] border-0 px-4"
              />
            </label>
            <label className="text-on-surface text-sm font-bold">
              {copy.dialogFieldLabel}
              <input
                inputMode="numeric"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="bg-surface-3 text-on-surface mt-1 h-12 w-full rounded-[var(--radius-input)] border-0 px-4"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-on-surface-variant min-h-11 flex-1 rounded-full font-bold"
              >
                {copy.cancel}
              </button>
              {goal ? (
                <button
                  type="button"
                  onClick={() => {
                    persist(null);
                    setEditing(false);
                  }}
                  className="border-outline-strong text-on-surface min-h-11 flex-1 rounded-full border font-bold"
                >
                  {copy.clear}
                </button>
              ) : null}
              <button
                type="button"
                onClick={save}
                className="bg-primary text-on-primary min-h-11 flex-[1.2] rounded-full font-extrabold"
              >
                {copy.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function IconAdd(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
