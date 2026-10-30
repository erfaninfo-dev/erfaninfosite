import Link from 'next/link';

import { Container } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/states';

/**
 * 404.
 *
 * Reached when an item has been deleted from the API — a book, topic or
 * category that no longer appears in its list endpoint. That is the behaviour
 * the definition of done asks for: a deletion becomes a 404 within one
 * revalidation window, rather than serving stale content forever.
 *
 * This file cannot know the locale (Next renders it outside the param scope),
 * so it shows all three languages rather than guessing one. The app's own
 * approved wording is unavailable here for the same reason.
 */
export default function NotFound() {
  return (
    <Container size="prose" className="py-16">
      <EmptyState
        title="This page no longer exists · این صفحه دیگر وجود ندارد · ئەم لاپەڕەیە چیتر بوونی نییە"
        body="It may have been removed, or the address may be wrong."
        action={
          <Link
            href="/en"
            className="inline-flex min-h-[var(--size-button-md)] items-center rounded-[var(--radius-button)] bg-primary px-5 font-bold text-on-primary no-underline"
          >
            Erfan Academy
          </Link>
        }
      />
    </Container>
  );
}
