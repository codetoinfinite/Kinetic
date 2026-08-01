# Build: Stroke-To-Fill Hover Rows

A list of large type where every row is an outline with a ghost of fill, and the hovered row materialises: the stroke drops to zero width, the fill goes to full `currentColor`, and the row steps 12px to the right while its siblings recede. The row does not light up, it becomes solid. Everything is CSS, so nothing but the compositor runs on hover.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An index of outlined type where the hovered row fills in solid, drops its stroke, and steps sideways.

- Category: text
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Two properties carry the effect, and they are separate on purpose: `-webkit-text-stroke-width` goes 1px to 0, and `-webkit-text-fill-color` goes from a ghost of `currentColor` to `currentColor` itself.
2. `-webkit-text-fill-color` overrides `color` for the glyph interior only, which is what lets the outline stay at `currentColor` while the inside is nearly transparent. Doing this with `color` alone is impossible — `color` is also what `currentColor` resolves to, so fading the fill fades the stroke with it and the row just dims.
3. The ghost is `color-mix(in oklch, currentColor var(--kx-sf-ghost, 16%), transparent)` rather than a literal `rgba`. It inherits the surrounding text colour, so one component is correct on a dark page and a light one, and mixing in oklch keeps the 16% step perceptually even instead of clumping toward black the way sRGB alpha does.
4. The three tunables are custom properties set on the `<ul>` from props (`--kx-sf-stroke`, `--kx-sf-ghost`, `--kx-sf-nudge`), so per-instance configuration needs no extra class and no extra rule.
5. Sibling dimming is scoped to the list's own hover: `.kinetic-sf-list:hover .kinetic-sf-row:not(:hover) { opacity: 0.45 }`. Scoping to the list is what makes the resting state "all rows equal" rather than "all rows dimmed".
6. Every hover rule is duplicated for `:focus-visible`. Each row is a real `<a>` or `<button>` inside an `<li>`, so keyboard traversal produces the same state change — without it a keyboard user tabbing ten identical outlines has no idea where they are.
7. The stylesheet is emitted once through React 19's `<style href precedence>` hoisting, so any number of lists on a page share one rule set.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `STROKE_WIDTH = 1`
  Pixels of outline at rest. At the 28-72px type this component targets, 1px is a hairline that still reads as a complete letterform; 2px starts to close up counters in tighter faces and the row looks bold rather than outlined.
- `GHOST = 16`
  Percent of `currentColor` mixed into the resting fill. At 0 the glyph interiors are fully transparent and the type dissolves into whatever is behind it; past ~30% the resting and hovered states are too close for the transition to register.
- `NUDGE = 12`
  Pixels the hovered row steps right. Enough to be unmistakable next to a static neighbour; past ~24px the row visibly leaves the left margin of the list and the alignment looks broken.
- `transition duration / curve = 380ms cubic-bezier(0.16, 1, 0.3, 1)`
  A strong ease-out. The row arrives quickly and settles, which matches the pointer having already stopped. A symmetric ease at this duration lags the cursor noticeably on a fast pass down a ten-row list.
- `sibling opacity = 0.45`
  Enough separation that the hovered row is unambiguous, while the others stay legible — dimming to 0.2 turns a browsable index into a spotlight and hides the thing the user is scanning for.

## API

```ts
function StrokeToFillRows(props: { items: StrokeToFillItem[]; strokeWidth?: number; ghost?: number; nudge?: number; className?: string; onSelect?: (item: StrokeToFillItem, index: number) => void }): JSX.Element
```

- `items: StrokeToFillItem[]`
  Rows. Each has a `label`, an optional `meta` node for right-hand metadata, and an optional `href`.
- `strokeWidth: number` — default `1`
  Outline thickness in px at rest.
- `ghost: number` — default `16`
  Resting fill as a percentage of `currentColor`.
- `nudge: number` — default `12`
  Pixels the hovered row steps right.
- `className: string`
  Merged onto the `<ul>` via `cn`.
- `onSelect: (item: StrokeToFillItem, index: number) => void`
  Called when a row without an `href` is activated.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const ROWS_CSS = `
.kinetic-sf-title {
  -webkit-text-stroke: var(--kx-sf-stroke, 1px) currentColor;
  -webkit-text-fill-color: color-mix(in oklch, currentColor var(--kx-sf-ghost, 16%), transparent);
  transition:
    -webkit-text-fill-color 380ms cubic-bezier(0.16, 1, 0.3, 1),
    -webkit-text-stroke-width 380ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 380ms cubic-bezier(0.16, 1, 0.3, 1);
  transform: translate3d(0, 0, 0);
}
/* :focus-visible alongside :hover, always. A keyboard user tabbing an index
   of ten rows otherwise sees ten identical outlines and no current position. */
.kinetic-sf-row:hover .kinetic-sf-title,
.kinetic-sf-row:focus-visible .kinetic-sf-title {
  -webkit-text-fill-color: currentColor;
  -webkit-text-stroke-width: 0px;
  transform: translate3d(var(--kx-sf-nudge, 12px), 0, 0);
}
/* Everything that is not the hovered row recedes. Scoped to the list's own
   hover so the resting state is all rows equal, not all rows dimmed. */
.kinetic-sf-list:hover .kinetic-sf-row:not(:hover) {
  opacity: 0.45;
}
.kinetic-sf-row {
  transition: opacity 380ms cubic-bezier(0.16, 1, 0.3, 1);
}
@media (prefers-reduced-motion: reduce) {
  /* The stroke-to-fill swap is a state change, not motion, and it stays. The
     12 px lateral travel is motion, and it goes. */
  .kinetic-sf-row:hover .kinetic-sf-title,
  .kinetic-sf-row:focus-visible .kinetic-sf-title {
    transform: none;
  }
}
`;

export interface StrokeToFillItem {
  label: string;
  /** Right-hand metadata: a year, a category, a count. */
  meta?: ReactNode;
  href?: string;
}

export interface StrokeToFillRowsProps {
  items: StrokeToFillItem[];
  /** Outline thickness in px at rest. */
  strokeWidth?: number;
  /** Resting fill, as a percentage of `currentColor`. */
  ghost?: number;
  /** Pixels the hovered row steps right. */
  nudge?: number;
  className?: string;
  onSelect?: (item: StrokeToFillItem, index: number) => void;
}

const STROKE_WIDTH = 1;
const GHOST = 16;
const NUDGE = 12;

export function StrokeToFillRows({
  items,
  strokeWidth = STROKE_WIDTH,
  ghost = GHOST,
  nudge = NUDGE,
  className,
  onSelect,
}: StrokeToFillRowsProps) {
  return (
    <>
      <style href="kinetic-stroke-to-fill" precedence="medium">
        {ROWS_CSS}
      </style>
      <ul
        className={cn('kinetic-sf-list w-full', className)}
        style={
          {
            '--kx-sf-stroke': `${strokeWidth}px`,
            '--kx-sf-ghost': `${ghost}%`,
            '--kx-sf-nudge': `${nudge}px`,
          } as CSSProperties
        }
      >
        {items.map((item, i) => {
          const inner = (
            <>
              <span className="kinetic-sf-title block text-[clamp(28px,5.5vw,72px)] leading-[1.06] tracking-[-0.03em]">
                {item.label}
              </span>
              {item.meta ? (
                <span className="meta shrink-0 pt-[0.35em]">{item.meta}</span>
              ) : null}
            </>
          );

          return (
            <li key={`${item.label}-${i}`} className="border-b border-line">
              {item.href ? (
                <a
                  href={item.href}
                  className="kinetic-sf-row flex w-full items-start justify-between gap-6 py-[0.35em] text-left outline-none"
                >
                  {inner}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect?.(item, i)}
                  className="kinetic-sf-row flex w-full items-start justify-between gap-6 py-[0.35em] text-left outline-none"
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up: no effect, no listener, no timer. Unmounting removes the list; React's `<style precedence>` hoisting owns the shared rule set.

**Reduced motion.** The stroke-to-fill swap is a state change, not motion, so it is kept in full — the hovered row still fills solid and its siblings still recede. Only the 12px lateral travel is removed, via `transform: none` in a `prefers-reduced-motion: reduce` block. The rows are never left unreadable.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Trying to build this with `color` alone. Fading the fill fades the stroke with it because `currentColor` resolves to the same value, so the row dims instead of filling.
- Transitioning the `-webkit-text-stroke` shorthand. Shorthands are not independently interpolable here; transition `-webkit-text-stroke-width` explicitly or the stroke snaps off in one frame while the fill glides.
- Hardcoding the resting fill as `rgba(255,255,255,0.16)`. The component is then wrong the moment it lands on a light background, and wrong again in an inverted section of the same page.
- Mixing the ghost in sRGB. The intermediate steps clump toward black, so the resting fill on a mid-tone accent looks muddy rather than faint.
- Dimming siblings without scoping to `.kinetic-sf-list:hover`. Every row is then permanently at 0.45 and the "recede" has nothing to recede from.
- Styling `:hover` and forgetting `:focus-visible`. Keyboard users get ten identical outlines and no indication of the current row, which is a genuine accessibility failure and not just a polish gap.
- Animating `left` or `margin-left` for the nudge. Both trigger layout on every row of a large-type index; `translate3d` stays on the compositor.

## Notes

- No text splitting and no motion library: this is a state change on a whole row, so imposing a splitter or GSAP on the consumer for a CSS-cost effect would be pure overhead.
- `-webkit-text-stroke` is unprefixed-less by history but supported in every current engine including Firefox and Safari. There is no standards-track alternative that composites the same way.
- Rows render as `<a>` when `href` is given and as `<button>` otherwise, so the list is keyboard-traversable either way without a `tabIndex` hack.

## Definition of done

Hover a row: the outline thins to nothing as the glyph interiors fill to full colour, and the row slides 12px right while the others fade back. Tab through with a keyboard and the same state appears on the focused row. Flip the page between light and dark themes and the resting ghost fill is still faintly visible in both, without editing the component. With reduced motion enabled the fill still happens and the row does not move.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
