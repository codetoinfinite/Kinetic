import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'checkbox-card',
  title: 'Checkbox Card',
  category: 'form',
  kit: 'boardui',
  tags: ['checkbox', 'card', 'selectable', 'react-aria', 'form', 'boardui'],
  blurb:
    'Bordered option card with title and description on the left and the kit checkbox on the right; a click anywhere on it toggles.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/checkbox-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'A larger hit target for an on/off choice: a 10px-radius bordered card with a medium-weight title and an optional secondary description, and the same checkbox glyph the plain Checkbox uses, pinned to the trailing edge. The card is the React Aria `Checkbox` label, so clicking the text, the padding or the box all toggle it, and the tick draws itself on exactly as it does in the small control.',

  mechanism: [
    '`CheckboxCard` renders `AriaCheckbox` directly. React Aria makes that a `<label>` wrapping a visually hidden native `<input type="checkbox">`, so the whole card is the click target, Space toggles it when focused, and it takes part in forms and `CheckboxGroup`s like any checkbox. Every Aria prop (`isSelected`, `defaultSelected`, `onChange`, `isDisabled`, `isIndeterminate`, `name`, `value`) passes through.',
    'The card class comes from the render-state function: `flex w-full items-center justify-between gap-3 rounded-2lg border border-border-button-default py-3 pe-5 ps-4 select-none`, with `transition-colors duration-150`. When hovered and not disabled the background is `bg-background-primary-hover`, otherwise `bg-background-primary-default`. Disabled adds `cursor-not-allowed opacity-50`.',
    'The children render function receives the same state object and lays out a text column (`flex min-w-0 flex-col gap-0.5`) with the title in `text-body-medium text-text-primary` and, when `description` is not null or undefined, a second line in `text-body-regular text-text-secondary`. Both lines `truncate`, so long copy never pushes the box off the card.',
    'On the trailing side, `<CheckboxGlyph state={state} />` (wrapped in `shrink-0 py-1`) draws the 16px box: accent gradient and a white tick that draws on over 200ms when selected, a dash when indeterminate, and a focus ring only while `isFocusVisible`. Sharing the glyph is what keeps the card and the plain Checkbox identical.',
    'Physical padding is logical (`ps-4 pe-5`), so in RTL the box moves to the left edge and the extra 4px of padding stays on the box side.',
  ],

  constants: [
    {
      name: 'padding',
      value: 'ps-4 pe-5 py-3 (16 / 20 / 12px)',
      why: 'Taken from the Figma checkbox item (node 3793:2966). The trailing side is 4px wider so the 16px box sits optically centred in its corner rather than tight against the border.',
    },
    {
      name: 'radius',
      value: 'rounded-2lg (10px)',
      why: 'The kit\'s card-level control radius, the same as the gray pill tab and other selectable surfaces, so a stack of option cards matches the inputs around it.',
    },
    {
      name: 'hover transition',
      value: '150ms transition-colors',
      why: 'Only the background changes on hover. 150ms is the kit-wide timing for surface colour changes.',
    },
  ],

  pitfalls: [
    'Do not put a link or a button inside `title` or `description`. The card is a `<label>`, so any click inside it toggles the checkbox, and an interactive child would both fire and toggle.',
    'Do not wrap the card in your own `<label>` or attach an extra `onClick`. React Aria already makes the whole card the label of the hidden input.',
    'Do not remove `truncate` from the text spans. Without it a long description wraps unpredictably and pushes the checkbox glyph down off the centre line.',
    'Do not signal selection with the card border. In this kit the card keeps its neutral border and only the checkbox shows the state.',
  ],

  notes: [
    'Put several cards in a React Aria `CheckboxGroup` with `value` props to get a multi-select option list with one shared value array.',
  ],

  apiSignature:
    'function CheckboxCard(props: Omit<AriaCheckboxProps, "children"> & { title: ReactNode; description?: ReactNode; ref?: Ref<HTMLLabelElement> }): JSX.Element',

  props: [
    { name: 'title', type: 'ReactNode', description: 'Main label in body medium. Also the accessible name of the checkbox.' },
    { name: 'description', type: 'ReactNode', description: 'Optional secondary line in body regular, truncated to one line.' },
    { name: 'isSelected / defaultSelected', type: 'boolean', description: 'Controlled or uncontrolled checked state, from React Aria.' },
    { name: 'onChange', type: '(isSelected: boolean) => void', description: 'Called when the card is toggled.' },
    { name: 'isIndeterminate', type: 'boolean', description: 'Shows the dash instead of the tick.' },
    { name: 'isDisabled', type: 'boolean', description: 'Dims the card to 50%, sets a not-allowed cursor and ignores input.' },
  ],

  reducedMotion:
    'The card itself only fades its background over 150ms. The tick draw animation comes from the shared checkbox glyph, which plays the theme\'s `animate-check-draw`. The component does not check `prefers-reduced-motion` itself, so remove that animation globally if the tick should appear instantly.',

  cleanup:
    'Nothing to clean up. The card holds no state, listeners or timers of its own; React Aria owns the checkbox state.',

  acceptance:
    'Three stacked cards show a title, a description and a box on the right. Clicking anywhere on a card, including its text, checks it and the white tick draws on. Clicking again clears it. Hovering a card tints its background. Tab focuses each card in turn with a focus ring on the box, and Space toggles it. A disabled card is at half opacity and ignores clicks.',

  criticalRegion: 'critical',
};

export default meta;
