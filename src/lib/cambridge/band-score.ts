import type { CambridgeSkill } from './labels';

/**
 * Official IELTS raw-score → Band Score conversion tables (out of 40).
 * Matches official British Council / IDP / Cambridge Academic scales and Testino.
 *
 * Examples verified against official charts & Testino:
 * - Academic Reading: 30/40 → 7.0, 33/40 → 7.5, 35/40 → 8.0, 27/40 → 6.5, 23/40 → 6.0
 * - Listening:        29/40 → 6.5, 30/40 → 7.0, 32/40 → 7.5, 35/40 → 8.0, 26/40 → 6.5
 */
const LISTENING_TABLE: ReadonlyArray<readonly [number, number]> = [
  [39, 9.0],
  [37, 8.5],
  [35, 8.0],
  [32, 7.5],
  [30, 7.0],
  [26, 6.5],
  [23, 6.0],
  [18, 5.5],
  [16, 5.0],
  [13, 4.5],
  [10, 4.0],
  [8, 3.5],
  [6, 3.0],
  [4, 2.5],
  [3, 2.0],
  [2, 1.5],
  [1, 1.0],
];

const ACADEMIC_READING_TABLE: ReadonlyArray<readonly [number, number]> = [
  [39, 9.0],
  [37, 8.5],
  [35, 8.0],
  [33, 7.5],
  [30, 7.0],
  [27, 6.5],
  [23, 6.0],
  [19, 5.5],
  [15, 5.0],
  [13, 4.5],
  [10, 4.0],
  [8, 3.5],
  [6, 3.0],
  [4, 2.5],
  [3, 2.0],
  [2, 1.5],
  [1, 1.0],
];

export function estimateIeltsBand(
  skill: CambridgeSkill,
  score: number | null,
  max: number | null
): number | null {
  if (score === null || max === null || max <= 0) return null;
  if (skill !== 'listening' && skill !== 'reading') return null;

  const clamped = Math.max(0, Math.min(score, max));
  const scaled = max === 40 ? Math.round(clamped) : Math.round((clamped / max) * 40);
  if (scaled <= 0) return 0;

  const table = skill === 'listening' ? LISTENING_TABLE : ACADEMIC_READING_TABLE;
  for (const [minRaw, band] of table) {
    if (scaled >= minRaw) return band;
  }
  return 0;
}

/**
 * Official IELTS Overall Band Score rounding:
 * Average of skill bands rounded to the nearest 0.5 (`.25 → .5`, `.75 → next whole`).
 */
export function overallIeltsBand(bands: ReadonlyArray<number>): number | null {
  const valid = bands.filter((b) => Number.isFinite(b) && b >= 0 && b <= 9);
  if (valid.length === 0) return null;
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  return Math.round(mean * 2) / 2;
}

export function formatBandScore(band: number): string {
  return Number.isInteger(band) ? String(band) : band.toFixed(1);
}
