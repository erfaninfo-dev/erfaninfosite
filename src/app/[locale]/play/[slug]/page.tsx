import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  Flashcards,
  type FlashcardData,
} from '@/components/features/flashcards/flashcards';
import { MatchingGame, type MatchPair } from '@/components/features/games/matching-game';
import { ButtonLink } from '@/components/ui/button';
import { CategoryIcon, IconArrowBack } from '@/components/ui/icons';
import { Badge, Container, PageHeader, SectionHeading } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/states';
import { glossOf } from '@/lib/api/normalize';
import { getGameCategory } from '@/lib/api/queries';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';
import { seededShuffle } from '@/lib/shuffle';
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
  const safe = parseSlug(slug);
  if (!safe) notFound();

  const [category, gloss] = await Promise.all([getGameCategory(safe), getGloss(locale)]);
  if (!category) notFound();

  const t = getTranslator(locale);
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

  const cards: FlashcardData[] = usable.map((w, i) => ({
    id: `${category.id}-${i}`,
    front: w.word,
    back: w.meaning,
    exampleEn: w.exampleEn,
    exampleGloss: w.exampleGloss,
  }));

  /*
   * Meanings must be distinct within a round, or two options would both be
   * right and the game would mark a correct answer wrong.
   */
  const seen = new Set<string>();
  const pairs: MatchPair[] = [];
  for (const [i, w] of usable.entries()) {
    if (seen.has(w.meaning)) continue;
    seen.add(w.meaning);
    pairs.push({ id: `${category.id}-${i}`, word: w.word, meaning: w.meaning });
  }

  /*
   * Ordered here rather than in the component, and seeded rather than random:
   * the game derives its first round deterministically from these props, so
   * hydration matches and the cached page is identical for every visitor.
   * The seed is the category id, so each category opens on a different set.
   */
  const shuffledPairs = seededShuffle(pairs, category.id);

  return (
    <Container>
      <ButtonLink
        href={localeHref(locale, '/play')}
        variant="ghost"
        size="md"
        className="mb-5"
      >
        <IconArrowBack className="size-5" />
        {t('wordBuilderTitle')}
      </ButtonLink>

      <PageHeader
        title={name || category.name.en}
        meta={
          <>
            <Badge>{t('wordCount', { count: usable.length })}</Badge>
            <span className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-secondary-container text-on-secondary-container">
              <CategoryIcon name={category.icon} className="size-5" />
            </span>
          </>
        }
      />

      {usable.length === 0 ? (
        <EmptyState title={t('wordBuilderCategoryNoWordsYet')} />
      ) : (
        <div className="space-y-12">
          <section>
            <SectionHeading>{t('tabReview')}</SectionHeading>
            <Flashcards
              cards={cards}
              glossLang={gloss}
              labels={{
                progress: t('wordCount', { count: cards.length }),
                reveal: t('speakingExpand'),
                next: t('next'),
                previous: t('previous'),
                restart: t('practiseAgain'),
                finished: t('allCardsReviewed'),
                notSynced: t('progressNotSynced'),
              }}
            />
          </section>

          {shuffledPairs.length >= 4 ? (
            <section>
              <SectionHeading>{t('tabPlay')}</SectionHeading>
              <MatchingGame
                pairs={shuffledPairs}
                glossLang={gloss}
                labels={{
                  prompt: t('wordBuilderTranslation'),
                  correct: t('answerCorrect'),
                  wrong: t('answerWrong'),
                  newRound: t('practiseAgain'),
                  finished: t('allCardsReviewed'),
                }}
              />
            </section>
          ) : null}
        </div>
      )}
    </Container>
  );
}
