# Build: Spinner

A spinner for work of unknown length, drawn as a comet of light: the same arc at three scales (a crisp line with a rounded head, a tight glow and a wide bloom), each softer layer shorter and a few degrees behind, over a faint full-circle track. Everything paints in `currentColor`, so a text class sets the colour. `Spinner` is announced as an indeterminate React Aria progress bar labelled "Loading"; `SpinnerGlyph` is the bare visual.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An orbiting light in three layers (crisp arc, tight glow, wide bloom) in five sizes and any text colour, announced as loading.

- Category: display
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. Look up the box and line width from `SIZES`: xs 12/1.5, sm 16/2, md 20/2, lg 24/2.5, xl 32/3 px. Render a `relative inline-flex shrink-0 text-accent-500` span at that box size.
2. If `track` is on, draw the full circle as an `absolute inset-0 rounded-full border-current opacity-15` span with `borderWidth: line`.
3. Each `Arc` paints `conic-gradient(transparent ${360 - arc}deg, currentColor 360deg)` so the arc ends at 12 o'clock, then masks it to a ring with a `radial-gradient` that is opaque between `center ± width/2` (with `center = box/2 - line/2`). Its wrapper is grown by `bleed = max(0, outer + blur*2 - box/2)` on every side so the blur never clips, then gets `filter: blur()`, `opacity` and `rotate: -lag deg`.
4. Stack three arcs inside one `animate-spin [animation-duration:900ms]` layer: bloom (width line×4, blur line×1.6, opacity 0.32, 110°, 22° behind), glow (width line×2, blur line×0.6, opacity 0.6, 200°, 9° behind) and crisp (width line, no blur, opacity 1, 290°, 0°). The shorter, lagging soft layers make the glow gather just behind the sharp head.
5. Finish the head with a `line × line` `rounded-full bg-current` dot at `left-1/2 top-0` (`translate: -50% 0`), the leading end of the crisp arc.
6. `Spinner` wraps the glyph in React Aria's `<ProgressBar isIndeterminate aria-label="Loading">`, giving it `role="progressbar"`. With `aria-hidden` it returns the bare `SpinnerGlyph`, for when a parent control already announces the wait.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `SIZES = xs 12/1.5, sm 16/2, md 20/2, lg 24/2.5, xl 32/3 (box/line px)`
  Sm and md match the kit's 16px and 20px icon slots, so a spinner can replace a button icon without changing the button height. Line width grows slower than the box so small spinners do not turn into solid discs.
- `layers = bloom 4×line, blur 1.6×line, 0.32, 110°, lag 22° / glow 2×line, blur 0.6×line, 0.6, 200°, lag 9° / crisp 1×line, 1, 290°, lag 0°`
  Shorter and later soft layers keep the bright head in front and the glow trailing like a comet's tail. Scaling everything by `line` keeps the look identical from 12 to 32px.
- `orbit = 900ms per turn; 2400ms under reduced motion`
  Under a second reads as active work. The reduced-motion orbit slows rather than stops, because a frozen spinner reads as a hang.
- `track = opacity-15 border in currentColor`
  Faint enough to sit behind the light, but it completes the circle so the 290° arc never reads as a broken ring.

## API

```ts
type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl"
interface SpinnerProps { size?: SpinnerSize; track?: boolean; "aria-label"?: string; "aria-hidden"?: boolean; className?: string }
function SpinnerGlyph(props: Omit<SpinnerProps, "aria-label" | "aria-hidden">): JSX.Element
function Spinner(props: SpinnerProps): JSX.Element
```

- `size: "xs" | "sm" | "md" | "lg" | "xl"` — default `"md"`
  12, 16, 20, 24 or 32px box with a matching line width.
- `track: boolean` — default `true`
  Draw the faint full circle under the light.
- `aria-label: string` — default `"Loading"`
  Accessible name of the progress bar.
- `aria-hidden: boolean`
  Render only the glyph, with no progress-bar role, when a parent already announces the wait.
- `className: string`
  Colour via a text class (default `text-accent-500`) and extra layout classes.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Box size and line width in px. */
const SIZES: Record<SpinnerSize, { box: number; line: number }> = {
  xs: { box: 12, line: 1.5 },
  sm: { box: 16, line: 2 },
  md: { box: 20, line: 2 },
  lg: { box: 24, line: 2.5 },
  xl: { box: 32, line: 3 },
};

/** One scale of the light: a conic arc masked to a ring, blurred by its wrapper. */
function Arc({
  box,
  line,
  width,
  blur,
  opacity,
  arc,
  lag,
}: {
  box: number;
  line: number;
  /** Ring thickness, px. */
  width: number;
  blur: number;
  opacity: number;
  /** Arc length in degrees; the head sits at 12 o'clock before the turn. */
  arc: number;
  /** Degrees this layer trails the crisp head. */
  lag: number;
}) {
  const center = box / 2 - line / 2;
  const inner = center - width / 2;
  const outer = center + width / 2;
  // The wrapper is grown to hold the ring plus its blur, so nothing clips.
  const bleed = Math.max(0, outer + blur * 2 - box / 2);
  const ring = `radial-gradient(circle, transparent ${inner}px, #000 ${inner + 0.5}px, #000 ${outer - 0.5}px, transparent ${outer}px)`;
  const style: CSSProperties = {
    inset: -bleed,
    filter: blur > 0 ? `blur(${blur}px)` : undefined,
    opacity,
    rotate: `${-lag}deg`,
  };
  return (
    <span aria-hidden className="absolute" style={style}>
      <span
        className="absolute inset-0"
        style={{
          background: `conic-gradient(transparent ${360 - arc}deg, currentColor 360deg)`,
          maskImage: ring,
          WebkitMaskImage: ring,
        }}
      />
    </span>
  );
}

export interface SpinnerProps {
  /** 12, 16, 20 (default), 24, or 32px. */
  size?: SpinnerSize;
  /** Draw the faint full circle under the light. Default true. */
  track?: boolean;
  /** Accessible name. Default "Loading". */
  "aria-label"?: string;
  /** Hide it from assistive technology when a parent already announces the wait. */
  "aria-hidden"?: boolean;
  /** Colour comes from the text colour, e.g. `text-white`. Default accent. */
  className?: string;
}

export function SpinnerGlyph({ size = "md", track = true, className }: Omit<SpinnerProps, "aria-label" | "aria-hidden">) {
  const { box, line } = SIZES[size];
  return (
    <span
      aria-hidden
      className={cx("relative inline-flex shrink-0 text-accent-500", className)}
      style={{ width: box, height: box }}
    >
      {track ? (
        <span className="absolute inset-0 rounded-full border-current opacity-15" style={{ borderWidth: line }} />
      ) : null}
      <span className="absolute inset-0 animate-spin [animation-duration:900ms] motion-reduce:[animation-duration:2400ms]">
        <Arc box={box} line={line} width={line * 4} blur={line * 1.6} opacity={0.32} arc={110} lag={22} />
        <Arc box={box} line={line} width={line * 2} blur={line * 0.6} opacity={0.6} arc={200} lag={9} />
        <Arc box={box} line={line} width={line} blur={0} opacity={1} arc={290} lag={0} />
        {/* The crisp line's rounded head, at the arc's leading end. */}
        <span
          className="absolute left-1/2 top-0 rounded-full bg-current"
          style={{ width: line, height: line, translate: "-50% 0" }}
        />
      </span>
    </span>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The orbit is a CSS animation; there are no listeners, timers or effects.

**Reduced motion.** The orbit keeps turning but slows from 900ms to 2400ms per revolution (`motion-reduce:[animation-duration:2400ms]`), since a stopped spinner would read as a frozen app.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not rotate each arc separately. All three share one spinning parent; their offsets come from a static `rotate: -lag`, so the comet shape never drifts apart.
- Do not set the wrapper to `overflow: hidden` or trim the `bleed` inset. The blurred layers extend past the box and would be cut into a square.
- Do not colour it with `fill` or `stroke`. Everything paints in `currentColor`; set a text colour such as `text-white` instead.
- Do not leave both a busy button label and the spinner announced. Pass `aria-hidden` to the spinner inside a pending button so screen readers do not hear "Loading" twice.

## Notes

- The default colour is `text-accent-500`; override it with any `text-*` class.
- `SpinnerGlyph` is exported for places that need the visual without the progress-bar role.

## Definition of done

A md spinner renders a 20px accent ring with a bright arc and rounded head turning clockwise about once every 0.9s, with a soft glow trailing behind the head and a faint full circle underneath. `className="text-white"` turns every layer white. The default spinner exposes `role="progressbar"` named "Loading" with no value; with `aria-hidden` no progressbar role is rendered. Nothing is clipped at any of the five sizes.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
