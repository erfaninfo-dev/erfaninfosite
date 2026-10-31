import { permanentRedirect } from 'next/navigation';

import { isLocale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

/**
 * There is no separate books index.
 *
 * The home page *is* the book browser, as it is in the app — its onboarding
 * says "Start from Home: pick a book, open units, then browse words". Keeping a
 * second catalogue page would duplicate it for readers and for search engines.
 *
 * The route stays as a redirect so older links and bookmarks still land
 * somewhere sensible.
 */
export default async function BooksIndex({ params }: PageProps<'/[locale]/books'>) {
  const { locale } = await params;
  permanentRedirect(localeHref(isLocale(locale) ? locale : 'en'));
}
