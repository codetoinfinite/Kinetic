import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'revenue-chart-card',
  title: 'Revenue Chart Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'area-chart', 'dashboard', 'recharts', 'revenue', 'comparison', 'boardui'],
  blurb:
    'A dashboard card that draws a year of revenue as a filled area over last year\'s dashed line, with a hover-following count-up headline.',
  cost: 'dom',
  motif: 'wave',

  files: [
    {
      path: 'registry/ui/revenue-chart-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['recharts@^3.10.1'],

  summary:
    'A 344px dashboard card that charts twelve months of revenue with Recharts. This year is a solid line over a gradient-filled area, and last year is a dashed grey line behind it, so the gap between them is what the eye reads. The header shows the year total in dollars with a delta chip and last year\'s figure. Hovering a month swaps them for that month, counts the number to it and marks the point with a ringed dot.',

  mechanism: [
    'The chart is a `ComposedChart` with three series drawn in order: a dashed `Line` for `previous` (`strokeDasharray="5 5"`, no dots), an `Area` for `current` with no stroke and a gradient fill, and a solid 2.5px `Line` for `current` on top. All three use `type="monotone"` and grow in over 450ms.',
    'The area gradient is a vertical `linearGradient` in the chart\'s `<defs>`, from `--color-chart-2` at 0.35 opacity to 0. Its id comes from `useId()`, so two cards on one page never share or override each other\'s gradient.',
    '`onMouseMove` reads `state.activeTooltipIndex` and stores it in `activeIndex` when `isTooltipActive` is true and the index is finite. `onMouseLeave` clears it. A `<Tooltip content={() => null}>` keeps Recharts tracking the hovered month and draws a dashed vertical cursor (`--color-chart-cursor`, `4 4`) with no tooltip box.',
    'The current line\'s `activeDot` is a custom `ActiveDot`: a 7px circle at 0.25 opacity under a 4px solid circle with a 2px stroke in the card background colour, so the marker reads as a ring cut out of the line. It returns `null` until Recharts passes coordinates.',
    'The header shows the sum of `current` against the sum of `previous`, or the hovered point\'s pair, with the full month name as its label. `describeDelta` gives "New" when the comparison is 0, "0%" when the one-decimal change rounds to zero, otherwise "+x%" in lime or "-x%" in rose. The headline goes through `useCountUp(Math.round(headlineValue))` (320ms ease-out cubic) inside a `<p>` keyed by `activeIndex ?? "total"`, so `.animate-number-fade` replays on every swap.',
    'Money is formatted with `toLocaleString("en-US")` at zero decimals behind a "$". The Y axis is 44px wide with `domain={[0, yMax * 1.1]}`, four ticks and `formatK` labels ("$15k"). The X axis keeps its first and last months at narrow widths through `interval="preserveStartEnd"`.',
  ],

  constants: [
    {
      name: 'area gradient',
      value: 'chart-2 at stopOpacity 0.35 → 0, top to bottom',
      why: 'Enough fill to show the area as volume without hiding the dashed last-year line behind it. Fading to 0 at the axis keeps the bottom of the chart quiet.',
    },
    {
      name: 'line weights',
      value: 'current 2.5px solid, previous 2px dashed 5 5',
      why: 'The heavier solid line is this year and the lighter dashed one is the reference. The difference still reads in greyscale and for colour-blind viewers.',
    },
    {
      name: 'active dot',
      value: 'r 7 halo at 0.25 opacity, r 4 core with a 2px background-colour stroke',
      why: 'The halo makes the hovered point findable at a glance. The background-coloured stroke separates the core from the line it sits on in both themes.',
    },
    {
      name: 'y domain and axis width',
      value: '[0, yMax * 1.1], width 44',
      why: '10% headroom keeps the peak off the top edge. 44px fits "$15k" at 12px, 4px more than the orders card needs for "2.5k".',
    },
    {
      name: 'count-up and fade',
      value: 'useCountUp 320ms, number-fade 220ms',
      why: 'Quick enough to track a pointer sweeping across months. The target is rounded to whole dollars before counting, which matches the zero-decimal money format.',
    },
  ],

  pitfalls: [
    'Using a fixed gradient id such as "revenueFill". Two cards on one page would both point at the first definition, and changing one card\'s colour would recolour the other. The id comes from `useId()`.',
    'Removing the `<Tooltip>` because it renders nothing. Without it Recharts does not track the active index, so the headline and the active dot never follow the pointer.',
    'Drawing the area after the solid line. Series paint in source order, and the area would cover the line\'s lower half. The order is dashed line, area, solid line.',
    'Expecting cents in the headline. The value is rounded before `useCountUp` and the money format uses `maximumFractionDigits: 0`, so December\'s $14,703.92 shows as "$14,704". Change both if your currency needs decimals.',
  ],

  notes: [
    '`REVENUE_DATA` and `RevenuePoint` are exported. The default data adds up to $152,313.92 against $131,304 the year before, which the header shows as "$152,314" and "+16%".',
    'The card shares its frame, header and delta logic with the orders chart card, so the two sit in one dashboard row at the same height.',
  ],

  apiSignature:
    'function RevenueChartCard(props?: { data?: RevenuePoint[]; title?: string; className?: string }): JSX.Element\ntype RevenuePoint = { label: string; current: number; previous: number }\nconst REVENUE_DATA: RevenuePoint[]',

  props: [
    { name: 'data', type: 'RevenuePoint[]', default: 'REVENUE_DATA', description: 'Twelve points, one per month, each with this year\'s and last year\'s revenue.' },
    { name: 'title', type: 'string', default: '"Revenue"', description: 'Header label shown while no month is hovered.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section, for example to set a width.' },
  ],

  reducedMotion:
    'There is no reduced-motion branch. The lines and area draw in over 450ms on mount, the headline counts over 320ms and the number fades in over 220ms on each hover change. All are short and none shifts the layout, but they play regardless of the user\'s setting.',

  cleanup:
    '`useCountUp` cancels its pending animation frame when the target changes and on unmount. `ResponsiveContainer` disconnects its resize observer on unmount. The card adds no listeners of its own.',

  acceptance:
    'The card is 344px tall with "Revenue", "$152,314", a lime "+16%" chip and "$131,304 last year" in the header. A lime line over a fading lime area rises above a dashed grey line. Hovering a month draws a dashed vertical cursor, puts a ringed dot on the lime line, names the full month and counts the headline to that month\'s revenue with its own delta. Leaving the chart returns to the total.',

  criticalRegion: 'critical',
};

export default meta;
