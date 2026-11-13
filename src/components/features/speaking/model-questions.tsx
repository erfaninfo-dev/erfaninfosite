'use client';

import Link from 'next/link';
import { useState } from 'react';

import { IconSparkle } from '@/components/ui/icons';
import type { SpeakingModel, SpeakingQuestion } from '@/lib/api/normalize';
import { cn } from '@/lib/cn';
import { formatClient } from '@/lib/i18n/client-format';
import type { GlossLang, Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

import {
  QuestionCard,
  questionAccent,
  type QuestionCardLabels,
} from './topic-questions';

/**
 * One model question, as the app opens it from a model row.
 *
 * Left-to-right in every locale. The bar shows the model number and how many
 * questions use it. A summary card holds the title, formula and template, then
 * the same collapsed question cards as a topic, each labelled with its topic.
 * Expand-all opens every card; opening one card by hand leaves only that one open.
 */

/** Same six-step rotation as the model row the reader just tapped. */
const MODEL_ACCENTS = ['speaking', '4', '1', '6', '2', '5'] as const;

function modelAccent(id: number): (typeof MODEL_ACCENTS)[number] {
  const index = id <= 0 ? 0 : (id - 1) % MODEL_ACCENTS.length;
  return MODEL_ACCENTS[index] ?? 'speaking';
}

export type ModelQuestionLabels = QuestionCardLabels & {
  back: string;
  subtitleTemplate: string;
  expandAll: string;
  collapseAll: string;
  noQuestions: string;
};

export function ModelQuestions({
  model,
  questions,
  locale,
  gloss,
  labels,
}: {
  model: SpeakingModel;
  questions: SpeakingQuestion[];
  locale: Locale;
  gloss: GlossLang;
  labels: ModelQuestionLabels;
}) {
  const [expandAll, setExpandAll] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const accent = modelAccent(model.id);
  const title = model.title.trim() || labels.modelAnswer;

  function toggleQuestion(id: number) {
    setExpandAll(false);
    setExpandedId((current) => (current === id ? null : id));
  }

  function toggleAll() {
    setExpandAll((open) => !open);
    setExpandedId(null);
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
          href={localeHref(locale, '/speaking')}
          aria-label={labels.back}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full"
        >
          <BackArrow />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-on-surface truncate text-[17px] font-extrabold">
            {formatClient(labels.modelNumberTemplate, locale, { number: model.modelNumber })}
          </h1>
          <p className="text-on-surface-variant text-xs font-medium">
            {formatClient(labels.subtitleTemplate, locale, { count: questions.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          disabled={questions.length === 0}
          aria-pressed={expandAll}
          aria-label={expandAll ? labels.collapseAll : labels.expandAll}
          className="bg-surface-1 text-on-surface-variant shadow-[var(--shadow-soft)] grid size-11 shrink-0 place-items-center rounded-full disabled:opacity-40"
        >
          <UnfoldIcon expanded={expandAll} />
        </button>
      </div>

      <section
        data-accent={accent}
        className="bg-surface-1 relative mb-3 overflow-hidden rounded-[1.25rem] shadow-[var(--shadow-soft)]"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-5 -right-5 size-24 rounded-full bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-4 right-4 size-11 rounded-full bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]"
        />
        <div className="relative p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[13px] border border-[color-mix(in_oklab,var(--accent)_24%,transparent)] bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-[var(--accent)]">
              <IconSparkle className="size-5" />
            </span>
            <p lang="en" className="text-on-surface pt-0.5 text-[17px] leading-snug font-extrabold">
              {title}
            </p>
          </div>
          {model.formula ? <SummaryBlock label={labels.formula} text={model.formula} mono /> : null}
          {model.template ? <SummaryBlock label={labels.template} text={model.template} italic /> : null}
        </div>
      </section>

      <p role="status" className="sr-only">
        {copiedKey ? labels.copied : ''}
      </p>

      {questions.length === 0 ? (
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
                  expanded={expandAll || expandedId === question.id}
                  gloss={gloss}
                  locale={locale}
                  labels={labels}
                  copiedKey={copiedKey}
                  topicLabel={question.topicTitle}
                  onToggle={() => toggleQuestion(question.id)}
                  onCopy={copyAnswer}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SummaryBlock({
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
    <div className="mt-2.5 rounded-[14px] border border-[color-mix(in_oklab,var(--accent)_16%,transparent)] bg-[color-mix(in_oklab,var(--accent)_6%,transparent)] px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-[var(--accent)]">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--accent)]" />
        {label}
      </p>
      <p
        lang="en"
        className={cn(
          'text-on-surface mt-2 text-[13.5px] leading-snug font-semibold',
          mono && 'font-mono font-medium',
          italic && 'italic'
        )}
      >
        {text}
      </p>
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

function UnfoldIcon({ expanded }: { expanded: boolean }) {
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
      {expanded ? (
        <path d="m7 9 5-4 5 4M7 15l5 4 5-4" />
      ) : (
        <path d="m7 5 5 4 5-4M7 19l5-4 5 4" />
      )}
    </svg>
  );
}
