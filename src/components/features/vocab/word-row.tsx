'use client';

import { useState } from 'react';

import { IconChevron, IconStar } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * One word in a list.
 *
 * The browser receives a flat, pre-resolved shape rather than the full
 * `Word` object: the gloss chain and the mojibake guard both run on the
 * server, so the client ships no language logic and no unused translations.
 */
export type WordRowData = {
  id: number;
  word: string;
  type: string;
  important: boolean;
  /** Already resolved to the reader's gloss language. */
  meaning: string;
  example: string;
  /** English example, shown when it differs from the gloss example. */
  exampleEn: string;
  /** The two languages the reader did not pick, for the expanded view. */
  others: Array<{ lang: 'en' | 'fa' | 'ckb'; text: string }>;
};

export function WordRow({
  data,
  labels,
  glossLang,
}: {
  data: WordRowData;
  labels: { important: string; otherLanguages: string };
  glossLang: 'fa' | 'ckb';
}) {
  const [open, setOpen] = useState(false);
  const hasDetail =
    data.example.length > 0 || data.exampleEn.length > 0 || data.others.length > 0;

  return (
    <div className="border-b border-outline-variant/50 last:border-b-0">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        aria-expanded={hasDetail ? open : undefined}
        disabled={!hasDetail}
        className={cn(
          'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start',
          hasDetail
            ? 'cursor-pointer hover:bg-surface-2 dark:hover:bg-surface-3'
            : 'cursor-default',
          'transition-colors duration-[var(--duration-fast)]'
        )}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          {/* The headword is always English: isolate it inside RTL text. */}
          <bdi className="font-semibold text-on-surface" lang="en">
            {data.word}
          </bdi>
          {data.type ? (
            <span className="text-[length:var(--text-caption)] text-on-surface-variant" lang="en">
              {data.type}
            </span>
          ) : null}
        </span>

        <bdi
          lang={glossLang}
          className="min-w-0 flex-1 text-end text-on-surface-variant"
        >
          {data.meaning}
        </bdi>

        {data.important ? (
          <IconStar
            className="size-4 shrink-0 fill-current text-tertiary"
            title={labels.important}
          />
        ) : null}

        {hasDetail ? (
          <IconChevron
            className={cn(
              'size-4 shrink-0 text-on-surface-variant transition-transform duration-[var(--duration-fast)]',
              open && 'rotate-90'
            )}
          />
        ) : null}
      </button>

      {open ? (
        <div className="space-y-3 bg-surface-2/60 px-4 pb-4 dark:bg-surface-3/50">
          {data.exampleEn ? (
            <p lang="en" dir="ltr" className="text-on-surface">
              {data.exampleEn}
            </p>
          ) : null}
          {data.example && data.example !== data.exampleEn ? (
            <p lang={glossLang} className="text-on-surface-variant">
              {data.example}
            </p>
          ) : null}

          {data.others.length > 0 ? (
            <dl className="space-y-1">
              <dt className="text-[length:var(--text-caption)] font-semibold text-on-surface-variant">
                {labels.otherLanguages}
              </dt>
              {data.others.map((other) => (
                <dd key={other.lang} className="flex gap-2">
                  <span className="text-[length:var(--text-caption)] text-on-surface-variant uppercase">
                    {other.lang}
                  </span>
                  <bdi lang={other.lang} dir={other.lang === 'en' ? 'ltr' : 'rtl'}>
                    {other.text}
                  </bdi>
                </dd>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
