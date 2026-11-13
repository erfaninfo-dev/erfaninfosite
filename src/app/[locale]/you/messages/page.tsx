import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Container } from '@/components/ui/primitives';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/you/messages'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('youSectionMessages'), robots: { index: false } };
}

export default async function YouMessagesPage({ params }: PageProps<'/[locale]/you/messages'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  return (
    <Container size="quiz">
      <h1 className="text-on-surface text-lg font-extrabold">
        {t('youSectionMessagesHub')}
      </h1>
      <p className="text-on-surface-variant mt-4">{t('teacherMessagesEmpty')}</p>
    </Container>
  );
}
