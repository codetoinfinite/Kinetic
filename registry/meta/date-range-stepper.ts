/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Date Range Stepper" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'date-range-stepper',
  title: 'Date Range Stepper',
  category: 'form',
  kit: 'boardui',
  tags: ['date', 'range', 'stepper', 'week', 'month', 'dashboard', 'boardui'],
  blurb:
    'A bordered pill with prev/next chevrons that steps a week or month period, with min/max bounds and a label that slides in.',
  cost: 'css',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/date-range-stepper.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@internationalized/date@^3.12.4', '@remixicon/react@^4.9.0'],

  summary:
    'The small period switcher from BoardUI\'s dashboard card headers: a 32px white pill with a left chevron, a centred "Jun 29 – Jul 5" (or "July") label and a right chevron. It steps whole weeks or months of `CalendarDate`s from @internationalized/date, controlled or uncontrolled, and greys out an arrow once the next step would leave `minValue` / `maxValue`. The pure helpers that compute and format a period are exported for the card that shows the data.',

  mechanism: [
    'The current period is derived on every render from an anchor date (`value`, or internal state seeded from `defaultValue`): `getStepperRange` returns `startOfWeek`/`endOfWeek` (with `weekStartsOn`, Monday by default) or `startOfMonth`/`endOfMonth`. `shiftStepperRange` moves the period start by `{ weeks: ±1 }` or `{ months: ±1 }` and re-derives the range, giving the previous and next periods.',
    'Bounds: Previous is allowed while `prev.end >= minValue`, Next while `next.start <= maxValue` (`CalendarDate.compare`). A blocked arrow keeps focus and gets `aria-disabled` (styled with `aria-disabled:` variants) instead of `disabled`, so stepping to the edge never drops keyboard focus to the body; the click handler ignores it.',
    'A step updates internal state only when uncontrolled and always calls `onChange(start, range)`. The group handles ArrowLeft/PageUp and ArrowRight/PageDown as steps and Home as a jump back to the first period shown.',
    'The label is formatted with `DateFormatter` (en-US by default) on `date.toDate("UTC")` with `timeZone: "UTC"`: week as two "MMM d" parts joined with a plain " – ", month as the long month name. With `yearDisplay="auto"` the year is added only when the period leaves the year of the first period shown. A visually hidden `aria-live="polite"` span announces the full range with year; the visible label is aria-hidden.',
    'The slide direction is derived during render by comparing the new period start (ISO string) with the last one shown, so it also follows a controlled value. The label span is keyed by unit and start, so it remounts; Tailwind `starting:translate-x-2 starting:opacity-0` (or `-translate-x-2` going back) with a 200ms opacity/translate transition slides the new label in from the side it came from. The first render has direction 0 and no starting style, so nothing animates on load.',
  ],

  constants: [
    { name: 'pill height', value: '32px (h-8) with 28px (size-7) arrow buttons', why: 'Matches the header row of the medical and dashboard cards; the arrows fit inside the 1px border.' },
    { name: 'label min width', value: '6.75rem week, 5.5rem month', why: 'Keeps the pill from jumping between "Jun 29 – Jul 5" and "Jul 6 – Jul 12", and gives "July" the roomy centred look of the reference.' },
    { name: 'slide', value: '8px (translate-x-2), 200ms ease-out', why: 'Enough to show the direction of the step without the label leaving its overflow-hidden slot.' },
    { name: 'weekStartsOn', value: '"mon"', why: 'The reference periods run Monday 29 Jun to Sunday 5 Jul.' },
  ],

  pitfalls: [
    'Do not use `Intl.DateTimeFormat.formatRange` for the label: its spacing around the dash differs between ICU builds (Node vs browser) and causes a hydration mismatch. Format start and end separately and join them.',
    'Do not format a `CalendarDate` in the viewer\'s timezone: convert with `toDate("UTC")` and format with `timeZone: "UTC"`, or the label can show the previous day west of UTC.',
    'Do not set `disabled` on an arrow that reached a bound while it has focus: the focus falls to the body. Use `aria-disabled` and ignore the click.',
    'Do not default the value to today during render: server and browser can disagree on the date. The props type requires `value` or `defaultValue`.',
  ],

  notes: [
    'Exports `getStepperRange`, `shiftStepperRange` and `formatStepperRange` so a card can compute the same period for its data.',
    'Chevrons are Remix `RiArrowLeftSLine` / `RiArrowRightSLine` at 16px.',
    'The demo pairs a week stepper bounded to Jun 1 – Jul 12, 2026 over a seeded steps bar chart with a month stepper over an activity calendar.',
  ],

  apiSignature:
    'export function DateRangeStepper({ value, defaultValue, onChange, unit = "week", minValue, maxValue, weekStartsOn = "mon", locale = "en-US", yearDisplay = "auto", formatLabel, label = "Date range", isDisabled = false, className }: DateRangeStepperProps): JSX.Element',

  props: [
    { name: 'value', type: 'CalendarDate', description: 'Controlled: any day inside the shown period.' },
    { name: 'defaultValue', type: 'CalendarDate', description: 'Uncontrolled: any day inside the first period (one of value/defaultValue is required).' },
    { name: 'onChange', type: '(start: CalendarDate, range: DateRangeStepperRange) => void', description: 'Called with the first day of the new period and the whole period.' },
    { name: 'unit', type: '"week" | "month"', default: '"week"', description: 'Length of one step.' },
    { name: 'minValue', type: 'CalendarDate', description: 'Earliest day a period may reach.' },
    { name: 'maxValue', type: 'CalendarDate', description: 'Latest day a period may reach.' },
    { name: 'weekStartsOn', type: 'DayOfWeek', default: '"mon"', description: 'First day of a week period.' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Locale of the label and announcement.' },
    { name: 'yearDisplay', type: '"auto" | "always" | "never"', default: '"auto"', description: 'Auto adds the year once the period leaves the first period\'s year.' },
    { name: 'formatLabel', type: '(range: DateRangeStepperRange, unit: DateRangeStepperUnit) => string', description: 'Replaces the visible label.' },
    { name: 'label', type: 'string', default: '"Date range"', description: 'Accessible name of the group.' },
    { name: 'isDisabled', type: 'boolean', default: 'false', description: 'Blocks both arrows and dims the pill.' },
    { name: 'className', type: 'string', description: 'Classes on the pill.' },
  ],

  reducedMotion:
    'The label slide uses motion-reduce:transition-none, so the new label appears in place without sliding or fading.',
  cleanup: 'No timers, listeners or observers: the slide is a CSS @starting-style transition on a remounted span.',
  acceptance:
    'Starting at Jun 29 2026 the week pill reads "Jun 29 – Jul 5"; Next shows "Jul 6 – Jul 12" and calls onChange with 2026-07-06; with maxValue Jul 12 the Next arrow then has aria-disabled="true" and clicking it changes nothing. A month pill at July reads "July", and stepping back past January reads "December 2025".',
  criticalRegion: 'critical',
};

export default meta;
