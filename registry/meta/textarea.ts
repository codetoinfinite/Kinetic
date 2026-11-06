import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'textarea',
  title: 'Textarea',
  category: 'form',
  kit: 'boardui',
  tags: ['textarea', 'multiline', 'auto-resize', 'character-count', 'react-aria', 'form', 'boardui'],
  blurb:
    'Multiline sibling of Input on the same filled shell: grows a line at a time up to maxRows, or keeps a resize handle; optional counter.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/textarea.tsx',
      type: 'registry:ui',
      role: 'component (Textarea, TextareaBase)',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'A React Aria text area that reuses Input\'s `TextField`, `Label` and `HintText`, so it lines up with an Input in the same form and shares its hover, focus, disabled and invalid states. With `autoResize` it measures its content on every input and grows from `rows` lines up to `maxRows`, then scrolls. Without it, the field rests at `rows` lines with a vertical resize handle. `showCount` adds a counter under the field, as `12/280` when `maxLength` is set.',

  mechanism: [
    '`Textarea` renders Input\'s `TextField` (so `TextFieldContext` carries `size` and class overrides), then `Label` when `label` is set, then `TextareaBase`, then a footer row (`flex justify-between gap-3`) with `HintText` and the counter when `hint` or `showCount` is present. Like Input, an unlabelled field falls back to its string `placeholder` for `aria-label`.',
    '`TextareaBase` renders `AriaGroup` with the same class logic as Input\'s shell: `rounded-2lg bg-background-tertiary-default`, a transparent `ring-2 ring-inset`, `ring-border-button-hover` on hover, `ring-border-button-active` on focus within, the disabled and the red invalid fills, all transitioning over `var(--input-transition-ms)`. Inside, `AriaTextArea` has `p-0 px-1` and `text-body-regular`, so the 8px shell plus 4px gives the same 12px text inset as Input.',
    'Sizing lives in `fit()`. Without `autoResize` it clears any inline `height`, `maxHeight` and `overflowY`. With it, it reads the computed `line-height` (20px fallback), sets `height` to `0px`, reads `scrollHeight`, then sets `height` to `min(max(scrollHeight, rows × line), maxRows × line)`, sets `maxHeight` to the ceiling and `overflowY` to `auto` only when the content exceeds it. Collapsing to 0 first is what lets the field shrink as text is deleted.',
    '`fit` runs from the textarea\'s `onInput` (for keystrokes in an uncontrolled field, which do not re-render) and from a `useLayoutEffect` with no dependency list, which catches every other change: a controlled parent, a form reset, autofill. Both run before paint, so the height never lags a frame.',
    'The counter needs the value, which React Aria\'s render props do not provide. A controlled field reads `value.length`; an uncontrolled one keeps `typedLength` in state, updated in `onChange` only when `showCount` is on. It renders as `ms-auto text-caption-1-medium text-text-tertiary tabular-nums`, red when invalid. `maxLength` is passed to the `<textarea>`, so the browser enforces it.',
    '`resize` maps to `resize-y` (default `vertical`) or `resize-none`, and is forced to `none` while `autoResize` is on, so the handle never fights the measured height.',
  ],

  constants: [
    {
      name: 'rows',
      value: '3 (default)',
      why: 'The resting height, and also the floor when `autoResize` is on, so an empty composer never collapses to one line.',
    },
    {
      name: 'FALLBACK_LINE_HEIGHT',
      value: '20',
      why: 'The 14/20 line box of `text-body-regular`, used only when the computed `line-height` cannot be parsed (for example before styles resolve).',
    },
    {
      name: 'text inset',
      value: 'shell p-2 (8px) + textarea px-1 (4px) = 12px; small px-1.5 gives 10px',
      why: 'Exactly Input\'s inset, so a stacked Input and Textarea share one text edge.',
    },
    {
      name: '--input-transition-ms',
      value: '150ms',
      why: 'The shell\'s ring and fill transitions read the same theme variable as Input.',
    },
  ],

  pitfalls: [
    'Do not add vertical padding to the `<textarea>` itself. `fit()` compares `scrollHeight`, which includes padding, against `rows` and `maxRows` times the line height, so padding throws both limits off. Pad the shell instead.',
    'Do not give the auto-resize `useLayoutEffect` a dependency list. It runs after every render on purpose, so it catches value changes that do not come from typing in this field: a controlled parent, a form reset, autofill.',
    'Do not expect a resize handle with `autoResize`. It is forced to `resize-none` so a manual drag cannot fight the measured height.',
  ],

  notes: [
    'The textarea imports `TextField`, `TextFieldContext`, `Label` and `HintText` from the Input item, so install Input alongside it.',
    'Textarea has no `errorMessage` prop; while `isInvalid` is set, the `hint` itself turns red and becomes the error message slot.',
  ],

  apiSignature:
    'function Textarea(props: Omit<TextFieldProps, "children"> & { label?: ReactNode; hint?: ReactNode; tooltip?: boolean | string; placeholder?: string; maxLength?: number; showCount?: boolean; rows?: number; autoResize?: boolean; maxRows?: number; resize?: "none" | "vertical"; fieldClassName?: string; ref?: Ref<HTMLTextAreaElement>; groupRef?: Ref<HTMLDivElement> }): JSX.Element',

  props: [
    { name: 'label', type: 'ReactNode', description: 'Visible label above the field.' },
    { name: 'hint', type: 'ReactNode', description: 'Caption under the field; red while invalid.' },
    { name: 'value / defaultValue / onChange', type: 'string / (value: string) => void', description: 'Controlled or uncontrolled value, from React Aria.' },
    { name: 'rows', type: 'number', default: '3', description: 'Resting height in lines; the floor with `autoResize`.' },
    { name: 'autoResize', type: 'boolean', default: 'false', description: 'Grow with the content instead of scrolling at `rows`.' },
    { name: 'maxRows', type: 'number', description: 'Ceiling for `autoResize`; past it the field scrolls.' },
    { name: 'resize', type: '"none" | "vertical"', default: '"vertical"', description: 'Native resize handle. Ignored while `autoResize` is on.' },
    { name: 'maxLength', type: 'number', description: 'Hard limit enforced by the browser; also the counter\'s denominator.' },
    { name: 'showCount', type: 'boolean', default: 'false', description: 'Shows `count` or `count/maxLength` under the field.' },
    { name: 'isRequired / isInvalid / isDisabled', type: 'boolean', description: 'Same states as Input: asterisk, red shell, grey shell.' },
  ],

  reducedMotion:
    'The component does not check `prefers-reduced-motion`. The height change is instant, not animated; the only transition is the 150ms ring and fill on the shell, which a global rule that removes transitions makes instant.',

  cleanup:
    'Nothing to clean up. The layout effect only writes inline styles on the textarea and registers no listeners or timers.',

  acceptance:
    'An auto-resizing field with `rows={2}` and `maxRows={5}` starts two lines tall. Typing past the end of a line grows it by one line at a time with no visible lag; at five lines it stops growing and scrolls. Deleting text shrinks it back to two lines. The counter under it reads `37/280` and updates on every keystroke. A field without `autoResize` stays at its rows and shows a vertical resize handle. Hover and focus draw the same inset ring as Input.',

  criticalRegion: 'critical',
};

export default meta;
