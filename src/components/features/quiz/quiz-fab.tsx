import type { Route } from 'next';
import Link from 'next/link';

import { IconQuiz } from '@/components/ui/icons';

/** The app's quiz button, pinned to the trailing corner above the tab bar. */
export function QuizFab({ href, label }: { href: Route; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="bg-primary text-on-primary shadow-[var(--shadow-soft)] fixed right-4 bottom-24 z-20 grid size-14 place-items-center rounded-full"
    >
      <IconQuiz className="size-6" />
    </Link>
  );
}
