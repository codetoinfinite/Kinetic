import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'switch',
  title: 'Switch',
  category: 'form',
  kit: 'boardui',
  tags: ['switch', 'toggle', 'react-aria', 'form', 'boardui'],
  blurb:
    'React Aria toggle with a gradient track, a white thumb that slides 200ms, and an embossed chip that turns blue when on; 3 sizes, 2 shapes.',
  cost: 'css',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/switch.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'A skeuomorphic on/off switch built on React Aria `Switch`. Off, the track is a flat neutral surface; on, it fills with the accent gradient plus an inset ring and top highlight. The white thumb slides across over 200ms and carries a tiny embossed chip in its centre that turns from white to blue. The visual lives in an exported `SwitchTrack`, so Switch Card renders exactly the same control.',

  mechanism: [
    '`Switch` renders `AriaSwitch`, a `<label>` around a visually hidden `<input type="checkbox" role="switch">`, as `group inline-flex items-center gap-2 select-none`. Its children render function passes the state to `<SwitchTrack state={state} size={size} shape={shape} />` and renders `children` (when not null or false) as a `text-body-medium text-text-primary` label. The cursor is `not-allowed` when disabled.',
    'Every dimension comes from the `switchSizes` table, keyed by `sm`, `md` and `lg`: track size, track and thumb radius per shape, the on-state shadow, thumb size, the thumb\'s resting `offset`, its `travel`, and the chip size, border and shadow. `shape` only chooses between the `pill` and `rectangle` radii in each tier.',
    'The track is a `relative` `aria-hidden` span with `transition-colors duration-200`. Off: `bg-background-tertiary-default`. On: `bg-linear-to-b from-accent-500 to-accent-600` plus the tier\'s `onShadow`, an inset white top highlight at 25% and an inset accent-500 hairline ring. At `lg` that shadow is exactly the shared `shadow-checkbox-selected` token; `md` and `sm` scale the highlight to 1.5px and 1px and the ring to 0.75px and 0.5px.',
    'The thumb is absolutely positioned at the tier\'s `offset` (for example `start-[3px] top-[3px]` at md) with a near-white vertical gradient (`from-control-indicator-background from-[43.837%] to-control-indicator-background-subtle`) and a soft contact shadow. When selected it gets the tier\'s `travel` class (`translate-x-[18px] rtl:-translate-x-[18px]` at md) and `transition-transform duration-200` slides it. Positioning uses the logical `start-*` and the travel flips sign under `rtl:`, so the switch mirrors in RTL.',
    'Inside the thumb, the chip is a bottom-to-top gradient (`bg-linear-to-t`) rather than a flipped element, so it stays pixel-snapped and its own drop shadow points down. Off it uses `switch-off-chip-start/end` with a half-opacity button border; on it uses `switch-on-chip-start/end` with an `accent-600` border.',
    'Disabled dims only the track (`opacity-50`). Keyboard focus draws `ring-2 ring-border-focus-ring ring-offset-2` on the track while `isFocusVisible` is true.',
  ],

  constants: [
    {
      name: 'track sizes',
      value: 'sm 28×16 · md 42×24 · lg 56×32 px',
      why: '1:1 with the Figma "Toogles" frame (node 3856:3807). Thumb = track height minus twice the padding: 12, 18 and 24px.',
    },
    {
      name: 'travel',
      value: 'sm 12px · md 18px · lg 24px',
      why: 'Track width minus thumb minus both paddings (28 − 12 − 4, 42 − 18 − 6, 56 − 24 − 8). Any other value leaves the thumb short of, or overlapping, the far edge.',
    },
    {
      name: 'duration',
      value: '200ms on the track colour and the thumb transform',
      why: 'Both run on one clock so the fill and the thumb arrive together. Short enough that a quick double toggle never shows the thumb lagging behind the track colour.',
    },
    {
      name: 'thumb gradient stop',
      value: 'from-[43.837%]',
      why: 'Copied from the Figma gradient: the top 44% of the thumb is solid white before it falls off to neutral-100, which is what makes it read as a rounded physical knob.',
    },
  ],

  pitfalls: [
    'Do not animate the thumb with `left`. It is placed once with `start-*` and moved with `translate-x`, which stays on the compositor and mirrors with `rtl:-translate-x-*`.',
    'Do not flip the chip with `rotate-180` or `-scale-y-100` to reverse its gradient. A transform at sub-pixel sizes blurs it and points its shadow upward. Use the reversed gradient direction.',
    'Do not mix travel values across tiers. Each size\'s `travel` equals its own track width minus thumb and padding, so changing a track width means recomputing it.',
    'Do not ship a switch with no label and no `aria-label`. React Aria warns, and screen readers would announce only "switch".',
  ],

  notes: [
    '`SwitchTrack` and `switchSizes` are exported, so another control (Switch Card, a menu row) can render the identical visual with its own input.',
  ],

  apiSignature:
    'function Switch(props: Omit<AriaSwitchProps, "children"> & { children?: ReactNode; size?: "sm" | "md" | "lg"; shape?: "pill" | "rectangle"; ref?: Ref<HTMLLabelElement> }): JSX.Element\nfunction SwitchTrack(props: { state: { isSelected: boolean; isDisabled: boolean; isFocusVisible: boolean }; size?: "sm" | "md" | "lg"; shape?: "pill" | "rectangle" }): JSX.Element',

  props: [
    { name: 'isSelected / defaultSelected', type: 'boolean', description: 'Controlled or uncontrolled on state, from React Aria.' },
    { name: 'onChange', type: '(isSelected: boolean) => void', description: 'Called when the switch is toggled.' },
    { name: 'size', type: '"sm" | "md" | "lg"', default: '"md"', description: '28×16, 42×24 or 56×32 track.' },
    { name: 'shape', type: '"pill" | "rectangle"', default: '"pill"', description: 'Fully rounded, or a squarer track and thumb with small radii.' },
    { name: 'children', type: 'ReactNode', description: 'Optional label after the track in body medium. Without it, pass `aria-label`.' },
    { name: 'isDisabled', type: 'boolean', description: 'Dims the track to 50% and ignores input.' },
  ],

  reducedMotion:
    'The component does not check `prefers-reduced-motion`. The thumb slide and the track colour change are 200ms CSS transitions, so a global rule that removes transitions makes the thumb jump straight to the other end.',

  cleanup:
    'Nothing to clean up. The component holds no state, listeners or timers of its own; React Aria owns the toggle state.',

  acceptance:
    'An off switch shows a flat grey track with the white thumb at the start. Clicking it, or pressing Space when focused, slides the thumb to the end in about 200ms while the track fills with the blue gradient and the chip in the thumb turns blue. Clicking again reverses both. All three sizes and both shapes keep the thumb inset by the same proportion at both ends. In RTL the thumb starts on the right and slides left. Tab shows a focus ring around the track.',

  criticalRegion: 'critical',
};

export default meta;
