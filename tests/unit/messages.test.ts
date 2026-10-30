import { describe, expect, it } from 'vitest';

import { formatClient } from '@/lib/i18n/client-format';

/**
 * The digit rule: fa and ckb display text uses Persian/Arabic-Indic digits,
 * while anything copied or compared stays Latin. See the note in messages.ts.
 *
 * These exercise the client formatter, which shares the rule with the server
 * translator; the server one needs a React cache context, so the shared
 * behaviour is covered here.
 */

describe('digit localisation', () => {
  it('localises bare numeric placeholders in Persian', () => {
    const out = formatClient('سؤال {current} از {total}', 'fa', {
      current: 2,
      total: 10,
    });
    expect(out).toMatch(/[۰-۹]/);
    expect(out).not.toMatch(/[0-9]/);
  });

  it('keeps Latin digits for English', () => {
    expect(formatClient('Question {current} / {total}', 'en', { current: 2, total: 10 })).toBe(
      'Question 2 / 10'
    );
  });

  it('leaves string values alone, so version numbers stay Latin', () => {
    // The download page passes version and build as strings via formatPlain.
    const out = formatClient('نسخه {version} ({buildNumber})', 'fa', {
      version: '1.0.22',
      buildNumber: '22',
    });
    expect(out).toContain('1.0.22');
    expect(out).toContain('22');
  });

  it('still selects the right plural branch after the rewrite', () => {
    const message = '{count, plural, =1{۱ نتیجه} other{{count} نتیجه}}';
    expect(formatClient(message, 'fa', { count: 1 })).toBe('۱ نتیجه');

    const many = formatClient(message, 'fa', { count: 1888 });
    expect(many).toContain('نتیجه');
    expect(many).toMatch(/[۰-۹]/);
  });

  it('selects the zero branch where a message defines one', () => {
    const message = '{count, plural, =0{No results} =1{1 result} other{{count} results}}';
    expect(formatClient(message, 'en', { count: 0 })).toBe('No results');
    expect(formatClient(message, 'en', { count: 1 })).toBe('1 result');
    expect(formatClient(message, 'en', { count: 7 })).toBe('7 results');
  });

  it('returns the message unchanged when there are no values', () => {
    expect(formatClient('Plain text', 'fa')).toBe('Plain text');
  });

  it('degrades to the raw message rather than throwing on a malformed pattern', () => {
    const broken = '{count, plural, other{';
    expect(formatClient(broken, 'en', { count: 1 })).toBe(broken);
  });
});
