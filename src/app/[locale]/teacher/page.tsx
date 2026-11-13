import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { PanelTabs } from '@/components/panel/panel-tabs';
import { TeacherStudentsList } from '@/components/panel/teacher-students-list';
import { CreateStudentCodeForm } from '@/components/panel/create-student-code-form';
import { IconArrowBack } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { fetchAccount } from '@/lib/auth/api';
import { TeacherFinancePanel } from '@/components/panel/teacher-finance-panel';
import { fetchTeacherFinancialSummary, fetchTeacherStudents } from '@/lib/auth/panel-api';
import { getAuthToken } from '@/lib/auth/session';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

const TAB_IDS = ['students', 'schedule', 'finance', 'messages'] as const;

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/teacher'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('teacherPanelTitle'), robots: { index: false } };
}

export default async function TeacherPanelPage({
  params,
  searchParams,
}: PageProps<'/[locale]/teacher'>) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  const rawTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab = TAB_IDS.includes(rawTab as (typeof TAB_IDS)[number])
    ? (rawTab as (typeof TAB_IDS)[number])
    : 'students';

  const token = await getAuthToken();
  if (!token) redirect(localeHref(locale, `/login?next=/${locale}/teacher`));
  const account = await fetchAccount(token);
  if (account === 'unauthorized' || account === 'unavailable') {
    redirect(localeHref(locale, `/login?next=/${locale}/teacher`));
  }
  if (!account.isTeacher && !account.isAdmin) {
    redirect(localeHref(locale, '/you'));
  }

  const tabs = [
    { id: 'students', label: t('teacherPanelTabStudents') },
    { id: 'schedule', label: t('teacherPanelTabSchedule') },
    { id: 'finance', label: t('teacherPanelTabFinance') },
    { id: 'messages', label: t('teacherPanelTabMessages') },
  ] as const;

  let students = null;
  if (tab === 'students' || tab === 'messages' || tab === 'schedule') {
    const result = await fetchTeacherStudents(token, tab === 'messages');
    if (result !== 'forbidden' && result !== 'failed') students = result;
  }

  let finance = null;
  if (tab === 'finance') {
    const result = await fetchTeacherFinancialSummary(token);
    if (result !== 'forbidden' && result !== 'failed') finance = result;
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
      <h1 className="text-on-surface mb-1 text-lg font-extrabold">{t('teacherPanelTitle')}</h1>
      <p className="text-on-surface-variant mb-4 text-sm">{t('teacherPanelSubtitle')}</p>

      <PanelTabs
        locale={locale}
        basePath="/teacher"
        tab={tab}
        defaultTab="students"
        tabs={tabs}
      />

      {tab === 'students' ? (
        <div>
          <CreateStudentCodeForm labels={{ title: t('createStudentCode'), submit: t('createStudentCode'), failed: t('loginFailed') }} />
          {students && students.length > 0 ? (
            <TeacherStudentsList locale={locale} students={students} inbox={false} />
          ) : (
            <p className="text-on-surface-variant mt-4 font-semibold">{t('teacherMessagesEmpty')}</p>
          )}
        </div>
      ) : null}

      {tab === 'messages' ? (
        students && students.length > 0 ? (
          <TeacherStudentsList locale={locale} students={students} inbox />
        ) : (
          <p className="text-on-surface-variant font-semibold">{t('teacherMessagesEmpty')}</p>
        )
      ) : null}

      {tab === 'schedule' ? (
        <div>
          <p className="text-on-surface-variant mb-4 text-sm">{t('teacherClassScheduleSubtitle')}</p>
          {students && students.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {students.map((student) => (
                <li key={student.id}>
                  <Link
                    href={localeHref(locale, `/teacher/student/${student.id}?tab=schedule`)}
                    className="jelly-card block rounded-[var(--radius-card)] px-4 py-3 font-extrabold no-underline"
                  >
                    {student.displayName}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-on-surface-variant font-semibold">{t('teacherMessagesEmpty')}</p>
          )}
        </div>
      ) : null}

      {tab === 'finance' ? (
        finance ? (
          <TeacherFinancePanel locale={locale} data={finance} />
        ) : (
          <p className="text-on-surface font-bold">{t('errorGeneric')}</p>
        )
      ) : null}
    </Container>
  );
}
