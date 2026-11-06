# Build: Time Field

React Aria's `TimeField` dressed in the kit's Input shell: the same tertiary surface, hover and focus rings, invalid and disabled states, with a clock icon at the start. Hour, minute, optional second and AM/PM are separate segments; typing fills one and jumps to the next, arrows step the focused one, and the focused segment fills with the accent colour.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A time of day typed segment by segment in the kit's input shell, with 12 or 24 hour cycles, seconds, limits and an accent focus.

- Category: form
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1, @remixicon/react@^4.9.0

## How it works

1. `AriaTimeField` is the root (`group flex w-full flex-col items-start gap-1`) and uses its render prop to read `isInvalid`, which it passes to the kit `Label` (with `isRequired` and the optional info `tooltip`) and to `HintText` under the field.
2. The field is `AriaDateInput` whose `className` is a function of React Aria's state: it calls Input's exported `inputFieldClassName(state, size)`, so hover, focus-within, disabled and invalid rings are literally Input's. Each `segment` renders an `AriaDateSegment` with one shared class string.
3. The shell is switched from flex to `block whitespace-nowrap`. React Aria wraps the digits in bidi isolates, which only order inline content, so inline layout keeps an RTL page reading 9:00 rather than 00:9. The shell also takes `text-body-regular` so its own line box stays 36px tall.
4. Segments style themselves from data attributes: `data-[placeholder]` is tertiary text, `data-[type=literal]` (the colon and space) loses its padding and goes tertiary, `data-[focused]` fills `bg-accent-500 text-white`, all with a 100ms colour transition. `tabular-nums` keeps the field from shifting width as digits change, and `caret-transparent` hides the caret inside the filled segment.
5. The clock icon is positioned absolutely at `start-2`, vertically centred, after the input in the DOM, so it can use `peer-data-[invalid]` and `peer-data-[disabled]` to recolour itself from the input's state. The input pads its start by 34px with an icon and 12px without, matching Input's text inset; `icon={null}` removes it.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `field height = 36px medium (p-2) / 32px small (h-8)`
  Inherited from Input's size map, so a time field sits flush in a row with text inputs and medium buttons.
- `start padding = ps-[34px] with icon, ps-3 without`
  An 8px inset, the 20px icon and a 6px gap put the first digit at 34px, the same x as text in an Input with a leading icon.
- `segment focus = bg-accent-500 text-white, rounded-md, px-0.5, 100ms`
  A filled block, not a ring, because segments are a few pixels apart and a ring would collide with the colon.

## API

```ts
function TimeField<T extends TimeValue>(props: Omit<AriaTimeFieldProps<T>, "className" | "children"> & { label?: ReactNode; hint?: ReactNode; tooltip?: boolean | string; size?: "medium" | "small"; icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }> | null; className?: string; fieldClassName?: string }): JSX.Element
```

- `value / defaultValue: TimeValue | null`
  A `Time` from `@internationalized/date`, controlled or initial.
- `onChange: (value: TimeValue | null) => void`
  Fires as segments are typed or stepped.
- `hourCycle: 12 | 24`
  Forces the AM/PM or 24-hour layout instead of the locale default.
- `granularity: "hour" | "minute" | "second"` — default `"minute"`
  The smallest segment shown.
- `minValue / maxValue: TimeValue`
  Out-of-range values mark the field invalid.
- `label / hint: ReactNode`
  Kit Label above, HintText below; both turn red when invalid.
- `size: "medium" | "small"` — default `"medium"`
  36px or 32px shell.
- `icon: IconComponent | null` — default `RiTimeLine`
  Leading glyph; `null` hides it and tightens the padding.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function TimeField<T extends TimeValue>({
  label,
  hint,
  tooltip,
  size = "medium",
  icon: Icon = RiTimeLine,
  className,
  fieldClassName,
  ...props
}: TimeFieldProps<T>) {
  return (
    <AriaTimeField {...props} className={cx("group flex w-full flex-col items-start gap-1", className)}>
      {({ isInvalid }) => (
        <>
          {label ? (
            <Label isRequired={props.isRequired} isInvalid={isInvalid} tooltip={tooltip}>
              {label}
            </Label>
          ) : null}
          <div className="relative w-full">
            <AriaDateInput
              className={(state) =>
                cx(
                  inputFieldClassName(state, size),
                  // Inline, not flex: React Aria wraps the digits in bidi
                  // isolates, which only order inline content, so RTL times
                  // keep reading 9:00 rather than 00:9.
                  // The shell's own line height sets the line box, so it
                  // takes the segments' text style to stay 36px tall.
                  "peer block cursor-text whitespace-nowrap text-body-regular",
                  // Line the first segment up with Input's text: after the
                  // icon at 34px, or at 12px without one.
                  Icon ? "ps-[34px]" : "ps-3",
                  fieldClassName,
                )
              }
            >
              {(segment) => <AriaDateSegment segment={segment} className={SEGMENT} />}
            </AriaDateInput>
            {Icon ? (
              <Icon
                aria-hidden
                className={cx(
                  "pointer-events-none absolute start-2 top-1/2 size-5 -translate-y-1/2 text-foreground-icon-tertiary",
                  "peer-data-[invalid]:text-foreground-icon-error peer-data-[disabled]:text-input-disabled-foreground",
                )}
              />
            ) : null}
          </div>
          {hint ? <HintText isInvalid={isInvalid}>{hint}</HintText> : null}
        </>
      )}
    </AriaTimeField>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. State lives in React Aria's time field hook; no timers or global listeners.

**Reduced motion.** Only 100ms colour transitions on the segments and Input's ring transition; nothing moves, so nothing changes under `prefers-reduced-motion`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not make the segment container `flex`. Flex items ignore the bidi isolates React Aria inserts, and RTL locales then show minutes before hours.
- Do not pass a JS `Date` or a string. Values are `Time` (or `CalendarDateTime` / `ZonedDateTime`) from `@internationalized/date`, e.g. `new Time(9, 30)`.
- Do not rely on the locale for the hour cycle when the copy assumes one. Set `hourCycle={12}` or `{24}` explicitly; otherwise a 24-hour locale drops the AM/PM segment.
- Do not render it without `label` or `aria-label`. The segments are spinbuttons that take their name from the field label.

## Notes

- `granularity="second"` adds a seconds segment; `minValue` / `maxValue` mark out-of-range values invalid, and with `validationBehavior="aria"` the red state and the hint show as soon as the value leaves the range.
- `size="small"` gives the 32px shell; `fieldClassName` adds classes to the shell, `className` to the whole field.

## Definition of done

A field labelled "Opens" shows "9:00 AM" next to a clock icon. Clicking the hour fills it with the accent colour; typing 1 then 0 sets 10 and focus moves to the minutes; Up and Down step the focused segment and wrap. Tab leaves the field and the shell's focus ring clears. With `minValue` 9:00 and `maxValue` 17:30 and `validationBehavior="aria"`, stepping to 6:00 PM turns the shell, icon and hint red. In an RTL locale the time still reads hour-first.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
