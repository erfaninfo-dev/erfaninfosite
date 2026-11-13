import Link from 'next/link';

import { IconChevron } from '@/components/ui/icons';
import type { Section } from '@/lib/api/normalize';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

/**
 * The section list the app opens from a unit that has sections.
 *
 * The whole list is left-to-right, including in Persian: section 1 stays on
 * the left and the chevron points right. The bubble colour follows the app's
 * three section hues, mapped onto the site's accent tokens.
 */

function sectionAccent(section: number): '4' | '1' {
  if (section === 2) return '1';
  return '4';
}

export function SectionList({
  bookId,
  unit,
  sections,
  locale,
  t,
}: {
  bookId: number;
  unit: number;
  sections: Section[];
  locale: Locale;
  t: Translator;
}) {
  const numbers = new Intl.NumberFormat(NUMBER_LOCALE[locale]);

  return (
    <ul dir="ltr" className="flex flex-col gap-3">
      {sections.map((section) => {
        const title = section.details || t('sectionNumberLabel', { section: section.section });
        return (
          <li key={section.section}>
            <Link
              href={localeHref(
                locale,
                `/books/${bookId}/units/${unit}/sections/${section.section}`
              )}
              data-accent={sectionAccent(section.section)}
              className="accent-card border-outline-variant/70 flex items-center gap-3.5 rounded-[var(--radius-card)] border p-4"
            >
              <span className="accent-dot grid size-12 shrink-0 place-items-center rounded-full text-lg font-bold">
                {numbers.format(section.section)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-on-surface block truncate text-base font-bold">
                  <bdi lang="en">{title}</bdi>
                </span>
                <span className="text-on-surface-variant mt-1 block text-xs">
                  {t('unitSectionLine', { unit, section: section.section })}
                </span>
              </span>
              <IconChevron className="text-on-surface-variant size-5 shrink-0 !transform-none" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
