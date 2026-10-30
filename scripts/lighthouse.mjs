/**
 * Lighthouse budgets for the three key pages.
 *
 * ui-ux-spec.md §7 and §9 item 4: mobile scores of 90 or better for
 * Performance, Accessibility, Best Practices and SEO, on the home page, a book
 * page and a quiz page.
 *
 *   node scripts/lighthouse.mjs [baseUrl]
 *
 * It needs a production build running — `pnpm build && pnpm start`. Dev-mode
 * numbers are meaningless here.
 */
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3210';

const PAGES = [
  { name: 'home', path: '/en' },
  { name: 'book', path: '/en/books/2' },
  { name: 'quiz', path: '/en/grammar/topics/1/quiz?n=10' },
];

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const BUDGET = 90;

async function run() {
  const chrome = await launch({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  });

  const rows = [];
  let failed = false;

  try {
    for (const page of PAGES) {
      const result = await lighthouse(
        `${BASE}${page.path}`,
        { port: chrome.port, output: 'json', logLevel: 'error' },
        // Mobile is the budget that matters: it is where most readers are.
        { extends: 'lighthouse:default', settings: { formFactor: 'mobile', screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false } } }
      );

      const scores = Object.fromEntries(
        CATEGORIES.map((c) => [c, Math.round((result.lhr.categories[c]?.score ?? 0) * 100)])
      );

      const vitals = {
        lcp: result.lhr.audits['largest-contentful-paint']?.numericValue ?? 0,
        cls: result.lhr.audits['cumulative-layout-shift']?.numericValue ?? 0,
      };

      rows.push({ page: page.name, ...scores, ...vitals });
      if (CATEGORIES.some((c) => scores[c] < BUDGET)) failed = true;
    }
  } finally {
    await chrome.kill();
  }

  console.log(
    ['page', ...CATEGORIES, 'LCP(s)', 'CLS'].map((h) => String(h).padEnd(16)).join('')
  );
  for (const row of rows) {
    console.log(
      [
        row.page,
        ...CATEGORIES.map((c) => row[c]),
        (row.lcp / 1000).toFixed(2),
        row.cls.toFixed(3),
      ]
        .map((v) => String(v).padEnd(16))
        .join('')
    );
  }

  if (failed) {
    console.error(`\nAt least one category is below ${BUDGET}.`);
    process.exit(1);
  }
  console.log(`\nAll categories at or above ${BUDGET}.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
