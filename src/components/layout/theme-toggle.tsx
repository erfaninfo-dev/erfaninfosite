'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { IconMoon, IconSun } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { setPreferenceCookie } from '@/lib/cookies';
import { THEME_COOKIE } from '@/lib/i18n/config';

type Theme = 'light' | 'dark' | 'system';

/**
 * Light/dark toggle.
 *
 * The default is the system preference; an explicit choice overrides it and is
 * persisted in a cookie. The inline script in the layout applies the theme to
 * `<html data-theme>` before first paint, so there is no flash of the wrong
 * one — and that attribute, not component state, is the source of truth. The
 * component subscribes to it rather than keeping a second copy, which also
 * avoids a setState inside an effect and the cascading render it causes.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** On the server the applied theme is unknowable; the script settles it. */
function getServerSnapshot(): 'light' | 'dark' {
  return 'light';
}

/** Apply light, dark, or the system preference, and tell every toggle. */
export function applyTheme(next: Theme) {
  const resolved =
    next === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : next;
  document.documentElement.dataset.theme = resolved;
  if (next === 'system') {
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0`;
  } else {
    setPreferenceCookie(THEME_COOKIE, next);
  }
  for (const listener of listeners) listener();
}

export function ThemeToggle({ labels }: { labels: Record<string, string> }) {
  const resolved = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    applyTheme(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved]);

  const isDark = resolved === 'dark';
  const label = isDark ? labels.lightMode : labels.darkMode;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-11 items-center justify-center rounded-[var(--radius-button)]',
        'text-on-surface-variant hover:bg-surface-3 hover:text-on-surface',
        'transition-colors duration-[var(--duration-fast)]'
      )}
    >
      {isDark ? <IconSun className="size-5" /> : <IconMoon className="size-5" />}
    </button>
  );
}
