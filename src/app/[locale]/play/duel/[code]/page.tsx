import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { MagicBackground } from '@/components/features/games/magic-background';
import { WordBuilderDuelGuestGate } from '@/components/features/games/word-builder-duel-guest-gate';
import { WordBuilderDuelRoom } from '@/components/features/games/word-builder-duel-room';
import { IconArrowBack } from '@/components/ui/icons';
import { resolveDuelActor } from '@/lib/game/word-builder/duel-guest';
import { fetchDuelByCode } from '@/lib/game/word-builder/duel-server';
import { isLocale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
import { PLAY_SECTION_VISIBLE, localeHref } from '@/lib/nav';
import { getGloss } from '@/lib/request-context';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/play/duel/[code]'>): Promise<Metadata> {
  const { locale, code } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);
  const cleanCode = code.trim().toUpperCase().slice(0, 12);
  return {
    title: `${t('wbDuelHubTitle')} #${cleanCode}`,
    robots: { index: false },
  };
}

export default async function PlayDuelRoomPage({
  params,
  searchParams,
}: PageProps<'/[locale]/play/duel/[code]'>) {
  const [{ locale, code }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  if (!PLAY_SECTION_VISIBLE) redirect(localeHref(locale, ''));

  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);
  const gloss = await getGloss(locale);

  const actor = await resolveDuelActor();

  if (!actor) {
    return (
      <WordBuilderDuelGuestGate
        locale={locale}
        backPath="/play/duel"
        loginNextHref={localeHref(locale, `/play/duel/${cleanCode}`)}
        codeBadge={cleanCode}
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

  const res = await fetchDuelByCode(actor, cleanCode);
  if (!res.ok) {
    return (
      <MagicBackground className="-mt-8 -mb-[calc(var(--size-bottom-nav)+1rem)] min-h-[100dvh] pt-6 pb-[calc(var(--size-bottom-nav)+2.5rem)] md:-mb-12 md:pb-16">
        <div className="page-gutter mx-auto flex w-full max-w-lg flex-col gap-5">
          <Link
            href={localeHref(locale, '/play/duel')}
            aria-label={t('back')}
            className="wb-duel-header-back grid size-10 place-items-center rounded-full text-[#4E2A14] transition-transform hover:scale-105 active:scale-95 dark:text-[#FFF8E1]"
          >
            <IconArrowBack className="size-5" />
          </Link>

          <section className="wb-duel-preview-card rounded-[30px] p-7 text-center">
            <h1 className="text-xl font-black text-[#4A2508] dark:text-[#FFF8E1]">
              {t('wbDuelNotFoundTitle')}
            </h1>
            <p className="mt-2 text-sm font-semibold text-[#6D4C41] dark:text-[#FFECB3]/80">
              {res.status === 403 ? res.error : t('wbDuelNotFoundBody')}
            </p>
            <Link
              href={localeHref(locale, '/play/duel')}
              className="wb-duel-cta-gold mt-5 inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-black text-[#4A2508] no-underline transition-all"
            >
              {t('wbDuelBackToHub')}
            </Link>
          </section>
        </div>
      </MagicBackground>
    );
  }

  const autoStart = query.start === '1';

  return (
    <WordBuilderDuelRoom
      initialDuel={res.duel}
      initialRemainingMs={res.remainingMs}
      currentUser={{
        actorKey: actor.actorKey,
        userId: actor.userId,
        isGuest: actor.isGuest,
        displayName: actor.displayName,
        avatar: actor.avatar,
      }}
      locale={locale}
      glossLang={gloss}
      autoStart={autoStart}
      labels={{
        back: t('back'),
        playNow: t('wbDuelPlayNow'),
        acceptChallenge: t('wbDuelAcceptChallenge'),
        continuePlaying: t('wbDuelContinuePlaying'),
        decline: t('wbDuelDecline'),
        cancel: t('wbDuelCancel'),
        rulesRounds: t('wbDuelRulesRounds'),
        rulesTimerTemplate: raw('wbDuelRulesTimer'),
        rulesHints: t('wbDuelRulesHints'),
        ghostReadyBanner: t('wbDuelGhostReadyBanner'),
        waitingCreatorNote: t('wbDuelWaitingCreatorNote'),
        openOpponent: t('wbDuelOpenOpponent'),
        statusExpired: t('wbDuelStatusExpired'),
        statusDeclined: t('wbDuelStatusDeclined'),
        copyLink: t('wbDuelCopyLink'),
        copied: t('wbDuelCopied'),
        share: t('wbDuelShare'),
        shareInviteTemplate: raw('wbDuelShareInviteText'),
        backToHub: t('wbDuelBackToHub'),
        difficultyLabels: {
          beginner: t('wordBuilderDifficultyBeginner'),
          intermediate: t('wordBuilderDifficultyIntermediate'),
          advanced: t('wordBuilderDifficultyAdvanced'),
        },
        play: {
          roundBadgeTemplate: raw('wbDuelRoundBadge'),
          roundClearedBannerTemplate: raw('wbDuelRoundClearedBanner'),
          bonusWordToastTemplate: raw('wbDuelBonusWordToast'),
          streakTemplate: raw('wbDuelStreakLabel'),
          hintsLeftTemplate: raw('wbDuelHintsLeft'),
          noHintsLeft: t('wbDuelNoHintsLeft'),
          hintPenaltyTag: t('wbDuelHintPenaltyTag'),
          alreadyFound: t('wordBuilderAlreadyFound'),
          hintLetter: t('wordBuilderHintLetter'),
          shuffle: t('wbDuelShuffleShort'),
          hintReveal: t('wbDuelHintLetterShort'),
          hintMeaning: t('wbDuelHintMeaningShort'),
          translation: t('wordBuilderTranslation'),
          soundTitle: t('wordBuilderSessionSoundTitle'),
          bgmSwitch: t('wordBuilderSessionBgmSwitch'),
          bgmSubtitle: t('wordBuilderSessionBgmSubtitle'),
          sfxSwitch: t('wordBuilderSessionSfxSwitch'),
          sfxSubtitle: t('wordBuilderSessionSfxSubtitle'),
          youLabel: t('wbDuelYouLabel'),
          ghostLabel: t('wbDuelGhostLabel'),
          waitingLabel: t('wbDuelStatusWaiting'),
          submitting: t('wbDuelSubmitting'),
          back: t('back'),
          exitTitle: t('wbDuelExitTitle'),
          exitBody: t('wbDuelExitBody'),
          exitStay: t('wbDuelExitStay'),
          exitLeave: t('wbDuelExitLeave'),
          meaning: t('wordBuilderMeaning'),
          example: t('wordBuilderExample'),
          speakWord: t('wordBuilderSpeakWord'),
          speakExample: t('wordBuilderSpeakExample'),
          close: t('close'),
        },
        result: {
          victory: t('wbDuelVictory'),
          defeat: t('wbDuelDefeat'),
          draw: t('wbDuelDraw'),
          waitingOpponentTitle: t('wbDuelWaitingOpponentTitle'),
          waitingOpponentBody: t('wbDuelWaitingOpponentBody'),
          scoreBreakdown: t('wbDuelScoreBreakdown'),
          metricTarget: t('wbDuelMetricTarget'),
          metricBonus: t('wbDuelMetricBonus'),
          metricRounds: t('wbDuelMetricRounds'),
          metricStreak: t('wbDuelMetricStreak'),
          metricTimeBonus: t('wbDuelMetricTimeBonus'),
          metricHints: t('wbDuelMetricHints'),
          metricElapsed: t('wbDuelMetricElapsed'),
          metricTotal: t('wbDuelMetricTotal'),
          wordsComparisonTitle: t('wbDuelWordsComparisonTitle'),
          wordsComparisonHint: t('wbDuelWordsComparisonHint'),
          missedByYou: t('wbDuelMissedByYou'),
          foundByBoth: t('wbDuelFoundByBoth'),
          foundOnlyYou: t('wbDuelFoundOnlyYou'),
          missedByBoth: t('wbDuelMissedByBoth'),
          roundBadgeTemplate: raw('wbDuelRoundBadge'),
          rematch: t('wbDuelRematch'),
          share: t('wbDuelShare'),
          copyLink: t('wbDuelCopyLink'),
          copied: t('wbDuelCopied'),
          shareInviteTemplate: raw('wbDuelShareInviteText'),
          shareResultTemplate: raw('wbDuelShareResultText'),
          backToHub: t('wbDuelBackToHub'),
          youLabel: t('wbDuelYouLabel'),
          pointsShortTemplate: raw('wbDuelPointsShort'),
          guestUpgradeTitle: t('wbDuelGuestUpgradeTitle'),
          guestUpgradeBody: t('wbDuelGuestUpgradeBody'),
          guestUpgradeCta: t('wbDuelGuestUpgradeCta'),
          meaning: t('wordBuilderMeaning'),
          example: t('wordBuilderExample'),
          speakWord: t('wordBuilderSpeakWord'),
          speakExample: t('wordBuilderSpeakExample'),
          close: t('close'),
        },
      }}
    />
  );
}
