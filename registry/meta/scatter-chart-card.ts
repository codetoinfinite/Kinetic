/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Scatter Chart Card" (boardui.com/components/scatter-chart-card).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'scatter-chart-card',
  title: 'Scatter Chart Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'scatter-chart', 'bubble-chart', 'dashboard', 'recharts', 'correlation', 'boardui'],
  blurb:
    'A dashboard scatter card: records grouped into coloured series, sized by a third measure, with a hover headline, readout and average tiles.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/scatter-chart-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['recharts@^3.10.1', '@remixicon/react@^4.9.0'],

  summary:
    'A grey dashboard card that plots one dot per record against two measures with a Recharts `ScatterChart`, one `Scatter` per series in its own chart token. When any point carries a `z`, the dots become bubbles sized by it. Hovering a dot, or focusing the plot and pressing the arrow keys, puts that record in the count-up headline with its gap to the average, dims the other series and floats a small readout over the dot. White tiles under the plot give each series\' average, and a period pill swaps the dataset through a dropdown.',

  mechanism: [
    'Derive a model from the active series in one `useMemo`: x ticks are `niceTicks(xMax, 4)` and y ticks `niceTicks(yMax, 3)`, where `niceStep` rounds `max / count` up to two significant digits in fives (533 → 550, 24.3 → 25). The last tick becomes the axis domain, so the top grid line and the highest dot share a scale. The model also holds the z range, the overall and per-series averages of `y`, and a keyboard order of every record sorted by x then y.',
    'Render `ScatterChart` with fixed geometry: margin `{ top: 20, right: 12, bottom: 0, left: 0 }`, a 40px `YAxis`, a 26px `XAxis` and a 208px plot box. Ticks are 12px in `--color-text-tertiary`, the y ticks run through `Intl.NumberFormat` compact notation ("1.1K"), and a dashed `CartesianGrid` in `--color-chart-track` draws both directions. `accessibilityLayer` is off because the wrapper is the single tab stop.',
    'Each `Scatter` gets a closure `shape` that draws a `<g>` holding the dot: the radius is 5 for plain dots or lerped 6 → 14 across the z range for bubbles. Fill is the series token at 0.85 opacity with a 1.25px ring in its `-active` shade. The active record gets a halo at radius + 5 and 0.3 opacity, and its ring turns into a 2px stroke in the card colour. Every other series drops to opacity 0.22 through a 150ms opacity transition. `onMouseEnter`/`onMouseLeave` on the group set and clear `active`.',
    'The wrapper div repeats Recharts\' geometry to place HTML over the plot: `left = 40 + x / xMax * (width - 52)` and `top = 20 + (1 - y / yMax) * 162`, with `width` from `useResizeObserver`. The readout sits above the dot at radius + 10px and flips its horizontal anchor within 90px of either edge. It shows the record name, then the x and y measures under the axis captions.',
    'The wrapper is `tabIndex=0` with `role="group"` and an aria-label that lists each series average. Arrow Right/Up and Left/Down step through the sorted records, Home and End jump to the ends, and Escape or blur clears the selection.',
    'The header shows `title` and the overall average, or "Record · Series" and that record\'s y. The value runs through `useCountUp` (bypassed under reduced motion) inside a `<p>` keyed by the active record, so `.animate-number-fade` replays. The chip shows the period `change`, or the record\'s percent gap to the average with a "vs avg" suffix, in lime when the value is zero or above and in rose below zero.',
    'When `ranges` is passed, the pill is a kit `Dropdown`. Selecting an item updates the range (controlled through `range`/`onRangeChange`, otherwise held in state), clears the active record and closes the menu. Without `ranges` the pill is a static span showing `periodLabel`. Hovering a tile or a legend row sets `hoveredSeries`, which dims the other series the same way an active dot does.',
  ],

  constants: [
    {
      name: 'plot geometry',
      value: 'height 208, margin top 20 / right 12, YAxis 40, XAxis 26',
      why: 'The readout and the keyboard focus are placed in HTML from these numbers. If any of them changes in only one place, the readout drifts off its dot. The 20px top margin leaves room for the largest bubble\'s halo (14 + 5px) above the top grid line.',
    },
    {
      name: 'bubble radius',
      value: '6 → 14px over the z range; 5px plain dots',
      why: 'Below 6px a bubble reads as a plain dot, and above 14px the top-plan bubbles overlap their neighbours on a 576px card.',
    },
    {
      name: 'dim opacity',
      value: '0.22 over 150ms',
      why: 'Low enough that the active series reads as the only one on the plot, high enough that the other series still show where they sit.',
    },
    {
      name: 'tick counts',
      value: 'x 4 intervals, y 3 intervals, nice step in fives at two significant digits',
      why: 'Gives 0 / 25 / 50 / 75 / 100 and 0 / 550 / 1.1K / 1.7K for the default data, so the labels stay short at 12px.',
    },
    {
      name: 'default averages',
      value: 'Starter 270, Growth 783, Scale 1,388; overall 744',
      why: 'The demo data is chosen so the tiles show these figures. The headline is the mean of all 17 records, not of the three series averages.',
    },
  ],

  pitfalls: [
    'Letting Recharts pick the axis domains. Its automatic domain can end above the last tick, and the readout\'s position, computed from `xMax` and `yMax`, would no longer line up with the dots. The domains are fixed to the last nice tick.',
    'Leaving `accessibilityLayer` on. The SVG becomes a second tab stop whose arrow keys move a tooltip that is not rendered, next to the wrapper\'s own record navigation.',
    'Averaging the series averages for the headline. Series have different sizes, so the overall figure is the mean of every record.',
    'Drawing the readout inside the SVG. Text in SVG cannot wrap or size itself to its content. The readout is an HTML layer over the plot with `pointer-events: none`, so it never steals the hover from the dot under it.',
  ],

  notes: [
    '`SCATTER_SERIES` and the `ScatterPoint`, `ScatterSeries` and `ScatterRange` types are exported. A series `color` takes any CSS colour and is used for the fill, the ring and the swatch.',
    'Pass `tiles={false}` for the compact legend line, and `bubble={false}` for even dots when the data carries `z`.',
  ],

  apiSignature:
    'function ScatterChartCard(props?: ScatterChartCardProps): JSX.Element\ntype ScatterPoint = { x: number; y: number; z?: number; label?: string }\ntype ScatterSeries = { label: string; points: ScatterPoint[]; color?: string }\ntype ScatterRange = { id: string; label: string; series: ScatterSeries[]; change?: number }\nconst SCATTER_SERIES: ScatterSeries[]',

  props: [
    { name: 'title', type: 'string', default: '"Revenue per account"', description: 'Header label while no record is active.' },
    { name: 'series', type: 'ScatterSeries[]', default: 'SCATTER_SERIES', description: 'Records grouped into series. Ignored when `ranges` is passed.' },
    { name: 'change', type: 'number', default: '6.8', description: 'Percent change shown in the chip when `ranges` is not used.' },
    { name: 'periodLabel', type: 'string', default: '"This quarter"', description: 'Text of the static period pill. Pass an empty string to hide it.' },
    { name: 'ranges', type: 'ScatterRange[]', description: 'Periods to choose from. The pill becomes a dropdown and each range brings its own series and change.' },
    { name: 'range', type: 'string', description: 'Controlled active range id.' },
    { name: 'defaultRange', type: 'string', default: 'first range', description: 'Uncontrolled starting range id.' },
    { name: 'onRangeChange', type: '(id: string) => void', description: 'Called with the id picked from the period menu.' },
    { name: 'axisLabels', type: '[string, string]', default: '["Sessions", "Revenue"]', description: 'Captions for the x and y measures, shown under the plot and in the readout.' },
    { name: 'format', type: '(value: number) => string', default: 'rounded en-US number', description: 'Formats y values in the headline, tiles and readout.' },
    { name: 'formatX', type: '(value: number) => string', default: 'rounded en-US number', description: 'Formats x values in the readout.' },
    { name: 'bubble', type: 'boolean', default: 'true when any point has z', description: 'Size dots by `z`. False forces 5px dots.' },
    { name: 'tiles', type: 'boolean', default: 'true', description: 'Average tiles under the plot. False shows a centred one-line legend.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    'Under `prefers-reduced-motion: reduce` the scatter entrance animation is off (`isAnimationActive={false}`), the headline shows its value with no count-up, and `.animate-number-fade` is removed with `motion-reduce:animate-none`. The series dimming and the chevron rotation change instantly through `motion-reduce:transition-none`.',

  cleanup:
    '`useResizeObserver` unregisters the plot wrapper from the shared observer on unmount. `useCountUp` cancels its animation frame when the target changes and on unmount. `ResponsiveContainer` disconnects its own observer. The dropdown\'s outside-press listener is removed when the menu closes. Pointer and key handlers are React props.',

  acceptance:
    'The card shows "Revenue per account", "744" and a lime "+6.8%" chip, with a "This quarter" pill. The plot has lime, blue and purple bubbles on a dashed grid with ticks 0–100 and 0–1.7K, "Revenue" and "Sessions" captions, and tiles reading Starter · avg 270, Growth · avg 783 and Scale · avg 1,388. Hovering the top-right bubble changes the header to "Quill · Scale" and "1,640", dims the lime and blue dots and shows a readout with Sessions 98. Focusing the plot and pressing End does the same. Picking "This year" from the pill redraws the plot with larger values and a "+18.2%" chip.',

  criticalRegion: 'critical',
};

export default meta;
