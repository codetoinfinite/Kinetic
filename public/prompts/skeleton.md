# Build: Skeleton

Placeholders in the shape of the content on its way: rectangles, text lines and circles tinted from the text colour at 8%, so they show on any surface in both themes. A sheen sweeps each block in three layers (a crisp 2px line, a 72px glow and a 240px bloom). Given children, a Skeleton lays the real content out invisibly to take its exact size, then cross-fades the block away while the content sharpens in from a 4px blur.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Content-shaped placeholders with a layered light sheen that size themselves to real content and blur it in once loaded.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Paint every block with `bui-skeleton block bg-text-primary/8` plus a radius per shape: `rounded-xl` (rect), `rounded-md` (text) or `rounded-full` (circle). The 8% text-colour tint is what keeps the block visible on light and dark cards alike.
2. Draw the sheen in CSS on `.bui-skeleton::after` (in the kit theme sheet): three right-anchored `linear-gradient(90deg, transparent, <colour>)` layers sized 2px, 72px and 240px, so nothing soft runs ahead of the crisp leading line. `.bui-skeleton` sets `overflow: hidden; isolation: isolate` and leaves positioning to the component's `relative` / `absolute` classes.
3. Animate the pseudo-element with `bui-skeleton-sheen`: `translate` from -100% to 100% over the first 60% of a 2.2s `cubic-bezier(0.4, 0, 0.2, 1)` cycle, then rest off-block until the loop restarts. `:dir(rtl)` flips it with `scale: -1 1` and `animation-direction: reverse`. Dark mode lowers the three layer alphas from 0.9 / 0.55 / 0.35 to 0.2 / 0.08 / 0.04.
4. Without children, render one `<span aria-hidden>` block sized by the caller's `className` (`h-4 w-40`, `size-10`).
5. With children, render a `relative block` wrapper holding two layers: the real content in a `<span>` that is `opacity-0 motion-safe:blur-[4px]`, `inert` and `aria-hidden` until `isLoaded`, and an `absolute inset-0` skeleton block on top. When `isLoaded` flips, the content goes to `opacity-100 blur-[0px]` and the block to `opacity-0`, both via `transition-[opacity,filter] duration-300 ease-out`.
6. `SkeletonText` maps `lines` to `text`-shaped Skeletons in a `flex flex-col gap-2.5` column, each `lineClassName` tall (default `h-3.5`), with the last line at `w-3/5` when there is more than one line.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `block tint = bg-text-primary/8`
  Derived from the text colour rather than a fixed grey, so the placeholder sits at the same contrast on white and dark cards and flips with the theme for free.
- `sheen layers = 2px line, 72px glow, 240px bloom; light alpha 0.9 / 0.55 / 0.35, dark 0.2 / 0.08 / 0.04`
  A sharp leading edge with a soft tail reads as light passing over the surface. On dark surfaces the same alphas would flash, so they drop sharply.
- `sweep timing = 2.2s cycle, sweep occupies 0 to 60%, cubic-bezier(0.4, 0, 0.2, 1)`
  The rest period between sweeps is what keeps a page full of skeletons calm instead of a constant shimmer.
- `reveal = 300ms ease-out on opacity and filter; content enters from blur(4px)`
  Long enough to read as a cross-fade, short enough that loaded data is not held back. The blur hides the layout snap of text replacing a flat block.
- `SkeletonText = gap-2.5 (10px), h-3.5 lines, last line w-3/5`
  A 14px bar with 10px gaps approximates Body 1 text at a 24px rhythm; the short last line is what makes a block read as a paragraph.

## API

```ts
type SkeletonShape = "rect" | "text" | "circle"
interface SkeletonProps { shape?: SkeletonShape; isLoaded?: boolean; className?: string; style?: CSSProperties; children?: ReactNode }
function Skeleton(props: SkeletonProps): JSX.Element
interface SkeletonTextProps { lines?: number; lineClassName?: string; className?: string }
function SkeletonText(props: SkeletonTextProps): JSX.Element
```

- `shape: "rect" | "text" | "circle"` — default `"rect"`
  Corner radius: 12px, 6px or fully round.
- `isLoaded: boolean` — default `false`
  With children: fade the block out and blur the content in.
- `className: string`
  Size and placement, e.g. `h-4 w-40` or `size-10`.
- `children: ReactNode`
  Real content to size the placeholder from and reveal when loaded.
- `lines (SkeletonText): number` — default `3`
  Number of lines; the last runs 60% wide.
- `lineClassName (SkeletonText): string` — default `"h-3.5"`
  Line height, matched to the text it stands in for.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const styles = sortCx({
  block: "bui-skeleton block bg-text-primary/8",
  shape: {
    rect: "rounded-xl",
    text: "rounded-md",
    circle: "rounded-full",
  },
});

const FADE = "transition-[opacity,filter] duration-300 ease-out motion-reduce:transition-none";

export interface SkeletonProps {
  /** `rect` (radius 12, default), `text` (radius 6), or `circle`. */
  shape?: SkeletonShape;
  /** With children: show them once true, blurring them in. */
  isLoaded?: boolean;
  /** Size and placement, e.g. `h-4 w-40` or `size-10`. */
  className?: string;
  style?: CSSProperties;
  /** Real content to measure the placeholder from and reveal when loaded. */
  children?: ReactNode;
}

export function Skeleton({ shape = "rect", isLoaded = false, className, style, children }: SkeletonProps) {
  if (children === undefined) {
    return <span aria-hidden className={cx(styles.block, "relative", styles.shape[shape], className)} style={style} />;
  }

  return (
    <span className={cx("relative block", className)} style={style}>
      <span
        aria-hidden={!isLoaded || undefined}
        inert={!isLoaded}
        className={cx("block", FADE, isLoaded ? "opacity-100 blur-[0px]" : "opacity-0 motion-safe:blur-[4px]")}
      >
        {children}
      </span>
      <span
        aria-hidden
        className={cx(styles.block, styles.shape[shape], "pointer-events-none absolute inset-0", FADE, isLoaded && "opacity-0")}
      />
    </span>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. All motion is CSS animation on a pseudo-element and CSS transitions; there are no listeners, timers or effects.

**Reduced motion.** The sweep is removed (`::after { display: none }`) and each block instead breathes with `bui-skeleton-pulse`, a 2s ease-in-out opacity dip to 0.55. The reveal drops its transition and skips the blur (`motion-reduce:transition-none`, `motion-safe:blur-[4px]`), so loaded content simply appears.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not give the `.bui-skeleton` class its own `position` in unlayered CSS. It would beat Tailwind's layered `relative` / `absolute` utilities and break the overlay form.
- Do not render the loaded content outside the Skeleton and swap it in. The children form measures the placeholder from the real content, which is what prevents layout shift.
- Do not forget `aria-busy` on the region that is loading. Skeletons are `aria-hidden`, so without it assistive tech gets no loading signal at all.
- Do not tint the block with a fixed grey such as `bg-neutral-200`. It vanishes on dark cards; the 8% text tint does not.
- Do not leave hidden content focusable. The component sets `inert` on it until `isLoaded`; a custom version must too, or Tab lands on invisible buttons.

## Notes

- The sheen and its keyframes live in the theme sheet (`.bui-skeleton`), not in the component, so it needs the kit stylesheet to animate.
- With children, size and placement classes go on the wrapper; the overlay block inherits the wrapper's box.

## Definition of done

A card of skeletons (a 36px circle, two text bars, two text lines and a 64px rect) shows a soft sheen crossing each block left to right roughly every 2.2s, with a pause between sweeps, in both light and dark mode. Wrapping real content in `<Skeleton isLoaded={false}>` gives a block exactly the size of that content; switching to `isLoaded` cross-fades the block out over 300ms while the content un-blurs, with no layout shift. Under reduced motion the blocks pulse instead of sweeping.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
