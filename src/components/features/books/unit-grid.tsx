'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { IconClose, IconLayers, IconSearch } from '@/components/ui/icons';
import type { Unit } from '@/lib/api/normalize';
import { formatClient } from '@/lib/i18n/client-format';
import type { Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

/**
 * The book's unit grid, as the app opens it from a volume card.
 *
 * Search matches the unit's English details, or an exact unit number. The
 * grid follows the page direction, so in Persian the first unit sits on the
 * right. Each card stays left-to-right inside that cell: the label on the
 * left, the layers icon on the right.
 */

export type UnitGridLabels = {
  search: string;
  hintTemplate: string;
  unitLabelTemplate: string;
  tapToOpen: string;
  noMatch: string;
  none: string;
  retry: string;
  clear: string;
};

export function UnitGrid({
  bookId,
  units,
  locale,
  labels,
  layout = 'units',
}: {
  bookId: number;
  units: Unit[];
  locale: Locale;
  labels: UnitGridLabels;
  /** Idioms book 37 uses shorter illustrated-style cards. */
  layout?: 'units' | 'idioms';
}) {
  const router = useRouter();
  const searchId = useId();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => units.filter((unit) => matchesUnit(unit, query)),
    [query, units]
  );

  if (units.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-on-surface">{labels.none}</p>
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="mt-4"
          onClick={() => router.refresh()}
        >
          {labels.retry}
        </Button>
      </div>
    );
  }

  const hint = formatClient(labels.hintTemplate, locale, { count: filtered.length });

  return (
    <div>
      <div className="relative mb-2">
        <IconSearch className="text-on-surface-variant pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.search}
          aria-label={labels.search}
          className="bg-surface-1 text-on-surface placeholder:text-on-surface-variant h-14 w-full rounded-full border-0 ps-12 pe-12 text-[length:var(--text-body)] font-semibold shadow-[var(--shadow-soft)]"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-on-surface-variant absolute end-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full"
            aria-label={labels.clear}
          >
            <IconClose className="size-4" />
          </button>
        ) : null}
      </div>

      <p className="text-on-surface-variant mb-3 px-1 text-sm">{hint}</p>
      <p aria-live="polite" className="sr-only">
        {hint}
      </p>

      {filtered.length === 0 ? (
        <p className="text-on-surface-variant px-6 py-16 text-center">{labels.noMatch}</p>
      ) : (
        <ul
          className={
            layout === 'idioms'
              ? 'grid grid-cols-2 gap-3 min-[640px]:grid-cols-3 min-[800px]:grid-cols-4 min-[1040px]:grid-cols-5 min-[1280px]:grid-cols-6'
              : 'grid grid-cols-2 gap-3 min-[760px]:grid-cols-3 min-[1000px]:grid-cols-4'
          }
        >
          {filtered.map((unit, index) => (
            <li key={unit.unit}>
              <UnitCard
                bookId={bookId}
                unit={unit}
                locale={locale}
                labels={labels}
                layout={layout}
                accent={String((index % 4) + 1)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UnitCard({
  bookId,
  unit,
  locale,
  labels,
  layout,
  accent,
}: {
  bookId: number;
  unit: Unit;
  locale: Locale;
  labels: UnitGridLabels;
  layout: 'units' | 'idioms';
  accent: string;
}) {
  const href = localeHref(locale, `/books/${bookId}/units/${unit.unit}`) as Route;
  const title = formatClient(labels.unitLabelTemplate, locale, { unit: unit.unit });

  if (layout === 'idioms') {
    return (
      <Link
        href={href}
        dir="ltr"
        data-accent={accent}
        className="accent-card flex aspect-[0.88/1] flex-col items-center justify-center rounded-[var(--radius-card)] p-3 text-center"
      >
        <h2 className="text-on-surface line-clamp-6 text-sm leading-snug font-bold">
          <bdi lang="en">{unit.details || title}</bdi>
        </h2>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      dir="ltr"
      className="jelly-card flex aspect-[0.92/1] flex-col rounded-[var(--radius-card)] p-3.5"
    >
      <div className="flex items-start gap-2">
        <h2 className="text-on-surface line-clamp-3 flex-1 text-[0.9375rem] leading-snug font-bold">
          {title}
        </h2>
        <span className="bg-primary text-on-primary grid size-[2.625rem] shrink-0 place-items-center rounded-full shadow-[var(--shadow-soft)]">
          <IconLayers className="size-5" />
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center px-1 text-center">
        {unit.details ? (
          <p className="text-on-surface-variant line-clamp-6 text-sm leading-[1.4] font-semibold">
            <bdi lang="en">{unit.details}</bdi>
          </p>
        ) : (
          <p className="text-on-surface-variant text-xs">{labels.tapToOpen}</p>
        )}
      </div>
    </Link>
  );
}

/** Persian and Arabic-Indic digits, so a typed ۱۸ matches unit 18. */
function latinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const code = digit.codePointAt(0) ?? 0;
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/** Same rule as the app's `UnitInfo.matchesQuery`. */
function matchesUnit(unit: Unit, raw: string): boolean {
  const query = latinDigits(raw).trim().toLowerCase();
  if (!query) return true;
  if (unit.details.toLowerCase().includes(query)) return true;
  return /^\d+$/.test(query) && String(unit.unit) === query;
}
