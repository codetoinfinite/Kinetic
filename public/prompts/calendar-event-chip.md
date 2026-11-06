# Build: Calendar Event Chip

The event pill of the calendar template as a native button. Each colour is a background, title and time token triple, so light and dark come from the theme. The compact variant is a 22px line whose title truncates while the start time stays; the full variant is a block with a coloured start edge, a two-line title and the time range, made to fill an absolutely positioned slot in a week grid. The file also exports the shared `CalendarEvent` model and `formatEventTime`, which the other calendar pieces import.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Tinted calendar event pill in five colour tokens: one-line compact chip for month cells, block variant for time grids, selected ring.

- Category: display
- Runtime cost: css
- Dependencies: @internationalized/date@^3.12.4

## How it works

1. `calendarEventColorStyles` maps each colour to complete class names (`bg-calendar-event-<c>-background`, `text-calendar-event-<c>-title`, `text-calendar-event-<c>-time`, plus border, ring and dot classes built from the title token), so Tailwind sees every class statically and nothing is concatenated at runtime.
2. Compact is a single flex row: the title span takes `min-w-0 flex-1 truncate` and the time span takes `shrink-0`, so a narrow month cell eats the title first and never the time. All-day chips omit the time.
3. Full is a column with `h-full w-full overflow-hidden`, a 3px logical start border in the title colour, `line-clamp-2` on the title and a truncated "start – end" line. The parent sets the height, so a 15-minute slot shows only the title and a 2-hour slot shows both lines.
4. `formatEventTime` formats a fixed UTC instant built from the wall-clock hour and minute with a cached `DateFormatter` (`hourCycle: "h23"` and 2-digit hours for 24h, `h12` for 12h). Server and client therefore print the same string whatever their time zones.
5. `selected` adds `ring-2` in the event colour and `data-selected`; keyboard focus uses the kit focus ring. Remaining button props are spread last, so the chip works as a `PopoverTrigger` child and accepts `aria-pressed`, handlers and refs.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `compact height = 22px`
  Three chips plus a "+N more" line fit under the day number of a ~120px month cell.
- `start border = 3px`
  Reads as the colour key of the block at a glance without eating the narrow width of a week column.
- `hover = brightness 0.97 light, 1.25 dark`
  The tinted backgrounds are light in light mode and deep in dark mode, so the hover nudge must go in opposite directions to stay visible.
- `time format = HH:mm (h23) by default`
  Matches the template and keeps every time the same width with `tabular-nums`.

## API

```ts
type CalendarEventColor = "blue" | "emerald" | "lime" | "pink" | "purple"
function formatEventTime(time: { hour: number; minute: number }, options?: { locale?: string; hourCycle?: 12 | 24 }): string
function CalendarEventChip(props: ButtonHTMLAttributes<HTMLButtonElement> & { title: string; color?: CalendarEventColor; start?: { hour: number; minute: number }; end?: { hour: number; minute: number }; allDay?: boolean; variant?: "compact" | "full"; selected?: boolean; locale?: string; hourCycle?: 12 | 24; ref?: Ref<HTMLButtonElement> }): JSX.Element
```

- `title: string`
  Event title; truncates (compact) or clamps to two lines (full).
- `color: CalendarEventColor` — default `"blue"`
  Token triple used for background, title and time.
- `start / end: { hour: number; minute: number }`
  Wall-clock times. Compact shows start; full shows the range.
- `allDay: boolean` — default `false`
  Hide the time.
- `variant: "compact" | "full"` — default `"compact"`
  One-line month chip or time-grid block.
- `selected: boolean` — default `false`
  Colour ring and `data-selected`.
- `hourCycle: 12 | 24` — default `24`
  "09:30" or "9:30 AM".
- `locale: string` — default `"en-US"`
  Locale for the time formatter.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function CalendarEventChip({
  title,
  color = "blue",
  start,
  end,
  allDay = false,
  variant = "compact",
  selected = false,
  locale = "en-US",
  hourCycle = 24,
  className,
  type = "button",
  ref,
  ...props
}: CalendarEventChipProps) {
  const c = calendarEventColorStyles[color];
  const startLabel = !allDay && start ? formatEventTime(start, { locale, hourCycle }) : null;
  const endLabel = !allDay && end ? formatEventTime(end, { locale, hourCycle }) : null;

  const base = cx(
    "relative min-w-0 cursor-pointer select-none text-start outline-none",
    "transition-[box-shadow,filter] duration-150 ease-out hover:brightness-[0.97] dark:hover:brightness-125",
    "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
    selected && cx("ring-2", c.ring),
    c.background,
  );

  if (variant === "full") {
    return (
      <button
        ref={ref}
        type={type}
        data-selected={selected || undefined}
        data-variant="full"
        className={cx(
          base,
          "flex h-full w-full flex-col items-start gap-0.5 overflow-hidden rounded-lg border-s-[3px] py-1 ps-1.5 pe-1",
          c.bar,
          className,
        )}
        {...props}
      >
        <span className={cx("line-clamp-2 w-full text-body-2-medium break-words", c.title)}>{title}</span>
        {startLabel ? (
          <span className={cx("w-full truncate text-caption-1-regular tabular-nums opacity-90", c.time)}>
            {startLabel}
            {endLabel ? ` – ${endLabel}` : null}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      data-selected={selected || undefined}
      data-variant="compact"
      className={cx(base, "flex h-[22px] w-full items-center gap-1.5 rounded-md px-1.5", className)}
      {...props}
    >
      <span className={cx("min-w-0 flex-1 truncate text-body-2-medium", c.title)}>{title}</span>
      {startLabel ? (
        <span className={cx("shrink-0 text-caption-1-regular tabular-nums opacity-90", c.time)}>{startLabel}</span>
      ) : null}
    </button>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up: no effects, timers or listeners. Formatters are cached in a module-level map.

**Reduced motion.** Only a 150ms colour/filter transition on hover; there is no movement. It is short and non-spatial, so it stays under reduced motion.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Building class names like `bg-calendar-event-${color}-background` at runtime. Tailwind only generates classes it can find in source; keep the full-name map.
- Formatting times with `toLocaleTimeString` on a local `Date`. The server and the browser can be in different zones and print different hours, which breaks hydration.
- Forgetting `min-w-0` on the compact title. Without it the flex item refuses to shrink and the time is pushed out of the cell instead of the title truncating.

## Notes

- Pass `aria-pressed` when the chip toggles a selection, or wrap it in the event detail popover trigger, which supplies `aria-expanded`.
- The shared `CalendarEvent` type stores `CalendarDateTime` start and end; pass `{ hour, minute }` objects (or the `CalendarDateTime` itself) as `start`/`end`.

## Definition of done

Five compact chips render in blue, emerald, lime, pink and purple, each with its title and a 24h start time such as "15:00". In a 104px cell "Coffee with Lena" truncates with an ellipsis while "09:30" stays whole. Full blocks show the title and "13:00 – 14:00"; a 36px block shows only the title. Clicking a chip adds the colour ring and sets `data-selected`; clicking it again removes both. Both themes keep the title readable on the tinted background.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
