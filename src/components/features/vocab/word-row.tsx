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
    <div className="border-outline-variant/50 border-b last:border-b-0">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        aria-expanded={hasDetail ? open : undefined}
        disabled={!hasDetail}
        className={cn(
          'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start',
          hasDetail
            ? 'hover:bg-surface-2 dark:hover:bg-surface-3 cursor-pointer'
            : 'cursor-default',
          'transition-colors duration-[var(--duration-fast)]'
        )}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          {/* The headword is always English: isolate it inside RTL text. */}
          <bdi className="text-on-surface font-semibold" lang="en">
            {data.word}
          </bdi>
          {data.type ? (
            <span
              className="text-on-surface-variant text-[length:var(--text-caption)]"
              lang="en"
            >
              {data.type}
            </span>
          ) : null}
        </span>

        <bdi lang={glossLang} className="text-on-surface-variant min-w-0 flex-1 text-end">
          {data.meaning}
        </bdi>

        {data.important ? (
          <IconStar
            className="text-tertiary size-4 shrink-0 fill-current"
            title={labels.important}
          />
        ) : null}

        {hasDetail ? (
          <IconChevron
            className={cn(
              'text-on-surface-variant size-4 shrink-0 transition-transform duration-[var(--duration-fast)]',
              open && 'rotate-90'
            )}
          />
        ) : null}
      </button>

      {open ? (
        <div className="bg-surface-2/60 dark:bg-surface-3/50 space-y-3 px-4 pb-4">
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
              <dt className="text-on-surface-variant text-[length:var(--text-caption)] font-semibold">
                {labels.otherLanguages}
              </dt>
              {data.others.map((other) => (
                <dd key={other.lang} className="flex gap-2">
                  <span className="text-on-surface-variant text-[length:var(--text-caption)] uppercase">
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
