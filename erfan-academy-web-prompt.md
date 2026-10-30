# PROMPT: Build "Erfan Academy Web" (Next.js), synced live with the Erfan Academy app

Paste this whole file as the first message of a new session in an empty project folder.
Two reference sources must be available to that session:

1. `wordsapi-map.md` (the endpoint map) — attach it, or copy it to `docs/wordsapi-map.md`.
2. **The existing Flutter app source**, at `C:\Users\Kwestan\Ielts essential words\ielts_vocab_app`. Add that folder to the session as read-only. Section 2 explains why it is the most valuable input you have.

---

## 0. Your role and the one-sentence goal

You are a senior full-stack engineer and product designer. Build the **web version of the Erfan Academy learning app** as a beautiful, fast, multilingual **Next.js** website that reads **exactly the same live data as the mobile/desktop app**, so that any edit, addition or deletion of data (books, words, grammar, speaking, etc.) shows up in the app and on the website without anyone touching the website.

Before writing code: read `AGENTS.md` (if present) and the Next.js docs shipped in `node_modules/next/dist/docs/` for every API you use. This Next.js version has breaking changes compared with what you remember. Do not rely on memory for routing, caching, `proxy`/middleware, metadata or `use cache` APIs.

## 1. The non-negotiable principle: ONE source of truth

The data already lives in a MySQL database behind a PHP JSON API. The Flutter app (Dart) calls that API roughly 50,000 times a month. The website must be **another client of the same API**, nothing more.

Hard rules:

1. **Never copy data into the repo.** No JSON dumps, no seed files, no hard-coded books/words/questions/categories. If you need fixtures for tests, keep them small, synthetic and clearly labelled.
2. **Never connect to MySQL from the website.** The website must not know the database host, name, user or password, and must not contain SQL. All data comes from the PHP API over HTTPS, called **from the Next.js server** (Server Components, Route Handlers, Server Actions), never directly from the browser.
3. **Do not modify the PHP API or database** unless I explicitly approve it in this conversation. If you believe a change is needed (for example a cache-invalidation webhook), propose it, explain the risk, and wait.
4. **One typed API layer** (`src/lib/api/`) is the only place that knows endpoint URLs. Pages and components never call `fetch` on the API directly.
5. **Validate every response** with `zod` schemas that mirror the contract below. Be tolerant: unknown extra fields are ignored; a missing optional field must not crash a page. If validation fails, log a structured error (no secrets), show a friendly fallback UI, and never render partial garbage.
6. **Normalize language fields in one adapter.** The API names the Kurdish field inconsistently (`kur`, `ku`, `ckb`). Map everything to `{ en, fa, ckb }` once, in `src/lib/api/normalize.ts`, and use only the normalized shape in the UI.

### How "stay in sync" works, and how you must implement it

Because the website stores no copy of the data, sync is automatic. The only delay is caching. Implement caching deliberately:

- Server-side data cache with **time-based revalidation of 30 to 60 seconds** for catalog data (books, grammar, speaking, categories) and **no caching** for anything user-specific or authenticated.
- Use stale-while-revalidate so the shared hosting is not hammered and users never see a loading wall.
- **Deletion and edits must propagate**: when an item disappears from the API, the matching page must return a proper 404 (`notFound()`) after at most one revalidation window, not serve stale content forever. Do not bake catalog data into build output with `generateStaticParams` unless it also revalidates on the same short interval.
- Add an optional, secret-protected `POST /api/revalidate` route (secret from env, constant-time compare) that revalidates by tag, so the PHP admin could later ping it for instant updates. Document it, but do not require it.
- Add a tiny status page or route (`/status`, admin-only or behind a secret) that shows: API reachable, last successful fetch per endpoint group, contract-check result.
- Add a **contract drift check**: `pnpm contract:check` calls every public endpoint listed below with real requests, validates the live JSON against the zod schemas, and fails with a readable diff when the backend shape changes. Run it in CI and before every deploy. This is how we guarantee the website and app never silently diverge.

## 2. The existing app source is your primary reference

The Flutter app you are porting is at `C:\Users\Kwestan\Ielts essential words\ielts_vocab_app`
(package `ielts_vocab_app`, described as "Erfan Academy — IELTS vocabulary learning with unit and section navigation", version 1.0.22+22, about 397 Dart files).

**Read it before you design anything.** It is a working, shipped client of the same API, so it already answers almost every question you would otherwise guess at. Treat it as read-only: do not edit, move or run it.

What to read, and what each part gives you:

| Path (inside the app folder) | What it is | Use it for |
|---|---|---|
| `lib/data/services/api_service.dart` (~3,300 lines) | the complete API client, calling ~73 endpoints | the authoritative request/response contract: exact params, headers, token handling, error handling, pagination, retries |
| `lib/data/models/*.dart` | typed models (`book_model`, `grammar_question`, `game_word_category`, `app_update_manifest`, `auth_user`, `league`, `pvp_challenge`, ...) | translate each one into a `zod` schema and a TypeScript type; the field names and nullability are already correct |
| `lib/l10n/app_en.arb`, `app_fa.arb`, `app_ckb.arb` | **1,406 UI strings already translated into English, Persian and Sorani Kurdish** | reuse this wording for the website's message files. Do not invent new Kurdish or Persian copy when the app already has an approved string. This is the single biggest shortcut to a site that feels like the app. |
| `lib/features/*` (28 feature folders) | the app's screen map: `words`, `units`, `sections`, `unit_samples`, `flashcards`, `favorites`, `review`, `vocab_quiz`, `word_builder`, `quiz`, `grammar`, `speaking`, `cambridge`, `stories`, `league`, `ai_chat`, `teacher`, `class_schedule`, `stats`, `you`, `auth`, `settings`, `onboarding`, `home`, `shell`, `splash`, `update`, `admin` | decide scope per phase, and mirror the information architecture so app users recognise the site |
| `lib/core/theme/app_theme.dart`, `lib/core/branding/app_brand_logo.dart`, `assets/branding`, `assets/fonts`, `assets/app_icon.png`, `assets/splash_bg.webp` | the existing visual identity | derive the web design tokens (colors, type, radii) and reuse the real logo and fonts. The website must look like the same product, not a different brand. |
| `lib/core/srs/srs_model.dart` | the spaced-repetition algorithm used for review | if you build review/flashcards on the web, match this behaviour exactly, or the two clients will disagree about what is due |
| `lib/core/cache/api_disk_cache*.dart` | how the app caches API responses on disk | sanity-check your own caching choices against it; do not cache longer than the app does |
| `lib/core/auth`, `lib/core/profile`, `lib/core/student`, `lib/core/update` | token storage, profile, student/teacher roles, update checks | model the web auth flow on the same semantics |
| `*.php` in the app folder root (about 76 files) | a copy of the **backend source** (the same files served from `/wordsapi/`) | read an endpoint's PHP to settle any ambiguity about params, defaults or response shape. **Reference only — do not deploy or modify these.** |
| `*.sql` in the app folder root (about 58 files) | schema and migration files for the MySQL database | understand relationships and field meanings. **Reference only — the website must still never connect to MySQL** (see section 1, rule 2). |

Endpoints the app calls that are not in the Phase 1 table below, so you know they exist: `cambridge_manifest`, `cambridge_section`, `cambridge_submit`, `vocab_quiz_results_submit`, `vocab_quiz_results_my`, `vocab_quiz_result_detail`, `vocab_quiz_wrongs`, `word_important`, `user_vocab_marks`, `update_profile`, `upload_avatar`, `word_builder_league_progress`, `speaking_topic_ideas_search`, `grammar_report_question`, `legacy_grammar_result_link`.

How to use this source, concretely:

1. When you write a `zod` schema, open the matching Dart model and the matching PHP file, and make the schema agree with both. If they disagree, trust a live response and tell me.
2. When you need a label, search the `.arb` files first. Port the three translations together.
3. When you design a page, look at the matching feature folder to see what the app shows and in what order, then design the web equivalent (not a pixel copy: the web gets a layout that suits large screens).
4. When behaviour matters (quiz scoring, what counts as a wrong answer, how "important" words work, league rules), read the Dart code rather than inventing rules. **The two clients must produce the same result for the same data.**

## 3. The backend you are integrating with (verified live on 2026-10-30)

Base URL (env `WORDSAPI_BASE_URL`): `https://erfaninfo.com/wordsapi/`
All endpoints are `<name>.php`, return JSON, errors are `{"error":"<message>"}` with status 400 (missing param), 401 (`Missing token`), 405 (wrong method). Send `Accept: application/json`. Be a polite client: set a descriptive `User-Agent`, reuse connections, never fire parallel bursts, cap concurrency to 3 requests.

### Public catalog endpoints (no token). Phase 1 uses only these.

| Endpoint | Params | Response (verified) |
|---|---|---|
| `books.php` | none | array (33): `id, title, description, sort_order, is_public, is_student, track, series_id, volume_order, series_title, series_sort_order` |
| `units.php` | `book_id` | array: `unit, unit_details` |
| `words.php` | `book_id` | array (1888 for one book): `id, book_id, unit, section, section_details, word, type, important, meaning_en, meaning_fa, meaning_kur, example_en, example_fa, example_kur` |
| `sections.php`, `unit_samples.php` | `book_id` | exist, need a book that has them; verify |
| `book_pdfs.php` | none | array: `id, book_id, title, pdf_url, sort_order, updated_at` |
| `grammar_books.php` | none | array (3): `id, title, level, description, sort_order, is_active, created_at, unit_count, question_count` |
| `grammar_units.php` | `book_id` (grammar book id) | array: `id, grammar_book_id, unit_number, title, subtitle, sort_order, is_active, created_at, text_count, question_count` |
| `grammar_unit_texts.php` | `unit_id` | reading texts of a unit; inspect real response |
| `grammar_topics.php` | none | array (60): `topic, question_count, topic_created_at, is_new, topic_id` |
| `grammar_questions.php` | one of `topic`, `topic_id`, `unit_id` | array (up to 300): `id, topic, question_text, option1..option4, correct_answer, order_num, fa_explanation, kur_explanation, eng_explanation, grammar_book_id, grammar_unit_id` |
| `grammar_topic_pdfs.php` | none | array (67): `id, topic, title, pdf_url, pdf_url_kur, sort_order, updated_at` |
| `speaking_topics.php` | none | array (135): `id, title, question_count, sort_order` |
| `speaking_model_questions.php` | none | array (169): `id, model_number, title, formula, template, question_count` |
| `speaking_questions.php` | `topic_id` or `model_id` | `{ topic:{id,title}, questions:[{id, question_text, answer, fa_answer, kur_answer, sort_order, topic, model, band_answers}] }` |
| `speaking_topic_ideas.php` | `topic_id` | `{ topic:{id,title}, categories:[{category, title_en, ideas}] }` |
| `game_word_categories.php` | none | array (51), about 400 KB: `id, slug, name_en, name_fa, name_ckb, icon, sort_order, words:[{word, meaning_en, meaning_fa, meaning_kur, example_en, example_fa, example_kur}]` |
| `app_update.php` | none | `{ android_version_code, android_version_name, apk_url, android_force_update, windows_version_code, windows_version_name, windows_url, windows_force_update, force_update, release_notes:{en,fa,ku} }` |

Content languages: **English, Persian (fa), Central Kurdish (Sorani, `ckb`)**. Treat `meaning_*`, `example_*`, `*_explanation`, `*_answer` as per-language fields.

Payload sizes matter: `game_word_categories.php` is ~400 KB and one book can have ~1,900 words. Fetch on the server, cache, then send the browser only what the current view needs (paginate, virtualize long lists, lazy-load per category).

### Authenticated endpoints (later phases; see `docs/wordsapi-map.md`)

`login.php` (POST) returns a token; everything else under auth expects `Authorization: Bearer <token>` (`me.php` returns `Missing token` without it). Roles exist: student, teacher, admin. About 53 endpoint files need a token: grammar results and reactions, league and PvP challenges, AI chat, stories, teacher classes/schedule/attendance/finance, student-teacher messages, vocab marks, admin screens. Also present: `register`, `password_reset_request/confirm`, `change_password`, `student_redeem_code`.

Authentication design for the website (Phase 3):
- Login through a Server Action or Route Handler that calls `login.php`. Store the token **only in an `httpOnly`, `Secure`, `SameSite=Lax` cookie**. Never expose it to client JavaScript, never put it in localStorage, URLs or logs.
- All authenticated calls go through a server-side helper that attaches the Bearer token. On 401 clear the cookie and redirect to login.
- Role-gate pages server-side. Do not trust client state.
- Add CSRF protection for state-changing actions and rate-limit the login action.

## 4. Product scope and phases (deliver in this order, each phase shippable)

**Phase 0: discovery and plan (no feature code yet).**
1. Read the app source (section 2): `api_service.dart`, the models, the three `.arb` files, the feature folders, and `app_theme.dart`. Write `docs/app-inventory.md` summarising the screens, the data each one needs, and the design tokens you extracted.
2. Read `docs/wordsapi-map.md`, hit every public endpoint once, and write `docs/api-contract.md` with real example shapes (structure only) and any surprise (empty arrays, nulls, odd encodings, trailing slashes, 400 on missing params). Note every place the live response disagrees with the Dart model or the PHP source.
3. Confirm with me: the final domain, which phases to include, and whether to reuse the app's logo/fonts directly or restyle them for web.
4. Output a short plan with route map, folder structure, caching table (endpoint, TTL, tag) and risks. Wait for my "go".

**Phase 1: public study site (read-only, no login).**
- Home: brand hero, language switcher, quick entry points, "what's new" using `grammar_topics.is_new` and `app_update.php` (latest version, release notes in the active language, download links for Android/Windows, force-update notice if any).
- Vocabulary: books grouped by `series_title` and `track` (respect `sort_order`, `series_sort_order`, `volume_order`; hide non-public books if `is_public` is false), book page with units, unit page with words, search and filter, word cards showing meaning and example in the active language with the other two languages one tap away, mark "important" words (`important`), PDF links from `book_pdfs.php`.
- Grammar: grammar books, units, topics, reading texts, **interactive quiz** (4 options, instant feedback, explanation in the active language, score summary, retry wrong ones), topic PDFs (`pdf_url_kur` for Kurdish).
- Speaking: topics, model answers with formulas and templates, questions with band answers, topic ideas by category.
- Word games: categories with icons, flashcards and a simple matching/quiz game using `game_word_categories`.
- All of it fully usable on mobile first, then tablet and desktop.

**Phase 2: accounts and progress.** Registration, login, password reset, profile (`me.php`), saving grammar results, viewing own results (`grammar_results_my`), vocab marks, student redeem code. Clean empty states, optimistic UI where safe.

**Phase 3: social and teacher features.** League and PvP, stories, student-teacher messages, class schedule and sessions, AI chat. Only after I approve the exact subset. Teacher finance and admin screens are **out of scope** unless I ask, because they carry sensitive data.

Never invent endpoints or fields. When something is unclear, read the real response, or ask me.

## 5. Design: beautiful, attractive, trustworthy

The site must feel like a premium learning product, not a generic template.

- **Design system first.** Define tokens (color, type scale, spacing, radius, shadow, motion) in CSS variables and Tailwind theme. Light and dark themes, both checked for contrast (WCAG AA minimum).
- **Languages and direction.** Routes `/en`, `/fa`, `/ckb`. `fa` and `ckb` are RTL; use logical CSS properties (`margin-inline`, `padding-inline`, `text-align: start`) everywhere so layout mirrors correctly. Latin words inside RTL text (like "AI", "Part 1") must render correctly. Use a good Arabic-script font that fully supports Sorani letters (for example Vazirmatn variable, self-hosted, subsetted, `font-display: swap`) and a clean Latin font. Verify the letters ێ ڵ ڕ ۆ ە ڤ render properly.
- **Kurdish typography and copy.** Follow Sorani orthography conventions in all UI strings; keep UI copy short, friendly and consistent across the three languages. Put all strings in message files, never in components.
- **Look and feel.** Large confident typography, generous spacing, soft depth, subtle meaningful motion (respect `prefers-reduced-motion`), delightful micro-interactions on quizzes (correct/wrong feedback, progress, streak-style encouragement without dark patterns), skeletons that match final layout, and illustrations or icons that suit a language-learning product. Cards for books should use the cover/series info available and a consistent generated placeholder when none exists.
- **Accessibility.** Keyboard navigable, focus-visible, proper roles and labels, screen-reader friendly quizzes (announce correctness), no color-only meaning, tap targets >= 44 px.
- **Performance budget.** Lighthouse mobile >= 90 for Performance, Accessibility, Best Practices and SEO on home, a book page and a quiz page. LCP < 2.5 s on a mid-range phone over 4G. Use Server Components by default, streaming with Suspense, `next/image` where images exist, and do not ship the 400 KB categories payload to the browser.
- **SEO.** Per-locale metadata, `hreflang` alternates, canonical URLs from `NEXT_PUBLIC_SITE_URL`, sitemap generated from live API data, `robots`, Open Graph images, JSON-LD (`Course` / `LearningResource` where it fits). Quiz and study pages are indexable; authenticated pages are `noindex`.

## 6. Engineering standards

- Next.js App Router, TypeScript strict, Tailwind CSS, `zod`, `pnpm`. Lint, typecheck and format must pass with zero warnings.
- Folder sketch: `src/app/[locale]/...`, `src/lib/api/{client,schemas,normalize,endpoints}.ts`, `src/lib/i18n`, `src/components/ui`, `src/components/features/{vocab,grammar,speaking,games}`, `docs/`, `scripts/contract-check.ts`.
- Environment variables (all in `.env.example`, no real values anywhere in git): `WORDSAPI_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `REVALIDATE_SECRET`, `AUTH_COOKIE_NAME`.
- Error handling: network timeouts (8 s), retry with backoff for idempotent GETs only (max 2), circuit-breaker style fallback so one slow endpoint does not take down the page, localized error and empty states.
- Observability: structured server logs without PII or tokens; a `/status` view as described above.
- Tests: unit tests for normalizers and zod schemas, component tests for the quiz logic (scoring, retry-wrong), Playwright smoke tests for the main journeys in all three locales and in RTL, and the live contract check.
- Security: no secrets in the client bundle, strict security headers, no `dangerouslySetInnerHTML` with API content (sanitize if HTML is ever needed), validate and encode all params before building API URLs, allowlist external hosts for images and PDFs.

## 7. Deployment target (shared cPanel hosting with Node.js)

I host on cPanel (CloudLinux "Setup Node.js App", Node 24 available, Passenger). Constraints you must respect:

- No Docker, no root. Build with `pnpm build` (it works on this host, ~2 minutes), start through a small custom `server.js` that Passenger runs; document the exact steps in `docs/deploy-cpanel.md`.
- The Node app must live on its **own domain or subdomain**, configured via `NEXT_PUBLIC_SITE_URL`. Do not assume the root of `erfaninfo.com` (it is used by another site).
- Provide `docs/updating.md` for the update routine: pull, install, build, restart.
- Keep memory use modest; avoid heavy build-time data fetching that hammers the API.

## 8. Working agreement

1. Start with Phase 0 and the questions in section 4. Do not start feature work before I say "go".
2. Work in small, reviewable commits with clear messages. Run lint, typecheck, tests and the contract check before every commit; report real results, including failures.
3. Show me the UI in a running preview (desktop and mobile widths, all three locales, light and dark) and fix what looks wrong before you call a phase done.
4. If the API returns something unexpected, say so plainly and propose a fix; never paper over it with mock data.
5. Treat anything that touches money, personal data, or other people's accounts as sensitive: ask first.

## 9. Definition of done for Phase 1

- [ ] Every Phase 1 page loads live data from `wordsapi`; no data files, no DB access.
- [ ] I change or add a book/word/question/topic in the existing admin or database; within ~60 seconds the website shows it. I delete one; the page returns 404 and disappears from lists within the same window.
- [ ] `pnpm contract:check` passes against production and fails clearly if a field is renamed.
- [ ] `/en`, `/fa`, `/ckb` complete, RTL correct, Sorani text renders without broken letters.
- [ ] Lighthouse mobile >= 90 on the three key pages; axe shows no serious issues.
- [ ] Deployed to cPanel following `docs/deploy-cpanel.md`, with a working update routine.
- [ ] UI strings come from the app's `.arb` translations wherever an equivalent string exists; no invented Kurdish or Persian copy for concepts the app already names.
- [ ] Shared behaviour matches the app: a quiz scored on the web gives the same result as the same quiz in the app, on the same data.
- [ ] The site is visibly the same product as the app: same logo, same type and color family, recognisable information architecture.
- [ ] README explains the architecture in one screen: "the website is a client of wordsapi; it owns no data".
