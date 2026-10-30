import { expect, test } from '@playwright/test';

/**
 * The two non-localised routes, and the status codes they must return.
 *
 * Both are guarded by a secret, and both must answer a wrong secret with a real
 * status rather than a 200 carrying an error page. That is easy to break: Next
 * starts the response at the first `<Suspense>` boundary and the status is
 * fixed from then on, so adding one above a guard silently turns a 404 into a
 * soft 404. These tests catch that.
 */

const STATUS_SECRET = process.env.STATUS_SECRET ?? 'local-dev-status';
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET ?? 'local-dev-revalidate';

test.describe('/status', () => {
  test('is a real 404 without the secret', async ({ request }) => {
    expect((await request.get('/status')).status()).toBe(404);
  });

  test('is a real 404 with the wrong secret', async ({ request }) => {
    expect((await request.get('/status?key=definitely-wrong')).status()).toBe(404);
  });

  test('reports endpoint health with the right secret', async ({ request }) => {
    const response = await request.get(`/status?key=${STATUS_SECRET}`);
    expect(response.status()).toBe(200);

    const body = await response.text();
    // It reads through the same cached layer the pages use, so these counts are
    // what visitors are being served.
    expect(body).toContain('reachable');
    expect(body).toMatch(/books/);
  });

  test('is not indexable', async ({ request }) => {
    const body = await (await request.get(`/status?key=${STATUS_SECRET}`)).text();
    expect(body).toMatch(/noindex/);
  });
});

test.describe('/internal/revalidate', () => {
  // Deliberately not /api/revalidate: /api/ exists on disk on the production
  // host and serves real downloads. See docs/decisions.md D1.
  const url = '/internal/revalidate';

  test('rejects a request with no secret', async ({ request }) => {
    const response = await request.post(url, { data: { tags: ['books'] } });
    expect(response.status()).toBe(401);
  });

  test('rejects a wrong secret', async ({ request }) => {
    const response = await request.post(url, {
      headers: { 'x-revalidate-secret': 'definitely-wrong' },
      data: { tags: ['books'] },
    });
    expect(response.status()).toBe(401);
  });

  test('rejects GET', async ({ request }) => {
    expect((await request.get(url)).status()).toBe(405);
  });

  test('rejects a body that is not { tags: string[] }', async ({ request }) => {
    const response = await request.post(url, {
      headers: { 'x-revalidate-secret': REVALIDATE_SECRET },
      data: { nope: true },
    });
    expect(response.status()).toBe(400);
  });

  test('revalidates known tags and reports unknown ones', async ({ request }) => {
    const response = await request.post(url, {
      headers: { 'x-revalidate-secret': REVALIDATE_SECRET },
      data: { tags: ['books', 'not-a-real-tag'] },
    });

    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      revalidated: string[];
      rejected: string[];
      knownTags: string[];
    };

    // Only allowlisted tags are acted on, so a caller cannot flood the cache
    // with arbitrary keys.
    expect(body.revalidated).toEqual(['books']);
    expect(body.rejected).toEqual(['not-a-real-tag']);
    expect(body.knownTags).toContain('grammar');
  });
});

test.describe('SEO files', () => {
  test('robots.txt points at the sitemap and hides the private routes', async ({
    request,
  }) => {
    const body = await (await request.get('/robots.txt')).text();
    expect(body).toContain('Sitemap:');
    expect(body).toContain('/status');
    expect(body).toContain('/internal/');
  });

  test('sitemap.xml is generated from live data and lists all three locales', async ({
    request,
  }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);

    const body = await response.text();
    // Built from the API, so real catalog ids appear and a deleted one leaves.
    expect(body).toContain('/en/books/');
    expect(body).toContain('/fa/grammar/topics/');
    expect(body).toContain('/ckb/play/');
    // hreflang alternates for every entry.
    expect(body).toContain('hreflang');
  });
});
