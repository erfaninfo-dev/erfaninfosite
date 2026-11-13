import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LeagueBoards } from '@/components/features/league/league-boards';
import { IconArrowBack } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { authRequest, fetchAccount } from '@/lib/auth/api';
import { parseLeague, readLeagueQuery, type LeagueBoard } from '@/lib/auth/league';
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
 * League standings.
 *
 * Without a token the API answers 401, so the page stays a sign-in prompt and
 * does not call the endpoint. With a token the board is that response, fetched
 * uncached. Rankings are never invented.
 */
export default async function LeaguePage({
  params,
  searchParams,
}: PageProps<'/[locale]/league'>) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);
  const choice = readLeagueQuery(query);
  const token = await getAuthToken();

  let signedIn = false;
  let failed = false;
  let board: LeagueBoard | null = null;
  let youId: number | null = null;

  if (token) {
    const account = await fetchAccount(token);
    if (account === 'unauthorized') {
      signedIn = false;
    } else if (account === 'unavailable') {
      signedIn = true;
      failed = true;
    } else {
      signedIn = true;
      youId = account.id;
      const result = await authRequest('league.php', {
        token,
        params: {
          type: choice.type,
          period: choice.period,
          sort: choice.sort,
          limit: 50,
          offset: 0,
        },
      });
      if (result.status === 401) {
        signedIn = false;
      } else if (result.status !== 200) {
        failed = true;
      } else {
        board = parseLeague(result.json);
        failed = board == null;
      }
    }
  }

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
        period={choice.period}
        sort={choice.sort}
        board={board}
        youId={youId}
        signedIn={signedIn}
        failed={failed}
        couldNotLoad={t('couldNotLoadLeague')}
        needsAccount={t('couldNotLoadLeague')}
        signInLabel={t('signIn')}
      />
    </Container>
  );
}
