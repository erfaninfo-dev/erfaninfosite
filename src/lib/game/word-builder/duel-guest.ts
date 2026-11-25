import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

import { fetchAccount } from '@/lib/auth/api';
import { getAuthToken } from '@/lib/auth/session';

const GUEST_COOKIE_NAME = 'ea_wb_guest';
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const ALLOWED_AVATARS = new Set([
  'm1', 'm2', 'm3', 'm4',
  'f1', 'f2', 'f3', 'f4',
  'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12',
]);

export type GuestDuelSession = {
  token: string;
  actorKey: string;
  displayName: string;
  avatar: string;
};

export type DuelActor =
  | {
      kind: 'user';
      token: string;
      actorKey: string;
      userId: number;
      displayName: string;
      avatar: string;
      isGuest: false;
    }
  | {
      kind: 'guest';
      guestToken: string;
      actorKey: string;
      userId: 0;
      displayName: string;
      avatar: string;
      isGuest: true;
    };

export function sanitizeGuestAvatar(raw: string | undefined): string {
  const v = (raw ?? '').trim().toLowerCase();
  return ALLOWED_AVATARS.has(v) ? v : 'm1';
}

export function sanitizeGuestName(raw: string | undefined): string {
  return (raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24);
}

export function guestActorKeyFromToken(token: string): string {
  const hash = createHash('sha256').update(token.toLowerCase()).digest('hex').slice(0, 32);
  return `g:${hash}`;
}

export async function getGuestDuelSession(): Promise<GuestDuelSession | null> {
  const store = await cookies();
  const raw = store.get(GUEST_COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      token?: unknown;
      displayName?: unknown;
      avatar?: unknown;
    };
    const token = typeof parsed.token === 'string' ? parsed.token.trim() : '';
    if (!/^[a-f0-9]{24,64}$/i.test(token)) return null;
    const displayName = sanitizeGuestName(
      typeof parsed.displayName === 'string' ? parsed.displayName : ''
    );
    if (displayName.length < 2) return null;
    const avatar = sanitizeGuestAvatar(typeof parsed.avatar === 'string' ? parsed.avatar : 'm1');
    return {
      token,
      actorKey: guestActorKeyFromToken(token),
      displayName,
      avatar,
    };
  } catch {
    return null;
  }
}

export async function setGuestDuelSession(
  displayNameInput: string,
  avatarInput: string
): Promise<GuestDuelSession | null> {
  const displayName = sanitizeGuestName(displayNameInput);
  if (displayName.length < 2) return null;
  const avatar = sanitizeGuestAvatar(avatarInput);

  // Preserve existing guest token if present so updating nickname keeps duel history.
  const existing = await getGuestDuelSession();
  const token = existing?.token ?? randomBytes(24).toString('hex');

  const payload = Buffer.from(
    JSON.stringify({ token, displayName, avatar }),
    'utf8'
  ).toString('base64url');

  const store = await cookies();
  store.set(GUEST_COOKIE_NAME, payload, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: GUEST_COOKIE_MAX_AGE,
  });

  return {
    token,
    actorKey: guestActorKeyFromToken(token),
    displayName,
    avatar,
  };
}

/**
 * Resolves the active duel player: signed-in user first, then browser guest cookie.
 */
export async function resolveDuelActor(): Promise<DuelActor | null> {
  const authToken = await getAuthToken();
  if (authToken) {
    const accountRes = await fetchAccount(authToken);
    if (accountRes && typeof accountRes === 'object') {
      return {
        kind: 'user',
        token: authToken,
        actorKey: `u:${accountRes.id}`,
        userId: accountRes.id,
        displayName: accountRes.displayName || 'Learner',
        avatar: accountRes.avatar || 'm1',
        isGuest: false,
      };
    }
  }

  const guest = await getGuestDuelSession();
  if (guest) {
    return {
      kind: 'guest',
      guestToken: guest.token,
      actorKey: guest.actorKey,
      userId: 0,
      displayName: guest.displayName,
      avatar: guest.avatar,
      isGuest: true,
    };
  }

  return null;
}
