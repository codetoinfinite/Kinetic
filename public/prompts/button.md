# Build: Button

A native `<button>` (and an `<a>` twin, `ButtonLink`) whose look is four style maps indexed by `variant` and `size`. The component draws its own icons from a component reference, so the consumer cannot pass the wrong icon size. The gradient fills of the primary and danger variants live in two `@utility` classes in the theme sheet, which fade a hover gradient in on a `::before` layer because CSS cannot interpolate `background-image`.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Primary, secondary, ghost and danger buttons in three sizes, with gradient fills that fade on hover and a soft press.

- Category: action
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. Every class comes from one `sortCx` object: `base` (layout, focus ring, press motion), `size` (height, padding, radius and type style per tier), `iconOnlySize` (the square override), `icon` (glyph size per tier), `label` (inner padding) and `variant`. `cx` is a `tailwind-merge` instance extended with the kit's custom type scale, so a consumer `className` such as `h-10` replaces the size tier's `h-9` rather than both landing in the class list.
2. Icons are props that take a component (`leadingIcon={RiAddLine}`), not an element. The button renders it with the tier's size class — 20px at medium, 18px at small, 14px at xs — plus `aria-hidden`. Navigation glyphs (left/right arrows, sidebar fold) are listed in `directionalIconClass` and get `rtl:rotate-180`, so a "Next" arrow points the reading direction in Arabic or Hebrew without the caller knowing.
3. Primary and danger paint with `bg-button-primary` and `bg-button-danger`. Each sets the default gradient as `background-image`, then a `::before` with `inset: 0`, `z-index: -1` and `border-radius: inherit` holds the hover gradient at opacity 0. Hover fades that layer to 1 over `--button-transition-ms`. `isolation: isolate` on the button is what keeps the negative-z layer above the button's own background and below its label.
4. The press is `button-press-motion`: colours transition in 150ms while `transform` takes 420ms back to rest. `:active` scales to 0.98 and drops the transform duration to 220ms, so the button goes down fast and comes back slowly. Hover never touches `transform`, so hover colour changes never inherit the long press timing.
5. Disabled works for both `disabled` and `aria-disabled="true"`. The second matters when a disabled button must stay focusable so a tooltip can explain why. Every variant styles both selectors and the press motion turns itself off for both.
6. `type` defaults to `"button"`. A bare `<button>` inside a `<form>` is a submit button, so a Cancel or "Add row" button would otherwise submit the form it sits in.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `heights = 36 / 32 / 24 px (medium / small / xs)`
  Taken 1:1 from the Figma variant matrix. Medium matches the kit's inputs (also 36px), so a button next to a field lines up with no wrapper. Xs exists for dense surfaces such as calendar event cards and is the only tier that switches to the 12px caption type style.
- `small icon-only size = size-8 p-0`
  An 18px icon plus 8px padding on each side gives 34px, but Figma pins the small square at 32. Removing the padding and forcing the size keeps an icon button the same height as a small labelled button beside it. Medium needs no override because 8 + 20 + 8 is already 36.
- `--button-transition-ms = 150ms`
  Shared by the hover-gradient fade and the colour transitions, so the fill and the label change together. Much shorter and the gradient fade looks like a snap; much longer and fast pointer sweeps across a toolbar leave a trail of half-lit buttons.
- `press = scale(0.98), 220ms down / 420ms back`
  Two percent is enough to feel without visibly moving the label off its baseline. The asymmetric duration is the point: press feedback has to be immediate, and the return can be soft because nothing is waiting on it.

## API

```ts
function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "medium" | "small" | "xs"; iconOnly?: boolean; leadingIcon?: IconComponent; trailingIcon?: IconComponent; ref?: Ref<HTMLButtonElement> }): JSX.Element
function ButtonLink(props: AnchorHTMLAttributes<HTMLAnchorElement> & { …same visual props }): JSX.Element
```

- `variant: "primary" | "secondary" | "ghost" | "danger"` — default `"primary"`
  Gradient fill (primary, danger), bordered surface (secondary) or no surface until hovered (ghost).
- `size: "medium" | "small" | "xs"` — default `"medium"`
  36, 32 or 24px tall. Sets padding, radius, icon size and type style together.
- `iconOnly: boolean` — default `false`
  Square button showing only `leadingIcon`. Children and `trailingIcon` are ignored, so pass `aria-label`.
- `leadingIcon: ComponentType<{ className?: string }>`
  Icon component drawn before the label at the tier's size. Directional glyphs mirror in RTL.
- `trailingIcon: ComponentType<{ className?: string }>`
  Icon component drawn after the label.
- `type: "button" | "submit" | "reset"` — default `"button"`
  Native button type. Defaults to `button` so it never submits a surrounding form by accident.
- `className: string`
  Merged through `tailwind-merge`, so conflicting utilities replace the defaults instead of fighting them.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function Button({
  variant = "primary",
  size = "medium",
  iconOnly = false,
  leadingIcon: Leading,
  trailingIcon: Trailing,
  children,
  className,
  type = "button",
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        styles.base,
        styles.size[size],
        styles.variant[variant],
        iconOnly && styles.iconOnlySize[size],
        className,
      )}
      {...props}
    >
      {Leading ? <Leading className={cx(styles.icon[size], directionalIconClass(Leading))} aria-hidden /> : null}
      {!iconOnly && children !== undefined && children !== null && (
        <span className={styles.label[size]}>{children}</span>
      )}
      {!iconOnly && Trailing ? (
        <Trailing className={cx(styles.icon[size], directionalIconClass(Trailing))} aria-hidden />
      ) : null}
    </button>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component is stateless markup with no listeners, timers or effects. All motion is CSS transitions that end on their own.

**Reduced motion.** The press scale and every transition on `button-press-motion` are removed under `prefers-reduced-motion: reduce`, so states change instantly and the button never moves. The hover-gradient layer still swaps, because colour feedback carries meaning.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Swapping the gradient in `:hover` with another `background-image`. It snaps, because `background-image` does not interpolate. The fade only works because the hover gradient sits on its own layer and only its `opacity` changes.
- Removing `isolation: isolate` from the gradient utilities. The `::before` sits at `z-index: -1`, and without a new stacking context it slips behind the button's parent background, so the hover state disappears on any card with a fill.
- Passing an icon element (`leadingIcon={<RiAddLine />}`). The prop takes the component, so the button can size it. An element bypasses the size class and the glyph renders at Remix Icon's default 24px, which breaks the 36px height.
- Shipping an icon-only button without `aria-label`. The glyph is `aria-hidden` and there is no text, so screen readers announce just "button".
- Relying on the browser default `type`. Inside a form it is `submit`. The component defaults to `"button"`, so pass `type="submit"` explicitly on the button that should submit.
- Putting `transition-all` on a consumer `className`. It overrides the split timing of `button-press-motion` and gives hover colour changes the slow 420ms press-return curve.

## Notes

- The style maps are exported as `buttonStyles`, so another control (a toolbar toggle, a file input label) can share the exact variant classes without wrapping a `<button>` in a `<button>`.
- The kit's `IconButton`, `CloseButton` and `LinkButton` are separate items with their own shapes. `Button iconOnly` is the square form of a full button, with the same gradient and border.

## Definition of done

Four variants render side by side at the same height. Hover the primary button and its gradient fades smoothly to the lighter hover gradient (no snap). Press any button and it dips slightly, then eases back more slowly than it went down. Tab to a button and a 2px focus ring appears offset from the edge. Disabled buttons, including `aria-disabled` ones, show the muted palette, do not dip on press and show a not-allowed cursor. An icon-only small button is exactly as tall as a small labelled one. A button inside a form does not submit it unless `type="submit"`.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
