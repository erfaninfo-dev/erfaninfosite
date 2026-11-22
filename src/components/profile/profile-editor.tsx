'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { PROFILE_PRESETS, ProfileAvatar } from '@/components/profile/profile-avatar';
import { IconArrowBack, IconPhoto } from '@/components/ui/icons';
import type { Account } from '@/lib/auth/account';
import { updateProfileAction, uploadProfilePhotoAction } from '@/lib/auth/panel-actions';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n/config';
import { localeHref } from '@/lib/nav';

export type ProfileEditorLabels = {
  title: string;
  back: string;
  gallery: string;
  displayName: string;
  displayNameHint: string;
  bio: string;
  bioHint: string;
  presetAvatars: string;
  boyAvatars: string;
  girlAvatars: string;
  presetNames: Record<string, string>;
  save: string;
  saved: string;
  saveFailed: string;
  photoUpdated: string;
  uploadFailed: string;
  unsavedTitle: string;
  unsavedBody: string;
  discardStay: string;
  discardLeave: string;
};

/** Square-crop and compress a chosen image to <= 512x512 JPEG (matching Flutter `profile_screen.dart`). */
async function compressImageToSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = Math.floor((bitmap.width - side) / 2);
    const sy = Math.floor((bitmap.height - side) / 2);
    const target = Math.min(512, side);

    const canvas = document.createElement('canvas');
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    return blob ?? file;
  } finally {
    bitmap.close();
  }
}

export function ProfileEditor({
  locale,
  account,
  labels,
}: {
  locale: Locale;
  account: Account;
  labels: ProfileEditorLabels;
}) {
  const router = useRouter();
  const initialName = account.displayName === account.email ? '' : account.displayName;
  const [savedName, setSavedName] = useState(initialName);
  const [savedBio, setSavedBio] = useState(account.bio);
  const [savedAvatar, setSavedAvatar] = useState(account.avatar || 'm1');

  const [displayName, setDisplayName] = useState(initialName);
  const [bio, setBio] = useState(account.bio);
  const [avatarId, setAvatarId] = useState(account.avatar || 'm1');
  const [photoNonce, setPhotoNonce] = useState(0);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasUnsaved =
    displayName.trim() !== savedName.trim() ||
    bio.trim() !== savedBio.trim() ||
    avatarId !== savedAvatar;

  const boys = PROFILE_PRESETS.filter((p) => p.group === 'boy');
  const girls = PROFILE_PRESETS.filter((p) => p.group === 'girl');

  function handleBack() {
    if (saving || uploading) return;
    if (hasUnsaved) {
      setConfirmDiscard(true);
      return;
    }
    router.push(localeHref(locale, '/you'));
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setStatus(null);
    try {
      const jpegBlob = await compressImageToSquareJpeg(file);
      const fd = new FormData();
      fd.append('photo', jpegBlob, 'photo.jpg');
      const res = await uploadProfilePhotoAction(fd);
      if (!res.ok) {
        setStatus({ tone: 'error', text: labels.uploadFailed });
        return;
      }
      const nextAvatar = res.account?.avatar || 'custom';
      setAvatarId(nextAvatar);
      setSavedAvatar(nextAvatar);
      setPhotoNonce(Date.now());
      setStatus({ tone: 'ok', text: labels.photoUpdated });
      router.refresh();
    } catch {
      setStatus({ tone: 'error', text: labels.uploadFailed });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (saving || uploading) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await updateProfileAction({
        displayName,
        bio,
        avatar: avatarId,
      });
      if (!res.ok) {
        setStatus({ tone: 'error', text: labels.saveFailed });
        return;
      }
      setSavedName(displayName.trim());
      setSavedBio(bio.trim());
      setSavedAvatar(avatarId);
      setStatus({ tone: 'ok', text: labels.saved });
      router.refresh();
    } catch {
      setStatus({ tone: 'error', text: labels.saveFailed });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5 pb-24">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label={labels.back}
          className="bg-surface-1 hover:bg-surface-2 text-on-surface-variant grid size-11 shrink-0 cursor-pointer place-items-center rounded-full shadow-xs transition-colors"
        >
          <IconArrowBack className="size-5" />
        </button>
        <h1 className="text-on-surface text-xl font-extrabold">{labels.title}</h1>
      </div>

      {status ? (
        <p
          role={status.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'rounded-2xl px-4 py-3 text-sm font-bold',
            status.tone === 'ok'
              ? 'bg-correct-container text-on-correct-container'
              : 'bg-error-container text-on-error-container'
          )}
        >
          {status.text}
        </p>
      ) : null}

      <div className="jelly-card flex flex-col items-stretch rounded-[var(--radius-card)] p-5">
        <div className="relative mx-auto">
          <ProfileAvatar
            key={`${avatarId}-${photoNonce}`}
            avatarId={avatarId}
            userId={account.id}
            size={96}
            showBorder
            cacheBust={photoNonce || undefined}
          />
          {uploading ? (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-xs font-bold text-white">
              ...
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex justify-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
          />
          <button
            type="button"
            disabled={uploading || saving}
            onClick={() => fileInputRef.current?.click()}
            className="border-outline-strong text-on-surface hover:bg-surface-2 inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold disabled:opacity-50"
          >
            <IconPhoto className="size-4" />
            <span>{labels.gallery}</span>
          </button>
        </div>

        <p className="text-on-surface-variant mt-2.5 text-center text-sm" dir="ltr">
          {account.email}
        </p>

        <div className="mt-5 flex flex-col gap-3.5">
          <label className="text-on-surface flex flex-col gap-1.5 text-sm font-bold">
            {labels.displayName}
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              placeholder={labels.displayNameHint}
              className="bg-surface-1/85 border-outline-variant/80 text-on-surface placeholder:text-on-surface-variant focus:border-primary h-12 w-full rounded-[14px] border px-4 outline-none"
            />
          </label>

          <label className="text-on-surface flex flex-col gap-1.5 text-sm font-bold">
            <span className="flex items-center justify-between gap-2">
              <span>{labels.bio}</span>
              <span className="text-on-surface-variant text-xs font-medium tabular-nums">
                {bio.length}/160
              </span>
            </span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder={labels.bioHint}
              className="bg-surface-1/85 border-outline-variant/80 text-on-surface placeholder:text-on-surface-variant focus:border-primary w-full resize-none rounded-[14px] border px-4 py-3 outline-none"
            />
          </label>
        </div>
      </div>

      <p className="text-on-surface-variant text-center text-sm font-bold">
        {labels.presetAvatars}
      </p>

      <section>
        <h2 className="text-on-surface-variant mb-3 text-sm font-extrabold">{labels.boyAvatars}</h2>
        <div className="grid grid-cols-4 gap-3">
          {boys.map((preset) => {
            const selected = avatarId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setAvatarId(preset.id)}
                className={cn(
                  'jelly-card flex flex-col items-center gap-2 rounded-2xl p-3 transition-transform active:scale-95',
                  selected && 'ring-primary ring-2'
                )}
              >
                <ProfileAvatar avatarId={preset.id} size={52} />
                <span className="text-on-surface text-xs font-bold">
                  {labels.presetNames[preset.id] ?? preset.id}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-on-surface-variant mb-3 text-sm font-extrabold">{labels.girlAvatars}</h2>
        <div className="grid grid-cols-4 gap-3">
          {girls.map((preset) => {
            const selected = avatarId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setAvatarId(preset.id)}
                className={cn(
                  'jelly-card flex flex-col items-center gap-2 rounded-2xl p-3 transition-transform active:scale-95',
                  selected && 'ring-primary ring-2'
                )}
              >
                <ProfileAvatar avatarId={preset.id} size={52} />
                <span className="text-on-surface text-xs font-bold">
                  {labels.presetNames[preset.id] ?? preset.id}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sticky save footer matching Flutter's bottom Material bar */}
      <div className="bg-surface/95 border-outline-variant/50 sticky bottom-[calc(var(--size-bottom-nav)+0.5rem)] z-20 -mx-2 rounded-2xl border p-3 backdrop-blur md:bottom-4">
        <button
          type="submit"
          disabled={saving || uploading}
          className="bg-primary text-on-primary min-h-13 w-full rounded-full font-extrabold shadow-md disabled:opacity-60"
        >
          {saving ? '...' : labels.save}
        </button>
      </div>

      {confirmDiscard ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
          onClick={() => setConfirmDiscard(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="border-outline-variant/60 bg-surface-1 w-full max-w-sm rounded-[28px] border p-6 shadow-[var(--shadow-overlay)]"
          >
            <h2 className="text-on-surface text-lg font-black">{labels.unsavedTitle}</h2>
            <p className="text-on-surface-variant mt-2 text-sm">{labels.unsavedBody}</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDiscard(false)}
                className="text-on-surface-variant min-h-11 rounded-full px-4 font-bold"
              >
                {labels.discardStay}
              </button>
              <button
                type="button"
                onClick={() => router.push(localeHref(locale, '/you'))}
                className="bg-primary text-on-primary min-h-11 rounded-full px-5 font-extrabold"
              >
                {labels.discardLeave}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
