import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'combo-chart-card',
  title: 'Combo Chart Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'bar-chart', 'line-chart', 'dual-axis', 'dashboard', 'recharts', 'boardui'],
  blurb:
    'A dashboard card with bars on a left axis and a rate line on a right axis; hovering a month spotlights its bar and pops a dot on the line.',
  cost: 'dom',
  motif: 'split',

  files: [{ path: 'registry/ui/combo-chart-card.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['recharts@^3.10.1'],

  summary:
    'A grey dashboard card that plots monthly sessions as rounded Recharts bars against a left axis and the conversion rate as a line with dots against a right percent axis. The header shows total sessions with their change on the period before, the session-weighted conversion rate, a legend and a "This year" calendar pill that swaps the data set. Hovering a month darkens its bar, dims the others, pops a pulsing dot on the line, opens a tooltip with both values and switches the headline and the two tiles to that month.',

  mechanism: [
    'A `ComposedChart` holds two `YAxis` components: `yAxisId="bars"` on the left with compact ticks ("3K", "6K") and `yAxisId="line"` with `orientation="right"` and percent ticks. The `Bar` and the `Line` each name their axis, so sessions and percentages scale independently on one plot.',
    'The right axis domain is `[0, max => Math.max(3, Math.ceil(max * 1.2 / 3) * 3)]`: 20% headroom rounded up to a multiple of 3, so four ticks always land on whole percents (0%, 2%, 4%, 6% for the default data).',
    '`onMouseMove` stores `state.activeTooltipIndex` in `hovered` when `isTooltipActive` is true and the index is finite; `onMouseLeave` clears it. Each bar is a `Cell`: the hovered one is filled with the tone\'s `-active` colour, the others keep the base colour at `fillOpacity` 0.45 with a 200ms `transition-[fill-opacity]`, and all return to full opacity when the pointer leaves.',
    'The `Tooltip` has `cursor={false}` because the spotlighted bar already marks the month. Its content renders `ChartTooltipCard` from `activeIndex` (mapped from `null` to -1 first) with the bar value and the rate to one decimal.',
    'The line has 3px dots ringed in the card colour, and its `activeDot` is the shared `PulseDot`, which pings while the month is hovered.',
    'With nothing hovered the headline is the period total against `previousTotal` and the rate is the session-weighted average `Σ(bar × line) / Σ bar`. With a month hovered both switch to that month, the chip compares it with the month before (hidden for the first month), and the two tiles relabel from "total" / "average" to the month name.',
    'The period switch is the kit `Select` as a calendar pill (or a segmented control with `periodControl="segmented"`). Choosing a period clears `hovered`, updates internal state only when `period` is uncontrolled, and calls `onPeriodChange`.',
  ],

  constants: [
    {
      name: 'dimmed bars',
      value: 'fillOpacity 0.45, 200ms ease-out',
      why: 'Low enough that the hovered bar clearly leads, high enough that the rest still read as data for comparison.',
    },
    {
      name: 'bar shape',
      value: 'radius 6 on all corners, maxBarSize 28, barCategoryGap 22%',
      why: 'Fully rounded pills match the preview; the size cap keeps bars slim on wide cards so the line stays readable over them.',
    },
    {
      name: 'axis widths',
      value: 'left 44px, right 40px',
      why: 'Left fits a compact label such as "10.5K" and right fits "6%" at 12px without clipping.',
    },
    {
      name: 'line dots',
      value: 'r 3 with a 1.5px background-secondary stroke; active PulseDot r 4.5 with ping',
      why: 'Small resting dots show where each monthly rate is measured; the bigger pulsing dot only appears on the hovered month.',
    },
    {
      name: 'plot height',
      value: '240px',
      why: 'The card grows with its header and tiles; a fixed plot box gives `ResponsiveContainer` a definite height.',
    },
  ],

  pitfalls: [
    'Forgetting `yAxisId` on one of the series. Recharts then plots it against the wrong axis, and a 4% rate sits flat at the bottom of an axis that runs to 9,000.',
    'Averaging the monthly rates directly. A plain mean gives 3.65% here; weighting by sessions gives 3.68% (shown as 3.7%), which is the rate actually observed across the year.',
    'Leaving a tooltip cursor on as well as the bar spotlight. Two hover markers on the same month compete; the cursor is turned off.',
    'Reading `activeIndex` with `Number()` directly. Recharts passes `null` when inactive and `Number(null)` is 0, which would pin the tooltip to January.',
  ],

  notes: [
    '`COMBO_PERIODS` and the `ComboPoint`, `ComboPeriod` and `ComboMeasure` types are exported. This year totals 83,200 sessions against 76,050 ("+9.4%") at 3.7% conversion; last year totals 76,050 against 70,300 ("+8.2%") at 3.3%.',
    'Frame, headline, period pill, legend, tooltip card, tiles and pulse dot come from `line-chart-card-parts.tsx`.',
  ],

  apiSignature:
    'function ComboChartCard(props?: ComboChartCardProps): JSX.Element\ntype ComboChartCardProps = { bars?: ComboMeasure; line?: ComboMeasure; periods?: ComboPeriod[]; period?: string; defaultPeriod?: string; onPeriodChange?: (id: string) => void; periodControl?: "segmented" | "select"; className?: string }\ntype ComboMeasure = { label: string; tone: ChartTone }\ntype ComboPoint = { label: string; bar: number; line: number }\ntype ComboPeriod = { id: string; label: string; data: ComboPoint[]; previousTotal?: number }',

  props: [
    { name: 'bars', type: 'ComboMeasure', default: '{ label: "Sessions", tone: 2 }', description: 'Name and colour of the bar measure on the left axis.' },
    { name: 'line', type: 'ComboMeasure', default: '{ label: "Conversion", tone: 6 }', description: 'Name and colour of the line measure, in percent, on the right axis.' },
    { name: 'periods', type: 'ComboPeriod[]', default: 'COMBO_PERIODS', description: 'Data sets the pill switches between; `previousTotal` feeds the chip.' },
    { name: 'period', type: 'string', description: 'Controlled period id.' },
    { name: 'defaultPeriod', type: 'string', default: 'first period id', description: 'Initial period when uncontrolled.' },
    { name: 'onPeriodChange', type: '(id: string) => void', description: 'Called with the chosen period id.' },
    { name: 'periodControl', type: '"segmented" | "select"', default: '"select"', description: 'Calendar pill with a listbox, or a segmented switch.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    'Under `prefers-reduced-motion: reduce`, `useReducedMotion` turns off `isAnimationActive` on the Bar, Line and Tooltip, the headline shows its value without counting, the number fade and the bar opacity transition are disabled with `motion-reduce:` variants, and the active dot drops its ping.',

  cleanup:
    '`useCountUp` cancels its animation frame on target change and unmount, `useReducedMotion` unsubscribes its media-query listener, `ResponsiveContainer` disconnects its resize observer, and the kit `Select` tears down its popover when closed. The card adds no listeners or timers of its own.',

  acceptance:
    'The card shows "Sessions · Conversion 3.7%", "83,200" with a lime "+9.4%" chip, a "This year" pill, a legend, lime rounded bars on a 0 to 9K left axis and a blue dotted line on a 0% to 6% right axis, and tiles "Sessions · total 83,200" and "Conversion · average 3.7%". Hovering a month darkens its bar, fades the rest, pulses a dot on the line and shows a tooltip with both values. Picking "Last year" from the pill shows "76,050" and "+8.2%".',

  criticalRegion: 'critical',
};

export default meta;
