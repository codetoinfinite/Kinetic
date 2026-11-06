import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'earnings-chart-card',
  title: 'Earnings Chart Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'bar-chart', 'earnings', 'dashboard', 'recharts', 'boardui'],
  blurb:
    'An "Earned so far" card of rounded bars in grey tracks; the current or hovered bar darkens, gets an outline ring and drives the headline.',
  cost: 'dom',
  motif: 'stack',

  files: [{ path: 'registry/ui/earnings-chart-card.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['recharts@^3.10.1'],

  summary:
    'A grey dashboard card with a Weekly / Monthly / Yearly switch and twelve rounded Recharts bars, each standing in a full-height grey track. The newest bar is the bucket still running, so it is drawn in the darker active tone and its value is the "Earned so far" headline, counted up in dollars with a chip comparing it to the bar before. Hovering another bar moves the highlight there, fades in an outline ring around its track, opens a small tooltip and switches the headline and chip to that bar.',

  mechanism: [
    'The tracks are the `Bar` `background`, given as a render function. Recharts calls it once per category with the full-height column (`x`, `y`, `width`, `height`, `index`); it draws a `--color-chart-track` rect with an 8px corner radius and, around it, a second rect 3px larger on every side with no fill and a 1.5px stroke in the tone\'s `-active` colour.',
    'The ring is always mounted. Its `opacity` is 1 only for `index === hovered`, and a 150ms `transition-opacity` fades it in and out, so moving across bars reads as the ring sliding between columns.',
    '`onMouseMove` stores `state.activeTooltipIndex` in `hovered` when `isTooltipActive` is true and the index is finite; `onMouseLeave` clears it. The focused bar is `hovered ?? data.length - 1`. Each bar is a `Cell` whose fill is the `-active` colour for the focused bar and the base `chart-N` colour otherwise, with a 200ms `transition-[fill]`.',
    'The headline renders the focused bar through `ChartHeadline` with a "$" formatter, so it counts from the old value to the new one in 320ms. Its chip is `describeDelta(focused, previous)`; the first bar has nothing before it, so the chip is hidden. The label reads "Earned so far" at rest and "Earned · W3" while hovering.',
    'A period can carry fixed Y ticks. The weekly set uses `[0, 3000, 5000, 10000]` ("$0 $3K $5K $10K") as in the preview; the others leave `ticks` out and get four automatic ticks from `tickCount`. All ticks go through `formatCompact` with the "$" prefix.',
    'The `Tooltip` has `cursor={false}` because the ring already marks the column. Its content maps `activeIndex` from `null` to -1 first, then shows the bar\'s value and its change against the bar before.',
    'Choosing a period clears `hovered`, updates internal state only when `period` is uncontrolled, and calls `onPeriodChange`.',
  ],

  constants: [
    {
      name: 'bar shape',
      value: 'radius 8, maxBarSize 32, barCategoryGap 30%',
      why: 'Slim pill bars inside slightly wider-looking tracks match the preview; the size cap keeps six yearly bars from turning into blocks.',
    },
    {
      name: 'hover ring',
      value: '3px outside the track, radius 11, 1.5px stroke, 150ms opacity fade',
      why: 'The gap separates the ring from the grey track so it reads as an outline, and the chart margin is 3px wider on the top and right so the ring is never clipped.',
    },
    {
      name: 'weekly ticks',
      value: '[0, 3000, 5000, 10000]',
      why: 'Uneven on purpose, as in the preview: the $3K and $5K rules help read the many smaller weeks while $10K marks the peaks.',
    },
    {
      name: 'plot height',
      value: '248px',
      why: 'A fixed plot box gives `ResponsiveContainer` a definite height while the card grows with its header.',
    },
    {
      name: 'motion',
      value: 'bars 450ms, tooltip 160ms, bar fill 200ms, ring 150ms, count-up 320ms',
      why: 'Fast enough to follow a pointer sweeping across twelve bars, and all of it is off under reduced motion.',
    },
  ],

  pitfalls: [
    'Using `Bar background={{ fill }}` for the tracks. The object form cannot vary per bar, so there is nowhere to draw the hover ring; the render function gets `index` and can.',
    'Leaving the chart margin at 0. The ring sits 3px outside the track, and the track runs to the top of the plot, so the ring\'s top and the last column\'s right edge would be cut off.',
    'Reading `activeIndex` with `Number()` directly. Recharts passes `null` when inactive and `Number(null)` is 0, which would pin the tooltip to the first bar.',
    'Comparing the first bar with `undefined`. There is no bar before it, so the chip is hidden instead of showing "New".',
  ],

  notes: [
    '`EARNINGS_PERIODS` and the `EarningsPoint` and `EarningsPeriod` types are exported. Weekly ends on $7,462 against $6,500 ("+14.8%"), monthly on $32,450 against $29,100 ("+11.5%") and yearly on $362,400 against $318,900 ("+13.6%").',
    'BoardUI\'s preview shows month labels under the Weekly tab; here each tab has its own buckets (W1 to W12, Jan to Dec, 2019 to 2024) so the labels match the switch.',
    'The frame, headline, period switch and tooltip card come from `line-chart-card-parts.tsx`.',
  ],

  apiSignature:
    'function EarningsChartCard(props?: EarningsChartCardProps): JSX.Element\ntype EarningsChartCardProps = { title?: string; periods?: EarningsPeriod[]; period?: string; defaultPeriod?: string; onPeriodChange?: (id: string) => void; tone?: ChartTone; valuePrefix?: string; periodControl?: "segmented" | "select"; className?: string }\ntype EarningsPeriod = { id: string; label: string; data: { label: string; value: number }[]; ticks?: number[] }',

  props: [
    { name: 'title', type: 'string', default: '"Earned so far"', description: 'Header label while nothing is hovered.' },
    { name: 'periods', type: 'EarningsPeriod[]', default: 'EARNINGS_PERIODS', description: 'Data sets for the switch, oldest bar first; the last bar is the current one. `ticks` fixes the Y ticks.' },
    { name: 'period', type: 'string', description: 'Controlled period id.' },
    { name: 'defaultPeriod', type: 'string', default: 'first period id', description: 'Initial period when uncontrolled.' },
    { name: 'onPeriodChange', type: '(id: string) => void', description: 'Called with the chosen period id.' },
    { name: 'tone', type: 'ChartTone', default: '2', description: 'Bar hue; the current or hovered bar and the ring use its `-active` step.' },
    { name: 'valuePrefix', type: 'string', default: '"$"', description: 'Prefix for the headline, axis ticks and tooltip.' },
    { name: 'periodControl', type: '"segmented" | "select"', default: '"segmented"', description: 'Segmented switch, or a calendar pill that opens a listbox.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    'Under `prefers-reduced-motion: reduce`, `useReducedMotion` turns off `isAnimationActive` on the Bar and the Tooltip, the headline shows its value without counting, and the number fade, bar fill transition and ring fade are disabled with `motion-reduce:` variants.',

  cleanup:
    '`useCountUp` cancels its animation frame on target change and unmount, `useReducedMotion` unsubscribes its media-query listener, and `ResponsiveContainer` disconnects its resize observer. The card adds no listeners or timers of its own.',

  acceptance:
    'The card shows "Earned so far", "$7,462" and a lime "+14.8%" chip with Weekly selected, Y ticks $0, $3K, $5K and $10K, and twelve rounded lime bars in grey tracks with the last one darker. Hovering a bar darkens it, rings its track, shows a tooltip and switches the headline to "Earned · W<n>" and that value. Choosing Monthly shows "$32,450" and "+11.5%"; Yearly shows "$362,400" and "+13.6%".',

  criticalRegion: 'critical',
};

export default meta;
