'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useId, useMemo, useState } from 'react';

import {
  IconBook,
  IconLayers,
  IconPdf,
  IconSchool,
  IconSearch,
  IconSpeaking,
} from '@/components/ui/icons';
import { isCambridgeVolume15, type Book } from '@/lib/api/normalize';
import { cn } from '@/lib/cn';
import { HomePanelFab, type HomePanelFabProps } from '@/components/panel/home-panel-fab';
import { homeEntries } from '@/lib/home/entries';
import { formatClient } from '@/lib/i18n/client-format';
import type { Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

/**
 * Home: the app's signed-out book browser.
 *
 * The hero, the track filter and the cards arrive resolved from the server.
 * This component only filters them. Speaking sits above the grid on IELTS.
 * There is no pager — the app shows every book on the selected track.
 */

export type BrowserCard = {
  id: string;
  /** Null when the app leaves the card untappable (a book with no units yet). */
  href: Route | null;
  title: string;
  subtitle: string;
  /** Joined titles and descriptions, so search matches a volume inside a series. */
  description: string;
  badge: string | null;
  /** 1–6, or the speaking teal. Stable for a given row. */
  accent: number | 'speaking';
  icon: 'book' | 'speaking';
  track: string;
  kind: 'speaking' | 'series' | 'book';
  soon: boolean;
  /** Study-PDF link for a standalone book. Stays above the card's main link. */
  pdfHref: Route | null;
};

export type BrowserLabels = {
  heading: string;
  searchHint: string;
  /** Raw ICU; the count follows the selected track and the search. */
  availableTemplate: string;
  /** Raw ICU for a series card: how many volumes survived the search. */
  volumesTemplate: string;
  /** Raw ICU for a standalone book: how many units it has. */
  unitCountTemplate: string;
  noResults: string;
  tracks: Array<{ id: string; label: string }>;
  league: string;
  accountsSoon: string;
  /** The app hardcodes both of these in English on a Soon card. */
  soonLine: string;
  soonBadge: string;
  pdf: string;
};

export type SpeakingCard = {
  href: Route;
  title: string;
  subtitle: string;
  badge: string;
};

const ICONS = {
  book: IconBook,
  speaking: IconSpeaking,
} as const;

export function BookBrowser({
  books,
  unitCounts,
  pdfBookIds,
  speaking,
  labels,
  locale,
  panelFab,
}: {
  books: Book[];
  /** Unit totals for standalone books. A series card does not show one. */
  unitCounts: Record<number, number>;
  /** Books that have a study PDF, so the card can offer it. */
  pdfBookIds: number[];
  speaking: SpeakingCard | null;
  labels: BrowserLabels;
  locale: Locale;
  panelFab?: HomePanelFabProps | null;
}) {
  const [query, setQuery] = useState('');
  const [track, setTrack] = useState(labels.tracks[0]?.id ?? 'ielts');
  const searchId = useId();

  const trackBooks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return books.filter((book) => {
      if (book.track !== track) return false;
      if (!needle) return true;
      return (
        book.title.toLowerCase().includes(needle) ||
        book.description.toLowerCase().includes(needle)
      );
    });
  }, [books, query, track]);

  const bookCards = useMemo(
    () =>
      homeEntries(trackBooks).flatMap((entry, index) => {
        const card = toCard(entry, index, unitCounts, pdfBookIds, labels, locale);
        return card ? [card] : [];
      }),
    [labels, locale, pdfBookIds, trackBooks, unitCounts]
  );

  const showSpeaking = speaking != null && track === 'ielts' && trackBooks.length > 0;

  return (
    <>
      <section className="border-outline-variant/70 bg-surface-1 mb-4 rounded-[var(--radius-card)] border px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-on-surface text-[length:var(--text-h2)] leading-tight font-bold">
              {labels.heading}
            </h1>
            <p className="text-on-surface-variant mt-1 text-[length:var(--text-body)]">
              {formatClient(labels.availableTemplate, locale, {
                count: trackBooks.length,
              })}
            </p>
          </div>
          <div className="bg-surface-1 shadow-[var(--shadow-soft)] grid size-14 shrink-0 place-items-center rounded-[var(--radius-logo)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="" width={40} height={40} />
          </div>
        </div>

        <div className="relative mt-4">
          <IconSearch className="text-on-surface-variant pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.searchHint}
            aria-label={labels.searchHint}
            className={cn(
              'bg-surface-2 h-13 w-full rounded-[var(--radius-input)] border-0 ps-12 pe-4',
              'text-on-surface placeholder:text-on-surface-variant text-[length:var(--text-body)]'
            )}
          />
        </div>
      </section>

      <div
        role="group"
        aria-label={labels.heading}
        className="border-outline-strong bg-surface-1 mb-4 flex overflow-hidden rounded-full border"
      >
        {labels.tracks.map((item, index) => {
          const active = track === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTrack(item.id)}
              aria-pressed={active}
              className={cn(
                'flex min-h-13 flex-1 items-center justify-center gap-2 px-3',
                'text-[length:var(--text-label)] font-bold',
                'transition-colors duration-[var(--duration-fast)]',
                index > 0 && 'border-outline-strong border-s',
                active
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-2'
              )}
            >
              <TrackIcon id={item.id} active={active} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="sr-only">
        {trackBooks.length === 0
          ? labels.noResults
          : formatClient(labels.availableTemplate, locale, { count: trackBooks.length })}
      </p>

      {trackBooks.length === 0 ? (
        <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-12 text-center">
          {labels.noResults}
        </p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {showSpeaking && speaking ? (
            <HomeCard
              card={{
                id: 'speaking',
                href: speaking.href,
                title: speaking.title,
                subtitle: speaking.subtitle,
                description: '',
                badge: speaking.badge,
                accent: 'speaking',
                icon: 'speaking',
                track: 'ielts',
                kind: 'speaking',
                soon: false,
                pdfHref: null,
              }}
              labels={labels}
              locale={locale}
            />
          ) : null}
          {/*
            The app draws this grid left-to-right even in Persian and Kurdish,
            so the first book stays on the left when the two screens sit together.
            Columns break at 700px and 1100px, the same widths the app uses.
          */}
          <div
            dir="ltr"
            className="grid grid-cols-1 gap-3.5 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3"
          >
            {bookCards.map((card) => (
              <HomeCard key={card.id} card={card} labels={labels} locale={locale} />
            ))}
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed end-4 bottom-24 z-20 flex flex-col items-end gap-3">
        {panelFab ? (
          <div className="pointer-events-auto">
            <HomePanelFab {...panelFab} />
          </div>
        ) : null}
        <div className="pointer-events-auto">
          <Link
            href={localeHref(locale, '/league')}
            className="gradient-league inline-flex min-h-12 items-center gap-2 rounded-full px-4 font-semibold text-white no-underline shadow-[var(--shadow-soft)]"
          >
            <TrophyGlyph />
            <span>{labels.league}</span>
          </Link>
        </div>
      </div>
    </>
  );
}

function HomeCard({
  card,
  labels,
  locale,
}: {
  card: BrowserCard;
  labels: BrowserLabels;
  locale: Locale;
}) {
  const Icon = card.soon ? null : card.kind === 'series' ? IconLayers : ICONS[card.icon];
  const pill = card.soon ? labels.soonBadge : card.badge;
  const alignEnd = locale !== 'en';

  return (
    <article
      data-accent={card.accent}
      aria-disabled={card.soon || undefined}
      className={cn(
        'accent-card border-outline-variant/70 relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border p-3.5',
        card.kind === 'speaking'
          ? 'aspect-[2.15/1] min-[700px]:aspect-[2.96/1] min-[1100px]:aspect-[4.44/1]'
          : 'aspect-[2.15/1] min-[700px]:aspect-[1.48/1]',
        card.soon && 'opacity-80'
      )}
    >
      {card.href && !card.soon ? (
        <Link
          href={card.href}
          aria-label={card.title}
          className="absolute inset-0 z-10 rounded-[inherit]"
        />
      ) : null}

      <div className="pointer-events-none relative z-0 flex items-start justify-between gap-3">
        <span className="accent-dot grid size-10 shrink-0 place-items-center rounded-full">
          {card.soon ? <HourglassGlyph /> : Icon ? <Icon className="size-5" /> : null}
        </span>
        {card.soon ? (
          <span className="size-5" />
        ) : (
          <IconArrowOut className="text-on-surface-variant size-5 shrink-0" />
        )}
      </div>

      <h2 className="text-on-surface pointer-events-none relative z-0 mt-2.5 line-clamp-2 text-base leading-[1.15] font-extrabold">
        <bdi lang={card.kind === 'speaking' ? undefined : 'en'}>{card.title}</bdi>
      </h2>
      {card.soon ? (
        <p className="text-on-surface-variant pointer-events-none relative z-0 mt-1 truncate text-xs font-bold">
          {labels.soonLine}
        </p>
      ) : card.subtitle ? (
        <p className="text-on-surface-variant pointer-events-none relative z-0 mt-1 line-clamp-2 text-xs leading-snug">
          <bdi>{card.subtitle}</bdi>
        </p>
      ) : null}

      {pill ? (
        <div
          className={cn(
            'relative z-20 mt-auto flex items-center gap-2 pt-3',
            alignEnd && 'justify-end'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-flex w-fit items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold',
              card.soon
                ? 'accent-dot-text'
                : card.kind === 'speaking'
                  ? 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] font-extrabold text-[var(--accent)]'
                  : 'bg-surface-1/80 text-on-surface-variant'
            )}
          >
            {card.soon || card.kind === 'speaking' ? null : <IconLayers className="size-3.5" />}
            {pill}
          </span>
          {card.pdfHref ? (
            <Link
              href={card.pdfHref}
              className="text-[var(--accent)] relative inline-flex min-h-8 items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--accent)_45%,transparent)] px-2.5 text-xs font-bold"
            >
              <IconPdf className="size-4" />
              {labels.pdf}
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function toCard(
  entry: ReturnType<typeof homeEntries>[number],
  index: number,
  unitCounts: Record<number, number>,
  pdfBookIds: number[],
  labels: BrowserLabels,
  locale: Locale
): BrowserCard | null {
  const accent = (index % 6) + 1;

  if (entry.kind === 'series') {
    const first = entry.books[0];
    if (!first) return null;
    return {
      id: `series-${first.seriesId ?? entry.title}`,
      href: first.seriesId
        ? localeHref(locale, `/books/series/${first.seriesId}`)
        : localeHref(locale, `/books/${first.id}`),
      title: entry.title,
      subtitle: '',
      description: '',
      badge: formatClient(labels.volumesTemplate, locale, { count: entry.books.length }),
      accent,
      icon: 'book',
      track: first.track,
      kind: 'series',
      soon: false,
      pdfHref: null,
    };
  }

  const count = unitCounts[entry.book.id] ?? 0;
  const soon = count === 0 && !isCambridgeVolume15(entry.book);
  const bookHref = localeHref(locale, `/books/${entry.book.id}`);
  return {
    id: `book-${entry.book.id}`,
    href: soon ? null : bookHref,
    title: entry.book.title,
    subtitle: '',
    description: '',
    badge: soon ? null : formatClient(labels.unitCountTemplate, locale, { count }),
    accent,
    icon: 'book',
    track: entry.book.track,
    kind: 'book',
    soon,
    pdfHref: !soon && pdfBookIds.includes(entry.book.id) ? (`${bookHref}#study-pdfs` as Route) : null,
  };
}

function HourglassGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M6 3h12M6 21h12" />
      <path d="M7 3c0 4 4 5 5 9s-5 5-5 9M17 3c0 4-4 5-5 9s5 5 5 9" />
    </svg>
  );
}

function IconArrowOut({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

function TrophyGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M7 4h10v5a5 5 0 0 1-10 0Z" />
      <path d="M7 6H4v1a4 4 0 0 0 3 3.9M17 6h3v1a4 4 0 0 1-3 3.9" />
      <path d="M10 14h4l-.5 4h-3ZM8 20h8" />
    </svg>
  );
}

function TrackIcon({ id, active }: { id: string; active: boolean }) {
  if (active) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-4 shrink-0"
      >
        <path d="m4.5 12.5 5 5 10-11" />
      </svg>
    );
  }
  if (id === 'ielts') return <IconSchool className="size-4 shrink-0" />;
  return <IconBook className="size-4 shrink-0" />;
}
