import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'line-chart-card',
  title: 'Line Chart Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'line-chart', 'dashboard', 'recharts', 'tooltip', 'boardui'],
  blurb:
    'A dashboard card with smooth multi-series lines on a dashed grid, a Weekly/Monthly/Yearly switch and a hover tooltip listing every series.',
  cost: 'dom',
  motif: 'wave',

  files: [
    { path: 'registry/ui/line-chart-card.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/ui/line-chart-card-parts.tsx', type: 'registry:ui', role: 'shared chart-card parts' },
  ],
  dependencies: ['recharts@^3.10.1', '@remixicon/react@^4.9.0'],

  summary:
    'A 376px grey dashboard card that draws revenue and costs as two Recharts lines over a dashed horizontal grid, with a soft gradient under the headline series. The header shows the latest revenue with its change against the bucket before, a segmented Weekly / Monthly / Yearly switch that swaps the whole data set, and legend dots. Hovering a point draws a dashed cursor, a pinging dot on each line and a tooltip card with every series value, and the headline counts to that point.',

  mechanism: [
    'The chart is a `ComposedChart` inside a `ResponsiveContainer` that fills a `min-h-0 flex-1` box, so the card height is fixed and the plot takes what the header leaves. `CartesianGrid vertical={false}` with `strokeDasharray="4 4"` in `--color-chart-track` gives the dashed horizontal rules.',
    'Each series is a 2.5px `Line` in its tone\'s `-active` colour; a series with `area: true` also gets a stroke-less `Area` behind its line, filled by a vertical `linearGradient` from `--color-chart-N` at 0.4 opacity to 0. Gradient ids are `useId()` plus the series key, so two cards never share a definition. Series paint in reverse order so the first (headline) series is on top.',
    '`shape="curved"` maps to `type="monotone"` and `shape="sharp"` to `type="linear"` on every Area and Line.',
    '`onMouseMove` stores `state.activeTooltipIndex` in `hovered` when `isTooltipActive` is true and the index is finite; `onMouseLeave` clears it. The headline reads `data[hovered]` or, with nothing hovered, the last point, and compares it with the point before through `describeDelta` ("New" with no baseline, "0%" when the one-decimal change rounds to zero, otherwise a lime or rose percentage).',
    'The `Tooltip` keeps a dashed `--color-chart-cursor` cursor and renders `ChartTooltipCard` from its `activeIndex` (guarded against `null`, since `Number(null)` is 0): the point label, then one row per series with its dot and formatted value.',
    'Every Line\'s `activeDot` is `PulseDot`: a 4.5px dot ringed 2px in the card colour, over a 6px circle at 0.35 opacity running `animate-ping` with `transform-box: fill-box` so it scales about its own centre.',
    'The period switch is `ChartPeriodControl` (the kit `SegmentedControl`, or the kit `Select` as a calendar pill with `periodControl="select"`). Choosing a period clears `hovered`, updates internal state only when `period` is not controlled, and calls `onPeriodChange`.',
    '`ChartHeadline` counts with `useCountUp` (320ms) and replays `.animate-number-fade` by keying the figure on period and hovered index.',
  ],

  constants: [
    {
      name: 'card height',
      value: '376px',
      why: 'Fits the two-row header (figure on the left, switch and legend on the right) plus a plot of about 280px at the 576px preview width, and still leaves a 200px plot when the header stacks on a phone.',
    },
    {
      name: 'area gradient',
      value: 'chart-N at stopOpacity 0.4 → 0, top to bottom',
      why: 'Enough tint to read the headline series as volume while the second line stays visible through it; fading to 0 keeps the axis quiet.',
    },
    {
      name: 'grid and cursor dash',
      value: 'strokeDasharray "4 4", grid in chart-track, cursor in chart-cursor',
      why: 'Same dash for both so the hover cursor reads as part of the grid system, while the darker cursor token keeps it visible over the tinted area.',
    },
    {
      name: 'pulse dot',
      value: 'core r 4.5 with 2px background-secondary stroke, ping r 6 at 0.35 opacity',
      why: 'The card-coloured ring separates the dot from its line in both themes; the ping makes the hovered point findable without a heavier marker.',
    },
    {
      name: 'axes',
      value: 'YAxis width 48, domain [0, "auto"], tickCount 4, ticks 12px tertiary; XAxis preserveStartEnd, minTickGap 12',
      why: '48px fits "$700K" at 12px. Starting at 0 keeps line height honest. preserveStartEnd plus the gap drops middle labels on narrow cards instead of overlapping them.',
    },
    {
      name: 'motion',
      value: 'lines 450ms, tooltip 160ms, count-up 320ms, number-fade 220ms',
      why: 'Fast enough to follow a pointer sweeping along twelve points; all of it is skipped under reduced motion.',
    },
  ],

  pitfalls: [
    'Reading `activeIndex` with `Number()` without a null check. Recharts passes `null` when nothing is active, `Number(null)` is 0, and the tooltip would show the first point. The content function maps `null` to -1 first.',
    'Putting the `Area` after its `Line`. Series paint in source order and the gradient would cover the lower half of the stroke; each series renders Area then Line.',
    'Using `@md:` on the card itself. The card is the `@container`, and container variants only match its descendants, so the header reflows with `@md:` but the card height is a single fixed value.',
    'Dropping the `<Tooltip>` because the headline already follows the pointer. Without it Recharts never reports `activeTooltipIndex`, so neither the headline nor the active dots move.',
  ],

  notes: [
    '`LINE_SERIES`, `LINE_PERIODS` and the `LineSeries`, `LinePoint` and `LinePeriod` types are exported. The defaults end on "$18,240" "+9.4%" (Weekly), "$71,450" "+8.1%" (Monthly) and "$731,000" "+13.9%" (Yearly).',
    '`line-chart-card-parts.tsx` holds the frame, headline, period control, tooltip card, legend, stat tiles and pulse dot that the other BoardUI-kit chart cards in this batch reuse.',
  ],

  apiSignature:
    'function LineChartCard(props?: LineChartCardProps): JSX.Element\ntype LineChartCardProps = { title?: string; series?: LineSeries[]; periods?: LinePeriod[]; period?: string; defaultPeriod?: string; onPeriodChange?: (id: string) => void; shape?: "curved" | "sharp"; periodControl?: "segmented" | "select"; valuePrefix?: string; className?: string }\ntype LineSeries = { key: string; label: string; tone: ChartTone; area?: boolean }\ntype LinePeriod = { id: string; label: string; data: LinePoint[] }',

  props: [
    { name: 'title', type: 'string', default: '"Revenue"', description: 'Header label; while hovering it becomes "Revenue · <point label>".' },
    { name: 'series', type: 'LineSeries[]', default: 'LINE_SERIES', description: 'Series in legend order. The first drives the headline and is drawn on top; `area: true` adds the gradient fill.' },
    { name: 'periods', type: 'LinePeriod[]', default: 'LINE_PERIODS', description: 'Data sets the switch moves between. The switch hides when there is only one.' },
    { name: 'period', type: 'string', description: 'Controlled period id.' },
    { name: 'defaultPeriod', type: 'string', default: 'first period id', description: 'Initial period when uncontrolled.' },
    { name: 'onPeriodChange', type: '(id: string) => void', description: 'Called with the chosen period id.' },
    { name: 'shape', type: '"curved" | "sharp"', default: '"curved"', description: 'Monotone splines or straight segments between points.' },
    { name: 'periodControl', type: '"segmented" | "select"', default: '"segmented"', description: 'Segmented switch, or a calendar pill that opens a listbox.' },
    { name: 'valuePrefix', type: 'string', default: '"$"', description: 'Prepended to the headline, tooltip values and Y-axis ticks.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    'With `prefers-reduced-motion: reduce`, `useReducedMotion` turns off `isAnimationActive` on every Line, Area and the Tooltip, the headline shows its target instead of counting, the number fade gets `motion-reduce:animate-none`, and the active dots render without the ping circle.',

  cleanup:
    '`useCountUp` cancels its animation frame when the target changes and on unmount, `useReducedMotion` unsubscribes its media-query listener, and `ResponsiveContainer` disconnects its resize observer. The card adds no listeners or timers of its own.',

  acceptance:
    'The card shows "Revenue", "$18,240" and a lime "+9.4%" chip, a segmented Weekly / Monthly / Yearly switch with Weekly selected, and Revenue / Costs legend dots. A lime line over a fading lime area sits above a blue line on dashed horizontal rules. Hovering a week draws a dashed cursor, a pinging dot on both lines and a tooltip with both values, and the headline counts to that week. Choosing Monthly swaps the data and shows "$71,450" "+8.1%".',

  criticalRegion: 'critical',
};

export default meta;
