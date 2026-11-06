import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'input-otp',
  title: 'Input OTP',
  category: 'form',
  kit: 'boardui',
  tags: ['otp', 'one-time-code', 'verification', 'input', 'form', 'boardui'],
  blurb:
    'One-time-code field: a monospace box per digit that advances on type, steps back on Backspace, spreads a paste and accepts OS autofill.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/input-otp.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A verification-code field that looks like six boxes but holds one digit string. Every box is a real `<input>` with `autoComplete="one-time-code"`, and all edits go through one `writeFrom` function, so typing, pasting and OS autofill all write digits from the current box onward and move focus to the next empty one. It has no dependency beyond React and works controlled or uncontrolled.',

  mechanism: [
    'The value is a single string of digits. `code` is the controlled `value` (or internal state seeded from `defaultValue`) with every non-digit removed (`/\\D/g`) and cut to `length`. Box `i` shows `code[i]`, or an empty string.',
    '`writeFrom(index, digits)` strips non-digits, pads `code` to `length` with spaces, overwrites positions from `index` onward, and passes the result to `commit`, then calls `focusBox(index + digits.length)`. `focusBox` clamps the index to the last box, focuses it and selects its content, so the next keystroke replaces rather than appends.',
    '`commit` strips non-digits again, sets internal state when uncontrolled, calls `onChange`, and calls `onComplete` whenever the result has `length` digits. Each box\'s `onChange` calls `writeFrom(index, event.target.value)`. `maxLength` is `length`, not 1, so when iOS or Chrome autofill drops the whole code into one box, all of it is distributed instead of five digits being lost.',
    '`onKeyDown` handles Backspace itself (`preventDefault`): on a filled box it clears that position and keeps focus; on an empty box it clears the previous position and moves focus back. ArrowLeft and ArrowRight move focus without editing. `onPaste` prevents the default and sends the clipboard text to `writeFrom` from the box with the caret. `onFocus` selects the box content.',
    'The wrapper is `role="group"` with the `aria-label` (default "One-time code") and `dir="ltr"`, so digits run left to right even in an RTL page. Each input has `aria-label="Digit i of n"`, `type="text"` with `inputMode="numeric"`, and `aria-invalid` when `isInvalid`. `groupEvery` adds `ms-3` before every nth box to split the code, for example into 3 + 3.',
    'Each box is `size-12 rounded-2lg` with `font-mono text-title-3-medium tabular-nums`, a 1px `border-border-button-default` and `shadow-xs`. Hover darkens the border; `focus-visible` draws the focus border and a 2px ring; `isInvalid` sets a red border and tint; `isDisabled` greys it out. These changes transition over 150ms.',
  ],

  constants: [
    {
      name: 'length',
      value: '6 (default)',
      why: 'The common length for email and SMS codes, and the default the `aria-label`s count against ("Digit 1 of 6").',
    },
    {
      name: 'maxLength',
      value: 'length (not 1)',
      why: 'OS autofill writes the whole code into the focused box. With `maxLength={1}` the browser would keep only the first digit.',
    },
    {
      name: 'box',
      value: 'size-12 (48px), rounded-2lg, font-mono text-title-3-medium tabular-nums',
      why: 'Monospace digits keep a row of fixed boxes optically even; in a proportional face a 1 is visibly narrower than an 8.',
    },
    {
      name: 'group gap',
      value: 'gap-2 between boxes, extra ms-3 at each groupEvery boundary',
      why: 'An 8px gap keeps the boxes separate; the extra 12px reads as a break, so 000 000 is easier to copy from a phone.',
    },
  ],

  pitfalls: [
    'Do not use `type="number"` for the boxes. It adds spinners, accepts `e` and `-`, and reports an empty value for input it considers malformed. Use `type="text"` with `inputMode="numeric"`.',
    'Do not set `maxLength={1}`. Autofill hands the full code to one box and the browser would drop the rest.',
    'Do not put `aria-invalid` on the `role="group"` wrapper. The group role does not support it; each input carries its own.',
    'Do not remove `dir="ltr"` from the wrapper. In an RTL page the code would otherwise read right to left.',
  ],

  notes: [
    'The value is stored as a compact digit string, so clearing a box in the middle of a full code shifts the digits after it one place left.',
    'Arrow keys are not mirrored; the wrapper is always left to right.',
  ],

  apiSignature:
    'function InputOtp(props: { length?: number; value?: string; defaultValue?: string; onChange?: (value: string) => void; onComplete?: (value: string) => void; isDisabled?: boolean; isInvalid?: boolean; groupEvery?: number; "aria-label"?: string; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element',

  props: [
    { name: 'length', type: 'number', default: '6', description: 'Number of digit boxes.' },
    { name: 'value / defaultValue', type: 'string', description: 'Controlled or uncontrolled digits. Non-digits are dropped and the string is cut to `length`.' },
    { name: 'onChange', type: '(value: string) => void', description: 'Called with the new digit string on every edit.' },
    { name: 'onComplete', type: '(value: string) => void', description: 'Called after any edit that leaves every box filled, so editing a digit of a full code calls it again.' },
    { name: 'groupEvery', type: 'number', description: 'Adds a wider gap before every nth box, for example 3.' },
    { name: 'isInvalid', type: 'boolean', default: 'false', description: 'Red border and tint, `aria-invalid` on every box.' },
    { name: 'isDisabled', type: 'boolean', default: 'false', description: 'Disables every box.' },
    { name: 'aria-label', type: 'string', default: '"One-time code"', description: 'Name of the group.' },
  ],

  reducedMotion:
    'The component does not check `prefers-reduced-motion`. Its only motion is the 150ms border, background and shadow transition on each box, which a global rule that removes transitions makes instant.',

  cleanup:
    'Nothing to clean up. The component keeps a ref array of inputs and at most one piece of state; it sets no timers or listeners outside React\'s own handlers.',

  acceptance:
    'Six empty boxes sit in a row. Typing 7 fills the first box and moves focus to the second. Pasting "731428" into the first box fills all six and calls `onComplete`. Backspace on a filled box clears it and keeps focus; Backspace on an empty box clears the previous one and moves back. Arrow keys move between boxes without changing anything. Letters are ignored. With `groupEvery={3}` a wider gap separates 3 + 3. `isInvalid` turns every box red.',

  criticalRegion: 'critical',
};

export default meta;
