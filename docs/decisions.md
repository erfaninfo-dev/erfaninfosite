# Decisions

Answers given by Erfan on 2026-10-30, at the end of Phase 0. These override the brief where they
differ from it.

| #   | Question                  | Decision                                                                                                            |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| D1  | Final domain              | **`erfaninfo.com` — the root.** Harman Academy is no longer needed.                                                 |
| D2  | Which phases              | **Phase 1 only.** Public study site, no login. Phases 2 and 3 are not in scope.                                     |
| D3  | Logo and fonts            | **Reuse exactly as they are** — the app's `logo.png`, Vazirmatn / Open Sans / Lexend, and the same two seed colors. |
| D4  | The slow `words.php` call | **Solve it on the web side only.** No change to the PHP API or the database.                                        |

---

## D1 — the root domain, and the one thing it must not break

The brief said not to deploy to the root of `erfaninfo.com` because it served another site. Erfan
has now said plainly that Harman Academy is no longer needed and the website should be
`erfaninfo.com` itself. That is his call and it is recorded here as the decision.

Two consequences I will handle, and one thing I will not do:

**The API must keep working** — and, measured live, it already does under exactly this setup. A
Next.js app is _currently_ running on the root of `erfaninfo.com` under Passenger, and with it live
I verified from outside:

```
/                     307 -> /ckb                      (the Node app)
/wordsapi/books.php   200  application/json
/apk/app.apk          200  application/vnd.android.package-archive
/api/Erf.apk          200  application/vnd.android.package-archive
/ads.txt              200  text/plain
```

On this CloudLinux/Passenger host Apache serves files that exist on disk **before** handing the
request to the Node app, so `/wordsapi/*.php` is never reached by Passenger. No `.htaccess`
surgery, reverse proxy or subdomain move is needed.

Two things follow instead:

1. **A post-deploy gate, not a design constraint.** `docs/deploy-cpanel.md` requires re-running
   those five requests immediately after the first production deploy, before the deploy is called
   good.
2. **No colliding routes.** `/api/` on disk holds real downloads, so our one route handler lives at
   **`/internal/revalidate`**, not Next.js's default `/api/revalidate`. No route segment may be
   named `api`, `wordsapi` or `apk`.

**`NEXT_PUBLIC_SITE_URL=https://erfaninfo.com`**, no `basePath`. Canonicals, `hreflang`, the
sitemap and Open Graph URLs all derive from it.

**I will not remove the Harman Academy files.** Deleting a live site is not something I will do
on my own; the deploy document will describe the cutover step by step and you make the call, or
tell me explicitly to do it when the time comes. Keeping the old files in place costs nothing until
then. The cutover itself is: stop or destroy the `harman-academy-run` Node app in cPanel, then
create a new one pointing at this app's root. A backup exists at
`~/backup-public_html-20261030.tgz` and the previous root page at `public_html/index.html.old`.

**SEO note worth knowing:** if `erfaninfo.com` currently ranks for Harman Academy, replacing the
root changes what that domain is about. Not a blocker, just something to expect.

## D2 — Phase 1 only

Scope is the public site: vocabulary, grammar with the interactive quiz, speaking, word games,
home, download page, search. **No login, no registration, no results saving, no league, no teacher
anything.**

This simplifies the build in ways worth naming: no auth cookie, no CSRF, no rate limiting, no
role-gating, no `no-store` user-specific fetches. Every page is cacheable and indexable.
`AUTH_COOKIE_NAME` stays in `.env.example` as a placeholder so Phase 2 does not need a rewrite.

The phone navigation bar therefore carries **Home, Vocabulary, Grammar, Speaking, Play** — the five
things a logged-out visitor can actually do — rather than the app's Home / Grammar / Play / You /
Settings, since You and Settings are account screens. This resolves conflict 5 in
[`design-tokens.md`](design-tokens.md) §8.

## D3 — brand reused as-is

Settles conflicts 1 and 2 in [`design-tokens.md`](design-tokens.md) §8 in favour of the app:

- Flat design, `elevation: 0`, depth from tonal surfaces. No invented shadows except on overlays.
- The generated color tables in `design-tokens.md` §2 stand unchanged.
- `logo.png` is used as the logo; `app_icon.png` stays favicon-only, as the app's own source warns.
- Vazirmatn, Open Sans and Lexend are self-hosted as subsetted variable woff2. Calibri and Rudaw
  are still dropped — Calibri is proprietary and Rudaw is a single decorative weight; neither is
  part of the type ramp, so nothing recognisable is lost.

The two typography deviations in §8 stay as recommended, because both are corrections rather than
restyling: web-appropriate line heights, and **no `letter-spacing` on Persian or Kurdish**, which
the app currently applies and which breaks cursive joining.

## D4 — `words.php` handled on the web side

No backend change. The measured problem: **176 KB to 864 KB, and 2.2 s to 10.4 s, depending on the
book** — against the brief's 8 s timeout. Sized for the worst book, not the median. The fix,
entirely in our code:

1. **A per-endpoint timeout of 20 s** for `words.php` only; 8 s stays the default everywhere else.
2. **Server-side cache with a 60 s TTL, keyed per book**, so one slow fetch serves every visitor to
   that book for the next minute.
3. **Stale-while-revalidate**, so after the first fetch nobody ever waits on the origin again — a
   stale copy is served instantly while the refresh runs behind it.
4. **Slice on the server.** A unit page needs ~130 of the 1,888 words; only those cross the wire.
   The full payload never reaches a browser.
5. **Warm the cache** for the most-visited books on a low-frequency schedule, so even the first
   visitor after an expiry usually gets a warm hit.

Net effect: the 10.4 s cost is paid about once a minute per book by the server, and essentially
never by a user. The `unit` filter remains available as a future option if you ever want it, but
it is **not** being built and the PHP is not being touched.

## D5 — Half-screens, as the app uses them

The app opens secondary content in a modal bottom sheet rather than pushing a screen, so the list
behind it keeps its scroll position and its selection. The site now does the same, through one
`src/components/ui/sheet.tsx` built on the native `<dialog>` element — focus moves in and returns
to the trigger, focus is trapped, Escape closes, and `::backdrop` gives a real scrim. On top of
that: a scroll lock behind the sheet, a click-outside close and a drag-down close on touch. It is
a bottom sheet on a phone and a centred dialog from `sm` up, which is the convention on a desktop
browser; the drag handle is hidden there, because there is nothing to drag.

Three places in Phase 1 use it, matching the app one for one:

| App | Site |
| --- | --- |
| `grammar_topic_learn_sheet.dart` | Learn, opened from the grammar list |
| `grammar_question_count_sheet.dart` | the question-count step before a quiz |
| `word_info_sheet.dart` / word detail | a word's detail, from a unit or book word list |

**Learn is an intercepted route**, not sheet state: `@modal/(.)grammar/topics/[topicId]`. Opening
it from the list gives a sheet and a real URL; opening that URL directly — a shared link, a reload,
a crawler — gives the full page. Closing calls `router.back()`, so the list returns exactly as it
was. The app cannot offer a link to a sheet; the web can, and losing that would be worse than the
divergence.

**The word list changed shape because of this.** Rows were accordions that expanded in place;
they are now fixed-height triggers, and one sheet serves the whole list. A 1,900-word book
therefore has exactly one dialog in the DOM, and virtualised rows no longer jump as a neighbour
expands — the row estimate is now exact.

### What is deliberately not a sheet

- **A book's PDFs.** The app hides them behind a toolbar button and `book_pdf_picker_sheet.dart`;
  the site lists them on the book page. The content is small, needs no choice, and is worth having
  in the page for a reader and for search.
- **The grammar topic PDF picker.** Learn already shows the PDFs inside itself, with a tab per
  language. A sheet opened from a sheet would be the app's structure, not its behaviour.
- **Tapping a word inside a quiz question** (`grammar_question_word_tap_text.dart`). It loads the
  whole `words.php` catalog and falls back to a free Google Translate endpoint. Both are out of
  scope here: the first is the slow call D4 exists to avoid, the second is a third-party service
  the brief does not cover. A legitimate later feature, not part of this change.
- **Reporting a question** (`_showGrammarReportSheet`). It writes to the API, which is out of
  bounds without approval.
