import Link from 'next/link';
import type { Route } from 'next';

import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

export function PanelTabs({
  locale,
  basePath,
  tab,
  tabs,
  defaultTab,
}: {
  locale: Locale;
  basePath: string;
  tab: string;
  tabs: readonly { id: string; label: string }[];
  defaultTab: string;
}) {
  return (
    <div
      className="border-outline-variant/60 mb-5 flex gap-1 overflow-x-auto border-b pb-px"
      role="tablist"
    >
      {tabs.map((item) => {
        const active = item.id === tab;
        const href = localeHref(
          locale,
          item.id === defaultTab ? basePath : `${basePath}?tab=${item.id}`
        );
        return (
          <Link
            key={item.id}
            href={href as Route}
            role="tab"
            aria-selected={active}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-bold no-underline',
              active
                ? 'border-primary text-primary'
                : 'text-on-surface-variant border-transparent'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
