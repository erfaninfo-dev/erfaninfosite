/**
 * Writing a reader preference cookie from the browser.
 *
 * Kept out of components so the DOM write is a plain function call rather than
 * a property assignment inside a component body, and so the attributes are set
 * the same way everywhere: a year, site-wide, and `SameSite=Lax`.
 *
 * These are preferences only — language and theme. No session or auth value is
 * ever written from the client; Phase 2's token will be an httpOnly cookie set
 * by the server.
 */
export function setPreferenceCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax${secure}`;
}
