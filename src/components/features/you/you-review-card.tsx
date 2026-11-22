'use client';

import { useSyncExternalStore } from 'react';
import type { Route } from 'next';

import { YouNavCard } from '@/components/features/you/you-nav-card';
import { IconLoop } from '@/components/ui/icons';
import { getDueSrsCards, readSrsCards, subscribeSrs } from '@/lib/srs/srs-store';

function getClientDueCount(): number {
  return getDueSrsCards(readSrsCards()).length;
}

function getServerDueCount(): number {
  return 0;
}

/**
 * Review navigation card with live due-today badge matching Flutter's
 * `_YouReviewInkCard` (reads browser SM-2 queue via `useSyncExternalStore`).
 */
export function YouReviewCard({
  href,
  title,
  subtitle,
}: {
  href: Route;
  title: string;
  subtitle: string;
}) {
  const dueCount = useSyncExternalStore(subscribeSrs, getClientDueCount, getServerDueCount);
  const badge = dueCount > 0 ? (dueCount > 99 ? '99+' : String(dueCount)) : undefined;

  return (
    <YouNavCard
      href={href}
      title={title}
      subtitle={subtitle}
      tone="primary"
      icon={<IconLoop className="size-5" />}
      badge={badge}
      badgeTone="error"
    />
  );
}
