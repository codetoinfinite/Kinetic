# Build: Mixed Scrub Depth Layers

Elements marked with a depth index get two things from that index: how far they travel, and how much they lag. The travel is ordinary parallax; the lag — a different `scrub` value per depth — is what keeps the planes visibly apart while the eye is moving and lets them converge at rest. Works on a vertical page and, given a horizontal strip's tween, along that strip instead.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Layers separate while you scroll and converge when you stop, because each depth has its own scrub.

- Category: scroll
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. Each `[data-depth]` element is read once: `depth = clamp(parseInt(dataset.depth), 0, ladder.length - 1)`, so bad or missing markup lands on the nearest plane rather than throwing.
2. Distance comes from the normalised depth: `amount = (depth / (ladder.length - 1)) * travel`, tweened `fromTo(-amount → +amount)` in `yPercent` so it is relative to the element's own height and survives any layout.
3. Lag comes from the ladder: `scrub = ladder[depth]`, giving 0 / 0.25 / 0.5 / 1 seconds of catch-up across four planes. Depth 0 uses `scrub: true` rather than `scrub: 0`, because ScrollTrigger reads 0 as falsy and would drop scrubbing entirely.
4. The trigger window is the element's full crossing — `top bottom` to `bottom top` — so nothing is ever caught mid-tween on load and every layer is at a defined offset for any scroll position.
5. Passing a `containerAnimation` swaps the position keywords to `left right` / `right left`, so the same ladder drives layers riding a pinned horizontal strip.
6. The ladder array is serialised to a string for the effect dependency list, so a caller passing a fresh literal every render does not rebuild every trigger every render.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `DEFAULT_LADDER = [0, 0.25, 0.5, 1]`
  Seconds of catch-up per plane. Four values is the most the eye separates reliably; a fifth reads as the same distance as the fourth. Doubling at each step keeps the ratio between adjacent planes constant, which is what makes them read as evenly spaced.
- `travel = 26`
  yPercent at the deepest plane, so a tile moves just over a quarter of its own height across the whole crossing. Past ~40 the tiles visibly leave their grid cells and the layout looks broken; below ~10 the parallax is invisible once the lag is doing the work.
- `scrub for depth 0 = true`
  ScrollTrigger treats `scrub: 0` as falsy and turns scrubbing off, which makes the nearest plane a toggle animation instead of a locked one. `true` is the documented spelling of "no catch-up".
- `trigger window = 'top bottom' → 'bottom top'`
  The element's entire crossing of the scroller. A shorter window leaves the layer frozen at a partial offset above and below it, which shows up as a jump the first time it enters.

## API

```ts
function MixedScrubLayers(props: { children: ReactNode; scroller?: RefObject<HTMLElement | null>; containerAnimation?: gsap.core.Animation | null; ladder?: number[]; travel?: number; className?: string }): JSX.Element
```

- `children: ReactNode`
  Markup containing `[data-depth]` elements; 0 is nearest.
- `scroller: RefObject<HTMLElement | null>`
  Scroll container the triggers read. Omit for the document.
- `containerAnimation: gsap.core.Animation | null`
  A horizontal strip tween to measure along. `null` defers until it exists.
- `ladder: number[]` — default `[0, 0.25, 0.5, 1]`
  Seconds of catch-up per depth index. Length defines how many planes exist.
- `travel: number` — default `26`
  yPercent travel at the deepest plane.
- `className: string`
  Merged onto the wrapper.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function MixedScrubLayers({
  children,
  scroller,
  containerAnimation,
  ladder = DEFAULT_LADDER,
  travel = 26,
  className,
}: MixedScrubLayersProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Serialised so a fresh array literal from the caller does not rebuild
  // every trigger on every render.
  const ladderKey = ladder.join(',');

  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl || reduced) return;
    if (containerAnimation === null) return;

    const steps = ladderKey.split(',').map(Number);
    const last = Math.max(1, steps.length - 1);
    const scrollerEl = scroller?.current ?? undefined;
    const horizontal = containerAnimation !== undefined;

    const ctx = gsap.context(() => {
      for (const el of Array.from(rootEl.querySelectorAll<HTMLElement>('[data-depth]'))) {
        const raw = Number.parseInt(el.dataset.depth ?? '0', 10);
        const depth = clamp(Number.isFinite(raw) ? raw : 0, 0, last);
        // Normalised depth drives distance; the ladder drives lag. Distance
        // alone collapses the moment the scroll stops — the lag is what keeps
        // the planes apart while the eye is still moving.
        const amount = (depth / last) * travel;
        const scrub = steps[depth] ?? 0;

        gsap.fromTo(
          el,
          { yPercent: -amount },
          {
            yPercent: amount,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              scroller: scrollerEl,
              // Full-crossing window: the layer starts moving as it enters
              // and stops as it leaves, so no layer is ever mid-jump on load.
              start: horizontal ? 'left right' : 'top bottom',
              end: horizontal ? 'right left' : 'bottom top',
              scrub: scrub === 0 ? true : scrub,
              ...(containerAnimation ? { containerAnimation } : {}),
            },
          },
        );
      }
    }, rootEl);

    return () => ctx.revert();
  }, [scroller, containerAnimation, ladderKey, travel, reduced]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `ctx.revert()` on unmount and on any dependency change kills each layer's tween and ScrollTrigger and strips the inline `transform` GSAP wrote, so a remount measures the authored layout rather than the previous run's offsets.

**Reduced motion.** No triggers are created, so every layer sits at its natural document position with no transform at all. The grid is the same grid — it simply does not separate, which is the point of the setting.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Building parallax from distance alone. Every layer lands on its final offset on the same frame, so the depth cue vanishes the instant scrolling stops and the composition flattens.
- Writing `scrub: 0` for the locked plane. It is falsy, so ScrollTrigger disables scrubbing and the layer plays as a one-shot toggle animation — the one plane that was supposed to be rock solid becomes the one that pops.
- Using `y` in pixels instead of `yPercent`. The offsets stop being proportional to the tiles, so a layout that reads well at desktop width has layers sliding out of their cells on a phone.
- Recreating triggers on every render because the ladder is a fresh array literal in the caller's JSX. The triggers are torn down and rebuilt mid-scroll and the layers snap back to their start offsets.
- Indexing the ladder without a bound. `data-depth="7"` on a four-value ladder yields `undefined`, which GSAP coerces into a scrub of `NaN` and the layer stops responding to scroll entirely.
- Keeping vertical position keywords when a `containerAnimation` is supplied. The trigger measures along the container's axis, so vertical keywords resolve to a position the element never reaches and the layer never moves.

## Notes

- Depth 0 is deliberately motionless. Something in the frame has to be still, or the whole composition reads as drift rather than depth.
- Combine with `pinned-horizontal-track` by feeding its `onTrack` payload's `animation` into `containerAnimation`.

## Definition of done

Scroll through the grid at speed: the tiles visibly separate into distinct planes, the depth-0 tile stays locked to the grid, and the deepest tiles trail furthest behind. Stop scrolling and, within about a second, everything settles into an aligned composition. Scroll backwards and the separation reverses rather than replaying.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
