import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'radio-card',
  title: 'Radio Card',
  category: 'form',
  kit: 'boardui',
  tags: ['radio', 'card', 'selectable', 'react-aria', 'form', 'boardui'],
  blurb:
    'Bordered option card with title, description and the kit radio dot on the right; inside a RadioGroup a click anywhere selects it.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/radio-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'The radio counterpart of Checkbox Card: a 10px-radius bordered card with a title, an optional description and the 16px `RadioDot` on the trailing edge. It is a React Aria `Radio`, so it must sit in a `RadioGroup`, which gives single selection and arrow-key movement between cards. Selecting a card cross-fades its dot to the accent gradient while the white centre grows in.',

  mechanism: [
    '`RadioCard` renders `AriaRadio` directly. React Aria makes it a `<label>` around a visually hidden `<input type="radio">`, so the whole card is the click target and the card reads its selection, focus and disabled state from the surrounding `RadioGroup` context. All Aria radio props (`value`, `isDisabled`, `autoFocus`) pass through.',
    'The card class is computed from the render state: `flex w-full items-center justify-between gap-3 rounded-2lg border border-border-button-default py-3 pe-5 ps-4 select-none` with `transition-colors duration-150`. Hovered and not disabled gives `bg-background-primary-hover`, otherwise `bg-background-primary-default`. Disabled adds `cursor-not-allowed opacity-50`.',
    'The text column (`flex min-w-0 flex-col gap-0.5`) holds the title in `text-body-medium text-text-primary` and, when `description` is not null or undefined, a line in `text-body-regular text-text-secondary`. Both truncate to one line.',
    'The trailing slot (`shrink-0 py-1`) renders `<RadioDot size="md" selected={state.isSelected} focusVisible={state.isFocusVisible} />`, the same glyph `Radio` uses: a bordered white disc and an accent gradient disc cross-fading over 200ms, with a 6px white centre that scales from 0 to 1. The focus ring appears on the dot for keyboard focus only.',
    'Because the cards are radios in one group, Tab enters the group once (on the selected card) and the arrow keys move both focus and selection between cards, which is the standard radio pattern.',
  ],

  constants: [
    {
      name: 'padding',
      value: 'ps-4 pe-5 py-3 (16 / 20 / 12px)',
      why: 'The Figma checkbox item spec (node 3793:2966), reused so radio and checkbox cards are interchangeable in one settings page. The wider trailing padding gives the dot breathing room in its corner.',
    },
    {
      name: 'dot size',
      value: 'RadioDot size="md" (16px, 6px centre)',
      why: 'Fixed to medium so the dot matches the 16px checkbox box in Checkbox Card. It is not a prop.',
    },
    {
      name: 'radius',
      value: 'rounded-2lg (10px)',
      why: 'The kit\'s radius for card-level controls, shared with Checkbox Card and Switch Card.',
    },
  ],

  pitfalls: [
    'Do not render a `RadioCard` outside a `RadioGroup`. React Aria\'s `Radio` reads its state from the group context and fails without it.',
    'Do not put links or buttons inside `title` or `description`. The card is a `<label>`, so clicks inside it select the radio.',
    'Do not highlight the selected card by changing its border. The kit keeps the border neutral and lets the dot carry the state, which keeps the card the same in both themes.',
    'Do not forget the group\'s accessible name (`aria-label` or `aria-labelledby`). React Aria warns about an unnamed radio group.',
  ],

  notes: [
    'Use the kit\'s `RadioGroup` from the Radio item (it is a plain `flex-col gap-2` wrapper around React Aria\'s group) to stack the cards.',
  ],

  apiSignature:
    'function RadioCard(props: Omit<AriaRadioProps, "children"> & { title: ReactNode; description?: ReactNode; ref?: Ref<HTMLLabelElement> }): JSX.Element',

  props: [
    { name: 'value', type: 'string', description: 'Value this card contributes to the surrounding `RadioGroup`.' },
    { name: 'title', type: 'ReactNode', description: 'Main label in body medium. Also the accessible name of the radio.' },
    { name: 'description', type: 'ReactNode', description: 'Optional secondary line, truncated to one line.' },
    { name: 'isDisabled', type: 'boolean', description: 'Half opacity, not-allowed cursor, skipped by arrow keys.' },
  ],

  reducedMotion:
    'The card fades its background over 150ms and the dot cross-fades over 200ms, all as CSS transitions. The component does not check `prefers-reduced-motion`, so a global rule that removes transitions makes the states switch instantly.',

  cleanup:
    'Nothing to clean up. The card holds no state, listeners or timers; the `RadioGroup` owns the value.',

  acceptance:
    'Three plan cards in a `RadioGroup` show one selected dot. Clicking anywhere on another card, including its description, moves the selection there: the old dot fades back to white and the new one fills with the gradient while its white centre grows in. With a card focused, the arrow keys move the selection between cards. Hover tints a card\'s background. A disabled card is at half opacity and cannot be selected.',

  criticalRegion: 'critical',
};

export default meta;
