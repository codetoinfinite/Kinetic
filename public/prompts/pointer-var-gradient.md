# Build: Pointer-Variable Gradient

A radial gradient declared once in CSS reads its centre from `--pointer-x` and `--pointer-y`. The pointer handler does nothing but write those two properties as percentages. There is no animation frame, no tween library and no `background` string assembled in JavaScript.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A soft glow tracks the pointer through two CSS custom properties. No rAF, no tween, no string rebuilding.

- Category: cursor
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The gradient — its size, colour, stops and the layer underneath it — is declared once on the element. The only thing JavaScript ever writes is two custom properties, so the style engine invalidates the paint of one gradient rather than re-parsing a `background` shorthand it has already parsed thousands of times.
2. Values are written as percentages, not pixels. A percentage in a gradient position resolves against the element box, so the glow stays put relative to the panel across a resize with no resize listener and no recomputation — the value that was correct before the resize is still correct after it.
3. There is deliberately no `requestAnimationFrame`. A custom-property write is not a layout read, so there is nothing to batch away from; the browser already coalesces style changes into the next paint. Wrapping this in a frame loop adds one frame of latency and buys nothing measurable.
4. There is deliberately no tween. Smoothing the glow would mean owning a value between the pointer and the gradient, which means a frame loop, which is the cost this component exists to avoid. A 38rem glow is so diffuse that a few pixels of jitter are invisible — the smoothing would be paying for something no one can see.
5. Leaving removes the properties rather than writing the rest position back, so the fallback declared in the inline `style` takes over and the resting position is stated in exactly one place.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `REST_X / REST_Y = '50%' / '38%'`
  Where the glow sits before any pointer has been seen, and where it returns to on leave. Slightly above centre because a glow that sits dead-centre behind a headline reads as a lighting mistake, while one a little high reads as a source above the frame.
- `glowWidth / glowHeight = '38rem' / '30rem'`
  Wider than tall, matching the aspect of most content blocks. Sizing in rem rather than % means the glow keeps its physical size on a small panel instead of shrinking to a hotspot — a percentage-sized gradient in a 320px preview looks like a different effect entirely.
- `intensity = 0.09`
  Peak accent opacity at the centre. Under ~0.05 it is indistinguishable from a gradient banding artefact; over ~0.2 it stops being ambient light and becomes a coloured blob that competes with the text it is behind.
- `transparent 68% = 68%`
  Where the glow reaches zero. Ending short of 100% keeps the falloff inside the gradient box so the edge is never visible as a circle boundary against the panel edge.

## API

```ts
function PointerVarGradient(props: { children?: ReactNode; glowWidth?: string; glowHeight?: string; intensity?: number; className?: string }): JSX.Element
```

- `children: ReactNode`
  Content rendered over the gradient.
- `glowWidth: string` — default `'38rem'`
  Horizontal radius of the glow, any CSS length.
- `glowHeight: string` — default `'30rem'`
  Vertical radius of the glow, any CSS length.
- `intensity: number` — default `0.09`
  Peak accent opacity at the glow centre, 0..1.
- `className: string`
  Merged onto the root container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Where the glow sits before the pointer has ever been seen. */
const REST_X = '50%';
const REST_Y = '38%';

export function PointerVarGradient({
  children,
  glowWidth = '38rem',
  glowHeight = '30rem',
  intensity = 0.09,
  className,
}: PointerVarGradientProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    /* Fine pointers only. On touch a `pointermove` exists only during a drag,
       so the glow would be pinned under the finger that is scrolling the page
       and then abandoned there on lift — worse than not moving at all. The
       rest position set in the inline style stays, so touch users still get a
       composed gradient. */
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      /* Percentages, not px. The gradient position resolves against the
         element box, so a percentage survives a resize with no listener and
         no recalculation — the glow stays where it was relative to the panel
         even if the panel changes size between moves. */
      el.style.setProperty(
        '--pointer-x',
        `${((e.clientX - rect.left) / rect.width) * 100}%`,
      );
      el.style.setProperty(
        '--pointer-y',
        `${((e.clientY - rect.top) / rect.height) * 100}%`,
      );
    };

    const onLeave = () => {
      /* Removing the property rather than writing the rest value back lets the
         inline `style` fallback take over, so the resting position is declared
         in exactly one place. */
      el.style.removeProperty('--pointer-x');
      el.style.removeProperty('--pointer-y');
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.style.removeProperty('--pointer-x');
      el.style.removeProperty('--pointer-y');
    };
  }, []);

  /* The gradient definition lives here and only here. The handler above never
     mentions colours, sizes or stops — it only moves the centre.

     No `transition`: an unregistered custom property is an untyped token, so
     the browser cannot interpolate it and a transition on the gradient would
     silently do nothing. Making the leave ease would mean registering the
     properties with `@property { syntax: '<percentage>' }` in a stylesheet,
     which is a real option but not a free one. The snap back is acceptable
     here because the glow at rest is barely above the background. */
  const style = {
    '--pointer-x': REST_X,
    '--pointer-y': REST_Y,
    backgroundImage: `radial-gradient(${glowWidth} ${glowHeight} at var(--pointer-x) var(--pointer-y), color-mix(in oklab, var(--k-accent) ${Math.round(
      intensity * 100,
    )}%, transparent), transparent 68%)`,
  } as CSSProperties;
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the two pointer listeners and removes both custom properties from the element, so a remount starts from the declared rest position rather than inheriting the last pointer location. Nothing else was ever allocated — no frame loop, no tween, no observer.

**Reduced motion.** Unchanged, and intentionally so. Nothing here animates: the gradient centre tracks the pointer one-to-one with no easing, no inertia and no continuing motion after input stops. Suppressing it would remove a hover affordance rather than a motion effect.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Rebuilding the whole `background` string in JavaScript on every move. The browser re-parses every layer, including the static one, and you have moved a CSS declaration into a hot event handler where it will drift out of sync with the stylesheet.
- Expecting a `transition` on the gradient to smooth the leave. An unregistered custom property is an untyped token and cannot be interpolated, so the transition silently does nothing and there is no warning anywhere. Smoothing requires `@property { syntax: "<percentage>"; inherits: false; initial-value: 50% }` in a real stylesheet.
- Writing pixel values instead of percentages. They are correct only until the element resizes, at which point the glow is offset by however much the box changed and stays wrong until the next pointer move.
- Wrapping the write in `requestAnimationFrame`. It adds a frame of latency to a write that was never the bottleneck. rAF batching is for handlers that read layout; this one does not.
- Setting the properties on `document.documentElement` instead of the element. Every subtree that uses the same variable names then responds to a pointer that is nowhere near it, and two instances on one page fight over the same two globals.
- Reading `getBoundingClientRect()` and caching it. The rect is cheap here because nothing in this component writes layout, so there is no forced reflow to avoid — but a cached rect goes stale on scroll, which is the actual bug people ship trying to optimise this.

## Notes

- Gated on `(pointer: fine)`. On touch no listener attaches at all: `pointermove` only fires mid-drag, so the glow would follow the finger that is scrolling and be abandoned wherever it lifted. The inline rest position remains, so touch users get a composed static gradient rather than a blank panel.
- No reduced-motion branch is needed and none is present. There is no animation to reduce — the glow does not move on its own, does not ease, and does not persist after the pointer leaves. It is a hover state that happens to be continuous.
- The glow colour is `color-mix(in oklab, var(--k-accent) N%, transparent)` so it follows the category accent and the light/dark theme without a second code path.
- This is the cheapest component in the cursor category. If an effect can be expressed this way it should be, and the interesting question about any pointer effect is why it cannot.

## Definition of done

Move across the panel and a soft accent glow follows the pointer exactly, with no lag and no easing. Leave and it snaps back above centre. Resize the panel while the pointer is stationary and the glow stays in the same relative position rather than sliding. Open DevTools and confirm the element has exactly two inline custom properties changing and that no `background` or `background-image` value is being rewritten. On touch the glow never moves.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
