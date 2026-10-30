import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { CardLink } from '@/components/ui/card';
import { SearchField } from '@/components/features/search/search-field';
import { Badge, Container, PageHeader, SectionHeading } from '@/components/ui/primitives';
import { EmptyState, ListSkeleton } from '@/components/ui/states';
import { glossOf } from '@/lib/api/normalize';
import {
  getBooks,
  getGameCategorySummaries,
  getGrammarTopics,
  getSpeakingTopics,
} from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';
import { getGloss } from '@/lib/request-context';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/search'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);
  return {
    title: t('search'),
    // A search results page is not useful in an index.
    robots: { index: false },
  };
}

/**
 * Cross-content search over the catalogs: books, grammar topics, speaking
 * topics and game categories.
 *
 * Deliberately not over individual words. Word search is per-book, where the
 * payload is already cached and virtualised; a global word search would mean
 * pulling all 33 books (5.6 MB) on every query.
 */
export default function SearchPage({
  params,
  searchParams,
}: PageProps<'/[locale]/search'>) {
  return (
    <Container>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <SearchContent params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function SearchContent({
  params,
  searchParams,
}: {
  params: PageProps<'/[locale]/search'>['params'];
  searchParams: PageProps<'/[locale]/search'>['searchParams'];
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  const raw = Array.isArray(query.q) ? query.q[0] : query.q;
  // The query lives in the URL so a search can be shared and restored.
  const term = (raw ?? '').trim();

  return (
    <>
      <PageHeader title={t('search')} />
      <SearchField
        action={localeHref(locale, '/search')}
        defaultValue={term}
        placeholder={t('searchSiteHint')}
        label={t('search')}
      />

      {term.length < 2 ? (
        <p className="text-on-surface-variant mt-8">{t('searchPrompt')}</p>
      ) : (
        <Suspense fallback={<ListSkeleton rows={6} />}>
          <Results term={term} locale={locale} />
        </Suspense>
      )}
    </>
  );
}

async function Results({ term, locale }: { term: string; locale: Locale }) {
  const t = getTranslator(locale);
  const needle = term.toLowerCase();

  const [books, grammarTopics, speakingTopics, categories, gloss] = await Promise.all([
    getBooks(),
    getGrammarTopics(),
    getSpeakingTopics(),
    getGameCategorySummaries(),
    getGloss(locale),
  ]);

  const bookHits = books.filter(
    (b) =>
      b.title.toLowerCase().includes(needle) ||
      b.description.toLowerCase().includes(needle) ||
      (b.seriesTitle ?? '').toLowerCase().includes(needle)
  );
  const grammarHits = grammarTopics.filter((x) => x.topic.toLowerCase().includes(needle));
  const speakingHits = speakingTopics.filter((x) =>
    x.title.toLowerCase().includes(needle)
  );
  const categoryHits = categories.filter((c) =>
    [c.name.en, c.name.fa, c.name.ckb, c.slug].some((n) =>
      n.toLowerCase().includes(needle)
    )
  );

  const total =
    bookHits.length + grammarHits.length + speakingHits.length + categoryHits.length;

  if (total === 0) {
    return (
      <div className="mt-8">
        <EmptyState title={t('resultsCount', { count: 0 })} />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-10">
      <p aria-live="polite" className="sr-only">
        {t('resultsCount', { count: total })}
      </p>
      <Badge>{t('resultsCount', { count: total })}</Badge>

      {bookHits.length > 0 ? (
        <section>
          <SectionHeading>{t('tabVocabulary')}</SectionHeading>
          <ResultList>
            {bookHits.map((b) => (
              <CardLink key={b.id} href={localeHref(locale, `/books/${b.id}`)}>
                <h3 className="text-[length:var(--text-h4)]">
                  <bdi lang="en">{b.title}</bdi>
                </h3>
                {b.seriesTitle ? (
                  <p className="text-on-surface-variant mt-1 text-[length:var(--text-label)]">
                    <bdi lang="en">{b.seriesTitle}</bdi>
                  </p>
                ) : null}
              </CardLink>
            ))}
          </ResultList>
        </section>
      ) : null}

      {grammarHits.length > 0 ? (
        <section>
          <SectionHeading>{t('tabGrammar')}</SectionHeading>
          <ResultList>
            {grammarHits.map((x) => (
              <CardLink key={x.id} href={localeHref(locale, `/grammar/topics/${x.id}`)}>
                <h3 className="text-[length:var(--text-h4)]">
                  <bdi lang="en">{x.topic}</bdi>
                </h3>
                <p className="text-on-surface-variant mt-1 text-[length:var(--text-label)]">
                  {t('grammarTopicsQuestionsCount', { count: x.questionCount })}
                </p>
              </CardLink>
            ))}
          </ResultList>
        </section>
      ) : null}

      {speakingHits.length > 0 ? (
        <section>
          <SectionHeading>{t('speakingPart1Title')}</SectionHeading>
          <ResultList>
            {speakingHits.map((x) => (
              <CardLink key={x.id} href={localeHref(locale, `/speaking/topics/${x.id}`)}>
                <h3 className="text-[length:var(--text-h4)]">
                  <bdi lang="en">{x.title}</bdi>
                </h3>
              </CardLink>
            ))}
          </ResultList>
        </section>
      ) : null}

      {categoryHits.length > 0 ? (
        <section>
          <SectionHeading>{t('tabPlay')}</SectionHeading>
          <ResultList>
            {categoryHits.map((c) => (
              <CardLink key={c.id} href={localeHref(locale, `/play/${c.slug}`)}>
                <h3 className="text-[length:var(--text-h4)]">
                  {(locale === 'en' ? c.name.en : glossOf(c.name, gloss)) || c.name.en}
                </h3>
                <p className="text-on-surface-variant mt-1 text-[length:var(--text-label)]">
                  {t('wordCount', { count: c.wordCount })}
                </p>
              </CardLink>
            ))}
          </ResultList>
        </section>
      ) : null}
    </div>
  );
}

function ResultList({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(16rem, 100%), 1fr))' }}
    >
      {children}
    </div>
  );
}
