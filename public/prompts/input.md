# Build: Input

The kit's text field in three layers: `TextField` (React Aria field plus a size context), `InputBase` (the filled shell with icons or addons around the `<input>`) and `Input`, which composes a label, the shell and a hint or error line. The shell has no border; hover and focus draw a 2px inset ring and an invalid field tints red, all over 150ms. React Aria wires the label, description and error message to the input.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

React Aria text field on a filled shell with an inset ring for hover and focus, label with required mark, hint or error line, and icons.

- Category: form
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. `TextField` renders `AriaTextField` as `group flex h-max w-full flex-col items-start gap-1` with `data-input-size`, and provides `TextFieldContext` with `size`, `fieldClassName` and `inputClassName`, so an `InputBase` (or the kit Textarea) further down picks them up without prop drilling. Children may be a render function that receives `isRequired`, `isInvalid`, `isDisabled` and `isReadOnly`.
2. `InputBase` renders `AriaGroup`, whose className function calls `inputFieldClassName(state, size, hasAddon)`. The base shell is `rounded-2lg bg-background-tertiary-default` with `ring-2 ring-inset ring-transparent` and a `transition-[background-color,box-shadow,color]` over `var(--input-transition-ms)` (150ms in the theme). Hover, when not focused, disabled or invalid, sets `ring-border-button-hover`; focus within sets `ring-border-button-active`; disabled sets `bg-input-disabled-background`; invalid sets `bg-background-tertiary-error text-foreground-icon-error`.
3. Inside the shell, a leading `leadingAddon` (if given) or `leadingIcon` (a component rendered at `size-5`, `aria-hidden`) sits before `AriaInput`, then `trailingAddon` or `trailingIcon`. Icons have no colour of their own, so they inherit the shell's text colour and turn red with it when invalid.
4. The `<input>` is transparent and borderless in `text-body-regular text-text-primary`. Its placeholder is `text-text-tertiary`, darkens to `text-text-primary` on focus and turns `text-text-error-placeholder` when `aria-invalid`. `useLocale` decides `pl-1 text-left` or, in RTL, `pr-1 text-right`.
5. `Input` composes the three: it renders `Label` (when `label` is given) with the field's `isRequired`, then `InputBase`, then React Aria's `FieldError` styled by `hintTextClassName(true)` when the field is invalid and `errorMessage` is set, otherwise `HintText` with `hint`. With no `label` and no `aria-label`, a string `placeholder` becomes the `aria-label`. For `type` email, url or tel it sets `dir="ltr"` on the input unless `inputDir` says otherwise.
6. `Label` wraps React Aria `Label` in `text-body-medium text-text-primary` with a 2px gap, adds an `aria-hidden` red `*` when `isRequired`, and a 16px `RiInformationFill` when `tooltip` is set. `HintText` wraps React Aria `Text` with `slot="description"` (or `slot="errorMessage"` when `isInvalid`) in `pt-px text-caption-1-medium`, `text-text-secondary` or `text-text-error-primary`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `--input-transition-ms = 150ms`
  One theme variable for every field shell (Input, Textarea and others read it), so ring and fill changes run at the same speed across a form.
- `ring = ring-2 ring-inset, transparent at rest`
  An inset box shadow instead of a border, so the hover and focus outlines appear without the field growing or the text shifting by a pixel.
- `sizes = medium p-2 (36px with a 20px line) · small h-8 px-1.5 py-2 (32px)`
  Figma node 3665:1849. With a `leadingAddon` the start padding drops to 4px so an addon such as a country picker sits close to the edge.
- `icon = size-5 (20px)`
  The same height as the 20px body line, so icons and text centre on one axis inside the 36px shell.

## API

```ts
function Input(props: Omit<TextFieldProps, "children"> & { label?: ReactNode; hint?: ReactNode; errorMessage?: FieldErrorProps["children"]; tooltip?: boolean | string; placeholder?: string; inputDir?: "ltr" | "rtl" | "auto"; leadingIcon?: IconComponent; trailingIcon?: IconComponent; leadingAddon?: ReactNode; fieldClassName?: string; ref?: Ref<HTMLInputElement>; groupRef?: Ref<HTMLDivElement> }): JSX.Element
function TextField(props: AriaTextFieldProps & { size?: "medium" | "small"; fieldClassName?: string; inputClassName?: string }): JSX.Element
function InputBase(props: Omit<AriaInputProps, "size" | "className"> & { size?: "medium" | "small"; className?: string; leadingIcon?: IconComponent; trailingIcon?: IconComponent; leadingAddon?: ReactNode; trailingAddon?: ReactNode; fieldClassName?: string; ref?: Ref<HTMLInputElement>; groupRef?: Ref<HTMLDivElement> }): JSX.Element
```

- `label: ReactNode`
  Visible label above the field, wired to the input by React Aria.
- `hint: ReactNode`
  Caption below the field, wired as the description.
- `errorMessage: ReactNode | (validation) => ReactNode`
  Replaces the hint while the field is invalid.
- `value / defaultValue / onChange: string / (value: string) => void`
  Controlled or uncontrolled value, from React Aria.
- `isRequired: boolean`
  Adds the red asterisk to the label and `aria-required`.
- `isInvalid: boolean`
  Red-tinted shell, red placeholder and the error line.
- `isDisabled: boolean`
  Grey shell and text, not-allowed cursor.
- `size: "medium" | "small"` — default `"medium"`
  36px or 32px shell.
- `leadingIcon / trailingIcon: ComponentType`
  20px icon components on either side of the text.
- `tooltip: boolean | string`
  Shows an info glyph after the label.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * The field shell's classes for a state. InputBase uses it, and so do fields
 * whose editable part isn't an <input> (Time Field's segments).
 */
export function inputFieldClassName(
  { isFocusWithin, isHovered, isDisabled, isInvalid }: InputFieldState,
  size: InputSize = "medium",
  hasAddon = false,
) {
  return cx(
    inputStyles.field,
    hasAddon ? inputStyles.fieldWithAddonSize[size] : inputStyles.fieldSize[size],
    // Hover: idle, no focus, no disabled, no invalid
    isHovered && !isFocusWithin && !isDisabled && !isInvalid && "ring-border-button-hover",
    // Focus wins over hover
    isFocusWithin && !isDisabled && !isInvalid && "ring-border-button-active",
    // Disabled
    isDisabled && "bg-input-disabled-background text-input-disabled-foreground",
    // Invalid
    isInvalid && "bg-background-tertiary-error text-foreground-icon-error",
  );
}

export function InputBase({
  size: sizeProp,
  leadingIcon: Leading,
  trailingIcon: Trailing,
  leadingAddon,
  trailingAddon,
  fieldClassName,
  className,
  ref,
  groupRef,
  ...inputProps
}: InputBaseProps) {
  const { direction } = useLocale();
  const ctx = useContext(TextFieldContext);
  const size: InputSize = sizeProp ?? ctx.size ?? "medium";
  const hasAddon = leadingAddon !== undefined && leadingAddon !== null;

  return (
    <AriaGroup
      ref={groupRef}
      className={(state) => cx(inputFieldClassName(state, size, hasAddon), ctx.fieldClassName, fieldClassName)}
    >
      <div className={inputStyles.content}>
        <div className={inputStyles.leftSection}>
          {hasAddon ? (
            leadingAddon
          ) : Leading ? (
            <Leading className={inputStyles.icon} aria-hidden />
          ) : null}
          <AriaInput
            ref={ref}
            {...inputProps}
            // Align to the field's start even when email/URL values use LTR.
            className={cx(inputStyles.input, direction === "rtl" ? "pr-1 text-right" : "pl-1 text-left", ctx.inputClassName, className)}
          />
        </div>
        {trailingAddon ?? (Trailing ? (
          <Trailing className={inputStyles.icon} aria-hidden />
        ) : null)}
      </div>
    </AriaGroup>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The components hold no state, listeners or timers of their own; React Aria owns the field state.

**Reduced motion.** The component does not check `prefers-reduced-motion`. The only motion is the 150ms colour and ring transition on the shell, which a global rule that removes transitions turns into an instant change.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not add a `border` to show focus. The shell uses an inset ring that takes no layout space; a border would shift the content by a pixel on focus.
- Do not pass an element to `leadingIcon` (`<RiMailLine />`). It expects the component (`RiMailLine`) and renders it with the shell's classes.
- Do not set `isInvalid` without an `errorMessage` or `hint` if users need to know why. Only the shell tints red; the error text comes from those props.
- Do not leave a field with no `label`, no `aria-label` and no string `placeholder`. Then nothing names it and React Aria warns.

## Notes

- `inputFieldClassName` is exported for fields whose editable part is not an `<input>` (date and time segments), so they share the exact shell states.
- `Label`'s `isInvalid` prop is accepted but unused; it is reserved for invalid styling later.

## Definition of done

A labelled field shows a grey filled shell with no visible border. Hovering draws a light inset ring; clicking in darkens the ring and the placeholder, with no shift in layout. A required field shows a red asterisk after its label. Typing an invalid email in a field marked invalid tints the shell and its icon red and swaps the hint for the error message. A disabled field is lighter and ignores input. Screen readers announce the label, the hint and, when invalid, the error.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
