import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { test } from '@playwright/test';

import { LOCALES, MAIN_PAGES, SCREENSHOT_WIDTHS, THEMES } from './pages';

/**
 * The screenshot matrix ui-ux-spec.md §9 item 1 requires:
 * every main page × 5 widths × 3 locales × 2 themes.
 *
 * It writes files rather than comparing against baselines: the point is to
 * produce a set that can be looked at before a phase is called done. Run it
 * with `pnpm e2e -- screenshots`.
 *
 * It is tagged @matrix so the normal suite does not pay for ~570 screenshots.
 */

const OUT = join(process.cwd(), 'test-results', 'matrix');

test.describe('@matrix screenshot matrix', () => {
  test.skip(
    !process.env.SCREENSHOT_MATRIX,
    'set SCREENSHOT_MATRIX=1 to generate the full matrix'
  );

  for (const def of MAIN_PAGES) {
    for (const width of SCREENSHOT_WIDTHS) {
      for (const locale of LOCALES) {
        for (const theme of THEMES) {
          test(`${def.name} ${width} ${locale} ${theme}`, async ({ page, context }) => {
            await context.addCookies([
              {
                name: 'erfan_theme',
                value: theme,
                url: 'http://127.0.0.1:3210',
              },
            ]);

            await page.setViewportSize({ width, height: 900 });
            await page.goto(def.path(locale), { waitUntil: 'domcontentloaded' });
            await page.waitForLoadState('networkidle');
            // Let skeletons swap for real content before capturing.
            await page.waitForTimeout(400);

            const dir = join(OUT, def.name);
            mkdirSync(dir, { recursive: true });

            await page.screenshot({
              path: join(dir, `${width}-${locale}-${theme}.png`),
              fullPage: true,
            });
          });
        }
      }
    }
  }
});
