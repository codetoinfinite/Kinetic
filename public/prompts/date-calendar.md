# Build: Date Calendar

A month laid out on the page instead of in a popover: `DateCalendar` picks one day, `DateRangeCalendar` picks a span across one or two months. Both are thin wrappers that hand React Aria's `Calendar` and `RangeCalendar` the Date Picker's shared `MonthPanel`, so the card, the 32px day cells and the accent range band are identical to the popover pickers. Selection fades in on opacity rather than popping.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An inline month calendar for one date or a range, with a continuous range band, a today dot and struck-through unavailable days.

- Category: form
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1, @internationalized/date@^3.12.4

## How it works

1. `DateCalendar` renders `<Calendar>` from react-aria-components with one `MonthPanel offset={0} showPrev showNext}`. `DateRangeCalendar` renders `<RangeCalendar visibleDuration={{ months: visibleMonths }}>` and either one panel with both chevrons or two panels in a `flex flex-wrap justify-center gap-2` row, the first carrying only the previous chevron and the second (`offset={1}`) only the next, so the pair pages as one unit and stacks when the row is narrow.
2. `MonthPanel` reads `RangeCalendarStateContext` and `CalendarStateContext`; exactly one is non-null, which tells it whether it sits in a range or a single calendar. The title is `visibleRange.start.add({ months: offset })` formatted with `Intl.DateTimeFormat(locale, { month: "long", year: "numeric" })`. The prev/next buttons are RAC `Button`s with `slot="previous"` / `slot="next"`, so the calendar wires their paging itself.
3. The grid is a `CalendarGrid` table with `border-separate border-spacing-3` (12px), pulled out by `-m-3` so the outer spacing does not pad the card. At `max-[380px]` the column spacing drops to 8px (`border-spacing-x-2`, `-mx-2`), so the card is 302px and fits a 360px phone. Weekday headers are cut to two letters when the locale's short weekday is Latin script, and fall back to the `narrow` style otherwise.
4. Each `DayCell` always renders two absolutely positioned layers: a range band (`bg-date-range-background`) and an edge pill (`bg-date-range-edge-background`). Selection only flips their `opacity` between 0 and 1 with `transition-[opacity,border-radius] duration-100`, so dragging a range across ~40 cells is a CSS transition, not mounts and unmounts.
5. The band bridges the 12px gaps: a selected middle cell extends 6px (`-start-1.5` / `-end-1.5`) toward each selected neighbour, the start and end cells begin at `start-1/2` / `end-1/2` so the band runs under half the pill, and the first and last column of a week never extend and get `rounded-s-lg` / `rounded-e-lg` instead.
6. A plain `Calendar` never sets `isSelectionStart` / `isSelectionEnd`, so the cell computes `isSingleDay` and `isEdge` from `isSelected` when not in a range; otherwise the one picked day would render as a mid-range band. Days outside the month render as an empty `size-8` box, unavailable days (`isDateUnavailable`) get `line-through text-text-tertiary`, and `showToday` adds a 4px dot at `bottom-1`, accent on a plain day and `bg-text-primary` on a selected one.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `panel = w-[326px], p-[15px], rounded-2xl, shadow-xs; w-[302px] at max-[380px]`
  Seven 32px cells with six 12px gaps is 296px; 15px of padding on each side gives the 326px card from Figma. The bare variant is exactly that 296px. A 360px phone leaves about 312px, so up to 380px the column gap is 8px: 272px of grid, a 302px card.
- `day cell / gap = 32px (size-8) / border-spacing 12px (8px × 12px at max-[380px])`
  The Figma grid. The gap is real table spacing, which is why the range band needs the 6px bridge to read as one continuous strip.
- `band bridge = 6px (-start-1.5 / -end-1.5); 4px at max-[380px]`
  Half of the 12px gap from each side meets in the middle. More would overlap the neighbouring band and double the colour where the two layers cross.
- `selection fade = 100ms ease-out on opacity and border-radius`
  Fast enough that a range follows the pointer, slow enough that the band visibly grows rather than flickering. Radius rides the same transition so a deselected edge eases square in sync with the fade.
- `today dot = size-1 (4px) at bottom-1`
  Sits under the numeral inside the 32px cell without touching it, and stays visible on top of the selected pill by switching to `bg-text-primary`.

## API

```ts
function DateCalendar<T extends DateValue>(props: Omit<CalendarProps<T>, "className" | "children" | "visibleDuration"> & { showToday?: boolean; className?: string }): JSX.Element
function DateRangeCalendar<T extends DateValue>(props: Omit<RangeCalendarProps<T>, "className" | "children" | "visibleDuration"> & { visibleMonths?: 1 | 2; showToday?: boolean; className?: string }): JSX.Element
```

- `value / defaultValue: T | null (DateCalendar) · RangeValue<T> | null (DateRangeCalendar)`
  Controlled or initial selection as `@internationalized/date` values.
- `onChange: (value) => void`
  Fires with the picked date, or with `{ start, end }` once a range is complete.
- `visibleMonths: 1 | 2` — default `2`
  DateRangeCalendar only. Two months side by side that wrap to a stack when narrow, or one.
- `showToday: boolean` — default `true`
  Draws a 4px dot under today's date.
- `isDateUnavailable: (date: DateValue) => boolean`
  Days that can be focused but not picked; rendered struck through.
- `minValue / maxValue: DateValue`
  Bounds; days outside are disabled and faded.
- `className: string`
  Merged onto the `inline-flex` root.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function DateCalendar<T extends DateValue>({ showToday = true, className, ...props }: DateCalendarProps<T>) {
  return (
    <AriaCalendar {...props} className={cx("inline-flex outline-none", className)}>
      <MonthPanel offset={0} showPrev showNext showToday={showToday} />
    </AriaCalendar>
  );
}

export interface DateRangeCalendarProps<T extends DateValue>
  extends Omit<AriaRangeCalendarProps<T>, "className" | "children" | "visibleDuration"> {
  /** One month, or two side by side (default). They stack when the space is narrow. */
  visibleMonths?: 1 | 2;
  /** Mark today with a dot. Default true. */
  showToday?: boolean;
  className?: string;
}

export function DateRangeCalendar<T extends DateValue>({
  visibleMonths = 2,
  showToday = true,
  className,
  ...props
}: DateRangeCalendarProps<T>) {
  return (
    <AriaRangeCalendar
      {...props}
      visibleDuration={{ months: visibleMonths }}
      className={cx("inline-flex outline-none", className)}
    >
      <div className="flex flex-wrap justify-center gap-2">
        {visibleMonths === 2 ? (
          <>
            <MonthPanel offset={0} showPrev showToday={showToday} />
            <MonthPanel offset={1} showNext showToday={showToday} />
          </>
        ) : (
          <MonthPanel offset={0} showPrev showNext showToday={showToday} />
        )}
      </div>
    </AriaRangeCalendar>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to release. The calendar holds React Aria state only; there are no timers, observers or global listeners.

**Reduced motion.** The only motion is the 100ms opacity and radius fade on selection plus 150ms colour on the chevrons. Neither moves anything, so nothing changes under `prefers-reduced-motion`; months swap instantly with no slide.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not mount the range band and edge pill only when selected. They exist on every cell and change `opacity`; conditional rendering removes the fade and makes range drags janky.
- Do not derive the single-day pill from `isSelectionStart && isSelectionEnd` in a plain `Calendar`. Those flags are range-only and stay false, so the picked day falls through to the mid-range band. Branch on whether a `RangeCalendarStateContext` exists.
- Do not replace `border-spacing` with `gap` utilities. `CalendarGrid` is a `<table>`; only `border-separate` plus `border-spacing` spaces its cells.
- Do not render the calendar without a `value` or `defaultValue` in server-rendered pages. React Aria then focuses today, and today can differ between server and client.
- Do not omit `aria-label` (or a visible label wired with `aria-labelledby`). The grid is a labelled region, and React Aria warns without one.

## Notes

- Values are `@internationalized/date` objects (`parseDate("2026-03-18")` gives a `CalendarDate`). `minValue` and `maxValue` fade the days outside them; `isDateUnavailable` keeps a day focusable but unpickable and strikes it through.
- The same `MonthPanel` and `DayCell` power `DatePicker` and `DateRangePicker`, so a fix to the cell lands in all four components.

## Definition of done

A month card renders with two-letter weekday headers and 32px days spaced 12px apart. Clicking a day in `DateCalendar` fades in a rounded accent pill and fires `onChange`. In `DateRangeCalendar`, clicking a start and then an end day draws one continuous band between two pills that breaks with rounded ends at week boundaries. Arrow keys move focus by day and Page Up/Down by month; the chevrons page the month. Days passed to `isDateUnavailable` are struck through and cannot be picked.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
