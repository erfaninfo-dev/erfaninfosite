'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

import { IconClose, IconCopy, IconSearch, IconSparkle } from '@/components/ui/icons';
import type {
  SpeakingIdeaCategory,
  SpeakingIdeaSearchHit,
  SpeakingQuestion,
} from '@/lib/api/normalize';
import { cn } from '@/lib/cn';
import { formatClient } from '@/lib/i18n/client-format';
import type { GlossLang, Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';
import { searchSpeakingIdeas } from '@/lib/speaking/search-ideas';

/**
 * One speaking topic, as the app opens it from a topic card.
 *
 * The screen is left-to-right in every locale. Questions start collapsed and
 * only one stays open. Ideas is a tab on this same screen, not a second page.
 * The gloss under a sample answer follows the gloss language (Persian or
 * Kurdish), and falls back to the other of those two — never to the English
 * answer, which is already on the card.
 */

type Tab = 'questions' | 'ideas';

/** `speakingQuestionAccentColor`: blue, green, lavender, peach, orchid. */
const QUESTION_ACCENTS = ['4', '2', '1', '6', '5'] as const;

type Accent = (typeof QUESTION_ACCENTS)[number] | '3' | 'speaking' | 'error' | 'primary';

export type TopicQuestionLabels = {
  back: string;
  questions: string;
  ideas: string;
  noQuestions: string;
  noIdeas: string;
  modelAnswer: string;
  modelNumberTemplate: string;
  formula: string;
  template: string;
  sampleAnswer: string;
  bandAnswerTemplate: string;
  copied: string;
  persian: string;
  kurdish: string;
  searchIdeas: string;
  noSearchResults: string;
  otherTopics: string;
  ideasErrorTemplate: string;
  retry: string;
  clear: string;
};

export function TopicQuestions({
  topicId,
  title,
  questions,
  categories,
  locale,
  gloss,
  labels,
}: {
  topicId: number;
  title: string;
  questions: SpeakingQuestion[];
  categories: SpeakingIdeaCategory[];
  locale: Locale;
  gloss: GlossLang;
  labels: TopicQuestionLabels;
}) {
  const [tab, setTab] = useState<Tab>('questions');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const backHref = localeHref(locale, '/speaking');

  function toggleQuestion(id: number) {
    setExpandedId((current) => (current === id ? null : id));
  }

  async function copyAnswer(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 2000);
  }

  return (
    <div dir="ltr" className="pb-8">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={backHref}
          aria-label={labels.back}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <BackArrow />
        </Link>
        <h1 className="text-on-surface truncate text-lg font-extrabold">{title}</h1>
      </div>

      <div role="tablist" aria-label={title} className="border-outline-variant mb-3 flex gap-6 border-b">
        <TabButton
          selected={tab === 'questions'}
          onSelect={() => setTab('questions')}
          label={labels.questions}
        />
        <TabButton selected={tab === 'ideas'} onSelect={() => setTab('ideas')} label={labels.ideas} />
      </div>

      <p role="status" className="sr-only">
        {copiedKey ? labels.copied : ''}
      </p>

      {tab === 'questions' ? (
        questions.length === 0 ? (
          <p className="text-on-surface-variant px-6 py-16 text-center">{labels.noQuestions}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {questions.map((question, index) => {
              const displayIndex = index + 1;
              return (
                <li key={question.id}>
                  <QuestionCard
                    question={question}
                    displayIndex={displayIndex}
                    accent={questionAccent(displayIndex)}
                    expanded={expandedId === question.id}
                    gloss={gloss}
                    locale={locale}
                    labels={labels}
                    copiedKey={copiedKey}
                    onToggle={() => toggleQuestion(question.id)}
                    onCopy={copyAnswer}
                  />
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <IdeasPanel
          topicId={topicId}
          topicTitle={title}
          categories={categories}
          locale={locale}
          labels={labels}
        />
      )}
    </div>
  );
}

export function questionAccent(displayIndex: number): Accent {
  if (displayIndex <= 0) return QUESTION_ACCENTS[0];
  return QUESTION_ACCENTS[(displayIndex - 1) % QUESTION_ACCENTS.length] ?? QUESTION_ACCENTS[0];
}

function categoryAccent(code: string): Accent {
  switch (code.toLowerCase().trim()) {
    case 'advantage':
      return '2';
    case 'disadvantage':
      return 'error';
    case 'use':
      return '4';
    case 'types':
      return '1';
    case 'activities':
      return '6';
    case 'examples':
      return '3';
    case 'places':
      return 'speaking';
    default:
      return 'primary';
  }
}

function bandAccent(band: string): Accent {
  const match = /[\d.]+/.exec(band);
  const value = match ? Number.parseFloat(match[0] ?? '') : 6;
  if (value >= 7.5) return '1';
  if (value >= 7) return '4';
  if (value >= 6.5) return '3';
  return '6';
}

function glossAnswer(
  value: { fa: string; ckb: string },
  gloss: GlossLang
): { text: string; lang: GlossLang } | null {
  const fa = value.fa.trim();
  const ckb = value.ckb.trim();
  if (gloss === 'ckb') {
    if (ckb) return { text: ckb, lang: 'ckb' };
    if (fa) return { text: fa, lang: 'fa' };
    return null;
  }
  if (fa) return { text: fa, lang: 'fa' };
  if (ckb) return { text: ckb, lang: 'ckb' };
  return null;
}

function titleCaseWords(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map((part) =>
      part.length === 1 ? part.toUpperCase() : `${part[0]?.toUpperCase() ?? ''}${part.slice(1).toLowerCase()}`
    )
    .join(' ');
}

function ideaHeading(topicTitle: string, categoryTitleEn: string, categoryCode: string): string {
  const topic = titleCaseWords(topicTitle);
  const raw = categoryTitleEn.trim() || categoryCode.trim();
  const category = titleCaseWords(raw);
  if (!topic) return category;
  if (!category) return topic;
  return `${topic} ${category}`;
}

function sanitizeBand(raw: string): string {
  const text = raw.replaceAll('\u2013', '-').replaceAll('\u2014', '-').replaceAll('\u2212', '-').trim();
  const match = /[\d]+(?:[.\-][\d]+)?/.exec(text);
  return match?.[0] ?? text.replace(/[^\d.\-]/g, '');
}

function TabButton({
  selected,
  onSelect,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        '-mb-px border-b-2 px-1 py-3 text-sm font-extrabold',
        selected ? 'border-primary text-primary' : 'text-on-surface-variant border-transparent'
      )}
    >
      {label}
    </button>
  );
}

export type QuestionCardLabels = Pick<
  TopicQuestionLabels,
  | 'modelAnswer'
  | 'modelNumberTemplate'
  | 'formula'
  | 'template'
  | 'sampleAnswer'
  | 'bandAnswerTemplate'
  | 'copied'
  | 'persian'
  | 'kurdish'
>;

export function QuestionCard({
  question,
  displayIndex,
  accent,
  expanded,
  gloss,
  locale,
  labels,
  copiedKey,
  onToggle,
  onCopy,
  topicLabel,
}: {
  question: SpeakingQuestion;
  displayIndex: number;
  accent: Accent;
  expanded: boolean;
  gloss: GlossLang;
  locale: Locale;
  labels: QuestionCardLabels;
  copiedKey: string | null;
  onToggle: () => void;
  onCopy: (key: string, text: string) => void;
  topicLabel?: string;
}) {
  const number = formatClient('{count}', locale, { count: displayIndex });
  const translation = glossAnswer(question.answer, gloss);
  const translationLabel = gloss === 'ckb' ? labels.kurdish : labels.persian;
  const heading = question.modelTitle || question.modelFormula;

  return (
    <article
      data-accent={accent}
      className={cn(
        'bg-surface-1 relative overflow-hidden rounded-[1.25rem] border shadow-[var(--shadow-soft)]',
        expanded
          ? 'border-[color-mix(in_oklab,var(--accent)_28%,transparent)]'
          : 'border-outline-variant/40'
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -bottom-4 size-24 rounded-full bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2 bottom-1 size-14 rounded-full bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]"
      />

      <div className="relative flex items-start gap-3 px-3.5 pt-3.5">
        <span className="accent-dot grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold">
          {number}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          {topicLabel ? (
            <p className="mb-1.5 inline-block max-w-full rounded-full bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--accent)]">
              {topicLabel}
            </p>
          ) : null}
          <p lang="en" className="text-on-surface text-base leading-snug font-bold">
            {question.questionText}
          </p>
        </div>
      </div>

      <div className="relative px-3.5 pt-2 pb-2.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 py-1 text-[12.5px] font-bold text-[var(--accent)]"
        >
          <IconSparkle className="size-3.5" />
          {labels.modelAnswer}
        </button>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={labels.modelAnswer}
            className="bg-surface-1 text-on-surface shadow-[var(--shadow-soft)] grid size-10 place-items-center rounded-full"
          >
            <Chevron expanded={expanded} />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="relative px-2.5 pb-2.5">
          <div className="relative overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--accent)_22%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,var(--color-surface-1))] p-3">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-6 -right-6 size-[5.5rem] rounded-full bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]"
            />
            <div className="relative flex items-start gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]">
                <IconSparkle className="size-5" />
              </span>
              <div>
                <p className="text-[10.5px] font-extrabold tracking-wide text-[var(--accent)]">
                  {formatClient(labels.modelNumberTemplate, locale, { number: question.modelNumber })}
                </p>
                {heading ? (
                  <p lang="en" className="text-on-surface mt-1 text-[15px] leading-snug font-extrabold">
                    {heading}
                  </p>
                ) : null}
              </div>
            </div>

            {question.modelFormula ? (
              <InfoBlock label={labels.formula} text={question.modelFormula} mono />
            ) : null}
            {question.modelTemplate ? (
              <InfoBlock label={labels.template} text={question.modelTemplate} italic />
            ) : null}
            {question.answer.en ? (
              <AnswerBlock
                label={labels.sampleAnswer}
                text={question.answer.en}
                translationLabel={translation ? translationLabel : null}
                translation={translation}
                copied={copiedKey === `q-${question.id}`}
                copiedLabel={labels.copied}
                onCopy={() => onCopy(`q-${question.id}`, question.answer.en)}
              />
            ) : null}
          </div>

          {question.bandAnswers.map((band) => {
            const key = `b-${question.id}-${band.band}`;
            const bandTranslation = glossAnswer(band, gloss);
            return (
              <AnswerBlock
                key={key}
                className="mt-2"
                label={formatClient(labels.bandAnswerTemplate, locale, { band: band.band })}
                text={band.answer}
                translationLabel={bandTranslation ? translationLabel : null}
                translation={bandTranslation}
                copied={copiedKey === key}
                copiedLabel={labels.copied}
                onCopy={() => onCopy(key, band.answer)}
              />
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

function InfoBlock({
  label,
  text,
  mono = false,
  italic = false,
}: {
  label: string;
  text: string;
  mono?: boolean;
  italic?: boolean;
}) {
  return (
    <div className="relative mt-2 rounded-xl border border-[color-mix(in_oklab,var(--accent)_18%,transparent)] bg-white/70 p-3 dark:bg-white/6">
      <p className="flex items-center gap-2 text-xs font-extrabold text-[var(--accent)]">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--accent)]" />
        {label}
      </p>
      <p
        lang="en"
        className={cn(
          'text-on-surface mt-2 text-[13.5px] leading-snug',
          mono && 'font-mono',
          italic && 'italic'
        )}
      >
        {text}
      </p>
    </div>
  );
}

function AnswerBlock({
  label,
  text,
  translationLabel,
  translation,
  copied,
  copiedLabel,
  onCopy,
  className,
}: {
  label: string;
  text: string;
  translationLabel: string | null;
  translation: { text: string; lang: GlossLang } | null;
  copied: boolean;
  copiedLabel: string;
  onCopy: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-surface-1/90 relative mt-2 rounded-xl border border-[color-mix(in_oklab,var(--accent)_24%,transparent)] p-3',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
        <p className="min-w-0 flex-1 text-xs font-extrabold text-[var(--accent)]">{label}</p>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy"
          className="grid size-9 place-items-center rounded-full text-[var(--accent)]"
        >
          <IconCopy className="size-4" />
        </button>
      </div>
      <p lang="en" className="text-on-surface text-[14.5px] leading-relaxed font-semibold">
        {text}
      </p>
      {copied ? <p className="mt-1 text-xs font-bold text-[var(--accent)]">{copiedLabel}</p> : null}
      {translation && translationLabel ? (
        <>
          <hr className="my-3 border-[color-mix(in_oklab,var(--accent)_22%,transparent)]" />
          <p className="text-[11px] font-bold text-[var(--accent)]">{translationLabel}</p>
          <p lang={translation.lang} dir="rtl" className="text-on-surface mt-1.5 text-right text-sm leading-relaxed font-semibold">
            {translation.text}
          </p>
        </>
      ) : null}
    </div>
  );
}

function IdeasPanel({
  topicId,
  topicTitle,
  categories,
  locale,
  labels,
}: {
  topicId: number;
  topicTitle: string;
  categories: SpeakingIdeaCategory[];
  locale: Locale;
  labels: TopicQuestionLabels;
}) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [search, setSearch] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; results: SpeakingIdeaSearchHit[] }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setDebounced('');
      return;
    }
    const id = window.setTimeout(() => setDebounced(trimmed), 350);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!debounced) {
      setSearch({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setSearch({ status: 'loading' });
    searchSpeakingIdeas(topicId, debounced)
      .then((results) => {
        if (!cancelled) setSearch({ status: 'ready', results });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSearch({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, debounced, topicId]);

  function toggleCategory(code: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <div>
      <div className="relative mb-3">
        <IconSearch className="text-on-surface-variant pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.searchIdeas}
          aria-label={labels.searchIdeas}
          className="bg-surface-1 text-on-surface placeholder:text-on-surface-variant h-12 w-full rounded-full border-0 ps-12 pe-12 text-sm font-semibold"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={labels.clear}
            className="text-on-surface-variant absolute end-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full"
          >
            <IconClose className="size-4" />
          </button>
        ) : null}
      </div>

      {search.status === 'loading' ? (
        <div className="grid place-items-center py-16" role="status">
          <span className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : search.status === 'error' ? (
        <div className="px-6 py-12 text-center">
          <p className="text-on-surface-variant">
            {formatClient(labels.ideasErrorTemplate, locale, { error: search.message })}
          </p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="border-outline-strong text-primary mt-4 rounded-full border px-4 py-2 text-sm font-bold"
          >
            {labels.retry}
          </button>
        </div>
      ) : search.status === 'ready' ? (
        search.results.length === 0 ? (
          <p className="text-on-surface-variant px-6 py-16 text-center">{labels.noSearchResults}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {search.results.map((hit, index) => {
              const previous = index > 0 ? search.results[index - 1] : null;
              const showOthers = !hit.isCurrentTopic && (previous == null || previous.isCurrentTopic);
              return (
                <li key={`${hit.topicId}-${hit.id}`}>
                  {showOthers ? (
                    <p className="text-on-surface-variant mb-2 px-1 text-xs font-bold">{labels.otherTopics}</p>
                  ) : null}
                  <SearchHitCard hit={hit} />
                </li>
              );
            })}
          </ul>
        )
      ) : categories.length === 0 ? (
        <p className="text-on-surface-variant px-6 py-16 text-center">{labels.noIdeas}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {categories.map((category) => {
            const open = expanded.has(category.category);
            const heading = ideaHeading(topicTitle, category.titleEn, category.category);
            return (
              <li key={category.category} data-accent={categoryAccent(category.category)}>
                <div
                  className={cn(
                    'bg-surface-1 overflow-hidden rounded-[1.15rem] border shadow-[var(--shadow-soft)]',
                    open
                      ? 'border-[color-mix(in_oklab,var(--accent)_35%,transparent)]'
                      : 'border-outline-variant/40'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.category)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-start text-sm font-extrabold text-[var(--accent)]"
                  >
                    <span className="min-w-0 flex-1">{heading}</span>
                    <Chevron expanded={open} />
                  </button>
                  {open ? (
                    <div className="flex flex-col gap-2 px-2.5 pb-2.5">
                      {category.ideas.map((idea) => (
                        <IdeaRow key={idea.id} phrase={idea.phrase} example={idea.example} band={idea.band} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SearchHitCard({ hit }: { hit: SpeakingIdeaSearchHit }) {
  const heading = ideaHeading(hit.topicTitle, hit.categoryTitleEn, hit.category);
  return (
    <div
      data-accent={categoryAccent(hit.category)}
      className="bg-surface-1 rounded-[1.15rem] border border-[color-mix(in_oklab,var(--accent)_28%,transparent)] px-3 py-2.5"
    >
      <p className="text-[13px] font-extrabold text-[var(--accent)]">{heading}</p>
      <div className="mt-2">
        <IdeaRow phrase={hit.phrase} example={hit.example} band={hit.band} />
      </div>
    </div>
  );
}

function IdeaRow({ phrase, example, band }: { phrase: string; example: string; band: string }) {
  const score = sanitizeBand(band);
  return (
    <div className="border-secondary-container bg-surface-2 flex items-start gap-2 rounded-xl border px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p lang="en" className="text-on-secondary-container text-sm leading-snug font-bold">
          {phrase}
        </p>
        {example ? (
          <p lang="en" className="text-primary/80 mt-1.5 text-[12.5px] leading-snug italic">
            {example}
          </p>
        ) : null}
      </div>
      {score ? (
        <span
          data-accent={bandAccent(score)}
          className="shrink-0 rounded-full border border-[color-mix(in_oklab,var(--accent)_35%,transparent)] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] px-2 py-1 text-[11px] font-extrabold text-[var(--accent)]"
        >
          {score}
        </span>
      ) : null}
    </div>
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

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="text-on-surface-variant size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {expanded ? <path d="m6 14 6-6 6 6" /> : <path d="m6 10 6 6 6-6" />}
    </svg>
  );
}
