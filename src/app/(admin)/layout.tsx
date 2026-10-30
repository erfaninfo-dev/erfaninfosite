import type { Metadata } from 'next';

import '../globals.css';

/**
 * A second root layout, for pages that are not part of the localised site.
 *
 * `/status` is operational, English-only and not indexed, so it does not
 * belong under `[locale]` — and a route group lets it own `<html>` without
 * disturbing the locale layout.
 */
export const metadata: Metadata = {
  title: 'Status',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
