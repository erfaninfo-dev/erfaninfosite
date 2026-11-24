import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LeagueBoards } from '@/components/features/league/league-boards';
import { IconArrowBack } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { authRequest, fetchAccount } from '@/lib/auth/api';
import {
  leagueBoardCount,
  parseLeague,
  readLeagueQuery,
  resolveVisibleLeaguePeriods,
  type LeagueBoard,
  type LeaguePeriod,
} from '@/lib/auth/league';
import { getAuthToken } from '@/lib/auth/session';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/league'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: 'League', robots: { index: false } };
}

/**
 * League standings — visible to everyone (both guests and signed-in learners).
 *
 * Fetches `weekly`, `monthly`, and `lifetime` in parallel so `Weekly` and
 * `Monthly` tabs are completely hidden whenever they have fewer than 4 learners,
 * falling back cleanly to a visible tab (`lifetime`).
 */
export default async function LeaguePage({
  params,
  searchParams,
}: PageProps<'/[locale]/league'>) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);
  const choice = readLeagueQuery(query);
  const rawToken = await getAuthToken();

  let token: string | null = null;
  let youId: number | null = null;

  if (rawToken) {
    const account = await fetchAccount(rawToken);
    if (account !== 'unauthorized' && account !== 'unavailable') {
      token = rawToken;
      youId = account.id;
    }
  }

  const fetchPeriod = (period: LeaguePeriod) =>
    authRequest('league.php', {
      token,
      params: {
        type: choice.type,
        period,
        sort: choice.sort,
        limit: 50,
        offset: 0,
      },
    });

  const [weeklyRes, monthlyRes, lifetimeRes] = await Promise.all([
    fetchPeriod('weekly'),
    fetchPeriod('monthly'),
    fetchPeriod('lifetime'),
  ]);

  const needsAuth =
    !token &&
    weeklyRes.status === 401 &&
    monthlyRes.status === 401 &&
    lifetimeRes.status === 401;

  const boards: Record<LeaguePeriod, LeagueBoard | null> = {
    weekly: weeklyRes.status === 200 ? parseLeague(weeklyRes.json) : null,
    monthly: monthlyRes.status === 200 ? parseLeague(monthlyRes.json) : null,
    lifetime: lifetimeRes.status === 200 ? parseLeague(lifetimeRes.json) : null,
  };

  const { visiblePeriods, activePeriod } = resolveVisibleLeaguePeriods(choice.period, {
    weekly: leagueBoardCount(boards.weekly),
    monthly: leagueBoardCount(boards.monthly),
  });

  const board = boards[activePeriod];
  const failed = !needsAuth && board == null;

  return (
    <Container size="quiz">
      <div className="mb-4">
        <Link
          href={localeHref(locale)}
          aria-label={t('back')}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
      </div>
      <LeagueBoards
        locale={locale}
        type={choice.type}
        period={activePeriod}
        visiblePeriods={visiblePeriods}
        sort={choice.sort}
        board={board}
        youId={youId}
        needsAuth={needsAuth}
        failed={failed}
        couldNotLoad={t('couldNotLoadLeague')}
        needsAccount={t('couldNotLoadLeague')}
        signInLabel={t('signIn')}
      />
    </Container>
  );
}
