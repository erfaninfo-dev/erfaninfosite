import { cn } from '@/lib/cn';

const PRESETS: Record<string, { bg: string; fg: string }> = {
  m1: { bg: '#2563EB', fg: '#ffffff' },
  m2: { bg: '#4F46E5', fg: '#ffffff' },
  m3: { bg: '#0D9488', fg: '#ffffff' },
  m4: { bg: '#0891B2', fg: '#ffffff' },
  f1: { bg: '#DB2777', fg: '#ffffff' },
  f2: { bg: '#E11D48', fg: '#ffffff' },
  f3: { bg: '#9333EA', fg: '#ffffff' },
  f4: { bg: '#C026D3', fg: '#ffffff' },
};

export function ProfileAvatar({
  avatarId,
  size = 48,
  className,
}: {
  avatarId: string;
  size?: number;
  className?: string;
}) {
  const key = avatarId.trim() || 'm1';
  const preset = PRESETS[key] ?? PRESETS.m1;
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full font-extrabold', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: preset?.bg,
        color: preset?.fg,
        fontSize: size * 0.38,
      }}
      aria-hidden
    >
      {key.startsWith('f') ? '★' : '◆'}
    </span>
  );
}
