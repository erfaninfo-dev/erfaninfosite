'use client';

import { useState } from 'react';

import { JellyCountBadge, JellyIconBubble } from '@/components/features/you/jelly-icon-bubble';
import { IconCalendar, IconCheck, IconClock, IconSchool } from '@/components/ui/icons';
import type {
  ClassScheduleSlot,
  ClassSession,
  SessionBlock,
  StudentClassSessions,
} from '@/lib/auth/panel-types';
import { cn } from '@/lib/cn';
import { formatClient } from '@/lib/i18n/client-format';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';

export type StudentClassSessionsLabels = {
  personalTab: string;
  weeklyScheduleTab: string;
  sessionsSubtitle: string;
  groupSubtitle: string;
  sessionsEmpty: string;
  scheduleSubtitle: string;
  scheduleEmpty: string;
  termTitleTemplate: string;
  termSessionsProgressTemplate: string;
  sessionHeadingTemplate: string;
  paid: string;
  unpaid: string;
};

function parseRecordedDate(raw: string): Date | null {
  if (!raw.trim()) return null;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

function groupSessionsByDay(sessions: ClassSession[]): Array<{ dayKey: string; date: Date | null; items: ClassSession[] }> {
  const byDay = new Map<string, { date: Date; items: ClassSession[] }>();
  const unparsed: ClassSession[] = [];

  for (const s of sessions) {
    const dt = parseRecordedDate(s.recordedAt);
    if (!dt) {
      unparsed.push(s);
      continue;
    }
    const day = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const bucket = byDay.get(key);
    if (bucket) bucket.items.push(s);
    else byDay.set(key, { date: day, items: [s] });
  }

  for (const bucket of byDay.values()) {
    bucket.items.sort((a, b) => {
      const da = parseRecordedDate(a.recordedAt)?.getTime() ?? 0;
      const db = parseRecordedDate(b.recordedAt)?.getTime() ?? 0;
      return db - da;
    });
  }

  const out: Array<{ dayKey: string; date: Date | null; items: ClassSession[] }> = [...byDay.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dayKey, val]) => ({ dayKey, date: val.date, items: val.items }));

  if (unparsed.length > 0) {
    out.push({ dayKey: 'unknown', date: null, items: unparsed });
  }
  return out;
}

function chronologicalIndexMap(sessions: ClassSession[]): Map<number, number> {
  const asc = [...sessions].sort((a, b) => {
    const da = parseRecordedDate(a.recordedAt)?.getTime() ?? 0;
    const db = parseRecordedDate(b.recordedAt)?.getTime() ?? 0;
    return da - db || a.id - b.id;
  });
  const map = new Map<number, number>();
  asc.forEach((s, i) => {
    map.set(s.id, i + 1);
  });
  return map;
}

function weekdayOrderFor(locale: Locale): number[] {
  // Saturday-first for Persian & Kurdish, Monday-first for English (matching Flutter `weekdayDisplayOrder`).
  return locale === 'fa' || locale === 'ckb' ? [6, 7, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7];
}

function weekdayName(weekday: number, locale: Locale): string {
  const monday = new Date(2024, 0, 1);
  const d = new Date(monday);
  d.setDate(monday.getDate() + (weekday - 1));
  return new Intl.DateTimeFormat(NUMBER_LOCALE[locale], { weekday: 'long' }).format(d);
}

export function StudentClassSessionsView({
  locale,
  sessions,
  schedule,
  labels,
  initialSubTab = 'personal',
}: {
  locale: Locale;
  sessions: StudentClassSessions;
  schedule: ClassScheduleSlot[] | null;
  labels: StudentClassSessionsLabels;
  initialSubTab?: string;
}) {
  const tabs: Array<{ id: string; label: string }> = [
    { id: 'personal', label: labels.personalTab },
    ...sessions.groups.map((g) => ({ id: `group-${g.id}`, label: g.name })),
    { id: 'schedule', label: labels.weeklyScheduleTab },
  ];

  const [subTab, setSubTab] = useState(
    tabs.some((t) => t.id === initialSubTab) ? initialSubTab : 'personal'
  );

  const activeGroup = subTab.startsWith('group-')
    ? sessions.groups.find((g) => `group-${g.id}` === subTab) ?? null
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-tabs matching Flutter `StudentClassSessionsScreen` */}
      <div
        role="tablist"
        className="border-outline-variant/45 flex gap-1 overflow-x-auto border-b"
      >
        {tabs.map((tab) => {
          const active = tab.id === subTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSubTab(tab.id)}
              className={cn(
                'min-h-11 shrink-0 border-b-[3px] px-3.5 text-sm transition-colors',
                active
                  ? 'border-primary text-primary font-extrabold'
                  : 'text-on-surface-variant border-transparent font-medium'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {subTab === 'schedule' ? (
        <SchedulePanel locale={locale} slots={schedule ?? []} labels={labels} />
      ) : activeGroup ? (
        <SessionsBlockPanel
          locale={locale}
          title={activeGroup.name}
          subtitle={activeGroup.note || labels.groupSubtitle}
          block={activeGroup.info}
          labels={labels}
        />
      ) : (
        <SessionsBlockPanel
          locale={locale}
          title={labels.personalTab}
          subtitle={labels.sessionsSubtitle}
          block={sessions.personal}
          labels={labels}
        />
      )}
    </div>
  );
}

function SessionsBlockPanel({
  locale,
  title,
  subtitle,
  block,
  labels,
}: {
  locale: Locale;
  title: string;
  subtitle: string;
  block: SessionBlock;
  labels: StudentClassSessionsLabels;
}) {
  const numFmt = new Intl.NumberFormat(NUMBER_LOCALE[locale]);
  const dayFmt = new Intl.DateTimeFormat(NUMBER_LOCALE[locale], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat(NUMBER_LOCALE[locale], { timeStyle: 'short' });

  const totalCount = block.sessions.length > 0 ? block.sessions.length : block.sessionCount;

  return (
    <div className="flex flex-col gap-4">
      {/* Header Jelly Card */}
      <div className="jelly-card rounded-[var(--radius-card)] p-4.5">
        <div className="flex items-center gap-3.5">
          <JellyIconBubble tone="primary">
            <IconSchool className="size-5" />
          </JellyIconBubble>
          <h2 className="text-on-surface min-w-0 flex-1 font-extrabold">{title}</h2>
          <JellyCountBadge label={numFmt.format(totalCount)} tone="primary" />
        </div>
        <p className="text-on-surface-variant mt-2.5 text-sm leading-relaxed">{subtitle}</p>
      </div>

      {block.sessions.length === 0 ? (
        <p className="text-on-surface-variant py-6 text-center text-sm font-semibold">
          {labels.sessionsEmpty}
        </p>
      ) : block.usesTermsTable && block.terms.length > 0 ? (
        <div className="flex flex-col gap-5">
          {block.terms.map((term) => {
            const termSessions = block.sessions.filter((s) => s.termId === term.id);
            if (termSessions.length === 0 && term.sessionCount === 0) return null;
            const grouped = groupSessionsByDay(termSessions);
            const idxMap = chronologicalIndexMap(termSessions);

            return (
              <section key={term.id} className="flex flex-col gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-primary-container text-on-primary-container rounded-xl px-3 py-1 text-sm font-extrabold">
                      {formatClient(labels.termTitleTemplate, locale, {
                        number: term.sortOrder,
                      })}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-extrabold',
                        term.isPaid
                          ? 'bg-correct-container text-on-correct-container'
                          : 'bg-error-container text-on-error-container'
                      )}
                    >
                      {term.isPaid ? labels.paid : labels.unpaid}
                    </span>
                  </div>
                  <p className="text-on-surface-variant mt-1 text-xs font-semibold">
                    {formatClient(labels.termSessionsProgressTemplate, locale, {
                      current: term.sessionCount,
                      max: term.sessionCap,
                    })}
                  </p>
                </div>

                {grouped.map((g) => (
                  <div key={g.dayKey} className="flex flex-col gap-2.5">
                    <h3 className="text-on-surface-variant text-xs font-extrabold tracking-wide">
                      {g.date ? dayFmt.format(g.date) : '—'}
                    </h3>
                    {g.items.map((entry) => {
                      const dt = parseRecordedDate(entry.recordedAt);
                      const displayIndex = idxMap.get(entry.id) ?? (entry.index || 1);
                      return (
                        <SessionTile
                          key={entry.id}
                          locale={locale}
                          displayIndex={displayIndex}
                          timeLabel={dt ? timeFmt.format(dt) : entry.recordedAt}
                          headingTemplate={labels.sessionHeadingTemplate}
                        />
                      );
                    })}
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {(() => {
            const grouped = groupSessionsByDay(block.sessions);
            const idxMap = chronologicalIndexMap(block.sessions);
            return grouped.map((g) => (
              <div key={g.dayKey} className="flex flex-col gap-2.5">
                <h3 className="text-on-surface-variant text-xs font-extrabold tracking-wide">
                  {g.date ? dayFmt.format(g.date) : '—'}
                </h3>
                {g.items.map((entry) => {
                  const dt = parseRecordedDate(entry.recordedAt);
                  const displayIndex =
                    entry.index > 0 ? entry.index : (idxMap.get(entry.id) ?? 1);
                  return (
                    <SessionTile
                      key={entry.id}
                      locale={locale}
                      displayIndex={displayIndex}
                      timeLabel={dt ? timeFmt.format(dt) : entry.recordedAt}
                      headingTemplate={labels.sessionHeadingTemplate}
                    />
                  );
                })}
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

function SessionTile({
  locale,
  displayIndex,
  timeLabel,
  headingTemplate,
}: {
  locale: Locale;
  displayIndex: number;
  timeLabel: string;
  headingTemplate: string;
}) {
  const numFmt = new Intl.NumberFormat(NUMBER_LOCALE[locale]);
  return (
    <div className="jelly-card flex items-center gap-3.5 rounded-[var(--radius-card)] p-3.5">
      <JellyIconBubble tone="primary" size={44}>
        <span className="text-base font-black tabular-nums">{numFmt.format(displayIndex)}</span>
      </JellyIconBubble>
      <div className="min-w-0 flex-1">
        <p className="text-on-surface truncate text-sm font-extrabold">
          {formatClient(headingTemplate, locale, { number: displayIndex })}
        </p>
        <p className="text-on-surface-variant mt-0.5 flex items-center gap-1.5 text-xs font-medium">
          <IconClock className="size-3.5 shrink-0" />
          <span dir="ltr" className="truncate">
            {timeLabel}
          </span>
        </p>
      </div>
      <JellyIconBubble tone="primary" size={32}>
        <IconCheck className="size-4" />
      </JellyIconBubble>
    </div>
  );
}

function SchedulePanel({
  locale,
  slots,
  labels,
}: {
  locale: Locale;
  slots: ClassScheduleSlot[];
  labels: StudentClassSessionsLabels;
}) {
  const numFmt = new Intl.NumberFormat(NUMBER_LOCALE[locale]);
  const byDay = new Map<number, ClassScheduleSlot[]>();
  for (const s of slots) {
    const w = Math.min(7, Math.max(1, s.weekday));
    const list = byDay.get(w) ?? [];
    list.push(s);
    byDay.set(w, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  const daysWithClass = weekdayOrderFor(locale).filter((w) => (byDay.get(w)?.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="jelly-card rounded-[var(--radius-card)] p-4.5">
        <div className="flex items-center gap-3.5">
          <JellyIconBubble tone="secondary">
            <IconCalendar className="size-5" />
          </JellyIconBubble>
          <h2 className="text-on-surface min-w-0 flex-1 font-extrabold">
            {labels.weeklyScheduleTab}
          </h2>
          {slots.length > 0 ? (
            <JellyCountBadge label={numFmt.format(slots.length)} tone="primary" />
          ) : null}
        </div>
        <p className="text-on-surface-variant mt-2.5 text-sm leading-relaxed">
          {labels.scheduleSubtitle}
        </p>
      </div>

      {daysWithClass.length === 0 ? (
        <p className="text-on-surface-variant py-6 text-center text-sm font-semibold">
          {labels.scheduleEmpty}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {daysWithClass.map((weekday) => {
            const daySlots = byDay.get(weekday) ?? [];
            return (
              <section key={weekday} className="flex flex-col gap-2">
                <h3 className="text-on-surface-variant text-xs font-extrabold tracking-wide">
                  {weekdayName(weekday, locale)}
                </h3>
                {daySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="jelly-card flex items-center gap-3.5 rounded-[var(--radius-card)] p-3.5"
                  >
                    <JellyIconBubble tone="primary" size={40}>
                      <IconClock className="size-5" />
                    </JellyIconBubble>
                    <div className="min-w-0 flex-1">
                      <p className="text-on-surface text-sm font-extrabold" dir="ltr">
                        {slot.endTime ? `${slot.startTime} – ${slot.endTime}` : slot.startTime}
                      </p>
                      {slot.label ? (
                        <p className="text-on-surface-variant mt-0.5 text-xs">{slot.label}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
