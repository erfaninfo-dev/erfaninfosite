'use client';

import { useState } from 'react';

import { cn } from '@/lib/cn';

export const PROFILE_PRESETS: ReadonlyArray<{
  id: string;
  group: 'boy' | 'girl';
  bg: string;
  fg: string;
  symbol: string;
}> = [
  { id: 'm1', group: 'boy', bg: '#2563EB', fg: '#ffffff', symbol: '◆' },
  { id: 'm2', group: 'boy', bg: '#4F46E5', fg: '#ffffff', symbol: '◆' },
  { id: 'm3', group: 'boy', bg: '#0D9488', fg: '#ffffff', symbol: '◆' },
  { id: 'm4', group: 'boy', bg: '#0891B2', fg: '#ffffff', symbol: '◆' },
  { id: 'f1', group: 'girl', bg: '#DB2777', fg: '#ffffff', symbol: '★' },
  { id: 'f2', group: 'girl', bg: '#E11D48', fg: '#ffffff', symbol: '★' },
  { id: 'f3', group: 'girl', bg: '#9333EA', fg: '#ffffff', symbol: '★' },
  { id: 'f4', group: 'girl', bg: '#C026D3', fg: '#ffffff', symbol: '★' },
];

const PRESETS_BY_ID = Object.fromEntries(PROFILE_PRESETS.map((p) => [p.id, p]));
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || 'https://erfaninfo.com/wordsapi';

export function ProfileAvatar({
  avatarId,
  userId,
  size = 48,
  showBorder = false,
  cacheBust,
  className,
}: {
  avatarId: string;
  userId?: number | null;
  size?: number;
  showBorder?: boolean;
  cacheBust?: number;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const key = avatarId.trim() || 'm1';
  const preset = PRESETS_BY_ID[key] ?? PROFILE_PRESETS[0]!;
  const isPhoto =
    (key === 'photo' || key === 'custom') &&
    typeof userId === 'number' &&
    userId > 0 &&
    !imgFailed;

  if (isPhoto) {
    const qs = cacheBust ? `&v=${cacheBust}` : '';
    const src = `${API_BASE}/profile_photo.php?user_id=${userId}${qs}`;
    return (
      <span
        className={cn(
          'inline-block shrink-0 overflow-hidden rounded-full bg-surface-2',
          showBorder && 'ring-2 ring-white/80 shadow-xs',
          className
        )}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          onError={() => setImgFailed(true)}
          className="size-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-extrabold',
        showBorder && 'ring-2 ring-white/80 shadow-xs',
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: preset.bg,
        color: preset.fg,
        fontSize: size * 0.38,
      }}
      aria-hidden
    >
      {preset.symbol}
    </span>
  );
}
