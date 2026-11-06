import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'switch-card',
  title: 'Switch Card',
  category: 'form',
  kit: 'boardui',
  tags: ['switch', 'toggle', 'card', 'settings', 'react-aria', 'form', 'boardui'],
  blurb:
    'Bordered settings row with an optional icon, title and description; a click anywhere on the card flips the kit switch on its trailing edge.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/switch-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'The switch counterpart of Checkbox Card: a 12px-radius bordered row with an optional 24px icon, a title, an optional description and the kit `SwitchTrack` on the trailing edge. The whole card is the React Aria `Switch` label, so a click anywhere toggles it and the thumb slides across in 200ms. Size and shape pass straight through to the track.',

  mechanism: [
    '`SwitchCard` renders `AriaSwitch` directly. React Aria makes it a `<label>` around a visually hidden `<input type="checkbox" role="switch">`, so the entire card is the hit area and Space toggles it when focused. All Aria switch props (`isSelected`, `defaultSelected`, `onChange`, `isDisabled`, `name`) pass through.',
    'The card class is computed from the render state: `group flex w-full items-center justify-between gap-3 rounded-xl border border-border-button-default py-3 pe-5 ps-4 select-none` with `transition-colors duration-150`. Hovered and not disabled gives `bg-background-primary-hover`, otherwise `bg-background-primary-default`. Disabled adds `cursor-not-allowed opacity-50`. A `className` function is called with the same state and merged last.',
    'The leading block is `flex min-w-0 items-center gap-3`: the optional `icon` component rendered at `size-6` in `text-foreground-icon-secondary` with `aria-hidden`, then a `flex-col gap-0.5` column with the title in `text-body-medium text-text-primary` and, when `description` is not null or undefined, a line in `text-body-regular text-text-secondary`. Both lines truncate.',
    'The trailing slot (`flex shrink-0 items-center`) renders `<SwitchTrack state={state} size={size} shape={shape} />` from the Switch item with the card\'s own render state, so selection, disabled dimming and the keyboard focus ring all show on the track exactly as on a plain `Switch`.',
  ],

  constants: [
    {
      name: 'padding',
      value: 'ps-4 pe-5 py-3 (16 / 20 / 12px)',
      why: 'The same chrome as Checkbox Card, so the two can share a settings page. The extra 4px on the trailing side gives the 42px track room from the border.',
    },
    {
      name: 'radius',
      value: 'rounded-xl (12px)',
      why: 'The one deliberate difference from Checkbox Card, which uses rounded-2lg (10px); the source header calls it out as "mirrors CheckboxCard, but with rounded-xl (12px) corners".',
    },
    {
      name: 'hover fade',
      value: 'transition-colors duration-150',
      why: 'Same hover fade as Checkbox Card and Radio Card, so every selectable card in the kit tints at one speed. The track itself keeps its own 200ms transition.',
    },
    {
      name: 'icon',
      value: 'size-6 (24px), text-foreground-icon-secondary',
      why: 'Matches the 24×24 Remix Icon grid. The component takes the icon component itself (`RiMailLine`), not an element, so it controls size and colour.',
    },
  ],

  pitfalls: [
    'Do not pass an element to `icon` (`<RiMailLine />`). It expects the component (`RiMailLine`) and renders it itself.',
    'Do not put links or buttons in `title` or `description`. The card is a `<label>`, so clicks inside it toggle the switch.',
    'Do not add a separate `Switch` inside the card. The trailing track is already the visual for this card\'s own input; a second one would nest two controls.',
    'Do not give the card a fixed height. The description truncates to one line, but the title and description stack, so a fixed height clips the second line.',
  ],

  notes: [
    'The track comes from `registry/ui/switch.tsx` (`SwitchTrack`), so install the Switch item alongside this one.',
  ],

  apiSignature:
    'function SwitchCard(props: Omit<AriaSwitchProps, "children"> & { title: ReactNode; description?: ReactNode; icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>; size?: "sm" | "md" | "lg"; shape?: "pill" | "rectangle"; ref?: Ref<HTMLLabelElement> }): JSX.Element',

  props: [
    { name: 'title', type: 'ReactNode', description: 'Main label in body medium. Also the accessible name of the switch.' },
    { name: 'description', type: 'ReactNode', description: 'Optional secondary line, truncated to one line.' },
    { name: 'icon', type: 'ComponentType', description: 'Optional leading 24px icon component, rendered `aria-hidden`.' },
    { name: 'isSelected / defaultSelected', type: 'boolean', description: 'Controlled or uncontrolled on state, from React Aria.' },
    { name: 'onChange', type: '(isSelected: boolean) => void', description: 'Called when the card is toggled.' },
    { name: 'size', type: '"sm" | "md" | "lg"', default: '"md"', description: 'Track size, passed to `SwitchTrack`.' },
    { name: 'shape', type: '"pill" | "rectangle"', default: '"pill"', description: 'Track shape, passed to `SwitchTrack`.' },
    { name: 'isDisabled', type: 'boolean', description: 'Half opacity, not-allowed cursor, ignores input.' },
  ],

  reducedMotion:
    'The component does not check `prefers-reduced-motion`. The 150ms card tint and the 200ms track and thumb are CSS transitions, so a global rule that removes transitions makes them switch instantly.',

  cleanup:
    'Nothing to clean up. The card holds no state, listeners or timers of its own; React Aria owns the toggle state.',

  acceptance:
    'A stack of setting cards each shows an icon, a title, a one-line description and a switch on the right. Clicking anywhere on a card, including its description, slides its thumb across and fills the track blue in about 200ms; clicking again reverses it. Hover tints the card. Tab focuses the card and shows the ring on the track; Space toggles it. A disabled card is at half opacity and ignores clicks.',

  criticalRegion: 'critical',
};

export default meta;
