import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { ClassSessionsView } from '@/components/panel/class-sessions-view';
import { PanelTabs } from '@/components/panel/panel-tabs';
import { IconArrowBack } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { fetchAccount } from '@/lib/auth/api';
import { fetchMyClassSessions } from '@/lib/auth/panel-api';
import { getAuthToken } from '@/lib/auth/session';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

const TAB_IDS = ['progress', 'sessions', 'review'] as const;

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/student-panel'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('studentPanelTitle'), robots: { index: false } };
}

export default async function StudentPanelPage({
  params,
  searchParams,
}: PageProps<'/[locale]/student-panel'>) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  const rawTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab = TAB_IDS.includes(rawTab as (typeof TAB_IDS)[number])
    ? (rawTab as (typeof TAB_IDS)[number])
    : 'progress';

  const token = await getAuthToken();
  if (!token) redirect(localeHref(locale, `/login?next=/${locale}/student-panel`));
  const account = await fetchAccount(token);
  if (account === 'unauthorized' || account === 'unavailable') {
    redirect(localeHref(locale, `/login?next=/${locale}/student-panel`));
  }

  const tabs = [
    { id: 'progress', label: t('statsMyProgress') },
    { id: 'sessions', label: t('youClassSessionsTitle') },
    { id: 'review', label: t('tabReview') },
  ] as const;

  let sessions = null;
  if (tab === 'sessions') {
    const result = await fetchMyClassSessions(token);
    if (result !== 'forbidden' && result !== 'failed') sessions = result;
  }

  return (
    <Container size="quiz">
      <div className="mb-4">
        <Link
          href={localeHref(locale, '/you')}
          aria-label={t('back')}
          className="bg-surface-1 text-on-surface-variant grid size-11 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
      </div>
      <h1 className="text-on-surface mb-1 text-lg font-extrabold">{t('studentPanelTitle')}</h1>
      <PanelTabs
        locale={locale}
        basePath="/student-panel"
        tab={tab}
        defaultTab="progress"
        tabs={tabs}
      />

      {tab === 'progress' ? (
        <div>
          <p className="text-on-surface-variant mb-4">{t('youSectionProgressSubtitle')}</p>
          <Link
            href={localeHref(locale, '/stats')}
            className="text-primary font-extrabold"
          >
            {t('statsMyProgress')}
          </Link>
        </div>
      ) : null}

      {tab === 'sessions' ? (
        sessions ? (
          <ClassSessionsView locale={locale} data={sessions} empty={t('youClassSessionsEmpty')} />
        ) : (
          <p className="text-on-surface font-bold">{t('errorGeneric')}</p>
        )
      ) : null}

      {tab === 'review' ? (
        <div>
          <p className="text-on-surface-variant mb-4">{t('youSectionReviewSubtitle')}</p>
          <Link href={localeHref(locale, '/review')} className="text-primary font-extrabold">
            {t('reviewToday')}
          </Link>
        </div>
      ) : null}
    </Container>
  );
}
