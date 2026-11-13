import type { StudentClassSessions } from '@/lib/auth/panel-types';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';

function formatWhen(raw: string, locale: Locale) {
  const d = Date.parse(raw);
  if (!Number.isFinite(d)) return raw;
  return new Intl.DateTimeFormat(NUMBER_LOCALE[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(d));
}

export function ClassSessionsView({
  locale,
  data,
  empty,
}: {
  locale: Locale;
  data: StudentClassSessions;
  empty: string;
}) {
  const numbers = new Intl.NumberFormat(NUMBER_LOCALE[locale]);
  const total =
    data.personal.sessionCount +
    data.groups.reduce((sum, g) => sum + g.info.sessionCount, 0);

  if (total === 0) {
    return <p className="text-on-surface-variant font-semibold">{empty}</p>;
  }

  const blocks = [
    { title: null as string | null, info: data.personal },
    ...data.groups.map((g) => ({ title: g.name, info: g.info })),
  ];

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, blockIndex) => {
        if (block.info.sessions.length === 0 && block.info.sessionCount === 0) return null;
        return (
          <section key={blockIndex} className="jelly-card rounded-[var(--radius-card)] p-4">
            {block.title ? (
              <h2 className="text-on-surface mb-2 font-extrabold">{block.title}</h2>
            ) : null}
            {block.info.note ? (
              <p className="text-on-surface-variant mb-3 text-sm">{block.info.note}</p>
            ) : null}
            <ol className="flex flex-col gap-2">
              {block.info.sessions.map((session) => (
                <li
                  key={session.id}
                  className="bg-surface-1 flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                >
                  <span className="text-on-surface font-bold">
                    {numbers.format(session.index > 0 ? session.index : session.id)}
                  </span>
                  <span className="text-on-surface-variant text-sm tabular-nums" dir="ltr">
                    {formatWhen(session.recordedAt, locale)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
