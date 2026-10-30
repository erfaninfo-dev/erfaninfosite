import { describe, expect, it } from 'vitest';

import { formatClient } from '@/lib/i18n/client-format';
import { NUMBER_LOCALE } from '@/lib/i18n/config';

/**
 * The digit rule: fa and ckb display text uses Persian/Arabic-Indic digits,
 * while anything copied or compared stays Latin. See the note in messages.ts.
 *
 * These exercise the client formatter, which shares the rule with the server
 * translator; the server one needs a React cache context, so the shared
 * behaviour is covered here.
 */

describe('digit localisation', () => {
  /*
   * formatClient takes the app locale ('en' | 'fa' | 'ckb') and resolves the
   * formatting tag itself through NUMBER_LOCALE — Chromium has no `ckb` data,
   * so passing the bare locale would silently give Latin digits in the browser
   * while the server produced Arabic-Indic ones.
   */
  it('localises bare numeric placeholders in Persian', () => {
    const out = formatClient('سؤال {current} از {total}', 'fa', {
      current: 2,
      total: 10,
    });
    expect(out).toMatch(/[۰-۹]/);
    expect(out).not.toMatch(/[0-9]/);
  });

  it('keeps Latin digits for English', () => {
    expect(
      formatClient('Question {current} / {total}', 'en', { current: 2, total: 10 })
    ).toBe('Question 2 / 10');
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

describe('Kurdish number formatting', () => {
  /*
   * Node ships `ckb` locale data and Chromium does not. Both must produce the
   * same digits, or the first quiz question renders ١ from the server and then
   * 2 after hydration — which is exactly what happened before NUMBER_LOCALE
   * mapped ckb to ar-IQ.
   */
  it('gives Arabic-Indic digits for ckb', () => {
    const out = formatClient('پرسیار {current} لە {total}', 'ckb', {
      current: 1,
      total: 10,
    });
    expect(out).toMatch(/[٠-٩]/);
    expect(out).not.toMatch(/[0-9]/);
  });

  it('resolves to a locale every engine knows, not a bare ckb tag', () => {
    // A tag whose base locale an engine lacks is dropped entirely, extension
    // and all, so this must resolve rather than fall back to en-US.
    const resolved = new Intl.NumberFormat(NUMBER_LOCALE.ckb).resolvedOptions();
    expect(resolved.numberingSystem).toBe('arab');
  });
});
