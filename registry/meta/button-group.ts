import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'button-group',
  title: 'Button Group',
  category: 'action',
  kit: 'boardui',
  tags: ['button', 'toolbar', 'segmented', 'toggle', 'boardui'],
  blurb:
    'Secondary buttons fused into one bordered strip with hairline dividers, for toolbars, range pickers and pressed toggles.',
  cost: 'css',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/button-group.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A `role="group"` container that owns the border, radius and shadow, with plain `<button>` items inside it divided by 1px hairlines. Only the container is rounded; `overflow-hidden` clips the first and last items to its corners, so the items themselves stay square and never need first/last-child logic. A `selected` item keeps the hover fill and announces itself with `aria-pressed`, which makes the same markup work as an action row, a single-select range picker or a multi-select formatting bar.',

  mechanism: [
    'The container carries every outer surface: `rounded-2lg` (10px), a 1px `border-border-button-group`, `shadow-xs` and the primary background. `divide-x divide-border-button-default` draws a left border on every item except the first, so the dividers come from the parent and adding or removing items never leaves a doubled or missing line.',
    '`overflow-hidden` on the container is what rounds the outer items. A hover or pressed fill on the first item would otherwise paint square corners over the container\'s rounded border. Clipping at the container means the items carry no radius at all.',
    'Item heights are 34px (medium) and 30px (small) because the container\'s 1px top and bottom border add 2px, so the whole strip lands on the kit\'s 36 / 32px button heights and lines up with a `Button` or input beside it.',
    'Focus uses an inset ring (`ring-inset`) plus `focus-visible:relative z-10`. An outset ring would be clipped by the container\'s `overflow-hidden`, and without the z-index lift the next item\'s divider paints over the right edge of the ring. `isolate` on the container keeps that z-index local to the group.',
    '`selected` maps to the hover fill (`bg-background-primary-hover`) and sets `aria-pressed={selected || undefined}`. Unselected items omit the attribute entirely, so a plain action row is not announced as a set of toggles.',
    'Icons are component props rendered by the item at 20px (medium) or 18px (small) with `aria-hidden`; arrow and sidebar glyphs get `rtl:rotate-180` from `directionalIconClass`. With `iconOnly` the item becomes a 34 or 30px square and drops its label, so it needs an `aria-label`.',
  ],

  constants: [
    {
      name: 'item height',
      value: '34px / 30px (medium / small)',
      why: 'The container border adds 1px above and below, so the visible strip is exactly 36 or 32px, matching Button\'s secondary sizes. Sizing items at 36px would make the group 2px taller than every control next to it.',
    },
    {
      name: 'horizontal padding',
      value: '12px / 10px',
      why: 'Same as Button\'s secondary tiers, so a labelled item and a standalone button with the same text are the same width.',
    },
    {
      name: 'transition',
      value: 'background-color, color 150ms ease',
      why: 'Only colour changes. Sweeping the pointer along a toolbar lights each item briefly without a trail, and no transform is involved, so items never shift inside the clipped strip.',
    },
  ],

  pitfalls: [
    'Giving items their own radius or border. The container already draws both, so you get a doubled outline and visible notches where the item corners do not match the 10px outer radius.',
    'Removing `overflow-hidden` from the container. The first and last items\' hover and selected fills then paint square corners over the rounded border.',
    'Switching the focus ring to an outset `ring-offset`. The container clips it, so keyboard users see no focus indicator at all on the end items.',
    'Using `selected` without updating it from state. It is purely visual plus `aria-pressed`, so clicking an item does nothing until your handler moves the selection.',
    'Shipping an `iconOnly` item without `aria-label`. The glyph is `aria-hidden`, so the item is announced as an unnamed button.',
  ],

  notes: [
    'For a single-choice switcher with an animated sliding thumb, use a segmented control instead. Button Group is for rows of equal actions where the selected state just stays lit.',
    'Pass `aria-label` on `ButtonGroup` (for example "Range" or "Text alignment") so screen readers announce what the group of buttons controls.',
  ],

  apiSignature:
    'function ButtonGroup(props: { size?: "medium" | "small"; children: ReactNode; className?: string; "aria-label"?: string; ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction ButtonGroupItem(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { size?: "medium" | "small"; selected?: boolean; iconOnly?: boolean; leadingIcon?: IconComponent; trailingIcon?: IconComponent; children?: ReactNode; ref?: Ref<HTMLButtonElement> }): JSX.Element',

  props: [
    { name: 'size', type: '"medium" | "small"', default: '"medium"', description: 'On `ButtonGroupItem`: 36 or 32px overall strip height, with 20 or 18px icons. Pass the same size to every item in a group.' },
    { name: 'selected', type: 'boolean', default: 'false', description: 'On `ButtonGroupItem`: keeps the hover fill and sets `aria-pressed`. Drive it from state for single or multi select.' },
    { name: 'iconOnly', type: 'boolean', default: 'false', description: 'On `ButtonGroupItem`: square item showing only `leadingIcon`. Needs `aria-label`.' },
    { name: 'leadingIcon', type: 'ComponentType<{ className?: string }>', description: 'Icon component drawn before the label at the tier\'s size.' },
    { name: 'trailingIcon', type: 'ComponentType<{ className?: string }>', description: 'Icon component drawn after the label. Ignored when `iconOnly`.' },
    { name: 'aria-label', type: 'string', description: 'On `ButtonGroup`: names the group for assistive tech, for example "Range".' },
    { name: 'className', type: 'string', description: 'Merged through `tailwind-merge` on either element.' },
  ],

  reducedMotion:
    'Nothing moves. The only motion is a 150ms colour transition on hover, press and selection, which is not spatial and stays as is.',

  cleanup:
    'Nothing to clean up. Both components are stateless markup with no listeners, timers or effects.',

  acceptance:
    'Day, Week and Month render as one 36px strip with hairline dividers and rounded outer corners only. Clicking Month moves the lit fill from Week to Month and screen readers report it as pressed. Hovering the first item fills it right into the rounded corner without square edges poking out. Tabbing through shows an inset focus ring that is not clipped and not overlapped by the neighbouring divider. A small group is 32px tall, and icon-only items are square.',

  criticalRegion: 'critical',
};

export default meta;
