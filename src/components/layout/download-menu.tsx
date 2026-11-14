'use client';

import { useEffect, useRef, useState } from 'react';

import { IconAndroid, IconDownload, IconWindows } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * Header download control: one tap opens Android / Windows (labels always English).
 */
export function DownloadMenu({
  androidUrl,
  windowsUrl,
  label,
}: {
  androidUrl: string;
  windowsUrl: string;
  /** Accessible name for the trigger (may be localized). */
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const platforms = [
    { id: 'android' as const, name: 'Android', url: androidUrl, icon: IconAndroid },
    { id: 'windows' as const, name: 'Windows', url: windowsUrl, icon: IconWindows },
  ].filter((item) => item.url.length > 0);

  if (platforms.length === 0) return null;

  return (
    /* LTR positioning so the menu stays centred under the icon in every locale. */
    <div ref={rootRef} className="relative" dir="ltr">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        title={label}
        className={cn(
          'text-on-surface-variant hover:bg-surface-2 hover:text-on-surface',
          'inline-flex size-11 items-center justify-center rounded-full',
          'transition-colors duration-[var(--duration-fast)]'
        )}
      >
        <IconDownload className="size-5" />
      </button>

      {open ? (
          <div
            role="menu"
            className={cn(
              'absolute top-full left-1/2 z-50 mt-1.5 w-36 -translate-x-1/2',
              'border-outline-variant bg-surface-1 rounded-xl border p-1',
              'dark:bg-surface-3 shadow-[var(--shadow-soft)]'
            )}
          >
            {platforms.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.id}
                  role="menuitem"
                  href={item.url}
                  lang="en"
                  download
                  onClick={() => setOpen(false)}
                  className={cn(
                    'text-on-surface flex min-h-9 items-center gap-1.5 rounded-lg',
                    'px-2 py-1.5 text-sm font-medium no-underline hover:bg-surface-3'
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.name}</span>
                </a>
              );
            })}
          </div>
      ) : null}
    </div>
  );
}