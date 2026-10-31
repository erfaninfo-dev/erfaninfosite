import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import {
  BookBrowser,
  type BrowserCard,
  type BrowserLabels,
} from '@/components/features/home/book-browser';
import { CardGridSkeleton, Skeleton } from '@/components/ui/states';
import { Container } from '@/components/ui/primitives';
import { getBooks, getSpeakingTopics } from '@/lib/api/queries';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getRawMessage, getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://erfaninfo.com';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);

  return {
    title: 'Erfan Academy',
    description: t('siteTagline'),
    alternates: { canonical: `/${locale}` },
  };
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Erfan Academy',
    url: `${SITE_URL}/${locale}`,
    description: t('siteTagline'),
    inLanguage: ['en', 'fa', 'ckb'],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // A static object built from literals in this repo — never API content.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container size="content" className="relative">
        <Suspense fallback={<HomeSkeleton />}>
          <Browser locale={locale} />
        </Suspense>
      </Container>

      <BackgroundWave />
    </>
  );
}

function HomeSkeleton() {
  return (
    <>
      <Skeleton className="mb-6 h-64 w-full rounded-[1.75rem]" />
      <Skeleton className="mb-6 h-13 w-full rounded-2xl" />
      <CardGridSkeleton count={6} />
    </>
  );
}

/**
 * The cards shown on the home page.
 *
 * This mirrors the app's home screen, checked by running it: the hero asks you
 * to choose a book, two track tabs filter IELTS from General, and the list is
 * the books — series collapsed to one card — plus a "Speaking Part 1" card in
 * the same list. Grammar is deliberately absent: it is its own tab there and
 * its own section here.
 *
 * Every title, subtitle, badge and count comes from the API. The accent hue is
 * derived from the entry's id so a card keeps its colour between renders and
 * between server and client.
 */
async function Browser({ locale }: { locale: Locale }) {
  const [books, speakingTopics] = await Promise.all([getBooks(), getSpeakingTopics()]);

  const t = getTranslator(locale);
  const raw = getRawMessage(locale);

  /** 1–6, stable for a given id. */
  const accentFor = (seed: number) => ((seed * 7) % 6) + 1;

  /*
   * Books that belong to a series are shown once, as the series, with the
   * number of volumes — twenty separate "Cambridge IELTS" cards would bury
   * everything else. Standalone books get their own card.
   */
  const seriesSeen = new Set<string>();
  const bookCards: BrowserCard[] = [];

  for (const book of books) {
    if (book.seriesTitle) {
      if (seriesSeen.has(book.seriesTitle)) continue;
      seriesSeen.add(book.seriesTitle);
      const volumes = books.filter((b) => b.seriesTitle === book.seriesTitle);
      bookCards.push({
        id: `series-${book.seriesId ?? book.seriesTitle}`,
        href: localeHref(locale, `/books/${book.id}`),
        title: book.seriesTitle,
        subtitle: t('homeSeriesVolumesCount', { count: volumes.length }),
        badge: null,
        accent: accentFor(book.seriesId ?? book.id),
        icon: 'book',
        track: book.track,
      });
      continue;
    }

    bookCards.push({
      id: `book-${book.id}`,
      href: localeHref(locale, `/books/${book.id}`),
      title: book.title,
      subtitle: book.description,
      badge: null,
      accent: accentFor(book.id),
      icon: 'book',
      track: book.track,
    });
  }

  const speakingCard: BrowserCard[] =
    speakingTopics.length > 0
      ? [
          {
            id: 'speaking',
            href: localeHref(locale, '/speaking'),
            title: t('speakingPart1Title'),
            subtitle: t('speakingHomeCardSubtitle'),
            badge: t('speakingPart1Badge'),
            accent: 3,
            icon: 'speaking',
            track: 'ielts',
          },
        ]
      : [];

  const cards = [...speakingCard, ...bookCards];

  /*
   * Two tabs, IELTS first, exactly as the app shows them — no "All". A segment
   * that would always be empty is not drawn: `is_student` books are the app's
   * "Class" track and no book carries that flag today, so it does not appear
   * until one does.
   */
  const tracks: Array<{ id: string; label: string }> = [];
  if (cards.some((c) => c.track === 'ielts')) {
    tracks.push({ id: 'ielts', label: t('homeTrackIelts') });
  }
  if (cards.some((c) => c.track === 'general')) {
    tracks.push({ id: 'general', label: t('homeTrackGeneral') });
  }
  if (books.some((b) => b.isStudent)) {
    tracks.push({ id: 'class', label: t('homeTrackClass') });
  }

  const labels: BrowserLabels = {
    heading: t('chooseYourBook'),
    searchHint: t('searchBooksHint'),
    availableTemplate: raw('booksAvailable'),
    showingTemplate: raw('showingOf'),
    loadMore: t('loadMore'),
    noResults: t('noBooksMatch'),
    tracks,
    league: t('leagueLabel'),
    accountsSoon: t('comingWithAccounts'),
    pageLabelTemplate: raw('pageOf'),
  };

  return (
    <BookBrowser
      cards={cards}
      /*
       * The books in each track, so the hero line matches the tab the reader
       * is on — the app shows "24 books available" with IELTS selected, which
       * is the IELTS count, not the whole 33.
       */
      bookCountByTrack={{
        ielts: books.filter((b) => b.track === 'ielts').length,
        general: books.filter((b) => b.track === 'general').length,
        class: books.filter((b) => b.isStudent).length,
      }}
      labels={labels}
      locale={locale}
    />
  );
}

/** The faint wave along the bottom of the page. Decorative only. */
function BackgroundWave() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-40 overflow-hidden"
    >
      <svg
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
        className="text-primary/8 size-full"
        fill="currentColor"
      >
        <path d="M0 80c180-50 360-50 540-10s360 70 540 30 300-60 360-70v130H0Z" />
      </svg>
    </div>
  );
}
