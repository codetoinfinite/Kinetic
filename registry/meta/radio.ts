import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'radio',
  title: 'Radio',
  category: 'form',
  kit: 'boardui',
  tags: ['radio', 'radio-group', 'react-aria', 'form', 'boardui'],
  blurb:
    'React Aria radio group with a gradient selected dot that cross-fades in while the white centre scales up, in two sizes.',
  cost: 'css',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/radio.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'A `RadioGroup` and `Radio` on React Aria, plus the bare `RadioDot` glyph they draw. The dot is three stacked circles: a bordered white surface, the accent gradient surface on top of it, and a small white centre. Selecting cross-fades the two surfaces over 200ms while the centre scales up from nothing, which gives a gradient fill a smooth transition even though CSS cannot animate gradients.',

  mechanism: [
    '`RadioGroup` spreads its props onto `AriaRadioGroup` (single selection, arrow-key roving between radios, form `name` and `value`, label association) and lays the radios out as `flex flex-col gap-2`. `className` accepts a string or React Aria\'s state function.',
    '`Radio` renders `AriaRadio`, a `<label>` around a visually hidden `<input type="radio">`, as `group inline-flex items-center select-none gap-2`. Its children render function passes `isSelected` and `isFocusVisible` to `RadioDot`, then renders `children` (when not null or undefined) in the size\'s label type in `text-text-primary`. Disabled adds `cursor-not-allowed opacity-50`.',
    '`RadioDot` is a `relative rounded-full` span marked `aria-hidden`, sized by `dotStyles[size]`. Layer one is the default surface (`border-border-checkbox-default bg-background-primary-default shadow-xs`). Layer two is the selected surface: `bg-gradient-to-b from-accent-500 to-accent-600` with an inset 1px accent ring and an inset 2px white top highlight at 25% opacity. Only one of them is at full opacity at a time, and both have `transition-opacity duration-200`.',
    'Layer three is the inner dot (`bg-control-indicator-background`, white), positioned with `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` rather than flex centring, because fractional sizes such as 5px can land on half pixels under flex. It transitions `scale` and `opacity` over 200ms between `scale-0 opacity-0` and `scale-100 opacity-100`.',
    'Focus draws `ring-2 ring-border-focus-ring ring-offset-2` on the dot only while React Aria reports `isFocusVisible`, so a mouse click does not show a ring.',
    '`RadioDot` is exported on its own for menu rows that already manage selection (for example a dropdown acting as a radio group). It has no role or focus, so it can sit inside a menu item without nesting one interactive control in another.',
  ],

  constants: [
    {
      name: 'md',
      value: 'size-4 dot (16px), size-1.5 centre (6px), text-body-medium',
      why: 'The Figma radio for forms. The 6px centre leaves a 5px gradient ring around it at 16px, which reads as a ring instead of a filled disc.',
    },
    {
      name: 'sm',
      value: 'size-3.5 dot (14px), 5px centre, 0.875px border, text-body-2-medium',
      why: 'The AI chat model picker (node 4035:6925). Every stroke is scaled by 14/16 (0.875) so the small dot looks like the medium one shrunk, not thinner.',
    },
    {
      name: 'crossfade',
      value: '200ms opacity on both surfaces, 200ms scale + opacity on the centre',
      why: 'Gradient backgrounds cannot transition, so the motion is carried by opacity on stacked layers. All three layers share one duration so the fill and the centre arrive together.',
    },
    {
      name: 'selected inset shadow',
      value: 'inset 0 0 0 1px accent-500, inset 0 2px 0 0 rgba(255,255,255,0.25)',
      why: 'The first is a crisp edge where a border would shift the layout; the second is the top highlight that matches the primary button\'s gradient.',
    },
  ],

  pitfalls: [
    'Do not swap the gradient with a conditional `background-image` on one element. It snaps. The crossfade needs the two surfaces as separate layers.',
    'Do not centre the inner dot with flexbox. At 5px it can land on a half pixel and look off-centre. Keep the absolute `top-1/2 left-1/2` plus translate.',
    'Do not give the inner dot a drop shadow. A downward shadow makes it look like it sits below the centre of the ring.',
    'Do not put a `Radio` inside a menu item. Use `RadioDot`, which is presentational, and let the menu own selection and focus.',
    'Do not leave `RadioGroup` without a visible `label` or an `aria-label`. React Aria warns about a radio group with no accessible name.',
  ],

  notes: [
    '`RadioDot` defaults to `size="sm"` (it is mostly used in compact menus), while `Radio` defaults to `size="md"`.',
  ],

  apiSignature:
    'function RadioGroup(props: Omit<AriaRadioGroupProps, "children"> & { children?: ReactNode; ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction Radio(props: Omit<AriaRadioProps, "children"> & { children?: ReactNode; size?: "sm" | "md"; ref?: Ref<HTMLLabelElement> }): JSX.Element\nfunction RadioDot(props: { selected?: boolean; size?: "sm" | "md"; focusVisible?: boolean; className?: string }): JSX.Element',

  props: [
    { name: 'RadioGroup.value / defaultValue', type: 'string', description: 'Controlled or uncontrolled selected value, from React Aria.' },
    { name: 'RadioGroup.onChange', type: '(value: string) => void', description: 'Called with the newly selected radio\'s `value`.' },
    { name: 'RadioGroup.aria-label', type: 'string', description: 'Accessible name when the group has no visible label.' },
    { name: 'Radio.value', type: 'string', description: 'Value this radio contributes to the group.' },
    { name: 'Radio.size', type: '"sm" | "md"', default: '"md"', description: '16px dot with body label, or 14px dot with the 13px body-2 label.' },
    { name: 'Radio.isDisabled', type: 'boolean', description: 'Half opacity, not-allowed cursor, skipped by arrow keys.' },
    { name: 'RadioDot.selected', type: 'boolean', default: 'false', description: 'Shows the gradient surface and the white centre.' },
    { name: 'RadioDot.size', type: '"sm" | "md"', default: '"sm"', description: 'Same size table as `Radio`.' },
  ],

  reducedMotion:
    'The component does not check `prefers-reduced-motion`. The 200ms opacity crossfade and the centre scale are CSS transitions, so a global rule that removes transitions makes the dot switch instantly.',

  cleanup:
    'Nothing to clean up. The component holds no state, listeners or timers of its own; React Aria owns the group state.',

  acceptance:
    'Three radios stack vertically with Weekly selected: its dot is a blue gradient with a white centre. Clicking Monthly fades Weekly back to a white bordered circle while Monthly\'s gradient fades in and its centre grows from nothing, in about 200ms. Arrow keys move the selection within the group. Tab shows a focus ring around the dot, a mouse click does not. The small size renders a slightly smaller dot and label with the same look.',

  criticalRegion: 'critical',
};

export default meta;
