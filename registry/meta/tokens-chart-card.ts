/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Tokens Chart Card" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'tokens-chart-card',
  title: 'Tokens Chart Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'recharts', 'tokens', 'usage', 'area', 'boardui'],
  blurb:
    'Daily token usage as a sharp purple line over a soft area, idle days dashed on the baseline, with a period switch and day scrubbing.',
  cost: 'dom',
  motif: 'wave',

  files: [
    {
      path: 'registry/ui/tokens-chart-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['recharts@^3.10.1'],

  summary:
    'The usage card of an AI profile. A grey card shows "Tokens", the period total such as "667.7M tokens" with a purple trend chip, and a full-bleed chart of daily usage: a straight-jointed purple line over a faint purple area. Days with no usage leave the line and run along the baseline as a dashed grey segment. A segmented switch changes the period, and hovering or arrowing through the chart reads out single days.',

  mechanism: [
    'Recharts `ComposedChart` with hidden axes inside a `ResponsiveContainer`, flush with the card edges. The area uses `type="linear"` with a miter join, so peaks stay sharp like the reference rather than smoothed into hills. The fill is a vertical gradient of `--color-chart-5` from 28% to 2% opacity, its id from `useId`.',
    'Each day is split into two series. `line` holds the value on busy days and on zero days that touch a busy day; `idle` holds 0 on zero days only. Recharts breaks a series at `null`, so the solid line drops to the baseline at the start of an idle run, the dashed `idle` line carries the run, and the solid line climbs out at its end.',
    'The chart wrapper is a `role="slider"` over the day index. The mouse sets the active day from `activeTooltipIndex` (the Tooltip renders nothing); the keyboard uses ArrowLeft and ArrowRight, Home, End and Escape. `aria-valuetext` reads "Dec 3: 24.1M tokens" or the period total, and Recharts\' own accessibility layer is turned off so there is one focus stop, not two.',
    'The active day is drawn with a dashed `ReferenceLine` and a `ReferenceDot` ringed in the card colour, both driven by state, so mouse and keyboard look identical. While a day is active the caption shows its date, the headline its value, and the trend chip hides.',
    'The period total rolls with the kit `useCountUp` hook (480ms) when the period changes; the rolling text is `aria-hidden` with a visually hidden copy of the final value. The period switch is the kit SegmentedControl; the card works controlled (`period`) or uncontrolled (`defaultPeriod`).',
  ],

  constants: [
    {
      name: 'chart height',
      value: '176px (h-44), 8px top margin, y domain 0 to 112% of the max',
      why: 'The tallest peak keeps a little air under the header, and the baseline sits just above the date captions.',
    },
    {
      name: 'line',
      value: '1.75px, linear, miter join; area 28% to 2% chart-5',
      why: 'Thin and sharp so 90 days still read as individual days; the faint area gives the line weight without hiding the dashed baseline.',
    },
    {
      name: 'idle segment',
      value: '1.25px dashed 4 4 in text-tertiary',
      why: 'Quieter than the data line but darker than the grid colours, so a gap reads as "no runs" and not as missing data.',
    },
    {
      name: 'count-up',
      value: '480ms',
      why: 'Long enough to read as a new period, short enough to finish before the line has drawn in.',
    },
  ],

  pitfalls: [
    'Plotting idle days as normal zeros. The line then dives into a long trough that looks like a crash; splitting into a solid and a dashed series says "nothing ran" instead.',
    'Using `monotone` curves for spiky daily data. Smoothing overshoots below zero around sharp peaks and hides the day-to-day rhythm; use straight segments.',
    'Leaving Recharts\' accessibility layer on next to your own keyboard handling. The SVG becomes a second, silent focus stop with its own tooltip state.',
    'Animating the area on every hover. Only data changes should animate; the active day is drawn with reference marks, which never re-run the line animation.',
  ],

  notes: [
    'Pass one period to hide the switch. Feed `onPeriodChange` to fetch a longer range on demand.',
    'Change `unit` and `formatValue` to chart requests, images or minutes instead of tokens.',
  ],

  apiSignature:
    'function TokensChartCard(props: TokensChartCardProps): JSX.Element\ninterface TokensChartCardProps extends Omit<HTMLAttributes<HTMLElement>, "children"> { title?: string; periods: TokenPeriod[]; period?: string; defaultPeriod?: string; onPeriodChange?: (id: string) => void; unit?: string; endLabel?: string; formatValue?: (value: number) => string; ref?: Ref<HTMLElement> }\ninterface TokenPeriod { id: string; label: string; points: { label: string; value: number }[]; trend?: number }',

  props: [
    { name: 'title', type: 'string', default: '"Tokens"', description: 'Caption above the headline when no day is active.' },
    { name: 'periods', type: 'TokenPeriod[]', description: 'Each period: id, switch label, daily points and an optional trend.' },
    { name: 'period', type: 'string', description: 'Controlled period id.' },
    { name: 'defaultPeriod', type: 'string', default: 'first period', description: 'Initial period when uncontrolled.' },
    { name: 'onPeriodChange', type: '(id: string) => void', description: 'Called when the switch changes period.' },
    { name: 'unit', type: 'string', default: '"tokens"', description: 'Word after the figure and in the chart label.' },
    { name: 'endLabel', type: 'string', default: '"Today"', description: 'Caption under the last day.' },
    { name: 'formatValue', type: '(value: number) => string', default: 'compact, e.g. "667.7M"', description: 'Formats totals and day values.' },
  ],

  reducedMotion:
    'With prefers-reduced-motion the line and area appear without the Recharts draw-in animation, and the headline shows the new total immediately instead of rolling. The segmented switch thumb keeps its short slide from the kit.',

  cleanup:
    'ResponsiveContainer disconnects its resize observer on unmount, and the count-up hook cancels its animation frame. The card adds no timers or listeners of its own.',

  acceptance:
    'The card shows "Tokens", "667.7M tokens" with a purple "+9.4%" chip and a purple line that drops to a dashed baseline for eight idle days. Hovering a day shows its date and value with a dot and a dashed cursor; focusing the chart and pressing ArrowLeft selects the last day (Dec 14, 33.8M tokens). Choosing 7D shows "198.1M tokens" and a rose "−4.3%" chip; 90D shows a denser line. Light and dark both read well, and at 360px the switch wraps under the headline.',

  criticalRegion: 'critical',
};

export default meta;
