# Build: Perspective Coverflow Scroller

A horizontal `overflow-x-auto` container with `scroll-snap-type: x proximity`. Each panel's distance from the centre of the viewport is normalised to roughly ±1 and mapped onto a per-element `perspective() translateZ() rotateY() scale()`, so panels turn their inside edge toward you as they leave the middle. The scroll position itself is never animated by JavaScript — momentum, rubber-banding and keyboard paging are the browser's.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Panels turn away from the centre in real 3D as you scroll a native container — no tween, no loop.

- Category: layout
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. A measure pass caches each panel's layout centre as `panel.offsetLeft + panel.offsetWidth / 2` and sets the track's left and right padding to `(scroller.clientWidth - endPanel.offsetWidth) / 2`, which is exactly enough runway for the first and last panel to reach the middle of the viewport.
2. On every coalesced scroll frame, the normalised offset is `r = clamp((centre - scrollLeft - half) / half, -1.2, 1.2)` where `half = scroller.clientWidth / 2`. `r = 0` is dead centre, `r = ±1` is one half-viewport out.
3. That single scalar drives four things: `rotateY = -rotation * r` (negative, so a panel on the right turns its left edge toward you — the flip-book read), `translateZ = -depth * |r|` (always receding), `scale = 1 - scaleFalloff * min(|r|, 1)`, and `opacity = 1 - opacityFalloff * min(|r|, 1.2)`.
4. `perspective(1300px)` is written inside each panel's own transform rather than as a `perspective` property on the track. A shared parent perspective gives every panel the same vanishing point, so panels near the edges skew as well as rotate; per-element perspective turns each panel about its own centre.
5. The two clamps differ on purpose — `min(|r|, 1)` for scale and `min(|r|, 1.2)` for opacity — so distant panels keep their proportions while continuing to fade out.
6. A `ResizeObserver` on the track re-runs the measure pass whenever content size changes (a font swap, a child growing), which is the deterministic replacement for the usual pile of `setTimeout(recompute, 300)` calls.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `perspective = 1300`
  Per-element perspective distance in px. Under ~700 the foreshortening is strong enough that a 40° turn hides most of the panel; over ~2000 the rotation flattens out and reads as a skew rather than a turn.
- `rotation = 40`
  Degrees of `rotateY` at the clamp. 40° is the point where the panel is visibly turned but still legible; past ~55° it is close enough to edge-on that text disappears and antialiasing on the near edge gets ugly.
- `depth = 130`
  Pixels of `translateZ`, always negative so off-centre panels recede. Combined with the rotation this is what makes the row read as the inside of a cylinder rather than a fanned deck. At 0 you get a pure hinge; past ~250 the far panels shrink faster than `scaleFalloff` intends and the two cues disagree.
- `scaleFalloff = 0.12`
  A panel at one half-width out renders at 0.88. Kept small because `translateZ` is already shrinking it perspectivally — stacking a large explicit scale on top double-counts the distance.
- `opacityFalloff = 0.35`
  The edge panels land near 0.58, not 0. They must stay readable, because on a proximity-snap track they are the affordance that tells you there is more to scroll to.
- `maxOffset = 1.2`
  Clamp on `r`. Without it, a long track keeps rotating panels past 90° and they flip to their back faces; 1.2 rather than 1.0 leaves a little travel past the half-width mark so the outermost visible panels are not all frozen at an identical angle.

## API

```ts
function PerspectiveCoverflowScroller(props: { children: ReactNode; perspective?: number; rotation?: number; depth?: number; scaleFalloff?: number; opacityFalloff?: number; maxOffset?: number; initialIndex?: number; className?: string; panelClassName?: string; 'aria-label'?: string }): JSX.Element
```

- `children: ReactNode`
  One panel per child. Each is wrapped in a snap-aligned cell.
- `perspective: number` — default `1300`
  Per-element perspective distance in px.
- `rotation: number` — default `40`
  Degrees of `rotateY` at the clamp.
- `depth: number` — default `130`
  Pixels of `translateZ` at the clamp. Applied negatively, so panels recede.
- `scaleFalloff: number` — default `0.12`
  How much a panel shrinks one half-viewport out.
- `opacityFalloff: number` — default `0.35`
  How much a panel fades one half-viewport out.
- `maxOffset: number` — default `1.2`
  Clamp on the normalised offset, so distant panels stop turning further.
- `initialIndex: number`
  Panel centred on mount. Defaults to the middle of the set.
- `className: string`
  Merged onto the scroll container.
- `panelClassName: string`
  Merged onto each snap cell. Size the panels here.
- `aria-label: string` — default `'Gallery'`
  Label for the scrollable region, which is focusable for keyboard scrolling.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Cache each panel's layout centre and pad the track so the first and last
 * panel can reach the middle of the viewport.
 *
 * `offsetLeft`/`offsetWidth` are *layout* values: unaffected by `scrollLeft`
 * and, critically, unaffected by the transforms this component writes.
 * Reading `getBoundingClientRect()` in the scroll handler instead would feed
 * each panel's own `scale()` back into the next frame's offset.
 */
const measure = useCallback(() => {
  const scroller = scrollerRef.current;
  const track = trackRef.current;
  if (!scroller || !track) return;

  const panels = panelsRef.current;
  const first = panels[0];
  const last = panels[count - 1];

  // Half a viewport minus half a panel. The source of this technique used a
  // fixed `24vw`, which is wrong for any panel that is not ~52vw wide and
  // wrong for every container that is not the viewport.
  if (first) {
    track.style.paddingLeft = `${Math.max(0, (scroller.clientWidth - first.offsetWidth) / 2)}px`;
  }
  if (last) {
    track.style.paddingRight = `${Math.max(0, (scroller.clientWidth - last.offsetWidth) / 2)}px`;
  }

  // Read after the padding write: the padding moves every offsetLeft.
  centresRef.current = panels.map((panel) =>
    panel ? panel.offsetLeft + panel.offsetWidth / 2 : 0,
  );
}, [count]);

/** Write one transform per panel from the current scroll position. */
const update = useCallback(() => {
  const scroller = scrollerRef.current;
  if (!scroller) return;

  const half = scroller.clientWidth / 2 || 1;
  const scroll = scroller.scrollLeft;
  const panels = panelsRef.current;
  const centres = centresRef.current;

  for (let i = 0; i < panels.length; i += 1) {
    const panel = panels[i];
    const centre = centres[i];
    if (!panel || centre === undefined) continue;

    if (reduced) {
      panel.style.transform = '';
      panel.style.opacity = '';
      continue;
    }

    // Signed, normalised distance from the viewport centre: -1 = one half
    // width to the left, +1 = one half width to the right.
    const r = clamp((centre - scroll - half) / half, -maxOffset, maxOffset);
    const away = Math.abs(r);

    // Perspective lives *in the transform*, not on the parent. A shared
    // parent perspective gives every panel the same vanishing point, so
    // edge panels skew as well as rotate; per-element perspective turns each
    // panel about its own centre, which is the coverflow look.
    panel.style.transform =
      `perspective(${perspective}px) ` +
      `translateZ(${(-depth * away).toFixed(1)}px) ` +
      `rotateY(${(-rotation * r).toFixed(2)}deg) ` +
      `scale(${(1 - scaleFalloff * Math.min(away, 1)).toFixed(3)})`;

    // Two different clamps on purpose: scale bottoms out at 1, opacity keeps
    // going to `maxOffset`. Distant panels stay proportionate while fading.
    panel.style.opacity = (1 - opacityFalloff * Math.min(away, maxOffset)).toFixed(2);
  }
}, [reduced, perspective, rotation, depth, scaleFalloff, opacityFalloff, maxOffset]);

useEffect(() => {
  const scroller = scrollerRef.current;
  if (!scroller) return;

  measure();

  // Start centred on a panel, not on the midpoint of the scroll range: with
  // an even count the midpoint falls in the gap between two panels and the
  // component opens looking like nothing is selected.
  if (!centredRef.current && count > 0) {
    const target = initialIndex ?? Math.floor((count - 1) / 2);
    const centre = centresRef.current[clamp(Math.round(target), 0, count - 1)];
    if (centre !== undefined) {
      scroller.scrollLeft = centre - scroller.clientWidth / 2;
    }
    centredRef.current = true;
  }

  update();

  let frame = 0;
  const onScroll = () => {
    // Coalesce: a trackpad fires `scroll` far more often than the compositor
    // paints, and each handler run writes N transforms.
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };

  scroller.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    scroller.removeEventListener('scroll', onScroll);
    if (frame !== 0) cancelAnimationFrame(frame);
  };
}, [measure, update, count, initialIndex]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the `scroll` listener, cancels any pending `requestAnimationFrame`, and disconnects the track `ResizeObserver`. The shared element observer unregisters the scroller. Inline `transform`/`opacity` written on panels dies with the nodes; no timer or tween outlives the component.

**Reduced motion.** The scroller keeps working exactly as it did — it is a real scroll container, and scrolling is user-driven, not animation. What is removed is the 3D: `transform` and `opacity` are cleared on every panel, so the row renders as a flat, fully opaque filmstrip that still snaps by proximity. Nothing moves that the user did not move.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Computing the offset from `getBoundingClientRect()`. The rect reflects the transform this component just wrote, so each panel's `scale()` feeds back into the next frame's offset and the row slowly drifts to a wrong steady state. `offsetLeft`/`offsetWidth` are layout values — untouched by transforms and by `scrollLeft`.
- Putting `perspective` on the track instead of in each panel's transform. Every panel then shares one vanishing point, so the ones near the edges skew into parallelograms instead of turning.
- Handling `scroll` without coalescing into a frame. A trackpad fires scroll events considerably faster than the compositor paints, and every run writes N style strings for no visible benefit.
- Padding the track with a viewport unit like `24vw`. It is correct for exactly one panel width and one container width; inside a card, a modal or a split layout the end panels can never reach the centre and are permanently unselectable.
- Setting `scroll-snap-type: x mandatory`. Release between two panels and the browser yanks you to one of them, which fights every attempt to scan the row. `proximity` snaps only when you were already close.
- Starting at `scrollLeft = 0`. The first panel is then hard against the left edge with nothing to its left, so the effect is invisible until the user scrolls. Centring on a panel on mount shows the technique in both directions immediately.
- Re-centring on every resize. `scrollLeft` is only assigned once, guarded by a ref — otherwise rotating a phone, or any resize during a scroll, teleports the user back to the middle mid-gesture.

## Notes

- One of three deliberately different carousel techniques here, and the distinctions are the point. This one is **true 3D on a native scroll container**: actual `rotateY` and `translateZ`, and no JavaScript animation drives the scroll at all — the handler only reads a position the browser already set. `wrapping-drum-carousel` is **fake 3D** driven by a tweened JS position with `rotationY: 0, z: 0` pinned, and wraps infinitely via `gsap.utils.wrap`. `percent-slide-carousel` is **flat, bounded, one CSS transition per index change**.
- Choose this one when the set is long, scanning matters more than stepping, and you want native momentum and keyboard support for free. It cannot loop: a native scroll container has real ends.
- Because the panels rotate in 3D, text inside them is composited on a rotated plane and will look softer than flat text. That is inherent to the technique, not a bug to tune away; keep small type out of the panels or accept it.

## Definition of done

On mount a panel sits centred and the ones either side are visibly turned toward it. Drag or trackpad-scroll and the turn follows continuously with no lag and no snap-back; release near a panel and it snaps, release between two and it does not. Scroll to either end and the outermost panel reaches the exact centre of the container. Resize the container and the end padding recomputes so it still can.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
