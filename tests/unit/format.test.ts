import { describe, expect, it } from 'vitest';

import { formatNumber, formatPlain, parseApiDate } from '@/lib/i18n/format';

describe('parseApiDate — the API is not ISO 8601', () => {
  it('parses the API format "YYYY-MM-DD HH:MM:SS"', () => {
    const date = parseApiDate('2026-06-03 02:46:43');
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(5); // June, zero-indexed
    expect(date?.getDate()).toBe(3);
    expect(date?.getHours()).toBe(2);
  });

  it('accepts a T separator too', () => {
    expect(parseApiDate('2026-06-03T02:46:43')).not.toBeNull();
  });

  it('treats the MySQL zero date as unknown rather than year 0', () => {
    expect(parseApiDate('0000-00-00 00:00:00')).toBeNull();
  });

  it('treats null, undefined and empty as unknown', () => {
    expect(parseApiDate(null)).toBeNull();
    expect(parseApiDate(undefined)).toBeNull();
    expect(parseApiDate('   ')).toBeNull();
  });

  it('rejects anything that is not the expected shape', () => {
    expect(parseApiDate('not a date')).toBeNull();
    expect(parseApiDate('2026-06-03')).toBeNull();
  });
});

describe('digits', () => {
  it('uses Latin digits for English', () => {
    expect(formatNumber(1888, 'en')).toBe('1,888');
  });

  it('uses Persian digits for fa display text', () => {
    // ui-ux-spec.md §3 requires localised digits in fa and ckb display text.
    expect(formatNumber(123, 'fa')).toMatch(/[۰-۹]/);
  });

  it('uses Arabic-Indic digits for ckb display text', () => {
    expect(formatNumber(123, 'ckb')).toMatch(/[٠-٩۰-۹]/);
  });

  it('keeps Latin digits for values that are copied or compared', () => {
    // Version numbers, ids and scores must stay Latin in every locale.
    expect(formatPlain(22)).toBe('22');
    expect(formatPlain(1888)).toBe('1888');
  });
});
