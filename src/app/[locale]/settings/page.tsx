import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SettingsForm } from '@/components/features/settings/settings-form';
import { Container } from '@/components/ui/primitives';
import { getAuthToken } from '@/lib/auth/session';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { getGloss, getTheme } from '@/lib/request-context';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/settings'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('settingsTitle'), robots: { index: false } };
}

/** Logged-out settings. Language, gloss, and theme. No account. */
export default async function SettingsPage({ params }: PageProps<'/[locale]/settings'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getTranslator(locale);
  const [gloss, theme, token] = await Promise.all([getGloss(locale), getTheme(), getAuthToken()]);

  return (
    <Container size="quiz">
      <h1 className="text-on-surface mb-4 text-lg font-extrabold">{t('settingsTitle')}</h1>
      <SettingsForm
        locale={locale}
        gloss={gloss}
        theme={theme}
        labels={{
          appLanguage: t('sectionAppLanguage'),
          glossLanguage: t('sectionTranslationLanguage'),
          appearance: t('sectionAppearance'),
          account: t('sectionAccount'),
          accountNote: token ? '' : t('studentTabSignIn'),
          youTab: t('tabYou'),
          download: t('downloadTitle'),
          english: t('langEnglish'),
          persian: t('langPersian'),
          kurdish: t('langKurdishSorani'),
          glossPersian: t('translationLangPersian'),
          glossKurdish: t('translationLangKurdishSorani'),
          system: t('systemTheme'),
          light: t('lightMode'),
          dark: t('darkMode'),
        }}
      />
    </Container>
  );
}
