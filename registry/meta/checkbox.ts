import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'checkbox',
  title: 'Checkbox',
  category: 'form',
  kit: 'boardui',
  tags: ['checkbox', 'indeterminate', 'react-aria', 'form', 'boardui'],
  blurb:
    'React Aria checkbox in two sizes: a gradient box whose white tick draws itself on, plus an indeterminate dash for partial selections.',
  cost: 'css',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/checkbox.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/ui/checkbox-glyph.tsx',
      type: 'registry:ui',
      role: 'shared box and tick glyph',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'React Aria\'s `Checkbox` wrapped around a shared `CheckboxGlyph`: a 16px (or 14px) box with a 4px radius that fills with the accent gradient when checked, while a white tick draws itself on over 200ms. The indeterminate state swaps the tick for a flat dash, which is what a "select all" parent shows when only some of its children are on. The glyph lives in its own file so Checkbox Card renders the identical box.',

  mechanism: [
    '`Checkbox` spreads every React Aria prop onto `AriaCheckbox`, which renders a `<label>` around the native input (hence `ref?: Ref<HTMLLabelElement>`). Its children are a render function: the state object (`isSelected`, `isIndeterminate`, `isHovered`, `isFocusVisible`, `isDisabled`) goes straight into `<CheckboxGlyph state={state} size={size} />`, and `children`, when not null, becomes a label span in the size\'s type style.',
    'The glyph derives `isMarked = isSelected || isIndeterminate`. Marked boxes paint `bg-linear-to-b from-accent-500 to-accent-600` plus `shadow-checkbox-selected` (the inner highlight), lightening to `from-accent-400 to-accent-500` on hover. Unmarked boxes are a 1px `border-border-checkbox-default` on `bg-background-primary-default` with `shadow-xs`, and the border darkens to `border-border-checkbox-hover` on hover. Hover only counts when the box is not disabled.',
    'The box transitions `background-color`, `border-color` and `box-shadow` over 150ms. The gradient itself is a `background-image`, which does not interpolate, so the fill switches at once and the tick carries the motion.',
    'Inside a 16×16 `viewBox`, indeterminate wins over selected: it renders the dash `M4.5 8H8H11.5`. A selected box renders the tick path with `pathLength={1}` and `animate-check-draw`. The theme gives that class `stroke-dasharray: 1; stroke-dashoffset: 1` and animates the offset to 0 over 200ms `cubic-bezier(0.65, 0, 0.35, 1)` with `forwards`. Because `pathLength` is 1, the same numbers mean "the whole stroke" at either size.',
    'An unchecked box renders no path at all. So every check mounts a fresh path and replays the draw, and unchecking removes the tick immediately with no reverse animation.',
    'Sizes come from `checkboxSizes`: md is a `size-4` box, `text-body-medium` label and `gap-2`; sm is a `size-3.5` box, `text-body-2-medium` label and `gap-1.5`. Focus draws `ring-2 ring-border-focus-ring ring-offset-2` only while `isFocusVisible` is true, so it shows for keyboard focus and not for a mouse click. Disabled dims the glyph to `opacity-50` and sets `cursor-not-allowed` on the label. `className` accepts a string or React Aria\'s state function and is merged last through `cx`.',
  ],

  constants: [
    {
      name: 'box size',
      value: 'md 16px (size-4), sm 14px (size-3.5), radius 4px (rounded-sm)',
      why: 'Figma\'s two sizes. Each is paired with its own label style (14px Body 1 for md, 13px Body 2 for sm), so box and text centre on one line.',
    },
    {
      name: 'tick draw',
      value: '200ms cubic-bezier(0.65, 0, 0.35, 1), forwards',
      why: 'A symmetric ease-in-out, so the stroke starts and lands softly like a pen mark. It is short enough to finish before the pointer has moved on. `forwards` holds the final frame, otherwise the tick would vanish when the animation ends.',
    },
    {
      name: 'pathLength',
      value: '1',
      why: 'Normalises the dash arithmetic. A dasharray and offset of 1 mean "the whole path" whatever the rendered size, so one keyframe serves both sizes.',
    },
    {
      name: 'stroke',
      value: '2px white, round caps and joins',
      why: 'The Figma glyph. Round caps keep a 2px stroke from looking clipped inside a 14px box.',
    },
    {
      name: 'colour transition',
      value: '150ms ease on background-color, border-color, box-shadow',
      why: 'The hover border change and the focus ring arrive quickly without looking abrupt.',
    },
  ],

  pitfalls: [
    'Rendering the tick path all the time and toggling its opacity. The draw is a CSS animation that runs when the path mounts, so it would play once on page load and never again. The glyph returns `null` for an unchecked box for this reason.',
    'Expecting `isIndeterminate` to clear itself. It is presentational: React Aria keeps showing the dash until the parent stops passing it. A "select all" parent has to compute it from its children on every render (some but not all selected).',
    'Wrapping `Checkbox` in another `<label>`, or putting a link or button in `children`. `AriaCheckbox` already renders the label, so a nested interactive element toggles the box as well as doing its own job.',
    'Rendering a bare box (no `children`) without `aria-label`. The box then has no accessible name, and a screen reader announces only "checkbox".',
  ],

  notes: [
    '`CheckboxGlyph` takes a plain state object (five booleans), so any component that can supply them can draw the same box. Checkbox Card is the in-kit example.',
    'Disabled dims only the glyph. The label text keeps full colour, as the Figma states do; pass a `className` if a form needs the whole row dimmed.',
  ],

  apiSignature:
    'function Checkbox(props: Omit<AriaCheckboxProps, "children"> & { children?: ReactNode; size?: "sm" | "md"; ref?: Ref<HTMLLabelElement> }): JSX.Element\nfunction CheckboxGlyph(props: { state: CheckboxGlyphState; size?: CheckboxSize }): JSX.Element',

  props: [
    { name: 'size', type: '"sm" | "md"', default: '"md"', description: '16px box with a 14px label, or 14px box with a 13px label.' },
    { name: 'children', type: 'ReactNode', description: 'The label. Omit it for a bare box, and pass `aria-label` instead.' },
    { name: 'isSelected / defaultSelected', type: 'boolean', description: 'Controlled or uncontrolled checked state (React Aria).' },
    { name: 'onChange', type: '(isSelected: boolean) => void', description: 'Called with the new checked state.' },
    { name: 'isIndeterminate', type: 'boolean', description: 'Shows the dash instead of the tick. Presentational; the parent clears it.' },
    { name: 'isDisabled', type: 'boolean', description: 'Dims the glyph to 50% and blocks interaction.' },
    { name: 'className', type: 'string | ((state) => string)', description: 'Merged onto the label element after the defaults.' },
  ],

  reducedMotion:
    'The theme\'s `prefers-reduced-motion: reduce` rule sets `animation: none` and `stroke-dashoffset: 0` on `.animate-check-draw`, so the tick appears whole at once. The 150ms colour and border transition still runs. It changes colour only, nothing moves.',

  cleanup:
    'Nothing to release. There are no effects, listeners or timers, and the tick animation belongs to the SVG path, which unmounts with the component.',

  acceptance:
    'Clicking the label or pressing Space toggles the box. When it is checked, the white tick draws on from left to right over about 200ms on a blue gradient, and an indeterminate box shows a flat white dash instead. With reduced motion the tick appears at once. Tab focus shows a 2px ring offset from the box, and a mouse click does not.',

  criticalRegion: 'critical',
};

export default meta;
