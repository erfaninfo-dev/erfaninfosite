import { redirect } from 'next/navigation';

import { isLocale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

/**
 * The single-topic quiz moved to `/grammar/quiz?topics=…`.
 *
 * The app builds one session from however many topics you select, so the web
 * has one session route too. This keeps older links and the topic page's own
 * button working by forwarding them into it.
 */
export default async function LegacyTopicQuiz({
  params,
  searchParams,
}: PageProps<'/[locale]/grammar/topics/[topicId]/quiz'>) {
  const [{ locale, topicId }, query] = await Promise.all([params, searchParams]);
  const safeLocale = isLocale(locale) ? locale : 'en';

  const id = Number.parseInt(topicId, 10);
  if (!Number.isInteger(id) || id <= 0) redirect(localeHref(safeLocale, '/grammar'));

  const n = Array.isArray(query.n) ? query.n[0] : query.n;
  const count = Number.parseInt(n ?? '', 10);
  const length = Number.isInteger(count) && count > 0 ? count : 15;

  redirect(
    `${localeHref(safeLocale, '/grammar/quiz')}?topics=${id}&n=${length}&seed=${id * 7919}`
  );
}
