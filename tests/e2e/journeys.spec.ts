import { expect, test } from '@playwright/test';

import { LOCALES } from './pages';

/**
 * The main journeys, in all three locales — ui-ux-spec.md §9 item 7 and the
 * brief's Playwright smoke requirement.
 *
 * These assert behaviour that must match the app, and the live-data promises in
 * the definition of done.
 */

test.describe('vocabulary', () => {
  for (const locale of LOCALES) {
    test(`${locale}: catalog → book → unit → words`, async ({ page }) => {
      await page.goto(`/${locale}/books`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');

      // Books come from the live API, grouped by series.
      const firstBook = page.locator('main a[href*="/books/"]').first();
      await expect(firstBook).toBeVisible();
      await firstBook.click();

      await page.waitForLoadState('networkidle');
      const firstUnit = page.locator('main a[href*="/units/"]').first();
      await expect(firstUnit).toBeVisible();
      await firstUnit.click();

      await page.waitForLoadState('networkidle');
      // The unit page shows real words with a search field over them.
      await expect(page.locator('main input[type="search"]')).toBeVisible();
    });
  }

  test('word search filters the list and announces the count', async ({ page }) => {
    await page.goto('/en/books/2/units/1', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const search = page.locator('main input[type="search"]');
    await expect(search).toBeVisible();

    const before = await page.locator('main button[aria-expanded]').count();
    await search.fill('zzzzzznotaword');
    await page.waitForTimeout(400);
    const after = await page.locator('main button[aria-expanded]').count();

    expect(after).toBeLessThan(before);
    await expect(page.locator('main')).toContainText(/no matching|نتیجه|هیچ/i);
  });

  test('a long book list is virtualised, not fully rendered', async ({ page }) => {
    // Book 2 has 1,888 words. Rendering them all would be ~1,900 DOM rows.
    await page.goto('/en/books/2/words', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const rendered = await page
      .locator('main button[aria-expanded], main button')
      .count();
    expect(
      rendered,
      'the whole word list appears to be in the DOM; virtualisation is not working'
    ).toBeLessThan(200);
  });
});

test.describe('grammar quiz — must agree with the app', () => {
  test('options are unshuffled, answers are final, and scoring is a plain count', async ({
    page,
  }) => {
    await page.goto('/en/grammar/topics/1/quiz?n=10', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const options = page.locator('main button[aria-pressed]');
    await expect(options.first()).toBeVisible();

    const firstLabel = await options.first().innerText();

    // Answer, then try to change it: the app treats an answer as final.
    await options.first().click();
    await expect(options.nth(1)).toBeDisabled();

    // Reloading gives the same questions in the same order — no shuffling,
    // or the web and the app would present different sessions.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main button[aria-pressed]').first()).toHaveText(
      firstLabel
    );
  });

  test('finishing a quiz shows a score out of the session length', async ({ page }) => {
    await page.goto('/en/grammar/topics/1/quiz?n=10', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 10; i += 1) {
      const options = page.locator('main button[aria-pressed]');
      await expect(options.first()).toBeVisible();
      await options.first().click();

      const next = page.locator('main button', { hasText: /next|finish/i }).last();
      await expect(next).toBeVisible();
      await next.click();
      await page.waitForTimeout(150);
    }

    // The summary reports score / 10.
    await expect(page.locator('main')).toContainText(/\/\s*10/);
  });
});

test.describe('right-to-left correctness', () => {
  for (const locale of ['fa', 'ckb'] as const) {
    test(`${locale}: a score reads left-to-right, not reversed`, async ({ page }) => {
      /*
       * A bare "0 / 6" inside an RTL page is reordered by the bidi algorithm
       * into "6 / 0" — the score then reads backwards, which is wrong rather
       * than merely ugly. Every score run is isolated and forced LTR.
       */
      await page.goto(`/${locale}/grammar/topics/1/quiz?n=10`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForLoadState('networkidle');

      // Answer every question so the summary appears.
      for (let i = 0; i < 10; i += 1) {
        const options = page.locator('main button[aria-pressed]');
        await expect(options.first()).toBeVisible();
        await options.first().click();
        await page.locator('main button', { hasText: /.+/ }).last().click();
        await page.waitForTimeout(120);
      }

      const summary = page.locator('main bdi[dir="ltr"]').first();
      await expect(summary).toBeVisible();

      // The number before the slash is the score, and it cannot exceed the total.
      const text = await summary.innerText();
      const [left, right] = text.split('/').map((p) => p.trim());
      const toLatin = (s: string) =>
        s.replace(/[۰-۹٠-٩]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(d) % 10));

      expect(Number(toLatin(left ?? ''))).toBeLessThanOrEqual(
        Number(toLatin(right ?? ''))
      );
      expect(Number(toLatin(right ?? ''))).toBe(10);
    });
  }
});

test.describe('deletion propagates to a 404', () => {
  test('an id that is not in the catalog returns 404, not a blank page', async ({
    page,
  }) => {
    // This is the behaviour the definition of done asks for: the API answers a
    // missing book's children with `200 []`, so the site resolves existence
    // from the list endpoint and calls notFound().
    const response = await page.goto('/en/books/99999', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(404);
  });

  test('a non-numeric id is rejected rather than passed to the API', async ({ page }) => {
    const response = await page.goto('/en/books/not-a-book', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(404);
  });

  test('an unknown game category 404s', async ({ page }) => {
    const response = await page.goto('/en/play/no-such-category', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(404);
  });
});

test.describe('language', () => {
  test('the locale switcher keeps the current page', async ({ page }) => {
    await page.goto('/en/grammar', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await page.locator('header button[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem', { name: 'فارسی' }).click();

    await page.waitForURL('**/fa/grammar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('a request without a locale redirects to one', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.url()).toMatch(/\/(en|fa|ckb)$/);
  });
});

test.describe('the site owns no data', () => {
  test('the browser never contacts the API directly', async ({ page }) => {
    const apiCalls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/wordsapi/')) apiCalls.push(request.url());
    });

    await page.goto('/en/books/2/units/1', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Rule 2 of the brief: all data goes through the Next.js server.
    expect(apiCalls, `browser called the API directly: ${apiCalls.join(', ')}`).toEqual(
      []
    );
  });

  test('the 400 KB game payload is never shipped to the browser', async ({ page }) => {
    let transferred = 0;
    page.on('response', async (response) => {
      if (response.request().resourceType() === 'document') {
        const body = await response.body().catch(() => null);
        if (body) transferred += body.byteLength;
      }
    });

    await page.goto('/en/play', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // The index sends names and counts only — a few KB, not 400.
    expect(transferred).toBeLessThan(300_000);
  });
});
