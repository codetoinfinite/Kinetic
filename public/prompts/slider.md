# Build: Slider

One shared `SliderBase` drawn over React Aria's `Slider`, exported as `Slider` (one thumb) and `RangeSlider` (two). React Aria owns the value model, pointer dragging, keyboard steps, hidden range inputs, RTL and thumb collision. The component owns the look: a 6px rail, an accent gradient fill between the thumbs, 20px thumbs that grow while dragged, and an exact-value bubble with a pointer that lifts while its thumb is active.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Single and min/max sliders on React Aria: a gradient fill, thumbs that grow while dragged, and a value bubble above each thumb.

- Category: form
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `AriaSlider` gets the consumer's props plus a forced `orientation="horizontal"`. Its render prop exposes `state`, and `isRange` is simply `state.values.length > 1`.
2. The fill is a positioned span. Its `insetInlineStart` is `state.getThumbPercent(0)` for a range or 0 for a single slider, and its `insetInlineEnd` is `1 - getThumbPercent(last)`. Logical insets make the fill grow from the right in RTL with no extra code.
3. Each value in `state.values` renders an `AriaSliderThumb` with `index`. Its `aria-label` comes from `thumbLabels[index]` (default "Value", or "Minimum" and "Maximum"), so each thumb is named for what it changes and not by its position.
4. Thumb states come from React Aria's render props. Hover gives `scale-105` and a darker border. Dragging gives `scale-110`, an accent border, an accent-tinted shadow and `z-20`, so the active thumb sits above the other where they overlap. All of it eases over 150ms via `transition-[scale,box-shadow,border-color]`.
5. With `showTooltip` (the default), each thumb holds a bubble at `bottom-[calc(100%+9px)]` that shows `formatValue(value, index)`, or `state.getThumbValueLabel(index)` when there is no formatter. A rotated 8px square draws its pointer. While the thumb is dragged or focused the bubble rises 2px (`-translate-y-0.5`) and picks up `shadow-dropdown`. The track adds `mt-8` so the bubble has room above it.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `track = h-8 hit area, h-1.5 rail`
  The visible rail is 6px, but the track element is 32px tall, so a click slightly above or below the rail still moves the thumb.
- `thumb = size-5 (20px) with an 8px accent dot; scale 1.05 hover, 1.1 drag`
  Twenty pixels is the Figma size and a comfortable pointer target. The grow-on-drag is small enough to keep the thumb centred on the value and still visible under a finger.
- `bubble offset = bottom-[calc(100%+9px)], h-7, lift -2px`
  Nine pixels clears the thumb's scaled size plus the pointer. The 2px lift shows which bubble belongs to the thumb you are holding.
- `transition = 150ms ease`
  Short enough that the thumb still feels attached to the pointer while scale and shadow change underneath it.

## API

```ts
function Slider(props: Omit<AriaSliderProps<number>, "children" | "className" | "orientation"> & { label?: ReactNode; showTooltip?: boolean; formatValue?: (value: number, index: number) => ReactNode; className?: string; thumbLabel?: string }): JSX.Element; function RangeSlider(props: Omit<AriaSliderProps<number[]>, "children" | "className" | "orientation"> & { label?: ReactNode; showTooltip?: boolean; formatValue?: (value: number, index: number) => ReactNode; className?: string; thumbLabels?: [string, string] }): JSX.Element
```

- `label: ReactNode`
  Visible label above the track, wired to every thumb.
- `value / defaultValue / onChange: number | number[]`
  React Aria value props. `Slider` takes a number, `RangeSlider` a two-item array.
- `onChangeEnd: (value) => void`
  Fires once when a drag or key press ends. Use it for saving.
- `minValue / maxValue / step: number` — default `0 / 100 / 1`
  Range and step size.
- `showTooltip: boolean` — default `true`
  Show the value bubble above each thumb.
- `formatValue: (value: number, index: number) => ReactNode`
  Visual text for the bubble only.
- `thumbLabel: string` — default `"Value"`
  `Slider` only: accessible name for the thumb.
- `thumbLabels: [string, string]` — default `["Minimum", "Maximum"]`
  `RangeSlider` only: accessible names for the two thumbs.
- `isDisabled: boolean`
  Dims to 50% and shows a not-allowed cursor.
- `className: string`
  Classes on the root column.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
function SliderBase<T extends SliderValue>({
  className,
  label,
  showTooltip = true,
  formatValue,
  thumbLabels,
  ...props
}: SliderBaseInternalProps<T>) {
  return (
    <AriaSlider
      {...props}
      orientation="horizontal"
      className={({ isDisabled }) =>
        cx(
          "group flex w-full min-w-0 flex-col gap-2",
          isDisabled && "cursor-not-allowed opacity-50",
          className,
        )
      }
    >
      {({ state }) => {
        const isRange = state.values.length > 1;
        const startPercent = isRange ? state.getThumbPercent(0) : 0;
        const endPercent = state.getThumbPercent(state.values.length - 1);

        return (
          <>
            {label != null && (
              <AriaLabel className="text-body-medium text-text-primary">
                {label}
              </AriaLabel>
            )}

            <AriaSliderTrack
              className={cx(
                "relative h-8 w-full touch-none",
                showTooltip && "mt-8",
              )}
            >
              {({ isHovered }) => (
                <>
                  <span
                    aria-hidden
                    className={cx(
                      "absolute top-1/2 end-0 start-0 h-1.5 -translate-y-1/2 rounded-full",
                      "bg-background-tertiary-default shadow-[inset_0_1px_1px_rgb(0_0_0/0.06)]",
                      "transition-colors duration-150 ease",
                      isHovered && "bg-background-tertiary-hover",
                    )}
                  />
                  <span
                    aria-hidden
                    className={cx(
                      "absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full",
                      "bg-linear-to-r from-accent-500 to-accent-600",
                      "shadow-[inset_0_1px_0_rgb(255_255_255/0.24),0_1px_2px_rgb(4_80_226/0.16)]",
                    )}
                    style={{
                      insetInlineStart: `${startPercent * 100}%`,
                      insetInlineEnd: `${(1 - endPercent) * 100}%`,
                    }}
                  />

                  {state.values.map((value, index) => {
                    const valueLabel =
                      formatValue?.(value, index) ??
                      state.getThumbValueLabel(index);

                    return (
                      <AriaSliderThumb
                        key={index}
                        index={index}
                        aria-label={
                          thumbLabels[index] ??
                          (isRange ? `Value ${index + 1}` : "Value")
                        }
                        className={({
                          isDragging,
                          isHovered: isThumbHovered,
                          isFocusVisible,
                          isDisabled,
                        }) =>
                          cx(
                            "top-1/2 size-5 rounded-full border border-border-button-default outline-none",
                            "flex items-center justify-center bg-control-indicator-background",
                            "shadow-[0_2px_4px_rgb(0_0_0/0.10),inset_0_1px_0_rgb(255_255_255/0.8)]",
                            "transition-[scale,box-shadow,border-color] duration-150 ease",
                            isThumbHovered && !isDragging && "scale-105 border-border-button-hover",
                            isDragging && "z-20 scale-110 border-accent-500 shadow-[0_3px_8px_color-mix(in_srgb,var(--color-accent-600)_22%,transparent)]",
                            isFocusVisible && "ring-2 ring-border-focus-ring ring-offset-2",
                            isDisabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
                          )
                        }
                      >
                        {({ isDragging, isFocused }) => (
                          <>
                            {showTooltip && (
                              <span
                                aria-hidden
                                className={cx(
                                  "pointer-events-none absolute bottom-[calc(100%+9px)] left-1/2 -translate-x-1/2",
                                  "flex h-7 min-w-8 items-center justify-center rounded-lg border border-border-button-default",
                                  "bg-background-primary-default px-2 text-caption-1-medium whitespace-nowrap text-text-primary shadow-xs",
                                  "transition-[translate,box-shadow] duration-150 ease",
                                  (isDragging || isFocused) && "-translate-y-0.5 shadow-dropdown",
                                )}
                              >
                                {valueLabel}
                                <span
                                  aria-hidden
                                  className="absolute -bottom-[4.5px] left-1/2 size-2 -translate-x-1/2 rotate-45 border-r border-b border-border-button-default bg-background-primary-default"
                                />
                              </span>
                            )}
                            <span
                              aria-hidden
                              className={cx(
                                "size-2 rounded-full bg-linear-to-b from-accent-500 to-accent-600",
                                "shadow-[inset_0_1px_0_rgb(255_255_255/0.24)] transition-[filter] duration-150 ease",
                                (isDragging || isFocused) && "brightness-110",
                              )}
                            />
                          </>
                        )}
                      </AriaSliderThumb>
                    );
                  })}
                </>
              )}
            </AriaSliderTrack>
          </>
        );
      }}
    </AriaSlider>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No effects or listeners of its own. React Aria attaches its pointer move and up listeners on drag start and removes them when the drag ends or the slider unmounts.

**Reduced motion.** The thumb follows the pointer directly, with no tween, so dragging is the same under any setting. The hover and drag scale, shadow and bubble lift are 150ms CSS transitions of a few pixels. They are kept under `prefers-reduced-motion` because they report state, and `motion-reduce:transition-none` on the root removes them.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Leaving out both `label` and `aria-label`. React Aria logs a warning and the group is unnamed. `thumbLabel` names only the thumb, not the slider.
- Setting `showTooltip={false}` and expecting the space above to stay. The track drops its `mt-8`, so any layout that depended on that height moves up.
- Returning a long string from `formatValue`. The bubble is `whitespace-nowrap`, so wide text spreads sideways and can collide with the other thumb's bubble when the values are close.

## Notes

- `RangeSlider` keeps the thumbs from crossing because React Aria clamps each one to its neighbour. `minValue`, `maxValue`, `step` and `formatOptions` pass straight through.
- The value bubble is `aria-hidden`. Screen readers hear React Aria's value text from the hidden range input, so use `formatOptions` when the spoken value should be formatted too (currency, percent).

## Definition of done

Dragging the volume thumb moves the bubble and fill with it, the thumb grows slightly and its border turns accent, and the summary line updates on every frame. The range thumbs cannot cross, the fill always runs between them, and the dragged thumb sits above the other where they overlap. Tab focuses a thumb and lifts its bubble, and the arrow keys step by 100 on the budget. In RTL the fill grows from the right. No accessibility warning appears in the console.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
