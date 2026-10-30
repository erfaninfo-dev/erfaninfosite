import { notFound } from 'next/navigation';

import { clientConfig } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import {
  getAppUpdate,
  getBooks,
  getGameCategorySummaries,
  getGrammarTopics,
  getSpeakingTopics,
} from '@/lib/api/queries';

/**
 * Operational status.
 *
 * Shows whether the API is reachable, what each endpoint group last returned,
 * and the cache settings in force. Guarded by a secret in the query string, and
 * `noindex` — it is for Erfan, not for readers.
 *
 * It deliberately reads through the same cached query layer the site uses, so
 * what it reports is what visitors are actually being served, not a fresh
 * fetch that would hide a stale cache.
 */

type Check = { group: string; ok: boolean; detail: string };

async function check(group: string, run: () => Promise<string>): Promise<Check> {
  try {
    return { group, ok: true, detail: await run() };
  } catch (error) {
    const detail =
      error instanceof ApiError
        ? `${error.kind}${error.status ? ` ${error.status}` : ''}: ${error.message}`
        : 'unexpected failure';
    return { group, ok: false, detail };
  }
}

export default async function StatusPage({ searchParams }: PageProps<'/status'>) {
  const query = await searchParams;
  const secret = process.env.STATUS_SECRET;
  const provided = Array.isArray(query.key) ? query.key[0] : query.key;

  // Without a configured secret the page does not exist at all, so a
  // misconfigured deploy cannot accidentally expose it.
  if (!secret || provided !== secret) notFound();

  return (
    <main
      style={{ padding: '2rem', fontFamily: 'ui-monospace, monospace', maxWidth: 860 }}
    >
      <h1>Erfan Academy Web — status</h1>
      <p>
        The website is a client of <code>{clientConfig.baseUrl}</code> and owns no data.
      </p>

      <h2>Endpoint groups</h2>
      {/*
        No <Suspense> here. Next starts the response at the first Suspense
        boundary and the status is fixed at 200 from then on, so the guard above
        would answer a wrong key with the 404 page under a 200.
      */}
      <Checks />

      <h2>Client settings</h2>
      <ul>
        <li>Default timeout: {clientConfig.defaultTimeoutMs} ms</li>
        <li>
          Per-endpoint timeouts:{' '}
          {Object.entries(clientConfig.timeouts)
            .map(([k, v]) => `${k} ${v} ms`)
            .join(', ')}
        </li>
        <li>Max concurrency: {clientConfig.maxConcurrency}</li>
        <li>User-Agent: {clientConfig.userAgent}</li>
      </ul>

      <h2>Caching</h2>
      <ul>
        <li>catalog — 30 s stale / 60 s revalidate / 300 s expire</li>
        <li>catalogSlow — 60 s stale / 300 s revalidate / 1800 s expire</li>
        <li>
          On-demand invalidation: <code>POST /internal/revalidate</code>
        </li>
      </ul>

      <p style={{ marginTop: '2rem', opacity: 0.7 }}>
        Contract drift is checked separately with <code>pnpm contract:check</code>, which
        validates every endpoint against its schema.
      </p>
    </main>
  );
}

async function Checks() {
  const checks = await Promise.all([
    check('books', async () => `${(await getBooks()).length} books`),
    check('grammar', async () => `${(await getGrammarTopics()).length} topics`),
    check('speaking', async () => `${(await getSpeakingTopics()).length} topics`),
    check('games', async () => `${(await getGameCategorySummaries()).length} categories`),
    check('app-update', async () => {
      const update = await getAppUpdate();
      return `android ${update.android.versionName || '?'} · windows ${
        update.windows.versionName || '?'
      }`;
    }),
  ]);

  const failing = checks.filter((c) => !c.ok);

  return (
    <>
      <p>
        <strong>
          {checks.length - failing.length}/{checks.length} reachable
        </strong>
      </p>
      <table cellPadding={6} style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {checks.map((c) => (
            <tr key={c.group} style={{ borderTop: '1px solid #8884' }}>
              <td>{c.ok ? 'ok' : 'FAIL'}</td>
              <td>
                <strong>{c.group}</strong>
              </td>
              <td>{c.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
