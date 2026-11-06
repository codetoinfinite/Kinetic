/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Profile Stat Tiles" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'profile-stat-tiles',
  title: 'Profile Stat Tiles',
  category: 'display',
  kit: 'boardui',
  tags: ['stats', 'kpi', 'profile', 'trend', 'tiles', 'boardui'],
  blurb:
    'A rolling headline figure with a trend chip over a row of grey stat tiles (value, label, trend) that can act as toggles.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/profile-stat-tiles.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The contributions block of an AI profile: a caption, a large headline figure with a purple trend chip, and a row of small grey tiles such as lifetime tokens, peak tokens, longest task and top streak. Each tile shows its value, its label and an optional up or down change. The headline rolls to new values, and the tiles can become toggle buttons so one metric can drive another view.',

  mechanism: [
    'The headline value runs through the kit `useCountUp` hook (480ms, ease-out cubic via requestAnimationFrame), so switching the dataset rolls the number instead of snapping. The rolling text is `aria-hidden`; a visually hidden copy carries the final formatted value, so screen readers never hear the intermediate numbers.',
    'The default formatter is an `Intl.NumberFormat` for whole US dollars; pass `formatValue` for tokens, hours or anything else. Trends are formatted by `formatTrend`: one decimal at most, a leading plus for gains and a true minus sign (U+2212) for losses.',
    'The headline trend is a kit Chip at caption size: purple for gains, rose for losses, neutral for zero. Inside tiles the trend is smaller: a 12px arrow icon and the unsigned percentage (`formatTrend(trend, false)`) in the same purple or rose text, with a visually hidden "up" or "down" so the direction is not conveyed by colour and icon alone.',
    'Tiles sit in a `role="group"` grid: two columns on phones and `repeat(auto-fit, minmax(132px, 1fr))` from `sm`, so four tiles share one row on a card and fold cleanly when the card narrows. Each tile is a 10px-radius block on `background-secondary` with 10px padding, the value in 14px medium and the label in 13px secondary text.',
    'Selection is opt-in: when `onSelectionChange` or `selectedId` is passed, the tiles render as `button`s with `aria-pressed`; clicking the selected one clears it. The selected tile lifts to the primary background with a 1px ring and a small shadow. It works controlled (`selectedId`) or uncontrolled (`defaultSelectedId`).',
  ],

  constants: [
    {
      name: 'count-up',
      value: '480ms, ease-out cubic',
      why: 'Long enough to read as a change of dataset, short enough to finish before the eye has moved on to the tiles.',
    },
    {
      name: 'tile grid',
      value: '2 columns below sm, auto-fit minmax(132px, 1fr) from sm, 8px gap',
      why: '132px is the narrowest width that keeps "Lifetime tokens" and "562.7M ↑ 8.1%" on single lines.',
    },
    {
      name: 'tile',
      value: '10px radius, 10px padding, 14px value, 13px label',
      why: 'Small, quiet tiles that sit under a 24px headline without competing with it.',
    },
  ],

  pitfalls: [
    'Announcing the rolling number. A live headline that changes every frame floods a screen reader; the animated text is hidden and only the final value is exposed.',
    'Showing direction by colour alone. Purple and rose are hard to tell apart for many people; the arrow icon and the hidden "up" or "down" carry the meaning.',
    'Rendering tiles as buttons when nothing listens to them. They would be focus stops that do nothing; tiles are plain blocks unless selection is wired up.',
    'Using a hyphen for negative trends. "-3.2%" looks lighter than "+3.2%" and may break onto a new line; the U+2212 minus sign is the width of a plus.',
  ],

  notes: [
    'Omit `value` to render only the tiles, for example inside another card that already has its own headline.',
    'Wire `onSelectionChange` to a heatmap or chart to filter it by the chosen metric.',
  ],

  apiSignature:
    'function ProfileStatTiles(props: ProfileStatTilesProps): JSX.Element\ninterface ProfileStatTilesProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> { label?: ReactNode; value?: number; formatValue?: (value: number) => string; trend?: number; tiles: StatTile[]; selectedId?: string | null; defaultSelectedId?: string | null; onSelectionChange?: (id: string | null) => void; tilesLabel?: string; ref?: Ref<HTMLDivElement> }\ninterface StatTile { id: string; label: string; value: ReactNode; trend?: number }',

  props: [
    { name: 'label', type: 'ReactNode', description: 'Caption above the headline.' },
    { name: 'value', type: 'number', description: 'Headline number; rolls when it changes. Omit to show only the tiles.' },
    { name: 'formatValue', type: '(value: number) => string', default: 'whole US dollars', description: 'Formats the headline.' },
    { name: 'trend', type: 'number', description: 'Headline percent change, shown as a chip.' },
    { name: 'tiles', type: 'StatTile[]', description: 'The tiles: id, label, value and optional trend.' },
    { name: 'selectedId', type: 'string | null', description: 'Controlled selected tile. Passing it makes tiles toggle buttons.' },
    { name: 'defaultSelectedId', type: 'string | null', default: 'null', description: 'Initial selection when uncontrolled.' },
    { name: 'onSelectionChange', type: '(id: string | null) => void', description: 'Called with the tile id, or null when the selected tile is clicked again.' },
    { name: 'tilesLabel', type: 'string', default: '"Stats"', description: 'Accessible name of the tile group.' },
  ],

  reducedMotion:
    'With prefers-reduced-motion the headline shows its final value immediately instead of rolling. Tile hover and selection keep their 150ms colour change, which does not move anything.',

  cleanup:
    'The count-up hook cancels its requestAnimationFrame when the value changes again or the component unmounts. There are no other timers or listeners.',

  acceptance:
    'The card shows "Contributions this year", "$7,462" with a purple "+14.8%" chip and four tiles: 9B Lifetime tokens, 562.7M Peak tokens, 12h 54m Longest task (rose, down 3.2%) and 62 days Top streak. Clicking a tile presses it and the hint names that metric; clicking it again clears it. Choosing 2024 rolls the headline to $5,954 with a rose "−2.5%" chip and updates every tile. At 360px wide the tiles form two columns.',

  criticalRegion: 'critical',
};

export default meta;
