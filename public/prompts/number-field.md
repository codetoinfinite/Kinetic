# Build: Number Field

A number typed or stepped, such as seats, a price or a percentage. It puts Input's field shell (`InputBase`, with the same hover, focus, invalid and disabled states) inside React Aria's `NumberField` and adds minus and plus buttons at the trailing end. React Aria formats and parses the value for the locale, clamps it to `minValue` and `maxValue` on blur, disables a stepper at its limit, and handles arrow keys, Home and End, the scroll wheel and press-and-hold repeat.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Input's field shell plus minus and plus steppers on React Aria NumberField: locale currency, percent and unit formats, clamped to limits.

- Category: form
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. `NumberField` renders `AriaNumberField` as `group flex w-full flex-col items-start gap-1`. All React Aria number props (`value`, `defaultValue`, `onChange`, `minValue`, `maxValue`, `step`, `formatOptions`, `isWheelDisabled`, `isDisabled`, `isInvalid`) pass straight through. Without a `label` or `aria-label`, the `placeholder` becomes the `aria-label`.
2. Its render function shows `Label` (with the asterisk when `isRequired`) when `label` is set, then `InputBase` from the Input item, then `HintText` (red when invalid) when `hint` is set. Because `InputBase` renders React Aria's `Group` and `Input`, they pick up `NumberField`'s context: the group gets the field's state for the ring and fill classes, and the input gets the formatted value, `inputMode` and key handling. The input adds `tabular-nums` so digits do not shift width while stepping.
3. The steppers go in `InputBase`'s `trailingAddon`: a `-my-1 -me-1 flex gap-0.5` span with two React Aria `Button`s, `slot="decrement"` (`RiSubtractLine`) and `slot="increment"` (`RiAddLine`). The slots connect them to the field, so React Aria disables each at its limit, repeats the step while it is held, and keeps focus in the input on press.
4. Each stepper is `rounded-md` in `text-foreground-icon-secondary`, `size-6` (or `size-5` at `small`) with a 16px icon. Hover and press set `bg-background-tertiary-hover` with a 150ms colour transition; keyboard focus draws `ring-2 ring-border-focus-ring`; disabled switches to the disabled text colour and a `not-allowed` cursor with no hover fill.
5. `hideSteppers` drops the buttons entirely; Up, Down, Page Up, Page Down, Home and End still step the value from the keyboard.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `stepper size = size-6 (24px) at medium, size-5 (20px) at small; icon size-4 (16px)`
  Fits inside the 36px or 32px shell without changing its height, and leaves the 16px icon a 4px hover margin on every side.
- `stepper inset = -my-1 -me-1`
  Pulls the button pair 4px into the shell's padding, so their hover fill sits closer to the edge while the text keeps Input's inset.
- `stepper gap = gap-0.5 (2px)`
  Keeps minus and plus as separate hover targets without reading as two distant controls.
- `hover transition = transition-colors duration-150 ease-out`
  The same 150ms as the field shell (`--input-transition-ms`), so a stepper and the ring around it change together.

## API

```ts
function NumberField(props: Omit<AriaNumberFieldProps, "className" | "children"> & { label?: ReactNode; hint?: ReactNode; tooltip?: boolean | string; placeholder?: string; size?: "medium" | "small"; leadingIcon?: IconComponent; hideSteppers?: boolean; className?: string; fieldClassName?: string }): JSX.Element
```

- `value / defaultValue: number`
  Controlled or uncontrolled numeric value.
- `onChange: (value: number) => void`
  Called with the parsed number, after clamping; `NaN` when cleared.
- `minValue / maxValue: number`
  Limits. The value is clamped on blur and the matching stepper disables at each limit.
- `step: number` — default `1`
  Amount per stepper press or arrow key.
- `formatOptions: Intl.NumberFormatOptions`
  Currency, percent, unit or decimal formatting for the locale.
- `label / hint: ReactNode`
  Label above and caption below, as on Input.
- `size: "medium" | "small"` — default `"medium"`
  36px or 32px shell; 24px or 20px steppers.
- `hideSteppers: boolean` — default `false`
  Removes the minus and plus buttons.
- `leadingIcon: ComponentType`
  20px icon before the value.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function NumberField({
  label,
  hint,
  tooltip,
  placeholder,
  size = "medium",
  leadingIcon,
  hideSteppers = false,
  "aria-label": ariaLabel,
  className,
  fieldClassName,
  ...props
}: NumberFieldProps) {
  const stepper = cx(STEPPER, size === "small" ? "size-5" : "size-6");

  return (
    <AriaNumberField
      {...props}
      aria-label={ariaLabel ?? (!label ? placeholder : undefined)}
      className={cx("group flex w-full flex-col items-start gap-1", className)}
    >
      {({ isInvalid }) => (
        <>
          {label ? (
            <Label isRequired={props.isRequired} isInvalid={isInvalid} tooltip={tooltip}>
              {label}
            </Label>
          ) : null}
          <InputBase
            size={size}
            placeholder={placeholder}
            leadingIcon={leadingIcon}
            fieldClassName={fieldClassName}
            className="tabular-nums"
            trailingAddon={
              hideSteppers ? undefined : (
                <span className="-my-1 -me-1 flex shrink-0 items-center gap-0.5">
                  <AriaButton slot="decrement" className={stepper}>
                    <RiSubtractLine aria-hidden className="size-4" />
                  </AriaButton>
                  <AriaButton slot="increment" className={stepper}>
                    <RiAddLine aria-hidden className="size-4" />
                  </AriaButton>
                </span>
              )
            }
          />
          {hint ? <HintText isInvalid={isInvalid}>{hint}</HintText> : null}
        </>
      )}
    </AriaNumberField>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component holds no state of its own; React Aria owns the value and the press-and-hold timer.

**Reduced motion.** The component does not check `prefers-reduced-motion`. Its only motion is the 150ms colour transition on the steppers and the shell, which a global rule that removes transitions makes instant.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not render steppers as plain `<button>`s with your own `onClick`. Only React Aria `Button`s with `slot="increment"` and `slot="decrement"` get the limit disabling, hold-to-repeat and focus handling from the field.
- Do not format the value yourself and pass a string. Pass a number and `formatOptions` (for example `{ style: "currency", currency: "USD" }`); React Aria formats it for display and parses typed text back.
- Do not forget that `onChange` can give `NaN` when the field is cleared. Guard any total you compute from it.
- Do not use `step` for a percent field in whole numbers. With `style: "percent"`, 10% is the value 0.1, so a 5% step is `step={0.05}`.

## Notes

- The field imports `InputBase` from Input, and `Label` and `HintText` from Input's companion files, so install Input alongside it.

## Definition of done

A "Seats" field shows 5 with minus and plus at its end. Pressing plus shows 6; holding it keeps stepping. At the maximum the plus button greys out and stops responding. Typing 80 into a field with a maximum of 50 and tabbing away snaps it to 50. A currency field shows "$12.00" and a percent field "10%"; Up and Down step them. Hover on a stepper fills it softly; focus on the field draws Input's inset ring.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
