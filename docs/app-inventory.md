# App inventory — Erfan Academy (Flutter) as the reference for the web version

**Source read:** `C:\Users\Kwestan\Ielts essential words\ielts_vocab_app` — package `ielts_vocab_app`,
version 1.0.22+22, 397 Dart files, 28 feature folders. **Read-only.** No source file was modified.

Written during Phase 0 on 2026-10-30 from the source, then **checked against the running app on
2026-10-31**: built for web with `flutter build web` into a temporary folder and driven in a
browser. Section 3.1 records what that settled.

---

## 1. Architecture of the app, in one paragraph

A Riverpod + Material 3 Flutter client. One service class, `lib/data/services/api_service.dart`
(3,324 lines), owns every network call; nothing else in the app talks HTTP. It targets
`const String kApiBaseUrl = 'https://erfaninfo.com/wordsapi'` and attaches
`Authorization: Bearer <token>` when a token is present. GET responses are cached on disk by
`lib/core/cache/api_disk_cache.dart`, keyed by `GET|<uri>|<fnv1a-hash-of-token>` so a signed-in
user and an anonymous user never share cache entries. This is exactly the shape the website must
copy: **one typed API layer, server-side only, cache keyed per audience.**

## 2. The single most important structural fact: UI language is not content language

The app keeps **two independent language settings**, and the web must do the same or it will feel
like a different product.

|                                  | Where                                      | Values               | Stored as             |
| -------------------------------- | ------------------------------------------ | -------------------- | --------------------- |
| **UI locale**                    | `lib/core/locale/ui_locale_provider.dart`  | `en`, `fa`, `ckb`    | `ui_locale_v1`        |
| **Content translation language** | `lib/core/language/language_provider.dart` | `fa`, `kur` **only** | `translation_lang_v1` |

`enum TranslationLang { fa, kur }` — there is **no English content language**. English is the
_source_ language: the word itself, `example_en`, `question_text` and the quiz options are always
English. Persian or Kurdish is the _gloss_.

So `/en` on the website is not "everything in English". It is "the interface in English, the
glosses still in fa or ckb". The web needs a content-language control separate from the locale
switcher. Proposal in the plan: locale sets the default gloss (`en` and `fa` go to fa, `ckb` goes
to kur), and a visible gloss toggle overrides it, persisted in a cookie.

### Fallback chain (port this exactly)

`VocabLang.meaningFor` / `exampleLocalFor` in `language_provider.dart`:

- Kurdish selected: `meaning_kur` then `meaning_fa` then `meaning_en`
- Persian selected: `meaning_fa` then `meaning_kur` then `meaning_en`

…but a candidate is **skipped when it looks corrupt**, via `_looksCorruptLocalText`:
strip whitespace/punctuation/symbols; reject if it contains `U+FFFD`, or if `?` makes up 60 % or
more of a string of length 3 or more. This defends against mojibake arriving from the server. The
web port must keep it — otherwise a word that renders fine in the app shows `????` on the site.

`isLocalRtl` returns `true` unconditionally: **both** gloss languages are RTL.

## 3. Screens and the data behind them

28 feature folders. File counts show where the real weight is: `word_builder` 120 files,
`grammar` 17, `flashcards` 16, `speaking` 13, `unit_samples` 13, `you` 13, `cambridge` 12,
`teacher` 12, `home` 11, `stories` 10.

### 3.1 What running the app settled

The source says the bottom bar has five tabs. Seeing it confirmed the part that matters most for
the website's information architecture, and corrected a guess:

- **The bar is Home · Grammar · Play · You · Settings.** There is **no Vocabulary tab and no
  Speaking tab.**
- **Home _is_ the book browser.** Its hero reads "Choose Your Book" over a search field, with two
  track tabs — **IELTS and General**, IELTS selected — and below them the books, a series collapsed
  to a single card ("Cambridge IELTS · 20 books in series").
- **Speaking is a card in that same list**, not a section of its own.
- The onboarding says it outright: _"Start from Home: pick a book, open units, then browse words."_
- **The count follows the selected tab.** The app shows "24 books available" with IELTS active —
  the IELTS count, not the 33 the API returns in total. That also explains the redesign mock-up's
  "24 books available": it was this screen.
- **League is a floating pill** over the bottom-trailing corner of the list, not a control in the
  filter row, and **Students is not on the app's home at all**.
- The **Class** tab does not appear for a signed-out reader, matching `is_student` being false on
  every book today.
- **Grammar books are not on home**; grammar is its own tab there and its own section here.
- Sign-in is **skippable**: the app is fully usable without an account, which is what makes a
  logged-out Phase 1 website faithful rather than a stub.

The website's navigation follows this exactly: Home, Grammar, Play. `You` and `Settings` arrive
with accounts in Phase 2; the language and theme controls that sit under Settings in the app are in
the web header instead, reachable at every size.

### Public / no-login (web Phase 1 candidates)

| Feature folder                              | What it shows                                 | Endpoints it needs                                                                                                                  |
| ------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `home`                                      | entry hub, "what's new", update banner        | `grammar_topics` (`is_new`), `app_update`                                                                                           |
| `words`                                     | word list for a book/unit, gloss toggle       | `words?book_id`                                                                                                                     |
| `units`                                     | units of a book                               | `units?book_id`                                                                                                                     |
| `sections`                                  | sections inside a unit                        | `sections?book_id&unit`                                                                                                             |
| `unit_samples`                              | bilingual reading samples per unit            | `unit_samples?book_id&unit`                                                                                                         |
| `flashcards`                                | flip cards over a word set                    | `words?book_id`, set built client-side                                                                                              |
| `grammar`                                   | books, units, lesson text; topics, quiz; PDFs | `grammar_books`, `grammar_units?book_id`, `grammar_unit_texts?unit_id`, `grammar_topics`, `grammar_questions`, `grammar_topic_pdfs` |
| `speaking`                                  | topics, model answers, Q&A, idea bank         | `speaking_topics`, `speaking_model_questions`, `speaking_questions`, `speaking_topic_ideas`, `speaking_topic_ideas_search`          |
| `word_builder`                              | word games over category sets                 | `game_word_categories`                                                                                                              |
| `update`                                    | version check, APK / Windows download         | `app_update`                                                                                                                        |
| `onboarding`, `splash`, `shell`, `settings` | chrome, no data                               | —                                                                                                                                   |

### Needs a token (web Phase 2 / 3)

`auth`, `you`, `favorites`, `review`, `vocab_quiz`, `quiz`, `stats`, `league`, `stories`,
`ai_chat`, `class_schedule`, `teacher`, `admin`, `cambridge`.

### Out of scope per the brief

`teacher` finance screens and `admin` — sensitive data, not to be built unless asked.

## 4. Behaviour the two clients must agree on

### 4.1 Grammar quiz scoring

`lib/data/models/grammar_question.dart`, `lib/features/grammar/grammar_quiz_screen.dart`.
This is the one the brief calls out explicitly ("a quiz scored on the web gives the same result as
the same quiz in the app"). The rules, exactly:

- `correct_answer` holds a **key**, the literal string `option1` to `option4` — never the answer text.
- Match is **case-insensitive and trimmed**, and an empty `correct_answer` is never correct:

```dart
bool isCorrectKey(String? selectedKey) {
  final a = (correctAnswer ?? '').trim().toLowerCase();
  final b = (selectedKey ?? '').trim().toLowerCase();
  return a.isNotEmpty && a == b;
}
```

- Options are offered in **`option1` to `option4` order, not shuffled**, and an option whose text
  is empty after trimming is **dropped** (`nonEmptyOptionKeys()`). The _options within a question_
  keep their order; the _questions within a session_ do not — see §4.1a.
- Score = count of correct answers. No partial credit, no penalty, no time factor.
- An answer is **final**: `_onSelect` returns early if `_answers.containsKey(_index)`.
- League points = `score * 2` (`_kQuizLeaguePointsPerCorrect = 2`).
- The submitted `session` payload is one object per question with
  `question_id, topic, question_text, option1..option4, correct_answer, selected_answer,`
  `is_correct, fa_explanation, kur_explanation, eng_explanation`. If the web ever submits results
  (Phase 2), it must produce the same shape or the app's result screens will break.

#### 4.1a How a session is assembled — corrected

The first read of this got it wrong, and the correction matters.

The quiz _screen_ does not shuffle, so reading only `grammar_quiz_screen.dart`
suggests a session is the first N questions in server order. It is not. The
session is built upstream, in `apiGrammarQuizSessionProvider`
(`lib/domain/api_providers.dart`) via `pickGrammarQuizSessionQuestions`
(`lib/core/grammar/grammar_question_progress.dart`), and it:

1. **merges** the questions of every selected topic into one pool,
2. **prefers questions not yet attempted**, topping up from attempted ones only
   if there are too few fresh ones,
3. **shuffles with a seed**, twice — each group, then the result.

Sizing, from the same file:

| Constant                           | Value                                |
| ---------------------------------- | ------------------------------------ |
| `kGrammarQuizSessionSize`          | 100 — the most any one session loads |
| `kGrammarQuizDefaultQuestionCount` | 15                                   |
| `kGrammarQuizMinBaseQuestions`     | 5                                    |
| floor for a session                | `max(5, number of topics)`           |

"Attempted" is recorded locally under `grammar_topic_solved_v1` in
SharedPreferences, as `{ "Topic name": [ids] }`, and a question counts the
moment it is answered — right or wrong.

**What the website matches, and what it cannot.** The algorithm, the sizing
rules, the storage key and the meaning of "attempted" are all ported
(`src/lib/quiz/session.ts`, `src/lib/quiz/progress.ts`). What cannot match is
the exact sequence: Dart's `Random(seed)` and JavaScript's generators produce
different orders from the same seed. That is acceptable because the app already
gives a different session per seed — what must agree is the **score for a given
set of answers**, and that does.

### 4.2 Spaced repetition — `lib/core/srs/srs_model.dart`

Plain **SM-2**. Card: `{wordId, interval=1, easeFactor=2.5, repetitions=0, dueDate}`.
Ratings: `again=0, hard=2, good=4, easy=5`.

```
q >= 3:  n==0 -> interval=1 ; n==1 -> interval=6 ; else interval=round(interval*ef)
         n++ ; ef = ef + 0.1 - (5-q)*(0.08 + (5-q)*0.02) ; ef = max(ef, 1.3)
q <  3:  n=0 ; interval=1
dueDate = now + interval days ; "due today" compares calendar days, not instants
```

SRS state is **local to the device** (`srs_provider.dart` + SharedPreferences); it is not on the
server. So web review progress cannot sync with app review progress — there is no endpoint for it.
That is a product limitation to state plainly, not something to paper over.

### 4.3 Update / release notes

`app_update_manifest.dart`, `app_release_notes.dart`.

- `force_update` flags arrive as **int 0/1**, read as `== 1`. Android force falls back:
  `android_force_update ?? force_update ?? 0`.
- Release notes are keyed `{en, fa, ku}` — **`ku`, not `ckb` or `kur`**. Selection: `fa` to `fa`,
  `ckb` to `ku`, else `en`; then first non-empty of `[en, fa, ku]`; then empty string.

## 5. Design tokens — `lib/core/theme/app_theme.dart` (177 lines)

Material 3, `ColorScheme.fromSeed`. Only two colors are authored; everything else is M3-derived.

| Token              | Light         | Dark         |
| ------------------ | ------------- | ------------ |
| seed               | `#5B6CFF`     | `#8A93FF`    |
| surface / scaffold | `#F6F8FF`     | `#0D1020`    |
| input fill         | white at 75 % | white at 6 % |

| Shape / type               | Value                                      |
| -------------------------- | ------------------------------------------ |
| card radius                | 24 px, elevation 0, zero margin            |
| input radius               | 18 px, filled, **no border**               |
| filled button min height   | 52 px                                      |
| outlined button min height | 48 px                                      |
| button padding             | 16 px inline / 14 px block                 |
| `headlineSmall`            | w700, letter-spacing −0.2                  |
| `titleLarge`               | w700, letter-spacing −0.1                  |
| `titleMedium`              | w600                                       |
| `bodyMedium`               | line-height 1.35                           |
| app bar                    | transparent, elevation 0, **not** centered |

Flat, soft, rounded, one indigo-violet accent. To match on the web I will generate the full M3
tonal palette from the same two seeds (the official `material-color-utilities` algorithm) and emit
it as CSS variables, rather than hand-picking approximations.

### Fonts actually bundled (`pubspec.yaml` + `assets/fonts/`)

| Family        | Files                                             | Role                                             |
| ------------- | ------------------------------------------------- | ------------------------------------------------ |
| **Vazirmatn** | Regular 400 / Medium 500 / Bold 700               | Persian + Sorani. OFL licence file is present.   |
| **OpenSans**  | Light 300 / Regular 400 / SemiBold 600 / Bold 700 | Latin                                            |
| **Lexend**    | single weight                                     | display                                          |
| Calibri       | `calibri.ttf`, 811 KB                             | legacy — **do not ship to the web**, proprietary |
| Rudaw         | `rudawbold.ttf`                                   | Kurdish display weight                           |

Vazirmatn is already the brief's suggestion and is already the app's choice — confirmed, not
guessed. For the web I would self-host the **variable** Vazirmatn (one subsetted woff2 instead of
three ttf) plus a Latin face, and leave Calibri out for licensing reasons.

**Logo:** `assets/branding/logo.png`, 274 KB, plus `assets/app_icon.png` and `assets/splash_bg.webp`.
Reusable as-is; see the open question about restyling.

## 6. Caching, as the app does it — the ceiling for the website

From the constants at the top of `api_service.dart`:

| Constant                   | TTL        | Applies to                        |
| -------------------------- | ---------- | --------------------------------- |
| `_ttlBooks`                | 25 min     | `books`, `book_pdfs`              |
| `_ttlUnitsSections`        | 8 h        | `units`, `sections`               |
| `_ttlGrammarCatalog`       | **3 days** | grammar + speaking + game catalog |
| `_ttlGrammarResultsPublic` | 1 h        | public results                    |
| `_ttlGrammarResultsMy`     | 6 min      | own results                       |
| `_ttlGrammarResultDetail`  | 12 min     | one result                        |
| `_ttlVocabQuizResultsList` | 4 min      | vocab quiz results                |
| `_ttlUserVocabMarks`       | 6 min      | vocab marks                       |

**`words.php` is deliberately never disk-cached** — the comment on `_httpCacheKey` says so.

The brief's instruction "do not cache longer than the app does" is satisfied with room to spare:
the plan's 30–60 s catalog TTL is **far shorter** than the app's 25 min to 3 days. The website will
therefore be _fresher_ than the app, not staler. Worth saying out loud, because it means the
60-second propagation test in the definition of done is a test of the website only — the app will
still show the old grammar topic for up to 3 days. That is existing app behaviour, not a web
regression.

Timeouts in the app: auth requests 45 s, `me.php` 10 s, story upload 45 s / video 90 s,
story create 20 s. The brief's 8 s web timeout is stricter; fine for read-only catalog GETs.

## 7. Translations — `lib/l10n/*.arb`

Measured, not estimated:

| File          | Size  | Total entries | Message keys |
| ------------- | ----- | ------------- | ------------ |
| `app_en.arb`  | 69 KB | 1,143         | **1,031**    |
| `app_fa.arb`  | 80 KB | 1,092         | **1,031**    |
| `app_ckb.arb` | 85 KB | 1,092         | **1,031**    |

- **Coverage is complete**: zero keys present in `en` are missing from `fa` or `ckb`. Only 2 values
  are empty in each of `fa` and `ckb`.
- The difference between 1,143 and 1,092 is the 112 `@key` metadata entries in the English file
  (placeholder descriptions); the other two carry 61.
- **111 keys contain ICU placeholders** (`{count}`, `{score}`, …) — e.g. `wordsProgress`,
  `streakDays`, `grammarScoreOutOf`, `allWordsCount`. These need a web i18n library with ICU
  support; plain string maps will not do.
- Note: the brief says "1,406 strings". The current files hold **1,031 message keys** per locale.
  Not a problem — just don't plan around 1,406.

Plan: a build-time script converts the three `.arb` files into the web message catalog, keeping
the key names, so a future app string change can be re-imported by re-running it. No hand-written
Persian or Kurdish copy for anything the app already names.

## 8. What the app does that the web deliberately will not

- `words.php?global=1` — the app can pull **every word in the database at once**. Measured live:
  **5.6 MB**. The website must never issue this call.
- `game_word_categories.php` returns all 51 categories with all 2,851 words in one 402 KB payload;
  there is no per-category endpoint. The app eats it; the web must fetch it on the server, cache
  it, and send the browser one category at a time.
- Disk-cache-everything behaviour: on the web the equivalent is the server data cache, shared by
  all visitors, which is why the TTL can be so much shorter.

## 9. Risks this inventory surfaces

1. **No server-side progress for review/flashcards.** SRS lives on the device. Web review progress
   will be its own, in a cookie or local storage, and will not match the phone. Must be stated in
   the UI, not hidden.
2. **`icon` values are Flutter identifiers** (`pets_rounded`, `restaurant_rounded`, …) — 51 of
   them, one per category. The web needs an explicit name-to-web-icon map; there is no automatic
   translation. Unmapped names need a sane default.
3. **Calibri is bundled but not web-licensable.** Excluded; this changes nothing visually because
   it is not used for the main type ramp.
4. **Material 3 derived colors.** Matching the app exactly means running the same tonal-palette
   algorithm, not eyeballing hex values.
5. The app's own freshness (up to 3 days for grammar) is much worse than the website's will be.
   Expect "the website updated but my phone didn't" questions.
