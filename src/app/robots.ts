import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://erfaninfo.com').replace(
  /\/+$/,
  ''
);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Study tools and search results are not useful in an index, and the
      // status page is not public.
      disallow: ['/status', '/internal/', '/*/search', '/*/flashcards'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
