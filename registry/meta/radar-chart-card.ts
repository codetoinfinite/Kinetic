import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'radar-chart-card',
  title: 'Radar Chart Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'radar-chart', 'polar', 'dashboard', 'recharts', 'boardui'],
  blurb:
    'A "Visitors" card with a lime radar on a hexagon grid; hovering an axis pulses its vertex and counts the header to that month.',
  cost: 'dom',
  motif: 'orbit',

  files: [{ path: 'registry/ui/radar-chart-card.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['recharts@^3.10.1'],

  summary:
    'A grey dashboard card that plots six months of visitors as a Recharts radar on a hexagonal polar grid, with the range total counted up in the header next to a chip comparing it with the range before, and a white tile per month underneath. A calendar pill swaps between H1 2024, H2 2024 and the full year. Hovering an axis pulses a dot on that vertex, opens a tooltip with the value and its share, and switches the header to that month. Four looks are built in: a filled polygon, a light fill with vertex dots, an outline only, and a fill with a centre score disc that turns rose when the value it shows is low.',

  mechanism: [
    'A `RadarChart` draws a `PolarGrid` with `gridType="polygon"` in `--color-chart-track`, a `PolarAngleAxis` keyed on the month label for the outer labels, and a hidden `PolarRadiusAxis` (no ticks, no line) with its domain set to `[0, "auto"]` so the polygon always grows from the centre.',
    'Hover state comes from Recharts\' own store. `RadarActiveAxis` is a child of the chart that reads `useIsTooltipActive()` and `useActiveTooltipLabel()` and passes the active label (or null) up in an effect. Reading the store, rather than the chart\'s `onMouseMove` payload, means the header is right on the very first pointer event over the chart and follows the chart\'s arrow-key focus too.',
    'The hovered label is looked up in the current range by name, so after a range switch a stale label simply finds nothing and the header falls back to the total. With an axis active the header shows that axis value and hides the chip; at rest it shows the sum against `previous` through `describeDelta`.',
    'The `Radar` keeps one 2px outline in the tone\'s `-active` colour and changes only `fillOpacity` per look: 0.6 filled, 0.2 dots, 0 lines, 0.35 score. The dots look adds 3.5px vertex dots ringed in the card colour; every look uses the shared `PulseDot` as `activeDot`, which pings unless motion is reduced.',
    'The score disc is an absolutely centred HTML circle over the plot. The chart margins match on opposite sides (12px top and bottom, 40px left and right), which keeps the polar centre at the middle of the plot box, so `top-1/2 left-1/2` with a translate lands on it. It shows the axis average at rest and the hovered value on hover, and its text and border switch to the rose status colour below `lowThreshold`.',
    'The tooltip uses a dashed radial cursor and renders `ChartTooltipCard` from `activeIndex` (mapped from `null` to -1 first) with the value and its share of the range total.',
  ],

  constants: [
    {
      name: 'outer radius',
      value: '78% of the plot half-size, 280px plot height',
      why: 'The radius is a share of the smaller plot side, so on a wide card the 280px height sets it and on a 360px screen the narrowed width does, leaving room for "February" and "September" at the side vertices.',
    },
    {
      name: 'fill per look',
      value: 'filled 0.6, dots 0.2, lines 0, score 0.35',
      why: 'The solid look matches the preview; the dots look needs a lighter fill so the dots carry the shape; the score look stays light enough for the disc to read on top.',
    },
    {
      name: 'chart margin',
      value: '12px top and bottom, 40px left and right',
      why: 'Matching opposite margins keep the polar centre at the middle of the box, where the score disc is positioned with plain CSS; the wider sides shrink the radius only when the card is narrow, so the side labels are never cut off.',
    },
    {
      name: 'low threshold',
      value: '200',
      why: 'With the default data, January (186) is the only month under it, so hovering it shows the rose disc while the 237 average stays neutral.',
    },
    {
      name: 'motion',
      value: 'polygon 500ms, tooltip 160ms, disc colour 200ms, count-up 320ms',
      why: 'Quick enough to sweep round six axes, and all of it is off under reduced motion.',
    },
  ],

  pitfalls: [
    'Driving the header from the chart `onMouseMove` payload alone. In testing, a single pointer event that entered the chart opened the tooltip but left that payload inactive, so the header stayed on the total; the store hooks update on the same event.',
    'Using different margins on opposite sides with the centred disc. The polar centre follows the plot area, not the box, and the disc would sit off the hub.',
    'Reading `activeIndex` with `Number()` directly. Recharts passes `null` when inactive and `Number(null)` is 0, which would pin the tooltip to January.',
  ],

  notes: [
    '`RADAR_RANGES`, `RADAR_MARGIN`, `RADAR_OUTER_RADIUS`, `RadarActiveAxis` and the `RadarRange`, `RadarAxisPoint` and `RadarVariant` types are exported; Radar Comparison Card reuses them. H1 2024 totals 1,424 against 1,354 ("+5.2%"), H2 2024 1,598 ("+12.2%") and 2024 3,022 against 2,780 ("+8.7%").',
    'The full-year range uses two-month buckets so every range keeps six axes and six tiles.',
    'The frame, header, range pill, tooltip card, tiles and pulse dot come from `line-chart-card-parts.tsx`.',
  ],

  apiSignature:
    'function RadarChartCard(props?: RadarChartCardProps): JSX.Element\ntype RadarChartCardProps = { title?: string; ranges?: RadarRange[]; range?: string; defaultRange?: string; onRangeChange?: (id: string) => void; variant?: "filled" | "dots" | "lines" | "score"; tone?: ChartTone; lowThreshold?: number; rangeControl?: "segmented" | "select"; hideTiles?: boolean; className?: string }\ntype RadarRange = { id: string; label: string; data: { label: string; value: number }[]; previous?: number }',

  props: [
    { name: 'title', type: 'string', default: '"Visitors"', description: 'Header label and series name.' },
    { name: 'ranges', type: 'RadarRange[]', default: 'RADAR_RANGES', description: 'Data sets for the pill, one point per axis clockwise from the top; `previous` feeds the chip.' },
    { name: 'range', type: 'string', description: 'Controlled range id.' },
    { name: 'defaultRange', type: 'string', default: 'first range id', description: 'Initial range when uncontrolled.' },
    { name: 'onRangeChange', type: '(id: string) => void', description: 'Called with the chosen range id.' },
    { name: 'variant', type: '"filled" | "dots" | "lines" | "score"', default: '"filled"', description: 'Solid polygon, light fill with vertex dots, outline only, or fill with a centre score disc.' },
    { name: 'tone', type: 'ChartTone', default: '2', description: 'Series hue; the outline, dots and active dot use its `-active` step.' },
    { name: 'lowThreshold', type: 'number', default: '200', description: 'Score look only: the disc turns rose below this value.' },
    { name: 'rangeControl', type: '"segmented" | "select"', default: '"select"', description: 'Calendar pill with a listbox, or a segmented switch.' },
    { name: 'hideTiles', type: 'boolean', default: 'false', description: 'Hide the per-axis tiles under the chart.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    'Under `prefers-reduced-motion: reduce`, `useReducedMotion` turns off `isAnimationActive` on the Radar and the Tooltip, the header shows its value without counting, the active dot drops its ping, and the number fade and disc colour transition are disabled with `motion-reduce:` variants.',

  cleanup:
    '`RadarActiveAxis` only runs an effect that calls the setter, `useCountUp` cancels its animation frame on target change and unmount, `useReducedMotion` unsubscribes its media-query listener, `ResponsiveContainer` disconnects its resize observer, and the kit `Select` tears down its popover when closed. The card adds no listeners or timers of its own.',

  acceptance:
    'The card shows "Visitors", "1,424" with a lime "+5.2%" chip, an "H1 2024" pill, a lime filled hexagon radar labelled January to June on a grey polygon grid, and six tiles January 186, February 305, March 237, April 273, May 209 and June 214. Hovering an axis pulses its vertex, opens a tooltip with the value and share, and changes the header to "Visitors · <month>" and that value. Picking "H2 2024" shows "1,598" and "+12.2%". The score look shows a disc reading 237 that turns rose on January.',

  criticalRegion: 'critical',
};

export default meta;
