import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'search-field',
  title: 'Search Field',
  category: 'form',
  kit: 'boardui',
  tags: ['search', 'filter', 'input', 'clear-button', 'loading', 'react-aria', 'form', 'boardui'],
  blurb:
    'Pill or rounded search input on React Aria SearchField: Escape clears, a clear button scales in with text, and the icon fades to a spinner.',
  cost: 'css',
  motif: 'orbit',

  files: [
    {
      path: 'registry/ui/search-field.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A query field for filtering a list or searching a table. It puts Input\'s field shell inside React Aria\'s `SearchField`, rounds it into a pill by default, and adds a search icon at the start and a small clear button at the end that scales and fades in once there is text. `isLoading` cross-fades the icon into Spinner\'s orbiting light in the same 20px box. Escape clears the text and Enter calls `onSubmit`.',

  mechanism: [
    '`SearchField` renders `AriaSearchField` as `group flex w-full flex-col items-start gap-1` and always passes it a `value`: the controlled `value` when given, otherwise its own `uncontrolledValue` state. Its `change` function updates that state and calls `onChange`, so the clear button can work in both modes. With no `label` or `aria-label`, the `placeholder` becomes the `aria-label`.',
    'The render function shows `Label` when `label` is set, then Input\'s `InputBase` with `fieldClassName` set to `rounded-full` for `shape="pill"` (the default; `rounded` keeps Input\'s 10px corners), then `HintText` when `hint` is set. The input hides the browser\'s own WebKit cancel button so only the kit\'s clear button shows.',
    'The `leadingAddon` is one `aria-hidden` 20px box holding two absolutely positioned layers: the `icon` (default `RiSearchLine`) and `SpinnerGlyph size="sm"`. Both transition `opacity` and `scale` over 200ms. When `isLoading` the icon goes to `scale-75 opacity-0` and the spinner comes in; otherwise the spinner is faded out and its spin is paused with `[animation-play-state:paused]` on its children, so it stays mounted for the fade but does no work.',
    'The `trailingAddon` is a `CloseButton size="2xs"` (16px) on `bg-background-tertiary-hover`. While the field is empty or disabled it is `pointer-events-none scale-50 opacity-0` and `aria-hidden`; once there is text it transitions to `scale-100 opacity-100` over 150ms. It has `tabIndex={-1}`, because Escape already clears from the keyboard.',
    'Clicking the clear button runs `clear`: `change("")`, `onClear`, then focus back to the input. Its `onMouseDown` calls `preventDefault`, so the input never loses focus while the pointer is down. React Aria\'s own Escape handling clears through the same `change` and `onClear`.',
    'The clear button\'s accessible name goes through `useTemplateCopy`, which returns the string unchanged unless a template copy provider is present, so the default "Clear search" can be localised.',
  ],

  constants: [
    {
      name: 'icon box',
      value: 'size-5 (20px), ms-1',
      why: 'The icon and the spinner share one box and cross-fade in place, so the text never moves when loading starts. A leading addon drops the shell\'s start padding to 4px (`ps-1`), so the 4px margin brings the icon back to the 8px inset of a plain field.',
    },
    {
      name: 'icon / spinner fade',
      value: '200ms opacity + scale, hidden at scale-75',
      why: 'A short shrink while fading reads as one glyph turning into the other rather than two overlapping.',
    },
    {
      name: 'clear button',
      value: 'CloseButton 2xs (16px), 150ms opacity + scale from scale-50',
      why: 'Small enough to sit inside the 36px shell. Scaling in from half size makes it appear as the first character is typed without a jump in the layout, since it always occupies its slot.',
    },
    {
      name: 'shape',
      value: 'pill (rounded-full) by default, rounded (Input\'s rounded-2lg) as the option',
      why: 'The pill marks the field as search at a glance; `rounded` keeps Input\'s corners so it lines up with other fields in a form.',
    },
  ],

  pitfalls: [
    'Do not unmount the spinner when not loading. It stays mounted at `opacity-0` with its animation paused so it can fade in and out; unmounting would make it pop.',
    'Do not put the clear button in the tab order. Escape already clears from the keyboard, and a tabbable 16px button would add an extra stop on every search.',
    'Do not remove the `onMouseDown` `preventDefault` on the clear button. Without it, pressing the button blurs the input first, which closes any results popover tied to focus.',
    'Do not leave the field with no `label`, `aria-label` or string `placeholder`. Nothing would name it.',
  ],

  notes: [
    'The field imports `InputBase` from Input, `Label` and `HintText` from Input\'s companions, `CloseButton` from Close Button and `SpinnerGlyph` from Spinner, so install those items alongside it.',
    'The clear button always occupies its slot, even when hidden, so the text area width does not change when text is typed.',
  ],

  apiSignature:
    'function SearchField(props: Omit<AriaSearchFieldProps, "className" | "children"> & { label?: ReactNode; hint?: ReactNode; placeholder?: string; size?: "medium" | "small"; shape?: "pill" | "rounded"; isLoading?: boolean; icon?: IconComponent; clearLabel?: string; className?: string; fieldClassName?: string }): JSX.Element',

  props: [
    { name: 'value / defaultValue / onChange', type: 'string / (value: string) => void', description: 'Controlled or uncontrolled query.' },
    { name: 'onSubmit', type: '(value: string) => void', description: 'Called on Enter, from React Aria.' },
    { name: 'onClear', type: '() => void', description: 'Called when Escape or the clear button empties the field.' },
    { name: 'shape', type: '"pill" | "rounded"', default: '"pill"', description: 'Fully rounded, or Input\'s 10px corners.' },
    { name: 'size', type: '"medium" | "small"', default: '"medium"', description: '36px or 32px shell.' },
    { name: 'isLoading', type: 'boolean', default: 'false', description: 'Cross-fades the icon into a spinner.' },
    { name: 'icon', type: 'ComponentType', default: 'RiSearchLine', description: 'Replaces the search icon.' },
    { name: 'clearLabel', type: 'string', default: '"Clear search"', description: 'Accessible name of the clear button.' },
    { name: 'label / hint', type: 'ReactNode', description: 'Label above and caption below, as on Input.' },
  ],

  reducedMotion:
    'The fades are CSS transitions and the component does not check `prefers-reduced-motion` itself. Spinner\'s glyph does: under `motion-reduce` its spin slows from 900ms to 2400ms per turn.',

  cleanup:
    'Nothing to clean up. The component keeps one piece of state and a ref; the spinner\'s CSS animation is paused while hidden.',

  acceptance:
    'An empty pill field shows a search icon and no clear button. Typing a letter scales the clear button in at the end; clicking it empties the field and keeps the caret in it. Escape also clears it. While `isLoading` is true the search icon shrinks away and a spinning light takes its place, then swaps back when loading ends. With `shape="rounded"` the corners match Input. Tab never lands on the clear button.',

  criticalRegion: 'critical',
};

export default meta;
