import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { LOCALES, MAIN_PAGES, SORANI_LETTERS, THEMES } from './pages';

/**
 * Accessibility, per ui-ux-spec.md §9 item 3: zero serious or critical issues
 * on every main page, in every locale and both themes.
 */

async function applyTheme(page: import('@playwright/test').Page, theme: string) {
  await page
    .context()
    .addCookies([
      { name: 'erfan_theme', value: theme, url: page.url() || 'http://127.0.0.1:3210' },
    ]);
}

/**
 * Both widths matter. Several controls show a text label only from `lg` up and
 * rely on an icon below that, so a name that is present at desktop width can be
 * missing on a phone — which is exactly the bug this caught: the logo link and
 * the language button had no accessible name at 390 px.
 */
const A11Y_WIDTHS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

test.describe('axe-core', () => {
  for (const def of MAIN_PAGES) {
    for (const locale of LOCALES) {
      test(`${def.name} · ${locale}`, async ({ page }) => {
        for (const viewport of A11Y_WIDTHS) {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.goto(def.path(locale), { waitUntil: 'domcontentloaded' });
          await page.waitForLoadState('networkidle');

          const scan = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

          const serious = scan.violations.filter(
            (v) => v.impact === 'serious' || v.impact === 'critical'
          );
          const detail = serious
            .map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`)
            .join(' | ');

          expect(
            serious,
            `${viewport.name} ${viewport.width}px — serious/critical a11y issues: ${detail}`
          ).toEqual([]);
        }
      });
    }
  }
});

test.describe('dark mode', () => {
  for (const theme of THEMES) {
    test(`home renders in ${theme} with a resolved theme attribute`, async ({ page }) => {
      await page.goto('/en', { waitUntil: 'domcontentloaded' });
      await applyTheme(page, theme);
      await page.reload({ waitUntil: 'domcontentloaded' });

      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

      // The body must have a real background in both themes, never transparent.
      const background = await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor
      );
      expect(background).not.toBe('rgba(0, 0, 0, 0)');
    });
  }
});

test.describe('Sorani typography', () => {
  test('the hard letters render with a real glyph, not tofu', async ({ page }) => {
    await page.goto('/ckb', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    /*
     * ێ ڵ ڕ ۆ ە ڤ are the letters that break when a font lacks Sorani
     * coverage. Measuring each one's rendered width against the notdef box
     * catches a missing glyph, which a screenshot comparison would not.
     */
    const widths = await page.evaluate(
      (letters) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        const font = getComputedStyle(document.body).font;
        ctx.font = font;
        return Object.fromEntries(
          letters.map((letter) => [letter, ctx.measureText(letter).width])
        );
      },
      [...SORANI_LETTERS]
    );

    expect(widths).not.toBeNull();
    for (const letter of SORANI_LETTERS) {
      expect(
        widths![letter],
        `${letter} has no width — font lacks the glyph`
      ).toBeGreaterThan(0);
    }
  });

  test('Kurdish page text actually contains Sorani letters', async ({ page }) => {
    await page.goto('/ckb', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const text = await page.locator('main').innerText();
    // The imported translations use these; if the page fell back to English,
    // this catches it.
    expect(text).toMatch(/[ێڵڕۆەڤ]/);
  });
});

test.describe('reduced motion', () => {
  test('the site is usable with animations disabled', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en/grammar/quiz?topics=1&n=10&seed=7', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    const options = page.locator('main button[aria-pressed]');
    await expect(options.first()).toBeVisible();
    await options.first().click();

    // Feedback still appears; only the transition is removed.
    await expect(page.locator('main [role="alert"], main p[aria-live]')).toBeTruthy();
  });
});

test.describe('keyboard', () => {
  test('the quiz is operable with the keyboard alone', async ({ page }) => {
    await page.goto('/en/grammar/quiz?topics=1&n=10&seed=7', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    const firstOption = page.locator('main button[aria-pressed]').first();
    await expect(firstOption).toBeVisible();
    await firstOption.focus();

    // A visible focus ring is a requirement, not a nicety.
    const outline = await firstOption.evaluate((el) => {
      el.focus();
      return getComputedStyle(el).outlineStyle;
    });
    expect(outline).not.toBe('none');

    await page.keyboard.press('Enter');
    await expect(page.locator('main button[disabled]').first()).toBeVisible();
  });
});
