import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { YouScreen } from '@/components/features/you/you-screen';
import { fetchAccount } from '@/lib/auth/api';
import { fetchTeacherMessagesPreview } from '@/lib/auth/you-fetch';
import { getAuthToken } from '@/lib/auth/session';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/you'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('youPageTitle'), robots: { index: false } };
}

export default async function YouPage({
  params,
  searchParams,
}: PageProps<'/[locale]/you'>) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);
  const token = await getAuthToken();

  let account = null;
  let messages = null;
  if (token) {
    const result = await fetchAccount(token);
    if (result !== 'unauthorized' && result !== 'unavailable') {
      account = result;
      if (!result.isTeacher && !result.isAdmin) {
        messages = await fetchTeacherMessagesPreview(token);
      }
    }
  }

  const granted = query.granted === '1' || (Array.isArray(query.granted) && query.granted[0] === '1');

  return (
    <YouScreen
      locale={locale}
      account={account}
      messages={messages}
      granted={granted}
      labels={{
        youPageTitle: t('youPageTitle'),
        granted: t('studentAccessGranted'),
        sectionAccount: t('sectionAccount'),
        signIn: t('signIn'),
        signInSubtitle: t('signInSubtitle'),
        createAccount: t('createAccount'),
        profile: t('profile'),
        createStudentCode: t('createStudentCode'),
        createStudentCodeSubtitle: t('createStudentCodeSubtitle'),
        signOut: t('signOut'),
        signOutTitle: t('signOutTitle'),
        signOutBody: t('signOutBody'),
        cancel: t('cancel'),
        youSectionMessages: t('youSectionMessages'),
        youSectionMessagesHub: t('youSectionMessagesHub'),
        youSectionMessagesSubtitle: t('youSectionMessagesSubtitle'),
        youSectionMessagesSubtitleHub: t('youSectionMessagesSubtitleHub'),
        teacherMessagesNoTeacher: t('teacherMessagesNoTeacher'),
        teacherMessagesEmpty: t('teacherMessagesEmpty'),
        youSectionAdmin: t('youSectionAdmin'),
        adminUserManagement: t('adminUserManagement'),
        youAdminPanelSubtitle: t('youAdminPanelSubtitle'),
        youSectionProgress: t('youSectionProgress'),
        youSectionProgressSubtitle: t('youSectionProgressSubtitle'),
        statsMyProgress: t('statsMyProgress'),
        youSectionReview: t('youSectionReview'),
        youSectionReviewSubtitle: t('youSectionReviewSubtitle'),
        tabReview: t('tabReview'),
        youClassSessionsTitle: t('youClassSessionsTitle'),
        youClassSessionsSubtitle: t('youClassSessionsSubtitle'),
        teacherOpenPanel: t('teacherOpenPanel'),
        youTeacherPanelSubtitle: t('youTeacherPanelSubtitle'),
      }}
    />
  );
}
