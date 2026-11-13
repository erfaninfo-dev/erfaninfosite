import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { IconArrowBack } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { fetchAccount } from '@/lib/auth/api';
import { fetchTeacherChat } from '@/lib/auth/panel-api';
import { getAuthToken } from '@/lib/auth/session';
import { NUMBER_LOCALE, isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/teacher/chat/[studentId]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('teacherPanelTabMessages'), robots: { index: false } };
}

export default async function TeacherChatPage({
  params,
}: PageProps<'/[locale]/teacher/chat/[studentId]'>) {
  const { locale, studentId } = await params;
  if (!isLocale(locale)) notFound();
  const id = parseId(studentId);
  if (id === null) notFound();

  const t = getTranslator(locale);
  const token = await getAuthToken();
  if (!token) redirect(localeHref(locale, `/login?next=/${locale}/teacher/chat/${id}`));
  const account = await fetchAccount(token);
  if (account === 'unauthorized' || account === 'unavailable' || (!account.isTeacher && !account.isAdmin)) {
    redirect(localeHref(locale, '/you'));
  }

  const thread = await fetchTeacherChat(token, id);
  const formatter = new Intl.DateTimeFormat(NUMBER_LOCALE[locale], {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <Container size="quiz">
      <Link
        href={localeHref(locale, '/teacher?tab=messages')}
        aria-label={t('back')}
        className="bg-surface-1 text-on-surface-variant mb-4 grid size-11 place-items-center rounded-full"
      >
        <IconArrowBack className="size-5" />
      </Link>
      <h1 className="text-on-surface text-lg font-extrabold">
        {thread !== 'forbidden' && thread !== 'failed' && thread.studentName
          ? thread.studentName
          : t('teacherPanelTabMessages')}
      </h1>
      {thread === 'forbidden' || thread === 'failed' ? (
        <p className="text-on-surface-variant mt-4">{t('errorGeneric')}</p>
      ) : thread.messages.length === 0 ? (
        <p className="text-on-surface-variant mt-4">{t('teacherMessagesEmpty')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {thread.messages.map((msg) => (
            <li
              key={msg.id}
              className={
                msg.fromTeacher
                  ? 'bg-primary-container text-on-primary-container ms-8 rounded-2xl px-4 py-3'
                  : 'bg-surface-1 text-on-surface me-8 rounded-2xl px-4 py-3'
              }
            >
              <p className="text-sm leading-snug">{msg.body}</p>
              <p className="mt-1 text-xs opacity-70" dir="ltr">
                {msg.createdAt
                  ? formatter.format(new Date(Date.parse(msg.createdAt)))
                  : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
