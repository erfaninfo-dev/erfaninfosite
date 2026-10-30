import { expect, test, type Page } from '@playwright/test';

import { LOCALES, MAIN_PAGES, WIDTHS } from './pages';

/**
 * The hard layout rules from ui-ux-spec.md §2.7 and §10, asserted rather than
 * eyeballed: no horizontal scroll anywhere, correct direction per locale, and
 * no tracking on Arabic script.
 */

/**
 * Waits for the streamed content, not just the prerendered shell.
 *
 * It also waits for the stylesheet to have taken effect: measuring an unstyled
 * page reports overflow that does not exist once the CSS lands, which makes
 * these checks flaky under parallel load.
 */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    const body = document.body;
    // The token stylesheet sets a background; an unstyled page has none.
    return getComputedStyle(body).backgroundColor !== 'rgba(0, 0, 0, 0)';
  });
  // The skeletons animate; give the swap a beat so measurements are of real content.
  await page.waitForTimeout(250);
}

test.describe('no horizontal scroll at any width', () => {
  for (const width of WIDTHS) {
    for (const def of MAIN_PAGES) {
      test(`${def.name} @ ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(def.path('en'), { waitUntil: 'domcontentloaded' });
        await settle(page);

        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          // clientWidth excludes a scrollbar, which innerWidth includes.
          innerWidth: document.documentElement.clientWidth,
          // Name the widest offender, so a failure is actionable.
          culprits: Array.from(document.querySelectorAll<HTMLElement>('body *'))
            .filter((el) => {
              const r = el.getBoundingClientRect();
              const limit = document.documentElement.clientWidth;
              return r.width > limit + 1 || r.right > limit + 1;
            })
            .slice(0, 5)
            .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 120)),
        }));

        expect(
          overflow.scrollWidth,
          `page scrolls horizontally; widest offenders: ${overflow.culprits.join(' | ')}`
        ).toBeLessThanOrEqual(overflow.innerWidth + 1);
      });
    }
  }
});

test.describe('direction and script', () => {
  for (const locale of LOCALES) {
    const expectedDir = locale === 'en' ? 'ltr' : 'rtl';

    test(`${locale} sets dir=${expectedDir} and lang=${locale}`, async ({ page }) => {
      await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('dir', expectedDir);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
    });
  }

  for (const locale of ['fa', 'ckb'] as const) {
    test(`${locale} applies no letter-spacing to Arabic script`, async ({ page }) => {
      await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' });
      await settle(page);

      /*
       * Letter-spacing breaks the cursive joining of Arabic script, so the
       * tokens resolve to 0 under these locales. Checking computed style on
       * real headings is the only way to know the rule actually took effect.
       */
      const tracked = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of document.querySelectorAll('h1, h2, h3, h4, p, span, button')) {
          const spacing = getComputedStyle(el).letterSpacing;
          if (spacing && spacing !== 'normal' && Math.abs(parseFloat(spacing)) > 0.01) {
            out.push(`${el.tagName.toLowerCase()}: ${spacing}`);
          }
        }
        return out.slice(0, 5);
      });

      expect(
        tracked,
        `letter-spacing applied to Arabic script: ${tracked.join(', ')}`
      ).toEqual([]);
    });

    test(`${locale} uses a larger line height for Arabic script`, async ({ page }) => {
      await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' });
      const leading = await page.evaluate(() => {
        const style = getComputedStyle(document.body);
        return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
      });
      // ui-ux-spec.md §3 asks for roughly 1.8–2.0.
      expect(leading).toBeGreaterThan(1.7);
    });
  }
});

test.describe('navigation adapts to width', () => {
  test('phone shows the bottom bar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await settle(page);
    // The bottom bar specifically — the header nav is hidden below md.
    const bottomBar = page.locator('nav.fixed');
    await expect(bottomBar).toBeVisible();
    await expect(bottomBar).toContainText('Home');
  });

  test('desktop shows persistent links and no hamburger', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await settle(page);

    // The five destinations are real links in the header at desktop width.
    const header = page.locator('header');
    await expect(header.getByRole('link', { name: 'Vocabulary' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Grammar' })).toBeVisible();

    // The bottom bar is hidden from md up.
    const bottomBarVisible = await page
      .locator('nav.fixed')
      .first()
      .isVisible()
      .catch(() => false);
    expect(bottomBarVisible).toBe(false);
  });

  test('the language switcher is reachable without opening a menu', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await settle(page);
    await expect(page.locator('header button[aria-haspopup="menu"]')).toBeVisible();
  });
});

test.describe('touch targets', () => {
  test('interactive elements are at least 44px on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/grammar/topics/1/quiz?n=10', { waitUntil: 'domcontentloaded' });
    await settle(page);

    const tooSmall = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>(
        'main button, main a[href], main select, main input'
      )) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue; // not rendered
        if (r.height < 44)
          out.push(`${el.tagName.toLowerCase()} ${Math.round(r.height)}px`);
      }
      return out.slice(0, 8);
    });

    expect(tooSmall, `targets under 44px: ${tooSmall.join(', ')}`).toEqual([]);
  });
});
