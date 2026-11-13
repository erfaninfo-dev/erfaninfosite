# Design tokens

**This is the new brand**, adopted on 2026-10-31 from the home-page mock-up in
[`home-redesign-prompt.md`](home-redesign-prompt.md). Erfan chose it over
keeping the Flutter app's palette.

That is a real change, so it is worth stating plainly: **the website and the app
no longer look like the same product.** The app is flat, shadowless and built
from a single indigo seed; this is a brighter design with a vivid blue primary,
six card accents, two gradient action buttons and soft shadows. Bringing the app
toward it is follow-up work, not something this repo can do.

What carried over unchanged: the logo, the three fonts, the shape language
(24 px cards, 18 px inputs, stadium buttons), the 44 px touch targets and the
`#F6F8FF` page tint the app already used.

---

## 1. How to read this

Every value below is in `src/app/globals.css` as a CSS custom property, with a
dark-mode value beside it. Components reference tokens; nothing hard-codes a
colour, radius, shadow or duration.

Every number in the contrast tables was computed, not estimated — the script
lives in the commit that introduced the palette, and the same checks run in the
axe and Lighthouse suites.

## 2. Core colours

| Token                            | Light                 | Dark                  |
| -------------------------------- | --------------------- | --------------------- |
| `--color-primary`                | `#2563EB`             | `#9DBBFF`             |
| `--color-on-primary`             | `#FFFFFF`             | `#0A2A6B`             |
| `--color-primary-container`      | `#DBE7FF`             | `#1D3A7D`             |
| `--color-on-primary-container`   | `#16307D`             | `#DBE7FF`             |
| `--color-secondary-container`    | `#E7E5FE`             | `#2E2A5C`             |
| `--color-on-secondary-container` | `#3A2E8F`             | `#DEDAFF`             |
| `--color-tertiary`               | `#B42BC4`             | `#EFA8F6`             |
| `--color-error`                  | `#BA1A1A`             | `#FFB4AB`             |
| `--color-surface`                | `#F6F8FF`             | `#0D1020`             |
| `--color-on-surface`             | `#16161D`             | `#E6E8F2`             |
| `--color-on-surface-variant`     | `#5B5F6E`             | `#A9AFC6`             |
| `--color-surface-1` … `-5`       | `#FFFFFF` → `#D8DEF2` | `#141829` → `#343C61` |

`--color-secondary-container` is the lavender of the active nav pill and the
active filter segment — the single most visible piece of the new design after
the hero.

## 3. The six card accents

The home page gives each card its own hue. One token per hue; the card's pale
fill and its solid icon circle are both derived from it with `color-mix`, so a
hue is defined once and the dark theme only changes what it is mixed into
(`--accent-base`).

| Token                 | Hex       | White glyph on it |
| --------------------- | --------- | ----------------- |
| `--accent-1` lavender | `#8B5CF6` | 4.23              |
| `--accent-2` mint     | `#16A34A` | 3.30              |
| `--accent-3` cyan     | `#0E8E9B` | 3.92              |
| `--accent-4` blue     | `#3B82F6` | 3.68              |
| `--accent-5` orchid   | `#B42BC4` | 5.14              |
| `--accent-6` peach    | `#D96C0A` | 3.44              |

All clear the 3:1 a graphic needs. The pale fills they produce keep body text
above 15:1 in both themes.

A card's accent is chosen from its place in the home list, the same rotation
the app uses, never at random — otherwise it would change between renders and
between server and client.

`--accent-speaking` is `#0D9488`, the app's speaking teal (`kSpeakingBrandTeal`).
It is a seventh hue because none of the six card accents is that teal. The
speaking card mixes it the same way as the others, so dark mode only changes
`--accent-base`. White on the solid circle is about 4.6:1.

A speaking question's accent walks five of those hues in the app's order:
`--accent-4`, `--accent-2`, `--accent-1`, `--accent-6`, `--accent-5`
(blue, green, lavender, peach, orchid). Idea categories use the same set,
plus `--color-error` for disadvantage and `--color-primary` for an unknown
category. `data-accent="error"` and `data-accent="primary"` only point
`--accent` at those existing tokens.

A unit card is not one of those hues. The app fills it from the three
container tones — primary, then secondary, then tertiary — mixed into the
card surface. `.jelly-card` does that with the existing container tokens, so
no new colour is introduced. The icon circle uses `--color-primary` and
`--color-on-primary`.

## 4. Gradients

| Token                 | Light                             | Dark                                                 |
| --------------------- | --------------------------------- | ---------------------------------------------------- |
| `--gradient-hero`     | `#EDE9FE` → `#FBE8F3` → `#FEEFE3` | the same three hues mixed into the dark card surface |
| `--gradient-league`   | `#D62D55` → `#BE2370`             | `#B32446` → `#9C1C5D`                                |
| `--gradient-students` | `#2F6FE4` → `#1E49C7`             | `#2A5FC4` → `#1A3EA8`                                |

**The mock-up's coral was lightened for a reason that had to be undone.** Its
original coral-to-pink carried white text at about 3.4:1, below the 4.5:1 AA
needs. Both stops are deepened until the _lightest_ one passes:

| Gradient         | Lightest stop | White text |
| ---------------- | ------------- | ---------- |
| League (light)   | `#D62D55`     | **4.81**   |
| League (dark)    | `#B32446`     | **6.45**   |
| Students (light) | `#2F6FE4`     | **4.65**   |
| Students (dark)  | `#2A5FC4`     | **5.94**   |

## 5. Two boundary weights

| Token                     | Light     | Dark      | Used for                                                                                                     |
| ------------------------- | --------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `--color-outline-variant` | `#D5DBEC` | `#2E3553` | a hairline on a card edge — decorative, because the card already reads as a surface                          |
| `--color-outline-strong`  | `#848EA8` | `#616A8F` | a boundary that **is** the control: the segmented filter and its dividers, outlined buttons, the type select |

WCAG 1.4.11 wants 3:1 for the second kind. The mock-up's near-invisible hairline
reaches about 1.3:1, which is right for a card edge and wrong for a control, so
the two cases get separate tokens rather than one compromise that is wrong for
both. `--color-outline-strong` measures 3.08 on the page and 3.27 on a card.

## 6. Contrast, measured

| Pair                        | Light     | Dark      | Needs |
| --------------------------- | --------- | --------- | ----- |
| body on surface             | **16.96** | **15.46** | 4.5   |
| body on card                | **18.00** | **14.42** | 4.5   |
| muted on surface            | **5.98**  | **8.66**  | 4.5   |
| muted on card               | **6.35**  | **8.08**  | 4.5   |
| primary on surface          | **4.87**  | **9.88**  | 4.5   |
| on-primary on primary       | **5.17**  | **7.06**  | 4.5   |
| pill text on pill           | **8.66**  | **9.73**  | 4.5   |
| `outline-strong` on surface | **3.08**  | **3.17**  | 3.0   |

Nothing fails. Lighthouse mobile reports 100 for accessibility on all three key
pages, and axe-core finds no serious or critical issue at 390 px or 1440 px in
any of the three locales.

## 7. Typography — unchanged from the app

| Family                 | Role               | Source                              |
| ---------------------- | ------------------ | ----------------------------------- |
| **Vazirmatn** variable | Persian and Sorani | the app ships it; self-hosted woff2 |
| **Open Sans** variable | Latin              | the app ships it                    |
| **Lexend** variable    | headings           | the app ships it                    |

Calibri and Rudaw are still dropped: Calibri is not web-licensable, and Rudaw is
a single decorative weight Vazirmatn 700 covers.

| Token                | Value                                                           |
| -------------------- | --------------------------------------------------------------- |
| `--text-display`     | `clamp(2rem, 1.4rem + 2.6vw, 3rem)`                             |
| `--text-h1`          | `clamp(1.75rem, 1.3rem + 1.9vw, 2.5rem)`                        |
| `--text-body`        | `1rem` — the floor, which also stops iOS zooming on focus       |
| `--leading-body`     | `1.55` Latin / `1.9` Arabic script                              |
| `--font-scale`       | `1` / `1.06` for Arabic script                                  |
| `--tracking-heading` | `-0.0125em`, resolved to `0` under `:lang(fa)` and `:lang(ckb)` |

The tracking rule is enforced by the token, not by convention: under those
locales it is `0`, so a component that uses the token cannot break Arabic
cursive joining by accident.

## 8. Shape, shadow, motion

| Token                      | Value              |
| -------------------------- | ------------------ |
| `--radius-card`            | `1.5rem`           |
| `--radius-input`           | `1.125rem`         |
| `--radius-logo`            | `1.125rem`         |
| `--radius-button`          | `9999px`           |
| `--size-button-lg` / `-md` | `3.25rem` / `3rem` |
| `--size-bottom-nav`        | `5rem`             |

**Shadows now exist**, which is the clearest break from the app. Three weights:

| Token              | Use                                       |
| ------------------ | ----------------------------------------- |
| `--shadow-soft`    | the hero search field, the gradient pills |
| `--shadow-raised`  | the hero logo badge                       |
| `--shadow-overlay` | dialogs and menus                         |

Cards still carry none — they are separated by their own tint, as in the app.

Motion is unchanged: 120/200/300 ms, `cubic-bezier(0.2, 0, 0, 1)` entering,
`cubic-bezier(0.4, 0, 1, 1)` exiting, and everything removed under
`prefers-reduced-motion`.

## 9. Containers

| Token                 | Value   | Use                                      |
| --------------------- | ------- | ---------------------------------------- |
| `--container-prose`   | `42rem` | study text — the 60–75 character measure |
| `--container-quiz`    | `40rem` | the quiz card cap                        |
| `--container-content` | `72rem` | standard page, including the home grid   |
| `--container-wide`    | `90rem` | word grids and the header                |

## 10. Brand assets

| Asset                         | Use                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `public/brand/logo.png`       | the header mark and the hero badge                                                                      |
| `public/brand/app-icon.png`   | favicon and PWA icon only — the app's own source warns it is a tiny launcher icon and blurs when scaled |
| `public/brand/splash-bg.webp` | available, currently unused                                                                             |

The logo is never mirrored in RTL. Directional icons — chevrons, back arrows,
the card's ↗ — always are.
