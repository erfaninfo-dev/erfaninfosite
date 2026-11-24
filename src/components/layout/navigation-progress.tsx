'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Global route-transition loading indicator:
 * - Immediately starts a slim top progress bar + clean spinning circle when any
 *   internal Next.js link is clicked (Home -> Series -> Books -> Cambridge -> Tests, etc.).
 * - Automatically clears the instant the new route commits (zero `setState` in effect,
 *   zero soft-404 side effects from Suspense-wrapping page trees).
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  // Holds the routeKey from which navigation started; once `routeKey` changes,
  // `isNavigating` flips to `false` automatically during render.
  const [navFromKey, setNavFromKey] = useState<string | null>(null);
  const routeKeyRef = useRef(routeKey);

  useEffect(() => {
    routeKeyRef.current = routeKey;
  }, [routeKey]);

  const isNavigating = navFromKey !== null && navFromKey === routeKey;

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;

      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        return;
      }

      let dest: URL;
      try {
        dest = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (dest.origin !== window.location.origin) return;

      // Ignore links that point to the exact same pathname + query (e.g. hash-only jump).
      const currentUrl = new URL(window.location.href);
      if (dest.pathname === currentUrl.pathname && dest.search === currentUrl.search) {
        return;
      }

      // Skip direct static file / API downloads served by Apache.
      if (
        dest.pathname.startsWith('/apk/') ||
        dest.pathname.startsWith('/api/') ||
        dest.pathname.startsWith('/wordsapi/')
      ) {
        return;
      }

      setNavFromKey(routeKeyRef.current);
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  // Safety auto-clear if a navigation is cancelled or fails to commit within 15s.
  useEffect(() => {
    if (!isNavigating) return;
    const id = window.setTimeout(() => {
      setNavFromKey(null);
    }, 15_000);
    return () => window.clearTimeout(id);
  }, [isNavigating]);

  if (!isNavigating) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        pointerEvents: 'none',
      }}
    >
      {/* Slim animated top progress bar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          overflow: 'hidden',
          backgroundColor: 'rgba(7, 127, 131, 0.14)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '42%',
            borderRadius: '9999px',
            background: 'linear-gradient(90deg, #077F83 0%, #2DD4BF 50%, #077F83 100%)',
            animation: 'nav-bar-slide 1.15s ease-in-out infinite',
          }}
        />
      </div>

      {/* Centered floating loading circle (appears smoothly after 120ms so instant loads never flicker) */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'grid',
          placeItems: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.16)',
          border: '1px solid rgba(148, 163, 184, 0.35)',
          backdropFilter: 'blur(6px)',
          opacity: 0,
          animation: 'nav-fade-in 180ms ease-out 120ms forwards',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '9999px',
            border: '3px solid rgba(7, 127, 131, 0.2)',
            borderTopColor: '#077F83',
            animation: 'nav-spin 0.7s linear infinite',
          }}
        />
      </div>
    </div>
  );
}
