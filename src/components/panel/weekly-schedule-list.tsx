import type { ClassScheduleSlot } from '@/lib/auth/panel-types';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';

function weekdayLong(weekday: number, locale: Locale) {
  const refMonday = new Date(2024, 0, 1);
  const d = new Date(refMonday);
  d.setDate(refMonday.getDate() + (weekday - 1));
  return new Intl.DateTimeFormat(NUMBER_LOCALE[locale], { weekday: 'long' }).format(d);
}

function formatSlotTime(start: string, end: string | null) {
  if (end) return `${start} – ${end}`;
  return start;
}

export function WeeklyScheduleList({
  locale,
  slots,
  empty,
}: {
  locale: Locale;
  slots: ClassScheduleSlot[];
  empty: string;
}) {
  if (slots.length === 0) {
    return <p className="text-on-surface-variant font-semibold">{empty}</p>;
  }

  const sorted = [...slots].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((slot) => (
        <li
          key={slot.id}
          className="jelly-card rounded-[var(--radius-card)] px-4 py-3"
        >
          <p className="text-on-surface font-extrabold">{weekdayLong(slot.weekday, locale)}</p>
          <p className="text-primary mt-1 font-bold" dir="ltr">
            {formatSlotTime(slot.startTime, slot.endTime)}
          </p>
          {slot.label ? (
            <p className="text-on-surface-variant mt-1 text-sm">{slot.label}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
