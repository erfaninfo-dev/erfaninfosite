# Erfan Academy Web

The web version of the Erfan Academy app — IELTS vocabulary, grammar, speaking
and word games, in English, Persian and Sorani Kurdish.

## The architecture, in one screen

**The website is a client of `wordsapi`. It owns no data.**

The vocabulary, grammar, speaking and game content lives in a MySQL database
behind a PHP JSON API at `https://erfaninfo.com/wordsapi/`. The Flutter app
reads it. This website reads the same API, and stores nothing of its own:

- **No data in the repository.** No JSON dumps, no seed files, no hard-coded
  books, words or questions. The only fixtures are small synthetic ones in the
  unit tests.
- **No database access.** The site has no MySQL credentials and contains no SQL.
- **Every call happens on the server.** Server Components and Route Handlers
  talk to the API; the browser never sees its hostname. An end-to-end test
  asserts this.
- **One typed layer.** `src/lib/api/` is the only place an endpoint URL exists.
  Every response is validated with zod and normalized once.

Because nothing is copied, the two clients cannot drift. **Sync is not a
feature — it is the absence of a second copy.** The only delay is caching: 60
seconds for catalog data, 5 minutes for the large, rarely-edited payloads. Edit
a book in the admin and the website shows it within a minute; delete one and its
page returns a real 404 and leaves the sitemap.

```
browser  ──▶  Next.js server  ──▶  wordsapi (PHP)  ──▶  MySQL
              ▲ validate, normalize, cache
              └ the browser never reaches past here
```

## Getting started

```bash
pnpm install
```

```bash
cp .env.example .env.local
```

```bash
pnpm dev
```

## The commands that matter

| Command | What it does |
|---|---|
| `pnpm verify` | lint, typecheck, unit tests and the live contract check |
| `pnpm contract:check` | calls every endpoint and validates it against the schemas |
| `pnpm e2e` | layout, accessibility and journey tests against a production build |
| `pnpm i18n:import` | re-imports the app's translations from its `.arb` files |

`pnpm verify` must pass before any deploy. `contract:check` is how a backend
field rename is caught early instead of silently blanking a page.

## Where things are

```
src/lib/api/        the only module that knows the API
  client.ts         fetch wrapper: timeouts, retries, concurrency cap, JSON guard
  schemas.ts        zod, one per endpoint, matched against live responses
  normalize.ts      seven language-field conventions → { en, fa, ckb }
  queries.ts        cached, tagged accessors that pages call
src/lib/i18n/       locales, the imported .arb catalogs, ICU formatting
src/lib/quiz/       grammar quiz scoring, ported from the app
src/components/     ui primitives, layout, and the feature components
src/app/[locale]/   the pages
docs/               how all of this was decided
scripts/            contract check, .arb import
tests/              unit tests and the Playwright suite
```

## Things worth knowing before changing anything

- **UI language and content language are separate.** `/en` means an English
  interface with Persian or Kurdish meanings — the API has no English gloss,
  because English is the source language. This mirrors the app.
- **The API names Kurdish four ways** (`kur`, `ckb`, `ku`, `_en_kur`) across
  seven field conventions. All of it is reconciled in `normalize.ts` and
  nowhere else.
- **Quiz scoring must match the app exactly.** The rules are in
  `src/lib/quiz/scoring.ts` with the Dart they were ported from, and are covered
  by tests. Changing them makes the two clients disagree.
- **UI strings come from the app**, imported from its `.arb` files. Do not write
  Persian or Kurdish copy for anything the app already names. The handful of
  web-only strings live in one reviewable file.
- **Deleted items must 404.** The API returns `200 []` for a missing item's
  children, so existence is resolved from the list endpoint. The layout
  deliberately does not stream, because a streamed response is locked at 200.

## Documentation

| Document | What it covers |
|---|---|
| [`docs/app-inventory.md`](docs/app-inventory.md) | what the Flutter app does, and the behaviour the web must match |
| [`docs/api-contract.md`](docs/api-contract.md) | every endpoint's real shape, and where the spec was wrong |
| [`docs/design-tokens.md`](docs/design-tokens.md) | app value → web token, with contrast measurements |
| [`docs/phase-0-plan.md`](docs/phase-0-plan.md) | route map, folder structure, caching table, risks |
| [`docs/decisions.md`](docs/decisions.md) | the four decisions that shaped the build |
| [`docs/deploy-cpanel.md`](docs/deploy-cpanel.md) | deploying, and the check that protects the mobile app |
| [`docs/updating.md`](docs/updating.md) | content changes need no deploy; code changes do |

## Scope

Phase 1: the public study site. No accounts, no login, no saved progress.
Everything is readable by anyone and indexable by search engines.
