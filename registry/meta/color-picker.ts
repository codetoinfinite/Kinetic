import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'color-picker',
  title: 'Color Picker',
  category: 'form',
  kit: 'boardui',
  tags: ['color', 'picker', 'hsb', 'swatch', 'popover', 'react-aria', 'boardui'],
  blurb:
    'A saturation field, hue and opacity rails, a hex field and presets, inline or behind a round swatch that opens a popover.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/color-picker.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'A compact colour editor on React Aria\'s colour components: a 3:2 saturation and brightness field, a hue rail, an optional opacity rail over a checkerboard, a swatch beside a hex field, and a row of presets. `ColorPicker` renders it inline; `ColorWell` is a 32px round swatch that opens the same editor in a popover. Thumbs are the kit slider\'s white embossed dot and grow slightly while dragged.',

  mechanism: [
    'Both exports wrap React Aria\'s `ColorPicker`, which owns the value and shares it through context, so every control inside binds to it with no props. `ColorPicker` renders the private `Editor` directly; `ColorWell` renders a `<button>` holding a `ColorSwatch` inside the kit `PopoverTrigger`, and the kit `Popover` (`w-[248px] rounded-3xl`, `p-1` dialog) holds the `Editor` at full width.',
    '`Editor` is a `w-[228px] max-w-full` column with `gap-2.5`. First a `ColorArea` with `colorSpace="hsb"`, `xChannel="saturation"`, `yChannel="brightness"`, `aspect-[3/2]` and `rounded-2xl`; working in HSB means the hue survives dragging through grey. React Aria paints the gradient itself.',
    'Under it a `ColorSlider` on `channel="hue"` with an `h-3` rounded `SliderTrack`, and with `showAlpha` a second slider on `channel="alpha"` whose track sits on a CHECKERBOARD div: a `repeating-conic-gradient` in 8px tiles, with darker tiles under `dark:`. Every surface gets an inset 1px `rgb(0 0 0 / 0.06)` hairline span so pale colours do not melt into the page.',
    'All thumbs share one class: `size-4 rounded-full border border-white` with a two-part shadow (2px drop plus inset hairline), `data-[dragging]:scale-110` over 150ms, and a focus-visible ring. Rail thumbs add `top-1/2`.',
    'The hex row is a 32px `ColorSwatch` and a `ColorField` with an `Input` (`dir="ltr"`, mono 13px uppercase, tertiary surface that turns primary with a focus ring). React Aria commits a colour field on blur only, so Enter is handled by blurring and immediately refocusing the input.',
    '`swatches` renders a `ColorSwatchPicker` as a 7-column grid; each item is a `ColorSwatchPickerItem` that scales to 110% on hover. The selected ring is always rendered and fades in through `group-data-[selected]/swatch:opacity-100`: a 2px white inset inside a 1px dark inset, which reads on any colour.',
  ],

  constants: [
    {
      name: 'editor width',
      value: 'w-[228px] inline; w-full inside the w-[248px] popover',
      why: 'Seven presets at gap-1.5 come out at about 27px each, a comfortable hit target, and the 3:2 area is then 152px tall, enough vertical travel for brightness.',
    },
    {
      name: 'thumb',
      value: 'size-4, scale-110 while dragging, 150ms',
      why: 'Sixteen pixels is the kit slider\'s thumb, so colour rails and range sliders match. The grow confirms the grab without hiding the colour under the pointer.',
    },
    {
      name: 'rail height',
      value: 'h-3 (12px)',
      why: 'Thinner than the thumb, so the thumb visibly overhangs the rail and reads as draggable.',
    },
    {
      name: 'checkerboard tile',
      value: '8px, #e6e6e6 / #ffffff (dark: #3a3a3a / #262626)',
      why: 'Small enough to show partial opacity on a 12px rail; the dark pair keeps the rail from glaring in dark mode.',
    },
    {
      name: 'hairline',
      value: 'inset 0 0 0 1px rgb(0 0 0 / 0.06)',
      why: 'Separates white and near-white from the page background without drawing a visible border on saturated colours.',
    },
  ],

  pitfalls: [
    'Do not keep the value in RGB or hex while dragging. Use `colorSpace="hsb"`; in RGB, dragging to grey loses the hue and the area snaps to red.',
    'Do not expect Enter to commit the hex field. React Aria commits on blur; the component blurs and refocuses on Enter, so keep that handler if you replace the input.',
    'Do not mount the selected ring only when selected. It is always present and fades on opacity, which is what makes the selection change smooth.',
    'Do not drop the hairline layers to "clean up" the markup. Without them white and pale presets vanish against a white card.',
    'Do not render `ColorWell` without a meaningful `aria-label`. The button contains only a swatch, so "Color" is all a screen reader would announce.',
  ],

  notes: [
    '`value` / `defaultValue` take a CSS colour string or a React Aria `Color` (`parseColor("#6366F1")`); `onChange` hands back a `Color`, so call `toString("hex")` or `toString("css")` as needed.',
    'Every control is keyboard reachable: arrows nudge the area and rails, Shift or Page keys take bigger steps, and the hex field accepts any CSS colour.',
  ],

  apiSignature:
    'function ColorPicker(props: Omit<AriaColorPickerProps, "children"> & { showAlpha?: boolean; swatches?: string[]; className?: string }): JSX.Element\nfunction ColorWell(props: ColorPickerProps & { "aria-label"?: string; placement?: PopoverProps["placement"]; wellClassName?: string }): JSX.Element',

  props: [
    { name: 'value / defaultValue', type: 'string | Color', description: 'Controlled or initial colour.' },
    { name: 'onChange', type: '(value: Color) => void', description: 'Fires continuously while dragging and on hex commit.' },
    { name: 'showAlpha', type: 'boolean', default: 'false', description: 'Adds the opacity rail over a checkerboard.' },
    { name: 'swatches', type: 'string[]', description: 'Preset CSS colours in a 7-column row under the editor.' },
    { name: 'className', type: 'string', default: 'w-[228px]', description: 'Classes on the editor column, e.g. a width.' },
    { name: 'aria-label', type: 'string', default: '"Color"', description: 'ColorWell only. Names the swatch button and its popover.' },
    { name: 'placement', type: 'PopoverProps["placement"]', default: '"bottom start"', description: 'ColorWell only. Where the popover opens.' },
    { name: 'wellClassName', type: 'string', default: 'size-8', description: 'ColorWell only. Classes on the swatch button.' },
  ],

  reducedMotion:
    'Only 150ms scale on thumbs, swatches and the well plus opacity on the selection ring and the kit popover\'s entrance. The component does not branch on `prefers-reduced-motion`; the movements are a few pixels and colour updates are instant either way.',

  cleanup:
    'React Aria releases its drag listeners when a drag ends or the control unmounts; the popover\'s overlay and focus management are torn down on close. No timers.',

  acceptance:
    'The inline picker shows a saturation field with a white thumb, a full-spectrum hue rail and a hex field reading the current colour. Dragging in the field updates the swatch and hex live; dragging the hue rail through any position keeps the saturation and brightness. Typing "#22C55E" in the hex field and pressing Enter applies it without leaving the field. Clicking a preset selects it with a white inner ring. A ColorWell opens the same editor in a popover from its round swatch; with `showAlpha`, the opacity rail sits on a checkerboard.',

  criticalRegion: 'critical',
};

export default meta;
