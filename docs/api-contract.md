# API contract — `https://erfaninfo.com/wordsapi/`

Every public endpoint was called live on **2026-10-30** with a plain `GET`,
`Accept: application/json`, `User-Agent: ErfanAcademyWeb-ContractProbe/0.1`, serially, never more
than one request in flight. **Structure only is recorded here — no content was copied into the
repo**, in line with rule 1 of the brief.

Where the live response disagrees with the Dart model, the PHP source or the brief's own table,
it is flagged. **The live response wins**, per section 2 instruction 1 of the brief.

---

## 0. Transport-level facts (these shape the client)

Observed on `books.php`:

```
HTTP/1.1 200 OK
X-Powered-By: PHP/7.4.33
Content-Type: application/json; charset=utf-8
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

| Fact                                                                                  | Consequence for the website                                                                                          |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **No `Cache-Control`, no `ETag`, no `Last-Modified`** on any response                 | Next.js owns caching entirely. No conditional requests are possible; no 304s. Every revalidation is a full transfer. |
| `charset=utf-8` is correct everywhere                                                 | No transcoding needed. The app's mojibake guard is for bad _stored_ data, not bad encoding.                          |
| `Access-Control-Allow-Origin: *`                                                      | The browser _could_ call the API directly. We still will not — rule 2. It does mean a leaked URL is not a secret.    |
| PHP **7.4.33**, end-of-life                                                           | Not ours to fix, but relevant to the security note at the end.                                                       |
| `GET` and `POST` behave identically on `books.php` (POST returned the same 200 array) | Do not rely on method to signal intent.                                                                              |
| Response times: 1.3–1.6 s typical, **up to 10.4 s for `words.php`**                   | The brief's 8 s timeout **would have failed that call**. See risk R1 and the per-book table below.                   |

### Error shapes — three different ones

| Situation                                               | Status  | Body                                                                |
| ------------------------------------------------------- | ------- | ------------------------------------------------------------------- |
| Missing required param                                  | **400** | `{"error":"book_id is required and must be a positive integer."}`   |
| Missing token                                           | **401** | `{"error":"Missing token"}`                                         |
| Valid param, no such row (`units`, `grammar_questions`) | **200** | `[]` — **not** a 404                                                |
| Valid param, no such row (`speaking_questions`)         | **404** | `{"error":"Topic not found"}`                                       |
| Unknown `.php` file                                     | **404** | **HTML**, a full page with `<html lang="ckb" dir="rtl">` — not JSON |

Three consequences:

1. The client must **check `content-type` and guard JSON parsing**. A typo'd endpoint returns an
   HTML page; `JSON.parse` on it throws a useless error. Parse failures get their own error type.
2. **`notFound()` cannot be driven by the HTTP status** for most endpoints. An empty array is how
   "deleted" arrives. The 404 propagation requirement in the definition of done has to be
   implemented as: _resolve the parent from its list endpoint; if the id is absent from the list,
   call `notFound()`._ An empty child list alone is ambiguous — a real book with no units looks
   identical to a deleted book.
3. Error handling is per-endpoint, not generic: `speaking_questions` is the only public endpoint
   observed to return a real 404.

---

## 1. Verified public endpoints

Counts and sizes are from the live probe and will drift; they are recorded to size the work, not
to assert.

### `books.php` — 33 items, 8.9 KB

```
id:int  title:string  description:string|null  sort_order:int
is_public:bool  is_student:bool  track:string  series_id:int|null
volume_order:int  series_title:string|null  series_sort_order:int
```

- `is_public` / `is_student` are **real JSON booleans** here. (Contrast `important` and the
  `force_update` flags below, which are ints. The API is not consistent about this.)
- Live distribution: `is_public` true for all 33, `is_student` false for all 33. **Do not let that
  tempt you into skipping the filter** — the brief requires hiding non-public books, and the flag
  exists precisely so it can change.
- `track` is `ielts` (24) or `general` (9).
- 4 of 33 books have `series_id: null` and `series_title: null` — standalone books. Grouping by
  series must handle an "ungrouped" bucket.
- `description` is null for 1 book.
- `?scope=all` returned a byte-identical response to no param. The map lists `books.php` as needing
  a token for `scope`; without one it is ignored rather than rejected.

### `units.php?book_id=` — 14 items for book 2

```
unit:int  unit_details:string|null
```

Only two fields. `unit_details` was null for every unit of book 2. There is no unit title, so the
web unit page is titled "Unit N" from the locale message, with `unit_details` as an optional
subtitle.

**`?book_id=99999` returns `[]` with status 200.** See the 404 note above.

### `words.php?book_id=` — 1,888 items for book 2, **864 KB**

**Size and latency vary several-fold across the 33 books.** Measured:

| book_id | bytes   | first probe | second probe |
| ------- | ------- | ----------- | ------------ |
| 1       | 283,791 | —           | 2.3 s        |
| 2       | 863,548 | **10.4 s**  | 3.8 s        |
| 7       | 175,623 | —           | 2.2 s        |
| 36      | 795,851 | —           | 4.3 s        |

So 176 KB to 864 KB, and 2.2 s to **10.4 s**. The 10.4 s was a real observation on a shared host,
not a fluke to design away — the strategy is sized for the worst book, not the median.

```
id:int  book_id:int  unit:int  section:int  section_details:string|null
word:string  type:string  important:int
meaning_en:string  meaning_fa:string  meaning_kur:string
example_en:string  example_fa:string  example_kur:string
```

- **`important` is `int` 0/1, not bool.** All 1,888 were 0 in this book.
- `section` was 0 for every word in book 2 — this book is not sectioned. Book 1 _does_ have
  sections (1, 2, 3). Both shapes must render.
- `section_details` null for 1,724 of 1,888.
- The six language fields are **never null**, but they can be **empty strings**: `example_fa` empty
  once, `example_kur` empty twice in this book. The app's fallback chain exists for exactly this.
- `type` is a part-of-speech string: noun 586, verb 288, adjective 253, adverb 163, preposition 98,
  compound noun 74, pronoun 57, expression 53, and a long tail including `article`.
- **`?global=1` returns the entire corpus: 5.6 MB.** The website must never call this.
- **No pagination parameters exist.** One book is one request, all of it. The server component
  slices per unit before sending anything to the browser.

### `sections.php` and `unit_samples.php` — **the brief's table is wrong about these**

Both require **`book_id` _and_ `unit`**. With `book_id` alone both return:

```
400 {"error":"unit is required and must be a positive integer."}
```

The brief's Phase 1 table and `wordsapi-map.md` both list the params as just `book_id`, and the map
records "400 for the first book tried; need a book that has them". The real cause was the missing
`unit`, not the choice of book. The Dart signatures agree with the live behaviour:
`fetchSections(int bookId, int unit)` and `fetchUnitSamples(...)`.

`sections.php?book_id=1&unit=1`:

```
section:int  section_details:string|null
```

`unit_samples.php?book_id=2&unit=1` — **and here is the worst type inconsistency in the API**:

```
id:"36"  book_id:"2"  unit:"1"  section:"0"   <- strings, not ints
title:string  text_en_fa:string  ...
```

Every numeric field comes back as a **quoted string**, unlike every other endpoint. `section` can
also be `null` (book 36). The zod schema for this endpoint needs `z.coerce.number()` while the
others use `z.number()`; normalizing this away in the adapter is mandatory.

Coverage is patchy and the two endpoints are near-complementary: book 2 unit 1 has samples but no
sections; book 1 unit 1 has sections but no samples; book 37 has neither. Both must degrade to a
clean empty state.

`text_en_fa` is a single plain-text blob with English and Persian interleaved and `\r\n` line
breaks, not structured bilingual data. It renders as pre-wrapped text, not as a two-column layout.

### `book_pdfs.php` — 2 items, 330 B

```
id:int  book_id:int  title:string  pdf_url:string  sort_order:int  updated_at:string
```

Takes **no `book_id` param** — returns every PDF for every book; filter client-side by `book_id`.
`pdf_url` is absolute `https://erfaninfo.com/wordsapi/uploads/pdf/…`. Only 2 rows exist, so most
book pages will show no PDF section at all.

### `grammar_books.php` — 3 items, 579 B

```
id:int  title:string  level:string  description:string  sort_order:int
is_active:bool  created_at:string  unit_count:int  question_count:int
```

- `is_active:bool` — real boolean.
- **`question_count` is 0 for all three books.** Grammar questions are reachable by _topic_, not by
  book/unit, in the current data. See the next two entries.
- `created_at` is `"YYYY-MM-DD HH:MM:SS"`, no timezone, no `T`. **Not ISO 8601** — `new Date(...)`
  parses it inconsistently across engines. Treat these as opaque strings or parse explicitly as
  server-local.

### `grammar_units.php?book_id=` — 10 items for grammar book 1

```
id:int  grammar_book_id:int  unit_number:int  title:string  subtitle:string|null
sort_order:int  is_active:bool  created_at:string  text_count:int  question_count:int
```

`sort_order` was 0 for every unit — sorting must fall back to `unit_number`. Unit ids are not
contiguous (`1,2,3,4,5,6,22142,12,13,14`), so never assume id order equals display order.

### `grammar_unit_texts.php?unit_id=` — 1 item for unit 1

```
id:int  grammar_unit_id:int  title:string  text_en_fa:string  text_en_kur:string
sort_order:int  is_active:bool  created_at:string
```

- `title` was an **empty string** — the UI needs a fallback heading.
- **`text_en_kur` was empty** while `text_en_fa` was populated. Kurdish lesson text is not uniformly
  available; the Kurdish reader needs a graceful "not available in Kurdish yet" state rather than
  a blank panel.
- Same `\r\n` bilingual blob format as `unit_samples`.

### `grammar_topics.php` — 60 items, 7.1 KB

```
topic:string  question_count:int  topic_created_at:string|null  is_new:bool  topic_id:int
```

- **`topic_created_at` is literally `"0000-00-00 00:00:00"`** for at least some rows — MySQL's zero
  date, which is not a valid date in any language. A zod `z.coerce.date()` here produces
  `Invalid Date`. Keep it a string; treat the zero date and null as "unknown".
- `is_new` is a real bool and is the input to the home page's "what's new", per the brief.
- `topic` (the name) is also the join key used by `grammar_questions.php?topic=` and by
  `grammar_topic_pdfs.topic`. Topic names therefore appear in URLs unless we route by `topic_id`.
  Routing by `topic_id` is cleaner and both work.

### `grammar_questions.php` — 300 items for `topic_id=1`, 212 KB

```
id:int  topic:string  question_text:string
option1..option4:string  correct_answer:string  order_num:int
fa_explanation:string  kur_explanation:string  eng_explanation:string
grammar_book_id:null  grammar_unit_id:null
```

- Accepts `topic`, `topic_id` **or** `unit_id`.
- **`grammar_book_id` and `grammar_unit_id` were `null` on all 300 rows**, and
  **`?unit_id=1` returned `[]`**. So the book/unit path to questions is wired in the schema but
  carries no data yet. This matches `question_count: 0` on every grammar book. **Phase 1 must
  drive the grammar quiz from topics, not from book/unit**, and the unit page should link to the
  lesson text and the topic quiz rather than promising a unit quiz.
- `correct_answer` values are exactly `option1`/`option2`/`option3`/`option4`, evenly distributed
  75 each. All three explanation fields were populated on all 300 rows.
- 300 questions in one response is the cap mentioned in the brief. A quiz UI should let the user
  pick a length (the app has `grammar_question_count_sheet.dart`) rather than serving 300.

### `grammar_topic_pdfs.php` — 67 items, 17.5 KB

```
id:int  topic:string  title:string  pdf_url:string  pdf_url_kur:string
sort_order:int  updated_at:string
```

Joined to topics by the `topic` **name string**, not by `topic_id`. `pdf_url_kur` is a separate
Kurdish PDF, as the brief says. Both were non-empty strings in the sample; treat empty string as
"absent".

### `speaking_topics.php` — 135 items, 9.0 KB

```
id:int  title:string  question_count:int  sort_order:int
```

**`?part=2` and `?part=3` both return `[]`.** The Dart signature is
`fetchSpeakingTopics({int part = 1})`, and the no-param response equals part 1. So **only IELTS
Speaking Part 1 content exists today.** The web should not build a part-2/part-3 navigation that
leads to empty pages; one list, with the structure ready for parts if they appear.

### `speaking_model_questions.php` — 169 items, 45 KB

```
id:int  model_number:int  title:string  formula:string  template:string  question_count:int
```

`?part=2` also returns `[]`. `formula` and `template` are the teaching content (e.g. a
"Direct answer -> reason -> example" pattern with `[placeholders]` in the template). Those square
brackets are literal content, not markup.

### `speaking_questions.php` — **two different response shapes**

This endpoint changes its top-level key based on which param you send:

| Call           | Top level                                                                   |
| -------------- | --------------------------------------------------------------------------- |
| `?topic_id=5`  | `{ topic: {id, title}, questions: [...] }`                                  |
| `?model_id=37` | `{ model: {id, model_number, title, formula, template}, questions: [...] }` |

Question objects also differ:

```
topic_id form: id, question_text, answer, fa_answer, kur_answer, sort_order,
                topic:{id,title}, model:{id,model_number,title,formula,template},
                band_answers:[]
model_id form: same minus band_answers
```

- Each question carries its **full nested `topic` and `model` objects**, duplicated per row. Useful
  for cross-linking (a topic question shows which model pattern it uses) but it inflates the
  payload.
- **`band_answers` was an empty array on every question of topic 5.** The field exists and the
  table `speaking_band_answers` exists, but no band-level answers were found in the probe. Build
  the UI to hide the section when empty; do not design around band answers being present.
- `?topic_id=99999` returns a real **404** `{"error":"Topic not found"}` — the only public endpoint
  that does. The speaking topic page can use the status directly for `notFound()`.

### `speaking_topic_ideas.php?topic_id=` — 2.9 KB for topic 5

```
{ topic: {id, title},
  categories: [ { category:string, title_en:string,
                  ideas: [ {id, phrase, example, band_text, sort_order} ] } ] }
```

3 categories for topic 5. `band_text` is a **string** holding a band score like `"6"`, `"6.5"`,
`"7"` — not a number. Keep it a string; do not coerce, or `6.0` will display where `"6"` was meant.

### `game_word_categories.php` — 51 categories, 2,851 words, **402 KB**

```
id:int  slug:string  name_en:string  name_fa:string  name_ckb:string
icon:string  sort_order:int
words: [ {word, meaning_en, meaning_fa, meaning_kur, example_en, example_fa, example_kur} ]
```

- **This is the only endpoint that names Kurdish `ckb`** (`name_ckb`) — and in the very same
  response the nested words use **`meaning_kur` / `example_kur`**. One payload, two conventions.
  This single endpoint justifies the normalizer required by rule 6.
- 32 to 102 words per category.
- **No per-category or paginated variant exists.** All 402 KB or nothing.
- `icon` holds **Flutter Material icon identifiers**: `pets_rounded`, `restaurant_rounded`,
  `park_rounded`, `place_rounded`, `sports_soccer_rounded`, `work_rounded`, … one distinct value
  per category. The web needs an explicit 51-entry map to web icons plus a default.
- Nested word fields are never null but **are frequently empty strings** (the sampled `cat` entry
  had `meaning_en`, `example_en`, `example_fa`, `example_kur` all empty, with only Persian and
  Kurdish meanings filled). A game built on `example_en` would be mostly blank. **Games must be
  built on `word` + a gloss, with examples optional.**

### `app_update.php` — 353 B

```
android_version_code:int  android_version_name:string  apk_url:string  android_force_update:int
windows_version_code:int  windows_version_name:string  windows_url:string  windows_force_update:int
force_update:int  release_notes:{en:string, fa:string, ku:string}
```

- Current: **1.0.22**, code 22, both platforms.
- All three force flags are **int 0/1**, not bool — opposite convention to `is_public`/`is_active`.
- Release notes key is **`ku`**, a third Kurdish spelling (after `kur` and `ckb`).
- **All three release-note strings are currently empty.** The home page's "what's new" must handle
  that: show the version and download links, suppress the notes block.
- **`apk_url` and `windows_url` are `http://`, not `https://`.** Linking to them from an HTTPS page
  is mixed content; browsers block or warn on the download. **This needs a decision** — see R2.

---

## 2. Language field names, as actually observed

The inconsistency the brief warned about, measured:

| Convention                            | Where it appears                                                     |
| ------------------------------------- | -------------------------------------------------------------------- |
| `_en` / `_fa` / `_kur`                | `words.*`, `game_word_categories.words[].*`                          |
| `_en` / `_fa` / `_ckb`                | `game_word_categories` category names only                           |
| `fa_` / `kur_` / `eng_` **prefix**    | `grammar_questions.*_explanation`                                    |
| `answer` / `fa_answer` / `kur_answer` | `speaking_questions` — English has **no prefix at all**              |
| `text_en_fa` / `text_en_kur`          | `grammar_unit_texts`, `unit_samples` — _pairs_, not single languages |
| `pdf_url` / `pdf_url_kur`             | `grammar_topic_pdfs` — no Persian variant                            |
| `en` / `fa` / `ku`                    | `app_update.release_notes`                                           |

Seven conventions, four spellings of Kurdish (`kur`, `ckb`, `ku`, and `_en_kur`). `src/lib/api/normalize.ts`
maps every one of them to `{ en, fa, ckb }` and nothing downstream sees the raw names.

Note that `text_en_fa` / `text_en_kur` are **not** a language triple — they are two bilingual
documents. They normalize to `{ fa: <en+fa blob>, ckb: <en+ckb blob> }`, with no `en`.

---

## 3. Disagreements found (live response wins)

| #   | Disagreement                                                                     | Resolution                                                                                                     |
| --- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | Brief and `wordsapi-map.md`: `sections.php` / `unit_samples.php` take `book_id`. | **Both require `book_id` AND `unit`.** The map's "need a book that has them" note was a misdiagnosis of a 400. |
| 2   | Brief: `grammar_questions` has `grammar_book_id, grammar_unit_id`.               | Present but **null on all rows**; `?unit_id=` returns `[]`. Grammar quizzes are topic-driven only.             |
| 3   | Brief: `books.php` is public. Map lists it under role `A`.                       | Public without a token. `scope` is silently ignored.                                                           |
| 4   | Map: `grammar_topics` returns `topic, question_count, topic_created_at, is_new`. | Also returns **`topic_id`**, which is the better routing key.                                                  |
| 5   | Brief: `speaking_questions` returns `{topic, questions}`.                        | True for `topic_id`; `model_id` returns **`{model, questions}`**. Two shapes, one endpoint.                    |
| 6   | Brief: `speaking_topics` / `speaking_model_questions` take `part`.               | They accept it, but **parts 2 and 3 are empty**. Part 1 is all the content there is.                           |
| 7   | `unit_samples` numerics vs every other endpoint.                                 | `unit_samples` returns **quoted strings**; needs `z.coerce.number()`.                                          |
| 8   | Hand-over note: 1,406 translated strings.                                        | **1,031 message keys** per locale, fully covered.                                                              |

None of these require changing the PHP or the database. All are handled in the client.

---

## 4. Surprises worth repeating

1. **200 + `[]` is how deletion looks.** Only `speaking_questions` 404s.
2. **Unknown endpoint returns an HTML page**, so JSON parsing must be guarded.
3. **No cache headers at all.**
4. **`"0000-00-00 00:00:00"`** in `grammar_topics.topic_created_at`.
5. **Timestamps are not ISO 8601** (`"2026-06-03 02:46:43"`, space separator, no zone).
6. **Booleans are inconsistent**: `is_public`/`is_active`/`is_new` are real bools; `important` and
   the three `force_update` flags are ints.
7. **`words.php` ranges 176 KB–864 KB and 2.2 s–10.4 s** depending on the book. Slowest endpoint by far.
8. **`app_update` URLs are plain HTTP.**
9. **`band_answers` and `pdf_url_kur` exist but the first is empty everywhere sampled.**
10. **`game_word_categories` mixes `ckb` and `kur` in one response.**

---

## 5. Risks carried into the plan

**R1 — the 8-second timeout will fail `words.php`.** Measured 10.4 s for one book of 1,888 words.
The brief specifies an 8 s timeout. Proposal: keep 8 s as the default, but give `words.php` its own
20 s budget, and warm its cache so visitors rarely wait on a cold fetch. Alternative, needing your
approval and a backend change: add `unit` as a filter to `words.php` so a unit page fetches ~130
words instead of 1,888. **I am not touching the PHP without your word** — noting it as an option.

**R2 — `app_update.php` returns `http://` download URLs.** From an HTTPS page these are mixed
content. Three options: (a) rewrite the scheme to `https://` in the normalizer if the host serves
HTTPS — I verified `erfaninfo.com` does; (b) link as-is and accept browser warnings; (c) proxy the
download through a Next.js route. **(a) is my recommendation**, with a fallback to the original URL
if the HTTPS variant fails a HEAD check. No backend change needed.

**R3 — there is no cache-invalidation signal.** No ETag, no webhook, no `updated_at` on most
catalog rows. Freshness is purely TTL-driven. The optional `POST /api/revalidate` route in the
brief is the only path to instant updates and would need a small addition to your admin — proposed
later, not now.

**R4 — the 402 KB game payload and the 864 KB words payload** are fetched whole or not at all.
Server-side caching plus per-view slicing is the only mitigation; it is in the caching table.

**R5 — API load.** The app already makes ~50,000 calls a month on shared hosting. A 60 s TTL on a
catalog endpoint is at most 1,440 origin calls per endpoint per day _regardless of traffic_, since
the cache is shared server-side. Across the ~12 Phase 1 endpoint shapes that is a bounded, modest
addition. Concurrency is capped at 3 as instructed.

---

## 6. Security finding carried over from `wordsapi-map.md`

The map records that `/wordsapi/config.zip`, `/wordsapi.zip` and
`/wordsapi/teacher_financial_api_helpers.zip` were publicly reachable. **I did not re-probe or
download them** — they are outside this task and the task is read-only against the API. If those
archives contain `config.php` or `secrets.php`, your database credentials are public and that
matters far more than this website. Worth checking independently of this project.
