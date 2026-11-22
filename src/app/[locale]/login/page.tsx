import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AuthForm } from '@/components/features/auth/auth-form';
import { IconArrowBack } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { loginAction } from '@/lib/auth/actions';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/login'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('loginTitle'), robots: { index: false } };
}

function nextPath(locale: string, next: string | string[] | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith(`/${locale}`)) return `/${locale}`;
  if (!/^\/(en|fa|ckb)(\/[^?#]*)?(\?[^#]*)?$/.test(value)) return `/${locale}`;
  return value;
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<'/[locale]/login'>) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  return (
    <Container size="quiz">
      <div className="mb-4">
        <Link
          href={localeHref(locale)}
          aria-label={t('back')}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
      </div>
      <h1 className="text-on-surface text-lg font-extrabold">{t('loginTitle')}</h1>
      <p className="text-on-surface-variant mt-1 mb-6">{t('loginSubtitle')}</p>
      <AuthForm
        mode="login"
        action={loginAction}
        locale={locale}
        nextPath={nextPath(locale, query.next)}
        switchHref="/register"
        labels={{
          email: t('email'),
          password: t('password'),
          displayName: t('displayNameOptional'),
          confirm: t('confirmPassword'),
          submit: t('signIn'),
          switchLabel: t('newAccount'),
          enterEmail: t('enterEmail'),
          enterValidEmail: t('enterValidEmail'),
          passwordMinLength: t('passwordMinLength'),
          confirmYourPassword: t('confirmYourPassword'),
          passwordsNoMatch: t('passwordsNoMatch'),
          invalid: t('loginInvalid'),
          taken: t('registerEmailTaken'),
          failed: t('loginFailed'),
        }}
        reset={{
          forgot: t('forgotPassword'),
          title: t('passwordResetTitle'),
          email: t('email'),
          send: t('passwordResetSendCode'),
          helper: t('passwordResetHelper'),
          sent: t('passwordResetCodeSent'),
          sendFailed: t('passwordResetSendFailed'),
          code: t('passwordResetCodeLabel'),
          newPassword: t('passwordResetNewPassword'),
          confirmPassword: t('passwordResetConfirmPassword'),
          change: t('passwordResetChangeButton'),
          invalidEmail: t('enterValidEmail'),
          invalidCode: t('passwordResetInvalidCode'),
          short: t('passwordMinLength'),
          mismatch: t('passwordResetPasswordsMismatch'),
          changeFailed: t('passwordResetChangeFailed'),
          success: t('passwordResetSuccess'),
          copySupport: t('copySupportLink'),
          copied: t('supportLinkCopied'),
          close: t('close'),
        }}
      />
    </Container>
  );
}
