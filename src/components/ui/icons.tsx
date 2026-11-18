import type { SVGProps } from 'react';

import { cn } from '@/lib/cn';

/**
 * Inline SVG icons. No icon-font or component library: these are a few hundred
 * bytes each, tree-shake cleanly, and inherit `currentColor` so they work in
 * both themes without a second definition.
 *
 * Directional icons carry `rtl-flip`, which mirrors them under `[dir=rtl]`
 * (see globals.css — not `:dir()`, so LTR islands are respected).
 * Logos and real-world objects never do (ui-ux-spec.md §3).
 */

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Svg({
  children,
  className,
  title,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      className={cn('size-6 shrink-0', className)}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  </Svg>
);

export const IconArticle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 3.5h7l5 5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
    <path d="M14 3.5V9h5M9 13h6M9 17h6" />
  </Svg>
);

export const IconBook = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19a1 1 0 0 1 1 1v14" />
    <path d="M4 4.5v14A2.5 2.5 0 0 1 6.5 16H20" />
    <path d="M6.5 16H20v5H6.5A2.5 2.5 0 0 1 4 18.5" />
  </Svg>
);

export const IconGrammar = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h10M4 12h7M4 18h12" />
    <path d="m15 8 2.5 2.5L22 6" />
  </Svg>
);

export const IconSpeaking = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5V21M9 21h6" />
  </Svg>
);

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 7h11a4 4 0 0 1 3.9 4.9l-.8 3.6A3 3 0 0 1 17.7 18c-1 0-1.9-.5-2.4-1.3L14.5 16h-5l-.8.7c-.5.8-1.4 1.3-2.4 1.3a3 3 0 0 1-2.9-2.5l-.8-3.6A4 4 0 0 1 6.5 7Z" />
    <path d="M8 11v2M7 12h2M16 11.5h.01M18 13.5h.01" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconChevron = (p: IconProps) => (
  <Svg {...p} className={cn('rtl-flip', p.className)}>
    <path d="m9 5 7 7-7 7" />
  </Svg>
);

export const IconArrowBack = (p: IconProps) => (
  <Svg {...p} className={cn('rtl-flip', p.className)}>
    <path d="M20 12H4M10 6l-6 6 6 6" />
  </Svg>
);

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);

export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </Svg>
);

export const IconGlobe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.5 9h17M3.5 15h17" />
    <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </Svg>
);

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Svg>
);

export const IconPdf = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h1.5a1.25 1.25 0 0 1 0 2.5H9V13v5M14.5 18v-5h2.5M14.5 15.5h2" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
);

export const IconCross = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 8.5 7 7M15.5 8.5l-7 7" />
  </Svg>
);

export const IconStar = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3.5 2.6 5.5 5.9.8-4.3 4.2 1 6-5.2-2.8L6.8 20l1-6-4.3-4.2 5.9-.8Z" />
  </Svg>
);

export const IconBookmark = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.5L6 20V5.5a1 1 0 0 1 1-1Z" />
  </Svg>
);

export const IconFire = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3s4 3.2 4 7.2A4 4 0 0 1 8 10c0-1.2.6-2.2 1.2-3.2C8 8.2 7 9.6 7 11.5A5 5 0 0 0 12 16.5 5 5 0 0 0 17 11.2C17 6.8 12 3 12 3Z" />
  </Svg>
);

export const IconVolume = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 10v4h3l4 3V7L7 10H4Z" />
    <path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a6.5 6.5 0 0 1 0 10" />
  </Svg>
);

export const IconVoice = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4a2.5 2.5 0 0 1 2.5 2.5V12a2.5 2.5 0 0 1-5 0V6.5A2.5 2.5 0 0 1 12 4Z" />
    <path d="M7 11a5 5 0 0 0 10 0M12 16v3" />
  </Svg>
);

export const IconQuiz = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M9 9a3 3 0 1 1 3.5 2.9c-.6.2-1 .7-1 1.3V14" />
    <path d="M12 17.5h.01" />
  </Svg>
);

export const IconCards = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="6" width="13" height="14" rx="2" />
    <path d="M8 3h9a3 3 0 0 1 3 3v10" />
  </Svg>
);

export const IconLightbulb = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z" />
  </Svg>
);

export const IconSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9Z" />
    <path d="M18 15.5 18.8 17.4l1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8Z" />
  </Svg>
);

export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8" y="8" width="11" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" />
  </Svg>
);

export const IconWindows = (p: IconProps) => (
  <Svg {...p} strokeWidth="1.5">
    <path d="M3.5 6.2 10.5 5v6.3h-7Zm0 11.6L10.5 19v-6.2h-7Zm8.5 1.4L20.5 20V12.8H12Zm0-14.4L20.5 4v7.2H12Z" />
  </Svg>
);

export const IconAndroid = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 11a7 7 0 0 1 14 0" />
    <path d="M5 11v6.5A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5V11" />
    <path d="m7.5 7.5-1-2M16.5 7.5l1-2M9.5 10h.01M14.5 10h.01" />
  </Svg>
);

export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
    <circle cx="10" cy="7.5" r="3" />
    <path d="M20 19v-1.5a3.5 3.5 0 0 0-2.7-3.4M15.5 5a3 3 0 0 1 0 5.8" />
  </Svg>
);

export const IconLayers = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3 9 4.5-9 4.5-9-4.5Z" />
    <path d="m3 12.5 9 4.5 9-4.5M3 17l9 4.5 9-4.5" />
  </Svg>
);

export const IconSchool = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 4 10 5-10 5L2 9Z" />
    <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
  </Svg>
);

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2.2" />
    <circle cx="10" cy="17" r="2.2" />
  </Svg>
);

export const IconPerson = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
  </Svg>
);

export const IconInsights = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 19V5M4 19h16" />
    <path d="M8 15v-4M12 15V9M16 15v-6" />
  </Svg>
);

export const IconLoop = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17 3a8 8 0 0 1 0 14" />
    <path d="M17 3h3v3" />
    <path d="M7 21a8 8 0 0 1 0-14" />
    <path d="M7 21H4v-3" />
  </Svg>
);

export const IconMessage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4V7a2 2 0 0 1 2-2Z" />
  </Svg>
);

export const IconFlag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3v18" />
    <path d="M6 4h9l-2 4 2 4H6" />
  </Svg>
);

export const IconKey = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="15" r="4" />
    <path d="M13 15h7M17 11v8" />
  </Svg>
);

export const IconLogin = (p: IconProps) => (
  <Svg {...p} className={cn('rtl-flip', p.className)}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 12H3m0 0 3-3m-3 3 3 3" />
  </Svg>
);

export const IconPersonAdd = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20c0-3.3 2.7-6 6-6" />
    <path d="M19 8v6M16 11h6" />
  </Svg>
);

export const IconFilter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Svg>
);

export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.5" />
    <path d="M4 4v4.5h4.5" />
    <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.5" />
    <path d="M20 20v-4.5h-4.5" />
  </Svg>
);

/* ── the 51 game category icons ──────────────────────────────────────────── */

/**
 * `game_word_categories.icon` holds Flutter Material identifiers like
 * `pets_rounded`. There is no automatic translation to a web icon set, so the
 * mapping is explicit.
 *
 * These are the 51 names the API actually returns today, verified against a
 * live response — not a guess at what Material might contain. `hasCategoryIcon`
 * lets the contract check notice when a new category introduces a name that is
 * not mapped yet; unmapped names fall back to the generic glyph rather than
 * rendering nothing.
 */
const CATEGORY_GLYPHS: Record<string, string> = {
  ac_unit_rounded:
    'M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M12 7l-2.5-2M12 7l2.5-2M12 17l-2.5 2M12 17l2.5 2',
  accessibility_new_rounded:
    'M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 9l7 1 7-1M12 10v5m-3 6 3-6 3 6',
  account_balance_rounded: 'm3 9 9-5 9 5M5 9v9m5-9v9m4-9v9m5-9v9M3 21h18',
  apartment_rounded:
    'M5 21V5h8v16M13 21V10h6v11M3 21h18M8 8h.01M8 12h.01M8 16h.01M16 13h.01M16 17h.01',
  auto_fix_high_rounded:
    'm5 19 9-9M13 5l1 2.5L16.5 8.5 14 9.5 13 12l-1-2.5L9.5 8.5 12 7.5ZM19 13l.7 1.7 1.8.8-1.8.8-.7 1.7-.7-1.7-1.8-.8 1.8-.8ZM6 3l.6 1.4L8 5l-1.4.6L6 7l-.6-1.4L4 5l1.4-.6Z',
  badge_rounded:
    'M3 7h18v13H3Zm6 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M8 12h3M8 16h3M14 12h3M14 16h3',
  bolt_rounded: 'M13 3 5 13.5h5.5L10 21l8-10.5h-5.5Z',
  bug_report_rounded:
    'M8 8a4 4 0 0 1 8 0v5a4 4 0 0 1-8 0ZM9 5.5 7.5 4M15 5.5 16.5 4M8 10H4m16 0h-4M8 14H4.5m15.5 0H16M7 17.5l-2 1.5m12-1.5 2 1.5',
  build_rounded:
    'm14.5 6.5 3-3a5 5 0 0 1-6.4 6.4l-6 6a2.1 2.1 0 1 0 3 3l6-6a5 5 0 0 1 6.4-6.4l-3 3Z',
  category_rounded: 'M12 3 4 9l8 6 8-6Zm0 10-8 6 8 2 8-2Z',
  celebration_rounded: 'm3 21 5-13 8 8Zm11-11 2-2m-4-2 1-2m5 5 2-1m-3 6 2 1',
  chair_rounded:
    'M6 10V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5M5 10h14l-1 5H6Zm1.5 5L6 21m11.5-6 .5 6',
  checkroom_rounded:
    'M12 4a2 2 0 0 0-2 2c0 1 .8 1.8 1.8 2L4 13v4h16v-4l-7.8-5A2 2 0 0 0 14 6',
  directions_bus_rounded:
    'M5 5h14v11H5Zm0 11v3h3v-3m8 0v3h3v-3M5 9h14M8 13h.01M16 13h.01M3 8v4m18-4v4',
  directions_car_rounded:
    'm5 11 1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M5 11h14v6H5Zm2 6v2m10-2v2M7.5 14h.01M16.5 14h.01',
  eco_rounded: 'M5 19C3 13 7 5 19 5c0 10-6 13-11 12.5M5 19c1.5-4 4-6.5 8-8',
  emoji_emotions_rounded:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8.5 10h.01M15.5 10h.01M8 14.5a5 5 0 0 0 8 0',
  family_restroom_rounded:
    'M6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM4 21v-7H3v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4H8v7Zm12 0v-5h-2l1.5-6a2 2 0 0 1 2-1.5h1a2 2 0 0 1 2 1.5L20 16h-2v5Z',
  flight_rounded: 'M10 21h4l-1-6 7-3v-2l-7 1-2-8H9l1 8-5 1v2l5-1Z',
  flutter_dash:
    'M7 13a5 5 0 0 1 5-5h7l-4 5 4 5h-7a5 5 0 0 1-5-5Zm0 0H4m10-5.5V5m2.5 8h.01',
  grass_rounded:
    'M3 20h18M7 20c0-4 1-7 2-9m3 9c0-5-1-8-2-11m4 11c0-4 1-7 2-9m-11 9c0-3 .5-5 1-6.5',
  history_edu_rounded:
    'M4 5h10v14a2 2 0 0 0 2 2H5a1 1 0 0 1-1-1Zm3 3h6M7 11h6M7 14h4m3 4 5.5-5.5 1.5 1.5L15.5 20H14Z',
  house_rounded: 'M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5',
  icecream_rounded: 'M8 10a4 4 0 1 1 8 0ZM8 10h8l-4 11Z',
  interests_rounded:
    'M7 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm10.5-7L21 10h-7ZM4 14h6v6H4Zm13.5 6a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  local_cafe_rounded:
    'M4 5h13v7a5 5 0 0 1-10 0h-3Zm13 1h2.5a2.5 2.5 0 0 1 0 5H17M4 20h14',
  location_city_rounded:
    'M3 21V11h6V3h6v8h6v10ZM6 14h.01M6 17.5h.01M12 7h.01M12 14h.01M12 17.5h.01M18 14h.01M18 17.5h.01',
  map_rounded: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Zm6-3v15m6-12v15',
  memory_rounded:
    'M7 7h10v10H7Zm3 3h4v4h-4ZM10 3v4m4-4v4m-4 10v4m4-4v4M3 10h4m-4 4h4m10-4h4m-4 4h4',
  mood_bad_rounded:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8.5 10h.01M15.5 10h.01M8 16a5 5 0 0 1 8 0',
  movie_rounded: 'M3 7h18v13H3Zm0 0 3-4h12l3 4M8 3 6 7m6-4-2 4m6-4-2 4',
  music_note_rounded:
    'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm10-2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
  nightlight_rounded: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z',
  palette_rounded:
    'M12 3a9 9 0 0 0 0 18 2 2 0 0 0 1.6-3.2 2 2 0 0 1 1.6-3.2H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3ZM7 11h.01M9.5 7.5h.01M14.5 7.5h.01',
  park_rounded: 'm12 3 5 8h-3l3 5H7l3-5H7Zm0 13v5',
  pets_rounded:
    'M4.5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm5-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm5 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm5 3a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-7.5 2c-2.5 0-5 2.5-5 5a2.5 2.5 0 0 0 3.4 2.3 5 5 0 0 1 3.2 0A2.5 2.5 0 0 0 17 18c0-2.5-2.5-5-5-5Z',
  piano_rounded: 'M4 4h16v16H4Zm4 0v10m4-10v10m4-10v10M4 14h16M6.5 4v7m5-7v7m5-7v7',
  place_rounded:
    'M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  public_rounded:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3.5 9h17M3.5 15h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  restaurant_rounded:
    'M6 3v8a2 2 0 0 0 2 2v8M4 3v5m4-5v5m8-5c-1.5 2-2 4-2 6a2 2 0 0 0 2 2v10',
  rocket_launch_rounded:
    'M12 3c3.5 2.5 5 6 5 9l-2.5 3h-5L7 12c0-3 1.5-6.5 5-9Zm0 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM9.5 15 7 16.5 6 21l3.5-2m5-4 2.5 1.5 1 4.5-3.5-2',
  sailing_rounded:
    'M12 3 5 16h7Zm0 0 7 13h-7M3 19c1.5 1.5 3 1.5 4.5 0 1.5 1.5 3 1.5 4.5 0 1.5 1.5 3 1.5 4.5 0 1.5 1.5 3 1.5 4.5 0',
  school_rounded: 'm12 4 10 5-10 5L2 9Zm-6 7.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5',
  science_rounded:
    'M9 3v6l-5 9a2 2 0 0 0 1.8 3h12.4a2 2 0 0 0 1.8-3l-5-9V3M8 3h8M7 15h10',
  shield_rounded: 'M12 3 4 6v6c0 4.5 3.3 8 8 9 4.7-1 8-4.5 8-9V6Z',
  sports_esports_rounded:
    'M6.5 7h11a4 4 0 0 1 3.9 4.9l-.8 3.6A3 3 0 0 1 17.7 18c-1 0-1.9-.5-2.4-1.3L14.5 16h-5l-.8.7c-.5.8-1.4 1.3-2.4 1.3a3 3 0 0 1-2.9-2.5l-.8-3.6A4 4 0 0 1 6.5 7Zm1.5 4v2M7 12h2m7-.5h.01M18 13.5h.01',
  sports_soccer_rounded:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4 3.5 2.5-1.3 4h-4.4l-1.3-4Zm0 14-1.5-3.5m3 0L12 21M3.5 10l3 1m11-1-3 1',
  terrain_rounded: 'm3 19 6-10 3.5 5.5M9 9l3-5 9 15Zm0 0-6 10h18',
  waves_rounded:
    'M3 8c1.5-1.5 3-1.5 4.5 0S10.5 9.5 12 8s3-1.5 4.5 0 3 1.5 4.5 0M3 13c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0M3 18c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0',
  wb_cloudy_rounded:
    'M7 18h10.5a3.5 3.5 0 0 0 .3-7A5.5 5.5 0 0 0 7.2 9.4 4.3 4.3 0 0 0 7 18Z',
  work_rounded:
    'M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm6 0V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18',
};

/** Fallback for a category whose icon name is not mapped yet. */
const DEFAULT_GLYPH = CATEGORY_GLYPHS.category_rounded as string;

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const glyph = CATEGORY_GLYPHS[name] ?? DEFAULT_GLYPH;
  return (
    <Svg className={className} strokeWidth="1.5">
      <path d={glyph} />
    </Svg>
  );
}

/** True when a Flutter icon name has an explicit web equivalent. */
export function hasCategoryIcon(name: string): boolean {
  return name in CATEGORY_GLYPHS;
}

/** Exposed so the contract check can report unmapped category icons. */
export const MAPPED_CATEGORY_ICONS = Object.keys(CATEGORY_GLYPHS);
