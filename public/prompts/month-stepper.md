# Build: Month Stepper

The calendar header's month switcher: a 36px bordered pill with a chevron button at each end and the formatted month centred between them. The label is a focusable spinbutton, so the whole control is usable from the keyboard without tabbing between the buttons. Each step slides the new label in from the side it came from.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A bordered month label between prev/next chevrons, with spinbutton keys: arrows step a month, Page Up/Down a year, Home/End the bounds.

- Category: navigation
- Runtime cost: dom
- Dependencies: @internationalized/date@^3.12.4, @remixicon/react@^4.9.0

## How it works

1. State is a `CalendarDate` from `@internationalized/date`, normalised with `startOfMonth`. `value` makes it controlled; otherwise `defaultValue` (or the current month) seeds internal state. Every change is emitted as the first day of the month.
2. Bounds and comparisons use `monthIndex(date) = year * 12 + month - 1`, a monotonic integer. `step(n)` clamps `current + n` to `[min, max]`, does nothing when the clamped target equals the current month, and otherwise calls `month.add({ months: target - current })`. The chevrons are disabled at the bounds.
3. The label is a `role="spinbutton"` span with `aria-valuenow` set to the month index and `aria-valuetext` set to the formatted label. Its key handler maps ArrowUp and the reading-direction arrow to +1, ArrowDown and the opposite arrow to -1, PageUp/PageDown to ±12, and Home/End to the min/max when they are set. ArrowLeft/ArrowRight swap under RTL.
4. The label text comes from a `DateFormatter(locale, { month: "long", year: "numeric", ...formatOptions, timeZone: "UTC" })` applied to `month.toDate("UTC")`, so server and client format the same instant and hydration matches.
5. An effect compares the new month index with the previous one and runs `element.animate()` on the inner label: opacity 0 → 1 and translateX(±8px) → 0 over 180ms, with the sign from the step direction (mirrored in RTL). The effect returns `animation.cancel()`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `height = 36px medium / 32px small`
  Matches the kit's icon buttons and inputs, so the stepper lines up with the notification and inbox buttons beside it in the calendar header.
- `button box = 34px / 30px inside a 1px border`
  The chevron hit area fills the pill's inner height exactly, so the hover tint touches the border with a 9px (or 7px) radius that follows the outer 10px (or 8px) corner.
- `default width = w-80 (320px)`
  The calendar header gives the stepper a fixed width so the chevrons do not jump as the month name changes length (May vs September).
- `label slide = 8px, 180ms, cubic-bezier(0.2, 0, 0, 1)`
  Enough travel to show which way the month moved without the text leaving the pill. Short enough that holding an arrow key stays readable.

## API

```ts
function MonthStepper(props: { value?: CalendarDate; defaultValue?: CalendarDate; onChange?: (month: CalendarDate) => void; minValue?: CalendarDate; maxValue?: CalendarDate; locale?: string; formatOptions?: Intl.DateTimeFormatOptions; size?: "medium" | "small"; "aria-label"?: string; previousLabel?: string; nextLabel?: string; isDisabled?: boolean; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element
function monthIndex(date: CalendarDate): number
```

- `value: CalendarDate`
  Controlled month. Any day in the month works.
- `defaultValue: CalendarDate` — default `current month`
  Uncontrolled starting month.
- `onChange: (month: CalendarDate) => void`
  Called with the first day of the newly shown month.
- `minValue / maxValue: CalendarDate`
  Inclusive month bounds. The chevrons disable and Home/End jump to them.
- `locale: string` — default `"en-US"`
  Locale for the month label.
- `formatOptions: Intl.DateTimeFormatOptions` — default `{ month: "long", year: "numeric" }`
  Overrides for the label format, e.g. `{ month: "short" }`.
- `size: "medium" | "small"` — default `"medium"`
  36px or 32px tall.
- `aria-label: string` — default `"Month"`
  Name of the group and the spinbutton.
- `previousLabel / nextLabel: string` — default `"Previous month" / "Next month"`
  Accessible names of the chevron buttons.
- `isDisabled: boolean` — default `false`
  Disables both buttons and removes the label from the tab order.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function MonthStepper({
  value,
  defaultValue,
  onChange,
  minValue,
  maxValue,
  locale = "en-US",
  formatOptions,
  size = "medium",
  "aria-label": ariaLabel = "Month",
  previousLabel = "Previous month",
  nextLabel = "Next month",
  isDisabled = false,
  className,
  ref,
}: MonthStepperProps) {
  const direction = useDirection();
  const reducedMotion = useReducedMotion();
  const [uncontrolled, setUncontrolled] = useState<CalendarDate>(() =>
    startOfMonth(defaultValue ?? today(getLocalTimeZone())),
  );
  const month = startOfMonth(value ?? uncontrolled);
  const current = monthIndex(month);
  const min = minValue ? monthIndex(minValue) : -Infinity;
  const max = maxValue ? monthIndex(maxValue) : Infinity;

  const formatter = useMemo(
    () => new DateFormatter(locale, { month: "long", year: "numeric", ...formatOptions, timeZone: "UTC" }),
    [locale, formatOptions],
  );
  const label = formatter.format(month.toDate("UTC"));

  const step = (months: number) => {
    const target = Math.min(max, Math.max(min, current + months));
    if (isDisabled || target === current) return;
    const next = month.add({ months: target - current });
    setUncontrolled(next);
    onChange?.(next);
  };

  // Slide the label in from the side the user stepped towards. The Web
  // Animations API needs no keyframes in the stylesheet and cancels cleanly.
  const labelRef = useRef<HTMLSpanElement>(null);
  const previous = useRef(current);
  useEffect(() => {
    const delta = current - previous.current;
    previous.current = current;
    const el = labelRef.current;
    if (!el || delta === 0 || reducedMotion || typeof el.animate !== "function") return;
    const from = (delta > 0 ? 8 : -8) * (direction === "rtl" ? -1 : 1);
    const animation = el.animate(
      [
        { opacity: 0, transform: `translateX(${from}px)` },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
    return () => animation.cancel();
  }, [current, reducedMotion, direction]);

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    const forward = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    const back = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
    let delta: number | null = null;
    if (event.key === "ArrowUp" || event.key === forward) delta = 1;
    else if (event.key === "ArrowDown" || event.key === back) delta = -1;
    else if (event.key === "PageUp") delta = 12;
    else if (event.key === "PageDown") delta = -12;
    else if (event.key === "Home" && Number.isFinite(min)) delta = min - current;
    else if (event.key === "End" && Number.isFinite(max)) delta = max - current;
    if (delta === null) return;
    event.preventDefault();
    step(delta);
  };

  const s = sizes[size];
  const buttonClass = cx(
    "inline-flex shrink-0 cursor-pointer items-center justify-center text-foreground-icon-primary",
    "transition-colors duration-150 ease-out hover:bg-background-primary-hover active:bg-background-primary-active",
    "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
    "disabled:cursor-not-allowed disabled:text-foreground-disabled disabled:hover:bg-transparent",
    s.button,
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      data-disabled={isDisabled || undefined}
      className={cx(
        "inline-flex w-80 max-w-full items-center justify-between gap-1 border border-border-button-default bg-background-primary-default shadow-xs",
        "data-[disabled]:opacity-60",
        s.root,
        className,
      )}
    >
      <button
        type="button"
        aria-label={previousLabel}
        disabled={isDisabled || current <= min}
        onClick={() => step(-1)}
        className={buttonClass}
      >
        <RiArrowLeftSLine aria-hidden className={cx(s.icon, "rtl:rotate-180")} />
      </button>
      <span
        role="spinbutton"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-valuenow={current}
        aria-valuetext={label}
        aria-valuemin={Number.isFinite(min) ? min : undefined}
        aria-valuemax={Number.isFinite(max) ? max : undefined}
        aria-disabled={isDisabled || undefined}
        onKeyDown={onKeyDown}
        className={cx(
          "min-w-0 flex-1 cursor-default select-none overflow-hidden rounded-md text-center text-text-primary outline-none",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          s.label,
        )}
      >
        <span ref={labelRef} className="block truncate tabular-nums" aria-hidden>
          {label}
        </span>
      </span>
      <button
        type="button"
        aria-label={nextLabel}
        disabled={isDisabled || current >= max}
        onClick={() => step(1)}
        className={buttonClass}
      >
        <RiArrowRightSLine aria-hidden className={cx(s.icon, "rtl:rotate-180")} />
      </button>
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The slide effect returns `animation.cancel()`, so a fast second step or an unmount stops the running animation. There are no listeners, timers or observers.

**Reduced motion.** The label slide is skipped entirely: `useReducedMotion()` gates the `element.animate()` call, so the new month replaces the old one instantly. Button hover tints still change colour.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Comparing months with `CalendarDate.compare`. Day-of-month differences make 2026-08-15 "after" 2026-08-01 even though they are the same month. Compare `monthIndex` values instead.
- Formatting with the runtime's local time zone. `toDate(getLocalTimeZone())` can land on the previous day in UTC on the server, and the label hydrates as July. Format a UTC date with `timeZone: "UTC"`.
- Stepping with `.set({ month: month + 1 })`. It does not roll the year over; `.add({ months })` does.
- Animating on every render. The effect must compare with the previous month index, or a parent re-render replays the slide.

## Notes

- Without `value` or `defaultValue` the stepper starts on the current month in the viewer's time zone. Pass a fixed date when the markup is server rendered.
- The chevron buttons stay in the tab order for pointer-first users of assistive tech, and the spinbutton covers keyboard stepping.

## Definition of done

The stepper shows "August 2026". Clicking the right chevron shows "September 2026" and the label slides in from the right; the left chevron goes back. Focusing the label and pressing ArrowRight steps forward, PageUp jumps to the same month next year. A stepper bounded to January–December 2026 disables its next chevron on December and ignores further ArrowUp presses; Home jumps to January.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
