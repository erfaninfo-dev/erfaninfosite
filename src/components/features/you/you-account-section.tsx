'use client';

import Link from 'next/link';
import { useState } from 'react';

import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { RedeemStudentSheet } from '@/components/features/you/redeem-student-sheet';
import { SectionLabel } from '@/components/features/you/section-label';
import { JellyIconBubble } from '@/components/features/you/jelly-icon-bubble';
import { IconKey, IconLogin, IconPersonAdd, IconSchool } from '@/components/ui/icons';
import { logoutAction } from '@/lib/auth/actions';
import type { Account } from '@/lib/auth/account';
import type { Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

export type YouAccountLabels = {
  sectionAccount: string;
  signIn: string;
  signInSubtitle: string;
  createAccount: string;
  profile: string;
  createStudentCode: string;
  createStudentCodeSubtitle: string;
  redeemStudentCode: string;
  redeemStudentCodeSubtitle: string;
  signOut: string;
  signOutTitle: string;
  signOutBody: string;
  cancel: string;
  redeem: {
    title: string;
    subtitle: string;
    code: string;
    hint: string;
    submit: string;
    required: string;
    invalid: string;
    failed: string;
    close: string;
  };
};

function IconEdit(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 20h4l10-10-4-4L4 16v4Z" />
      <path d="m13 7 4 4" />
    </svg>
  );
}

export function YouAccountSection({
  locale,
  account,
  labels,
}: {
  locale: Locale;
  account: Account | null;
  labels: YouAccountLabels;
}) {
  const [redeemOpen, setRedeemOpen] = useState(false);
  const isTeacherPanel = account?.isTeacher || account?.isAdmin;

  return (
    <section>
      <SectionLabel>{labels.sectionAccount}</SectionLabel>
      {!account ? (
        <div className="jelly-card overflow-hidden rounded-[var(--radius-card)]">
          <Link
            href={localeHref(locale, `/login?next=/${locale}/you`)}
            className="text-on-surface flex min-h-14 items-center gap-3 px-4 py-2 no-underline"
          >
            <JellyIconBubble tone="primary" size={40}>
              <IconLogin className="size-5" />
            </JellyIconBubble>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">{labels.signIn}</span>
              <span className="text-on-surface-variant block text-sm">{labels.signInSubtitle}</span>
            </span>
          </Link>
          <hr className="border-outline-variant/35 m-0 border-0 border-t" />
          <Link
            href={localeHref(locale, `/register?next=/${locale}/you`)}
            className="text-on-surface flex min-h-14 items-center gap-3 px-4 py-2 no-underline"
          >
            <JellyIconBubble tone="secondary" size={40}>
              <IconPersonAdd className="size-5" />
            </JellyIconBubble>
            <span className="font-extrabold">{labels.createAccount}</span>
          </Link>
        </div>
      ) : (
        <div className="jelly-card overflow-hidden rounded-[var(--radius-card)]">
          <Link
            href={localeHref(locale, '/profile')}
            className="text-on-surface flex items-center gap-3.5 px-4 py-3.5 no-underline"
          >
            <ProfileAvatar avatarId={account.avatar} size={48} />
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">{labels.profile}</span>
              <span className="text-on-surface-variant block text-sm leading-snug" dir="ltr">
                {account.displayName !== account.email ? (
                  <>
                    <span className="block">{account.displayName}</span>
                    <span className="block">{account.email}</span>
                  </>
                ) : (
                  account.email
                )}
              </span>
            </span>
            <JellyIconBubble tone="secondary" size={36}>
              <IconEdit className="size-4" />
            </JellyIconBubble>
          </Link>

          {isTeacherPanel ? (
            <>
              <hr className="border-outline-variant/35 m-0 border-0 border-t" />
              <Link
                href={localeHref(locale, '/teacher?tab=students')}
                className="text-on-surface flex min-h-14 items-center gap-3 px-4 py-2 no-underline"
              >
                <JellyIconBubble tone="tertiary" size={40}>
                  <IconKey className="size-5" />
                </JellyIconBubble>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{labels.createStudentCode}</span>
                  <span className="text-on-surface-variant block text-sm leading-snug">
                    {labels.createStudentCodeSubtitle}
                  </span>
                </span>
              </Link>
            </>
          ) : !account.studentAccess ? (
            <>
              <hr className="border-outline-variant/35 m-0 border-0 border-t" />
              <button
                type="button"
                onClick={() => setRedeemOpen(true)}
                className="text-on-surface flex w-full min-h-14 items-center gap-3 px-4 py-2 text-start"
              >
                <JellyIconBubble tone="primary" size={40}>
                  <IconSchool className="size-5" />
                </JellyIconBubble>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{labels.redeemStudentCode}</span>
                  <span className="text-on-surface-variant block text-sm leading-snug">
                    {labels.redeemStudentCodeSubtitle}
                  </span>
                </span>
              </button>
            </>
          ) : null}

          <hr className="border-outline-variant/35 m-0 border-0 border-t" />
          <form action={logoutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="bg-error text-on-error flex w-full min-h-14 items-center gap-3 px-4 py-2 font-extrabold"
            >
              {labels.signOut}
            </button>
          </form>
        </div>
      )}

      {redeemOpen ? (
        <>
          <button
            type="button"
            aria-label={labels.cancel}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setRedeemOpen(false)}
          />
          <RedeemStudentSheet locale={locale} labels={labels.redeem} onClose={() => setRedeemOpen(false)} />
        </>
      ) : null}
    </section>
  );
}
