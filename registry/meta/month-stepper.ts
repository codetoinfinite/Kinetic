import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'month-stepper',
  title: 'Month Stepper',
  category: 'navigation',
  kit: 'boardui',
  tags: ['calendar', 'month', 'stepper', 'spinbutton', 'boardui'],
  blurb:
    'A bordered month label between prev/next chevrons, with spinbutton keys: arrows step a month, Page Up/Down a year, Home/End the bounds.',
  cost: 'dom',
  motif: 'split',

  files: [{ path: 'registry/ui/month-stepper.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@internationalized/date@^3.12.4', '@remixicon/react@^4.9.0'],

  summary:
    'The calendar header\'s month switcher: a 36px bordered pill with a chevron button at each end and the formatted month centred between them. The label is a focusable spinbutton, so the whole control is usable from the keyboard without tabbing between the buttons. Each step slides the new label in from the side it came from.',

  mechanism: [
    'State is a `CalendarDate` from `@internationalized/date`, normalised with `startOfMonth`. `value` makes it controlled; otherwise `defaultValue` (or the current month) seeds internal state. Every change is emitted as the first day of the month.',
    'Bounds and comparisons use `monthIndex(date) = year * 12 + month - 1`, a monotonic integer. `step(n)` clamps `current + n` to `[min, max]`, does nothing when the clamped target equals the current month, and otherwise calls `month.add({ months: target - current })`. The chevrons are disabled at the bounds.',
    'The label is a `role="spinbutton"` span with `aria-valuenow` set to the month index and `aria-valuetext` set to the formatted label. Its key handler maps ArrowUp and the reading-direction arrow to +1, ArrowDown and the opposite arrow to -1, PageUp/PageDown to ±12, and Home/End to the min/max when they are set. ArrowLeft/ArrowRight swap under RTL.',
    'The label text comes from a `DateFormatter(locale, { month: "long", year: "numeric", ...formatOptions, timeZone: "UTC" })` applied to `month.toDate("UTC")`, so server and client format the same instant and hydration matches.',
    'An effect compares the new month index with the previous one and runs `element.animate()` on the inner label: opacity 0 → 1 and translateX(±8px) → 0 over 180ms, with the sign from the step direction (mirrored in RTL). The effect returns `animation.cancel()`.',
  ],

  constants: [
    { name: 'height', value: '36px medium / 32px small', why: 'Matches the kit\'s icon buttons and inputs, so the stepper lines up with the notification and inbox buttons beside it in the calendar header.' },
    { name: 'button box', value: '34px / 30px inside a 1px border', why: 'The chevron hit area fills the pill\'s inner height exactly, so the hover tint touches the border with a 9px (or 7px) radius that follows the outer 10px (or 8px) corner.' },
    { name: 'default width', value: 'w-80 (320px)', why: 'The calendar header gives the stepper a fixed width so the chevrons do not jump as the month name changes length (May vs September).' },
    { name: 'label slide', value: '8px, 180ms, cubic-bezier(0.2, 0, 0, 1)', why: 'Enough travel to show which way the month moved without the text leaving the pill. Short enough that holding an arrow key stays readable.' },
  ],

  pitfalls: [
    'Comparing months with `CalendarDate.compare`. Day-of-month differences make 2026-08-15 "after" 2026-08-01 even though they are the same month. Compare `monthIndex` values instead.',
    'Formatting with the runtime\'s local time zone. `toDate(getLocalTimeZone())` can land on the previous day in UTC on the server, and the label hydrates as July. Format a UTC date with `timeZone: "UTC"`.',
    'Stepping with `.set({ month: month + 1 })`. It does not roll the year over; `.add({ months })` does.',
    'Animating on every render. The effect must compare with the previous month index, or a parent re-render replays the slide.',
  ],

  notes: [
    'Without `value` or `defaultValue` the stepper starts on the current month in the viewer\'s time zone. Pass a fixed date when the markup is server rendered.',
    'The chevron buttons stay in the tab order for pointer-first users of assistive tech, and the spinbutton covers keyboard stepping.',
  ],

  apiSignature:
    'function MonthStepper(props: { value?: CalendarDate; defaultValue?: CalendarDate; onChange?: (month: CalendarDate) => void; minValue?: CalendarDate; maxValue?: CalendarDate; locale?: string; formatOptions?: Intl.DateTimeFormatOptions; size?: "medium" | "small"; "aria-label"?: string; previousLabel?: string; nextLabel?: string; isDisabled?: boolean; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction monthIndex(date: CalendarDate): number',

  props: [
    { name: 'value', type: 'CalendarDate', description: 'Controlled month. Any day in the month works.' },
    { name: 'defaultValue', type: 'CalendarDate', default: 'current month', description: 'Uncontrolled starting month.' },
    { name: 'onChange', type: '(month: CalendarDate) => void', description: 'Called with the first day of the newly shown month.' },
    { name: 'minValue / maxValue', type: 'CalendarDate', description: 'Inclusive month bounds. The chevrons disable and Home/End jump to them.' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Locale for the month label.' },
    { name: 'formatOptions', type: 'Intl.DateTimeFormatOptions', default: '{ month: "long", year: "numeric" }', description: 'Overrides for the label format, e.g. `{ month: "short" }`.' },
    { name: 'size', type: '"medium" | "small"', default: '"medium"', description: '36px or 32px tall.' },
    { name: 'aria-label', type: 'string', default: '"Month"', description: 'Name of the group and the spinbutton.' },
    { name: 'previousLabel / nextLabel', type: 'string', default: '"Previous month" / "Next month"', description: 'Accessible names of the chevron buttons.' },
    { name: 'isDisabled', type: 'boolean', default: 'false', description: 'Disables both buttons and removes the label from the tab order.' },
  ],

  reducedMotion:
    'The label slide is skipped entirely: `useReducedMotion()` gates the `element.animate()` call, so the new month replaces the old one instantly. Button hover tints still change colour.',

  cleanup:
    'The slide effect returns `animation.cancel()`, so a fast second step or an unmount stops the running animation. There are no listeners, timers or observers.',

  acceptance:
    'The stepper shows "August 2026". Clicking the right chevron shows "September 2026" and the label slides in from the right; the left chevron goes back. Focusing the label and pressing ArrowRight steps forward, PageUp jumps to the same month next year. A stepper bounded to January–December 2026 disables its next chevron on December and ignores further ArrowUp presses; Home jumps to January.',

  criticalRegion: 'critical',
};

export default meta;
