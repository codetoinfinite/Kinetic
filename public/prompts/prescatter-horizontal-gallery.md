# Build: Pre-Scatter Horizontal Gallery

A pinned horizontal strip whose media is deliberately off-grid: every item gets a small seeded resting offset, then rides in from ahead of its slot and runs out behind it, rotating through zero on the way past. Two `fromTo` pairs per item — one entry, one exit — measured against the strip's own tween rather than against scroll position, so the choreography is a property of where an item is in the container, not of where the page is.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A pinned strip where each item rests slightly off its slot, flies in from ahead and peels away behind.

- Category: scroll
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. The component owns a `PinnedHorizontalTrack` and captures its `onTrack` payload in state. The strip's tween is built in the child's effect and therefore arrives one commit late, which is why it is state and not a ref — the arrival has to re-run the builder.
2. Every `[data-scatter]` element draws one value from `createRng(seed)`: `rest = (rng() - 0.5) * scatter`, a resting `xPercent` offset. It is applied with `gsap.set` for every item whether or not it animates, so the composition is identical with motion on and off.
3. The entry is `fromTo(el, { xPercent: rest + sweep, yPercent: dir * lift, rotation: dir * rotation }, { xPercent: rest, yPercent: 0, rotation: 0 })` scrubbed over `left 110%` to `left 65%` — the item lags behind its slot and catches up as it crosses the container.
4. The exit is the mirror: `fromTo(el, { xPercent: rest, yPercent: 0, rotation: 0 }, { xPercent: rest - sweep, yPercent: -dir * lift, rotation: -dir * rotation })` over `right 35%` to `right -10%`, with `immediateRender: false` so it does not overwrite the entry's from-state at creation.
5. `dir` alternates by index parity, so odd items throw up and rotate clockwise while even items do the opposite, and the rotation passes continuously through zero between the two ranges.
6. Both triggers take `containerAnimation: track.animation` and horizontal position keywords, so ScrollTrigger measures each item along the strip's timeline instead of down the page.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `scatter = 32`
  Total resting spread as a percentage of the item's own width, i.e. ±16%. Below ~10 the grid still reads as a grid and the effect is invisible; above ~50 items collide with their neighbours' captions and it reads as a layout bug rather than a composition.
- `sweep = 400`
  Horizontal lag on entry and lead on exit, as a percentage of item width. Four widths is enough that the item is genuinely off-stage at the start of its range, so the catch-up is a travel rather than a nudge. Under ~150 the item is already visible when its tween begins and appears to jerk into place.
- `lift = 150`
  Vertical throw as a percentage of item height. At 100 the item starts exactly one height away, so its edge is still touching the frame; 150 clears the frame with margin, which is what makes it read as flying in rather than sliding.
- `rotation = 40°`
  Peak tilt. Under ~15° the rotation is mistaken for a rendering artefact; past ~60° the item is legibly upside-down at the extremes and text inside it becomes unreadable during the travel.
- `ENTER_START / ENTER_END = 'left 110%' / 'left 65%'`
  The item's leading edge, measured along the container. Starting past 100% means the tween begins before the item is visible, so nothing pops in already moving. Ending at 65% leaves the middle third of the crossing settled.
- `EXIT_START / EXIT_END = 'right 35%' / 'right -10%'`
  The trailing edge. Ending below 0% carries the item fully past the left frame before the tween completes, so it never freezes half-visible at the edge. The two ranges cannot overlap for any item narrower than 1.3 containers.
- `item scrub = true`
  Locked to the container animation, not a number. These triggers read the strip's progress, and the strip already scrubs with a second of catch-up, so a numeric scrub here smooths an already-smoothed signal and the items swim behind the panels they belong to.

## API

```ts
function PrescatterHorizontalGallery(props: { children: ReactNode; scroller?: RefObject<HTMLElement | null>; seed?: number | string; scatter?: number; rotation?: number; lift?: number; sweep?: number; scrub?: number; className?: string; trackClassName?: string }): JSX.Element
```

- `children: ReactNode`
  Panels for the strip. Give each a width and `shrink-0`, and mark the media inside `data-scatter`.
- `scroller: RefObject<HTMLElement | null>`
  Scroll container the triggers read. Omit for the document.
- `seed: number | string` — default `'gallery'`
  Anything hashable. The same seed rebuilds the same composition.
- `scatter: number` — default `32`
  Total resting spread as a percentage of item width.
- `rotation: number` — default `40`
  Peak tilt in degrees, alternating by index.
- `lift: number` — default `150`
  Vertical throw as a percentage of item height.
- `sweep: number` — default `400`
  Horizontal lag and lead as a percentage of item width.
- `scrub: number` — default `1`
  Seconds of catch-up on the strip, forwarded to the pinned track.
- `className: string`
  Merged onto the gallery wrapper.
- `trackClassName: string`
  Merged onto the moving strip.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * The item's leading edge crosses the container from just off the right
 * (110%) to two thirds in (65%), and its trailing edge leaves from a third in
 * (35%) to just past the left (-10%). The two ranges cannot overlap for any
 * item narrower than 1.3 containers, so every item gets a settled window in
 * the middle where it is simply itself.
 */
const ENTER_START = 'left 110%';
const ENTER_END = 'left 65%';
const EXIT_START = 'right 35%';
const EXIT_END = 'right -10%';

export function PrescatterHorizontalGallery({
  children,
  scroller,
  seed = 'gallery',
  scatter = 32,
  rotation = 40,
  lift = 150,
  sweep = 400,
  scrub = 1,
  className,
  trackClassName,
}: PrescatterHorizontalGalleryProps) {
  const root = useRef<HTMLDivElement>(null);
  // The strip's tween is built in a child's effect, so it arrives one commit
  // late. State, not a ref: the arrival has to re-run the builder below.
  const [track, setTrack] = useState<PinnedTrack | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;

    const containerAnimation = track?.animation;
    const scrollerEl = scroller?.current ?? undefined;

    const ctx = gsap.context(() => {
      const targets = Array.from(rootEl.querySelectorAll<HTMLElement>('[data-scatter]'));
      const rng = createRng(seed);

      targets.forEach((el, i) => {
        // Drawn for every item whether or not it animates, so adding motion
        // never shifts the resting composition.
        const rest = (rng() - 0.5) * scatter;
        // Parity, not the generator: alternating up/down and cw/ccw is a
        // rhythm, and a random sign clumps three the same way and looks broken.
        const dir = i % 2 === 0 ? 1 : -1;

        gsap.set(el, { xPercent: rest });
        // The resting scatter is layout. Under reduced motion the composition
        // survives and only the flight is dropped.
        if (reduced || !containerAnimation) return;

        gsap.fromTo(
          el,
          { xPercent: rest + sweep, yPercent: dir * lift, rotation: dir * rotation },
          {
            xPercent: rest,
            yPercent: 0,
            rotation: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              scroller: scrollerEl,
              containerAnimation,
              start: ENTER_START,
              end: ENTER_END,
              // `true`, not a number. The strip already scrubs with catch-up,
              // and these triggers read the strip's progress rather than the
              // scrollbar, so they inherit that smoothing. A second scrub
              // value smooths the smoothed signal and the items swim.
              scrub: true,
            },
          },
        );

        gsap.fromTo(
          el,
          { xPercent: rest, yPercent: 0, rotation: 0 },
          {
            xPercent: rest - sweep,
            yPercent: -dir * lift,
            rotation: -dir * rotation,
            ease: 'none',
            // The single most important line here. A `fromTo` renders its
            // from-state at creation, so without this the exit immediately
            // overwrites the entry's from-state — every item starts on the
            // grid instead of off-stage, and the entry appears not to exist.
            immediateRender: false,
            scrollTrigger: {
              trigger: el,
              scroller: scrollerEl,
              containerAnimation,
              start: EXIT_START,
              end: EXIT_END,
              scrub: true,
            },
          },
        );
      });
    }, rootEl);

    return () => ctx.revert();
  }, [track, scroller, seed, scatter, rotation, lift, sweep, reduced]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** One `gsap.context` scoped to the root holds the `set` calls and both tweens per item, so `ctx.revert()` kills every tween, kills every ScrollTrigger, and strips the inline transforms back off the media. It runs on unmount and on every dependency change, including the commit where the strip's tween arrives.

**Reduced motion.** The resting scatter is still applied — it is layout, not motion, and the gallery is supposed to look deliberately off-grid. What is dropped is the flight: no entry or exit triggers are created, so every item sits at its offset from first paint. The pinned track also declines to pin, so the strip becomes a horizontally scrollable row and every item stays reachable.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using `gsap.to` for the exit. A `to` records its start values when it is created, which is after the entry has already rendered its from-state — so the exit animates from `xPercent: rest + sweep` and the item never returns to its slot.
- Using a second `fromTo` for the exit without `immediateRender: false`. A `fromTo` writes its from-state immediately, so the later tween wins and every item starts on the grid: the entry animation exists, runs, and is invisible.
- Keeping vertical position keywords with a `containerAnimation`. `start: "top 110%"` on a horizontal container resolves to a position the element never occupies. No error, no warning, no animation — the items simply arrive pre-placed.
- Measuring the scatter in pixels off the container width. It has to be recomputed on every ScrollTrigger refresh or the composition creeps as the window resizes; expressed as `xPercent` it resolves against the element and never needs invalidating.
- `Math.random()` for the offsets. The server and the client disagree at hydration, and the composition is different on every reload, so nobody can tell a regression from a reroll.
- Building the item triggers before the strip's tween exists. Treating `undefined` as "no container animation" builds a full set of vertical triggers on horizontal content and tears them down on the next commit — a visible flash of items that were already in place.
- Alternating direction from the generator instead of from the index. A random sign lands three items the same way often enough to look like a bug, where parity always reads as rhythm.

## Notes

- Mark the media, not the panel: `data-scatter` on an inner element lets the panel keep the caption on the grid while the image drifts off it.
- ScrollTrigger forbids `pin` on a trigger that has a `containerAnimation`. The strip's section is pinned by `PinnedHorizontalTrack`; the items riding it are never pinned.
- Panels need `overflow: visible` for the sweep to be seen. Clipping happens once, at the pinned section's edge.

## Definition of done

Scroll into the section: it pins, the strip travels sideways, and each item swings in from ahead of its slot, straightens, holds through the middle of the crossing, then tilts the other way and runs out to the left. Scroll back up and every item reverses along the same path. Note that no two items rest exactly on the grid, and that reloading gives the identical composition. With reduced motion on, the items are already at their offsets and the strip can be swiped by hand.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
