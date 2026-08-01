# Build: Drifting Smoke Layers

An absolutely-positioned atmosphere layer for the back of a hero or a card. Three oversized elements, each painting two soft radial gradients, blurred and drifting on periods that never line up. It looks like a rendered volumetric pass and costs three composited transforms.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Slow volumetric fog built from blurred radial gradients on three coprime cycles. No texture, no canvas.

- Category: primitive
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Each layer is `position: absolute; inset: -25%`, making it 150% of the container in both axes with the excess hanging off every side. The layer can then translate by ±10% of its own box and scale to 1.55 without ever bringing an edge into the container — an exactly-fitting layer shows a hard corner the moment it moves.
2. A layer paints two `radial-gradient(W% H% at X% Y%, tint, transparent E%)` ellipses at different centres and different alphas. Two overlapping ellipses per layer, six across the stack, produce density variation that a single gradient cannot: the visible boundary between clouds is where two soft fields disagree, not where a gradient stops.
3. `filter: blur(40px | 55px | 70px)` erases the elliptical shape entirely and leaves only the density field. The three different radii are what separate the layers in apparent depth — identical blur reads as three copies of one cloud sliding over each other.
4. One `@keyframes kx-smoke-drift` block serves all layers. Its two poses read `translate(var(--kx-smoke-x0), var(--kx-smoke-y0)) scale(var(--kx-smoke-s0)) rotate(0deg)` and the matching `…-x1/-y1/-s1/-r`; custom properties resolve per element, so each layer walks a different path through the same cycle without a keyframe block of its own.
5. The periods are 16s, 22s and 29s. The combined pattern only repeats at lcm(16, 22, 29) = 5104 seconds, roughly 85 minutes, so no viewer will ever see it loop. Equal periods repeat every cycle and the fog reads as a looping video.
6. Only `transform` and `opacity` are animated. The blurred result of each layer is rasterised once and composited thereafter, so a 70px blur is paid for at paint time, not sixty times a second.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `inset = -25%`
  Makes each layer 150% of the container. Worst case is scale 1.55 plus a 10% self-relative translate plus an 11deg rotation; 25% of overflow on each side covers all three with room left. At -10% the corner of the largest layer swings into view during the rotation.
- `periods = 16s / 22s / 29s`
  Chosen so lcm(16, 22, 29) = 5104s. Any pair sharing a factor collapses the combined period — 16/24/32 repeats every 96 seconds and is clearly a loop. 29 is prime, which is what pushes the total past an hour.
- `blur radii = 40px / 55px / 70px`
  Different radii are the depth cue. Below ~25px the elliptical shape of the gradient survives the blur and the fog reads as coloured blobs; above ~90px the layer flattens into an even wash with no internal structure and the drift stops being visible.
- `layer opacities = 0.55 / 0.40 / 0.30`
  Descending with distance. The three layers composite multiplicatively against the background, so equal opacities stack to an opaque haze; the falloff keeps total coverage under about 0.75 and preserves whatever sits behind.
- `scale range = 1.25 to 1.55`
  The breathing. Under about 1.15 the scale change is imperceptible next to the translation; over about 1.8 the browser re-rasterises the blurred layer at the new scale, which shows as a visible sharpness pop mid-cycle.
- `gradient edge stops = 60% to 70%`
  Where each ellipse reaches full transparency, relative to its own size. Below ~50% the falloff is steep enough that the blur cannot hide the ellipse; at 100% the gradient never fully clears and the layer becomes a flat tint with a bright spot.

## API

```ts
function DriftingSmokeLayers(props: { layers?: 1 | 2 | 3; tint?: string; intensity?: number; speed?: number; className?: string }): JSX.Element
```

- `layers: 1 | 2 | 3` — default `3`
  How many layers to render. Fewer layers, less depth and less fill-rate.
- `tint: string` — default `'var(--smoke-tint, currentColor)'`
  Any CSS colour. Mixed down per blob with `color-mix`.
- `intensity: number` — default `1`
  Multiplies every layer opacity. Below 1 for fog behind text.
- `speed: number` — default `1`
  Multiplies every period. 2 is half speed; the periods stay coprime under any multiplier.
- `className: string`
  Merged onto the wrapper via `cn`. Use it to change the inset or add a mask.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/* Hand-tuned rather than seeded-random: these are the poses, not samples from
   a distribution, and a PRNG here would only make them harder to adjust. */
const LAYER_SPECS: readonly LayerSpec[] = [
  {
    durationS: 16,
    blurPx: 40,
    opacity: 0.55,
    fromX: '-8%',
    fromY: '-6%',
    fromScale: 1.25,
    toX: '10%',
    toY: '8%',
    toScale: 1.45,
    rotateDeg: 8,
    blobs: [
      { w: 40, h: 50, x: 70, y: 30, alpha: 55, edge: 60 },
      { w: 45, h: 55, x: 30, y: 65, alpha: 40, edge: 62 },
    ],
  },
  {
    durationS: 22,
    blurPx: 55,
    opacity: 0.4,
    fromX: '6%',
    fromY: '4%',
    fromScale: 1.3,
    toX: '-9%',
    toY: '-7%',
    toScale: 1.5,
    rotateDeg: -11,
    blobs: [
      { w: 55, h: 45, x: 25, y: 35, alpha: 45, edge: 64 },
      { w: 50, h: 60, x: 75, y: 70, alpha: 32, edge: 66 },
    ],
  },
  {
    durationS: 29,
    blurPx: 70,
    opacity: 0.3,
    fromX: '-4%',
    fromY: '7%',
    fromScale: 1.35,
    toX: '8%',
    toY: '-9%',
    toScale: 1.55,
    rotateDeg: 6,
    blobs: [
      { w: 60, h: 60, x: 50, y: 20, alpha: 38, edge: 68 },
      { w: 48, h: 52, x: 20, y: 80, alpha: 28, edge: 70 },
    ],
  },
];

const SMOKE_CSS = `
/* One keyframe block for every layer. The transform endpoints are read from
   custom properties, which are resolved per element, so each layer follows a
   different path through the same two-pose cycle. */
@keyframes kx-smoke-drift {
  0%, 100% {
    transform:
      translate(var(--kx-smoke-x0), var(--kx-smoke-y0))
      scale(var(--kx-smoke-s0))
      rotate(0deg);
  }
  50% {
    transform:
      translate(var(--kx-smoke-x1), var(--kx-smoke-y1))
      scale(var(--kx-smoke-s1))
      rotate(var(--kx-smoke-r));
  }
}

.kx-smoke {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  /* Cuts the layers out of the page's paint and layout tree entirely. Without
     it the browser considers the oversized blurred children when computing
     the ancestor's ink overflow on every frame. */
  contain: paint;
}

.kx-smoke-layer {
  position: absolute;
  /* 150% of the container in both axes. A layer that exactly fits would show
     a hard edge the instant it translates. */
  inset: -25%;
  background: var(--kx-smoke-bg);
  filter: blur(var(--kx-smoke-blur));
  opacity: var(--kx-smoke-opacity);
  animation: kx-smoke-drift var(--kx-smoke-dur) ease-in-out infinite;
  will-change: transform;
}

/* Reduced motion parks every layer on its 50% pose rather than its 0% pose.
   The 50% pose is the fuller, more composed frame; 0% is where the layers are
   most nearly stacked, which reads as a single flat wash. */
@media (prefers-reduced-motion: reduce) {
  .kx-smoke-layer {
    animation: none;
    will-change: auto;
    transform:
      translate(var(--kx-smoke-x1), var(--kx-smoke-y1))
      scale(var(--kx-smoke-s1))
      rotate(var(--kx-smoke-r));
  }
}
`;

/** Two offset ellipses per layer. Percentages keep it resolution-independent. */
function backgroundFor(spec: LayerSpec, tint: string): string {
  return spec.blobs
    .map(
      (b) =>
        `radial-gradient(${b.w}% ${b.h}% at ${b.x}% ${b.y}%, ` +
        `color-mix(in oklab, ${tint} ${b.alpha}%, transparent), transparent ${b.edge}%)`,
    )
    .join(', ');
}

export function DriftingSmokeLayers({
  layers = 3,
  tint = 'var(--smoke-tint, currentColor)',
  intensity = 1,
  speed = 1,
  className,
}: DriftingSmokeLayersProps) {
  return (
    <>
      <style href="kinetic-drifting-smoke-layers" precedence="medium">
        {SMOKE_CSS}
      </style>
      <div className={cn('kx-smoke', className)} aria-hidden="true">
        {LAYER_SPECS.slice(0, layers).map((spec) => {
          const style: StyleWithVars = {
            '--kx-smoke-bg': backgroundFor(spec, tint),
            '--kx-smoke-blur': `${spec.blurPx}px`,
            '--kx-smoke-opacity': spec.opacity * intensity,
            '--kx-smoke-dur': `${spec.durationS * speed}s`,
            '--kx-smoke-x0': spec.fromX,
            '--kx-smoke-y0': spec.fromY,
            '--kx-smoke-s0': spec.fromScale,
            '--kx-smoke-x1': spec.toX,
            '--kx-smoke-y1': spec.toY,
            '--kx-smoke-s1': spec.toScale,
            '--kx-smoke-r': `${spec.rotateDeg}deg`,
          };
          return <span key={spec.durationS} className="kx-smoke-layer" style={style} />;
        })}
      </div>
    </>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. No listeners, no timers, no animation frames, no observers. Unmounting removes the elements and the CSS animations with them; React removes the hoisted `<style>` when the last instance unmounts.

**Reduced motion.** A `@media (prefers-reduced-motion: reduce)` block sets `animation: none` and applies each layer's 50% pose as a static transform, so the fog is still there, still layered, still at full density — it simply stops drifting. `will-change` is reset to `auto` in the same block so the three large blurred layers are not held in compositor memory for an animation that is not running.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Animating `filter: blur()` itself, or animating the gradient stops. Both force the layer to be re-blurred every frame — a 70px blur over a 150%-size layer is tens of milliseconds of GPU work per frame and the whole page drops to single-digit FPS. Animate the transform of an already-blurred layer instead.
- Giving the layers the same duration with different delays. A delay does not decorrelate anything: after the first cycle every layer is at the same phase offset forever, and the stack visibly repeats on the shared period. The periods themselves have to be coprime.
- Sizing the layers to the container. At `inset: 0` the blur samples transparent pixels beyond the element box, so the fog fades out at exactly the container edge and the effect reads as a rectangle of smoke rather than smoke seen through a window.
- Omitting `overflow: hidden` on the wrapper. The layers are 150% of the container by design and will paint over neighbouring content, including through a parent with its own background.
- Leaving off `pointer-events: none`. The layer covers the whole container, so every button underneath stops being clickable and the cause is invisible in the DOM inspector unless you notice the transparent sibling on top.
- Setting `will-change: transform` and leaving it set under reduced motion. `will-change` promotes the element to its own compositor layer permanently; with the animation switched off that is three large blurred textures held in GPU memory for nothing. The reduced-motion block resets it to `auto`.

## Notes

- The component is `position: absolute; inset: 0`, so it expects a positioned ancestor and contributes nothing to layout. Put it as the first child of the section it should sit behind and give that section `position: relative`.
- `contain: paint` on the wrapper keeps the oversized blurred children out of the ancestor ink-overflow calculation, which otherwise runs on every frame of the drift.
- The tint reads `var(--smoke-tint, currentColor)` and is mixed with `color-mix(in oklab, …)`, so the fog inherits the text colour by default and can be re-themed by setting one property on any ancestor. `color-mix` needs Safari 16.2+, Chrome 111+, Firefox 113+.
- Fill-rate is the real cost: three full-container layers at 150% size, blurred. On a low-end phone drop to `layers={2}` — the depth reads almost as well and it removes the widest blur.

## Definition of done

Watch for a full minute: the density pattern never obviously repeats, and no layer edge or gradient ellipse becomes visible at any point in the cycle. Content behind the smoke stays clickable. In a performance profile the frames show composite work only — no repaints of the blurred layers. With reduced motion on, the fog is still present and completely still.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
