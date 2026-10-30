# UI/UX SPECIFICATION — Erfan Academy Web

**This document replaces section 5 ("Design") of `erfan-academy-web-prompt.md` and expands it.** Everything else in that prompt still applies. Where the two disagree, this document wins.

Three goals, in this order of priority when they conflict:

1. **Recognisable.** Someone who uses the Erfan Academy app must open the website and know instantly it is the same product.
2. **Usable.** It must work correctly and comfortably on a 320 px phone and on a 1920 px monitor, in English, Persian and Sorani Kurdish.
3. **Beautiful.** It must look like a product someone paid for, not a Tailwind starter template.

Do not treat any line here as decoration. Each one is a requirement you will be checked against.

---

## 1. Derive the design system from the app. Do not invent one.

Before you write a single component, extract the real identity from the app source:

```
lib/core/theme/app_theme.dart          colors, typography, shape, elevation
lib/core/branding/app_brand_logo.dart  how the logo is composed
assets/branding/                       logo files
assets/fonts/                          the exact fonts the app ships
assets/app_icon.png                    icon and its colour story
assets/splash_bg.webp                  the brand's background treatment
lib/features/home/                     what the app considers most important
lib/features/shell/                    the app's navigation model
```

Produce `docs/design-tokens.md` with a table: **app value → web token name → web value**, for every colour, radius, shadow, font size and spacing step you adopt. If a Flutter value does not translate cleanly to web (Material elevation, for example), say what you chose instead and why.

Then define the tokens once, as CSS custom properties on `:root`, mapped into the Tailwind theme. Components must never hard-code a colour, radius or shadow. Required token groups: `--color-*`, `--font-*`, `--text-*` (size scale), `--space-*`, `--radius-*`, `--shadow-*`, `--duration-*`, `--ease-*`, `--container-*`.

**Same brand, web-native execution.** Reuse the real logo, the real fonts, the real colour story. Do **not** reproduce Flutter's Material widgets in HTML: no fake ripple effects, no floating action button, no Material app bar. The web gets web conventions — a real header, real links, real hover states, a real URL for every screen.

**Dark mode is not optional.** Define both themes at token level. Default to the system preference, let the user override, persist the choice. Check every surface pair for WCAG AA contrast (4.5:1 body text, 3:1 large text and UI boundaries). A colour that only works in light mode is a bug.

---

## 2. Layout and responsiveness

This is the part most likely to be done badly. Be deliberate.

### 2.1 The widths you must support and test

| Width | Represents | Must be true |
|---|---|---|
| 320 px | smallest phone still in use | nothing clipped, no horizontal scroll, all actions reachable |
| 360–414 px | the common phone range | the primary design target; this is where most users are |
| 768 px | tablet portrait | layout uses the extra width, does not look like a stretched phone |
| 1024 px | tablet landscape / small laptop | navigation becomes persistent |
| 1280–1440 px | the common desktop range | content is contained, not stretched edge to edge |
| 1920 px | large monitor | still looks composed; whitespace is intentional, not accidental |

Also test **landscape phone (e.g. 740 × 360)**: vertical space is scarce, so sticky headers must shrink or hide, and modals must scroll internally rather than overflow.

### 2.2 Breakpoints

Use Tailwind's defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536) and do not invent custom ones without a reason you write down. Design **mobile-first**: the base styles are the phone layout, and every breakpoint adds, never repairs.

### 2.3 Containers and reading measure

- Page content sits in a container with a sensible `max-width`. Never let body text run the full width of a 1920 px monitor.
- **Reading measure:** 60–75 characters per line for English; for Persian and Kurdish aim for the equivalent visual width, roughly `38rem`–`45rem`. Long study texts (grammar unit texts, speaking model answers) must respect this.
- Wide content (dashboards, word grids, tables) may use a wider container, but still has a maximum.
- Horizontal page padding: 16 px at phone, 24 px at tablet, 32 px and up at desktop. Content must never touch the viewport edge.
- Respect device safe areas on phones with notches: `padding-inline: max(16px, env(safe-area-inset-left))` and the same for the bottom bar.

### 2.4 Navigation model per size

The app uses a bottom navigation shell. The web must adapt, not copy:

- **Phone (< 768):** compact sticky top bar with logo, language switcher and a menu button; primary sections in a bottom bar **or** a slide-in drawer — pick one, justify it, be consistent. If you use a bottom bar, reserve its height so it never covers the last list item or a submit button.
- **Tablet (768–1023):** top bar with the main sections visible as links; drawer only for secondary items.
- **Desktop (≥ 1024):** persistent sidebar or a full horizontal nav, with the current section clearly marked. No hamburger menu on desktop.
- The language switcher is reachable at every size without opening a menu, because it is how a user recovers from landing in the wrong language.
- Every screen has a real URL. Back and forward must work. Deep links must work.

### 2.5 Specific layouts you must get right

**Word lists (up to ~1,900 items in one book).**
Phone: one column of compact rows, each row showing the word and its meaning in the active language, tappable to expand. Tablet: two columns. Desktop: two or three columns, or a list with a detail pane. Always: a sticky search field, filtering by unit and by "important", and **virtualised rendering** (`@tanstack/react-virtual` or equivalent) above 200 rows. Never render 1,900 DOM nodes.

**Quiz (4 options).**
A single centred card, `max-width` about `40rem`, never stretched across a wide screen. Options are full-width stacked buttons on phone; on desktop they may be a 2×2 grid only if each option is short, otherwise keep them stacked. The option label, the correct/wrong state and the explanation must all be readable without scrolling back up. Progress is always visible. On phone, the "next" action is within thumb reach near the bottom.

**Tables (results, league standings, teacher views).**
A raw `<table>` on a 360 px screen is the single most common responsive failure. Required approach: below `md`, render each row as a **card** with labelled fields; at `md` and above, render a real table. If you truly need a table on phone, wrap it in a scroll container with a visible affordance and a frozen first column — never let it silently widen the page.

**Card grids (books, topics, categories).**
`grid-template-columns: repeat(auto-fill, minmax(…, 1fr))` so the count adapts naturally. Cards in the same row must be equal height; titles of different lengths must not shift the layout. A long Kurdish title must wrap, not overflow or truncate mid-word.

**PDFs.** Link out or embed in a sized container; never an iframe with a fixed pixel height that breaks on phones.

**Modals and sheets.** Phone: full-screen or bottom sheet. Desktop: centred dialog with a backdrop. Both: the content scrolls inside the dialog, focus is trapped, Escape closes, and the page behind does not scroll.

### 2.6 Fluid typography and spacing

Use `clamp()` for headings so they scale smoothly instead of jumping at breakpoints, for example `font-size: clamp(1.75rem, 1.2rem + 2.2vw, 3rem)`. Body text stays at a fixed comfortable size (16–17 px minimum; never below 16 px on mobile, which also prevents iOS zoom-on-focus). Spacing uses the token scale, not arbitrary values.

### 2.7 Hard rules

- **No horizontal scrolling on any page at any width**, except inside a container that is deliberately horizontally scrollable. Verify with `document.documentElement.scrollWidth <= window.innerWidth`.
- **No fixed heights on anything containing text.** Translations change length; Persian and Kurdish are often longer than English. Use `min-height`.
- Touch targets at least 44 × 44 px, with at least 8 px between adjacent targets.
- Images and media: `max-width: 100%`, intrinsic aspect ratio reserved so nothing shifts while loading. Cumulative Layout Shift under 0.1.
- Nothing important may depend on hover; touch devices have no hover.

---

## 3. Right-to-left and Arabic-script typography

The prompt already requires logical CSS properties. These additional rules are specific and frequently got wrong:

- **Never apply `letter-spacing` to Persian or Kurdish text.** It breaks the cursive joining between letters and makes the text look broken. Restrict any tracking rule to Latin text only.
- Arabic-script text needs **more line height** than Latin: use about `1.8`–`2.0` for body text in `fa`/`ckb` versus `1.5`–`1.6` for `en`. Set this per-locale.
- Vazirmatn renders slightly smaller than Latin fonts at the same `font-size`; bump the Persian/Kurdish scale by roughly 5–8 % so the three languages feel equally weighted.
- Do not use `text-align: justify` for Arabic script; it produces ugly gaps without proper kashida support.
- Decide digits deliberately and document it: Persian/Arabic-Indic digits (۱۲۳) for `fa` and `ckb` display, Latin digits for `en`. Keep Latin digits anywhere the value is copied or compared (IDs, version numbers, scores being submitted).
- Mirror directional icons (arrows, chevrons, back buttons) in RTL. Do **not** mirror logos, play buttons, or anything representing a real-world object.
- Mixed content: an English word inside a Persian sentence must not reorder. Wrap isolated Latin runs in `<bdi>` or `unicode-bidi: isolate`.
- Test every page in all three locales. A layout that only works in `en` is not done.

---

## 4. Components to build (the base inventory)

Build these as a small, documented set before building pages. Each one must handle RTL, dark mode, and all the sizes in 2.1.

`Button` (primary / secondary / ghost / destructive, with loading and disabled states) · `IconButton` · `Link` · `Card` · `Badge` · `Tag` · `Input` · `SearchField` · `Select` · `Checkbox` · `RadioGroup` · `Switch` · `Tabs` · `Accordion` · `Dialog` · `BottomSheet` · `Drawer` · `Tooltip` · `Toast` · `Skeleton` · `EmptyState` · `ErrorState` · `Spinner` · `ProgressBar` · `Pagination` · `Breadcrumb` · `LanguageSwitcher` · `ThemeToggle` · `WordCard` · `QuizOption` · `ScoreSummary` · `BookCard` · `TopicCard` · `AudioButton` (if the app has audio).

Every interactive component: visible `:focus-visible` ring, correct ARIA role and label, keyboard operable, and a disabled state that is visibly disabled and actually not clickable.

---

## 5. Motion

- Durations: 120 ms for small state changes, 200 ms for entrances, 300 ms for a sheet or drawer. Nothing above 400 ms.
- Easing: `cubic-bezier(0.2, 0, 0, 1)` for entering, `cubic-bezier(0.4, 0, 1, 1)` for exiting.
- Animate `transform` and `opacity` only. Never animate `width`, `height`, `top` or `left`.
- Motion must mean something: confirm an action, show where a panel came from, draw the eye to a result. No decorative movement.
- `@media (prefers-reduced-motion: reduce)`: remove transitions and animations, keep the end state. This is a correctness requirement, not a nicety.

---

## 6. Behaviour and states (this is where "user-friendly" actually lives)

Every screen that loads data must define four states, and you must implement all four:

1. **Loading** — a skeleton whose shape matches the real content, so nothing jumps when data arrives. Not a centred spinner on a blank page.
2. **Empty** — an explanation and a useful next action. Never a blank area.
3. **Error** — plain language in the active language, what went wrong in user terms, and a retry button. Never a raw stack trace or an English error in a Kurdish page.
4. **Loaded** — the content.

Further requirements:

- **Search and filters** are debounced (about 250 ms), reflected in the URL so a filtered view can be shared and restored, and clearable in one action.
- **Scroll position** is restored when navigating back to a list.
- **Forms:** validate on blur and on submit, not on every keystroke; show the error next to the field that caused it; move focus to the first invalid field; never clear what the user typed on a failed submit; disable the submit button only while the request is in flight, and show that it is in flight.
- **Quiz behaviour must match the app exactly.** Read the Dart code for scoring, what counts as wrong, whether answers can be changed, and how results are recorded. The same answers must produce the same score in both clients.
- **Focus management:** opening a dialog moves focus into it; closing returns focus to the trigger. Route changes move focus to the main heading so screen-reader users know the page changed.
- **Announce dynamic changes** with a polite live region: quiz correctness, search result counts, toast messages.
- Nothing may block the whole page while one section loads. Stream with Suspense and let each section resolve independently.

---

## 7. Performance

- Lighthouse mobile ≥ 90 for Performance, Accessibility, Best Practices and SEO, on the home page, a book page and a quiz page.
- LCP under 2.5 s, CLS under 0.1, INP under 200 ms, on a mid-range phone over 4G.
- Server Components by default. Add `"use client"` only where interaction genuinely requires it, and keep those components small and leaf-level.
- **Never ship the 400 KB `game_word_categories` payload to the browser.** Fetch on the server, send only the current category.
- Virtualise any list above 200 rows.
- Self-host and subset the fonts. Preload the one font file used above the fold. `font-display: swap`, with a metric-matched fallback so there is no layout shift when the real font loads.
- Route-level code splitting; no single client bundle above ~150 KB gzipped.
- Images through `next/image` with explicit dimensions.

---

## 8. Anti-patterns — do not do these

- Full-width body text on a desktop monitor.
- A hamburger menu on a 1440 px screen.
- A real `<table>` on a 360 px screen.
- `letter-spacing` on Persian or Kurdish text.
- Fixed pixel heights around translatable text.
- Centred spinner on a blank page as the only loading state.
- Toast notifications for errors that belong next to a field.
- Hover-only affordances.
- Placeholder text used instead of a label.
- Disabled buttons with no explanation of why.
- Carousels for primary content.
- `window.alert` / `window.confirm`.
- Hard-coded colours or spacing values in components.
- Copying Flutter Material widgets into HTML.
- Inventing Persian or Kurdish copy when the app's `.arb` files already have an approved string.

---

## 9. How to verify before you call anything done

Automate this; do not eyeball it once and move on.

1. **Playwright screenshot matrix:** every main page × {320, 390, 768, 1024, 1440} × {en, fa, ckb} × {light, dark}. Look at the output yourself and fix what is wrong before showing me.
2. **Overflow check:** a Playwright assertion on every page at every width that `document.documentElement.scrollWidth <= window.innerWidth + 1`.
3. **axe-core** accessibility scan on every main page: zero serious or critical issues.
4. **Lighthouse CI** on the three key pages, meeting the budgets in section 7.
5. **Keyboard pass:** reach and operate every interactive element on the main journeys using only the keyboard, including the quiz.
6. **Reduced-motion pass:** the site is fully usable with animations disabled.
7. Show me the result in a running preview at mobile and desktop widths, in all three locales, both themes, before you declare a phase complete.

---

## 10. Acceptance checklist

- [ ] `docs/design-tokens.md` exists and maps every token back to a value taken from the app.
- [ ] The real logo and the app's fonts are in use; a user of the app recognises the site immediately.
- [ ] No horizontal scroll on any page at 320, 360, 390, 768, 1024, 1280, 1440 and 1920 px, in all three locales.
- [ ] Navigation adapts: drawer or bottom bar on phone, persistent navigation at ≥ 1024 px, no hamburger on desktop.
- [ ] Body text respects a reading measure; nothing runs the full width of a wide monitor.
- [ ] Tables become cards below `md`.
- [ ] Word lists are virtualised and remain smooth with ~1,900 items.
- [ ] The quiz card is centred and capped in width, and is comfortable to use one-handed on a phone.
- [ ] Every data screen implements loading, empty, error and loaded states.
- [ ] Dark mode is complete; every surface passes WCAG AA contrast in both themes.
- [ ] No `letter-spacing` on Arabic-script text; per-locale line heights are set; `ێ ڵ ڕ ۆ ە ڤ` render correctly.
- [ ] Directional icons mirror in RTL; logos do not.
- [ ] `prefers-reduced-motion` is honoured.
- [ ] axe-core: zero serious or critical issues. Lighthouse mobile ≥ 90 on the three key pages.
- [ ] The full screenshot matrix in section 9 has been generated and reviewed.

---

## 11. Before you build

Do not start building components from this document alone. First finish Phase 0 of the main prompt, then show me:

1. `docs/design-tokens.md` — what you extracted from the app.
2. A one-page layout plan: the navigation model at each breakpoint, the container widths, and a sketch of the three hardest screens (word list, quiz, results).
3. Any place where you think this specification conflicts with the app's existing design, with your recommendation.

Then wait for my approval.
