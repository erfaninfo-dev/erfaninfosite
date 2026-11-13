import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { BookBrowser, type BrowserLabels } from '@/components/features/home/book-browser';
import { CardGridSkeleton, Skeleton } from '@/components/ui/states';
import { Container } from '@/components/ui/primitives';
import type { HomePanelFabProps } from '@/components/panel/home-panel-fab';
import { getBookPdfs, getBooks, getSpeakingTopics, getUnits } from '@/lib/api/queries';
import { fetchAccount } from '@/lib/auth/api';
import { fetchMessagesUnreadSummary } from '@/lib/auth/panel-api';
import { getAuthToken } from '@/lib/auth/session';
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
 * Checked against the running app: the hero asks you to choose a book, two
 * track tabs filter IELTS from General, Speaking Part 1 is a full-width card
 * above the IELTS grid, and a series is one card. A standalone book shows how
 * many units it has. Grammar is its own tab, so it is not a card here.
 */
async function Browser({ locale }: { locale: Locale }) {
  const [books, speakingTopics, pdfs] = await Promise.all([
    getBooks(),
    getSpeakingTopics(),
    getBookPdfs(),
  ]);
  const pdfBookIds = [...new Set(pdfs.map((pdf) => pdf.bookId))];

  const t = getTranslator(locale);
  const raw = getRawMessage(locale);

  const unitCounts: Record<number, number> = {};
  await Promise.all(
    books
      .filter((book) => book.seriesId == null)
      .map(async (book) => {
        unitCounts[book.id] = (await getUnits(book.id)).length;
      })
  );

  /*
   * Two tabs, IELTS first, exactly as the app shows them. Class is the app's
   * student catalog and stays hidden until Membership.
   */
  const tracks: Array<{ id: string; label: string }> = [];
  if (books.some((book) => book.track === 'ielts')) {
    tracks.push({ id: 'ielts', label: t('homeTrackIelts') });
  }
  if (books.some((book) => book.track === 'general')) {
    tracks.push({ id: 'general', label: t('homeTrackGeneral') });
  }

  let panelFab: HomePanelFabProps | null = null;
  const token = await getAuthToken();
  if (token) {
    const account = await fetchAccount(token);
    if (
      account !== 'unauthorized' &&
      account !== 'unavailable'
    ) {
      const summary = await fetchMessagesUnreadSummary(token);
      const badge =
        summary !== 'failed'
          ? account.isTeacher || account.isAdmin
            ? summary.teacherStudentsWithUnread
            : summary.studentUnreadFromTeacher
          : 0;
      const showPanelFab =
        account.isTeacher || account.isAdmin || account.teacherUserId != null;
      if (showPanelFab) {
        if (account.isTeacher || account.isAdmin) {
          panelFab = {
            locale,
            href: localeHref(locale, '/teacher'),
            label: t('tabStudents'),
            tooltip: t('tabStudents'),
            variant: 'teacher',
            badge,
          };
        } else {
          panelFab = {
            locale,
            href: localeHref(locale, '/student-panel'),
            label: t('myPanelFab'),
            tooltip: t('studentPanelFabTooltip'),
            variant: 'student',
            badge,
          };
        }
      }
    }
  }

  const labels: BrowserLabels = {
    heading: t('chooseYourBook'),
    searchHint: t('searchBooksHint'),
    availableTemplate: raw('booksAvailable'),
    volumesTemplate: raw('homeSeriesVolumesCount'),
    unitCountTemplate: raw('unitCount'),
    noResults: t('noBooksFound'),
    tracks,
    league: 'League',
    accountsSoon: t('comingWithAccounts'),
    soonLine: 'New lessons are coming soon',
    soonBadge: 'Soon...',
    pdf: t('bookStudyPdfOpen'),
  };

  return (
    <BookBrowser
      books={books}
      unitCounts={unitCounts}
      pdfBookIds={pdfBookIds}
      speaking={
        speakingTopics.length > 0
          ? {
              href: localeHref(locale, '/speaking'),
              title: t('speakingHomeCardTitle'),
              subtitle: t('speakingHomeCardSubtitle'),
              badge: t('speakingPart1Badge'),
            }
          : null
      }
      labels={labels}
      locale={locale}
      panelFab={panelFab}
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
