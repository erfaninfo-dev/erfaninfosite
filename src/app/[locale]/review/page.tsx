import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container } from '@/components/ui/primitives';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/review'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('tabReview'), robots: { index: false } };
}

export default async function ReviewPage({ params }: PageProps<'/[locale]/review'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  return (
    <Container size="quiz">
      <h1 className="text-on-surface text-lg font-extrabold">{t('reviewToday')}</h1>
      <p className="text-on-surface-variant mt-4">{t('reviewTapStart')}</p>
      <p className="text-on-surface-variant mt-4 text-sm">{t('noWordsDueBodyFlashcards')}</p>
      <Link
        href={localeHref(locale)}
        className="bg-primary text-on-primary mt-6 inline-flex min-h-12 items-center rounded-full px-5 font-extrabold no-underline"
      >
        {t('tabHome')}
      </Link>
    </Container>
  );
}
