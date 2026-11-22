import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Deterministic floating particle positions matching Flutter's `MagicBackground`
 * (`lib/features/word_builder/presentation/widgets/magic_background.dart`).
 */
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  leftPct: ((i * 13 + 5) % 96) + 2,
  topPct: ((i * 37 + 7) % 94) + 3,
  size: 4 + (i % 3) * 2,
  duration: 8 + (i % 5) * 2.5,
  delay: -(i * 0.7),
}));

/**
 * Warm golden-peach-rose gradient backdrop with drifting white glow particles,
 * matching Flutter's `MagicBackground` in light and dark themes.
 */
export function MagicBackground({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden',
        'bg-[linear-gradient(135deg,#FDE68A_0%,#FAC05E_52%,#F78DA7_100%)]',
        'dark:bg-[linear-gradient(135deg,#4A3728_0%,#6B4E3D_52%,#8B5A6B_100%)]',
        className
      )}
    >
      {/* Floating glowing particles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((p, idx) => (
          <span
            key={idx}
            className="absolute rounded-full bg-white/30 dark:bg-white/15"
            style={{
              left: `${p.leftPct}%`,
              top: `${p.topPct}%`,
              width: p.size,
              height: p.size,
              animation: `wb-particle-drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
