/**
 * Device-local study goal — same storage shape as the app's learning_goal_provider.
 */

export type LearningGoal = {
  startedOn: string;
  totalDays: number;
  title: string;
};

export const LEARNING_GOAL_KEY = 'learning_goal_v1';

function dateOnly(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function decodeGoal(raw: string): LearningGoal | null {
  const parts = raw.split('\x1F');
  if (parts.length < 2) return null;
  const started = Date.parse(parts[0] ?? '');
  const totalDays = Number.parseInt(parts[1] ?? '', 10);
  if (!Number.isFinite(started) || !Number.isFinite(totalDays) || totalDays <= 0) return null;
  const title = parts.length >= 3 ? parts.slice(2).join('\x1F') : '';
  return { startedOn: parts[0] ?? '', totalDays, title };
}

export function encodeGoal(goal: LearningGoal): string {
  return `${goal.startedOn}\x1F${goal.totalDays}\x1F${goal.title}`;
}

export function goalProgress(goal: LearningGoal, now = new Date()) {
  const start = dateOnly(new Date(goal.startedOn));
  const today = dateOnly(now);
  const elapsed = Math.min(
    goal.totalDays,
    Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86_400_000))
  );
  const remaining = goal.totalDays - elapsed;
  const pct = goal.totalDays > 0 ? Math.round((elapsed / goal.totalDays) * 100) : 0;
  return { elapsed, remaining, pct: Math.min(100, Math.max(0, pct)) };
}

export function newGoal(days: number, title: string): LearningGoal {
  const totalDays = Math.min(3650, Math.max(1, days));
  return {
    startedOn: dateOnly(new Date()).toISOString().slice(0, 10),
    totalDays,
    title: title.trim(),
  };
}
