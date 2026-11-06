/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Finance KPI Row" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'finance-kpi-row',
  title: 'Finance KPI Row',
  category: 'display',
  kit: 'boardui',
  tags: ['kpi', 'finance', 'dashboard', 'sparkline', 'stats', 'boardui'],
  blurb: 'Balance, income, expense and savings cards with a delta chip coloured by good or bad news and a tiny area sparkline.',
  cost: 'css',
  motif: 'wave',

  files: [
    {
      path: 'registry/ui/finance-kpi-row.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A responsive row of grey KPI cards. Each card has a white icon tile, a label, the value in a 24px medium figure, a percent delta chip and a 96×36 sparkline with a soft area fill and an end dot. The chip and line colour follow whether the move is good news, so rising expenses read rose while rising income reads lime. With `selectable`, the cards become pressed-state buttons that pick one metric for a chart.',

  mechanism: [
    'Wrap the list in a `@container` and lay it out as a grid: one column, two from `@sm` (24rem) and four from `@3xl` (48rem), so the row wraps by its own width rather than the viewport. Below `@sm` each card collapses to one compact line (icon, figures, sparkline) by turning the top line into `display: contents` and reordering with `order`, so four cards fit a phone screen.',
    'Classify each card with `toneOf(change, goodDirection)`: zero is flat, otherwise good when the sign of the change matches the good direction (`"up"` by default, `"down"` for expenses). Good maps to a lime chip and a chart-7 line, bad to rose and chart-3, flat to neutral.',
    'Project the trend with `sparkPoints` into a 96×36 box with 3 units of padding: x steps evenly across the points, y is inverted against the series min and max, and a flat series sits on the middle line.',
    'Draw a `M…L…` line path with a 1.75 stroke, close a copy down to the baseline for the area and fill it with a per-instance `useId` linear gradient from 28% to 0% of `currentColor`, then mark the last point with a 3-unit dot outlined in the card colour.',
    'Format values with `Intl.NumberFormat(locale, { style: "currency", maximumFractionDigits: 0 })` unless the item passes its own `format`, and deltas with a percent format using `signDisplay: "exceptZero"`; the chip also carries a screen-reader-only comparison label.',
    'When `selectable`, render each card as a `<button aria-pressed>` and resolve the selection controlled (`selectedId`) or from local state seeded by `defaultSelectedId` or the first item; the selected card lifts to a white surface with a hairline ring.',
  ],

  constants: [
    { name: 'sparkline box', value: '96×36 with 3px padding', why: 'Fits the empty top-right corner beside the 32px icon tile without crowding the value line.' },
    { name: 'area gradient', value: '28% → 0% currentColor', why: 'Enough fill to read the shape at a glance, faint enough that the line stays the mark.' },
    { name: 'grid breakpoints', value: '1 col, 2 from @sm (24rem), 4 from @3xl (48rem)', why: 'A $84,230 figure plus its chip needs about 180px; below that the cards stack.' },
    { name: 'value type', value: 'text-title-1-medium (24px)', why: 'Matches the headline figures of the other dashboard cards.' },
  ],

  pitfalls: [
    'Colour the delta by good or bad news, not by sign. A +2.4% expense increase is bad and must not read lime.',
    'Give each sparkline gradient its own id (`useId`). A shared id makes every card paint with the first card\'s colour.',
    'A series with fewer than two points has no line; the sparkline is skipped rather than drawn as a dot.',
  ],

  notes: [
    'Pass `format` per item for non-currency metrics such as a savings rate.',
    'Without `selectable` the cards are plain `<div>`s with no focus stops.',
    '`sparkPoints` is exported for reuse in other tiny charts.',
  ],

  apiSignature:
    'type FinanceKpi = { id: string; label: string; value: number; change: number; trend?: number[]; icon?: ComponentType; goodDirection?: "up" | "down"; format?: (v: number) => string }\nfunction FinanceKpiRow(props: FinanceKpiRowProps): JSX.Element\nfunction sparkPoints(values: number[], w?: number, h?: number, pad?: number): [number, number][]',

  props: [
    { name: 'items', type: 'FinanceKpi[]', description: 'Cards in display order.' },
    { name: 'selectable', type: 'boolean', default: 'false', description: 'Turns the cards into aria-pressed buttons that pick one metric.' },
    { name: 'selectedId / defaultSelectedId / onSelectionChange', type: 'string', default: 'first item id', description: 'Selected card, controlled or uncontrolled.' },
    { name: 'currency', type: 'string', default: '"USD"', description: 'ISO 4217 code for the default value format.' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Locale for values and percents.' },
    { name: 'comparisonLabel', type: 'string', default: '"vs last month"', description: 'Screen-reader text appended to each delta chip.' },
    { name: 'aria-label', type: 'string', default: '"Key metrics"', description: 'Accessible name of the list.' },
    { name: 'className', type: 'string', description: 'Merged onto the container.' },
  ],

  reducedMotion:
    'The only motion is the 200ms surface change when a card is selected; it carries `motion-reduce:transition-none`, so under `prefers-reduced-motion: reduce` the selection switches instantly.',

  cleanup: 'Nothing to clean up. The component has no timers, listeners or effects.',

  acceptance:
    'Four cards show Total balance $84,230 +3.2%, Income $18,420 +6.1%, Expenses $9,140 +2.4% and Savings $32,400 +8.4%. The Expenses chip and sparkline are rose, the others lime. Each sparkline ends in a dot at its last value. Clicking Income sets aria-pressed on it, lifts it to a white surface and the demo caption reads "Charting Income". The row shows four cards across at 1100px, two at medium widths and, at 360px, one compact single-line card per row so all four plus the caption stay on screen. Light and dark both read correctly.',

  criticalRegion: 'critical',
};

export default meta;
