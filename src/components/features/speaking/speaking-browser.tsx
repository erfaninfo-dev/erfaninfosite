'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useId, useMemo, useState, type ReactNode } from 'react';

import { IconClose, IconSearch, IconSparkle, IconSpeaking } from '@/components/ui/icons';
import type { SpeakingModel, SpeakingTopic } from '@/lib/api/normalize';
import { cn } from '@/lib/cn';
import { formatClient } from '@/lib/i18n/client-format';
import type { Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';
import { speakingTopicArt } from '@/lib/speaking/topic-art';

/**
 * Speaking Part 1, as the app opens it from the home card.
 *
 * The whole browser is left-to-right, including in Persian and Kurdish: the
 * app wraps this screen in LTR so the first topic stays on the left. Topics
 * and model questions share one search; switching mode clears it.
 */

type Mode = 'topics' | 'models';

/** Same six-step rotation as the app's topic themes, using site accent tokens. */
const CARD_ACCENTS = ['speaking', 4, 1, 6, 2, 5] as const;

function cardAccent(id: number): (typeof CARD_ACCENTS)[number] {
  const index = id <= 0 ? 0 : (id - 1) % CARD_ACCENTS.length;
  return CARD_ACCENTS[index] ?? 'speaking';
}

export type SpeakingLabels = {
  title: string;
  back: string;
  topics: string;
  models: string;
  searchTopics: string;
  searchModels: string;
  topicsHintTemplate: string;
  modelsHintTemplate: string;
  questionCountTemplate: string;
  modelNumberTemplate: string;
  noTopics: string;
  noModels: string;
  untitled: string;
  clear: string;
};

export function SpeakingBrowser({
  topics,
  models,
  locale,
  labels,
}: {
  topics: SpeakingTopic[];
  models: SpeakingModel[];
  locale: Locale;
  labels: SpeakingLabels;
}) {
  const [mode, setMode] = useState<Mode>('topics');
  const [query, setQuery] = useState('');
  const searchId = useId();
  const needle = query.trim().toLowerCase();

  const filteredTopics = useMemo(() => {
    if (!needle) return topics;
    return topics.filter((topic) => topic.title.toLowerCase().includes(needle));
  }, [needle, topics]);

  const filteredModels = useMemo(() => {
    if (!needle) return models;
    return models.filter((model) =>
      `${model.modelNumber} ${model.title} ${model.formula} ${model.template}`
        .toLowerCase()
        .includes(needle)
    );
  }, [models, needle]);

  const hint =
    mode === 'topics'
      ? formatClient(labels.topicsHintTemplate, locale, { count: filteredTopics.length })
      : formatClient(labels.modelsHintTemplate, locale, { count: filteredModels.length });

  function selectMode(next: Mode) {
    setMode(next);
    setQuery('');
  }

  return (
    <div dir="ltr" className="pb-8">
      <div className="mb-3 flex items-center gap-2">
        <Link
          href={localeHref(locale, '/')}
          aria-label={labels.back}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <BackArrow />
        </Link>
        <h1 className="text-on-surface-variant truncate text-lg font-extrabold">{labels.title}</h1>
      </div>

      <div
        role="group"
        aria-label={labels.title}
        className="border-outline-strong bg-surface-1 mx-auto mb-3 flex w-fit overflow-hidden rounded-full border"
      >
        <ModeButton
          pressed={mode === 'topics'}
          onClick={() => selectMode('topics')}
          label={labels.topics}
          icon={<GridGlyph />}
        />
        <ModeButton
          pressed={mode === 'models'}
          onClick={() => selectMode('models')}
          label={labels.models}
          icon={<IconSparkle className="size-4" />}
        />
      </div>

      <div className="relative mb-4">
        <IconSearch className="text-on-surface-variant pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={mode === 'topics' ? labels.searchTopics : labels.searchModels}
          aria-label={mode === 'topics' ? labels.searchTopics : labels.searchModels}
          className={cn(
            'bg-surface-1 h-12 w-full rounded-full border-0 ps-12 pe-12',
            'text-on-surface placeholder:text-on-surface-variant text-[length:var(--text-body)] font-semibold'
          )}
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

      <p className="text-primary mb-3 px-1 text-sm font-semibold">{hint}</p>
      <p aria-live="polite" className="sr-only">
        {hint}
      </p>

      {mode === 'topics' ? (
        filteredTopics.length === 0 ? (
          <p className="text-on-surface-variant px-6 py-16 text-center">{labels.noTopics}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 min-[640px]:grid-cols-3 min-[800px]:grid-cols-4 min-[1040px]:grid-cols-5 min-[1280px]:grid-cols-6">
            {filteredTopics.map((topic) => (
              <li key={topic.id}>
                <TopicCard topic={topic} locale={locale} labels={labels} />
              </li>
            ))}
          </ul>
        )
      ) : filteredModels.length === 0 ? (
        <p className="text-on-surface-variant px-6 py-16 text-center">{labels.noModels}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredModels.map((model) => (
            <li key={model.id}>
              <ModelCard model={model} locale={locale} labels={labels} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ModeButton({
  pressed,
  onClick,
  label,
  icon,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 px-3 text-[12.5px] font-bold',
        pressed
          ? 'bg-secondary-container text-on-secondary-container'
          : 'text-on-surface-variant'
      )}
    >
      {pressed ? <CheckGlyph /> : icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function TopicCard({
  topic,
  locale,
  labels,
}: {
  topic: SpeakingTopic;
  locale: Locale;
  labels: SpeakingLabels;
}) {
  const accent = cardAccent(topic.id);
  const title = topic.title.trim() || labels.untitled;
  const number = topic.sortOrder > 0 ? topic.sortOrder : topic.id;

  return (
    <Link
      href={localeHref(locale, `/speaking/topics/${topic.id}`)}
      data-accent={accent}
      className="accent-card relative flex aspect-[0.9] flex-col overflow-hidden rounded-[1.35rem] p-3 no-underline"
    >
      <Wave />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={speakingTopicArt(topic.id, title)}
        alt=""
        className="pointer-events-none absolute end-[4%] bottom-[18%] h-1/2 w-[68%] object-contain"
      />
      <div className="relative z-10 flex items-start justify-between">
        <span className="grid size-8 place-items-center rounded-full border border-[color-mix(in_oklab,var(--accent)_28%,transparent)] text-[11px] font-extrabold text-[var(--accent)]">
          {formatClient('{count}', locale, { count: number })}
        </span>
        <span className="accent-dot grid size-8 place-items-center rounded-full">
          <IconSpeaking className="size-4" />
        </span>
      </div>
      <h2 className="text-on-surface relative z-10 mt-2 line-clamp-2 text-[13px] leading-tight font-extrabold">
        <bdi lang="en">{title}</bdi>
      </h2>
      <div className="relative z-10 mt-auto flex items-end justify-between gap-2">
        <p className="text-[9.5px] leading-tight font-bold text-[var(--accent)]">
          <ChatGlyph />
          <span className="mt-1 block">
            {formatClient(labels.questionCountTemplate, locale, { count: topic.questionCount })}
          </span>
        </p>
        <span className="accent-dot grid size-8 place-items-center rounded-full ring-2 ring-white">
          <ArrowGlyph />
        </span>
      </div>
    </Link>
  );
}

function ModelCard({
  model,
  locale,
  labels,
}: {
  model: SpeakingModel;
  locale: Locale;
  labels: SpeakingLabels;
}) {
  const accent = cardAccent(model.id);
  const title = model.title.trim() || '—';

  return (
    <Link
      href={localeHref(locale, `/speaking/models/${model.id}`) as Route}
      data-accent={accent}
      className="accent-card flex items-center gap-3 rounded-[1.15rem] border border-[color-mix(in_oklab,var(--accent)_24%,transparent)] px-3.5 py-3.5 no-underline"
    >
      <span className="accent-dot grid size-11 shrink-0 place-items-center rounded-2xl">
        <IconSparkle className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-[var(--accent)]">
          {formatClient(labels.modelNumberTemplate, locale, { number: model.modelNumber })}
        </span>
        <span className="text-on-surface mt-1 block line-clamp-2 text-[12.5px] leading-snug font-semibold">
          <bdi lang="en">{title}</bdi>
        </span>
        <span className="mt-1.5 block text-[10.5px] font-bold text-[var(--accent)]">
          {formatClient(labels.questionCountTemplate, locale, { count: model.questionCount })}
        </span>
      </span>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] text-[var(--accent)]">
        <ArrowGlyph />
      </span>
    </Link>
  );
}

function BackArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 12H4M10 6l-6 6 6 6" />
    </svg>
  );
}

function Wave() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 72"
      className="pointer-events-none absolute -start-4 -top-2 h-16 w-28 text-[var(--accent)] opacity-35"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <path d="M0 40 Q30 14 60 36 T120 30" />
      <path d="M8 52 Q42 34 78 48 T120 44" strokeWidth="2" opacity="0.55" />
    </svg>
  );
}

function GridGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="currentColor">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  );
}

function ChatGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 16.5 4 20l4.2-1.4A8 8 0 1 0 6 16.5Z" />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
