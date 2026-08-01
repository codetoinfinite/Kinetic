# Build: Rotary Drag Carousel

Items sit at fixed stations around a circle whose hub is below the frame, so only the top arc is ever visible. The gesture is measured in angle rather than pixels: `atan2(y - cy, x - cx)`, differenced through a shortest-signed wrap, so a hand sweeping the top of the wheel turns it by the amount it actually travelled around the hub. Release and it keeps going at the speed it left at, then stops with a station facing up — one motion, no corrective hop.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A wheel of cards you grab and spin. Angular drag, projected inertia, and it always lands on a station.

- Category: layout
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. Layout is a pure function of one number. For wheel angle `A`, station `i` sits at screen angle `theta = A + i * (360 / count) - 90`, at `(cx + R cos theta, cy + R sin theta)`, rotated by the shortest signed distance to the top, `away = wrapRange(theta + 90, -180, 180)`. `A` is unbounded and may be -4000 without consequence, because `away` is the only value that ever needs wrapping.
2. The radius is floored at `1.25 x containerHeight`, which forces the hub `cy = topInset * height + R` strictly below the box. That is a correctness constraint, not a look: `atan2` about a point the user can touch converts a two-pixel wobble near the hub into a hundred degrees of spin.
3. Each `pointermove` computes the pointer's own angle about the hub and adds `wrapRange(current - previous, -180, 180)` to `A`. The wrap is what keeps a drag across the 180° seam from reading as a 359° jerk backwards.
4. Release velocity is measured over a rolling ~70 ms window of `(angle, time)` rather than off the final delta. Because a stationary finger produces no `pointermove` events, the window never advances while the hand is still, and the measured speed decays toward zero on its own — "drag, pause, lift" therefore does not throw.
5. Inertia without a plugin: `power3.out` is `p(t) = 1 - (1 - t)^3`, so `p'(0) = 3`. A tween of duration `D` covering `delta` degrees departs at `3 * delta / D` deg/s, so setting `delta = v * D / 3` makes a plain `gsap.to` continue the gesture at exactly the speed the hand left.
6. That projected landing angle is rounded to a multiple of the station spacing *before* the tween is created, so the throw and the snap are the same tween. Snapping afterwards is a second animation starting from rest — the small hop that gives away a hand-rolled dial.
7. Pointer capture is taken on `pointerdown`, and the release path is one idempotent `finish` guarded on the stored `pointerId`, wired to `pointerup`, `pointercancel` and `lostpointercapture` alike. A drag that ends off-screen still lands.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `MIN_RADIUS_HEIGHT_RATIO = 1.25`
  Radius floor as a multiple of container height, so the hub is always below the visible box. At 1.0 the hub lands exactly on the bottom edge and a press there divides by a near-zero radius; below 1.0 it is reachable and the wheel spins wildly for a pointer that barely moved.
- `POWER3_OUT_SLOPE = 3`
  The initial derivative of `power3.out`, and the divisor in `delta = v * D / 3`. It is exact, not tuned: change the ease and this number changes with it — `power2.out` needs 2, `power4.out` needs 4. Leave it at 3 with a different ease and the throw either undershoots or overshoots by a constant factor.
- `throwDuration = 1.1`
  Seconds of inertial travel. Under ~0.6 s the wheel stops so abruptly that a fast fling feels like it hit a wall; over ~1.6 s the tail is so slow it reads as broken rather than as momentum, and it delays the settle callback past the point anyone is still watching.
- `maxThrow = 260`
  Degrees one throw may carry, applied to the projected distance before snapping. Without a cap, a 900 deg/s fling projects 330° and the wheel makes most of a revolution from a flick — past about 270° the user loses track of which way it went and which station is coming.
- `VELOCITY_WINDOW = 0.07`
  Seconds of gesture history the release speed is averaged over. Shorter and it is effectively the last delta, which is noisy at 120 Hz and jitters the throw distance between identical gestures; much longer and a deliberate slow-down before release is averaged away, so the wheel throws when the user meant to place it.
- `MAX_VELOCITY = 900`
  Degrees per second the measured speed is clamped to. A pointer that jumps (a tab switch mid-drag, a synthetic event, a coalesced move across the hub) can report thousands of deg/s; clamping keeps one bad sample from spinning the wheel several turns.
- `DRAG_THRESHOLD = 5`
  Pixels of travel before a press becomes a drag. Below ~3 the hand tremor in a normal tap counts as a drag, so every tap is swallowed as a gesture; above ~10 a small deliberate nudge of the wheel does nothing at all.
- `CULL_DEG = 96`
  Stations more than this far from the top are `visibility: hidden`. Just past 90° they are behind the horizontal through the hub and outside the box in every supported aspect ratio, so painting them is pure cost; culling at exactly 90° makes the boundary coincide with the fade reaching its floor and items visibly wink out.
- `radiusRatio = 0.78`
  Radius as a fraction of container width, before the height floor. Larger flattens the arc until the wheel reads as a straight row; much smaller pulls the hub up toward the box and the visible arc bends so hard that only three stations fit.
- `fade = 0.85`
  Opacity lost per 90° off the top. The station one step out stays clearly legible, which is the affordance that says the wheel turns; at 1.0 the neighbours reach zero exactly at the cull angle and the wheel looks like it holds one card.

## API

```ts
function RotaryDragCarousel(props: { children: ReactNode; radiusRatio?: number; topInsetRatio?: number; snapDeg?: number; throwDuration?: number; maxThrow?: number; fade?: number; scaleFalloff?: number; initialIndex?: number; className?: string; itemClassName?: string; onIndexChange?: (index: number) => void; 'aria-label'?: string }): JSX.Element
```

- `children: ReactNode`
  One item per child. Each gets a station on the wheel.
- `radiusRatio: number` — default `0.78`
  Wheel radius as a fraction of container width, floored against height so the hub stays below the box.
- `topInsetRatio: number` — default `0.08`
  Where the top of the wheel sits, as a fraction of container height.
- `snapDeg: number`
  Degrees the wheel snaps to. Defaults to one station, `360 / count`.
- `throwDuration: number` — default `1.1`
  Seconds of inertial travel after release.
- `maxThrow: number` — default `260`
  Hard cap on how far one throw may carry, in degrees.
- `fade: number` — default `0.85`
  Opacity lost per 90° away from the top station.
- `scaleFalloff: number` — default `0.22`
  Scale lost at 90° away from the top station.
- `initialIndex: number` — default `0`
  Station facing up on mount. Seeded once, never re-applied.
- `className: string`
  Merged onto the drag surface.
- `itemClassName: string`
  Merged onto every station. Size the items here.
- `onIndexChange: (index: number) => void`
  Fires with the wrapped index of the station that lands facing up.
- `aria-label: string` — default `'Carousel'`
  Label for the focusable wheel, which also takes arrow keys.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Write one transform per station from the current wheel angle. A pure
 * function of `angleRef.current` and the box size — nothing accumulates in
 * here, so interrupting the throw tween mid-flight cannot desynchronise it.
 */
const layout = useCallback(() => {
  const host = hostRef.current;
  if (!host || count === 0) return;

  const width = host.clientWidth;
  const height = host.clientHeight;
  if (width < 1 || height < 1) return;

  const radius = Math.max(radiusRatio * width, height * MIN_RADIUS_HEIGHT_RATIO);
  const cx = width / 2;
  const cy = topInsetRatio * height + radius;
  const angle = angleRef.current;

  for (let i = 0; i < count; i += 1) {
    const station = stationsRef.current[i];
    if (!station) continue;

    // Station i's screen angle. `UP_DEG` puts station 0 at the top when the
    // wheel is at 0, so the maths and the visual agree at rest.
    const theta = angle + i * step + UP_DEG;
    // Shortest signed distance to the top, in (-180, 180]. The wheel is a
    // real circle, so this is the only place wrapping is needed at all —
    // `angle` itself may be -4000 without consequence.
    const away = wrapRange(theta - UP_DEG, -180, 180);
    const distance = Math.abs(away);

    if (distance > CULL_DEG) {
      station.style.visibility = 'hidden';
      continue;
    }

    const rad = theta * DEG_TO_RAD;
    const x = cx + radius * Math.cos(rad);
    const y = cy + radius * Math.sin(rad);
    const t = Math.min(distance / 90, 1);

    station.style.visibility = 'visible';
    // Counter-rotating by `-away` would keep the cards upright; leaving the
    // rotation in is what makes it read as one rigid wheel rather than a row
    // of cards travelling along an arc.
    station.style.transform =
      `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) ` +
      `rotate(${away.toFixed(2)}deg) ` +
      `scale(${(1 - scaleFalloff * t).toFixed(3)})`;
    station.style.opacity = clamp(1 - fade * t, 0, 1).toFixed(3);
    station.style.zIndex = String(100 - Math.round(distance));
  }
}, [count, step, radiusRatio, topInsetRatio, fade, scaleFalloff]);

/** Angle at which station `index` faces up: `angle + index * step = 0`. */
const angleForIndex = useCallback((index: number) => -index * step, [step]);

const report = useCallback(() => {
  if (count === 0) return;
  // `angle = -i * step` puts station i up, so `i = -angle / step`.
  const index = wrapIndex(Math.round(-angleRef.current / step), count);
  if (index === reportedRef.current) return;
  reportedRef.current = index;
  notify.current?.(index);
}, [count, step]);

/**
 * Land the wheel. `velocity` is degrees per second at the moment of release;
 * pass 0 for a keyboard step or a tap.
 */
const settle = useCallback(
  (velocity: number) => {
    const projected =
      angleRef.current +
      clamp(
        (velocity * throwDuration) / POWER3_OUT_SLOPE,
        -maxThrow,
        maxThrow,
      );
    // Round to a station BEFORE tweening. Snapping afterwards is a second
    // animation that starts from rest, which is the little hop that gives
    // away every hand-rolled dial.
    const landing = Math.round(projected / snap) * snap;

    gsap.killTweensOf(angleRef);

    if (reduced || Math.abs(landing - angleRef.current) < 0.01) {
      angleRef.current = landing;
      layout();
      report();
      return;
    }

    gsap.to(angleRef, {
      current: landing,
      duration: throwDuration,
      ease: 'power3.out',
      overwrite: true,
      onUpdate: layout,
      onComplete: report,
    });
  },
  [throwDuration, maxThrow, snap, reduced, layout, report],
);

useEffect(() => {
  const host = hostRef.current;
  if (!host) return;

  let pointerId: number | null = null;
  let lastPointerAngle = 0;
  let pressX = 0;
  let pressY = 0;
  let moved = false;
  let swallowClick = false;
  /** Rolling window: the wheel angle and clock at the start of the window. */
  let sampleAngle = 0;
  let sampleTime = 0;

  const now = () => performance.now() / 1000;

  const pointerAngle = (clientX: number, clientY: number) => {
    const rect = host.getBoundingClientRect();
    const radius = Math.max(
      radiusRatio * rect.width,
      rect.height * MIN_RADIUS_HEIGHT_RATIO,
    );
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + topInsetRatio * rect.height + radius;
    return Math.atan2(clientY - cy, clientX - cx) / DEG_TO_RAD;
  };

  const onPointerDown = (e: PointerEvent) => {
    // One pointer owns the wheel. A second finger arriving mid-throw would
    // otherwise reset the origin angle and the wheel would jump.
    if (pointerId !== null || !e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    pointerId = e.pointerId;
    pressX = e.clientX;
    pressY = e.clientY;
    moved = false;
    lastPointerAngle = pointerAngle(e.clientX, e.clientY);
    sampleAngle = angleRef.current;
    sampleTime = now();

    // Capture on press, not once the threshold is crossed: by then the
    // pointer may already have left the element, and `pointermove` would
    // have stopped arriving.
    host.setPointerCapture(e.pointerId);
    gsap.killTweensOf(angleRef);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (pointerId !== e.pointerId) return;

    const current = pointerAngle(e.clientX, e.clientY);
    // Shortest signed step. Without the wrap, dragging across the 180°
    // seam reads as a 359° jerk in the wrong direction.
    const delta = wrapRange(current - lastPointerAngle, -180, 180);
    lastPointerAngle = current;

    if (!moved) {
      if (Math.hypot(e.clientX - pressX, e.clientY - pressY) < DRAG_THRESHOLD) return;
      moved = true;
    }

    angleRef.current += delta;
    layout();

    // Retire the velocity window once it is full. Measuring over a window
    // rather than off the last delta is what stops "drag, pause, lift" from
    // throwing the wheel: with no movement there are no events, the window
    // never advances, and the measured speed decays toward zero on its own.
    const t = now();
    if (t - sampleTime > VELOCITY_WINDOW) {
      sampleAngle = angleRef.current;
      sampleTime = t;
    }
  };

  /**
   * Idempotent. Called from `pointerup`, `pointercancel` and
   * `lostpointercapture`, all three of which can be the last event a gesture
   * produces, and at least one of which will always arrive — including when
   * the pointer is released outside the window, or the OS takes it away for
   * a gesture of its own. Guarding on `pointerId` makes the extra calls
   * no-ops instead of a double throw.
   */
  const finish = (e: PointerEvent) => {
    if (pointerId !== e.pointerId) return;
    const id = pointerId;
    pointerId = null;

    const elapsed = now() - sampleTime;
    const velocity =
      moved && elapsed > 0
        ? clamp((angleRef.current - sampleAngle) / elapsed, -MAX_VELOCITY, MAX_VELOCITY)
        : 0;

    swallowClick = moved;
    moved = false;

    if (host.hasPointerCapture(id)) host.releasePointerCapture(id);
    settle(velocity);
  };

  // Capture phase, ahead of any child's own handler. A throw ends with a
  // `click` on whatever happens to be under the pointer, so without this the
  // gesture that spins the wheel also activates a card.
  const onClick = (e: MouseEvent) => {
    if (!swallowClick) return;
    swallowClick = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const direction =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? -1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? 1
          : 0;
    if (direction === 0) return;
    e.preventDefault();
    gsap.killTweensOf(angleRef);
    angleRef.current = Math.round(angleRef.current / snap) * snap + direction * snap;
    settle(0);
  };

  host.addEventListener('pointerdown', onPointerDown);
  host.addEventListener('pointermove', onPointerMove);
  host.addEventListener('pointerup', finish);
  host.addEventListener('pointercancel', finish);
  host.addEventListener('lostpointercapture', finish);
  host.addEventListener('click', onClick, true);
  host.addEventListener('keydown', onKeyDown);

  return () => {
    host.removeEventListener('pointerdown', onPointerDown);
    host.removeEventListener('pointermove', onPointerMove);
    host.removeEventListener('pointerup', finish);
    host.removeEventListener('pointercancel', finish);
    host.removeEventListener('lostpointercapture', finish);
    host.removeEventListener('click', onClick, true);
    host.removeEventListener('keydown', onKeyDown);
    if (pointerId !== null && host.hasPointerCapture(pointerId)) {
      host.releasePointerCapture(pointerId);
    }
    pointerId = null;
  };
}, [layout, settle, snap, radiusRatio, topInsetRatio]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `lostpointercapture`, the capture-phase `click` and `keydown`; releases pointer capture if a gesture is still live at unmount; and kills the throw tween on the angle ref via a separate effect so an in-flight `gsap.to` cannot call `onUpdate` against detached nodes. The shared resize observer unregisters. Nothing but inline styles on the stations remains, and those die with the nodes.

**Reduced motion.** Dragging is unchanged — it is the user's own motion, tracked one-to-one, and removing it would remove the component. What goes away is everything the component would have animated by itself: the inertial throw is not created, so release rounds the current angle to the nearest station and assigns it in one frame, and an arrow key moves one station instantly. The wheel never travels further than the hand did.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Driving the rotation from `deltaX` instead of from an angle. A linear delta turns the wheel by the same amount wherever you grab it, so a drag near the left edge feels geared wrong and a drag straight down the middle does nothing at all. Angular input is what makes it feel like a physical wheel.
- Differencing raw `atan2` output. Crossing the ±180° seam gives a delta of about -359° instead of +1°, and the wheel snaps a full turn backwards once per revolution. Every angle difference here goes through `wrapRange(d, -180, 180)`.
- Putting the hub inside the container. Near the hub the pointer's angular change per pixel goes to infinity, so a press within a few pixels of it and a one-pixel jitter spins the wheel a hundred degrees. The radius floor makes that geometrically impossible rather than guarding it after the fact.
- Taking the release velocity from the last `pointermove`. Drag, hold still for half a second, lift, and the wheel flies off at the speed from before the pause, because the last event recorded was the last time the hand moved. A rolling time window measured against `performance.now()` at release decays to zero on its own.
- Snapping after the inertial tween instead of before it. The throw finishes, comes to rest between two stations, and a second tween hops it into place — two eases back to back, and it is instantly recognisable as fake momentum.
- Calling `setPointerCapture` only after the drag threshold is crossed. By then a fast gesture has already left the element, `pointermove` has stopped arriving, and the wheel sticks at the angle it had when the pointer crossed the boundary.
- Handling only `pointerup`. Release outside the window, let the OS claim the gesture, or have the element re-parented mid-drag and no `pointerup` arrives; the wheel stays captured and frozen mid-throw. `pointercancel` and `lostpointercapture` both route to the same idempotent finish, guarded on the stored `pointerId` so the duplicate is a no-op rather than a second throw.
- Letting the click through. A throw ends with a `click` dispatched on whatever card is under the pointer, so spinning the wheel also opens a project. The click is swallowed in the capture phase, once, only when the gesture actually moved.
- Reaching for `InertiaPlugin`. It is a Club GreenSock plugin — not redistributable, and not installable from a public registry — so a component that depends on it fails to build for most consumers. The `v * D / 3` projection reproduces the throw with the free core.
- Re-seeding `initialIndex` on resize. Rotate a phone mid-gesture and the wheel teleports back to its opening station. The seed is guarded by a ref and runs exactly once.

## Notes

- The counter-rotation is deliberately absent: each card is rotated *with* the wheel by `away`, so the whole thing reads as one rigid disc. Cancelling that rotation keeps labels upright but turns it into a row of cards sliding along an arc, which is a different and much weaker effect.
- The snap grid is a multiple of `360 / count`, so a station always lands facing up. The source of this technique snapped to a fixed 10°, which only coincides with item positions when `360 / count` is itself a multiple of 10 — with 7 or 9 items it lands between cards.
- Arrow keys step one station and route through the same settle path, so keyboard and pointer cannot disagree about where the wheel rests.

## Definition of done

Grab anywhere in the box and drag in an arc: the wheel follows your hand around the hub, and a drag near the left or right edge turns it less than the same pixel distance across the top. Fling and release — it keeps going, decelerates, and comes to rest with one card exactly upright, in a single continuous motion with no hop at the end. Drag, hold still for a second, then lift: it settles to the nearest station without throwing. Start a drag, move the pointer off the window, and release outside — the wheel still lands rather than freezing. Release over a card and no click reaches it; tap the same card without moving and the click goes through. Arrow keys step one card at a time.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
