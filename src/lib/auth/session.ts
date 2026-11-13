import 'server-only';

import { cookies } from 'next/headers';

/**
 * The session is an httpOnly cookie. The token never reaches the browser's
 * JavaScript, and it is never written into the shared data cache.
 */

const TOKEN_COOKIE = 'erfan_token';
const MAX_AGE = 60 * 60 * 24 * 30;

function acceptable(value: string | undefined): value is string {
  return !!value && value.length >= 8 && value.length <= 4000 && !/[\s\u0000-\u001f]/.test(value);
}

export async function getAuthToken(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(TOKEN_COOKIE)?.value;
  return acceptable(value) ? value : null;
}

export async function setAuthToken(token: string): Promise<void> {
  if (!acceptable(token)) return;
  const store = await cookies();
  store.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearAuthToken(): Promise<void> {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
}
