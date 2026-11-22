import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { IconArrowBack, IconChevron } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { resolveCambridgeTarget } from '@/lib/cambridge/api';
import { CAMBRIDGE_SKILLS, cambridgeLabels, type CambridgeSkill } from '@/lib/cambridge/labels';
import { isLocale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/books/[bookId]/cambridge'>): Promise<Metadata> {
  const { locale, bookId } = await params;
  if (!isLocale(locale)) return {};
  const target = await resolveCambridgeTarget(bookId);
  if (!target) return {};
  return { title: target.title, robots: { index: false } };
}

function SkillIcon({ skill }: { skill: CambridgeSkill }) {
  switch (skill) {
    case 'listening':
      return (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 13a8 8 0 0 1 16 0" />
          <rect x="3" y="13" width="4" height="7" rx="1.5" />
          <rect x="17" y="13" width="4" height="7" rx="1.5" />
        </svg>
      );
    case 'reading':
      return (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H11v17H4.5A2.5 2.5 0 0 1 2 17.5v-12Z" />
          <path d="M22 5.5A2.5 2.5 0 0 0 19.5 3H13v17h6.5a2.5 2.5 0 0 0 2.5-2.5v-12Z" />
        </svg>
      );
    case 'writing':
      return (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case 'speaking':
      return (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="2.5" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
        </svg>
      );
  }
}

const SKILL_ACCENTS: Record<CambridgeSkill, string> = {
  listening: '1',
  reading: '2',
  writing: '4',
  speaking: '6',
};

/**
 * Live Cambridge IELTS skill hub (volumes 11–21).
 * Supports both database book IDs and direct volume slugs (`19-academic`..`21-academic`).
 */
export default async function CambridgeHubPage({
  params,
}: PageProps<'/[locale]/books/[bookId]/cambridge'>) {
  const { locale, bookId } = await params;
  if (!isLocale(locale)) notFound();

  const target = await resolveCambridgeTarget(bookId);
  if (!target) notFound();

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

  const backHref = target.seriesId
    ? localeHref(locale, `/books/series/${target.seriesId}`)
    : localeHref(locale);

  return (
    <Container size="quiz">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={backHref}
          aria-label={t('backToBooks')}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <IconArrowBack className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-on-surface truncate text-xl font-extrabold">
            <bdi lang="en">{target.title}</bdi>
          </h1>
          <p className="text-on-surface-variant text-xs font-semibold">{labels.chooseSkill}</p>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {CAMBRIDGE_SKILLS.map((skill) => (
          <li key={skill}>
            <Link
              href={localeHref(locale, `/books/${target.param}/cambridge/${skill}`)}
              data-accent={SKILL_ACCENTS[skill]}
              className="accent-card border-outline-variant/60 group flex min-h-20 items-center gap-3.5 rounded-[var(--radius-card)] border px-4 py-3.5 no-underline transition-transform duration-150 hover:-translate-y-0.5"
            >
              <span className="accent-dot grid size-11 shrink-0 place-items-center rounded-2xl">
                <SkillIcon skill={skill} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-on-surface block text-base font-extrabold">
                  {names[skill]}
                </span>
                <span className="text-on-surface-variant mt-0.5 block text-xs font-semibold">
                  {labels.fourTests} · {minutes[skill]}
                </span>
              </span>
              <IconChevron className="rtl-flip text-on-surface-variant size-5 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
