'use client';

import { useState } from 'react';

import { ExternalLink } from '@/components/ui/external-link';
import { IconBook, IconPdf } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { formatClient } from '@/lib/i18n/client-format';
import type { GlossLang, Locale } from '@/lib/i18n/config';

/**
 * Study material for a grammar topic, matching the app's Learn sheet.
 *
 * In the app, Learn is **only** the PDF lessons: you pick a language and get
 * the parts available in it. It shows no question count and no quiz length —
 * practising is what the Quiz action is for, and mixing the two was the bug
 * this replaces.
 */

export type StudyPart = {
  id: number;
  title: string;
  /** Persian PDF — the API's `pdf_url`. */
  fa: string;
  /** Kurdish PDF — the API's `pdf_url_kur`. */
  ckb: string;
};

export type StudyLabels = {
  chooseLevel: string;
  study: string;
  partLabel: string;
  view: string;
  unavailable: string;
  languages: Array<{ id: GlossLang; label: string }>;
  /** Raw ICU, e.g. "Part {n}". */
  partTemplate: string;
};

export function StudySheet({
  parts,
  labels,
  locale,
  initialLanguage,
}: {
  parts: StudyPart[];
  labels: StudyLabels;
  locale: Locale;
  initialLanguage: GlossLang;
}) {
  const [language, setLanguage] = useState<GlossLang>(initialLanguage);

  const available = parts.filter((part) => part[language].length > 0);

  /*
   * Language-picker chrome is translated; keep it RTL under fa/ckb while the
   * surrounding grammar page (and the English PDF title list) stays LTR.
   */
  const uiDir = locale === 'en' ? 'ltr' : 'rtl';

  return (
    <div>
      <div dir={uiDir} lang={locale === 'en' ? undefined : locale}>
        <p className="text-on-surface-variant mb-4 text-start">{labels.chooseLevel}</p>

        <div
          role="group"
          aria-label={labels.chooseLevel}
          className="border-outline-strong bg-surface-1 mb-5 flex overflow-hidden rounded-2xl border"
        >
          {labels.languages.map((option, index) => {
            const active = language === option.id;
            // How many parts exist in that language, so a reader can see before
            // switching that one of them is empty.
            const count = parts.filter((part) => part[option.id].length > 0).length;

            return (
              <button
                key={option.id}
                type="button"
                lang={option.id}
                onClick={() => setLanguage(option.id)}
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
                <span className="truncate">{option.label}</span>
                <span className="text-[length:var(--text-caption)] opacity-70">
                  {formatClient('{n, number}', locale, { n: count })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {available.length === 0 ? (
        <p className="border-outline-variant text-on-surface-variant rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-center">
          {labels.unavailable}
        </p>
      ) : (
        <ul className="divide-outline-variant/50 border-outline-variant/60 bg-surface-1 divide-y overflow-hidden rounded-[var(--radius-card)] border">
          {available.map((part, index) => (
            <li key={part.id}>
              <ExternalLink
                href={part[language]}
                className="hover:bg-surface-2 flex min-h-14 items-center gap-3 px-5 py-4"
              >
                <IconPdf className="text-primary size-5 shrink-0" />
                <span className="text-on-surface min-w-0 flex-1">
                  {part.title ? (
                    <bdi lang="en">{part.title}</bdi>
                  ) : (
                    formatClient(labels.partTemplate, locale, { n: index + 1 })
                  )}
                </span>
                <span className="text-on-surface-variant text-[length:var(--text-caption)]">
                  {labels.view}
                </span>
              </ExternalLink>
            </li>
          ))}
        </ul>
      )}

      {available[0] ? (
        <ExternalLink
          href={available[0][language]}
          className="bg-primary text-on-primary mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 font-bold no-underline"
        >
          <IconBook className="size-5" />
          {labels.study}
        </ExternalLink>
      ) : null}
    </div>
  );
}
