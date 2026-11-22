import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { WordBuilderNormalHub } from '@/components/features/games/word-builder-normal-hub';
import { fetchAccount } from '@/lib/auth/api';
import { getAuthToken } from '@/lib/auth/session';
import { getWordBuilderLeague } from '@/lib/game/word-builder/campaign-server';
import { isLocale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
import { PLAY_SECTION_VISIBLE, localeHref } from '@/lib/nav';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/play/normal'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);
  return {
    title: `${t('wordBuilderNormalTitle')} · ${t('wordBuilderTitle')}`,
    alternates: { canonical: `/${locale}/play/normal` },
  };
}

export default async function PlayNormalPage({
  params,
}: PageProps<'/[locale]/play/normal'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!PLAY_SECTION_VISIBLE) redirect(localeHref(locale, ''));

  const token = await getAuthToken();
  const [accountRes, league] = await Promise.all([
    token ? fetchAccount(token) : Promise.resolve(null),
    getWordBuilderLeague(token),
  ]);

  const account = accountRes && typeof accountRes === 'object' ? accountRes : null;
  const unlockAll = account?.isAdmin ?? false;
  const signedIn = account !== null;

  const t = getTranslator(locale);
  const raw = getRawMessage(locale);

  const leagueCopy =
    locale === 'fa'
      ? {
          title: 'لیگ واژه‌ساز',
          subtitle: 'بازیکنان، سکه‌ها و پیشرفت مراحل',
          yourCoins: 'سکه‌های شما',
          yourLevel: 'سطح شما',
          empty: 'هنوز رکوردی در لیگ ثبت نشده است.',
          signInHint: 'برای ثبت رتبه و مشاهدهٔ جایگاه خود وارد حساب کاربری شوید.',
        }
      : locale === 'ckb'
        ? {
            title: 'لیگی دروستکەری وشە',
            subtitle: 'یاریزانان، سکەکان و پێشڕەوی قۆناغەکان',
            yourCoins: 'سکەکانت',
            yourLevel: 'ئاستت',
            empty: 'هێشتا هیچ تۆمارێک لە لیگدا نییە.',
            signInHint: 'بۆ تۆمارکردنی پلەکەت بچۆ ژوورەوە.',
          }
        : {
            title: 'Word Builder League',
            subtitle: 'Lifetime players, coins, and level progress',
            yourCoins: 'Your coins',
            yourLevel: 'Your level',
            empty: 'No leaderboard entries yet.',
            signInHint: 'Sign in to sync your progress to the leaderboard.',
          };

  return (
    <WordBuilderNormalHub
      locale={locale}
      unlockAll={unlockAll}
      signedIn={signedIn}
      league={league}
      labels={{
        back: t('back'),
        title: t('wordBuilderNormalTitle'),
        subtitle: t('wordBuilderNormalSubtitle'),
        reset: t('wordBuilderCampaignReset'),
        resetConfirm: t('wordBuilderCampaignResetConfirm'),
        resetDone: t('wordBuilderCampaignResetDone'),
        cancel: t('cancel'),
        close: t('close'),
        beginner: t('wordBuilderDifficultyBeginner'),
        intermediate: t('wordBuilderDifficultyIntermediate'),
        advanced: t('wordBuilderDifficultyAdvanced'),
        lockedIntermediateSub: t('wordBuilderTierLockedIntermediateSubtitle'),
        lockedIntermediateMsg: t('wordBuilderTierLockedIntermediateMessage'),
        lockedAdvancedSub: t('wordBuilderTierLockedAdvancedSubtitle'),
        lockedAdvancedMsg: t('wordBuilderTierLockedAdvancedMessage'),
        stageNTemplate: raw('wordBuilderCampaignStageN'),
        leagueTitle: leagueCopy.title,
        leagueSubtitle: leagueCopy.subtitle,
        yourCoins: leagueCopy.yourCoins,
        yourLevel: leagueCopy.yourLevel,
        leagueEmpty: leagueCopy.empty,
        signInLeagueHint: leagueCopy.signInHint,
      }}
    />
  );
}
