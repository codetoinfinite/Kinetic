import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'button',
  title: 'Button',
  category: 'action',
  kit: 'boardui',
  tags: ['button', 'action', 'variants', 'icon', 'boardui'],
  blurb:
    'Primary, secondary, ghost and danger buttons in three sizes, with gradient fills that fade on hover and a soft press.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/button.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A native `<button>` (and an `<a>` twin, `ButtonLink`) whose look is four style maps indexed by `variant` and `size`. The component draws its own icons from a component reference, so the consumer cannot pass the wrong icon size. The gradient fills of the primary and danger variants live in two `@utility` classes in the theme sheet, which fade a hover gradient in on a `::before` layer because CSS cannot interpolate `background-image`.',

  mechanism: [
    'Every class comes from one `sortCx` object: `base` (layout, focus ring, press motion), `size` (height, padding, radius and type style per tier), `iconOnlySize` (the square override), `icon` (glyph size per tier), `label` (inner padding) and `variant`. `cx` is a `tailwind-merge` instance extended with the kit\'s custom type scale, so a consumer `className` such as `h-10` replaces the size tier\'s `h-9` rather than both landing in the class list.',
    'Icons are props that take a component (`leadingIcon={RiAddLine}`), not an element. The button renders it with the tier\'s size class — 20px at medium, 18px at small, 14px at xs — plus `aria-hidden`. Navigation glyphs (left/right arrows, sidebar fold) are listed in `directionalIconClass` and get `rtl:rotate-180`, so a "Next" arrow points the reading direction in Arabic or Hebrew without the caller knowing.',
    'Primary and danger paint with `bg-button-primary` and `bg-button-danger`. Each sets the default gradient as `background-image`, then a `::before` with `inset: 0`, `z-index: -1` and `border-radius: inherit` holds the hover gradient at opacity 0. Hover fades that layer to 1 over `--button-transition-ms`. `isolation: isolate` on the button is what keeps the negative-z layer above the button\'s own background and below its label.',
    'The press is `button-press-motion`: colours transition in 150ms while `transform` takes 420ms back to rest. `:active` scales to 0.98 and drops the transform duration to 220ms, so the button goes down fast and comes back slowly. Hover never touches `transform`, so hover colour changes never inherit the long press timing.',
    'Disabled works for both `disabled` and `aria-disabled="true"`. The second matters when a disabled button must stay focusable so a tooltip can explain why. Every variant styles both selectors and the press motion turns itself off for both.',
    '`type` defaults to `"button"`. A bare `<button>` inside a `<form>` is a submit button, so a Cancel or "Add row" button would otherwise submit the form it sits in.',
  ],

  constants: [
    {
      name: 'heights',
      value: '36 / 32 / 24 px (medium / small / xs)',
      why: 'Taken 1:1 from the Figma variant matrix. Medium matches the kit\'s inputs (also 36px), so a button next to a field lines up with no wrapper. Xs exists for dense surfaces such as calendar event cards and is the only tier that switches to the 12px caption type style.',
    },
    {
      name: 'small icon-only size',
      value: 'size-8 p-0',
      why: 'An 18px icon plus 8px padding on each side gives 34px, but Figma pins the small square at 32. Removing the padding and forcing the size keeps an icon button the same height as a small labelled button beside it. Medium needs no override because 8 + 20 + 8 is already 36.',
    },
    {
      name: '--button-transition-ms',
      value: '150ms',
      why: 'Shared by the hover-gradient fade and the colour transitions, so the fill and the label change together. Much shorter and the gradient fade looks like a snap; much longer and fast pointer sweeps across a toolbar leave a trail of half-lit buttons.',
    },
    {
      name: 'press',
      value: 'scale(0.98), 220ms down / 420ms back',
      why: 'Two percent is enough to feel without visibly moving the label off its baseline. The asymmetric duration is the point: press feedback has to be immediate, and the return can be soft because nothing is waiting on it.',
    },
  ],

  pitfalls: [
    'Swapping the gradient in `:hover` with another `background-image`. It snaps, because `background-image` does not interpolate. The fade only works because the hover gradient sits on its own layer and only its `opacity` changes.',
    'Removing `isolation: isolate` from the gradient utilities. The `::before` sits at `z-index: -1`, and without a new stacking context it slips behind the button\'s parent background, so the hover state disappears on any card with a fill.',
    'Passing an icon element (`leadingIcon={<RiAddLine />}`). The prop takes the component, so the button can size it. An element bypasses the size class and the glyph renders at Remix Icon\'s default 24px, which breaks the 36px height.',
    'Shipping an icon-only button without `aria-label`. The glyph is `aria-hidden` and there is no text, so screen readers announce just "button".',
    'Relying on the browser default `type`. Inside a form it is `submit`. The component defaults to `"button"`, so pass `type="submit"` explicitly on the button that should submit.',
    'Putting `transition-all` on a consumer `className`. It overrides the split timing of `button-press-motion` and gives hover colour changes the slow 420ms press-return curve.',
  ],

  notes: [
    'The style maps are exported as `buttonStyles`, so another control (a toolbar toggle, a file input label) can share the exact variant classes without wrapping a `<button>` in a `<button>`.',
    'The kit\'s `IconButton`, `CloseButton` and `LinkButton` are separate items with their own shapes. `Button iconOnly` is the square form of a full button, with the same gradient and border.',
  ],

  apiSignature:
    'function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "medium" | "small" | "xs"; iconOnly?: boolean; leadingIcon?: IconComponent; trailingIcon?: IconComponent; ref?: Ref<HTMLButtonElement> }): JSX.Element\nfunction ButtonLink(props: AnchorHTMLAttributes<HTMLAnchorElement> & { …same visual props }): JSX.Element',

  props: [
    { name: 'variant', type: '"primary" | "secondary" | "ghost" | "danger"', default: '"primary"', description: 'Gradient fill (primary, danger), bordered surface (secondary) or no surface until hovered (ghost).' },
    { name: 'size', type: '"medium" | "small" | "xs"', default: '"medium"', description: '36, 32 or 24px tall. Sets padding, radius, icon size and type style together.' },
    { name: 'iconOnly', type: 'boolean', default: 'false', description: 'Square button showing only `leadingIcon`. Children and `trailingIcon` are ignored, so pass `aria-label`.' },
    { name: 'leadingIcon', type: 'ComponentType<{ className?: string }>', description: 'Icon component drawn before the label at the tier\'s size. Directional glyphs mirror in RTL.' },
    { name: 'trailingIcon', type: 'ComponentType<{ className?: string }>', description: 'Icon component drawn after the label.' },
    { name: 'type', type: '"button" | "submit" | "reset"', default: '"button"', description: 'Native button type. Defaults to `button` so it never submits a surrounding form by accident.' },
    { name: 'className', type: 'string', description: 'Merged through `tailwind-merge`, so conflicting utilities replace the defaults instead of fighting them.' },
  ],

  reducedMotion:
    'The press scale and every transition on `button-press-motion` are removed under `prefers-reduced-motion: reduce`, so states change instantly and the button never moves. The hover-gradient layer still swaps, because colour feedback carries meaning.',

  cleanup:
    'Nothing to clean up. The component is stateless markup with no listeners, timers or effects. All motion is CSS transitions that end on their own.',

  acceptance:
    'Four variants render side by side at the same height. Hover the primary button and its gradient fades smoothly to the lighter hover gradient (no snap). Press any button and it dips slightly, then eases back more slowly than it went down. Tab to a button and a 2px focus ring appears offset from the edge. Disabled buttons, including `aria-disabled` ones, show the muted palette, do not dip on press and show a not-allowed cursor. An icon-only small button is exactly as tall as a small labelled one. A button inside a form does not submit it unless `type="submit"`.',

  criticalRegion: 'critical',
};

export default meta;
