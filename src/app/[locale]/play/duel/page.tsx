import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { WordBuilderDuelGuestGate } from '@/components/features/games/word-builder-duel-guest-gate';
import {
  WordBuilderDuelHub,
  type DuelCategoryOption,
} from '@/components/features/games/word-builder-duel-hub';
import { glossOf } from '@/lib/api/normalize';
import { getGameCategorySummaries } from '@/lib/api/queries';
import { getWordBuilderLeague } from '@/lib/game/word-builder/campaign-server';
import { resolveDuelActor } from '@/lib/game/word-builder/duel-guest';
import { fetchDuelList } from '@/lib/game/word-builder/duel-server';
import type { DuelListResponse } from '@/lib/game/word-builder/duel-types';
import { isLocale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
import { PLAY_SECTION_VISIBLE, localeHref } from '@/lib/nav';
import { getGloss } from '@/lib/request-context';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/play/duel'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);
  return {
    title: `${t('wbDuelHubTitle')} · ${t('tabPlay')}`,
    alternates: { canonical: `/${locale}/play/duel` },
    robots: { index: false },
  };
}

const EMPTY_LIST: DuelListResponse = {
  ok: true,
  your_turn: [],
  waiting: [],
  completed: [],
  stats: { wins: 0, losses: 0, draws: 0, total: 0, winStreak: 0 },
};

export default async function PlayDuelHubPage({
  params,
}: PageProps<'/[locale]/play/duel'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!PLAY_SECTION_VISIBLE) redirect(localeHref(locale, ''));

  const t = getTranslator(locale);
  const raw = getRawMessage(locale);
  const actor = await resolveDuelActor();

  if (!actor) {
    return (
      <WordBuilderDuelGuestGate
        locale={locale}
        backPath="/play"
        loginNextHref={localeHref(locale, '/play/duel')}
        labels={{
          back: t('back'),
          title: t('wbDuelGuestTitle'),
          subtitle: t('wbDuelGuestSubtitle'),
          nameLabel: t('wbDuelGuestNameLabel'),
          namePlaceholder: t('wbDuelGuestNamePlaceholder'),
          avatarLabel: t('wbDuelGuestAvatarLabel'),
          continueAction: t('wbDuelGuestContinue'),
          orSignIn: t('wbDuelGuestOrSignIn'),
          nameTooShort: t('wbDuelGuestNameTooShort'),
        }}
      />
    );
  }

  const [duelRes, categoriesRaw, league, gloss] = await Promise.all([
    fetchDuelList(actor),
    getGameCategorySummaries().catch(() => []),
    actor.kind === 'user' ? getWordBuilderLeague(actor.token).catch(() => null) : Promise.resolve(null),
    getGloss(locale),
  ]);

  const categories: DuelCategoryOption[] = categoriesRaw.map((cat) => ({
    slug: cat.slug,
    label: (locale === 'en' ? cat.name.en : glossOf(cat.name, gloss)) || cat.name.en,
    wordCount: cat.wordCount,
  }));

  return (
    <WordBuilderDuelHub
      locale={locale}
      currentActorKey={actor.actorKey}
      currentUserId={actor.userId}
      isGuest={actor.isGuest}
      currentPlayerName={actor.displayName}
      currentPlayerAvatar={actor.avatar}
      initialData={duelRes.ok ? duelRes.data : EMPTY_LIST}
      categories={categories}
      leagueOpponents={league?.rows ?? []}
      labels={{
        title: t('wbDuelHubTitle'),
        subtitle: t('wbDuelHubSubtitle'),
        back: t('back'),
        createButton: t('wbDuelCreate'),
        joinPlaceholder: t('wbDuelJoinPlaceholder'),
        joinAction: t('wbDuelJoinAction'),
        statWins: t('wbDuelStatWins'),
        statLosses: t('wbDuelStatLosses'),
        statDraws: t('wbDuelStatDraws'),
        statStreak: t('wbDuelStatStreak'),
        tabYourTurn: t('wbDuelTabYourTurn'),
        tabWaiting: t('wbDuelTabWaiting'),
        tabHistory: t('wbDuelTabHistory'),
        emptyYourTurn: t('wbDuelEmptyYourTurn'),
        emptyWaiting: t('wbDuelEmptyWaiting'),
        emptyHistory: t('wbDuelEmptyHistory'),
        createTitle: t('wbDuelCreateTitle'),
        sourceNormal: t('wbDuelSourceNormal'),
        sourceCategory: t('wbDuelSourceCategory'),
        difficultyLabel: t('wbDuelDifficultyLabel'),
        categoryLabel: t('wbDuelCategoryLabel'),
        opponentLabel: t('wbDuelOpponentLabel'),
        openInvite: t('wbDuelOpenInvite'),
        createAndPlay: t('wbDuelCreateAndPlay'),
        creating: t('wbDuelCreating'),
        openOpponent: t('wbDuelOpenOpponent'),
        copyLink: t('wbDuelCopyLink'),
        copied: t('wbDuelCopied'),
        share: t('wbDuelShare'),
        shareInviteTemplate: raw('wbDuelShareInviteText'),
        playNow: t('wbDuelPlayNow'),
        acceptChallenge: t('wbDuelAcceptChallenge'),
        viewResult: t('wbDuelViewResult'),
        rematch: t('wbDuelRematch'),
        decline: t('wbDuelDecline'),
        cancel: t('wbDuelCancel'),
        victory: t('wbDuelVictory'),
        defeat: t('wbDuelDefeat'),
        draw: t('wbDuelDraw'),
        statusExpired: t('wbDuelStatusExpired'),
        statusDeclined: t('wbDuelStatusDeclined'),
        expiresHoursTemplate: raw('wbDuelExpiresInHours'),
        expiresMinutesTemplate: raw('wbDuelExpiresInMinutes'),
        pointsShortTemplate: raw('wbDuelPointsShort'),
        close: t('close'),
        signIn: t('signIn'),
        guestBadge: t('wbDuelGuestBadge'),
        guestHubNoteTemplate: raw('wbDuelGuestHubNote'),
        guestEditName: t('wbDuelGuestEditName'),
        guestNamePlaceholder: t('wbDuelGuestNamePlaceholder'),
        guestContinue: t('wbDuelGuestContinue'),
        youLabel: t('wbDuelYouLabel'),
        rivalSlotLabel: t('wbDuelRivalSlot'),
        orJoinCodeLabel: t('wbDuelOrJoinCode'),
        rulesRounds: t('wbDuelRulesRounds'),
        ghostLabel: t('wbDuelGhostLabel'),
        difficultyLabels: {
          beginner: t('wordBuilderDifficultyBeginner'),
          intermediate: t('wordBuilderDifficultyIntermediate'),
          advanced: t('wordBuilderDifficultyAdvanced'),
        },
      }}
    />
  );
}
