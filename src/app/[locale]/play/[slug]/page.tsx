import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { WordBuilderGame } from '@/components/features/games/word-builder-game';
import { ButtonLink } from '@/components/ui/button';
import { CategoryIcon, IconArrowBack } from '@/components/ui/icons';
import { Badge, Container } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/states';
import { glossOf } from '@/lib/api/normalize';
import { getGameCategory } from '@/lib/api/queries';
import { buildWordBuilderLevels, mulberry32 } from '@/lib/game/word-builder/levels';
import { gameLemma } from '@/lib/game/word-builder/logic';
import type { WordBuilderSourceWord } from '@/lib/game/word-builder/types';
import { isLocale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
import { PLAY_SECTION_VISIBLE, localeHref } from '@/lib/nav';
import { getGloss } from '@/lib/request-context';

/** Slugs are lowercase identifiers from the API; reject anything else. */
function parseSlug(value: string): string | null {
  return /^[a-z0-9_-]{1,64}$/.test(value) ? value : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/play/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const safe = parseSlug(slug);
  if (!safe) return {};
  const category = await getGameCategory(safe);
  if (!category) return {};

  return {
    title: category.name.en,
    alternates: { canonical: `/${locale}/play/${safe}` },
  };
}

export default async function PlayCategoryPage({
  params,
}: PageProps<'/[locale]/play/[slug]'>) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  if (!PLAY_SECTION_VISIBLE) redirect(localeHref(locale, ''));
  const safe = parseSlug(slug);
  if (!safe) notFound();

  const [category, gloss] = await Promise.all([getGameCategory(safe), getGloss(locale)]);
  if (!category) notFound();

  const t = getTranslator(locale);
  const raw = getRawMessage(locale);
  const name = locale === 'en' ? category.name.en : glossOf(category.name, gloss);

  /*
   * Only this one category's words cross the wire, already resolved to the
   * reader's gloss. The other 50 categories stay on the server, so a page that
   * would otherwise carry a 400 KB payload carries a few KB.
   */
  const usable = category.words
    .map((w) => ({
      word: w.word,
      meaning: glossOf(w.meaning, gloss),
      exampleEn: w.example.en,
      exampleGloss: glossOf(w.example, gloss),
    }))
    .filter((w) => w.word && w.meaning);

  /*
   * Classic Word Builder levels are built on the server with a seed from the
   * category id — same first session for every visitor of a cached page, and
   * hydration-safe. Only a–z lemmas of length 2–7 are playable (app rule).
   */
  const sourceWords: WordBuilderSourceWord[] = usable.filter((w) => gameLemma(w.word));
  const levels = buildWordBuilderLevels(sourceWords, mulberry32(category.id), {
    categoryLabel: category.name.en || category.slug,
  });

  return (
    <Container className="pb-1">
      {/* Compact session chrome — one row instead of back + large PageHeader. */}
      <div className="mb-2 flex items-center gap-2 sm:mb-3">
        <ButtonLink
          href={localeHref(locale, '/play')}
          variant="ghost"
          size="md"
          className="shrink-0 !min-h-10 px-2.5 py-2"
          aria-label={t('wordBuilderTitle')}
        >
          <IconArrowBack className="size-5" />
          <span className="sr-only sm:not-sr-only sm:ms-1">{t('wordBuilderTitle')}</span>
        </ButtonLink>
        <h1 className="text-on-surface min-w-0 flex-1 truncate text-base font-extrabold sm:text-lg">
          {name || category.name.en}
        </h1>
        <Badge className="hidden shrink-0 sm:inline-flex">
          {t('wordCount', { count: usable.length })}
        </Badge>
        <span className="bg-secondary-container text-on-secondary-container hidden size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] sm:inline-flex">
          <CategoryIcon name={category.icon} className="size-4" />
        </span>
      </div>

      {usable.length === 0 ? (
        <EmptyState title={t('wordBuilderCategoryNoWordsYet')} />
      ) : levels.length > 0 ? (
        <WordBuilderGame
          levels={levels}
          locale={locale}
          glossLang={gloss}
          labels={{
            levelOfTemplate: raw('wordBuilderLevelOf'),
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
            targetsHeading: t('wordBuilderTargetsHeading'),
            meaning: t('wordBuilderMeaning'),
            example: t('wordBuilderExample'),
            close: t('close'),
          }}
        />
      ) : (
        <EmptyState title={t('wordBuilderNoWordsBody')} />
      )}
    </Container>
  );
}
