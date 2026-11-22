import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { WordBuilderCampaignStages } from '@/components/features/games/word-builder-campaign-stages';
import { fetchAccount } from '@/lib/auth/api';
import { getAuthToken } from '@/lib/auth/session';
import { isCampaignDifficulty } from '@/lib/game/word-builder/campaign';
import type { WordBuilderDifficulty } from '@/lib/game/word-builder/types';
import { isLocale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator, type MessageKey } from '@/lib/i18n/messages';
import { PLAY_SECTION_VISIBLE, localeHref } from '@/lib/nav';

function difficultyTitleKey(d: WordBuilderDifficulty): MessageKey {
  switch (d) {
    case 'beginner':
      return 'wordBuilderDifficultyBeginner';
    case 'intermediate':
      return 'wordBuilderDifficultyIntermediate';
    case 'advanced':
      return 'wordBuilderDifficultyAdvanced';
  }
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/play/normal/[difficulty]'>): Promise<Metadata> {
  const { locale, difficulty } = await params;
  if (!isLocale(locale) || !isCampaignDifficulty(difficulty)) return {};
  const t = getTranslator(locale);
  return {
    title: `${t(difficultyTitleKey(difficulty))} · ${t('wordBuilderNormalTitle')}`,
    alternates: { canonical: `/${locale}/play/normal/${difficulty}` },
  };
}

export default async function PlayNormalDifficultyPage({
  params,
}: PageProps<'/[locale]/play/normal/[difficulty]'>) {
  const { locale, difficulty } = await params;
  if (!isLocale(locale)) notFound();
  if (!PLAY_SECTION_VISIBLE) redirect(localeHref(locale, ''));
  if (!isCampaignDifficulty(difficulty)) notFound();

  const token = await getAuthToken();
  const accountRes = token ? await fetchAccount(token) : null;
  const unlockAll =
    accountRes && typeof accountRes === 'object' ? accountRes.isAdmin : false;

  const t = getTranslator(locale);
  const raw = getRawMessage(locale);

  return (
    <WordBuilderCampaignStages
      locale={locale}
      difficulty={difficulty}
      unlockAll={unlockAll}
      labels={{
        back: t('back'),
        difficultyTitle: t(difficultyTitleKey(difficulty)),
        stageNTemplate: raw('wordBuilderCampaignStageN'),
        stageCompleted: t('wordBuilderCampaignStageCompleted'),
        stageReplayHint: t('wordBuilderCampaignStageReplayHint'),
        stageLockedToast: t('wordBuilderCampaignStageLockedSnackbar'),
        tierLockedBody: t('wordBuilderCampaignTierLockedBody'),
      }}
    />
  );
}
