import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AuthForm } from '@/components/features/auth/auth-form';
import { IconArrowBack } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { registerAction } from '@/lib/auth/actions';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/register'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('registerTitle'), robots: { index: false } };
}

export default async function RegisterPage({ params }: PageProps<'/[locale]/register'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  return (
    <Container size="quiz">
      <div className="mb-4">
        <Link
          href={localeHref(locale, '/login')}
          aria-label={t('back')}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
      </div>
      <h1 className="text-on-surface text-lg font-extrabold">{t('registerTitle')}</h1>
      <p className="text-on-surface-variant mt-1 mb-6">{t('registerSubtitle')}</p>
      <AuthForm
        mode="register"
        action={registerAction}
        locale={locale}
        nextPath={`/${locale}/membership`}
        switchHref="/login"
        labels={{
          email: t('email'),
          password: t('password'),
          displayName: t('displayNameOptional'),
          confirm: t('confirmPassword'),
          registerAsStudent: t('registerAsStudent'),
          studentCode: t('studentCodeLabel'),
          studentCodeHint: t('studentCodeFiveDigitsHint'),
          submit: t('register'),
          switchLabel: t('alreadyHaveAccount'),
          enterEmail: t('enterEmail'),
          enterValidEmail: t('enterValidEmail'),
          passwordMinLength: t('passwordMinLength'),
          confirmYourPassword: t('confirmYourPassword'),
          passwordsNoMatch: t('passwordsNoMatch'),
          studentCodeRequired: t('studentCodeRequired'),
          studentCodeInvalid: t('studentCodeFiveDigitsInvalid'),
          invalid: t('loginInvalid'),
          taken: t('registerEmailTaken'),
          failed: t('registerFailed'),
        }}
      />
    </Container>
  );
}
