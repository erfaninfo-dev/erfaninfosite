import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { JellyCountBadge, JellyIconBubble } from '@/components/features/you/jelly-icon-bubble';
import { IconArrowBack, IconChevron, IconPerson } from '@/components/ui/icons';
import { Container } from '@/components/ui/primitives';
import { fetchAccount } from '@/lib/auth/api';
import { getAuthToken } from '@/lib/auth/session';
import { fetchStudentMessagePeers } from '@/lib/auth/you-fetch';
import { NUMBER_LOCALE, isLocale, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/messages';
import { localeHref } from '@/lib/nav';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/you/messages/pick'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)('youMessagesPickTitle'), robots: { index: false } };
}

function formatPeerTime(raw: string | null, locale: Locale): string | null {
  if (!raw?.trim()) return null;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const ms = Date.parse(normalized);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat(NUMBER_LOCALE[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ms));
}

export default async function StudentMessagePeersPage({
  params,
}: PageProps<'/[locale]/you/messages/pick'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

  const token = await getAuthToken();
  if (!token) redirect(localeHref(locale, `/login?next=/${locale}/you/messages/pick`));
  const account = await fetchAccount(token);
  if (account === 'unauthorized' || account === 'unavailable') {
    redirect(localeHref(locale, `/login?next=/${locale}/you/messages/pick`));
  }

  const peers = await fetchStudentMessagePeers(token);

  return (
    <Container size="quiz">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={localeHref(locale, '/you')}
          aria-label={t('back')}
          className="bg-surface-1 text-on-surface-variant grid size-11 shrink-0 place-items-center rounded-full shadow-xs"
        >
          <IconArrowBack className="size-5" />
        </Link>
        <h1 className="text-on-surface text-xl font-extrabold">{t('youMessagesPickTitle')}</h1>
      </div>

      {peers === 'forbidden' || peers === 'failed' ? (
        <p className="text-on-surface-variant py-8 text-center font-semibold">
          {t('errorGeneric')}
        </p>
      ) : peers.length === 0 ? (
        <p className="text-on-surface-variant py-12 text-center font-semibold">
          {t('teacherMessagesEmpty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {peers.map((peer) => {
            const name = peer.displayName?.trim() || t('youSectionMessages');
            const timeLabel = formatPeerTime(peer.lastMessageAt, locale);
            return (
              <li key={peer.teacherUserId}>
                <Link
                  href={localeHref(locale, `/you/messages?peer_teacher_id=${peer.teacherUserId}`)}
                  className="jelly-card flex items-center gap-3.5 rounded-[var(--radius-card)] p-4 no-underline transition-transform active:scale-[0.99]"
                >
                  <JellyIconBubble tone="primary">
                    <IconPerson className="size-5" />
                  </JellyIconBubble>
                  <span className="min-w-0 flex-1">
                    <span className="text-on-surface block truncate font-extrabold">{name}</span>
                    {timeLabel ? (
                      <span
                        className="text-on-surface-variant mt-0.5 block text-xs"
                        dir="ltr"
                      >
                        {timeLabel}
                      </span>
                    ) : null}
                  </span>
                  {peer.unreadCount > 0 ? (
                    <JellyCountBadge
                      label={peer.unreadCount > 99 ? '99+' : String(peer.unreadCount)}
                      tone="error"
                    />
                  ) : null}
                  <IconChevron className="text-on-surface-variant size-5 shrink-0 opacity-70" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
