# Build: Icon Button

A square `<button>` that draws one icon component at a fixed size inside a secondary-button surface: white fill, 1px border and `shadow-xs`. `aria-label` is a required prop in the type, so a nameless icon button does not compile. `IconLinkButton` renders the same box as an `<a>` for actions that navigate, such as opening a profile or an external dashboard.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Square bordered icon-only button in 36 and 32px with a fixed 10px radius, plus an anchor twin for navigational actions.

- Category: action
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The icon is a component prop (`icon={RiSearchLine}`), not an element. The button renders it with `aria-hidden` at 20px (medium) or 16px (small), so the glyph size always matches the box and the button's accessible name comes only from `aria-label`.
2. The box is `size-9` (36px) or `size-8` (32px) with `rounded-2lg` at both sizes. Unlike `Button`, whose small tier drops to an 8px radius, the icon button keeps 10px so a row of mixed sizes still reads as one family.
3. Hover, press and disabled reuse the secondary Button tokens: the fill steps through `background-primary-hover` and `-active`, and the border steps through `border-button-hover` and `-active`. Only `background-color`, `border-color`, `box-shadow` and `color` transition (150ms), so nothing animates layout.
4. Disabled drops the shadow, fades to 60% opacity and swaps the icon colour to `icon-button-disabled-foreground`. `directionalIconClass` adds `rtl:rotate-180` to arrow and sidebar glyphs, so a "Next" arrow points the reading direction in right-to-left layouts.
5. `type` defaults to `"button"` so an icon button inside a form (a clear or add-row control) never submits it. `IconLinkButton` shares the exact style object and takes anchor attributes instead.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `box sizes = 36 × 36 / 32 × 32 px`
  Match the kit's medium and small Button heights, so an icon button sits flush beside a labelled button or a 36px input.
- `icon sizes = 20px / 16px`
  Leaves 8px of padding on each side at both sizes (36 − 20 = 16, 32 − 16 = 16), which is the spacing in the Figma table-row and notification buttons.
- `radius = 10px (rounded-2lg) at both sizes`
  A 32px square with an 8px radius looks visibly rounder than its 36px neighbour. Holding the radius constant keeps toolbars of mixed sizes consistent.
- `transition = 150ms ease on colour, border and shadow`
  Fast enough that sweeping across a row of table actions does not leave half-lit buttons behind.

## API

```ts
function IconButton(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { icon: IconComponent; size?: "medium" | "small"; "aria-label": string; ref?: Ref<HTMLButtonElement> }): JSX.Element
function IconLinkButton(props: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> & { icon: IconComponent; size?: "medium" | "small"; "aria-label": string; ref?: Ref<HTMLAnchorElement> }): JSX.Element
```

- `icon: ComponentType<{ className?: string }>`
  Required. Icon component rendered at 20px (medium) or 16px (small) with `aria-hidden`.
- `aria-label: string`
  Required. The only accessible name, since there is no visible label.
- `size: "medium" | "small"` — default `"medium"`
  36px or 32px square. The radius stays 10px at both.
- `type: "button" | "submit" | "reset"` — default `"button"`
  On `IconButton` only. Defaults to `button` so it never submits a surrounding form.
- `href: string`
  On `IconLinkButton`: the destination. All other anchor attributes pass through.
- `className: string`
  Merged through `tailwind-merge`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function IconButton({
  icon: Icon,
  size = "medium",
  className,
  type = "button",
  ref,
  ...props
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(styles.base, styles.size[size], className)}
      {...props}
    >
      <Icon className={cx(styles.icon[size], directionalIconClass(Icon))} aria-hidden />
    </button>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. Both components are stateless markup with no listeners, timers or effects.

**Reduced motion.** Nothing moves. Hover and press change only colours, border and shadow over 150ms, and the button never scales or shifts.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Passing an element (`icon={<RiAddLine />}`). The prop takes the component so the button can size it. Anything else fails the type check or renders at Remix Icon's default 24px and overflows the 36px box.
- Reusing one `aria-label` for different actions in a row, such as three "Action" buttons. Each label should name its own action ("Edit row", "Delete row"), because screen-reader users hear only the label.
- Using `IconButton` with an `onClick` that navigates. Use `IconLinkButton` with `href` so middle-click, open-in-new-tab and the status-bar URL preview all work.
- Overriding the radius per size from outside. The 10px radius at both sizes is intentional, so a `className="rounded-lg"` on small buttons breaks the visual rhythm of a mixed toolbar.

## Notes

- This is the bordered secondary surface only. For a borderless icon inside a toolbar or a primary-filled square, use `Button` with `iconOnly` and the matching variant.

## Definition of done

Add, Search and Delete render as three 36px squares with 20px icons centred and identical 10px corners. The small row is 32px with 16px icons and the same corner radius. Hovering lightens the fill and darkens the border without any movement. Tabbing shows a 2px offset focus ring. The disabled button is faded, has no shadow and shows a not-allowed cursor. A screen reader announces each button by its label, never as just "button".

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
