import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { WordBuilderGame } from '@/components/features/games/word-builder-game';
import { Container } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/states';
import { glossOf } from '@/lib/api/normalize';
import { getGameCategory } from '@/lib/api/queries';
import { filterSpellableCatalogWords } from '@/lib/game/word-builder/campaign';
import { buildThemeStageLevels } from '@/lib/game/word-builder/levels';
import { gameLemma } from '@/lib/game/word-builder/logic';
import type { WordBuilderSourceWord } from '@/lib/game/word-builder/types';
import { isLocale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
import { PLAY_SECTION_VISIBLE, localeHref } from '@/lib/nav';
import { getGloss } from '@/lib/request-context';

function parseSlug(value: string): string | null {
  return /^[a-z0-9_-]{1,64}$/.test(value) ? value : null;
}

function parseStage(value: string, max: number): number | null {
  if (!/^\d{1,4}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && n <= max ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/play/[slug]/[stage]'>): Promise<Metadata> {
  const { locale, slug, stage } = await params;
  if (!isLocale(locale)) return {};
  const safe = parseSlug(slug);
  if (!safe) return {};
  const category = await getGameCategory(safe);
  if (!category) return {};
  const t = getTranslator(locale);
  const stageNum = /^\d{1,4}$/.test(stage) ? Number(stage) : null;
  return {
    title: stageNum
      ? `${category.name.en} · ${t('wordBuilderCampaignStageN', { n: stageNum })}`
      : category.name.en,
    alternates: { canonical: `/${locale}/play/${safe}/${stage}` },
  };
}

export default async function PlayCategoryStageSessionPage({
  params,
}: PageProps<'/[locale]/play/[slug]/[stage]'>) {
  const { locale, slug, stage } = await params;
  if (!isLocale(locale)) notFound();
  if (!PLAY_SECTION_VISIBLE) redirect(localeHref(locale, ''));
  const safe = parseSlug(slug);
  if (!safe) notFound();

  const [category, gloss] = await Promise.all([getGameCategory(safe), getGloss(locale)]);
  if (!category) notFound();

  const t = getTranslator(locale);
  const raw = getRawMessage(locale);
  const name = locale === 'en' ? category.name.en : glossOf(category.name, gloss);

  const usable = category.words
    .map((w) => ({
      word: w.word,
      meaning: glossOf(w.meaning, gloss),
      exampleEn: w.example.en,
      exampleGloss: glossOf(w.example, gloss),
    }))
    .filter((w) => w.word && w.meaning);

  const sourceWords: WordBuilderSourceWord[] = usable.filter((w) => gameLemma(w.word));
  const levels = buildThemeStageLevels(sourceWords, {
    categoryLabel: category.name.en || category.slug,
  });

  if (levels.length === 0) {
    return (
      <Container>
        <EmptyState title={t('wordBuilderNoWordsBody')} />
      </Container>
    );
  }

  const stageNum = parseStage(stage, levels.length);
  if (!stageNum) notFound();

  const level = levels[stageNum - 1]!;
  const spellableCatalog = filterSpellableCatalogWords(sourceWords, level);

  return (
    <WordBuilderGame
      key={`${category.slug}-${stageNum}`}
      categorySlug={category.slug}
      categoryTitle={name || category.name.en}
      levels={[level]}
      catalogWords={spellableCatalog}
      locale={locale}
      glossLang={gloss}
      themeStage={{
        slug: category.slug,
        stage: stageNum,
        totalStages: levels.length,
        stageOfTemplate: raw('wordBuilderCampaignStageOf'),
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
