# Deploying to cPanel (CloudLinux, Passenger, Node 24)

The site runs as a Node app under Passenger, on the **root of `erfaninfo.com`**
(decision D1). No Docker, no root access, no build step on the server beyond
`pnpm build`.

**Read §1 before anything else.** The one way this deploy can break something
that matters is by taking over a path the Flutter app depends on.

---

## 1. The gate: `/wordsapi/` must keep working

`wordsapi` is served from `https://erfaninfo.com/wordsapi/` — the same origin
this app now owns. Every copy of the Flutter app, on every user's phone, calls
it. If it stops answering, the app stops working.

**It already coexists.** Measured on 2026-10-30, with a Next.js app live on the
root under Passenger:

```
/                     307 -> /ckb                     (the Node app)
/wordsapi/books.php   200  application/json
/apk/app.apk          200  application/vnd.android.package-archive
/api/Erf.apk          200  application/vnd.android.package-archive
/ads.txt              200  text/plain
```

Apache serves files that exist on disk **before** handing the request to
Passenger, so `/wordsapi/*.php` never reaches Node. No `.htaccess` surgery,
reverse proxy or subdomain move is needed.

Two rules follow:

**Run this check immediately after every production deploy**, before telling
anyone the deploy is good:

```bash
for p in / /wordsapi/books.php /wordsapi/app_update.php /wordsapi/grammar_topics.php /apk/app.apk /api/Erf.apk /ads.txt; do printf "%-32s " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "https://erfaninfo.com$p"; done
```

Everything except `/` must return `200`. `/` returns `307` to a locale. If any
`/wordsapi/` path returns anything else, **roll back immediately** (§7) — the
mobile app is down.

**Never add a route that collides.** No segment of `src/app/` may be named
`api`, `wordsapi` or `apk`. This project's only route handler is deliberately at
`/internal/revalidate`, not Next's default `/api/revalidate`, because `/api/` on
this host holds real downloads.

---

## 2. What you need on the server

- Node **24** (cPanel → *Setup Node.js App* offers it)
- `pnpm` (install once: `npm i -g pnpm`)
- About 600 MB free for `node_modules` and `.next`
- The app's own domain root, i.e. `public_html`

## 3. First deploy

### 3.1 Get the code there

```bash
cd ~
git clone <your-repo-url> erfan-academy-web
cd erfan-academy-web
```

If you deploy without git, upload the repository **without** `node_modules`,
`.next`, `.env*` or `test-results`.

### 3.2 Environment

```bash
cp .env.example .env
```

Then edit `.env`:

```
WORDSAPI_BASE_URL=https://erfaninfo.com/wordsapi
NEXT_PUBLIC_SITE_URL=https://erfaninfo.com
REVALIDATE_SECRET=<a long random string>
STATUS_SECRET=<a different long random string>
```

Generate the secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`.env` is gitignored and must never be committed. Nothing in it is exposed to
the browser except `NEXT_PUBLIC_SITE_URL`, which is public by design.

### 3.3 Install and build

```bash
pnpm install --frozen-lockfile
pnpm build
```

The build takes roughly two minutes and needs no network access to the API.

### 3.4 Verify before switching anything over

```bash
pnpm start --port 3000
```

In another shell:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/en
```

`200` means the app is healthy. Stop it with Ctrl-C.

### 3.5 Create the Passenger app

In cPanel → **Setup Node.js App** → *Create Application*:

| Field | Value |
|---|---|
| Node.js version | 24.x |
| Application mode | Production |
| Application root | `erfan-academy-web` |
| Application URL | `erfaninfo.com` (the root) |
| Application startup file | `server.js` |

Then **Add** each variable from `.env` in the app's *Environment variables*
panel too — Passenger does not read `.env` by itself.

Click **Restart**.

### 3.6 The cutover

The root currently serves the Harman Academy Node app. **This step is yours to
make, not something a script should do**, and it takes the old site offline.

1. Confirm the backup exists: `ls -la ~/backup-public_html-20261030.tgz`
2. In *Setup Node.js App*, **Stop** the `harman-academy-run` application.
3. Create this app as in §3.5, pointing at `erfaninfo.com`.
4. **Run the §1 check.** All seven paths must be as described.
5. Open `https://erfaninfo.com/` and confirm it redirects to a locale.

The previous root page is preserved at `public_html/index.html.old`, and the
old app's files are untouched — nothing has been deleted.

---

## 4. `server.js`

Passenger runs this file. It starts Next's own server, so there is no custom
request handling to go wrong:

```js
// server.js — see the file at the repository root.
```

It reads `PORT` from the environment, which Passenger sets.

## 5. Checking a live deploy

| What | How |
|---|---|
| The site | `https://erfaninfo.com/en` |
| The API still works | the §1 loop |
| Endpoint health | `https://erfaninfo.com/status?key=<STATUS_SECRET>` |
| Contract drift | `pnpm contract:check` (run locally or on the server) |
| Sitemap | `https://erfaninfo.com/sitemap.xml` |

## 6. Memory and load

- Keep the Passenger app at the default memory limit; the site holds only
  cached API responses, the largest being the 400 KB game categories.
- There is **no build-time data fetching**: `pnpm build` never calls the API, so
  a deploy cannot hammer it.
- At runtime, a 60-second cache window caps origin traffic at roughly 1,440
  calls per endpoint per day **regardless of how many visitors arrive**, because
  the cache is server-side and shared. Concurrency to the API is capped at 3.

## 7. Rolling back

```bash
cd ~/erfan-academy-web
git log --oneline -5
git checkout <previous-commit>
pnpm install --frozen-lockfile
pnpm build
```

Then **Restart** in *Setup Node.js App*, and run the §1 check again.

To restore the previous site entirely: stop this app, and start
`harman-academy-run` again in *Setup Node.js App*.

## 8. What this deploy never touches

- The PHP API in `public_html/wordsapi/` — not modified, not redeployed.
- The MySQL database — the website has no credentials for it and contains no SQL.
- `/apk/`, `/api/` and the uploads directories.

If a future change seems to need any of those, it needs Erfan's approval first.
