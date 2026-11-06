# Build: Date Range Stepper

The small period switcher from BoardUI's dashboard card headers: a 32px white pill with a left chevron, a centred "Jun 29 – Jul 5" (or "July") label and a right chevron. It steps whole weeks or months of `CalendarDate`s from @internationalized/date, controlled or uncontrolled, and greys out an arrow once the next step would leave `minValue` / `maxValue`. The pure helpers that compute and format a period are exported for the card that shows the data.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A bordered pill with prev/next chevrons that steps a week or month period, with min/max bounds and a label that slides in.

- Category: form
- Runtime cost: css
- Dependencies: @internationalized/date@^3.12.4, @remixicon/react@^4.9.0

## How it works

1. The current period is derived on every render from an anchor date (`value`, or internal state seeded from `defaultValue`): `getStepperRange` returns `startOfWeek`/`endOfWeek` (with `weekStartsOn`, Monday by default) or `startOfMonth`/`endOfMonth`. `shiftStepperRange` moves the period start by `{ weeks: ±1 }` or `{ months: ±1 }` and re-derives the range, giving the previous and next periods.
2. Bounds: Previous is allowed while `prev.end >= minValue`, Next while `next.start <= maxValue` (`CalendarDate.compare`). A blocked arrow keeps focus and gets `aria-disabled` (styled with `aria-disabled:` variants) instead of `disabled`, so stepping to the edge never drops keyboard focus to the body; the click handler ignores it.
3. A step updates internal state only when uncontrolled and always calls `onChange(start, range)`. The group handles ArrowLeft/PageUp and ArrowRight/PageDown as steps and Home as a jump back to the first period shown.
4. The label is formatted with `DateFormatter` (en-US by default) on `date.toDate("UTC")` with `timeZone: "UTC"`: week as two "MMM d" parts joined with a plain " – ", month as the long month name. With `yearDisplay="auto"` the year is added only when the period leaves the year of the first period shown. A visually hidden `aria-live="polite"` span announces the full range with year; the visible label is aria-hidden.
5. The slide direction is derived during render by comparing the new period start (ISO string) with the last one shown, so it also follows a controlled value. The label span is keyed by unit and start, so it remounts; Tailwind `starting:translate-x-2 starting:opacity-0` (or `-translate-x-2` going back) with a 200ms opacity/translate transition slides the new label in from the side it came from. The first render has direction 0 and no starting style, so nothing animates on load.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `pill height = 32px (h-8) with 28px (size-7) arrow buttons`
  Matches the header row of the medical and dashboard cards; the arrows fit inside the 1px border.
- `label min width = 6.75rem week, 5.5rem month`
  Keeps the pill from jumping between "Jun 29 – Jul 5" and "Jul 6 – Jul 12", and gives "July" the roomy centred look of the reference.
- `slide = 8px (translate-x-2), 200ms ease-out`
  Enough to show the direction of the step without the label leaving its overflow-hidden slot.
- `weekStartsOn = "mon"`
  The reference periods run Monday 29 Jun to Sunday 5 Jul.

## API

```ts
export function DateRangeStepper({ value, defaultValue, onChange, unit = "week", minValue, maxValue, weekStartsOn = "mon", locale = "en-US", yearDisplay = "auto", formatLabel, label = "Date range", isDisabled = false, className }: DateRangeStepperProps): JSX.Element
```

- `value: CalendarDate`
  Controlled: any day inside the shown period.
- `defaultValue: CalendarDate`
  Uncontrolled: any day inside the first period (one of value/defaultValue is required).
- `onChange: (start: CalendarDate, range: DateRangeStepperRange) => void`
  Called with the first day of the new period and the whole period.
- `unit: "week" | "month"` — default `"week"`
  Length of one step.
- `minValue: CalendarDate`
  Earliest day a period may reach.
- `maxValue: CalendarDate`
  Latest day a period may reach.
- `weekStartsOn: DayOfWeek` — default `"mon"`
  First day of a week period.
- `locale: string` — default `"en-US"`
  Locale of the label and announcement.
- `yearDisplay: "auto" | "always" | "never"` — default `"auto"`
  Auto adds the year once the period leaves the first period's year.
- `formatLabel: (range: DateRangeStepperRange, unit: DateRangeStepperUnit) => string`
  Replaces the visible label.
- `label: string` — default `"Date range"`
  Accessible name of the group.
- `isDisabled: boolean` — default `false`
  Blocks both arrows and dims the pill.
- `className: string`
  Classes on the pill.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function DateRangeStepper(props: DateRangeStepperProps) {
  const {
    value,
    defaultValue,
    onChange,
    unit = "week",
    minValue,
    maxValue,
    weekStartsOn = "mon",
    locale = "en-US",
    yearDisplay = "auto",
    formatLabel,
    label = "Date range",
    isDisabled = false,
    className,
  } = props;

  // The union type guarantees one of the two is set.
  const seed = (value ?? defaultValue) as CalendarDate;
  const [internal, setInternal] = useState<CalendarDate>(seed);
  // The first period shown: Home returns to it and "auto" years compare to it.
  const [home] = useState<CalendarDate>(seed);

  const anchor = value ?? internal;
  const range = getStepperRange(anchor, unit, locale, weekStartsOn);
  const prev = shiftStepperRange(anchor, unit, -1, locale, weekStartsOn);
  const next = shiftStepperRange(anchor, unit, 1, locale, weekStartsOn);
  const canPrev = !isDisabled && (!minValue || prev.end.compare(minValue) >= 0);
  const canNext = !isDisabled && (!maxValue || next.start.compare(maxValue) <= 0);

  // Slide direction is derived from the change of period start, so it also
  // follows a controlled value set from outside. ISO date strings sort in
  // date order, so a string compare is enough.
  const startKey = range.start.toString();
  const [shownKey, setShownKey] = useState(startKey);
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);
  if (shownKey !== startKey) {
    setShownKey(startKey);
    setDirection(startKey > shownKey ? 1 : -1);
  }

  const go = (target: DateRangeStepperRange) => {
    if (!isControlled(value)) setInternal(target.start);
    onChange?.(target.start, target);
  };
  const step = (offset: -1 | 1) => {
    if (offset < 0 ? !canPrev : !canNext) return;
    go(offset < 0 ? prev : next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "PageUp") step(-1);
    else if (event.key === "ArrowRight" || event.key === "PageDown") step(1);
    else if (event.key === "Home" && !isDisabled) {
      const target = getStepperRange(home, unit, locale, weekStartsOn);
      if (target.start.compare(range.start) !== 0) go(target);
    } else return;
    event.preventDefault();
  };

  const showYear =
    yearDisplay === "always" ||
    (yearDisplay === "auto" && (range.start.year !== home.year || range.end.year !== home.year));
  const text = formatLabel ? formatLabel(range, unit) : formatStepperRange(range, unit, locale, showYear);
  const noun = unit === "month" ? "month" : "week";

  return (
    <div
      role="group"
      aria-label={label}
      aria-disabled={isDisabled || undefined}
      onKeyDown={onKeyDown}
      data-unit={unit}
      className={cx(
        "inline-flex h-8 shrink-0 items-center rounded-lg border border-border-button-default bg-background-primary-default px-0.5 shadow-2xs",
        isDisabled && "opacity-60",
        className,
      )}
    >
      <button
        type="button"
        className={arrowClass}
        aria-label={`Previous ${noun}`}
        aria-disabled={!canPrev || undefined}
        onClick={() => step(-1)}
      >
        <RiArrowLeftSLine className="size-4" aria-hidden />
      </button>
      <span
        aria-hidden
        className={cx(
          "flex justify-center overflow-hidden px-1",
          unit === "month" ? "min-w-[5.5rem]" : "min-w-[6.75rem]",
        )}
      >
        <span
          key={`${unit}:${startKey}`}
          data-stepper-label=""
          className={cx(
            "inline-block text-body-medium whitespace-nowrap text-text-primary tabular-nums",
            "transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none",
            direction === 1 && "starting:translate-x-2 starting:opacity-0",
            direction === -1 && "starting:-translate-x-2 starting:opacity-0",
          )}
        >
          {text}
        </span>
      </span>
      <span className="sr-only" aria-live="polite">
        {announceRange(range, unit, locale)}
      </span>
      <button
        type="button"
        className={arrowClass}
        aria-label={`Next ${noun}`}
        aria-disabled={!canNext || undefined}
        onClick={() => step(1)}
      >
        <RiArrowRightSLine className="size-4" aria-hidden />
      </button>
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers, listeners or observers: the slide is a CSS @starting-style transition on a remounted span.

**Reduced motion.** The label slide uses motion-reduce:transition-none, so the new label appears in place without sliding or fading.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not use `Intl.DateTimeFormat.formatRange` for the label: its spacing around the dash differs between ICU builds (Node vs browser) and causes a hydration mismatch. Format start and end separately and join them.
- Do not format a `CalendarDate` in the viewer's timezone: convert with `toDate("UTC")` and format with `timeZone: "UTC"`, or the label can show the previous day west of UTC.
- Do not set `disabled` on an arrow that reached a bound while it has focus: the focus falls to the body. Use `aria-disabled` and ignore the click.
- Do not default the value to today during render: server and browser can disagree on the date. The props type requires `value` or `defaultValue`.

## Notes

- Exports `getStepperRange`, `shiftStepperRange` and `formatStepperRange` so a card can compute the same period for its data.
- Chevrons are Remix `RiArrowLeftSLine` / `RiArrowRightSLine` at 16px.
- The demo pairs a week stepper bounded to Jun 1 – Jul 12, 2026 over a seeded steps bar chart with a month stepper over an activity calendar.

## Definition of done

Starting at Jun 29 2026 the week pill reads "Jun 29 – Jul 5"; Next shows "Jul 6 – Jul 12" and calls onChange with 2026-07-06; with maxValue Jul 12 the Next arrow then has aria-disabled="true" and clicking it changes nothing. A month pill at July reads "July", and stepping back past January reads "December 2025".

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
