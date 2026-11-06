/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Accent Swatch Picker" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'accent-swatch-picker',
  title: 'Accent Swatch Picker',
  category: 'form',
  kit: 'boardui',
  tags: ['color', 'accent', 'theme', 'radio', 'swatches', 'boardui'],
  blurb:
    'Glossy colour spheres in one keyboard radio group; the pick becomes one --accent property that re-tints kit controls in its scope.',
  cost: 'css',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/accent-swatch-picker.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'The colour row under a composer preview: round, glossy swatches with an iridescent first option, chosen like radio buttons. `AccentScope` is the other half: it writes the chosen colour to one custom property, `--accent`, derives the kit\'s whole accent ramp from it with color-mix, and re-declares the tokens that read that ramp, so primary buttons, switches, focus rings and the swatch outline inside it all change colour together. The demo wires it to the kit Composer Loader, whose light band follows the swatch.',

  mechanism: [
    'Render a react-aria `RadioGroup` (`orientation="horizontal"`) whose `Radio`s are the swatches: one Tab stop, arrow keys move and select, `aria-label` names each colour. Each radio sets `--swatch` to its colour in inline style.',
    'Paint the sphere as a stacked background: a white radial highlight at 32% 26% fading out by 42%, over a radial body that runs from the colour mixed 70% with white, to the colour at 52%, to the colour mixed 72% with black at the rim. A swatch with `fill` (the iridescent one) swaps the body for its own conic gradient. An inset shadow made from the colour darkens the bottom edge.',
    'Show state on the sphere itself: a 2px outline at 2px offset is transparent until `data-selected`, then takes `var(--swatch)`; focus-visible switches it to `text-primary` so keyboard focus is never the same colour as the selection; hover scales to 1.05 and press to 0.95 over 150ms.',
    '`AccentScope` puts `--accent: <colour>` on a div and, through arbitrary-property classes, sets `--color-accent-50…400` as color-mix toward white (8, 16, 32, 52, 78%), `500` to the accent, and `600…950` toward black (86, 70, 56, 42, 28%).',
    'Because the kit\'s semantic tokens (`--gradient-button-primary-*`, `--color-border-focus-ring`, `--color-switch-on-chip-*`, `--color-button-ghost-*`, `--color-badge-new-*`) are resolved at :root, the scope re-declares each one with the same formula as the theme, with `dark:` variants where dark mode maps the ramp differently.',
  ],

  constants: [
    {
      name: 'sphere sizes',
      value: 'sm 24px · md 36px · lg 36px, 48px from 640px',
      why: 'The compact pill matches the floating 24px row; lg drops to 36px on phones so seven spheres still fit one line at 360px.',
    },
    {
      name: 'ramp mixes',
      value: '50→400: 8/16/32/52/78% accent in white; 600→950: 86/70/56/42/28% accent in black',
      why: 'Roughly tracks Tailwind\'s blue ramp lightness, so swapping the hue keeps the kit\'s contrast (ghost text on ghost fill, white on the button gradient).',
    },
    {
      name: 'selection outline',
      value: '2px at 2px offset (1px offset at sm)',
      why: 'A gap between sphere and ring reads as "selected" on any colour, including the iridescent one, without a check mark.',
    },
  ],

  pitfalls: [
    'Overriding only `--color-accent-500` on a wrapper. Tokens like the primary-button gradient were already resolved from the root ramp, so nothing inside changes until they are re-declared in the scope.',
    'Using the focus-ring token for the swatch focus state inside a scope: it now equals the selected colour, so focus becomes invisible. Use a neutral (text-primary) outline for focus.',
    'Making each swatch its own button with aria-pressed. A single choice is a radio group; that gives roving focus and arrow keys for free.',
  ],

  notes: [
    'Swatch colours default to kit palette variables (`var(--color-violet-500)`…), so they follow the theme file; any CSS colour works.',
    'Composer Loader takes hex stops for its SVG band, so the demo keeps a four-stop band per swatch next to the picker.',
    'Two pickers can share one state, as the demo\'s big row and compact pill do.',
  ],

  apiSignature:
    'function AccentSwatchPicker(props: { swatches?: AccentSwatch[]; value?: string; defaultValue?: string; onChange?: (id: string) => void; size?: "sm" | "md" | "lg"; variant?: "plain" | "pill"; label?: string; isDisabled?: boolean; className?: string }): JSX.Element\nfunction AccentScope(props: { color: string; children?: ReactNode; className?: string }): JSX.Element\ntype AccentSwatch = { id: string; label: string; color: string; fill?: string }',

  props: [
    { name: 'swatches', type: 'AccentSwatch[]', default: 'DEFAULT_ACCENT_SWATCHES', description: 'Iridescent, blue, violet, pink, red, green, orange: id, label, CSS colour and optional sphere fill.' },
    { name: 'value', type: 'string', description: 'Controlled selected swatch id.' },
    { name: 'defaultValue', type: 'string', default: 'swatches[0].id', description: 'Initial id when uncontrolled.' },
    { name: 'onChange', type: '(id: string) => void', description: 'Called with the newly selected id.' },
    { name: 'size', type: '"sm" | "md" | "lg"', default: '"md"', description: 'Sphere size: 24px, 36px, or 36px rising to 48px from the sm breakpoint.' },
    { name: 'variant', type: '"plain" | "pill"', default: '"plain"', description: '`pill` places the row on a floating rounded surface with a border and shadow.' },
    { name: 'label', type: 'string', default: '"Accent colour"', description: 'Accessible name of the radio group.' },
    { name: 'isDisabled', type: 'boolean', description: 'Disables every swatch.' },
    { name: 'className', type: 'string', description: 'Merged onto the group.' },
    { name: 'AccentScope.color', type: 'string', description: 'Any CSS colour; written to `--accent` and expanded into the accent ramp for the subtree.' },
  ],

  reducedMotion:
    'The only motion is the 150ms hover/press scale and outline colour change on each sphere; it carries `motion-reduce:transition-none`, so selection snaps. The re-tint itself is instant.',

  cleanup:
    'Nothing to clean up: no timers, listeners or observers; state is the selected id.',

  acceptance:
    'The iridescent sphere starts selected with an outline. Clicking "Violet" outlines it, turns the send button gradient and the "Agent working" switch violet, and the caption reads "Violet · --accent: var(--color-violet-500)"; the compact pill shows the same selection. With focus on the group, ArrowRight selects the next sphere. Toggling the switch off fades the composer light and swaps the Stop button for Send.',

  criticalRegion: 'critical',
};

export default meta;
