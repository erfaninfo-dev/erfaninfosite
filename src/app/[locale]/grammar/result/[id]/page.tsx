import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { IconArrowBack } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { fetchGrammarResultDetail } from '@/lib/auth/panel-api';
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
}: PageProps<'/[locale]/grammar/result/[id]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('tabGrammar'), robots: { index: false } };
}

export default async function GrammarResultDetailPage({
  params,
}: PageProps<'/[locale]/grammar/result/[id]'>) {
  const { locale, id: idRaw } = await params;
  if (!isLocale(locale)) notFound();
  const id = parseId(idRaw);
  if (id === null) notFound();

  const t = getTranslator(locale);
  const token = await getAuthToken();
  if (!token) redirect(localeHref(locale, `/login?next=/${locale}/grammar/result/${id}`));

  const detail = await fetchGrammarResultDetail(token, id);
  if (detail === 'forbidden') redirect(localeHref(locale, '/you'));
  if (detail === 'not_found') notFound();
  if (detail === 'failed') {
    return (
      <Container size="quiz">
        <p className="text-on-surface font-bold">{t('errorGeneric')}</p>
      </Container>
    );
  }

  const numbers = new Intl.NumberFormat(NUMBER_LOCALE[locale]);
  const scoreLine =
    detail.score != null && detail.totalQuestions != null
      ? `${numbers.format(detail.score)} / ${numbers.format(detail.totalQuestions)}`
      : null;

  return (
    <Container size="quiz">
      <Link
        href={localeHref(locale, '/teacher')}
        aria-label={t('back')}
        className="bg-surface-1 text-on-surface-variant mb-4 grid size-11 place-items-center rounded-full"
      >
        <IconArrowBack className="size-5" />
      </Link>
      <h1 className="text-on-surface text-lg font-extrabold">{detail.quizName || t('tabGrammar')}</h1>
      {scoreLine ? (
        <p className="text-primary mt-2 text-xl font-extrabold">{scoreLine}</p>
      ) : null}
      {detail.createdAt ? (
        <p className="text-on-surface-variant mt-2 text-sm" dir="ltr">
          {detail.createdAt}
        </p>
      ) : null}
      {detail.session ? (
        <pre className="bg-surface-1 text-on-surface-variant mt-6 max-h-[50vh] overflow-auto rounded-2xl p-4 text-xs">
          {JSON.stringify(detail.session, null, 2)}
        </pre>
      ) : (
        <p className="text-on-surface-variant mt-6 text-sm">{t('teacherNoResults')}</p>
      )}
    </Container>
  );
}
