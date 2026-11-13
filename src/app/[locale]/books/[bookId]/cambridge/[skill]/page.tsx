import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { IconArrowBack } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { cambridgeLabels, isCambridgeSkill } from '@/lib/cambridge/labels';
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
}: PageProps<'/[locale]/books/[bookId]/cambridge/[skill]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: cambridgeLabels(locale).chooseSkill, robots: { index: false } };
}

/** A skill has no published test manifest on the website yet. */
export default async function CambridgeSkillPage({
  params,
}: PageProps<'/[locale]/books/[bookId]/cambridge/[skill]'>) {
  const { locale, bookId, skill } = await params;
  if (!isLocale(locale) || !isCambridgeSkill(skill)) notFound();
  const id = parseId(bookId);
  if (id === null) notFound();

  const book = await getBook(id);
  if (!book || !isCambridgeVolume15(book)) notFound();

  const labels = cambridgeLabels(locale);
  const title = {
    listening: labels.listening,
    reading: labels.reading,
    writing: labels.writing,
    speaking: labels.speaking,
  }[skill];

  return (
    <Container size="quiz">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={localeHref(locale, `/books/${id}/cambridge`)}
          aria-label={getTranslator(locale)('back')}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
        <h1 className="text-on-surface min-w-0 flex-1 truncate text-lg font-extrabold">{title}</h1>
      </div>
      <p className="text-on-surface-variant px-2 py-10 text-center">{labels.couldNotLoad}</p>
    </Container>
  );
}
