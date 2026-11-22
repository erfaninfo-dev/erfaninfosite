import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import {
  PlayCategoryPicker,
  type PlayCategoryCardItem,
} from '@/components/features/games/play-category-picker';
import { Container } from '@/components/ui/primitives';
import { CardGridSkeleton } from '@/components/ui/states';
import { glossOf } from '@/lib/api/normalize';
import { getGameCategorySummaries } from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { PLAY_SECTION_VISIBLE, localeHref } from '@/lib/nav';
import { getGloss } from '@/lib/request-context';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/play'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);
  return {
    title: t('tabPlay'),
    alternates: { canonical: `/${locale}/play` },
  };
}

export default async function PlayPage({ params }: PageProps<'/[locale]/play'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!PLAY_SECTION_VISIBLE) redirect(localeHref(locale, ''));

  return (
    <Suspense
      fallback={
        <Container className="py-8">
          <CardGridSkeleton count={12} />
        </Container>
      }
    >
      <CategoryPickerLoader locale={locale} />
    </Suspense>
  );
}

/**
 * Loads the 51 Word Builder categories on the server (stripping full word arrays)
 * and renders Flutter-matched `PlayCategoryPicker` with `MagicBackground`, Coins chip,
 * Search bar, golden Normal Campaign card, and themed category cards.
 */
async function CategoryPickerLoader({ locale }: { locale: Locale }) {
  const [categories, gloss] = await Promise.all([
    getGameCategorySummaries(),
    getGloss(locale),
  ]);
  const t = getTranslator(locale);

  const items: PlayCategoryCardItem[] = categories.map((category) => {
    const label =
      (locale === 'en' ? category.name.en : glossOf(category.name, gloss)) || category.name.en;
    const searchKey = [category.name.en, category.name.fa, category.name.ckb, category.slug]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return {
      id: category.id,
      slug: category.slug,
      icon: category.icon,
      label,
      searchKey,
      wordCount: category.wordCount,
    };
  });

  return (
    <PlayCategoryPicker
      locale={locale}
      categories={items}
      labels={{
        title: t('wordBuilderCategoryPickerTitle'),
        subtitle: t('wordBuilderCategoryPickerSubtitle'),
        searchHint: t('wordBuilderCategorySearchHint'),
        normalTitle: t('wordBuilderNormalTitle'),
        normalSubtitle: t('wordBuilderNormalSubtitle'),
        sectionTitle: t('wordBuilderCategorySectionTitle'),
        emptyResults: t('wordBuilderCategoryEmptyResults'),
        noWordsYet: t('wordBuilderCategoryNoWordsYet'),
      }}
    />
  );
}
