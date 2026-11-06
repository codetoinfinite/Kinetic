# Build: Color Picker

A compact colour editor on React Aria's colour components: a 3:2 saturation and brightness field, a hue rail, an optional opacity rail over a checkerboard, a swatch beside a hex field, and a row of presets. `ColorPicker` renders it inline; `ColorWell` is a 32px round swatch that opens the same editor in a popover. Thumbs are the kit slider's white embossed dot and grow slightly while dragged.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A saturation field, hue and opacity rails, a hex field and presets, inline or behind a round swatch that opens a popover.

- Category: form
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1

## How it works

1. Both exports wrap React Aria's `ColorPicker`, which owns the value and shares it through context, so every control inside binds to it with no props. `ColorPicker` renders the private `Editor` directly; `ColorWell` renders a `<button>` holding a `ColorSwatch` inside the kit `PopoverTrigger`, and the kit `Popover` (`w-[248px] rounded-3xl`, `p-1` dialog) holds the `Editor` at full width.
2. `Editor` is a `w-[228px] max-w-full` column with `gap-2.5`. First a `ColorArea` with `colorSpace="hsb"`, `xChannel="saturation"`, `yChannel="brightness"`, `aspect-[3/2]` and `rounded-2xl`; working in HSB means the hue survives dragging through grey. React Aria paints the gradient itself.
3. Under it a `ColorSlider` on `channel="hue"` with an `h-3` rounded `SliderTrack`, and with `showAlpha` a second slider on `channel="alpha"` whose track sits on a CHECKERBOARD div: a `repeating-conic-gradient` in 8px tiles, with darker tiles under `dark:`. Every surface gets an inset 1px `rgb(0 0 0 / 0.06)` hairline span so pale colours do not melt into the page.
4. All thumbs share one class: `size-4 rounded-full border border-white` with a two-part shadow (2px drop plus inset hairline), `data-[dragging]:scale-110` over 150ms, and a focus-visible ring. Rail thumbs add `top-1/2`.
5. The hex row is a 32px `ColorSwatch` and a `ColorField` with an `Input` (`dir="ltr"`, mono 13px uppercase, tertiary surface that turns primary with a focus ring). React Aria commits a colour field on blur only, so Enter is handled by blurring and immediately refocusing the input.
6. `swatches` renders a `ColorSwatchPicker` as a 7-column grid; each item is a `ColorSwatchPickerItem` that scales to 110% on hover. The selected ring is always rendered and fades in through `group-data-[selected]/swatch:opacity-100`: a 2px white inset inside a 1px dark inset, which reads on any colour.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `editor width = w-[228px] inline; w-full inside the w-[248px] popover`
  Seven presets at gap-1.5 come out at about 27px each, a comfortable hit target, and the 3:2 area is then 152px tall, enough vertical travel for brightness.
- `thumb = size-4, scale-110 while dragging, 150ms`
  Sixteen pixels is the kit slider's thumb, so colour rails and range sliders match. The grow confirms the grab without hiding the colour under the pointer.
- `rail height = h-3 (12px)`
  Thinner than the thumb, so the thumb visibly overhangs the rail and reads as draggable.
- `checkerboard tile = 8px, #e6e6e6 / #ffffff (dark: #3a3a3a / #262626)`
  Small enough to show partial opacity on a 12px rail; the dark pair keeps the rail from glaring in dark mode.
- `hairline = inset 0 0 0 1px rgb(0 0 0 / 0.06)`
  Separates white and near-white from the page background without drawing a visible border on saturated colours.

## API

```ts
function ColorPicker(props: Omit<AriaColorPickerProps, "children"> & { showAlpha?: boolean; swatches?: string[]; className?: string }): JSX.Element
function ColorWell(props: ColorPickerProps & { "aria-label"?: string; placement?: PopoverProps["placement"]; wellClassName?: string }): JSX.Element
```

- `value / defaultValue: string | Color`
  Controlled or initial colour.
- `onChange: (value: Color) => void`
  Fires continuously while dragging and on hex commit.
- `showAlpha: boolean` — default `false`
  Adds the opacity rail over a checkerboard.
- `swatches: string[]`
  Preset CSS colours in a 7-column row under the editor.
- `className: string` — default `w-[228px]`
  Classes on the editor column, e.g. a width.
- `aria-label: string` — default `"Color"`
  ColorWell only. Names the swatch button and its popover.
- `placement: PopoverProps["placement"]` — default `"bottom start"`
  ColorWell only. Where the popover opens.
- `wellClassName: string` — default `size-8`
  ColorWell only. Classes on the swatch button.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
function Editor({ showAlpha = false, swatches, className }: EditorProps) {
  const localize = useTemplateCopy();

  return (
    <div className={cx("flex w-[228px] max-w-full flex-col gap-2.5", className)}>
      <AriaColorArea
        colorSpace="hsb"
        xChannel="saturation"
        yChannel="brightness"
        className="relative aspect-[3/2] w-full shrink-0 cursor-crosshair rounded-2xl"
      >
        <span aria-hidden className={cx(HAIRLINE, "rounded-2xl")} />
        <AriaColorThumb className={THUMB} />
      </AriaColorArea>

      <AriaColorSlider colorSpace="hsb" channel="hue" className="w-full">
        <AriaSliderTrack className="relative h-3 w-full cursor-pointer rounded-full">
          <span aria-hidden className={cx(HAIRLINE, "rounded-full")} />
          <AriaColorThumb className={cx(THUMB, "top-1/2")} />
        </AriaSliderTrack>
      </AriaColorSlider>

      {showAlpha ? (
        <AriaColorSlider channel="alpha" className="w-full">
          <div className={cx("relative h-3 w-full rounded-full", CHECKERBOARD)}>
            <AriaSliderTrack className="relative h-3 w-full cursor-pointer rounded-full">
              <span aria-hidden className={cx(HAIRLINE, "rounded-full")} />
              <AriaColorThumb className={cx(THUMB, "top-1/2")} />
            </AriaSliderTrack>
          </div>
        </AriaColorSlider>
      ) : null}

      <div className="flex items-center gap-2">
        <AriaColorSwatch className="relative size-8 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]" />
        <AriaColorField aria-label={localize("Hex color")} className="min-w-0 flex-1">
          <AriaInput
            dir="ltr"
            spellCheck={false}
            onKeyDown={(event) => {
              // React Aria commits the field on blur only; Enter commits it
              // too, and focus stays in the field.
              if (event.key !== "Enter") return;
              const input = event.currentTarget;
              input.blur();
              input.focus();
            }}
            className={cx(
              "h-8 w-full min-w-0 rounded-2lg bg-background-tertiary-default px-2.5 font-mono text-[13px] text-text-primary uppercase",
              "outline-none ring-2 ring-transparent ring-inset transition-[background-color,box-shadow] duration-150 ease",
              "focus:bg-background-primary-default focus:ring-border-focus-ring",
            )}
          />
        </AriaColorField>
      </div>

      {swatches?.length ? (
        <AriaColorSwatchPicker aria-label={localize("Presets")} className="grid grid-cols-7 gap-1.5 pt-0.5">
          {swatches.map((swatch) => (
            <AriaColorSwatchPickerItem
              key={swatch}
              color={swatch}
              className={cx(
                "group/swatch relative aspect-square w-full cursor-pointer rounded-full outline-none transition-[scale] duration-150 ease-out hover:scale-110",
                "data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring data-[focus-visible]:ring-offset-2",
              )}
            >
              <AriaColorSwatch className="size-full rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" />
              {/* Selected: a white ring inside a dark hairline reads on any colour. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full opacity-0 shadow-[inset_0_0_0_2px_#fff,inset_0_0_0_3px_rgb(0_0_0/0.25)] transition-opacity duration-150 group-data-[selected]/swatch:opacity-100"
              />
            </AriaColorSwatchPickerItem>
          ))}
        </AriaColorSwatchPicker>
      ) : null}
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** React Aria releases its drag listeners when a drag ends or the control unmounts; the popover's overlay and focus management are torn down on close. No timers.

**Reduced motion.** Only 150ms scale on thumbs, swatches and the well plus opacity on the selection ring and the kit popover's entrance. The component does not branch on `prefers-reduced-motion`; the movements are a few pixels and colour updates are instant either way.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not keep the value in RGB or hex while dragging. Use `colorSpace="hsb"`; in RGB, dragging to grey loses the hue and the area snaps to red.
- Do not expect Enter to commit the hex field. React Aria commits on blur; the component blurs and refocuses on Enter, so keep that handler if you replace the input.
- Do not mount the selected ring only when selected. It is always present and fades on opacity, which is what makes the selection change smooth.
- Do not drop the hairline layers to "clean up" the markup. Without them white and pale presets vanish against a white card.
- Do not render `ColorWell` without a meaningful `aria-label`. The button contains only a swatch, so "Color" is all a screen reader would announce.

## Notes

- `value` / `defaultValue` take a CSS colour string or a React Aria `Color` (`parseColor("#6366F1")`); `onChange` hands back a `Color`, so call `toString("hex")` or `toString("css")` as needed.
- Every control is keyboard reachable: arrows nudge the area and rails, Shift or Page keys take bigger steps, and the hex field accepts any CSS colour.

## Definition of done

The inline picker shows a saturation field with a white thumb, a full-spectrum hue rail and a hex field reading the current colour. Dragging in the field updates the swatch and hex live; dragging the hue rail through any position keeps the saturation and brightness. Typing "#22C55E" in the hex field and pressing Enter applies it without leaving the field. Clicking a preset selects it with a white inner ring. A ColorWell opens the same editor in a popover from its round swatch; with `showAlpha`, the opacity rail sits on a checkerboard.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
