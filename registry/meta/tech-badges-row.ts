/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Tech Badges Row" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'tech-badges-row',
  title: 'Tech Badges Row',
  category: 'display',
  kit: 'boardui',
  tags: ['badges', 'tech stack', 'built with', 'tooltip', 'hero', 'logos', 'boardui'],
  blurb:
    'A "built with" strip of monogram glyphs, names and versions; each badge lifts on hover or focus and names itself in a tooltip.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/tech-badges-row.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'The row of technologies under a landing-page hero: a small glyph tile, the name and a muted version per entry, separated by dots. Glyphs are simple monogram tiles drawn inline (a rounded square and one or two letters in a tone), never brand logos, so any stack can be listed. Hovering or tabbing onto a badge lifts it onto a bordered surface and opens the kit Tooltip with the name, version and a one-line description. An `icon` variant drops the labels for tight spaces and lets the tooltip carry the name.',

  mechanism: [
    'Render a `ul` (`aria-label` "Built with") of `li`s that wrap and centre; in the `label` variant a dot separator precedes every badge after the first, hidden below 640px where the row wraps.',
    'Each badge is a `span role="img"` with `aria-label` "<name> <version>" inside react-aria `Focusable`, which gives it a tab stop and lets the kit `TooltipTrigger` attach hover, focus and `aria-describedby` to a non-button element.',
    'Draw the glyph as a 20×20 SVG: a tile in the badge `tone` (rx 5.5), a 1px white inner stroke at 18% so dark tiles still read on a dark page, and the monogram centred with `dy="0.36em"` — 11px for one letter, 8.5px with tighter tracking for two.',
    'The lift is CSS: on `hover:` and `focus-visible:` the badge translates up 2px (4px for icon tiles) and gains `bg-background-primary-default`, a `border-button-default` border and `shadow-md`, over 200ms ease-out. `motion-reduce` keeps the surface change and cancels the translate and transition.',
    'The kit `Tooltip` (placement top, 8px offset, no delay) shows the name and version in semibold caption type, with the description on a second, secondary line.',
  ],

  constants: [
    {
      name: 'lift',
      value: '-2px label · -4px icon, 200ms ease-out',
      why: 'Enough to read as picked up without the row looking jumpy when the pointer sweeps across it.',
    },
    {
      name: 'glyph',
      value: '16px in the label row, 20px on a 40px tile',
      why: 'The label glyph matches the cap height of 13px body-2 text; the icon tile stays a comfortable 40px pointer target.',
    },
    {
      name: 'monogram size',
      value: '11px (1 letter) · 8.5px, -0.3 tracking (2 letters)',
      why: 'Two-letter monograms must fit the 20-unit tile with side bearing to spare.',
    },
  ],

  pitfalls: [
    'Shipping traced brand logos as glyphs: they carry trademark rules and break the row\'s visual rhythm. Monogram tiles in a tone are neutral and extensible.',
    'Putting tooltips on plain non-focusable spans: keyboard and screen-reader users never get them. `Focusable` plus an `img` role makes each badge reachable and described.',
    'Relying on the tooltip for the name in the `icon` variant without an `aria-label`: tooltips are descriptions, the badge itself still needs a name.',
  ],

  notes: [
    '`DEFAULT_TECH_BADGES` covers Next.js, React, Tailwind CSS, TypeScript, Motion and React Aria; pass `badges` to add or replace entries.',
    'Tones are SVG fills, so any CSS colour works; the white inner stroke keeps near-black tiles visible in dark mode.',
  ],

  apiSignature:
    'function TechBadgesRow(props: { badges?: TechBadge[]; variant?: "label" | "icon"; label?: string; className?: string }): JSX.Element\ntype TechBadge = { id: string; name: string; version?: string; monogram: string; tone: string; description?: string }',

  props: [
    { name: 'badges', type: 'TechBadge[]', default: 'DEFAULT_TECH_BADGES', description: 'Entries: id, name, optional version, a 1–2 letter monogram, a tile tone and an optional tooltip description.' },
    { name: 'variant', type: '"label" | "icon"', default: '"label"', description: '`label` shows glyph, name and version with dot separators; `icon` shows 40px glyph tiles only.' },
    { name: 'label', type: 'string', default: '"Built with"', description: 'Accessible name of the list.' },
    { name: 'className', type: 'string', description: 'Merged onto the list.' },
  ],

  reducedMotion:
    'Badges still gain their surface, border and shadow on hover and focus, but `motion-reduce` cancels the translate and the transition, so nothing moves; the kit Tooltip appears without its scale and blur.',

  cleanup:
    'Nothing to clean up: hover lift is CSS and react-aria owns the tooltip timers and listeners.',

  acceptance:
    'The row reads "Next.js v16 · React v19.2 · Tailwind CSS v4 · TypeScript v5.9 · Motion v12 · React Aria v1.17", each with a monogram tile. Hovering "React" lifts that badge 2px and opens a tooltip reading "React 19.2 / UI runtime". Tabbing onto a badge does the same. In the icon card, hovering the "TT" tile shows "TanStack Table 8.21".',

  criticalRegion: 'critical',
};

export default meta;
