import type { Route } from 'next';
import Link from 'next/link';

import type { Locale } from '@/lib/i18n/config';

export type HomePanelFabProps = {
  locale: Locale;
  href: Route;
  label: string;
  tooltip: string;
  variant: 'teacher' | 'student';
  badge: number;
};

function GroupsGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function PanelGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  );
}

export function HomePanelFab({ href, label, tooltip, variant, badge }: HomePanelFabProps) {
  const showBadge = badge > 0;
  const badgeLabel = badge > 99 ? '99+' : String(badge);

  return (
    <div className="relative">
      {showBadge ? (
        <span
          className={
            variant === 'teacher'
              ? 'absolute -top-1.5 end-0 z-10 min-w-5 rounded-full bg-[#ffd60a] px-1.5 py-0.5 text-center text-[11px] font-black text-[#2b2100]'
              : 'bg-error text-on-error absolute -top-1.5 end-0 z-10 min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-extrabold'
          }
        >
          {badgeLabel}
        </span>
      ) : null}
      <Link
        href={href}
        title={tooltip}
        className="bg-primary text-on-primary inline-flex min-h-12 items-center gap-2 rounded-full px-4 font-bold text-white no-underline shadow-[var(--shadow-soft)]"
      >
        {variant === 'teacher' ? <GroupsGlyph /> : <PanelGlyph />}
        <span>{label}</span>
      </Link>
    </div>
  );
}
