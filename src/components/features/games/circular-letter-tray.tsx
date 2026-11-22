'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { cn } from '@/lib/cn';
import type { LetterInstance } from '@/lib/game/word-builder/types';

type TrayLayout = {
  centers: Array<{ x: number; y: number }>;
  tile: number;
  hitRadius: number;
  center: { x: number; y: number };
  ringRadius: number;
  trayRadius: number;
};

/**
 * Exact Flutter `_computeTrayLayout` proportions from
 * `lib/features/word_builder/presentation/widgets/circular_letter_tray.dart`.
 */
function computeTrayLayout(width: number, height: number, n: number): TrayLayout {
  const center = { x: width / 2, y: height / 2 };
  if (n <= 0) {
    return { centers: [], tile: 0, hitRadius: 0, center, ringRadius: 0, trayRadius: 0 };
  }
  const m = Math.min(width, height);
  const maxR = m * 0.5 - 10;
  let tile = Math.min(54, Math.max(32, m * 0.19));
  const gap = n <= 3 ? 32 : n <= 4 ? 26 : 22;
  const ringFill = 0.82;
  const sinHalf = Math.sin(Math.PI / n);
  const minRadiusForTile = (t: number) => (t + gap) / (2 * sinHalf);
  while (minRadiusForTile(tile) > maxR * 0.96 && tile > 30) {
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
  const maxTray = m / 2 - 8;
  const trayRadius = Math.min(r + tile / 2 + 20, maxTray);
  return {
    centers,
    tile,
    hitRadius: tile * 0.58,
    center,
    ringRadius: r,
    trayRadius,
  };
}

function hitIndex(local: { x: number; y: number }, layout: TrayLayout): number | null {
  let bestIdx: number | null = null;
  let bestDist = layout.hitRadius;
  for (let i = 0; i < layout.centers.length; i += 1) {
    const c = layout.centers[i]!;
    const dist = Math.hypot(c.x - local.x, c.y - local.y);
    if (dist <= bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

const ORBIT_DOT_ANGLES = Array.from({ length: 8 }, (_, i) => (2 * Math.PI * i) / 8);

/**
 * Circular letter tray matching Flutter's `CircularLetterTray` + `FancyLetter`
 * (without water / train / prison center scenes).
 *
 * Features:
 * - Rotating golden orbit glow ring with 8 glowing white dots
 * - Warm golden saucer gradient (`#FFFDE7 -> #FFE0B2 -> #FFCC80`)
 * - Smooth drag-across-letters with live rubber-band line following cursor/finger
 * - Dragging back onto the previous letter smoothly undoes the last step
 * - Release submits immediately; tap outside the saucer clears
 * - Forced LTR so English letter positions never mirror under RTL locales
 */
export function CircularLetterTray({
  letters,
  path,
  pathWrong,
  blocked,
  onAppend,
  onPopLast,
  onRelease,
  onCancel,
  onClearTap,
}: {
  letters: LetterInstance[];
  path: LetterInstance[];
  pathWrong: boolean;
  blocked?: boolean;
  onAppend: (letter: LetterInstance) => void;
  onPopLast?: () => void;
  onRelease: () => void;
  onCancel: () => void;
  onClearTap?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 300, h: 300 });
  const [dragCursor, setDragCursor] = useState<{ x: number; y: number } | null>(null);

  const pathIdsRef = useRef<number[]>([]);
  const tapOrigin = useRef<{ x: number; y: number } | null>(null);
  const tapOutside = useRef(false);
  const tapMaxMove = useRef(0);
  const gestureAppends = useRef(0);
  const activePointerId = useRef<number | null>(null);

  useEffect(() => {
    pathIdsRef.current = path.map((p) => p.id);
  }, [path]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width <= 0 || box.height <= 0) return;
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

  function resetGestureTracking() {
    tapOrigin.current = null;
    tapOutside.current = false;
    tapMaxMove.current = 0;
    gestureAppends.current = 0;
    activePointerId.current = null;
    setDragCursor(null);
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (blocked || pathWrong) return;
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    activePointerId.current = e.pointerId;
    gestureAppends.current = 0;
    const p = localPoint(e);
    tapOrigin.current = p;
    tapOutside.current = outsideTray(p);
    tapMaxMove.current = 0;
    setDragCursor(p);

    const hit = hitIndex(p, layout);
    if (hit !== null) {
      const letter = letters[hit]!;
      pathIdsRef.current = [...pathIdsRef.current, letter.id];
      gestureAppends.current = 1;
      onAppend(letter);
    }
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (blocked || pathWrong) return;
    if (activePointerId.current === null) return;
    if (e.pointerId !== activePointerId.current) return;
    if (e.pointerType !== 'touch' && (e.buttons & 1) === 0) return;

    const p = localPoint(e);
    setDragCursor(p);

    const o = tapOrigin.current;
    if (o) {
      tapMaxMove.current = Math.max(tapMaxMove.current, Math.hypot(p.x - o.x, p.y - o.y));
    }

    const hit = hitIndex(p, layout);
    if (hit === null) return;
    const letter = letters[hit]!;
    const ids = pathIdsRef.current;
    const lastId = ids.at(-1);
    if (lastId === letter.id) return;

    // Backtrack onto second-to-last tile: smoothly pop last letter.
    if (ids.length >= 2 && ids[ids.length - 2] === letter.id && onPopLast) {
      pathIdsRef.current = ids.slice(0, -1);
      onPopLast();
      return;
    }

    // Already in path (not backtrack): ignore.
    if (ids.includes(letter.id)) return;

    pathIdsRef.current = [...ids, letter.id];
    gestureAppends.current += 1;
    onAppend(letter);
  }

  function finishPointer(cancelled: boolean, pointerId?: number) {
    if (activePointerId.current === null && gestureAppends.current === 0 && !tapOrigin.current) {
      return;
    }
    if (
      pointerId !== undefined &&
      activePointerId.current !== null &&
      pointerId !== activePointerId.current
    ) {
      return;
    }

    const startedOutside = tapOutside.current;
    const maxMove = tapMaxMove.current;
    const appends = gestureAppends.current;
    resetGestureTracking();

    if (pathWrong) return;
    if (cancelled) {
      onCancel();
      return;
    }
    if (startedOutside && appends === 0 && maxMove < 18) {
      onClearTap?.();
      return;
    }
    onRelease();
  }

  const trayBoxClass =
    'relative mx-auto aspect-square w-full max-w-[min(100%,19.5rem,min(74vw,40dvh))] cursor-grab active:cursor-grabbing touch-none select-none';

  if (letters.length === 0) {
    return <div ref={rootRef} className={trayBoxClass} />;
  }

  const orbitR = layout.trayRadius + 8;
  const pathStroke = pathWrong ? 'rgba(211, 47, 47, 0.86)' : 'rgba(37, 99, 235, 0.62)';
  const lastCenter = pathIdx.length > 0 ? layout.centers[pathIdx[pathIdx.length - 1]!] : null;

  return (
    <div
      ref={rootRef}
      dir="ltr"
      lang="en"
      className={cn(trayBoxClass, blocked && 'pointer-events-none opacity-60')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finishPointer(false, e.pointerId)}
      onPointerCancel={(e) => finishPointer(true, e.pointerId)}
      onLostPointerCapture={(e) => finishPointer(true, e.pointerId)}
      onPointerLeave={(e) => {
        if (activePointerId.current === null) return;
        if (e.pointerId !== activePointerId.current) return;
        if (!rootRef.current?.hasPointerCapture(e.pointerId)) {
          finishPointer(true, e.pointerId);
        }
      }}
      role="application"
      aria-label="Letter tray"
    >
      {/* Ambient radial glow behind the saucer (matching Flutter's 1.1x radial glow) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          width: layout.trayRadius * 2.35,
          height: layout.trayRadius * 2.35,
          left: layout.center.x - layout.trayRadius * 1.175,
          top: layout.center.y - layout.trayRadius * 1.175,
          backgroundImage:
            'radial-gradient(circle, color-mix(in oklab, var(--color-primary) 16%, transparent) 0%, color-mix(in oklab, var(--color-primary) 5%, transparent) 48%, transparent 100%)',
        }}
      />

      {/* Slowly rotating golden Orbit Glow Ring with 8 white dots (`_OrbitGlowPainter`) */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
        style={{
          transformOrigin: `${layout.center.x}px ${layout.center.y}px`,
          animation: 'wb-orbit-spin 36s linear infinite',
        }}
      >
        <circle
          cx={layout.center.x}
          cy={layout.center.y}
          r={orbitR}
          fill="none"
          stroke="rgba(255, 179, 0, 0.42)"
          strokeWidth={3}
          style={{ filter: 'blur(2.5px)' }}
        />
        {ORBIT_DOT_ANGLES.map((ang, i) => (
          <circle
            key={i}
            cx={layout.center.x + Math.cos(ang) * orbitR}
            cy={layout.center.y + Math.sin(ang) * orbitR}
            r={3.8}
            fill="rgba(255, 255, 255, 0.58)"
          />
        ))}
      </svg>

      {/* Warm Golden Saucer (`_TraySaucerPainter`: #FFFDE7 -> #FFE0B2 -> #FFCC80) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full border-[1.5px] border-white/60 shadow-[0_10px_28px_rgba(255,152,0,0.22),0_4px_12px_rgba(0,0,0,0.1)] dark:border-white/20"
        style={{
          width: layout.trayRadius * 2,
          height: layout.trayRadius * 2,
          left: layout.center.x - layout.trayRadius,
          top: layout.center.y - layout.trayRadius,
          backgroundImage:
            'radial-gradient(circle at 28% 24%, #FFFDE7 0%, #FFE0B2 55%, #FFCC80 100%)',
        }}
      />

      {/* Subtle decorative center emblem (clean, no water/train/jail) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full border border-[#FFB300]/25 bg-white/30"
        style={{
          width: layout.trayRadius * 0.58,
          height: layout.trayRadius * 0.58,
          left: layout.center.x - layout.trayRadius * 0.29,
          top: layout.center.y - layout.trayRadius * 0.29,
        }}
      />

      {/* Connecting path line + live rubber-band drag segment */}
      <svg
        className={cn(
          'pointer-events-none absolute inset-0 size-full overflow-visible',
          pathWrong && 'animate-[wb-path-fade_0.66s_ease_forwards]'
        )}
        aria-hidden="true"
      >
        {pathIdx.length >= 2 ? (
          <polyline
            fill="none"
            stroke={pathStroke}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pathIdx
              .map((i) => {
                const c = layout.centers[i]!;
                return `${c.x},${c.y}`;
              })
              .join(' ')}
          />
        ) : null}
        {dragCursor && lastCenter && !pathWrong ? (
          <line
            x1={lastCenter.x}
            y1={lastCenter.y}
            x2={dragCursor.x}
            y2={dragCursor.y}
            stroke={pathStroke}
            strokeWidth={4}
            strokeLinecap="round"
            strokeOpacity={0.75}
          />
        ) : null}
      </svg>

      {/* Fancy Letter Tiles (exact Flutter `FancyLetter` colors, gradients & glows) */}
      <div className={cn('contents', pathWrong && 'animate-[wb-path-fade_0.66s_ease_forwards]')}>
        {letters.map((letter, i) => {
          const c = layout.centers[i]!;
          const selected = path.some((p) => p.id === letter.id);
          const error = pathWrong && selected;
          const half = layout.tile / 2;
          const fontSize = Math.max(16, Math.min(28, layout.tile * 0.44));

          const backgroundImage = error
            ? 'linear-gradient(180deg, #FF8A80, #D32F2F)'
            : selected
              ? 'linear-gradient(180deg, #81C784, #2E7D32)'
              : 'linear-gradient(135deg, #FFF8E1, #FFECB3)';

          const borderColor = error
            ? 'rgba(244, 67, 54, 0.78)'
            : selected
              ? 'rgba(67, 160, 71, 0.82)'
              : 'rgba(255, 152, 0, 0.65)';

          const boxShadow = error
            ? '0 4px 18px 2px rgba(244, 67, 54, 0.45), 0 2px 6px rgba(0,0,0,0.14)'
            : selected
              ? '0 4px 18px 3px rgba(67, 160, 71, 0.48), 0 2px 6px rgba(0,0,0,0.14)'
              : '0 4px 14px 1px rgba(255, 152, 0, 0.38), 0 2px 6px rgba(0,0,0,0.12)';

          return (
            <div
              key={letter.id}
              className={cn(
                'pointer-events-none absolute grid place-items-center rounded-full font-extrabold uppercase transition-transform duration-150 ease-out',
                selected || error ? 'scale-110 text-white' : 'text-[#5D4037]'
              )}
              style={{
                width: layout.tile,
                height: layout.tile,
                left: c.x - half,
                top: c.y - half,
                fontSize,
                lineHeight: 1,
                backgroundImage,
                border: `${selected ? 2.4 : 1.7}px solid ${borderColor}`,
                boxShadow,
                textShadow:
                  selected || error ? '0 1px 4px rgba(0,0,0,0.25)' : undefined,
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
