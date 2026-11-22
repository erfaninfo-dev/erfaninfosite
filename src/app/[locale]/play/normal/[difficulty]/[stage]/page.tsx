import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { WordBuilderGame } from '@/components/features/games/word-builder-game';
import { Container } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/states';
import { getAuthToken } from '@/lib/auth/session';
import {
  STAGES_PER_TIER,
  filterSpellableCatalogWords,
  isCampaignDifficulty,
} from '@/lib/game/word-builder/campaign';
import { WB_CAMPAIGN_SEED_COOKIE } from '@/lib/game/word-builder/campaign-progress';
import { getCampaignPlan } from '@/lib/game/word-builder/campaign-server';
import type { WordBuilderDifficulty } from '@/lib/game/word-builder/types';
import { isLocale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator, type MessageKey } from '@/lib/i18n/messages';
import { PLAY_SECTION_VISIBLE, localeHref } from '@/lib/nav';
import { getGloss } from '@/lib/request-context';

function parseStage(raw: string): number | null {
  if (!/^\d{1,2}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= STAGES_PER_TIER ? n : null;
}

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
}: PageProps<'/[locale]/play/normal/[difficulty]/[stage]'>): Promise<Metadata> {
  const { locale, difficulty, stage } = await params;
  if (!isLocale(locale) || !isCampaignDifficulty(difficulty)) return {};
  const stageNum = parseStage(stage);
  if (!stageNum) return {};
  const t = getTranslator(locale);
  return {
    title: `${t(difficultyTitleKey(difficulty))} · ${t('wordBuilderCampaignStageN', { n: stageNum })}`,
    alternates: { canonical: `/${locale}/play/normal/${difficulty}/${stageNum}` },
  };
}

export default async function PlayNormalStagePage({
  params,
}: PageProps<'/[locale]/play/normal/[difficulty]/[stage]'>) {
  const { locale, difficulty, stage } = await params;
  if (!isLocale(locale)) notFound();
  if (!PLAY_SECTION_VISIBLE) redirect(localeHref(locale, ''));
  if (!isCampaignDifficulty(difficulty)) notFound();
  const stageNum = parseStage(stage);
  if (!stageNum) notFound();

  const [gloss, token, jar] = await Promise.all([
    getGloss(locale),
    getAuthToken(),
    cookies(),
  ]);
  const rawSeed = jar.get(WB_CAMPAIGN_SEED_COOKIE)?.value;
  const reshuffleSeed =
    rawSeed && /^\d{1,10}$/.test(rawSeed) ? Number(rawSeed) : 0;

  const { plan, catalogWords } = await getCampaignPlan(gloss, reshuffleSeed);

  const tierLevels = plan[difficulty];
  const level = tierLevels[stageNum - 1];
  const t = getTranslator(locale);
  const raw = getRawMessage(locale);

  if (!level || level.targetWords.length === 0) {
    return (
      <Container>
        <EmptyState title={t('wordBuilderCampaignPlanError')} />
      </Container>
    );
  }

  // Only ship the spellable bonus catalog words (~10–40 words instead of 13,000+)
  // while keeping bonus-word acceptance 100% identical to Flutter's full catalog scan.
  const spellableCatalog = filterSpellableCatalogWords(catalogWords, level);

  const difficultyLabel = t(difficultyTitleKey(difficulty));
  const nextTierDifficulty: WordBuilderDifficulty | null =
    difficulty === 'beginner'
      ? 'intermediate'
      : difficulty === 'intermediate'
        ? 'advanced'
        : null;
  const nextTierLabel =
    difficulty === 'beginner'
      ? t('wordBuilderStartIntermediate')
      : difficulty === 'intermediate'
        ? t('wordBuilderStartAdvanced')
        : null;
  const tierCompleteTitle =
    difficulty === 'beginner'
      ? t('wordBuilderBeginnerCompleteTitle')
      : difficulty === 'intermediate'
        ? t('wordBuilderIntermediateCompleteTitle')
        : t('wordBuilderAdvancedCompleteTitle');
  const tierCompleteBody =
    difficulty === 'beginner'
      ? t('wordBuilderBeginnerCompleteBody')
      : difficulty === 'intermediate'
        ? t('wordBuilderIntermediateCompleteBody')
        : t('wordBuilderAdvancedCompleteBody');

  return (
    <WordBuilderGame
      key={`${difficulty}-${stageNum}-${reshuffleSeed}`}
      categorySlug={`campaign_${difficulty}`}
      categoryTitle={difficultyLabel}
      levels={[level]}
      catalogWords={spellableCatalog}
      locale={locale}
      glossLang={gloss}
      campaign={{
        difficulty,
        difficultyLabel,
        stage: stageNum,
        totalStages: STAGES_PER_TIER,
        signedIn: Boolean(token),
        stageOfTemplate: raw('wordBuilderCampaignStageOf'),
        nextTierDifficulty,
        nextTierLabel,
        tierCompleteTitle,
        tierCompleteBody,
      }}
      labels={{
        levelOfTemplate: raw('wordBuilderLevelOf'),
        stageNTemplate: raw('wordBuilderCampaignStageN'),
        back: t('back'),
        exit: t('exit'),
        shuffle: t('wordBuilderShuffle'),
        hintReveal: t('wordBuilderHintReveal'),
        hintMeaning: t('wordBuilderHintMeaning'),
        coinsCostTemplate: raw('wordBuilderCoinsCost'),
        translation: t('wordBuilderTranslation'),
        correct: t('wordBuilderCorrectNice'),
        alreadyFound: t('wordBuilderAlreadyFound'),
        notEnoughCoins: t('wordBuilderNotEnoughCoins'),
        hintLetter: t('wordBuilderHintLetter'),
        levelCompleteTitle: t('wordBuilderLevelCompleteTitle'),
        levelCompleteBody: t('wordBuilderLevelCompleteBody'),
        nextLevel: t('wordBuilderNextLevel'),
        allLevelsDone: t('wordBuilderAllLevelsDone'),
        replay: t('wordBuilderReplayLevel'),
        resetProgress: t('wordBuilderCampaignReset'),
        targetsHeading: t('wordBuilderTargetsHeading'),
        meaning: t('wordBuilderMeaning'),
        example: t('wordBuilderExample'),
        speakWord: t('wordBuilderSpeakWord'),
        speakExample: t('wordBuilderSpeakExample'),
        close: t('close'),
        soundTitle: t('wordBuilderSessionSoundTitle'),
        bgmSwitch: t('wordBuilderSessionBgmSwitch'),
        bgmSubtitle: t('wordBuilderSessionBgmSubtitle'),
        sfxSwitch: t('wordBuilderSessionSfxSwitch'),
        sfxSubtitle: t('wordBuilderSessionSfxSubtitle'),
      }}
    />
  );
}
