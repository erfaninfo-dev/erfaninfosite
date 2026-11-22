import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { IconArrowBack } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { hasClassAccess, type Account } from '@/lib/auth/account';
import { logoutAction } from '@/lib/auth/actions';
import { fetchAccount, fetchStudentBooks } from '@/lib/auth/api';
import { getAuthToken } from '@/lib/auth/session';
import type { Book } from '@/lib/api/normalize';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/membership'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('homeTrackClass'), robots: { index: false } };
}

/**
 * Membership is the class catalog.
 *
 * Anonymous readers get a sign-in prompt. Class books are requested with the
 * session token only after `me.php` says this account may see them.
 */
export default async function MembershipPage({
  params,
  searchParams,
}: PageProps<'/[locale]/membership'>) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);
  const token = await getAuthToken();

  let account: Account | null = null;
  let unavailable = false;
  if (token) {
    const result = await fetchAccount(token);
    if (result === 'unavailable') unavailable = true;
    else if (result !== 'unauthorized') account = result;
  }

  const granted = query.granted === '1' || (Array.isArray(query.granted) && query.granted[0] === '1');
  let books: Book[] | null = null;
  if (token && account && hasClassAccess(account)) {
    books = await fetchStudentBooks(token);
  }

  return (
    <Container size="quiz">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={localeHref(locale)}
          aria-label={t('back')}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
        <h1 className="text-on-surface min-w-0 flex-1 truncate text-lg font-extrabold">
          {t('homeTrackClass')}
        </h1>
      </div>

      {!account ? (
        <div>
          <p className="text-on-surface-variant mb-4">
            {unavailable ? t('loginFailed') : t('studentTabSignIn')}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={localeHref(locale, `/login?next=/${locale}/membership`)}
              className="bg-primary text-on-primary inline-flex min-h-12 items-center rounded-full px-5 font-extrabold no-underline"
            >
              {t('signIn')}
            </Link>
            <Link
              href={localeHref(locale, '/register')}
              className="text-primary inline-flex min-h-12 items-center font-extrabold"
            >
              {t('newAccount')}
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-on-surface font-extrabold">{account.displayName}</p>
          <p className="text-on-surface-variant mt-1 text-sm" dir="ltr">
            {account.email}
          </p>
          <form action={logoutAction} className="mt-4">
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="border-outline-strong text-on-surface min-h-11 rounded-full border px-4 font-bold"
            >
              {t('signOut')}
            </button>
          </form>

          {granted && account.studentAccess ? (
            <p className="text-primary mt-4 font-bold">{t('studentAccessGranted')}</p>
          ) : null}

          {hasClassAccess(account) ? (
            <section className="mt-6">
              <h2 className="text-on-surface mb-3 text-base font-extrabold">{t('studentBooksTitle')}</h2>
              {books && books.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {books.map((book) => (
                    <li key={book.id}>
                      <Link
                        href={localeHref(locale, `/books/${book.id}`)}
                        lang="en"
                        dir="ltr"
                        className="bg-surface-1 text-on-surface flex min-h-14 items-center rounded-[var(--radius-card)] px-4 text-left font-extrabold no-underline"
                      >
                        {book.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </Container>
  );
}
