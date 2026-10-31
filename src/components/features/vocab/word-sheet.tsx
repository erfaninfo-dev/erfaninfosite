'use client';

import type { WordRowData } from '@/components/features/vocab/word-row';
import { Badge } from '@/components/ui/primitives';
import { IconClose, IconStar } from '@/components/ui/icons';
import { Sheet } from '@/components/ui/sheet';

/**
 * A word's detail, opened as a sheet from the list — the app's behaviour.
 *
 * Tapping a word there opens a bottom sheet rather than expanding the row, so
 * the list keeps its place and its scroll position. That matters more here than
 * in the app: the list is virtualised, and a row that grows mid-scroll makes
 * every row below it jump.
 *
 * One sheet serves the whole list rather than one per row, so a 1,900-row list
 * still has exactly one dialog in the DOM.
 */

export type WordSheetLabels = {
  englishMeaning: string;
  example: string;
  important: string;
  close: string;
  languageName: Record<'en' | 'fa' | 'ckb', string>;
};

export function WordSheet({
  word,
  glossLang,
  labels,
  onClose,
}: {
  word: WordRowData | null;
  glossLang: 'fa' | 'ckb';
  labels: WordSheetLabels;
  onClose: () => void;
}) {
  return (
    <Sheet open={word !== null} onClose={onClose} label={word?.word ?? ''}>
      {word ? (
        <div className="p-6 pt-2 sm:pt-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {/*
                `inline-block`, not `block`: an LTR block in an RTL page aligns
                its own text left, which would strand the headword away from
                the start of the line. Inline-block keeps the word at the
                reader's start edge while `dir` still orders it correctly.
              */}
              <bdi
                lang="en"
                dir="ltr"
                className="text-on-surface inline-block text-[length:var(--text-h2)] font-bold"
              >
                {word.word}
              </bdi>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {word.type ? (
                  <Badge>
                    <bdi lang="en">{word.type}</bdi>
                  </Badge>
                ) : null}
                {word.important ? (
                  <Badge tone="new">
                    <IconStar className="me-1 size-3 fill-current" />
                    {labels.important}
                  </Badge>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={labels.close}
              className="text-on-surface-variant hover:bg-surface-2 -me-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full"
            >
              <IconClose className="size-5" />
            </button>
          </div>

          <dl className="space-y-4">
            {/* The reader's own language first — it is what they came for. */}
            {word.meaning ? (
              <Field label={labels.languageName[glossLang]} dir="rtl">
                <span lang={glossLang} className="text-on-surface">
                  {word.meaning}
                </span>
              </Field>
            ) : null}

            {word.others.map((other) => (
              <Field
                key={other.lang}
                label={labels.languageName[other.lang]}
                dir={other.lang === 'en' ? 'ltr' : 'rtl'}
              >
                <span lang={other.lang} className="text-on-surface-variant">
                  {other.text}
                </span>
              </Field>
            ))}

            {word.exampleEn ? (
              <Field label={labels.example} dir="ltr">
                <span lang="en" className="text-on-surface">
                  {word.exampleEn}
                </span>
              </Field>
            ) : null}

            {word.example && word.example !== word.exampleEn ? (
              <Field
                label={`${labels.example} — ${labels.languageName[glossLang]}`}
                dir="rtl"
              >
                <span lang={glossLang} className="text-on-surface-variant">
                  {word.example}
                </span>
              </Field>
            ) : null}
          </dl>
        </div>
      ) : null}
    </Sheet>
  );
}

/**
 * One labelled meaning or example.
 *
 * The direction belongs on the value, not the label: an English meaning reads
 * left-to-right even on a Persian page, and a Persian one right-to-left on an
 * English page. The label stays in the page's own direction, so the column of
 * labels lines up however the values are set.
 */
function Field({
  label,
  dir,
  children,
}: {
  label: string;
  dir: 'ltr' | 'rtl';
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-on-surface-variant mb-0.5 text-[length:var(--text-caption)] font-semibold">
        {label}
      </dt>
      <dd dir={dir} className="text-start">
        {children}
      </dd>
    </div>
  );
}
