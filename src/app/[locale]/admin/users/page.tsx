import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AdminUsersClient } from '@/components/panel/admin-users-client';
import { IconArrowBack } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { fetchAccount } from '@/lib/auth/api';
import { fetchAdminUsers } from '@/lib/auth/panel-api';
import { getAuthToken } from '@/lib/auth/session';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/admin/users'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('adminUsersTitle'), robots: { index: false } };
}

export default async function AdminUsersPage({ params }: PageProps<'/[locale]/admin/users'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);
  const token = await getAuthToken();
  if (!token) redirect(localeHref(locale, `/login?next=/${locale}/admin/users`));

  const account = await fetchAccount(token);
  if (account === 'unauthorized' || account === 'unavailable') {
    redirect(localeHref(locale, `/login?next=/${locale}/admin/users`));
  }
  if (!account.isAdmin) {
    redirect(localeHref(locale, '/you'));
  }

  const list = await fetchAdminUsers(token);
  if (list === 'forbidden' || list === 'failed') {
    return (
      <Container size="quiz">
        <p className="text-on-surface font-bold">{t('errorGeneric')}</p>
      </Container>
    );
  }

  const teachers = list.users.filter((u) => u.isTeacher || u.isAdmin);

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
      <h1 className="text-on-surface mb-2 text-lg font-extrabold">{t('adminUsersTitle')}</h1>
      {list.activeAppVersion ? (
        <p className="text-on-surface-variant mb-4 text-sm">
          {t('adminUserAppActive').replace(
            '{version}',
            `${list.activeAppVersion.versionName} (${list.activeAppVersion.versionCode})`
          )}
        </p>
      ) : null}
      <AdminUsersClient
        users={list.users}
        teachers={teachers}
        searchPlaceholder={t('search')}
        labels={{
          email: t('email'),
          student: t('homeTrackClass'),
          teacher: t('teacherOpenPanel'),
          assignTeacher: t('youSectionMessages'),
          none: '—',
          save: t('save'),
          failed: t('loginFailed'),
          appInstalled: t('adminUserAppInstalled'),
          appUnknown: t('adminUserAppVersionUnknown'),
        }}
      />
    </Container>
  );
}
