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

  /*
   * Grammar topic names and list numbers are English LTR content. The section
   * must stay LTR under fa/ckb while the document (header/nav) remains RTL.
   */
  for (const locale of ['fa', 'ckb'] as const) {
    test(`grammar stays LTR under ${locale} while html stays RTL`, async ({ page }) => {
      await page.goto(`/${locale}/grammar`, { waitUntil: 'domcontentloaded' });
      await settle(page);

      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('main [dir="ltr"]').first()).toBeVisible();

      const order = await page.evaluate(() => {
        const card = document.querySelector('main ul li .accent-card');
        if (!card) return null;
        const number = card.querySelector('.accent-dot-text');
        const title = card.querySelector('h2');
        if (!number || !title) return null;
        return {
          numberLeft: number.getBoundingClientRect().left,
          titleLeft: title.getBoundingClientRect().left,
        };
      });

      expect(order, 'expected a grammar topic card with number and title').not.toBeNull();
      expect(order!.numberLeft).toBeLessThan(order!.titleLeft);
    });
  }

  test('ckb quiz defaults the explanation tab to Kurdish; fa defaults to Persian', async ({
    page,
  }) => {
    for (const { locale, expected } of [
      { locale: 'ckb', expected: 'ckb' },
      { locale: 'fa', expected: 'fa' },
    ] as const) {
      await page.goto(`/${locale}/grammar/quiz?topics=1&n=10&seed=7`, {
        waitUntil: 'domcontentloaded',
      });
      await settle(page);

      await page.locator('main button[aria-pressed]').first().click();
      const tabs = page.locator('main [role="tablist"] [role="tab"]');
      await expect(tabs).toHaveCount(2);

      const selected = page.locator('main [role="tablist"] [role="tab"][aria-selected="true"]');
      await expect(selected).toBeVisible();
      // Tab order is fa then ckb; index 0 = Persian, index 1 = Kurdish.
      const index = await tabs.evaluateAll(
        (els, active) => els.findIndex((el) => el === active),
        await selected.elementHandle()
      );
      expect(index).toBe(expected === 'fa' ? 0 : 1);
    }
  });

  /*
   * Tailwind rewrites :dir(rtl) to :lang(ckb|fa|…); icons must still respect
   * the grammar LTR island, so the quiz back arrow is not mirrored.
   */
  for (const locale of ['fa', 'ckb'] as const) {
    test(`grammar quiz back arrow is not mirrored under ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/grammar/quiz?topics=1&n=10&seed=7`, {
        waitUntil: 'domcontentloaded',
      });
      await settle(page);

      const flip = await page.evaluate(() => {
        const icon = document.querySelector('.grammar-quiz-page svg.rtl-flip');
        if (!icon) return null;
        const t = getComputedStyle(icon).transform;
        return { transform: t, mirrored: t.includes('-1') };
      });

      expect(flip, 'expected the quiz back icon').not.toBeNull();
      expect(flip!.mirrored).toBe(false);
    });
  }

  /*
   * Explanation card is translated Arabic-script UI: under fa/ckb it must be
   * an RTL island (icon to the right of the heading) inside the LTR grammar page.
   */
  for (const locale of ['fa', 'ckb'] as const) {
    test(`grammar explanation card is RTL under ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/grammar/quiz?topics=1&n=10&seed=7`, {
        waitUntil: 'domcontentloaded',
      });
      await settle(page);

      await page.locator('main button[aria-pressed]').first().click();
      const card = page.locator('main .jelly-card').first();
      await expect(card).toHaveAttribute('dir', 'rtl');

      const order = await card.evaluate((el) => {
        const row = el.querySelector('.text-primary');
        const icon = row?.querySelector('svg');
        const title = row?.querySelector('span');
        if (!icon || !title) return null;
        const cardBox = el.getBoundingClientRect();
        const iconBox = icon.getBoundingClientRect();
        const titleBox = title.getBoundingClientRect();
        return {
          iconLeft: iconBox.left,
          titleLeft: titleBox.left,
          // Heading cluster should sit on the physical right half of the card.
          titleOnRightHalf: titleBox.left > cardBox.left + cardBox.width / 2,
        };
      });

      expect(order, 'expected explanation heading with icon + title').not.toBeNull();
      expect(order!.iconLeft).toBeGreaterThan(order!.titleLeft);
      expect(order!.titleOnRightHalf).toBe(true);
    });
  }

  /*
   * Grammar search hint is translated; under fa/ckb the icon must sit on the
   * right while topic cards stay LTR.
   */
  for (const locale of ['fa', 'ckb'] as const) {
    test(`grammar search field is RTL under ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/grammar`, { waitUntil: 'domcontentloaded' });
      await settle(page);

      const search = page.locator('main input[type="search"]').first();
      await expect(search).toHaveAttribute('dir', 'rtl');

      const order = await page.evaluate(() => {
        const input = document.querySelector('main input[type="search"]');
        const icon = input?.parentElement?.querySelector('svg');
        if (!input || !icon) return null;
        const inputBox = input.getBoundingClientRect();
        const iconBox = icon.getBoundingClientRect();
        return {
          iconLeft: iconBox.left,
          inputMid: inputBox.left + inputBox.width / 2,
        };
      });

      expect(order, 'expected search input with icon').not.toBeNull();
      expect(order!.iconLeft).toBeGreaterThan(order!.inputMid);
    });
  }

  /* Red/green verdict card — same RTL rule as the explanation block. */
  for (const locale of ['fa', 'ckb'] as const) {
    test(`grammar quiz feedback card is RTL under ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/grammar/quiz?topics=1&n=10&seed=7`, {
        waitUntil: 'domcontentloaded',
      });
      await settle(page);

      await page.locator('main button[aria-pressed]').first().click();
      const card = page.locator('main [data-quiz-feedback]').first();
      await expect(card).toHaveAttribute('dir', 'rtl');

      const order = await card.evaluate((el) => {
        const row = el.querySelector('p.flex');
        const icon = row?.querySelector('svg');
        const label = row?.querySelector('span');
        if (!icon || !label) return null;
        const cardBox = el.getBoundingClientRect();
        const labelBox = label.getBoundingClientRect();
        return {
          iconLeft: icon.getBoundingClientRect().left,
          labelLeft: labelBox.left,
          labelOnRightHalf: labelBox.left > cardBox.left + cardBox.width / 2,
        };
      });

      expect(order, 'expected feedback row with icon + label').not.toBeNull();
      expect(order!.iconLeft).toBeGreaterThan(order!.labelLeft);
      expect(order!.labelOnRightHalf).toBe(true);
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

    /*
     * The app's three non-account destinations are real links in the header at
     * desktop width — Home, Grammar, Play. Books and speaking are not among
     * them: the home page is the book browser, as it is in the app.
     */
    const header = page.locator('header');
    await expect(header.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Grammar' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Play' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Vocabulary' })).toHaveCount(0);

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
    await page.goto('/en/grammar/quiz?topics=1&n=10&seed=7', {
      waitUntil: 'domcontentloaded',
    });
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
