import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * A link that leaves the site — a PDF on the API host, an APK download.
 *
 * A plain `<a>`, not `next/link`: these are not app routes, so client-side
 * navigation does not apply. `rel="noopener noreferrer"` on every one, and the
 * href is validated against an allowlist of hosts so a changed API field can
 * never turn into a link to somewhere else.
 */

const ALLOWED_HOSTS = new Set(['erfaninfo.com', 'www.erfaninfo.com']);

/** Returns the href if it is a safe, allowlisted https URL, else null. */
export function safeExternalUrl(url: string): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (!ALLOWED_HOSTS.has(parsed.hostname)) return null;
  return parsed.toString();
}

export function ExternalLink({
  href,
  className,
  children,
  ...rest
}: {
  href: string;
  className?: string;
  children: ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>) {
  const safe = safeExternalUrl(href);
  if (!safe) return null;

  return (
    <a
      {...rest}
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('no-underline', className)}
    >
      {children}
    </a>
  );
}
