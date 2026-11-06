import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'link-button',
  title: 'Link Button',
  category: 'action',
  kit: 'boardui',
  tags: ['button', 'link', 'text', 'inline', 'boardui'],
  blurb:
    'Container-less text action that renders an anchor with href or a button without, with an underline as its only hover cue.',
  cost: 'css',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/link-button.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'An inline text action sized on the same scale as `Button` but without a fill, border or shadow: just the label and optional icons. Passing `href` renders an `<a>`; leaving it out renders a `<button type="button">`, so the same visual works for "Learn more" copy links and for handler-driven actions like "Resend code". The props type is a discriminated union, so anchor-only and button-only attributes are checked against the element actually rendered.',

  mechanism: [
    '`LinkButtonProps` is `LinkButtonAnchorProps | LinkButtonButtonProps`, discriminated on `href` (a string versus `undefined`). At runtime the component checks `props.href !== undefined` and destructures the matching attribute set, so `ref` is typed to `HTMLAnchorElement` or `HTMLButtonElement` correctly.',
    'Hover never changes colour. `hover:underline` with `underline-offset-3` is the whole hover state; only `:active` darkens (accent 600 to 800 for primary, secondary to primary text for secondary). A link that changes colour and gains an underline at once reads as two states flickering.',
    'Disabled is handled per element. A `<button>` gets the native `disabled` attribute. An `<a>` cannot be disabled natively, so the component drops its `href` (an anchor without `href` is not focusable and not clickable) and sets `aria-disabled`. Both paths style to `text-text-tertiary` with no underline.',
    'Sizes only change type and icon size, never padding: medium and small are Body 1 Medium with 20 or 18px icons, xs is Caption 1 Semibold with 14px icons. `rounded-sm` exists only so the 2px offset focus ring has soft corners around the text.',
    'Icons are component props drawn at the tier\'s size with `aria-hidden`; arrows get `rtl:rotate-180` via `directionalIconClass`, so a trailing "→" points the reading direction in RTL.',
  ],

  constants: [
    {
      name: 'underline offset',
      value: '3px (underline-offset-3)',
      why: 'Clears descenders on the 14px body style so "g" and "y" do not collide with the line, while keeping the underline visually attached to the word.',
    },
    {
      name: 'icon sizes',
      value: '20 / 18 / 14 px (medium / small / xs)',
      why: 'Same steps as `Button`, so a link button and a button with the same label and size have matching glyphs.',
    },
    {
      name: 'transition',
      value: 'colors 150ms ease',
      why: 'Only the press colour animates. The underline toggles instantly, which is how text links behave everywhere else.',
    },
  ],

  pitfalls: [
    'Passing `disabled` and expecting an anchor to keep its `href`. The component removes it on purpose; if the link must stay discoverable, render it enabled and explain the restriction nearby.',
    'Using the button form (no `href`) for navigation. Middle-click, "open in new tab" and the hover URL preview only work on a real anchor.',
    'Adding `hover:text-…` from outside. The design relies on the underline as the only hover cue, and a colour change on top makes inline links in paragraphs look like they are flashing.',
    'Wrapping it in another `<a>` or `<button>`. It already renders an interactive element, and nested interactive content is invalid HTML.',
  ],

  notes: [
    '`linkButtonStyles` is exported so a router link component can share the exact classes, for example `<Link className={cx(linkButtonStyles.base, linkButtonStyles.variant.primary)}>`.',
  ],

  apiSignature:
    'type LinkButtonProps = LinkButtonAnchorProps | LinkButtonButtonProps\nfunction LinkButton(props: LinkButtonProps): JSX.Element\n// shared: { variant?: "primary" | "secondary"; size?: "medium" | "small" | "xs"; leadingIcon?: IconComponent; trailingIcon?: IconComponent; children?: ReactNode; className?: string; disabled?: boolean }\n// anchor: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & { href: string; ref?: Ref<HTMLAnchorElement> }\n// button: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & { href?: undefined; ref?: Ref<HTMLButtonElement> }\nconst linkButtonStyles: { base: string; size: Record<Size, string>; icon: Record<Size, string>; variant: Record<Variant, string> }',

  props: [
    { name: 'href', type: 'string', description: 'When set, renders an `<a>`. When omitted, renders a `<button type="button">`.' },
    { name: 'variant', type: '"primary" | "secondary"', default: '"primary"', description: 'Accent text (primary) or secondary text colour (secondary).' },
    { name: 'size', type: '"medium" | "small" | "xs"', default: '"medium"', description: 'Type style and icon size: 14px Body Medium with 20 or 18px icons, or 12px Caption Semibold with 14px icons.' },
    { name: 'leadingIcon', type: 'ComponentType<{ className?: string }>', description: 'Icon component drawn before the label.' },
    { name: 'trailingIcon', type: 'ComponentType<{ className?: string }>', description: 'Icon component drawn after the label, typically an arrow.' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Native `disabled` on the button form. On the anchor form, removes `href` and sets `aria-disabled`.' },
    { name: 'className', type: 'string', description: 'Merged through `tailwind-merge`.' },
  ],

  reducedMotion:
    'Nothing moves. The only transition is a 150ms colour change on press.',

  cleanup:
    'Nothing to clean up. The component is stateless markup with no listeners, timers or effects.',

  acceptance:
    'Primary links render in the accent colour and secondary ones in secondary text, with no box around them. Hovering underlines the label without changing its colour, and pressing darkens it. The trailing arrow sits 4px after the label and, in RTL, points left. The disabled link is grey, shows no underline on hover, cannot be clicked and is skipped by Tab. Tabbing to an enabled one shows a ring with slightly rounded corners around the text.',

  criticalRegion: 'critical',
};

export default meta;
