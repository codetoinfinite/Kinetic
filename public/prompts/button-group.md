# Build: Button Group

A `role="group"` container that owns the border, radius and shadow, with plain `<button>` items inside it divided by 1px hairlines. Only the container is rounded; `overflow-hidden` clips the first and last items to its corners, so the items themselves stay square and never need first/last-child logic. A `selected` item keeps the hover fill and announces itself with `aria-pressed`, which makes the same markup work as an action row, a single-select range picker or a multi-select formatting bar.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Secondary buttons fused into one bordered strip with hairline dividers, for toolbars, range pickers and pressed toggles.

- Category: action
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The container carries every outer surface: `rounded-2lg` (10px), a 1px `border-border-button-group`, `shadow-xs` and the primary background. `divide-x divide-border-button-default` draws a left border on every item except the first, so the dividers come from the parent and adding or removing items never leaves a doubled or missing line.
2. `overflow-hidden` on the container is what rounds the outer items. A hover or pressed fill on the first item would otherwise paint square corners over the container's rounded border. Clipping at the container means the items carry no radius at all.
3. Item heights are 34px (medium) and 30px (small) because the container's 1px top and bottom border add 2px, so the whole strip lands on the kit's 36 / 32px button heights and lines up with a `Button` or input beside it.
4. Focus uses an inset ring (`ring-inset`) plus `focus-visible:relative z-10`. An outset ring would be clipped by the container's `overflow-hidden`, and without the z-index lift the next item's divider paints over the right edge of the ring. `isolate` on the container keeps that z-index local to the group.
5. `selected` maps to the hover fill (`bg-background-primary-hover`) and sets `aria-pressed={selected || undefined}`. Unselected items omit the attribute entirely, so a plain action row is not announced as a set of toggles.
6. Icons are component props rendered by the item at 20px (medium) or 18px (small) with `aria-hidden`; arrow and sidebar glyphs get `rtl:rotate-180` from `directionalIconClass`. With `iconOnly` the item becomes a 34 or 30px square and drops its label, so it needs an `aria-label`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `item height = 34px / 30px (medium / small)`
  The container border adds 1px above and below, so the visible strip is exactly 36 or 32px, matching Button's secondary sizes. Sizing items at 36px would make the group 2px taller than every control next to it.
- `horizontal padding = 12px / 10px`
  Same as Button's secondary tiers, so a labelled item and a standalone button with the same text are the same width.
- `transition = background-color, color 150ms ease`
  Only colour changes. Sweeping the pointer along a toolbar lights each item briefly without a trail, and no transform is involved, so items never shift inside the clipped strip.

## API

```ts
function ButtonGroup(props: { size?: "medium" | "small"; children: ReactNode; className?: string; "aria-label"?: string; ref?: Ref<HTMLDivElement> }): JSX.Element
function ButtonGroupItem(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { size?: "medium" | "small"; selected?: boolean; iconOnly?: boolean; leadingIcon?: IconComponent; trailingIcon?: IconComponent; children?: ReactNode; ref?: Ref<HTMLButtonElement> }): JSX.Element
```

- `size: "medium" | "small"` — default `"medium"`
  On `ButtonGroupItem`: 36 or 32px overall strip height, with 20 or 18px icons. Pass the same size to every item in a group.
- `selected: boolean` — default `false`
  On `ButtonGroupItem`: keeps the hover fill and sets `aria-pressed`. Drive it from state for single or multi select.
- `iconOnly: boolean` — default `false`
  On `ButtonGroupItem`: square item showing only `leadingIcon`. Needs `aria-label`.
- `leadingIcon: ComponentType<{ className?: string }>`
  Icon component drawn before the label at the tier's size.
- `trailingIcon: ComponentType<{ className?: string }>`
  Icon component drawn after the label. Ignored when `iconOnly`.
- `aria-label: string`
  On `ButtonGroup`: names the group for assistive tech, for example "Range".
- `className: string`
  Merged through `tailwind-merge` on either element.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const styles = sortCx({
  group: [
    "inline-flex items-stretch isolate",
    "rounded-2lg border border-border-button-group bg-background-primary-default shadow-xs",
    // Hairlines between items, outer corners rounded on the first/last item
    "divide-x divide-border-button-default overflow-hidden",
  ].join(" "),

  item: [
    "inline-flex items-center justify-center gap-1 whitespace-nowrap",
    "bg-background-primary-default text-text-primary font-sans select-none cursor-pointer",
    "transition-[background-color,color] duration-150 ease",
    "outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring",
    "hover:bg-background-primary-hover active:bg-background-primary-active",
    "disabled:cursor-not-allowed disabled:bg-background-primary-disabled disabled:text-text-tertiary",
  ].join(" "),

  size: {
    medium: "h-[34px] px-3 text-body-medium",
    small: "h-[30px] px-2.5 text-body-medium",
  },

  iconOnlySize: {
    medium: "w-[34px] px-0",
    small: "w-[30px] px-0",
  },

  icon: {
    medium: "size-5 shrink-0",
    small: "size-[18px] shrink-0",
  },

  selected: "bg-background-primary-hover",
});
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. Both components are stateless markup with no listeners, timers or effects.

**Reduced motion.** Nothing moves. The only motion is a 150ms colour transition on hover, press and selection, which is not spatial and stays as is.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Giving items their own radius or border. The container already draws both, so you get a doubled outline and visible notches where the item corners do not match the 10px outer radius.
- Removing `overflow-hidden` from the container. The first and last items' hover and selected fills then paint square corners over the rounded border.
- Switching the focus ring to an outset `ring-offset`. The container clips it, so keyboard users see no focus indicator at all on the end items.
- Using `selected` without updating it from state. It is purely visual plus `aria-pressed`, so clicking an item does nothing until your handler moves the selection.
- Shipping an `iconOnly` item without `aria-label`. The glyph is `aria-hidden`, so the item is announced as an unnamed button.

## Notes

- For a single-choice switcher with an animated sliding thumb, use a segmented control instead. Button Group is for rows of equal actions where the selected state just stays lit.
- Pass `aria-label` on `ButtonGroup` (for example "Range" or "Text alignment") so screen readers announce what the group of buttons controls.

## Definition of done

Day, Week and Month render as one 36px strip with hairline dividers and rounded outer corners only. Clicking Month moves the lit fill from Week to Month and screen readers report it as pressed. Hovering the first item fills it right into the rounded corner without square edges poking out. Tabbing through shows an inset focus ring that is not clipped and not overlapped by the neighbouring divider. A small group is 32px tall, and icon-only items are square.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
