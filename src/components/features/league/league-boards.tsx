import Link from 'next/link';

import type { LeagueBoard, LeaguePeriod, LeagueSort, LeagueType } from '@/lib/auth/league';
import { LEAGUE_PERIODS, LEAGUE_SORTS, LEAGUE_TYPES } from '@/lib/auth/league';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

/**
 * The three boards the app shows.
 *
 * Visible to both signed-in learners and guests. `Weekly` and `Monthly` period
 * tabs are omitted when fewer than 4 learners are on that board.
 */

function href(locale: Locale, type: LeagueType, period: LeaguePeriod, sort: LeagueSort) {
  return localeHref(locale, `/league?type=${type}&period=${period}&sort=${sort}`);
}

/** Same empty copy the app hardcodes on a board with no rows. */
function emptyMessage(type: LeagueType, sort: LeagueSort) {
  if (sort === 'accuracy') {
    return 'Accuracy view only shows learners with at least 100 answered questions.';
  }
  if (type === 'grammar') return 'Answer 10 grammar questions this week to enter this league.';
  if (type === 'vocab') return 'Take vocab quizzes to climb the Vocabulary League.';
  return 'Start learning today to enter the All League.';
}

export function LeagueBoards({
  locale,
  type,
  period,
  visiblePeriods,
  sort,
  board,
  youId,
  needsAuth,
  failed,
  couldNotLoad,
  needsAccount,
  signInLabel,
}: {
  locale: Locale;
  type: LeagueType;
  period: LeaguePeriod;
  visiblePeriods: readonly LeaguePeriod[];
  sort: LeagueSort;
  board: LeagueBoard | null;
  youId: number | null;
  needsAuth: boolean;
  failed: boolean;
  couldNotLoad: string;
  needsAccount: string;
  signInLabel: string;
}) {
  const current = LEAGUE_TYPES.find((item) => item.id === type) ?? {
    id: 'all' as const,
    label: 'All',
    title: 'All League',
  };
  const periodTabs = LEAGUE_PERIODS.filter((item) => visiblePeriods.includes(item.id));
  const numbers = new Intl.NumberFormat(NUMBER_LOCALE[locale]);
  const accuracy = new Intl.NumberFormat(NUMBER_LOCALE[locale], {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const youInList = board?.you && board.rows.some((row) => row.userId === board.you?.userId);

  return (
    <div>
      <h1 lang="en" dir="ltr" className="text-on-surface mb-4 text-left text-lg font-extrabold">
        {current.title}
      </h1>
      <div className="bg-surface-1 mb-3 grid grid-cols-3 gap-1 rounded-[var(--radius-card)] p-1">
        {LEAGUE_TYPES.map((item) => (
          <Link
            key={item.id}
            href={href(locale, item.id, period, sort)}
            lang="en"
            dir="ltr"
            aria-current={item.id === type ? 'page' : undefined}
            className={
              item.id === type
                ? 'bg-primary text-on-primary grid min-h-11 place-items-center rounded-[var(--radius-button)] text-sm font-extrabold no-underline'
                : 'text-on-surface-variant grid min-h-11 place-items-center rounded-[var(--radius-button)] text-sm font-extrabold no-underline'
            }
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {periodTabs.map((item) => (
          <Link
            key={item.id}
            href={href(locale, type, item.id, sort)}
            lang="en"
            dir="ltr"
            className={
              item.id === period
                ? 'bg-secondary-container text-on-secondary-container inline-flex min-h-10 items-center rounded-full px-3 text-sm font-bold no-underline'
                : 'text-on-surface-variant inline-flex min-h-10 items-center rounded-full px-3 text-sm font-bold no-underline'
            }
          >
            {item.label}
          </Link>
        ))}
        {LEAGUE_SORTS.map((item) => (
          <Link
            key={item.id}
            href={href(locale, type, period, item.id)}
            lang="en"
            dir="ltr"
            className={
              item.id === sort
                ? 'bg-primary-container text-on-primary-container inline-flex min-h-10 items-center rounded-full px-3 text-sm font-bold no-underline'
                : 'text-on-surface-variant inline-flex min-h-10 items-center rounded-full px-3 text-sm font-bold no-underline'
            }
          >
            {item.label}
          </Link>
        ))}
      </div>

      {needsAuth ? (
        <div>
          <p className="text-on-surface mb-3 font-bold">{needsAccount}</p>
          <Link
            href={localeHref(locale, `/login?next=/${locale}/league`)}
            className="bg-primary text-on-primary inline-flex min-h-12 items-center rounded-full px-5 font-extrabold no-underline"
          >
            {signInLabel}
          </Link>
        </div>
      ) : failed || !board ? (
        <p className="text-on-surface font-bold">{couldNotLoad}</p>
      ) : board.rows.length === 0 && !(board.you && !youInList) ? (
        <p
          lang="en"
          dir="ltr"
          className="border-outline-variant/60 bg-surface-1 text-on-surface rounded-[var(--radius-card)] border px-6 py-8 text-center font-extrabold"
        >
          {emptyMessage(type, sort)}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {board.rows.map((row) => (
            <li
              key={`${row.userId}-${row.rank}`}
              className={
                youId != null && row.userId === youId
                  ? 'bg-primary-container text-on-primary-container flex items-center gap-3 rounded-[var(--radius-card)] px-4 py-3'
                  : 'bg-surface-1 flex items-center gap-3 rounded-[var(--radius-card)] px-4 py-3'
              }
            >
              <span className="w-8 shrink-0 text-center font-extrabold tabular-nums">
                {row.rank == null ? '—' : numbers.format(row.rank)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold">{row.name}</span>
                {row.badge ? (
                  <span lang="en" dir="ltr" className="text-on-surface-variant block truncate text-left text-xs">
                    {row.badge}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-end font-bold tabular-nums">
                {sort === 'accuracy'
                  ? `${accuracy.format(row.accuracy)}%`
                  : numbers.format(row.points)}
              </span>
            </li>
          ))}
          {board.you && !youInList ? (
            <li className="bg-primary-container text-on-primary-container flex items-center gap-3 rounded-[var(--radius-card)] px-4 py-3">
              <span className="w-8 shrink-0 text-center font-extrabold tabular-nums">
                {board.you.rank == null ? '—' : numbers.format(board.you.rank)}
              </span>
              <span className="min-w-0 flex-1 truncate font-extrabold">{board.you.name}</span>
              <span className="shrink-0 text-end font-bold tabular-nums">
                {sort === 'accuracy'
                  ? `${accuracy.format(board.you.accuracy)}%`
                  : numbers.format(board.you.points)}
              </span>
            </li>
          ) : null}
        </ol>
      )}
    </div>
  );
}
