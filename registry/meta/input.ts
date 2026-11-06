import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'input',
  title: 'Input',
  category: 'form',
  kit: 'boardui',
  tags: ['input', 'text-field', 'label', 'hint', 'validation', 'react-aria', 'form', 'boardui'],
  blurb:
    'React Aria text field on a filled shell with an inset ring for hover and focus, label with required mark, hint or error line, and icons.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/input.tsx',
      type: 'registry:ui',
      role: 'component (Input, TextField, InputBase, inputFieldClassName)',
    },
    {
      path: 'registry/ui/label.tsx',
      type: 'registry:ui',
      role: 'field label with required asterisk and info icon',
    },
    {
      path: 'registry/ui/hint-text.tsx',
      type: 'registry:ui',
      role: 'hint or error caption below the field',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'The kit\'s text field in three layers: `TextField` (React Aria field plus a size context), `InputBase` (the filled shell with icons or addons around the `<input>`) and `Input`, which composes a label, the shell and a hint or error line. The shell has no border; hover and focus draw a 2px inset ring and an invalid field tints red, all over 150ms. React Aria wires the label, description and error message to the input.',

  mechanism: [
    '`TextField` renders `AriaTextField` as `group flex h-max w-full flex-col items-start gap-1` with `data-input-size`, and provides `TextFieldContext` with `size`, `fieldClassName` and `inputClassName`, so an `InputBase` (or the kit Textarea) further down picks them up without prop drilling. Children may be a render function that receives `isRequired`, `isInvalid`, `isDisabled` and `isReadOnly`.',
    '`InputBase` renders `AriaGroup`, whose className function calls `inputFieldClassName(state, size, hasAddon)`. The base shell is `rounded-2lg bg-background-tertiary-default` with `ring-2 ring-inset ring-transparent` and a `transition-[background-color,box-shadow,color]` over `var(--input-transition-ms)` (150ms in the theme). Hover, when not focused, disabled or invalid, sets `ring-border-button-hover`; focus within sets `ring-border-button-active`; disabled sets `bg-input-disabled-background`; invalid sets `bg-background-tertiary-error text-foreground-icon-error`.',
    'Inside the shell, a leading `leadingAddon` (if given) or `leadingIcon` (a component rendered at `size-5`, `aria-hidden`) sits before `AriaInput`, then `trailingAddon` or `trailingIcon`. Icons have no colour of their own, so they inherit the shell\'s text colour and turn red with it when invalid.',
    'The `<input>` is transparent and borderless in `text-body-regular text-text-primary`. Its placeholder is `text-text-tertiary`, darkens to `text-text-primary` on focus and turns `text-text-error-placeholder` when `aria-invalid`. `useLocale` decides `pl-1 text-left` or, in RTL, `pr-1 text-right`.',
    '`Input` composes the three: it renders `Label` (when `label` is given) with the field\'s `isRequired`, then `InputBase`, then React Aria\'s `FieldError` styled by `hintTextClassName(true)` when the field is invalid and `errorMessage` is set, otherwise `HintText` with `hint`. With no `label` and no `aria-label`, a string `placeholder` becomes the `aria-label`. For `type` email, url or tel it sets `dir="ltr"` on the input unless `inputDir` says otherwise.',
    '`Label` wraps React Aria `Label` in `text-body-medium text-text-primary` with a 2px gap, adds an `aria-hidden` red `*` when `isRequired`, and a 16px `RiInformationFill` when `tooltip` is set. `HintText` wraps React Aria `Text` with `slot="description"` (or `slot="errorMessage"` when `isInvalid`) in `pt-px text-caption-1-medium`, `text-text-secondary` or `text-text-error-primary`.',
  ],

  constants: [
    {
      name: '--input-transition-ms',
      value: '150ms',
      why: 'One theme variable for every field shell (Input, Textarea and others read it), so ring and fill changes run at the same speed across a form.',
    },
    {
      name: 'ring',
      value: 'ring-2 ring-inset, transparent at rest',
      why: 'An inset box shadow instead of a border, so the hover and focus outlines appear without the field growing or the text shifting by a pixel.',
    },
    {
      name: 'sizes',
      value: 'medium p-2 (36px with a 20px line) · small h-8 px-1.5 py-2 (32px)',
      why: 'Figma node 3665:1849. With a `leadingAddon` the start padding drops to 4px so an addon such as a country picker sits close to the edge.',
    },
    {
      name: 'icon',
      value: 'size-5 (20px)',
      why: 'The same height as the 20px body line, so icons and text centre on one axis inside the 36px shell.',
    },
  ],

  pitfalls: [
    'Do not add a `border` to show focus. The shell uses an inset ring that takes no layout space; a border would shift the content by a pixel on focus.',
    'Do not pass an element to `leadingIcon` (`<RiMailLine />`). It expects the component (`RiMailLine`) and renders it with the shell\'s classes.',
    'Do not set `isInvalid` without an `errorMessage` or `hint` if users need to know why. Only the shell tints red; the error text comes from those props.',
    'Do not leave a field with no `label`, no `aria-label` and no string `placeholder`. Then nothing names it and React Aria warns.',
  ],

  notes: [
    '`inputFieldClassName` is exported for fields whose editable part is not an `<input>` (date and time segments), so they share the exact shell states.',
    '`Label`\'s `isInvalid` prop is accepted but unused; it is reserved for invalid styling later.',
  ],

  apiSignature:
    'function Input(props: Omit<TextFieldProps, "children"> & { label?: ReactNode; hint?: ReactNode; errorMessage?: FieldErrorProps["children"]; tooltip?: boolean | string; placeholder?: string; inputDir?: "ltr" | "rtl" | "auto"; leadingIcon?: IconComponent; trailingIcon?: IconComponent; leadingAddon?: ReactNode; fieldClassName?: string; ref?: Ref<HTMLInputElement>; groupRef?: Ref<HTMLDivElement> }): JSX.Element\nfunction TextField(props: AriaTextFieldProps & { size?: "medium" | "small"; fieldClassName?: string; inputClassName?: string }): JSX.Element\nfunction InputBase(props: Omit<AriaInputProps, "size" | "className"> & { size?: "medium" | "small"; className?: string; leadingIcon?: IconComponent; trailingIcon?: IconComponent; leadingAddon?: ReactNode; trailingAddon?: ReactNode; fieldClassName?: string; ref?: Ref<HTMLInputElement>; groupRef?: Ref<HTMLDivElement> }): JSX.Element',

  props: [
    { name: 'label', type: 'ReactNode', description: 'Visible label above the field, wired to the input by React Aria.' },
    { name: 'hint', type: 'ReactNode', description: 'Caption below the field, wired as the description.' },
    { name: 'errorMessage', type: 'ReactNode | (validation) => ReactNode', description: 'Replaces the hint while the field is invalid.' },
    { name: 'value / defaultValue / onChange', type: 'string / (value: string) => void', description: 'Controlled or uncontrolled value, from React Aria.' },
    { name: 'isRequired', type: 'boolean', description: 'Adds the red asterisk to the label and `aria-required`.' },
    { name: 'isInvalid', type: 'boolean', description: 'Red-tinted shell, red placeholder and the error line.' },
    { name: 'isDisabled', type: 'boolean', description: 'Grey shell and text, not-allowed cursor.' },
    { name: 'size', type: '"medium" | "small"', default: '"medium"', description: '36px or 32px shell.' },
    { name: 'leadingIcon / trailingIcon', type: 'ComponentType', description: '20px icon components on either side of the text.' },
    { name: 'tooltip', type: 'boolean | string', description: 'Shows an info glyph after the label.' },
  ],

  reducedMotion:
    'The component does not check `prefers-reduced-motion`. The only motion is the 150ms colour and ring transition on the shell, which a global rule that removes transitions turns into an instant change.',

  cleanup:
    'Nothing to clean up. The components hold no state, listeners or timers of their own; React Aria owns the field state.',

  acceptance:
    'A labelled field shows a grey filled shell with no visible border. Hovering draws a light inset ring; clicking in darkens the ring and the placeholder, with no shift in layout. A required field shows a red asterisk after its label. Typing an invalid email in a field marked invalid tints the shell and its icon red and swaps the hint for the error message. A disabled field is lighter and ignores input. Screen readers announce the label, the hint and, when invalid, the error.',

  criticalRegion: 'critical',
};

export default meta;
