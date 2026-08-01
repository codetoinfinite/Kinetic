# Build: Wrapping Drum Carousel

Cards sit stacked at the centre of the stage and are pushed outward by their signed distance from a fractional carousel position. That distance is wrapped into a ring, so the sequence has no first or last card and the position variable can drift forever. The drum reads as three-dimensional but every transform is flat: `rotationY` and `z` are pinned to zero on purpose.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An endless carousel that reads as a rotating drum with no 3D at all — only x, scale and fading opacity.

- Category: layout
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. `gsap.utils.wrap(-count / 2, count / 2)` turns `i - pos` into a signed ring offset in `(-count/2, count/2]`. For six cards at `pos = 0`, card 5 resolves to `-1` and renders one slot to the *left* of centre instead of five slots right — this single call is what makes a finite array behave like an endless one.
2. Horizontal placement is `x = offset * step` where `step = min(spacingRatio * stage.clientWidth, maxSpacing)`. Spacing is measured off the stage element, not `window.innerWidth`, so a preview in a grid cell lays out correctly when the grid reflows rather than only when the viewport does.
3. Depth is faked by two curves with deliberately different clamps: `scale = 1 - scaleFalloff * min(distance, 1)` bottoms out one slot from centre, while `autoAlpha = clamp(0, 1, 1.15 - 0.75 * distance)` keeps falling and reaches zero at distance 1.533. Cards therefore fade out *before* they shrink far enough to look wrong, which reads as recession into fog rather than into a vanishing point.
4. `rotationY: 0` and `z: 0` are written on every `gsap.set`. They are not decoration — they stop an ancestor `perspective` or `transform-style: preserve-3d` from turning a deliberately flat drum into a half-broken 3D one that skews at the edges.
5. `zIndex = 100 - round(10 * distance)` is stepped, not continuous, so cards at similar distances do not flicker past each other as `pos` crosses an integer.
6. Drag comes from `useDrag`, which handles pointer capture, an 8 px dead zone and the capture-phase click swallow. `onDrag` divides `deltaX` by the current spacing so the drum tracks the finger 1:1, and `onDragEnd` snaps to `Math.round(pos)` with a 0.7 s `power3.out` tween whose `onUpdate` re-runs the same layout function.
7. The wheel handler accumulates `deltaX` and fires one step per 90 units, capped at 3 steps per event, then discards the remainder — an inertial trackpad flick otherwise keeps queuing steps after the fingers lift.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `spacingRatio = 0.46`
  Card spacing as a fraction of stage width. At 0.46 the neighbours are half-visible at the edges, which is what tells the user there is more to come. Below ~0.3 the cards overlap into a stack; above ~0.6 the neighbours leave the stage and the drum looks like a single card.
- `maxSpacing = 560`
  Upper bound in px. Without it a 3440 px monitor computes 1582 px of spacing and the neighbours are simply gone; the ratio has to stop scaling at roughly the width of one comfortable reading column.
- `scaleFalloff = 0.2`
  Neighbours render at 0.8. Less than ~0.12 and the depth cue disappears; more than ~0.3 and the off-centre cards look like a different component rather than the same one further away.
- `ALPHA_INTERCEPT / ALPHA_SLOPE = 1.15 / 0.75`
  Alpha is `1.15 - 0.75 * distance`. The intercept above 1 keeps the first ~0.2 of travel at full opacity so the centre card does not start dimming the instant you touch it; the slope puts the zero crossing at distance 1.533, comfortably past where scale clamps.
- `SNAP_DURATION = 0.7`
  Seconds for the release snap. Under ~0.45 the settle is abrupt enough that the drum reads as stepped; over ~0.9 a second drag arrives before the first has landed.
- `WHEEL_STEP = 90`
  Accumulated wheel units per index step. Matches roughly one detent on a mouse wheel and one deliberate trackpad swipe; at 40 a single flick advances four cards.
- `MAX_WHEEL_STEPS = 3`
  Ceiling on how many steps one wheel event may fire. A high-resolution trackpad can deliver a `deltaX` of 400+ in one event, which without the cap jumps five cards from a gesture the user read as one.
- `DRAG_THRESHOLD = 8`
  Pixels before a press counts as a drag. Below ~4 a click on a touchpad registers as a drag and the click swallow eats the tap; above ~12 short deliberate flicks are ignored.

## API

```ts
function WrappingDrumCarousel(props: { children: ReactNode; spacingRatio?: number; maxSpacing?: number; scaleFalloff?: number; className?: string; cardClassName?: string; onIndexChange?: (index: number) => void }): JSX.Element
```

- `children: ReactNode`
  One card per child. Each is wrapped in a positioned cell the component controls.
- `spacingRatio: number` — default `0.46`
  Card spacing as a fraction of the stage width.
- `maxSpacing: number` — default `560`
  Ceiling on spacing in pixels, so wide screens do not fling the neighbours off-stage.
- `scaleFalloff: number` — default `0.2`
  How much a card shrinks by one slot out from centre.
- `className: string`
  Merged onto the stage element.
- `cardClassName: string`
  Merged onto every positioned cell. This is where you size the cards.
- `onIndexChange: (index: number) => void`
  Fires on every snap with the wrapped index, always in `0..count-1`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function WrappingDrumCarousel({
  children,
  spacingRatio = 0.46,
  maxSpacing = 560,
  scaleFalloff = 0.2,
  className,
  cardClassName,
  onIndexChange,
}: WrappingDrumCarouselProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<Array<HTMLDivElement | null>>([]);
  /** Fractional carousel position. Tweened by the snap, driven raw by drag. */
  const posRef = useRef({ pos: 0 });
  /** Integer target index. Unwrapped — it counts up forever. */
  const indexRef = useRef(0);
  /** Last computed spacing in px. Drag divides by this for 1:1 tracking. */
  const stepRef = useRef(1);

  const reduced = useReducedMotion();
  const size = useResizeObserver(stageRef);

  const items = Children.toArray(children);
  const count = items.length;

  const notify = useRef(onIndexChange);
  notify.current = onIndexChange;

  /**
   * Lay every card out for the current `pos`. Called on mount, on resize,
   * on every frame of the snap tween, and on every pointermove during a drag.
   * It is a pure function of `pos` — there is no accumulated state in here,
   * which is why interrupting the tween mid-flight cannot desynchronise it.
   */
  const layout = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || count === 0) return;

    const step = Math.min(spacingRatio * stage.clientWidth, maxSpacing);
    stepRef.current = step > 0 ? step : 1;

    // Signed ring offset in (-count/2, count/2]. The whole illusion is here.
    const ring = gsap.utils.wrap(-count / 2, count / 2);
    const pos = posRef.current.pos;

    for (let i = 0; i < count; i += 1) {
      const card = cardsRef.current[i];
      if (!card) continue;

      const offset = ring(i - pos);
      const distance = Math.abs(offset);

      gsap.set(card, {
        xPercent: -50,
        yPercent: -50,
        x: offset * step,
        // Explicitly flat. Without these two, a `transform-style: preserve-3d`
        // or a stray `rotateY` on an ancestor turns a deliberately 2D drum
        // into a half-broken 3D one that skews at the edges.
        rotationY: 0,
        z: 0,
        // Scale bottoms out at one slot out; alpha keeps falling and hits 0 at
        // distance 1.533. Cards therefore fade into fog rather than shrink to
        // a vanishing point — that mismatch is what sells the cylinder.
        scale: 1 - scaleFalloff * Math.min(distance, 1),
        autoAlpha: gsap.utils.clamp(0, 1, ALPHA_INTERCEPT - ALPHA_SLOPE * distance),
        zIndex: 100 - Math.round(10 * distance),
        transformOrigin: '50% 50%',
      });
    }
  }, [count, spacingRatio, maxSpacing, scaleFalloff]);

  /** Tween `pos` to an integer index and re-lay out on every frame. */
  const snapTo = useCallback(
    (index: number) => {
      indexRef.current = index;
      notify.current?.(wrapIndex(index, count));

      if (reduced) {
        // Not "duration 0" via the tween: a zero-duration gsap.to does not
        // guarantee an onUpdate call, so the layout would never run.
        posRef.current.pos = index;
        layout();
        return;
      }

      gsap.to(posRef.current, {
        pos: index,
        duration: SNAP_DURATION,
        ease: 'power3.out',
        overwrite: true,
        onUpdate: layout,
      });
    },
    [count, layout, reduced],
  );

  useDrag(stageRef, {
    threshold: DRAG_THRESHOLD,
    onDragStart: () => {
      // Kill the snap first or it keeps writing `pos` underneath the drag and
      // the cards visibly fight the finger.
      gsap.killTweensOf(posRef.current);
    },
    onDrag: (state) => {
      posRef.current.pos -= state.deltaX / stepRef.current;
      layout();
    },
    onDragEnd: (_state, moved) => {
      if (moved) snapTo(Math.round(posRef.current.pos));
    },
  });
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the wheel listener, kills the tween on the internal position object, kills any tween on the card elements and clears every property GSAP wrote with `clearProps: "all"`. `useDrag` releases pointer capture and removes its own five listeners. Ordering matters: tweens are killed before props are cleared, or an in-flight tween writes the transform straight back.

**Reduced motion.** Drag still tracks the finger 1:1 — direct manipulation is not motion the user did not ask for. What changes is the release: instead of a 0.7 s `power3.out` tween, `pos` is assigned the target index and the layout runs once, so the drum arrives in a single frame. Wheel steps land instantly for the same reason.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Reaching for `rotationY` and `translateZ` to get the drum look. This technique is flat on purpose — real 3D needs a shared or per-element perspective decision, correct `transform-style` on every ancestor, and it renders text on a rotated plane, which is where the blurring comes from. Write `rotationY: 0, z: 0` explicitly so an ancestor cannot opt you into 3D by accident.
- Accumulating position instead of recomputing it. If the layout adds a delta to each card's current transform, interrupting the snap tween mid-flight leaves the cards permanently offset from `pos`. Layout must be a pure function of `pos` and nothing else.
- Using `opacity` instead of `autoAlpha`. At `opacity: 0` the wrapped-around cards are still hit-testable, so a click intended for the centre card lands on an invisible one stacked on top of it. `autoAlpha` also sets `visibility: hidden`, which removes them from hit-testing.
- Forgetting to kill the snap tween on `onDragStart`. The tween keeps writing `pos` underneath the drag and the cards visibly stutter against the finger.
- Calling `preventDefault` on every wheel event. A vertical trackpad scroll over the carousel then does nothing and the page appears frozen. Only the horizontal component is claimed here — `Math.abs(deltaX) > Math.abs(deltaY)` gates the whole handler.
- Registering the wheel listener as passive. `preventDefault` is silently ignored on a passive listener and Chrome logs an "Unable to preventDefault inside passive event listener" warning on every event.
- Computing spacing from `window.innerWidth`. The carousel is then correct on load and wrong the moment it sits inside anything narrower than the viewport — a sidebar, a modal, a preview grid.

## Notes

- This is one of three deliberately different carousel techniques in the registry, and they must not be collapsed into one. This one is **fake 3D driven by a JS position variable**: `gsap.utils.wrap` maps a continuous, unbounded index onto the item count, and depth is scale plus `autoAlpha` only. `perspective-coverflow-scroller` is **true 3D driven by a native scroll container** — real `rotateY`/`translateZ`, no JS loop. `percent-slide-carousel` is **flat percentage translation with a CSS transition** and no wrapping at all.
- Choose this one when the sequence must be endless in both directions and the item count is small enough that every item can stay mounted. It cannot virtualise: every card is laid out on every frame of a drag.
- `touch-action: pan-y` on the stage tells the browser that horizontal gestures belong to the carousel and vertical ones to the page. Without it, dragging on a phone either scrolls the page or forces you to `preventDefault` every `touchmove`, which fights the browser instead of cooperating with it.

## Definition of done

Drag left past the last card and the first one arrives from the right without a gap or a jump. Release mid-way and it settles onto the nearest card. Neighbours are visibly smaller and dimmer, and inspecting a card shows a `matrix()` transform with no 3D component. Scroll the page vertically with the cursor over the carousel and the page scrolls normally; swipe horizontally and the drum steps one card.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
