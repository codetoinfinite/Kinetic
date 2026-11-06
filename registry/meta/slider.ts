import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'slider',
  title: 'Slider',
  category: 'form',
  kit: 'boardui',
  tags: ['slider', 'range', 'range-slider', 'input', 'react-aria', 'boardui'],
  blurb:
    'Single and min/max sliders on React Aria: a gradient fill, thumbs that grow while dragged, and a value bubble above each thumb.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/slider.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'One shared `SliderBase` drawn over React Aria\'s `Slider`, exported as `Slider` (one thumb) and `RangeSlider` (two). React Aria owns the value model, pointer dragging, keyboard steps, hidden range inputs, RTL and thumb collision. The component owns the look: a 6px rail, an accent gradient fill between the thumbs, 20px thumbs that grow while dragged, and an exact-value bubble with a pointer that lifts while its thumb is active.',

  mechanism: [
    '`AriaSlider` gets the consumer\'s props plus a forced `orientation="horizontal"`. Its render prop exposes `state`, and `isRange` is simply `state.values.length > 1`.',
    'The fill is a positioned span. Its `insetInlineStart` is `state.getThumbPercent(0)` for a range or 0 for a single slider, and its `insetInlineEnd` is `1 - getThumbPercent(last)`. Logical insets make the fill grow from the right in RTL with no extra code.',
    'Each value in `state.values` renders an `AriaSliderThumb` with `index`. Its `aria-label` comes from `thumbLabels[index]` (default "Value", or "Minimum" and "Maximum"), so each thumb is named for what it changes and not by its position.',
    'Thumb states come from React Aria\'s render props. Hover gives `scale-105` and a darker border. Dragging gives `scale-110`, an accent border, an accent-tinted shadow and `z-20`, so the active thumb sits above the other where they overlap. All of it eases over 150ms via `transition-[scale,box-shadow,border-color]`.',
    'With `showTooltip` (the default), each thumb holds a bubble at `bottom-[calc(100%+9px)]` that shows `formatValue(value, index)`, or `state.getThumbValueLabel(index)` when there is no formatter. A rotated 8px square draws its pointer. While the thumb is dragged or focused the bubble rises 2px (`-translate-y-0.5`) and picks up `shadow-dropdown`. The track adds `mt-8` so the bubble has room above it.',
  ],

  constants: [
    {
      name: 'track',
      value: 'h-8 hit area, h-1.5 rail',
      why: 'The visible rail is 6px, but the track element is 32px tall, so a click slightly above or below the rail still moves the thumb.',
    },
    {
      name: 'thumb',
      value: 'size-5 (20px) with an 8px accent dot; scale 1.05 hover, 1.1 drag',
      why: 'Twenty pixels is the Figma size and a comfortable pointer target. The grow-on-drag is small enough to keep the thumb centred on the value and still visible under a finger.',
    },
    {
      name: 'bubble offset',
      value: 'bottom-[calc(100%+9px)], h-7, lift -2px',
      why: 'Nine pixels clears the thumb\'s scaled size plus the pointer. The 2px lift shows which bubble belongs to the thumb you are holding.',
    },
    {
      name: 'transition',
      value: '150ms ease',
      why: 'Short enough that the thumb still feels attached to the pointer while scale and shadow change underneath it.',
    },
  ],

  pitfalls: [
    'Leaving out both `label` and `aria-label`. React Aria logs a warning and the group is unnamed. `thumbLabel` names only the thumb, not the slider.',
    'Setting `showTooltip={false}` and expecting the space above to stay. The track drops its `mt-8`, so any layout that depended on that height moves up.',
    'Returning a long string from `formatValue`. The bubble is `whitespace-nowrap`, so wide text spreads sideways and can collide with the other thumb\'s bubble when the values are close.',
  ],

  notes: [
    '`RangeSlider` keeps the thumbs from crossing because React Aria clamps each one to its neighbour. `minValue`, `maxValue`, `step` and `formatOptions` pass straight through.',
    'The value bubble is `aria-hidden`. Screen readers hear React Aria\'s value text from the hidden range input, so use `formatOptions` when the spoken value should be formatted too (currency, percent).',
  ],

  apiSignature:
    'function Slider(props: Omit<AriaSliderProps<number>, "children" | "className" | "orientation"> & { label?: ReactNode; showTooltip?: boolean; formatValue?: (value: number, index: number) => ReactNode; className?: string; thumbLabel?: string }): JSX.Element; function RangeSlider(props: Omit<AriaSliderProps<number[]>, "children" | "className" | "orientation"> & { label?: ReactNode; showTooltip?: boolean; formatValue?: (value: number, index: number) => ReactNode; className?: string; thumbLabels?: [string, string] }): JSX.Element',

  props: [
    { name: 'label', type: 'ReactNode', description: 'Visible label above the track, wired to every thumb.' },
    { name: 'value / defaultValue / onChange', type: 'number | number[]', description: 'React Aria value props. `Slider` takes a number, `RangeSlider` a two-item array.' },
    { name: 'onChangeEnd', type: '(value) => void', description: 'Fires once when a drag or key press ends. Use it for saving.' },
    { name: 'minValue / maxValue / step', type: 'number', default: '0 / 100 / 1', description: 'Range and step size.' },
    { name: 'showTooltip', type: 'boolean', default: 'true', description: 'Show the value bubble above each thumb.' },
    { name: 'formatValue', type: '(value: number, index: number) => ReactNode', description: 'Visual text for the bubble only.' },
    { name: 'thumbLabel', type: 'string', default: '"Value"', description: '`Slider` only: accessible name for the thumb.' },
    { name: 'thumbLabels', type: '[string, string]', default: '["Minimum", "Maximum"]', description: '`RangeSlider` only: accessible names for the two thumbs.' },
    { name: 'isDisabled', type: 'boolean', description: 'Dims to 50% and shows a not-allowed cursor.' },
    { name: 'className', type: 'string', description: 'Classes on the root column.' },
  ],

  reducedMotion:
    'The thumb follows the pointer directly, with no tween, so dragging is the same under any setting. The hover and drag scale, shadow and bubble lift are 150ms CSS transitions of a few pixels. They are kept under `prefers-reduced-motion` because they report state, and `motion-reduce:transition-none` on the root removes them.',

  cleanup:
    'No effects or listeners of its own. React Aria attaches its pointer move and up listeners on drag start and removes them when the drag ends or the slider unmounts.',

  acceptance:
    'Dragging the volume thumb moves the bubble and fill with it, the thumb grows slightly and its border turns accent, and the summary line updates on every frame. The range thumbs cannot cross, the fill always runs between them, and the dragged thumb sits above the other where they overlap. Tab focuses a thumb and lifts its bubble, and the arrow keys step by 100 on the budget. In RTL the fill grows from the right. No accessibility warning appears in the console.',

  criticalRegion: 'critical',
};

export default meta;
