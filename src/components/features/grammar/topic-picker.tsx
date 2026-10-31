'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useId, useMemo, useState, useSyncExternalStore } from 'react';

import { Badge } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/sheet';
import { IconChevron, IconGrammar, IconSearch, IconSparkle } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { formatClient } from '@/lib/i18n/client-format';
import type { Locale } from '@/lib/i18n/config';
import { countsFromSnapshot, progressStore } from '@/lib/quiz/progress';
import { SESSION_LENGTH_OPTIONS, minQuestionsForTopics } from '@/lib/quiz/session';

/**
 * The grammar topic picker, built to match the app's screen.
 *
 * In the app each topic is a numbered card showing how many of its questions
 * you have attempted, with two actions — **Quiz** and **Learn** — and a
 * checkbox. Selecting several topics enables a combined session from a bar at
 * the bottom. This reproduces that, including the question-count step.
 *
 * Progress is read from this browser's storage, so it is zero on a first visit
 * and never matches the phone. The page says so instead of implying it syncs.
 */

export type TopicRow = {
  id: number;
  /** The API joins questions to topics by name, so the name is the key. */
  topic: string;
  questionCount: number;
  isNew: boolean;
  learnHref: Route;
};

export type PickerLabels = {
  searchHint: string;
  noResults: string;
  quizTitle: string;
  quizDesc: string;
  learnTitle: string;
  learnDesc: string;
  badgeNew: string;
  selectedTemplate: string;
  solvedTemplate: string;
  questionsTemplate: string;
  startQuiz: string;
  clear: string;
  chooseLength: string;
  notSynced: string;
  notEnoughTemplate: string;
};

export function TopicPicker({
  topics,
  labels,
  locale,
  quizHref,
}: {
  topics: TopicRow[];
  labels: PickerLabels;
  locale: Locale;
  /** Base path of the combined quiz route. */
  quizHref: string;
}) {
  const router = useRouter();
  const searchId = useId();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => new Set());
  const [choosingLength, setChoosingLength] = useState(false);

  const deferredQuery = useDeferredValue(query);

  /*
   * Progress lives in localStorage, which the server cannot see. Subscribing to
   * it keeps the server and client markup identical on the first paint, updates
   * when a session records an answer, and picks up a change made in another
   * tab — none of which copying it into state would do.
   */
  const snapshot = useSyncExternalStore(
    progressStore.subscribe,
    progressStore.getSnapshot,
    progressStore.getServerSnapshot
  );
  const progress = useMemo(
    () =>
      countsFromSnapshot(
        snapshot,
        topics.map((t) => t.topic)
      ),
    [snapshot, topics]
  );

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) return topics;
    return topics.filter((t) => t.topic.toLowerCase().includes(needle));
  }, [topics, deferredQuery]);

  const selectedTopics = useMemo(
    () => topics.filter((t) => selected.has(t.id)),
    [topics, selected]
  );

  const bank = selectedTopics.reduce((sum, t) => sum + t.questionCount, 0);
  const floor = minQuestionsForTopics(selectedTopics.length);
  const enoughInBank = bank >= floor;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function start(count: number) {
    const ids = selectedTopics.map((t) => t.id).join(',');
    // The seed is in the URL so the session survives a reload and can be shared.
    const seed = Math.floor(Math.random() * 2_147_483_647);
    router.push(`${quizHref}?topics=${ids}&n=${count}&seed=${seed}` as Route);
  }

  const lengths = SESSION_LENGTH_OPTIONS.filter((n) => n >= floor && n <= bank);

  return (
    <>
      <div className="relative mb-5">
        <IconSearch className="text-on-surface-variant pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.searchHint}
          aria-label={labels.searchHint}
          className="bg-surface-1 border-outline-strong text-on-surface placeholder:text-on-surface-variant h-13 w-full rounded-full border ps-12 pe-5 text-[length:var(--text-body)]"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-12 text-center">
          {labels.noResults}
        </p>
      ) : (
        <ul className="space-y-4 pb-28">
          {filtered.map((topic, index) => {
            const isSelected = selected.has(topic.id);
            const solved = progress[topic.topic.trim()] ?? 0;
            // 1–6, stable per topic, so a card keeps its colour.
            const accent = ((topic.id * 7) % 6) + 1;

            return (
              <li key={topic.id}>
                <div
                  data-accent={accent}
                  className={cn(
                    'accent-card rounded-[1.25rem] border p-4 transition-colors duration-[var(--duration-fast)]',
                    isSelected ? 'border-primary' : 'border-outline-variant/70'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <label className="flex min-h-11 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(topic.id)}
                        className="accent-primary size-5 cursor-pointer"
                      />
                      <span className="sr-only">{topic.topic}</span>
                    </label>

                    <span className="accent-dot-text grid size-9 shrink-0 place-items-center rounded-full text-[length:var(--text-label)] font-bold">
                      {formatClient('{n, number}', locale, { n: index + 1 })}
                    </span>

                    <div className="min-w-0 flex-1 text-center">
                      <h2 className="text-on-surface text-[length:var(--text-h4)] font-bold">
                        <bdi lang="en">{topic.topic}</bdi>
                      </h2>
                      <p className="text-on-surface-variant mt-0.5 text-[length:var(--text-label)]">
                        {formatClient(labels.solvedTemplate, locale, {
                          solved,
                          total: topic.questionCount,
                        })}
                      </p>
                    </div>

                    {topic.isNew ? (
                      <Badge tone="new">
                        <IconSparkle className="me-1 size-3" />
                        {labels.badgeNew}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ActionCard
                      href={
                        `${quizHref}?topics=${topic.id}&n=15&seed=${Math.floor(
                          topic.id * 7919
                        )}` as Route
                      }
                      title={labels.quizTitle}
                      description={labels.quizDesc}
                    />
                    <ActionCard
                      href={topic.learnHref}
                      title={labels.learnTitle}
                      description={labels.learnDesc}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* The selection bar, as in the app: it appears once something is picked. */}
      {selected.size > 0 ? (
        <div className="border-outline-variant bg-surface-1/95 pb-nav fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur">
          <div className="page-gutter mx-auto flex w-full max-w-[var(--container-content)] flex-wrap items-center gap-3 py-3">
            <p className="text-on-surface min-w-0 flex-1 font-semibold">
              {formatClient(labels.selectedTemplate, locale, { count: selected.size })}
            </p>

            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-on-surface-variant hover:bg-surface-2 inline-flex min-h-11 items-center rounded-full px-4 font-semibold"
            >
              {labels.clear}
            </button>

            <button
              type="button"
              onClick={() => setChoosingLength(true)}
              disabled={!enoughInBank}
              className="bg-primary text-on-primary disabled:bg-surface-4 disabled:text-on-surface-variant inline-flex min-h-12 items-center gap-2 rounded-full px-5 font-bold disabled:cursor-not-allowed"
            >
              {labels.startQuiz}
              <IconChevron className="size-4" />
            </button>
          </div>

          {!enoughInBank ? (
            <p className="page-gutter text-on-surface-variant mx-auto w-full max-w-[var(--container-content)] pb-3 text-[length:var(--text-caption)]">
              {formatClient(labels.notEnoughTemplate, locale, { minRequired: floor })}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* The question-count step the app shows before a session starts. */}
      <LengthSheet
        open={choosingLength}
        locale={locale}
        lengths={lengths.length > 0 ? [...lengths] : [Math.min(bank, floor)]}
        label={labels.chooseLength}
        note={labels.notSynced}
        onPick={start}
        onClose={() => setChoosingLength(false)}
      />
    </>
  );
}

function ActionCard({
  href,
  title,
  description,
}: {
  href: Route;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="bg-surface-1/70 hover:bg-surface-1 border-outline-variant/60 flex min-h-20 flex-col rounded-[var(--radius-input)] border p-3 no-underline transition-colors duration-[var(--duration-fast)]"
    >
      <span className="text-on-surface flex items-center justify-between gap-2 font-bold">
        <span className="inline-flex items-center gap-2">
          <IconGrammar className="size-4" />
          {title}
        </span>
        <IconChevron className="text-on-surface-variant size-4" />
      </span>
      <span className="text-on-surface-variant mt-1 text-[length:var(--text-caption)]">
        {description}
      </span>
    </Link>
  );
}

/**
 * The question-count step, on the shared sheet so it behaves like every other
 * half-screen in the app — and in the same place the app puts it.
 */
function LengthSheet({
  open,
  locale,
  lengths,
  label,
  note,
  onPick,
  onClose,
}: {
  open: boolean;
  locale: Locale;
  lengths: number[];
  label: string;
  note: string;
  onPick: (n: number) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label={label}>
      <div className="p-6 pt-2 sm:pt-6">
        <h2 className="text-on-surface text-[length:var(--text-h4)] font-bold">
          {label}
        </h2>

        <div className="mt-5 flex flex-wrap gap-3">
          {lengths.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPick(n)}
              className="border-outline-strong hover:bg-surface-2 text-on-surface inline-flex min-h-12 min-w-16 items-center justify-center rounded-full border px-5 font-bold"
            >
              {/* Persian and Kurdish readers see their own digits here too. */}
              {formatClient('{n}', locale, { n })}
            </button>
          ))}
        </div>

        <p className="text-on-surface-variant mt-5 text-[length:var(--text-caption)]">
          {note}
        </p>
      </div>
    </Sheet>
  );
}
