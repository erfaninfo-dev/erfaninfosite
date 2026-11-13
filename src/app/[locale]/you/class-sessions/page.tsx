import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { isLocale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

/** Same destination as the app: student panel → class sessions tab. */
export default async function YouClassSessionsRedirect({
  params,
}: PageProps<'/[locale]/you/class-sessions'>) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect('/en/student-panel?tab=sessions' as Route);
  redirect(localeHref(locale, '/student-panel?tab=sessions'));
}
