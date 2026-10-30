import type { MetadataRoute } from 'next';

import {
  getBooks,
  getGameCategorySummaries,
  getGrammarBooks,
  getGrammarTopics,
  getSpeakingModels,
  getSpeakingTopics,
  getUnits,
} from '@/lib/api/queries';
import { LOCALES } from '@/lib/i18n/config';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://erfaninfo.com').replace(
  /\/+$/,
  ''
);

/**
 * The sitemap is generated from live API data, so a deleted book or topic
 * disappears from it on the next revalidation, and a new one appears without
 * anyone touching the website.
 *
 * It uses the same cached query layer as the pages, so building it costs no
 * extra API calls beyond what a visitor would already have warmed, and it
 * inherits their 60-second freshness rather than needing a `revalidate` export
 * (which Cache Components does not allow).
 *
 * Unit pages are included only for the first few books: with 33 books averaging
 * a dozen units each, listing every one would make a large sitemap out of pages
 * that are better discovered by crawling from the book page.
 */
function entry(path: string, priority: number): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    priority,
    // Every page exists in all three languages; declare them as alternates.
    alternates: {
      languages: Object.fromEntries(
        LOCALES.map((l) => [l, `${SITE_URL}${path.replace(/^\/[a-z]+/, `/${l}`)}`])
      ),
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [books, grammarBooks, grammarTopics, speakingTopics, speakingModels, categories] =
    await Promise.all([
      getBooks(),
      getGrammarBooks(),
      getGrammarTopics(),
      getSpeakingTopics(),
      getSpeakingModels(),
      getGameCategorySummaries(),
    ]);

  const out: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    const base = `/${locale}`;

    out.push(entry(base, 1));
    for (const section of ['/books', '/grammar', '/speaking', '/play', '/download']) {
      out.push(entry(`${base}${section}`, 0.8));
    }

    for (const book of books) out.push(entry(`${base}/books/${book.id}`, 0.7));
    for (const book of grammarBooks)
      out.push(entry(`${base}/grammar/books/${book.id}`, 0.7));
    for (const topic of grammarTopics) {
      out.push(entry(`${base}/grammar/topics/${topic.id}`, 0.7));
    }
    for (const topic of speakingTopics) {
      out.push(entry(`${base}/speaking/topics/${topic.id}`, 0.7));
    }
    for (const model of speakingModels) {
      out.push(entry(`${base}/speaking/models/${model.id}`, 0.5));
    }
    for (const category of categories)
      out.push(entry(`${base}/play/${category.slug}`, 0.6));
  }

  // Unit pages for the first few books, as deeper discovery points.
  for (const locale of LOCALES) {
    for (const book of books.slice(0, 5)) {
      const units = await getUnits(book.id);
      for (const unit of units) {
        out.push(entry(`/${locale}/books/${book.id}/units/${unit.unit}`, 0.5));
      }
    }
  }

  return out;
}
