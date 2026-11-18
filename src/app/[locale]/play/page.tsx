import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { CardGrid, CardLink } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/icons';
import { Badge, Container, PageHeader } from '@/components/ui/primitives';
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
  const t = getTranslator(locale);

  return (
    <Container>
      <PageHeader
        title={t('wordBuilderTitle')}
        description={t('wordBuilderHomeSubtitle')}
      />
      <Suspense fallback={<CardGridSkeleton count={12} />}>
        <CategoryGrid locale={locale} />
      </Suspense>
    </Container>
  );
}

/**
 * The 51 game categories.
 *
 * `game_word_categories.php` is a single ~400 KB response holding all 2,851
 * words, with no per-category endpoint. It is fetched and cached on the server;
 * this page strips the words entirely and sends only names and counts, so the
 * browser receives a few KB instead of 400.
 */
async function CategoryGrid({ locale }: { locale: Locale }) {
  const [categories, gloss] = await Promise.all([
    getGameCategorySummaries(),
    getGloss(locale),
  ]);
  const t = getTranslator(locale);

  if (categories.length === 0) {
    return (
      <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-center">
        {t('wordBuilderCategoryNoWordsYet')}
      </p>
    );
  }

  return (
    <CardGrid min="12rem">
      {categories.map((category) => {
        // Category names use name_ckb, unlike the words inside them.
        const name = locale === 'en' ? category.name.en : glossOf(category.name, gloss);

        return (
          <CardLink key={category.id} href={localeHref(locale, `/play/${category.slug}`)}>
            <div className="bg-secondary-container text-on-secondary-container mb-3 flex size-12 items-center justify-center rounded-[var(--radius-logo)]">
              {/* Flutter icon names mapped to web glyphs, with a fallback. */}
              <CategoryIcon name={category.icon} className="size-6" />
            </div>
            <h3 className="text-on-surface text-[length:var(--text-h4)]">
              {name || category.name.en}
            </h3>
            <div className="mt-auto pt-3">
              <Badge>{t('wordCount', { count: category.wordCount })}</Badge>
            </div>
          </CardLink>
        );
      })}
    </CardGrid>
  );
}
