# Updating the site

Two very different things can change, and only one of them needs a deploy.

## Content changes need no deploy at all

Adding, editing or deleting a book, word, unit, grammar topic, question,
speaking topic or game category happens in the existing admin and database. The
website reads the same `wordsapi` the Flutter app reads and stores no copy of
anything, so the change appears on its own:

| Change | Visible on the site within |
|---|---|
| Books, units, words, grammar, speaking | **60 seconds** |
| Game categories, PDFs, app version | **5 minutes** |

A deleted item stops appearing in its list within the same window, its page
starts returning a real **404**, and it drops out of `sitemap.xml`.

**Do not deploy to publish content.** If something has not appeared after the
window above, check `/status?key=…` before suspecting the site.

### Making a change appear immediately (optional)

`POST /internal/revalidate` clears a cache tag on demand:

```bash
curl -X POST https://erfaninfo.com/internal/revalidate \
  -H "content-type: application/json" \
  -H "x-revalidate-secret: $REVALIDATE_SECRET" \
  -d '{"tags":["books"]}'
```

Valid tags: `books`, `grammar`, `speaking`, `games`, `app-update`. Anything else
is rejected and reported back. The endpoint needs **no change to the PHP API or
the database**; it exists so the admin could ping it later if you ever want
instant updates.

---

## Code changes need a deploy

```bash
cd ~/erfan-academy-web
git pull
```

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm build
```

Then press **Restart** in cPanel → *Setup Node.js App*, and run the
`/wordsapi/` check from [`deploy-cpanel.md`](deploy-cpanel.md) §1.

### Before you push

```bash
pnpm verify
```

That runs lint, typecheck, the unit tests and the live contract check. All four
must pass. The contract check is the important one: it calls every endpoint the
site uses and validates the real response against the schemas, so a backend
field rename fails here rather than silently blanking a page in production.

---

## When the backend changes

If a column is renamed or a new field is added to `wordsapi`:

1. `pnpm contract:check` fails and names the endpoint and field.
2. Update `src/lib/api/schemas.ts` to match the live response.
3. Update `src/lib/api/normalize.ts` if the field is user-facing.
4. Re-run `pnpm verify`, then deploy.

The Flutter app will need the same change. The website failing loudly is the
early warning.

---

## Re-importing the app's translations

The website's UI strings come from the Flutter app's `.arb` files, never from
hand-written copy. After changing a string in the app:

```bash
pnpm i18n:import "C:\Users\Kwestan\Ielts essential words\ielts_vocab_app"
```

That rewrites `src/lib/i18n/messages/{en,fa,ckb}.json` and fails if any locale
is missing a key. The only hand-written strings live in
`src/lib/i18n/web-extras.json` — concepts a website has and the app does not,
such as the skip link and the 404 page. The app's wording always wins over an
extras key with the same name.

---

## Routine checks

| How often | What |
|---|---|
| Before every deploy | `pnpm verify` |
| After every deploy | the `/wordsapi/` check, `deploy-cpanel.md` §1 |
| Occasionally | `/status?key=…` — endpoint reachability and counts |
| When the UI changes | `pnpm e2e` — layout, a11y and journey tests |
| Before a visual release | `SCREENSHOT_MATRIX=1 pnpm e2e` and look at `test-results/matrix/` |
