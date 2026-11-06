/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Legend Stat Tiles" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'legend-stat-tiles',
  title: 'Legend Stat Tiles',
  category: 'display',
  kit: 'boardui',
  tags: ['dashboard', 'stats', 'legend', 'proportion', 'chart', 'boardui'],
  blurb: 'A headline total over a segmented proportion bar and legend tiles with dots, values and percents that toggle series in and out.',
  cost: 'css',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/legend-stat-tiles.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A grey dashboard card: a title, the headline total with an optional delta chip, a thin bar split into one coloured segment per series, and a grid of white legend tiles. Each tile carries a chart-token dot, its label, its value and its share of the total. Clicking a tile takes that series out of the total, and the bar, headline and percents rebalance; hovering or focusing a tile spotlights its segment.',

  mechanism: [
    'Resolve the hidden ids through a small controllable-state helper: `hidden` wins when defined, otherwise local state seeded by `defaultHidden`; `onHiddenChange` fires either way.',
    'Mark each segment shown when it is not hidden and its value is above zero, and sum only shown values into the headline total.',
    'Render the bar as a flex row with `flex-grow: value` and `flex-basis: 0` on every segment (0 for hidden ones). The widths are then the exact shares of the shown total, with no percentage arithmetic, and `transition-[flex-grow]` animates a rebalance over 300ms.',
    'Print percents with largest-remainder rounding (`wholePercents`): floor every share, then hand the leftover points to the largest remainders, so the tiles always add up to exactly 100%.',
    'Render each tile as a toggle `<button aria-pressed>`. Hiding the last shown series is refused (the tile gets `aria-disabled`), so the bar never empties. A hidden tile fades to 60% and its dot turns into an outlined ring.',
    'Track the hovered or focused id in state. When that series is shown, dim every other bar segment to 35% and every other tile to 60%; a hidden series spotlights nothing, so the bar never fades as a whole.',
  ],

  constants: [
    {
      name: 'colour order',
      value: 'chart-6, chart-2, chart-3, chart-5, chart-1, chart-8, chart-4, chart-7, chart-9',
      why: 'Neighbouring defaults alternate cool and warm hues, so adjacent bar segments stay distinct even when no colours are passed.',
    },
    {
      name: 'bar',
      value: 'h-2, 2px gaps, rounded-full track',
      why: 'Thin enough to read as a legend summary rather than a chart; the 1px padding on each side of a segment makes the 2px seams without a gap property that would leave space for hidden segments.',
    },
    {
      name: 'tile grid',
      value: '2 columns, 4 from @xl (container 36rem)',
      why: 'A container query, so the tiles reflow by the card width, not the viewport.',
    },
  ],

  pitfalls: [
    'Do not compute the bar widths as rounded percents. Rounded widths can sum to 99% or 101% and leave a sliver or overflow; flex-grow on a zero basis is always exact.',
    'Give every segment a stable `id`. The hidden list and the hover spotlight key off it.',
    'Values at or below zero are treated as hidden. Negative contributions do not fit a proportion bar.',
  ],

  notes: [
    'Set `toggleable={false}` for a read-only legend; tiles then render as plain `<div>`s.',
    'Pass `formatValue` for currency or compact numbers. It formats both the headline and each tile value.',
    'The bar is a single `role="img"` element whose label lists every shown series and its percent.',
  ],

  apiSignature:
    'type LegendSegment = { id: string; label: string; value: number; color?: "chart-1" | … | "chart-9" }\nfunction LegendStatTiles(props: LegendStatTilesProps): JSX.Element\nfunction wholePercents(values: number[]): number[]',

  props: [
    { name: 'segments', type: 'LegendSegment[]', description: 'Series in display order.' },
    { name: 'title', type: 'string', default: '"Total"', description: 'Header label and the card\'s accessible name.' },
    { name: 'change', type: 'number', description: 'Headline delta as a fraction (0.148 → +14.8%). Lime when positive, rose when negative.' },
    { name: 'hidden / defaultHidden / onHiddenChange', type: 'string[]', default: '[]', description: 'Ids left out of the total, controlled or uncontrolled.' },
    { name: 'toggleable', type: 'boolean', default: 'true', description: 'Tiles toggle their series when clicked.' },
    { name: 'formatValue', type: '(value: number) => string', description: 'Formats the total and tile values. Defaults to Intl.NumberFormat(locale).' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Locale for the default number and percent formats.' },
    { name: 'className', type: 'string', description: 'Merged onto the card.' },
  ],

  reducedMotion:
    'The bar rebalance and the dimming transitions carry `motion-reduce:transition-none`, so under `prefers-reduced-motion: reduce` the bar and tiles jump straight to their new state.',

  cleanup: 'Nothing to clean up. The component has no timers, listeners outside React or effects.',

  acceptance:
    'The headline equals the sum of shown values and the bar segments are proportional to them. The tile percents add up to 100. Clicking a tile hides its series: its percent reads "Off", its dot becomes a ring, its bar segment collapses and the total drops. Clicking it again restores it. The last shown tile cannot be hidden. Hovering a tile dims the other segments. Tiles sit two per row on narrow cards and four per row on wide ones. Light and dark both read correctly.',

  criticalRegion: 'critical',
};

export default meta;
