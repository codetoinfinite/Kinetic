import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'icon-button',
  title: 'Icon Button',
  category: 'action',
  kit: 'boardui',
  tags: ['button', 'icon', 'toolbar', 'action', 'boardui'],
  blurb:
    'Square bordered icon-only button in 36 and 32px with a fixed 10px radius, plus an anchor twin for navigational actions.',
  cost: 'css',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/icon-button.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A square `<button>` that draws one icon component at a fixed size inside a secondary-button surface: white fill, 1px border and `shadow-xs`. `aria-label` is a required prop in the type, so a nameless icon button does not compile. `IconLinkButton` renders the same box as an `<a>` for actions that navigate, such as opening a profile or an external dashboard.',

  mechanism: [
    'The icon is a component prop (`icon={RiSearchLine}`), not an element. The button renders it with `aria-hidden` at 20px (medium) or 16px (small), so the glyph size always matches the box and the button\'s accessible name comes only from `aria-label`.',
    'The box is `size-9` (36px) or `size-8` (32px) with `rounded-2lg` at both sizes. Unlike `Button`, whose small tier drops to an 8px radius, the icon button keeps 10px so a row of mixed sizes still reads as one family.',
    'Hover, press and disabled reuse the secondary Button tokens: the fill steps through `background-primary-hover` and `-active`, and the border steps through `border-button-hover` and `-active`. Only `background-color`, `border-color`, `box-shadow` and `color` transition (150ms), so nothing animates layout.',
    'Disabled drops the shadow, fades to 60% opacity and swaps the icon colour to `icon-button-disabled-foreground`. `directionalIconClass` adds `rtl:rotate-180` to arrow and sidebar glyphs, so a "Next" arrow points the reading direction in right-to-left layouts.',
    '`type` defaults to `"button"` so an icon button inside a form (a clear or add-row control) never submits it. `IconLinkButton` shares the exact style object and takes anchor attributes instead.',
  ],

  constants: [
    {
      name: 'box sizes',
      value: '36 × 36 / 32 × 32 px',
      why: 'Match the kit\'s medium and small Button heights, so an icon button sits flush beside a labelled button or a 36px input.',
    },
    {
      name: 'icon sizes',
      value: '20px / 16px',
      why: 'Leaves 8px of padding on each side at both sizes (36 − 20 = 16, 32 − 16 = 16), which is the spacing in the Figma table-row and notification buttons.',
    },
    {
      name: 'radius',
      value: '10px (rounded-2lg) at both sizes',
      why: 'A 32px square with an 8px radius looks visibly rounder than its 36px neighbour. Holding the radius constant keeps toolbars of mixed sizes consistent.',
    },
    {
      name: 'transition',
      value: '150ms ease on colour, border and shadow',
      why: 'Fast enough that sweeping across a row of table actions does not leave half-lit buttons behind.',
    },
  ],

  pitfalls: [
    'Passing an element (`icon={<RiAddLine />}`). The prop takes the component so the button can size it. Anything else fails the type check or renders at Remix Icon\'s default 24px and overflows the 36px box.',
    'Reusing one `aria-label` for different actions in a row, such as three "Action" buttons. Each label should name its own action ("Edit row", "Delete row"), because screen-reader users hear only the label.',
    'Using `IconButton` with an `onClick` that navigates. Use `IconLinkButton` with `href` so middle-click, open-in-new-tab and the status-bar URL preview all work.',
    'Overriding the radius per size from outside. The 10px radius at both sizes is intentional, so a `className="rounded-lg"` on small buttons breaks the visual rhythm of a mixed toolbar.',
  ],

  notes: [
    'This is the bordered secondary surface only. For a borderless icon inside a toolbar or a primary-filled square, use `Button` with `iconOnly` and the matching variant.',
  ],

  apiSignature:
    'function IconButton(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { icon: IconComponent; size?: "medium" | "small"; "aria-label": string; ref?: Ref<HTMLButtonElement> }): JSX.Element\nfunction IconLinkButton(props: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> & { icon: IconComponent; size?: "medium" | "small"; "aria-label": string; ref?: Ref<HTMLAnchorElement> }): JSX.Element',

  props: [
    { name: 'icon', type: 'ComponentType<{ className?: string }>', description: 'Required. Icon component rendered at 20px (medium) or 16px (small) with `aria-hidden`.' },
    { name: 'aria-label', type: 'string', description: 'Required. The only accessible name, since there is no visible label.' },
    { name: 'size', type: '"medium" | "small"', default: '"medium"', description: '36px or 32px square. The radius stays 10px at both.' },
    { name: 'type', type: '"button" | "submit" | "reset"', default: '"button"', description: 'On `IconButton` only. Defaults to `button` so it never submits a surrounding form.' },
    { name: 'href', type: 'string', description: 'On `IconLinkButton`: the destination. All other anchor attributes pass through.' },
    { name: 'className', type: 'string', description: 'Merged through `tailwind-merge`.' },
  ],

  reducedMotion:
    'Nothing moves. Hover and press change only colours, border and shadow over 150ms, and the button never scales or shifts.',

  cleanup:
    'Nothing to clean up. Both components are stateless markup with no listeners, timers or effects.',

  acceptance:
    'Add, Search and Delete render as three 36px squares with 20px icons centred and identical 10px corners. The small row is 32px with 16px icons and the same corner radius. Hovering lightens the fill and darkens the border without any movement. Tabbing shows a 2px offset focus ring. The disabled button is faded, has no shadow and shows a not-allowed cursor. A screen reader announces each button by its label, never as just "button".',

  criticalRegion: 'critical',
};

export default meta;
