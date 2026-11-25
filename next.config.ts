import type { NextConfig } from 'next';

/**
 * Caching lives in the fetch layer (src/lib/api/client.ts), not in Cache
 * Components.
 *
 * `cacheComponents` was the first choice, and `use cache` / `cacheLife` /
 * `cacheTag` expressed the caching table well. It had to go for one reason:
 * with Partial Prerendering the response commits a `200` before the page body
 * resolves, so a `notFound()` renders the 404 UI under a 200 — a soft 404.
 * Next documents this and mitigates it with a `noindex` tag, but the definition
 * of done for this project asks for a real 404 when an item is deleted, and
 * that check cannot be done in Proxy without fetching the catalog there.
 *
 * Next's Data Cache gives the same guarantees the brief asks for — time-based
 * revalidation, stale-while-revalidate, and tag invalidation through
 * `revalidateTag` — so nothing in the caching table is lost.
 */
const nextConfig: NextConfig = {
  // The API serves PDFs and the app APK from the same host.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'erfaninfo.com' }],
  },

  typedRoutes: true,

  // No `X-Powered-By: Next.js`.
  poweredByHeader: false,

  experimental: {
    agentUpgrade: 'security',
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
