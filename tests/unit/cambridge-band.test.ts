import { describe, expect, it } from 'vitest';

import {
  estimateIeltsBand,
  formatBandScore,
  overallIeltsBand,
} from '@/lib/cambridge/band-score';

describe('Official IELTS Band Score calculation', () => {
  it('matches official IELTS Academic Reading 40-question conversion table', () => {
    expect(estimateIeltsBand('reading', 40, 40)).toBe(9.0);
    expect(estimateIeltsBand('reading', 39, 40)).toBe(9.0);
    expect(estimateIeltsBand('reading', 37, 40)).toBe(8.5);
    expect(estimateIeltsBand('reading', 35, 40)).toBe(8.0);
    expect(estimateIeltsBand('reading', 33, 40)).toBe(7.5);
    expect(estimateIeltsBand('reading', 32, 40)).toBe(7.0);
    expect(estimateIeltsBand('reading', 30, 40)).toBe(7.0);
    expect(estimateIeltsBand('reading', 29, 40)).toBe(6.5);
    expect(estimateIeltsBand('reading', 27, 40)).toBe(6.5);
    expect(estimateIeltsBand('reading', 26, 40)).toBe(6.0);
    expect(estimateIeltsBand('reading', 23, 40)).toBe(6.0);
    expect(estimateIeltsBand('reading', 19, 40)).toBe(5.5);
    expect(estimateIeltsBand('reading', 15, 40)).toBe(5.0);
    expect(estimateIeltsBand('reading', 10, 40)).toBe(4.0);
    expect(estimateIeltsBand('reading', 4, 40)).toBe(2.5);
    expect(estimateIeltsBand('reading', 3, 40)).toBe(2.0);
    expect(estimateIeltsBand('reading', 2, 40)).toBe(1.5);
    expect(estimateIeltsBand('reading', 1, 40)).toBe(1.0);
    expect(estimateIeltsBand('reading', 0, 40)).toBe(0);
  });

  it('matches official IELTS Listening 40-question conversion table', () => {
    expect(estimateIeltsBand('listening', 39, 40)).toBe(9.0);
    expect(estimateIeltsBand('listening', 37, 40)).toBe(8.5);
    expect(estimateIeltsBand('listening', 35, 40)).toBe(8.0);
    expect(estimateIeltsBand('listening', 32, 40)).toBe(7.5);
    expect(estimateIeltsBand('listening', 30, 40)).toBe(7.0);
    expect(estimateIeltsBand('listening', 29, 40)).toBe(6.5);
    expect(estimateIeltsBand('listening', 26, 40)).toBe(6.5);
    expect(estimateIeltsBand('listening', 23, 40)).toBe(6.0);
    expect(estimateIeltsBand('listening', 18, 40)).toBe(5.5);
    expect(estimateIeltsBand('listening', 16, 40)).toBe(5.0);
    expect(estimateIeltsBand('listening', 10, 40)).toBe(4.0);
    expect(estimateIeltsBand('listening', 0, 40)).toBe(0);
  });

  it('returns null for non-objective skills (writing / speaking)', () => {
    expect(estimateIeltsBand('writing', 0, 2)).toBeNull();
    expect(estimateIeltsBand('speaking', 0, 11)).toBeNull();
  });

  it('rounds overall band score to nearest 0.5 using official IELTS rule', () => {
    // 6.5 + 6.5 + 5.0 + 7.0 = 25 / 4 = 6.25 → 6.5
    expect(overallIeltsBand([6.5, 6.5, 5.0, 7.0])).toBe(6.5);
    // 6.5 + 6.5 + 7.0 + 7.0 = 27 / 4 = 6.75 → 7.0
    expect(overallIeltsBand([6.5, 6.5, 7.0, 7.0])).toBe(7.0);
    // 6.0 + 6.0 + 6.5 + 6.0 = 24.5 / 4 = 6.125 → 6.0
    expect(overallIeltsBand([6.0, 6.0, 6.5, 6.0])).toBe(6.0);
    expect(formatBandScore(7.0)).toBe('7');
    expect(formatBandScore(6.5)).toBe('6.5');
  });
});
