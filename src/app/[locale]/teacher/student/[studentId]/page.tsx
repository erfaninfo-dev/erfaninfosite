import type { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';

import { PanelTabs } from '@/components/panel/panel-tabs';
import {
  TeacherStudentGrammarList,
  TeacherStudentScheduleTab,
  TeacherStudentSessionsTab,
  TeacherStudentVocabList,
} from '@/components/panel/teacher-student-detail-views';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { IconArrowBack } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { fetchAccount } from '@/lib/auth/api';
import {
  fetchTeacherStudentGrammarResults,
  fetchTeacherStudentSchedule,
  fetchTeacherStudentSessions,
  fetchTeacherStudentVocabResults,
  fetchTeacherStudents,
} from '@/lib/auth/panel-api';
import { getAuthToken } from '@/lib/auth/session';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

const TAB_IDS = ['vocab', 'grammar', 'sessions', 'schedule'] as const;

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/teacher/student/[studentId]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('teacherStudentDetailTitle'), robots: { index: false } };
}

export default async function TeacherStudentPage({
  params,
  searchParams,
}: PageProps<'/[locale]/teacher/student/[studentId]'>) {
  const [{ locale, studentId: studentIdRaw }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const id = parseId(studentIdRaw);
  if (id === null) notFound();

  const rawTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab = TAB_IDS.includes(rawTab as (typeof TAB_IDS)[number])
    ? (rawTab as (typeof TAB_IDS)[number])
    : 'vocab';

  const t = getTranslator(locale);
  const token = await getAuthToken();
  if (!token) redirect(localeHref(locale, `/login?next=/${locale}/teacher/student/${id}`));
  const account = await fetchAccount(token);
  if (account === 'unauthorized' || account === 'unavailable' || (!account.isTeacher && !account.isAdmin)) {
    redirect(localeHref(locale, '/you'));
  }

  const list = await fetchTeacherStudents(token, false);
  const student = list !== 'forbidden' && list !== 'failed' ? list.find((s) => s.id === id) : null;
  if (!student) notFound();

  const basePath = `/teacher/student/${id}`;
  const tabs = [
    { id: 'vocab', label: t('teacherTabVocabQuiz') },
    { id: 'grammar', label: t('teacherTabGrammar') },
    { id: 'sessions', label: t('teacherTabClassSessions') },
    { id: 'schedule', label: t('teacherTabWeeklySchedule') },
  ] as const;

  const vocab =
    tab === 'vocab' ? await fetchTeacherStudentVocabResults(token, id) : null;
  const grammar =
    tab === 'grammar' ? await fetchTeacherStudentGrammarResults(token, id) : null;
  const sessions =
    tab === 'sessions' ? await fetchTeacherStudentSessions(token, id) : null;
  const schedule =
    tab === 'schedule' ? await fetchTeacherStudentSchedule(token, id) : null;

  return (
    <Container size="quiz">
      <Link
        href={localeHref(locale, '/teacher')}
        aria-label={t('back')}
        className="bg-surface-1 text-on-surface-variant mb-4 grid size-11 place-items-center rounded-full"
      >
        <IconArrowBack className="size-5" />
      </Link>
      <div className="mb-4 flex items-center gap-3">
        <ProfileAvatar avatarId={student.avatar} size={52} />
        <div className="min-w-0 flex-1">
          <h1 className="text-on-surface truncate text-lg font-extrabold">{student.displayName}</h1>
          <p className="text-on-surface-variant truncate text-sm" dir="ltr">
            {student.email}
          </p>
        </div>
        <Link
          href={localeHref(locale, `/teacher/chat/${student.id}` as Route)}
          className="text-primary shrink-0 text-sm font-extrabold"
        >
          {t('teacherPanelTabMessages')}
        </Link>
      </div>
      {student.note ? (
        <p className="text-on-surface-variant mb-3 text-sm">{student.note}</p>
      ) : null}

      <PanelTabs
        locale={locale}
        basePath={basePath}
        tab={tab}
        defaultTab="vocab"
        tabs={tabs}
      />

      {tab === 'vocab' ? (
        vocab && vocab !== 'forbidden' && vocab !== 'failed' ? (
          <TeacherStudentVocabList locale={locale} rows={vocab} />
        ) : (
          <p className="text-on-surface font-bold">{t('errorGeneric')}</p>
        )
      ) : null}

      {tab === 'grammar' ? (
        grammar && grammar !== 'forbidden' && grammar !== 'failed' ? (
          <TeacherStudentGrammarList locale={locale} rows={grammar} />
        ) : (
          <p className="text-on-surface font-bold">{t('errorGeneric')}</p>
        )
      ) : null}

      {tab === 'sessions' ? (
        sessions && sessions !== 'forbidden' && sessions !== 'failed' ? (
          <TeacherStudentSessionsTab locale={locale} data={sessions} />
        ) : (
          <p className="text-on-surface font-bold">{t('errorGeneric')}</p>
        )
      ) : null}

      {tab === 'schedule' ? (
        schedule && schedule !== 'forbidden' && schedule !== 'failed' ? (
          <TeacherStudentScheduleTab locale={locale} slots={schedule} />
        ) : (
          <p className="text-on-surface font-bold">{t('errorGeneric')}</p>
        )
      ) : null}
    </Container>
  );
}
