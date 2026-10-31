# PROMPT: Rebuild the Erfan Academy home page to match the attached mock-up

Replace the current `/[locale]` home page with the design in the attached image.
This is a visual specification, not a suggestion: build what the image shows.

Everything in `erfan-academy-web-prompt.md` still applies — the site is a client
of `wordsapi` and owns no data, all three locales work, RTL is correct, and the
verification suite still has to pass. Where this document and `ui-ux-spec.md`
disagree about the *look* of the home page, this document wins. Where they
disagree about *behaviour* (accessibility, RTL, states, performance),
`ui-ux-spec.md` still wins.

---

## 1. Page structure, top to bottom

```
┌─ header (sticky, white, 64px) ──────────────────────────────────┐
│ [logo] Erfan Academy      (Home) Grammar Play      [Sign in] [⚙] │
└──────────────────────────────────────────────────────────────────┘

┌─ hero card (gradient, radius 28) ───────────────────────────────┐
│  Choose Your Book                                    ┌────────┐ │
│  24 books available                                  │  logo  │ │
│  ┌────────────────────────────────────────────┐      └────────┘ │
│  │ 🔍  Search books…                          │                 │
│  └────────────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────┘

┌─ segmented filter ───────────────┐   ┌ League ┐ ┌ Students ┐
│ ✓ IELTS │ 📖 General │ 👥 Class │   └────────┘ └──────────┘
└──────────────────────────────────┘

┌─ card ─┐ ┌─ card ─┐ ┌─ card ─┐     3 columns on desktop
└────────┘ └────────┘ └────────┘
┌─ card ─┐ ┌─ card ─┐ ┌─ card ─┐
└────────┘ └────────┘ └────────┘

Showing 6 of 24 books        • ○ ○ ○
                        ┌ Load more books ⌄ ┐
                        └───────────────────┘
```

A very faint wave shape sits at the bottom edge of the page background.

## 2. Page background

A near-white blue tint, not pure white: roughly `#F6F8FF` in light mode — the
value the app already uses for `--color-surface`. The wave at the bottom is a
single decorative SVG in a slightly deeper tint of the same blue, `aria-hidden`,
pinned to the bottom, never causing a scrollbar.

## 3. Header

- Sticky, full-bleed, solid white (`--color-surface-1`) with a hairline bottom
  border, height 64 px.
- **Left:** the real logo at 36×36 in a rounded square (`--radius-logo`), then
  the wordmark "Erfan Academy" at ~20 px, weight 700, in `--color-on-surface`.
- **Centre:** the section links as a single row of pills. The active section has
  a filled pill (`--color-secondary-container`, text
  `--color-on-secondary-container`, fully rounded); the others are plain text in
  `--color-on-surface-variant` with no background until hover.
- **Right:** a solid primary pill button, then an icon button for settings.
- At `md` and below the centre links collapse into the existing bottom bar;
  the header keeps the logo, the language switcher and the theme toggle.

## 4. Hero card

- Full width of the content container, radius 28 px, padding 40 px (24 px on
  phone), no shadow.
- **Background:** a soft three-stop gradient running `135deg`, left to right:
  lavender → pink → peach. Keep it pale — this is a tint behind text, not a
  statement. Derive the stops from the existing tokens
  (`--color-primary-container`, `--color-tertiary-container`) rather than new
  hard-coded hex values, so dark mode and the brand still hold.
- **Heading:** "Choose Your Book" — the page's `h1`, weight 800, very large
  (`clamp(2rem, 1.4rem + 2.6vw, 3rem)`), tight line height.
- **Sub-line:** the book count, in `--color-on-surface-variant`. **This number
  comes from the API** (`getBooks().length`), never a literal.
- **Search field:** white, fully rounded, height 52 px, a search icon inset at
  the start, placeholder in muted grey. It filters the cards below as you type.
- **Right-hand badge:** the logo again, inside a white rounded-square card
  (radius 20, ~110 px) with a soft shadow, floating over a faint dotted pattern.
  Hidden below `md`, where there is no room.

## 5. Filter row

One row, wrapping to two on narrow screens.

- **Segmented control (left):** three segments in one rounded container
  (radius 16) with a white fill and a hairline border, and hairline dividers
  between segments. Each segment is an icon plus a label: a check for the active
  one, a book for General, people for Class. The active segment is filled with
  `--color-secondary-container`.
- **Action pills (right):** two fully-rounded gradient buttons with white text —
  a coral-to-pink one and a blue one, each with a leading icon.

Every segment and pill is a real `<button>` or `<a>`, at least 44 px tall,
keyboard reachable, with `aria-pressed` or `aria-current` reflecting state.

## 6. Book cards

A grid of `repeat(auto-fill, minmax(min(20rem, 100%), 1fr))` — three up on
desktop, two at tablet, one on a phone. Equal heights across a row.

Each card:

- Radius 20 px, hairline border, **a pale gradient fill that differs per card**,
  cycling through six hues: lavender-pink, mint, cyan, blue, pink-purple, peach.
  Assign the hue from a stable property of the book (its id), not at random, so
  it does not change between renders or between server and client.
- **Top-left:** a 44 px circle filled with the solid version of the card's hue,
  holding a white glyph — a book, a speaker or a microphone depending on the
  kind of entry.
- **Top-right:** a small diagonal arrow (↗) in muted grey. **It must mirror in
  RTL**, like every other directional icon.
- **Title:** weight 700, `--text-h4`.
- **Subtitle:** one or two lines, muted, clamped — the series name, the unit
  count, or the description.
- **Optional badge** at the bottom-left: a small pill with a leading icon, e.g.
  "10 units", "Part 1".
- **Decoration:** a faint vertical-bar / waveform motif in the bottom-right
  corner, `aria-hidden`, that never overlaps text.

The whole card is one link. Hover lifts the border colour only — no shadow, no
transform that shifts the layout.

## 7. Footer of the grid

- **Left:** "Showing 6 of 24 books" — both numbers from real data.
- **Centre:** pagination dots, one per page, the current one filled with
  `--color-primary` and the rest `--color-outline-variant`. They are buttons
  with accessible names, not decorative spans.
- **Below:** a "Load more books" pill — white, hairline border, a chevron-down
  icon — that reveals the next six cards. It disappears when everything is
  shown, and the newly revealed cards are announced in a live region.

## 8. Rules that do not bend

1. **No hard-coded content.** Counts, titles, subtitles and badges all come from
   `wordsapi` through the existing `src/lib/api/` layer. The mock-up's "24
   books" is illustrative; the API currently returns 33 public books.
2. **All three locales.** Every string goes through the translator, and the
   whole layout mirrors in `fa` and `ckb`. The gradients, the segmented control
   and the card decorations all have to work right-to-left.
3. **Tokens, not hex.** Each new colour is added to `globals.css` as a token
   with a dark-mode value, and components reference the token. Nothing
   hard-codes a colour, radius or shadow.
4. **Dark mode is part of the job**, not a follow-up. The pastel gradients need
   dark equivalents that keep WCAG AA contrast — pale tints on a dark surface
   usually means lowering their opacity rather than reusing the same hues.
5. **The verification suite must still pass**: no horizontal scroll at 320–1920,
   axe-core clean at phone and desktop width in all three locales, Lighthouse
   mobile ≥ 90, and the screenshot matrix regenerated and reviewed.

## 9. Three things in the mock-up that are outside Phase 1

Decision D2 was "Phase 1 only — no accounts". The mock-up shows three controls
that need accounts to do anything:

| Control | What it needs |
|---|---|
| **Sign in** | `login.php`, the auth cookie, role gating — Phase 2 |
| **League** | `league.php`, which requires a token — Phase 3 |
| **Students** | teacher endpoints, which require a token — Phase 3 |

Build them as the design shows, but decide one of these and say which:

- **(a)** render them and link to a short "coming soon" page;
- **(b)** render them disabled, with a tooltip explaining they arrive with
  accounts;
- **(c)** leave them out until Phase 2, keeping the layout balanced without them.

**(c) is the recommendation** — a button that does nothing is worse than no
button — but the choice is Erfan's, and the design should be built so that
adding them later is a one-line change.

The same applies to the **Class** filter segment: it maps to `is_student`
books, and every book the API returns is currently `is_student: false`, so that
segment would always be empty. Either hide it while it has no content, or show
it with a clear empty state.

## 10. Where this diverges from the app, and why that matters

`ui-ux-spec.md` §1 puts "recognisable" first: a user of the Flutter app should
open the site and know it is the same product. The app is a flat, single-accent
indigo design with no shadows, and `docs/design-tokens.md` derives the whole web
palette from its two seed colours.

This mock-up is a different visual language: six card hues, two gradient action
buttons, soft shadows, a multi-colour hero. It is a good-looking design, but it
is **not** what the app looks like today.

That is a legitimate choice — it is Erfan's product — but it should be made
deliberately, not by accident. Two coherent ways forward:

- **Adopt it as the new brand**, and bring the app's visual identity toward it
  later so the two match again.
- **Temper it**: keep this layout, the hero, the segmented control and the card
  grid exactly as drawn, but pull the palette back to the app's indigo family so
  the six card hues become six tints of one accent rather than six colours.

Say which, because `docs/design-tokens.md` and the dark theme both have to be
rewritten to match whichever is chosen.
