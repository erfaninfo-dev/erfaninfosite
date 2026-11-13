import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { Container } from '@/components/ui/primitives';
import { fetchAccount } from '@/lib/auth/api';
import { getAuthToken } from '@/lib/auth/session';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/profile'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('profileScreenTitle'), robots: { index: false } };
}

export default async function ProfilePage({ params }: PageProps<'/[locale]/profile'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);
  const token = await getAuthToken();
  const result = token ? await fetchAccount(token) : null;
  const account =
    result && result !== 'unauthorized' && result !== 'unavailable' ? result : null;

  return (
    <Container size="quiz">
      <h1 className="text-on-surface text-lg font-extrabold">{t('profileScreenTitle')}</h1>
      {account ? (
        <div className="mt-6 flex items-center gap-3">
          <ProfileAvatar avatarId={account.avatar} size={56} />
          <div>
            <p className="text-on-surface font-extrabold">{account.displayName}</p>
            <p className="text-on-surface-variant text-sm" dir="ltr">
              {account.email}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-on-surface-variant mb-4">{t('profileSignInPrompt')}</p>
          <Link
            href={localeHref(locale, `/login?next=/${locale}/profile`)}
            className="bg-primary text-on-primary inline-flex min-h-12 items-center rounded-full px-5 font-extrabold no-underline"
          >
            {t('signIn')}
          </Link>
        </div>
      )}
    </Container>
  );
}
