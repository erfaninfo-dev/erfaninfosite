import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { WordBuilderThemeStages } from '@/components/features/games/word-builder-theme-stages';
import { Container } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/states';
import { glossOf } from '@/lib/api/normalize';
import { getGameCategory } from '@/lib/api/queries';
import { fetchAccount } from '@/lib/auth/api';
import { getAuthToken } from '@/lib/auth/session';
import { buildThemeStageLevels } from '@/lib/game/word-builder/levels';
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

/**
 * Glossy 5-column stages grid for a Word Builder theme category,
 * matching Flutter's `WordBuilderThemeStagesScreen`.
 */
export default async function PlayCategoryStagesPage({
  params,
}: PageProps<'/[locale]/play/[slug]'>) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  if (!PLAY_SECTION_VISIBLE) redirect(localeHref(locale, ''));
  const safe = parseSlug(slug);
  if (!safe) notFound();

  const token = await getAuthToken();
  const [category, gloss, accountRes] = await Promise.all([
    getGameCategory(safe),
    getGloss(locale),
    token ? fetchAccount(token) : Promise.resolve(null),
  ]);
  if (!category) notFound();

  const unlockAll =
    accountRes && typeof accountRes === 'object' ? accountRes.isAdmin : false;

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

  if (usable.length === 0) {
    return (
      <Container className="py-10">
        <EmptyState title={t('wordBuilderCategoryNoWordsYet')} />
      </Container>
    );
  }

  if (levels.length === 0) {
    return (
      <Container className="py-10">
        <EmptyState title={t('wordBuilderNoWordsBody')} />
      </Container>
    );
  }

  return (
    <WordBuilderThemeStages
      locale={locale}
      slug={category.slug}
      title={name || category.name.en}
      totalStages={levels.length}
      unlockAll={unlockAll}
      labels={{
        back: t('back'),
        stageNTemplate: raw('wordBuilderCampaignStageN'),
        stageCompleted: t('wordBuilderCampaignStageCompleted'),
        stageReplayHint: t('wordBuilderCampaignStageReplayHint'),
        stageLockedToast: t('wordBuilderCampaignStageLockedSnackbar'),
        reset: t('wordBuilderCampaignReset'),
        resetConfirm: t('wordBuilderCampaignResetConfirm'),
        cancel: t('cancel'),
      }}
    />
  );
}
