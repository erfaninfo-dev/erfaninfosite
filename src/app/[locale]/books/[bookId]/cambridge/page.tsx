import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { IconArrowBack, IconChevron } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { CAMBRIDGE_SKILLS, cambridgeLabels } from '@/lib/cambridge/labels';
import { isCambridgeVolume15 } from '@/lib/api/normalize';
import { getBook } from '@/lib/api/queries';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/books/[bookId]/cambridge'>): Promise<Metadata> {
  const { locale, bookId } = await params;
  if (!isLocale(locale)) return {};
  const id = parseId(bookId);
  if (id === null) return {};
  const book = await getBook(id);
  if (!book || !isCambridgeVolume15(book)) return {};
  return { title: book.title, robots: { index: false } };
}

/**
 * Cambridge 15 opens a skill hub, not the ordinary unit grid.
 *
 * The tests themselves live in the app's local assets. The website does not
 * invent them: choosing a skill explains that the test could not be loaded.
 */
export default async function CambridgeHubPage({
  params,
}: PageProps<'/[locale]/books/[bookId]/cambridge'>) {
  const { locale, bookId } = await params;
  if (!isLocale(locale)) notFound();
  const id = parseId(bookId);
  if (id === null) notFound();

  const book = await getBook(id);
  if (!book || !isCambridgeVolume15(book)) notFound();

  const labels = cambridgeLabels(locale);
  const t = getTranslator(locale);
  const minutes = {
    listening: labels.listeningTime,
    reading: labels.readingTime,
    writing: labels.writingTime,
    speaking: labels.speakingTime,
  } as const;
  const names = {
    listening: labels.listening,
    reading: labels.reading,
    writing: labels.writing,
    speaking: labels.speaking,
  } as const;

  const backHref = book.seriesId
    ? localeHref(locale, `/books/series/${book.seriesId}`)
    : localeHref(locale);

  return (
    <Container size="quiz">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={backHref}
          aria-label={t('backToBooks')}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
        <h1 className="text-on-surface min-w-0 flex-1 truncate text-lg font-extrabold">
          <bdi lang="en">{book.title}</bdi>
        </h1>
      </div>
      <p className="text-on-surface mb-3 text-sm font-bold">{labels.chooseSkill}</p>
      <ul className="flex flex-col gap-3">
        {CAMBRIDGE_SKILLS.map((skill) => (
          <li key={skill}>
            <Link
              href={localeHref(locale, `/books/${id}/cambridge/${skill}`)}
              className="bg-surface-1 shadow-[var(--shadow-soft)] flex min-h-16 items-center gap-3 rounded-[var(--radius-card)] px-4 no-underline"
            >
              <span className="min-w-0 flex-1">
                <span className="text-on-surface block font-extrabold">{names[skill]}</span>
                <span className="text-on-surface-variant block text-sm">
                  {labels.fourTests} · {minutes[skill]}
                </span>
              </span>
              <IconChevron className="text-on-surface-variant size-5" />
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
