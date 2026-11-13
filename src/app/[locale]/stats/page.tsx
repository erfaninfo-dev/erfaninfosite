import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Container } from '@/components/ui/primitives';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/stats'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('statsMyProgress'), robots: { index: false } };
}

export default async function StatsPage({ params }: PageProps<'/[locale]/stats'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  return (
    <Container size="quiz">
      <h1 className="text-on-surface text-lg font-extrabold">{t('statsMyProgress')}</h1>
      <p className="text-on-surface-variant mt-4 leading-relaxed">{t('youSectionProgressSubtitle')}</p>
      <p className="text-on-surface-variant mt-4 text-sm">{t('statsSignInGrammarTrend')}</p>
    </Container>
  );
}
