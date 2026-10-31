'use client';

import { IconChevron, IconStar } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * One word in a list.
 *
 * A trigger, not an accordion: tapping it opens the detail sheet, which is what
 * the app does. The row keeps a fixed height whatever happens, which is what
 * lets the list be virtualised without rows jumping as others expand.
 *
 * The browser receives a flat, pre-resolved shape rather than the full `Word`
 * object: the gloss chain and the mojibake guard both run on the server, so the
 * client ships no language logic and no unused translations.
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
  /** The two languages the reader did not pick. */
  others: Array<{ lang: 'en' | 'fa' | 'ckb'; text: string }>;
};

export function WordRow({
  data,
  labels,
  glossLang,
  onOpen,
}: {
  data: WordRowData;
  labels: { important: string };
  glossLang: 'fa' | 'ckb';
  onOpen: (word: WordRowData) => void;
}) {
  return (
    <div className="border-outline-variant/50 border-b last:border-b-0">
      <button
        type="button"
        onClick={() => onOpen(data)}
        // A stable hook for the virtualisation test, which has to count rows
        // without relying on how they happen to be styled.
        data-word-row=""
        className={cn(
          'hover:bg-surface-2 dark:hover:bg-surface-3 flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start',
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

        <IconChevron className="text-on-surface-variant size-4 shrink-0" />
      </button>
    </div>
  );
}
