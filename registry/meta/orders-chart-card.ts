import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'orders-chart-card',
  title: 'Orders Chart Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'bar-chart', 'dashboard', 'recharts', 'comparison', 'kpi', 'boardui'],
  blurb:
    'A dashboard card of monthly orders as paired bars, this year beside last, whose count-up headline follows the hovered month.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/orders-chart-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['recharts@^3.10.1'],

  summary:
    'A 344px dashboard card that charts twelve months of orders as grouped Recharts bars, last year in neutral grey beside this year in indigo. The header shows the year total with a delta chip and the year-earlier figure. Hovering a month swaps all three for that month, and the number counts to its new value. It shares its frame and header with the revenue chart card and the stat cards, so it drops into the same dashboard row.',

  mechanism: [
    'One piece of state, `activeIndex`, drives the header. `BarChart`\'s `onMouseMove` reads `state.activeTooltipIndex`, and when `isTooltipActive` is true and the index is finite it stores it. `onMouseLeave` resets it to `null`. A `<Tooltip content={() => null}>` keeps Recharts tracking the hovered category and drawing its cursor band (`fill: var(--color-chart-track)`, opacity 0.5) without rendering a tooltip box.',
    'With no month hovered the headline is the sum of `current` over `data` and the comparison is the sum of `previous`. With a month hovered they are that point\'s two values, and the label becomes the full month name looked up from the short `label` through `MONTHS` and `MONTHS_FULL` (it falls back to the raw label).',
    '`describeDelta` turns the pair into a chip. A zero `previous` gives "New" in neutral. Otherwise the percentage change is rounded to one decimal: 0 gives "0%" in neutral, a rise gives "+x%" in lime and a fall "-x%" in rose.',
    'The figure is passed through `useCountUp(headlineValue)`, which eases from the shown value to the new one over 320ms with an ease-out cubic on `requestAnimationFrame`. The `<p>` holding it is keyed by `activeIndex ?? "total"`, so each change remounts it and replays `.animate-number-fade` (220ms, opacity 0.35 to 1). The digits are `tabular-nums` and formatted with `toLocaleString("en-US")`.',
    'The chart fills the rest of the card through `ResponsiveContainer` at 100% by 100% inside a `min-h-0 flex-1` box. `barCategoryGap="28%"` and `barGap={3}` keep each month\'s pair together. The Y axis is fixed at 40px wide with `domain={[0, yMax * 1.1]}`, four ticks and `formatK` labels ("2.5k"). The X axis uses `interval="preserveStartEnd"`, so narrow cards drop middle months but keep January and December.',
    'Both bars use `radius={[4, 4, 0, 0]}` and grow in over 450ms on mount. Colours are CSS variables (`--color-chart-neutral`, `--color-chart-9-active`) passed to Recharts as `fill`, so the chart follows the light and dark theme without re-rendering.',
  ],

  constants: [
    {
      name: 'card height',
      value: 'h-[344px], gap-6, px-4 pt-4 pb-3',
      why: 'Matches the revenue chart card and the stat-card rows, so chart cards placed side by side line up. The chart takes whatever height the header leaves.',
    },
    {
      name: 'y domain',
      value: '[0, yMax * 1.1]',
      why: 'The 10% headroom keeps the tallest bar off the top edge. The axis starts at 0 because a bar\'s length is the value, and a cut axis would exaggerate the gap between years.',
    },
    {
      name: 'bar spacing',
      value: 'barCategoryGap 28%, barGap 3',
      why: 'A 3px gap reads the two bars as one pair, and the 28% gap between months separates pairs clearly, so twelve pairs still fit at about 560px.',
    },
    {
      name: 'count-up and fade',
      value: 'useCountUp 320ms ease-out cubic, number-fade 220ms',
      why: 'Fast enough to keep up with a pointer sweeping across months. The fade restarts on every change and covers the first frames of the count, so the swap never looks like a jump.',
    },
    {
      name: 'bar entrance',
      value: 'animationDuration 450',
      why: 'Long enough to show the bars growing on first paint, short enough to finish before a user reaches for the chart.',
    },
  ],

  pitfalls: [
    'Dropping the `<Tooltip>`. Without it Recharts does not track the active category, `activeTooltipIndex` never arrives in `onMouseMove`, and the headline never follows the pointer. It renders `content={() => null}` on purpose.',
    'Putting the card in a parent with no height. The chart is `ResponsiveContainer height="100%"` inside a flex child, and the card sets `h-[344px]` itself. Overriding that with `h-auto` collapses the chart to zero height.',
    'Passing more or fewer than twelve points without matching labels. The month names come from looking up `label` in `MONTHS`; a label like "Q1" still works but shows as "Q1" in the header.',
    'Hard-coding hex colours into the `Bar` fills. They are theme variables, so the chart follows the theme with no re-render.',
  ],

  notes: [
    '`ORDERS_DATA` and `OrdersPoint` are exported. The default data adds up to 25,162 orders against 20,968 the year before, which the chip shows as "+20%".',
    'Recharts is forced to `direction: ltr` and its focus outlines are hidden by the theme stylesheet, so the chart reads left to right in an RTL page while the header mirrors.',
  ],

  apiSignature:
    'function OrdersChartCard(props?: { data?: OrdersPoint[]; title?: string; className?: string }): JSX.Element\ntype OrdersPoint = { label: string; current: number; previous: number }\nconst ORDERS_DATA: OrdersPoint[]',

  props: [
    { name: 'data', type: 'OrdersPoint[]', default: 'ORDERS_DATA', description: 'Twelve points, one per month, each with this year\'s and last year\'s orders.' },
    { name: 'title', type: 'string', default: '"Orders"', description: 'Header label shown while no month is hovered.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section, for example to set a width.' },
  ],

  reducedMotion:
    'There is no reduced-motion branch. The bars grow in over 450ms on mount, the headline counts over 320ms through `useCountUp` and the number fades in over 220ms on each hover change. All three are short and none moves the layout, but they play regardless of the user\'s setting.',

  cleanup:
    '`useCountUp` cancels its pending animation frame when the value changes and on unmount. `ResponsiveContainer` disconnects its resize observer when the card unmounts. The card adds no listeners of its own.',

  acceptance:
    'The card is 344px tall with "Orders", "25,162" (shown at once, with no count on mount), a lime "+20%" chip and "20,968 last year" in the header, and "This year" and "Last year" legend dots at the end. Twelve pairs of rounded bars grow in. Hovering a month bands it, the label becomes the full month name, and the number counts to that month\'s orders with its own delta. Leaving the chart returns to the total.',

  criticalRegion: 'critical',
};

export default meta;
