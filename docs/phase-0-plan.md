# Phase 0 plan — Erfan Academy Web

Deliverable 4 of Phase 0. Depends on [`app-inventory.md`](app-inventory.md),
[`api-contract.md`](api-contract.md) and [`design-tokens.md`](design-tokens.md).
Erfan's answers are recorded in [`decisions.md`](decisions.md) and are folded in below.

**Nothing here is built yet.** This is the plan to approve before any feature code.

**Scope per D2: Phase 1 only** — the public study site, no login. Sections below that mention
Phase 2+ are marked as such and are not being built.

---

## 1. Architecture in one paragraph

A Next.js App Router site that is **a client of `wordsapi` and owns no data**. Every API call
happens in a Server Component, Route Handler or Server Action; the browser never sees the API's
hostname. `src/lib/api/` is the only module that knows an endpoint URL. Responses are validated
with zod, normalized to `{en, fa, ckb}` once, cached by tag with a 30–60 s revalidation window, and
sliced down before anything reaches the browser. Because nothing is copied, sync is automatic and
the only question is how stale the cache is allowed to be.

## 2. Route map

Mirroring the app's own URL structure (`lib/core/router/`) so the IA is recognisable, with
`[locale]` in front and the app's two-path book structure (sectioned and unsectioned books both
exist — see `api-contract.md` §1) preserved.

```
/[locale]                                              home
/[locale]/books                                        vocabulary catalog, grouped by series + track
/[locale]/books/[bookId]                               book overview: units, PDFs, actions
/[locale]/books/[bookId]/units/[unit]                  words of a unit  (unsectioned books)
/[locale]/books/[bookId]/units/[unit]/sections         section list     (sectioned books)
/[locale]/books/[bookId]/units/[unit]/sections/[s]     words of a section
/[locale]/books/[bookId]/units/[unit]/samples          bilingual reading samples
/[locale]/books/[bookId]/flashcards                    flashcards over a chosen set
/[locale]/grammar                                      grammar hub: books + topics
/[locale]/grammar/books/[bookId]                       units of a grammar book
/[locale]/grammar/books/[bookId]/units/[unitId]        unit lesson text + link to topic quiz
/[locale]/grammar/topics                               all 60 topics, "new" badge
/[locale]/grammar/topics/[topicId]                     topic overview + PDFs + start quiz
/[locale]/grammar/topics/[topicId]/quiz                the quiz
/[locale]/speaking                                     speaking hub (Part 1 only — see note)
/[locale]/speaking/topics/[topicId]                    questions + answers in 3 languages
/[locale]/speaking/topics/[topicId]/ideas              idea bank by category
/[locale]/speaking/models/[modelId]                    model answer: formula, template, questions
/[locale]/play                                         game categories
/[locale]/play/[slug]                                  one category: flashcards + matching game
/[locale]/download                                     app version, release notes, Android/Windows
/[locale]/search                                       cross-content search
/status                                                secret-protected health + contract check
/internal/revalidate                                   POST, secret-protected, revalidate by tag
/sitemap.xml  /robots.txt                              generated from live API data
```

Three notes on this map:

- **Speaking is not split by part.** `?part=2` and `?part=3` return `[]` and the app's own route is
  literally `/speaking/part1`. Building a part switcher would lead users to empty pages. The route
  is part-agnostic so parts 2 and 3 can be added without breaking links.
- **Grammar quizzes hang off topics, not units.** `grammar_questions?unit_id=` returns `[]` and
  `grammar_book_id`/`grammar_unit_id` are null on every row. The unit page links to the lesson text
  and to the matching topic quiz instead of promising a unit quiz that would be empty.
- **Routing by `topic_id`, not topic name**, even though the API accepts both — names contain spaces
  and slashes (`"A / An"`) and would make ugly, fragile URLs.

### Locale handling

`/en`, `/fa`, `/ckb`, with `fa` and `ckb` set `dir="rtl"`. `/` redirects by `Accept-Language`,
defaulting to `en`. Canonical URL per locale, `hreflang` alternates on every page, `x-default` to
`/en`.

**Separate from the locale**, the gloss language (`fa` or `kur`) is a cookie-backed toggle visible
in the header, because the app treats UI language and content language independently
(`app-inventory.md` §2). Default: `ckb` locale to Kurdish gloss, otherwise Persian.

## 3. Folder structure

```
src/
  app/
    [locale]/
      layout.tsx                 html lang/dir, fonts, theme, nav shell
      page.tsx                   home
      books/…  grammar/…  speaking/…  play/…  download/  search/
      error.tsx  not-found.tsx  loading.tsx
    api/revalidate/route.ts
    status/page.tsx
    sitemap.ts  robots.ts
  lib/
    api/
      client.ts        fetch wrapper: timeout, retry, concurrency cap, UA, JSON guard
      endpoints.ts     the ONLY place endpoint URLs exist
      schemas.ts       zod, one per endpoint, tolerant of unknown fields
      normalize.ts     every language-field convention -> {en, fa, ckb}
      queries.ts       cached, tagged accessors the pages call
      errors.ts        ApiError / ValidationError / NotJsonError
    i18n/
      messages/{en,fa,ckb}.json  generated from the app's .arb files
      config.ts  request.ts  format.ts   (digits, dates, plurals)
    content-language.ts            gloss selection + the mojibake-safe fallback chain
    icons/category-icons.ts        51 Flutter icon names -> web icons
  components/
    ui/                            the base inventory from ui-ux-spec.md §4
    layout/                        header, bottom bar, sidebar, footer
    features/{vocab,grammar,speaking,games}/
scripts/
  contract-check.ts                live contract drift check
  import-arb.ts                    .arb -> messages/*.json
  gen-tokens.ts                    seeds -> CSS custom properties
tests/
  unit/        normalizers, schemas, quiz scoring, SM-2
  e2e/         Playwright: journeys, screenshot matrix, overflow, axe
docs/
```

## 4. Caching table

> **As built.** The table below is what shipped. One implementation detail
> changed during the build: caching is done with Next's Data Cache
> (`fetch(..., { next: { revalidate, tags } })`) rather than Cache Components'
> `use cache` directive. Cache Components was the first choice and expressed
> this table more neatly, but with Partial Prerendering the response commits a
> `200` before the page body runs, so a `notFound()` produced a soft 404 — and
> "delete an item, the page returns 404" is in the definition of done. The Data
> Cache gives the same windows, the same stale-while-revalidate behaviour and
> the same tag invalidation, so every row here holds. See `next.config.ts`.

Server data cache, revalidate-by-time plus revalidate-by-tag. `stale-while-revalidate` semantics:
a stale entry is served instantly while the refresh runs, so nobody waits on the origin.

| Endpoint | Tag | TTL | Why |
|---|---|---|---|
| `books.php` | `books` | 60 s | catalog; the spine of the site |
| `units.php?book_id` | `book:{id}` | 60 s | changes with the book |
| `words.php?book_id` | `book:{id}:words` | 60 s | 864 KB / 10.4 s — never sent to the browser whole |
| `sections.php?book_id&unit` | `book:{id}` | 60 s | |
| `unit_samples.php?book_id&unit` | `book:{id}` | 60 s | |
| `book_pdfs.php` | `books` | 300 s | 2 rows, rarely edited |
| `grammar_books.php` | `grammar` | 60 s | |
| `grammar_units.php?book_id` | `grammar:book:{id}` | 60 s | |
| `grammar_unit_texts.php?unit_id` | `grammar:unit:{id}` | 60 s | |
| `grammar_topics.php` | `grammar` | 60 s | drives "what's new" |
| `grammar_questions.php?topic_id` | `grammar:topic:{id}` | 60 s | 212 KB; sliced before sending |
| `grammar_topic_pdfs.php` | `grammar` | 300 s | |
| `speaking_topics.php` | `speaking` | 60 s | |
| `speaking_model_questions.php` | `speaking` | 60 s | |
| `speaking_questions.php?topic_id\|model_id` | `speaking:{kind}:{id}` | 60 s | |
| `speaking_topic_ideas.php?topic_id` | `speaking:topic:{id}` | 60 s | |
| `game_word_categories.php` | `games` | 300 s | 402 KB; one fetch feeds all 51 category pages |
| `app_update.php` | `app-update` | 300 s | version metadata |
| anything authenticated (Phase 2+) | — | **no cache** | per-user |

All well inside the brief's 30–60 s window, and **far shorter than the app's own 25 min to 3 days**
(`app-inventory.md` §6) — the website will be fresher than the phone, not staler.

`generateStaticParams` is used only for the locale segment. Book, topic and category ids are **not**
pre-rendered into build output, so a deleted item cannot survive as a stale static page.

### How a deletion becomes a 404

`api-contract.md` §0 is the constraint: a deleted row returns **200 with `[]`**, not a 404 — except
`speaking_questions`, which does 404 properly. So:

1. A detail page resolves its parent from the **list** endpoint (`books.php`, `grammar_topics.php`, …).
2. If the id is absent from that list, call `notFound()`.
3. An empty child list is rendered as a real empty state, never as a 404 — a book with no units yet
   is legitimate and must not disappear.

This gives the behaviour the definition of done asks for (delete an item, page 404s within one
revalidation window) without mistaking "empty" for "gone".

### `/internal/revalidate`

`POST`, `x-revalidate-secret` compared with `timingSafeEqual` against `REVALIDATE_SECRET`, body
`{ tags: string[] }` against an allowlist of known tags. Documented, optional, not required for
correctness. **It needs no change to your PHP or database** — it only becomes useful if you later
decide to have the admin ping it. I will not touch the backend.

**Not at `/api/revalidate`**, which is Next.js's default home for route handlers: `/api/` already
exists on disk on the host and serves real downloads (`/api/Erf.apk` returns an APK — verified).
Every route handler in this project lives under `/internal/` so it cannot collide with a real file.
`src/app/[locale]/` must likewise never contain a `wordsapi`, `api` or `apk` segment.

## 5. Layout plan (`ui-ux-spec.md` §11 deliverable 2)

### Navigation per breakpoint

| Width | Model |
|---|---|
| **< 768** | Sticky top bar: logo, locale switcher, gloss toggle, theme toggle, search icon. **Bottom bar** with 5 destinations — Home, Vocabulary, Grammar, Speaking, Play (the five things a logged-out visitor can do, per D2). Its `5rem` height is reserved as `padding-block-end` on every page so it never covers the last row or a submit button. |
| **768–1023** | Top bar with the 5 destinations as text links, no bottom bar, no hamburger. Secondary items (Download, Status) in a small overflow menu. |
| **≥ 1024** | Persistent left sidebar (right in RTL) with the 5 destinations and the current section marked. Top bar keeps the switchers. **No hamburger at any desktop width.** |

A **bottom bar** rather than a drawer on phone, because the app uses one and goal 1 is
recognisability; also, a drawer hides the primary IA behind a tap, and this is a browsing-heavy
product. The locale switcher is in the top bar at **every** size, never behind a menu — it is how
someone recovers from landing in the wrong language.

### Containers

`--container-prose 42rem` for study text · `--container-quiz 40rem` for the quiz card ·
`--container-content 72rem` standard · `--container-wide 90rem` for word grids.
Gutters 16 / 24 / 32 px, each wrapped in `max(…, env(safe-area-inset-*))`.

### The three hard screens

**Word list** — up to 1,888 rows.

```
┌──────────────────────────────────────────┐
│ ← Book title · Unit 3            [search]│  sticky
│ [All ▾] [Important] [noun ▾]             │  filters, URL-reflected
├──────────────────────────────────────────┤
│ abandon      verb        رها کردن    ☆  │  ← virtualised rows
│ abstract     adjective   انتزاعی     ☆  │     ~64px each
│ …                                        │
└──────────────────────────────────────────┘
```

Phone: one column, compact rows, tap expands in place to show the example in both scripts.
Tablet: two columns. Desktop: list plus a detail pane that fills on selection, so no navigation is
needed to read an example. `@tanstack/react-virtual` above 200 rows — 1,888 DOM nodes is not an
option. Search debounced 250 ms, written to the URL, clearable in one action. Scroll position
restored on back.

**Quiz** — centred, capped at `40rem`, never stretched.

```
        ┌────────────────────────────┐
        │ Question 7 of 20    ▓▓▓░░░ │  progress always visible
        │                            │
        │ ______ am learning English │
        │                            │
        │ [ A  I          ]          │  stacked, full-width,
        │ [ B  Me         ]          │  ≥44px, 8px apart
        │ [ C  My         ]          │
        │ [ D  Mine       ]          │
        │                            │
        │ ✓ Correct · explanation…   │  announced politely
        │              [ Next → ]    │  thumb reach on phone
        └────────────────────────────┘
```

Options stay **stacked at every width** — the option texts here are short but not uniformly so, and
a 2×2 grid that reflows badly for one long Kurdish option is worse than a consistent column.
Options render in `option1→option4` order, **unshuffled**, empty ones dropped, matching
`app-inventory.md` §4.1 exactly. Explanation appears below the chosen option so the user never
scrolls back up. Answers are final once chosen, as in the app.

**Results**

```
┌───────────────────────────────┐
│        17 / 20                │  ScoreSummary
│        ▓▓▓▓▓▓▓▓▓░             │
│  [Retry wrong (3)] [All again]│
├───────────────────────────────┤
│ ✗ Q4  your: Me   correct: I   │  ← below md: cards
│      explanation…             │     at md+: a real table
└───────────────────────────────┘
```

Per `ui-ux-spec.md` §2.5, this is a table at `md` and above and **cards below it** — never a
`<table>` at 360 px.

### Four states

Every data screen gets loading (skeleton matching the final layout, not a spinner), empty (with a
next action), error (in the active language, with retry), loaded. Sections stream independently
with Suspense so one slow endpoint — `words.php` at 10.4 s — never blocks the page.

## 6. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **`words.php` takes 10.4 s**, over the brief's 8 s timeout | **Settled by D4: web-side only.** 8 s default, **20 s for `words.php`**; 60 s per-book cache; stale-while-revalidate; server-side slicing to ~130 words per unit page; cache warming. The PHP is not touched. |
| R2 | `app_update.php` returns **`http://`** download URLs; mixed content on an HTTPS page | Normalizer upgrades the scheme to `https://` (verified working on `erfaninfo.com`), falling back to the original if a HEAD check fails. No backend change. |
| R3 | No ETag / no webhook — freshness is TTL-only | 60 s TTL meets the requirement; `/api/revalidate` offered for later. |
| R4 | 402 KB games + 864 KB words payloads are all-or-nothing | Server-side fetch + cache + per-view slicing; never shipped to the browser. |
| R5 | **Deleted item returns 200 `[]`, not 404** | Parent-list existence check drives `notFound()` (§4). |
| R6 | Unknown endpoint returns an **HTML page** | Client checks `content-type` and guards JSON parsing with a distinct error type. |
| R7 | `unit_samples` returns **quoted numbers** | `z.coerce.number()` for that endpoint only; normalized away immediately. |
| R8 | `"0000-00-00 00:00:00"` and non-ISO timestamps | Kept as strings; explicit parser; zero-date treated as unknown. |
| R9 | 51 Flutter icon names with no web equivalent | Explicit map in `src/lib/icons/`, with a default for unmapped names. |
| R10 | **SRS progress cannot sync** — it is device-local in the app, with no endpoint | Web review state is its own, in local storage, and the UI says so plainly rather than implying it syncs. |
| R11 | Shared cPanel + Passenger memory limits | Short TTLs mean a small cache; no build-time data fetching; `server.js` documented in `docs/deploy-cpanel.md`. |
| **R13** | The Node app takes the root of `erfaninfo.com` (D1), and `wordsapi` lives at `/wordsapi/` on that same origin. | **Downgraded from blocker to a deploy-time check**, after measuring it live. A Next.js app is *already* running on the root under Passenger, and with it live `/wordsapi/books.php`, `/apk/app.apk` and `/api/Erf.apk` all still return 200 — Apache serves files that exist on disk before Passenger sees the request. No `.htaccess` surgery, proxy or subdomain move is needed. Two things remain: re-run those checks right after the first production deploy (a mandatory gate in `docs/deploy-cpanel.md`), and **never define a route that collides** — no `api`, `wordsapi` or `apk` segment; our one route handler lives at `/internal/revalidate`. |
| R12 | API load on shared hosting | 60 s TTL caps origin traffic at ~1,440 calls/endpoint/day **regardless of visitor count**, because the cache is server-side and shared. Concurrency capped at 3, as instructed. |

## 7. Order of work once approved

1. Scaffold: Next.js + TypeScript strict + Tailwind + zod + pnpm, tokens as CSS variables, fonts
   subsetted, `.arb` import script, lint/typecheck/format clean.
2. `src/lib/api/` complete with zod schemas and the normalizer, plus `pnpm contract:check` and unit
   tests for the normalizer, the quiz scoring rule and SM-2.
3. The `ui-ux-spec.md` §4 component inventory, with RTL, dark mode and the four states.
4. Vocabulary, then Grammar, then Speaking, then Play.
5. Home, search, download, SEO, sitemap, `/status`.
6. Verification: Playwright screenshot matrix (5 widths × 3 locales × 2 themes), overflow
   assertion, axe-core, Lighthouse; then a preview for you before Phase 1 is called done.
7. `docs/deploy-cpanel.md` and `docs/updating.md`, then deploy.

Steps 1 and 2 land before any page, so the data layer is proven against production before a single
screen is designed.
