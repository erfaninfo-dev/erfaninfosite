'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { startGuestDuelSessionAction } from '@/app/[locale]/play/duel/actions';
import { MagicBackground } from '@/components/features/games/magic-background';
import { ALL_AVATAR_PRESETS, ProfileAvatar } from '@/components/profile/profile-avatar';
import { IconArrowBack, IconLogin, IconPlay, IconSwords } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

export type GuestGateLabels = {
  back: string;
  title: string;
  subtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  avatarLabel: string;
  continueAction: string;
  orSignIn: string;
  nameTooShort: string;
};

/**
 * Frictionless Guest Quick-Join card for `/[locale]/play/duel` and
 * `/[locale]/play/duel/[code]` — visitors pick a nickname + avatar and jump
 * straight into the duel without a login wall, while still offering 1-tap login.
 */
export function WordBuilderDuelGuestGate({
  locale,
  backPath,
  loginNextHref,
  codeBadge,
  initialName = '',
  initialAvatar = 'm1',
  labels,
}: {
  locale: Locale;
  backPath: '/play' | '/play/duel';
  loginNextHref: string;
  codeBadge?: string;
  initialName?: string;
  initialAvatar?: string;
  labels: GuestGateLabels;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setError(labels.nameTooShort);
      return;
    }
    setError(null);
    setBusy(true);
    const res = await startGuestDuelSessionAction({
      displayName: trimmed,
      avatar,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <MagicBackground className="-mt-8 -mb-[calc(var(--size-bottom-nav)+1rem)] min-h-[100dvh] pt-6 pb-[calc(var(--size-bottom-nav)+2.5rem)] md:-mb-12 md:pb-16">
      <div className="page-gutter mx-auto flex w-full max-w-md flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={localeHref(locale, backPath)}
            aria-label={labels.back}
            className="wb-duel-header-back grid size-10 place-items-center rounded-full text-[#4E2A14] transition-transform hover:scale-105 active:scale-95 dark:text-[#FFF8E1]"
          >
            <IconArrowBack className="size-5" />
          </Link>
          {codeBadge ? (
            <span
              dir="ltr"
              className="wb-duel-rule-pill rounded-full px-3.5 py-1.5 font-mono text-xs font-black tracking-[0.2em]"
            >
              #{codeBadge}
            </span>
          ) : null}
        </div>

        <section className="wb-duel-preview-card relative mt-2 rounded-[30px] p-6 sm:p-7">
          <svg
            aria-hidden="true"
            viewBox="0 0 96 34"
            className="wb-duel-crown"
            fill="currentColor"
          >
            <path d="M27 27 L31 12 L42 19 L48 7 L54 19 L65 12 L69 27 Z" />
            <rect x="75" y="13" width="3.5" height="12" rx="1.75" transform="rotate(35 76.7 19)" />
            <rect x="81" y="21" width="3.5" height="9" rx="1.75" transform="rotate(64 82.7 25.5)" />
          </svg>

          <div className="text-center">
            <div className="wb-duel-cta-purple mx-auto mb-3.5 grid size-15 place-items-center rounded-full">
              <IconSwords className="size-7" />
            </div>
            <h1 className="text-xl font-black text-[#4A2508] sm:text-2xl dark:text-[#FFF8E1]">
              {labels.title}
            </h1>
            <p className="mt-1.5 text-sm font-semibold text-[#6D4C41] dark:text-[#FFECB3]/85">
              {labels.subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <div>
              <label
                htmlFor="guest-duel-name"
                className="mb-1.5 block text-xs font-extrabold text-[#5D4037] dark:text-[#FFECB3]"
              >
                {labels.nameLabel}
              </label>
              <input
                id="guest-duel-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 24))}
                placeholder={labels.namePlaceholder}
                autoFocus
                maxLength={24}
                className="h-12 w-full rounded-2xl border-2 border-white/80 bg-white/95 px-4 text-sm font-bold text-[#4E342E] shadow-xs placeholder:text-[#8D6E63] focus:border-[#FFB300] focus:outline-none dark:border-white/15 dark:bg-[#1B1726] dark:text-[#FFF8E1] dark:placeholder:text-[#FFECB3]/50"
              />
            </div>

            <div>
              <span className="mb-2 block text-xs font-extrabold text-[#5D4037] dark:text-[#FFECB3]">
                {labels.avatarLabel}
              </span>
              <div className="grid max-h-56 grid-cols-5 gap-2 overflow-y-auto p-0.5">
                {ALL_AVATAR_PRESETS.map((preset) => {
                  const selected = avatar === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAvatar(preset.id)}
                      aria-label={preset.label}
                      title={preset.label}
                      aria-pressed={selected}
                      className={cn(
                        'grid h-13 place-items-center rounded-2xl border-2 transition-transform active:scale-95',
                        selected
                          ? 'scale-105 border-[#4E342E] bg-white shadow-sm dark:border-[#FFD54F] dark:bg-white/15'
                          : 'border-transparent bg-white/55 hover:bg-white/80 dark:bg-white/5'
                      )}
                    >
                      <ProfileAvatar avatarId={preset.id} size={40} />
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? (
              <p className="rounded-xl bg-[#FFCDD2]/70 px-3 py-2 text-xs font-bold text-[#B71C1C] dark:bg-[#4A1C1C] dark:text-[#FFCDD2]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="wb-duel-cta-gold relative mt-1 inline-flex min-h-13.5 w-full items-center justify-center gap-2 overflow-hidden rounded-full px-6 text-base font-black text-[#4A2508] transition-all disabled:opacity-60"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 top-1 h-2.5 rounded-full bg-white/40"
              />
              <IconPlay className="size-5" />
              <span>{labels.continueAction}</span>
            </button>
          </form>

          <div className="mt-4 border-t border-[#5D4037]/15 pt-4 text-center dark:border-white/15">
            <Link
              href={`${localeHref(locale, '/login')}?next=${encodeURIComponent(loginNextHref)}`}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#5D4037] underline-offset-4 hover:underline dark:text-[#FFD54F]"
            >
              <IconLogin className="size-4" />
              <span>{labels.orSignIn}</span>
            </Link>
          </div>
        </section>
      </div>
    </MagicBackground>
  );
}
