'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useDeferredValue, useId, useMemo, useState } from 'react';

import {
  IconBook,
  IconChevron,
  IconGrammar,
  IconLayers,
  IconSchool,
  IconSearch,
  IconSpeaking,
  IconUsers,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { formatClient } from '@/lib/i18n/client-format';
import type { Locale } from '@/lib/i18n/config';

/**
 * The home page's book browser: the hero search, the track filter, the card
 * grid and "load more".
 *
 * The cards arrive fully resolved from the server — title, subtitle, badge and
 * accent are all computed there — so this component holds only interaction
 * state. It ships no language logic and no API knowledge.
 */

export type BrowserCard = {
  id: string;
  /** Built on the server by `localeHref`, which is where the cast lives. */
  href: Route;
  title: string;
  subtitle: string;
  badge: string | null;
  /** 1–6, chosen from the entry's id so it never changes between renders. */
  accent: number;
  icon: 'book' | 'speaking' | 'grammar' | 'school';
  track: string;
};

export type BrowserLabels = {
  heading: string;
  searchHint: string;
  /** Raw ICU; the count is a browser-side value. */
  availableTemplate: string;
  showingTemplate: string;
  loadMore: string;
  noResults: string;
  tracks: Array<{ id: string; label: string }>;
  league: string;
  students: string;
  accountsSoon: string;
  pageLabelTemplate: string;
};

const PAGE_SIZE = 6;

const ICONS = {
  book: IconBook,
  speaking: IconSpeaking,
  grammar: IconGrammar,
  school: IconSchool,
} as const;

export function BookBrowser({
  cards,
  bookCount,
  labels,
  locale,
}: {
  cards: BrowserCard[];
  /**
   * How many books the catalogue holds — not how many cards are drawn. A
   * series of twenty volumes is one card but twenty books, and the hero line
   * sits under "Choose Your Book", so it has to count books.
   */
  bookCount: number;
  labels: BrowserLabels;
  locale: Locale;
}) {
  const [query, setQuery] = useState('');
  const [track, setTrack] = useState(labels.tracks[0]?.id ?? 'all');
  const [shown, setShown] = useState(PAGE_SIZE);
  const searchId = useId();

  // Keeps typing responsive without a manual debounce.
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return cards.filter((card) => {
      if (track !== 'all' && card.track !== track) return false;
      if (!needle) return true;
      return (
        card.title.toLowerCase().includes(needle) ||
        card.subtitle.toLowerCase().includes(needle)
      );
    });
  }, [cards, deferredQuery, track]);

  const visible = filtered.slice(0, shown);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(pages, Math.ceil(shown / PAGE_SIZE));

  function choose(nextTrack: string) {
    setTrack(nextTrack);
    setShown(PAGE_SIZE);
  }

  return (
    <>
      {/* ── hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-wash relative mb-6 overflow-hidden rounded-[1.75rem] px-6 py-8 sm:px-10 sm:py-10">
        <div className="relative z-10 flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-on-surface text-[length:var(--text-display)] leading-[1.1] font-extrabold">
              {labels.heading}
            </h1>
            <p className="text-on-surface-variant mt-2">
              {formatClient(labels.availableTemplate, locale, { count: bookCount })}
            </p>

            <div className="relative mt-6 max-w-2xl">
              <IconSearch className="text-on-surface-variant pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2" />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(PAGE_SIZE);
                }}
                placeholder={labels.searchHint}
                aria-label={labels.searchHint}
                className={cn(
                  'bg-surface-1 h-13 w-full rounded-full border-0 ps-12 pe-5',
                  'shadow-[var(--shadow-soft)]',
                  // 16px minimum, which also stops iOS zooming on focus.
                  'text-on-surface placeholder:text-on-surface-variant text-[length:var(--text-body)]'
                )}
              />
            </div>
          </div>

          {/* The logo badge. No room for it on a phone. */}
          <div
            aria-hidden="true"
            className="bg-surface-1 hidden size-28 shrink-0 items-center justify-center rounded-3xl shadow-[var(--shadow-raised)] md:flex"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="" width={72} height={72} />
          </div>
        </div>

        {/* The dotted motif behind the badge. Never mirrored; purely texture. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute end-32 top-8 hidden size-24 opacity-40 md:block"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)',
            backgroundSize: '12px 12px',
            color: 'var(--color-on-surface-variant)',
          }}
        />
      </section>

      {/* ── filters ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-stretch gap-3">
        <div
          role="group"
          aria-label={labels.heading}
          className="border-outline-strong bg-surface-1 flex min-w-0 flex-1 overflow-hidden rounded-2xl border"
        >
          {labels.tracks.map((item, index) => {
            const active = track === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => choose(item.id)}
                aria-pressed={active}
                className={cn(
                  'flex min-h-13 flex-1 items-center justify-center gap-2 px-3 py-3',
                  'text-[length:var(--text-label)] font-semibold',
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

        {/*
          League and Students need accounts, which Phase 1 does not have. They
          are drawn as the design shows but marked unavailable rather than
          shipped as buttons that silently do nothing.
        */}
        <div className="flex shrink-0 gap-3">
          <SoonPill
            className="gradient-league"
            label={labels.league}
            hint={labels.accountsSoon}
          >
            <TrophyGlyph />
          </SoonPill>
          <SoonPill
            className="gradient-students"
            label={labels.students}
            hint={labels.accountsSoon}
          >
            <IconUsers className="size-5" />
          </SoonPill>
        </div>
      </div>

      {/* ── cards ────────────────────────────────────────────────────────── */}
      <p aria-live="polite" className="sr-only">
        {formatClient(labels.showingTemplate, locale, {
          shown: visible.length,
          total: filtered.length,
        })}
      </p>

      {visible.length === 0 ? (
        <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-12 text-center">
          {labels.noResults}
        </p>
      ) : (
        <div
          className="grid gap-5"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(19rem, 100%), 1fr))',
          }}
        >
          {visible.map((card) => (
            <BookCard key={card.id} card={card} />
          ))}
        </div>
      )}

      {/* ── grid footer ──────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-on-surface-variant text-[length:var(--text-label)]">
          {formatClient(labels.showingTemplate, locale, {
            shown: visible.length,
            total: filtered.length,
          })}
        </p>

        {pages > 1 ? (
          <div className="flex items-center gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setShown(page * PAGE_SIZE)}
                aria-current={page === currentPage ? 'true' : undefined}
                aria-label={formatClient(labels.pageLabelTemplate, locale, {
                  page,
                  total: pages,
                })}
                className={cn(
                  // A 44px hit area around a small dot, per the touch-target rule.
                  'grid size-11 place-items-center rounded-full'
                )}
              >
                <span
                  className={cn(
                    'block size-2 rounded-full transition-colors duration-[var(--duration-fast)]',
                    page === currentPage ? 'bg-primary' : 'bg-outline-variant'
                  )}
                />
              </button>
            ))}
          </div>
        ) : null}

        {visible.length < filtered.length ? (
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE_SIZE)}
            className={cn(
              'inline-flex min-h-12 items-center gap-2 rounded-full px-5',
              'border-outline-strong bg-surface-1 text-on-surface border font-semibold',
              'hover:bg-surface-2 transition-colors duration-[var(--duration-fast)]'
            )}
          >
            {labels.loadMore}
            <IconChevron className="size-4 rotate-90" />
          </button>
        ) : null}
      </div>
    </>
  );
}

function BookCard({ card }: { card: BrowserCard }) {
  const Icon = ICONS[card.icon];

  return (
    <Link
      href={card.href}
      data-accent={card.accent}
      className={cn(
        'accent-card group relative flex min-h-48 flex-col overflow-hidden rounded-[1.25rem] p-5 no-underline',
        'border-outline-variant/70 border',
        'hover:border-primary/50 transition-[border-color] duration-[var(--duration-fast)]'
      )}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <span className="accent-dot grid size-11 shrink-0 place-items-center rounded-full">
          <Icon className="size-5" />
        </span>
        {/* Directional, so it mirrors in RTL like every other arrow. */}
        <IconArrowOut className="rtl-flip text-on-surface-variant/70 size-5 shrink-0" />
      </div>

      {/*
        h2, not h3: the page has one h1 ("Choose Your Book") and the cards sit
        directly under it with no section heading between, so h3 would skip a
        level.
      */}
      <h2 className="text-on-surface relative z-10 mt-4 text-[length:var(--text-h4)] font-bold">
        <bdi lang="en">{card.title}</bdi>
      </h2>

      {card.subtitle ? (
        <p className="text-on-surface-variant relative z-10 mt-1 line-clamp-2 text-[length:var(--text-label)]">
          <bdi lang="en">{card.subtitle}</bdi>
        </p>
      ) : null}

      {card.badge ? (
        <span className="bg-surface-1/70 text-on-surface-variant relative z-10 mt-auto inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 pt-1.5 text-[length:var(--text-caption)] font-semibold">
          <IconLayers className="size-3.5" />
          {card.badge}
        </span>
      ) : null}

      <WaveMotif />
    </Link>
  );
}

/** The faint bar motif in the card's trailing bottom corner. */
function WaveMotif() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 60"
      className="pointer-events-none absolute end-0 bottom-0 h-14 w-28 opacity-25"
      fill="currentColor"
    >
      {[6, 18, 30, 42, 54, 66, 78, 90, 102].map((x, i) => {
        const heights = [18, 34, 24, 46, 30, 52, 26, 38, 20];
        const h = heights[i] ?? 24;
        return <rect key={x} x={x} y={60 - h} width="7" height={h} rx="3.5" />;
      })}
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
  if (id === 'class') return <IconUsers className="size-4 shrink-0" />;
  return <IconBook className="size-4 shrink-0" />;
}

/**
 * A control the design calls for that cannot work until accounts exist.
 *
 * Rendered exactly as drawn, but `aria-disabled` with a visible explanation on
 * hover and focus — a button that silently does nothing is worse than one that
 * says why.
 */
function SoonPill({
  className,
  label,
  hint,
  children,
}: {
  className: string;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-disabled="true"
      title={hint}
      onClick={(e) => e.preventDefault()}
      className={cn(
        'inline-flex min-h-13 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-full px-5 sm:flex-initial',
        'font-semibold text-white shadow-[var(--shadow-soft)]',
        'opacity-90',
        className
      )}
    >
      {children}
      <span className="whitespace-nowrap">{label}</span>
      <span className="sr-only">{hint}</span>
    </button>
  );
}
