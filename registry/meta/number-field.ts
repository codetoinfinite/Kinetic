import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'number-field',
  title: 'Number Field',
  category: 'form',
  kit: 'boardui',
  tags: ['number', 'stepper', 'currency', 'percent', 'react-aria', 'form', 'boardui'],
  blurb:
    'Input\'s field shell plus minus and plus steppers on React Aria NumberField: locale currency, percent and unit formats, clamped to limits.',
  cost: 'css',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/number-field.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A number typed or stepped, such as seats, a price or a percentage. It puts Input\'s field shell (`InputBase`, with the same hover, focus, invalid and disabled states) inside React Aria\'s `NumberField` and adds minus and plus buttons at the trailing end. React Aria formats and parses the value for the locale, clamps it to `minValue` and `maxValue` on blur, disables a stepper at its limit, and handles arrow keys, Home and End, the scroll wheel and press-and-hold repeat.',

  mechanism: [
    '`NumberField` renders `AriaNumberField` as `group flex w-full flex-col items-start gap-1`. All React Aria number props (`value`, `defaultValue`, `onChange`, `minValue`, `maxValue`, `step`, `formatOptions`, `isWheelDisabled`, `isDisabled`, `isInvalid`) pass straight through. Without a `label` or `aria-label`, the `placeholder` becomes the `aria-label`.',
    'Its render function shows `Label` (with the asterisk when `isRequired`) when `label` is set, then `InputBase` from the Input item, then `HintText` (red when invalid) when `hint` is set. Because `InputBase` renders React Aria\'s `Group` and `Input`, they pick up `NumberField`\'s context: the group gets the field\'s state for the ring and fill classes, and the input gets the formatted value, `inputMode` and key handling. The input adds `tabular-nums` so digits do not shift width while stepping.',
    'The steppers go in `InputBase`\'s `trailingAddon`: a `-my-1 -me-1 flex gap-0.5` span with two React Aria `Button`s, `slot="decrement"` (`RiSubtractLine`) and `slot="increment"` (`RiAddLine`). The slots connect them to the field, so React Aria disables each at its limit, repeats the step while it is held, and keeps focus in the input on press.',
    'Each stepper is `rounded-md` in `text-foreground-icon-secondary`, `size-6` (or `size-5` at `small`) with a 16px icon. Hover and press set `bg-background-tertiary-hover` with a 150ms colour transition; keyboard focus draws `ring-2 ring-border-focus-ring`; disabled switches to the disabled text colour and a `not-allowed` cursor with no hover fill.',
    '`hideSteppers` drops the buttons entirely; Up, Down, Page Up, Page Down, Home and End still step the value from the keyboard.',
  ],

  constants: [
    {
      name: 'stepper size',
      value: 'size-6 (24px) at medium, size-5 (20px) at small; icon size-4 (16px)',
      why: 'Fits inside the 36px or 32px shell without changing its height, and leaves the 16px icon a 4px hover margin on every side.',
    },
    {
      name: 'stepper inset',
      value: '-my-1 -me-1',
      why: 'Pulls the button pair 4px into the shell\'s padding, so their hover fill sits closer to the edge while the text keeps Input\'s inset.',
    },
    {
      name: 'stepper gap',
      value: 'gap-0.5 (2px)',
      why: 'Keeps minus and plus as separate hover targets without reading as two distant controls.',
    },
    {
      name: 'hover transition',
      value: 'transition-colors duration-150 ease-out',
      why: 'The same 150ms as the field shell (`--input-transition-ms`), so a stepper and the ring around it change together.',
    },
  ],

  pitfalls: [
    'Do not render steppers as plain `<button>`s with your own `onClick`. Only React Aria `Button`s with `slot="increment"` and `slot="decrement"` get the limit disabling, hold-to-repeat and focus handling from the field.',
    'Do not format the value yourself and pass a string. Pass a number and `formatOptions` (for example `{ style: "currency", currency: "USD" }`); React Aria formats it for display and parses typed text back.',
    'Do not forget that `onChange` can give `NaN` when the field is cleared. Guard any total you compute from it.',
    'Do not use `step` for a percent field in whole numbers. With `style: "percent"`, 10% is the value 0.1, so a 5% step is `step={0.05}`.',
  ],

  notes: [
    'The field imports `InputBase` from Input, and `Label` and `HintText` from Input\'s companion files, so install Input alongside it.',
  ],

  apiSignature:
    'function NumberField(props: Omit<AriaNumberFieldProps, "className" | "children"> & { label?: ReactNode; hint?: ReactNode; tooltip?: boolean | string; placeholder?: string; size?: "medium" | "small"; leadingIcon?: IconComponent; hideSteppers?: boolean; className?: string; fieldClassName?: string }): JSX.Element',

  props: [
    { name: 'value / defaultValue', type: 'number', description: 'Controlled or uncontrolled numeric value.' },
    { name: 'onChange', type: '(value: number) => void', description: 'Called with the parsed number, after clamping; `NaN` when cleared.' },
    { name: 'minValue / maxValue', type: 'number', description: 'Limits. The value is clamped on blur and the matching stepper disables at each limit.' },
    { name: 'step', type: 'number', default: '1', description: 'Amount per stepper press or arrow key.' },
    { name: 'formatOptions', type: 'Intl.NumberFormatOptions', description: 'Currency, percent, unit or decimal formatting for the locale.' },
    { name: 'label / hint', type: 'ReactNode', description: 'Label above and caption below, as on Input.' },
    { name: 'size', type: '"medium" | "small"', default: '"medium"', description: '36px or 32px shell; 24px or 20px steppers.' },
    { name: 'hideSteppers', type: 'boolean', default: 'false', description: 'Removes the minus and plus buttons.' },
    { name: 'leadingIcon', type: 'ComponentType', description: '20px icon before the value.' },
  ],

  reducedMotion:
    'The component does not check `prefers-reduced-motion`. Its only motion is the 150ms colour transition on the steppers and the shell, which a global rule that removes transitions makes instant.',

  cleanup:
    'Nothing to clean up. The component holds no state of its own; React Aria owns the value and the press-and-hold timer.',

  acceptance:
    'A "Seats" field shows 5 with minus and plus at its end. Pressing plus shows 6; holding it keeps stepping. At the maximum the plus button greys out and stops responding. Typing 80 into a field with a maximum of 50 and tabbing away snaps it to 50. A currency field shows "$12.00" and a percent field "10%"; Up and Down step them. Hover on a stepper fills it softly; focus on the field draws Input\'s inset ring.',

  criticalRegion: 'critical',
};

export default meta;
