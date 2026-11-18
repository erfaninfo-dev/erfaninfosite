'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

// pathWrong fade is CSS-only (animation-delay) — no setState in an effect.

import { cn } from '@/lib/cn';
import type { LetterInstance } from '@/lib/game/word-builder/types';

type TrayLayout = {
  centers: Array<{ x: number; y: number }>;
  tile: number;
  hitRadius: number;
  center: { x: number; y: number };
  trayRadius: number;
};

function computeTrayLayout(width: number, height: number, n: number): TrayLayout {
  const center = { x: width / 2, y: height / 2 };
  if (n <= 0) {
    return { centers: [], tile: 0, hitRadius: 0, center, trayRadius: 0 };
  }
  const m = Math.min(width, height);
  const maxR = m * 0.5 - 6;
  let tile = 54;
  const gap = n <= 3 ? 34 : n <= 4 ? 30 : 28;
  const ringFill = 0.84;
  const sinHalf = Math.sin(Math.PI / n);
  const minRadiusForTile = (t: number) => (t + gap) / (2 * sinHalf);
  while (minRadiusForTile(tile) > maxR * 0.98 && tile > 32) {
    tile -= 2;
  }
  const need = minRadiusForTile(tile);
  const r = Math.min(maxR, Math.max(need, maxR * ringFill));
  const centers: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i += 1) {
    const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
    centers.push({
      x: center.x + Math.cos(ang) * r,
      y: center.y + Math.sin(ang) * r,
    });
  }
  const maxTray = m / 2 - 5;
  const trayRadius = Math.min(r + tile / 2 + 22, maxTray);
  return {
    centers,
    tile,
    hitRadius: tile * 0.55,
    center,
    trayRadius,
  };
}

function hitIndex(
  local: { x: number; y: number },
  layout: TrayLayout
): number | null {
  for (let i = 0; i < layout.centers.length; i += 1) {
    const c = layout.centers[i]!;
    const dx = c.x - local.x;
    const dy = c.y - local.y;
    if (Math.hypot(dx, dy) <= layout.hitRadius) return i;
  }
  return null;
}

/**
 * Circular letter tray — Classic Word Builder interaction.
 * Pointer (mouse + touch) drag across letters builds a path; release submits.
 * Forced LTR so English letter positions never mirror under RTL locales.
 */
export function CircularLetterTray({
  letters,
  path,
  pathWrong,
  blocked,
  onAppend,
  onRelease,
  onCancel,
  onClearTap,
}: {
  letters: LetterInstance[];
  path: LetterInstance[];
  pathWrong: boolean;
  blocked?: boolean;
  onAppend: (letter: LetterInstance) => void;
  onRelease: () => void;
  onCancel: () => void;
  /** Tap outside the saucer (without dragging) clears the current path. */
  onClearTap?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 320, h: 320 });
  const dragLastId = useRef<number | null>(null);
  const tapOrigin = useRef<{ x: number; y: number } | null>(null);
  const tapOutside = useRef(false);
  const tapMaxMove = useRef(0);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      // ResizeObserver callbacks are external — safe to setState here.
      setSize({ w: box.width, h: box.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = computeTrayLayout(size.w, size.h, letters.length);
  const pathIdx = path
    .map((p) => letters.findIndex((e) => e.id === p.id))
    .filter((i) => i >= 0);

  const localPoint = useCallback((e: ReactPointerEvent) => {
    const el = rootRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const outsideTray = useCallback(
    (p: { x: number; y: number }) =>
      Math.hypot(p.x - layout.center.x, p.y - layout.center.y) > layout.trayRadius,
    [layout.center.x, layout.center.y, layout.trayRadius]
  );

  function onPointerDown(e: ReactPointerEvent) {
    if (blocked || pathWrong) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragLastId.current = null;
    const p = localPoint(e);
    tapOrigin.current = p;
    tapOutside.current = outsideTray(p);
    tapMaxMove.current = 0;
    const hit = hitIndex(p, layout);
    if (hit !== null) {
      const letter = letters[hit]!;
      dragLastId.current = letter.id;
      onAppend(letter);
    }
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (blocked || pathWrong) return;
    const p = localPoint(e);
    const o = tapOrigin.current;
    if (o) {
      tapMaxMove.current = Math.max(tapMaxMove.current, Math.hypot(p.x - o.x, p.y - o.y));
    }
    const hit = hitIndex(p, layout);
    if (hit === null) return;
    const letter = letters[hit]!;
    if (dragLastId.current === letter.id) return;
    dragLastId.current = letter.id;
    onAppend(letter);
  }

  function finishPointer(cancelled: boolean) {
    const startedOutside = tapOutside.current;
    const maxMove = tapMaxMove.current;
    tapOrigin.current = null;
    tapOutside.current = false;
    tapMaxMove.current = 0;
    dragLastId.current = null;

    if (pathWrong) return;
    if (cancelled) {
      if (path.length > 0) onCancel();
      return;
    }
    if (startedOutside && path.length > 0 && maxMove < 18) {
      onClearTap?.();
      return;
    }
    if (path.length <= 1) {
      if (path.length > 0) onClearTap?.();
      return;
    }
    onRelease();
  }

  if (letters.length === 0) {
    return <div ref={rootRef} className="relative mx-auto aspect-square w-full max-w-[22rem]" />;
  }

  const pathColor = pathWrong
    ? 'var(--color-error)'
    : 'color-mix(in oklab, var(--color-primary) 70%, transparent)';

  return (
    <div
      ref={rootRef}
      dir="ltr"
      lang="en"
      className={cn(
        'relative mx-auto aspect-square w-full max-w-[22rem] touch-none select-none',
        blocked && 'pointer-events-none opacity-60'
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => finishPointer(false)}
      onPointerCancel={() => finishPointer(true)}
      role="application"
      aria-label="Letter tray"
    >
      {/* Saucer */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full border border-outline-variant/40 bg-[radial-gradient(circle_at_30%_25%,var(--color-surface-1),var(--color-surface-3)_55%,var(--color-surface-4))] shadow-[var(--shadow-soft)]"
        style={{
          width: layout.trayRadius * 2,
          height: layout.trayRadius * 2,
          left: layout.center.x - layout.trayRadius,
          top: layout.center.y - layout.trayRadius,
        }}
      />

      {/* Path lines */}
      <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
        {pathIdx.length >= 2 ? (
          <polyline
            fill="none"
            stroke={pathColor}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pathIdx
              .map((i) => {
                const c = layout.centers[i]!;
                return `${c.x},${c.y}`;
              })
              .join(' ')}
            opacity={0.9}
            className={pathWrong ? 'animate-[wb-path-fade_0.7s_ease_forwards]' : undefined}
          />
        ) : null}
      </svg>

      {/* Letters */}
      <div
        className={cn(
          'contents',
          pathWrong && 'animate-[wb-path-fade_0.7s_ease_forwards]'
        )}
      >
        {letters.map((letter, i) => {
          const c = layout.centers[i]!;
          const selected = path.some((p) => p.id === letter.id);
          const error = pathWrong && selected;
          const half = layout.tile / 2;
          return (
            <div
              key={letter.id}
              className={cn(
                'pointer-events-none absolute grid place-items-center rounded-full border-2 font-extrabold uppercase shadow-[var(--shadow-soft)] transition-[transform,background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-enter)]',
                error && 'border-error bg-error text-on-error scale-105',
                selected &&
                  !error &&
                  'border-correct bg-correct text-on-correct scale-105',
                !selected &&
                  !error &&
                  'border-secondary/50 bg-secondary-container text-on-secondary-container'
              )}
              style={{
                width: layout.tile,
                height: layout.tile,
                left: c.x - half,
                top: c.y - half,
                fontSize: Math.max(18, Math.min(32, layout.tile * 0.42)),
              }}
            >
              {letter.char}
            </div>
          );
        })}
      </div>
    </div>
  );
}
