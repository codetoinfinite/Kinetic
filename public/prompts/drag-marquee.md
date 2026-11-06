# Build: Drag Marquee

One unwrapped accumulator carries the idle drift, the drag and the throw; the wrap happens once, in the follow tween's `modifiers`, as `mod(x, period) - period`. Because that is a true modulo it is total — a delta of four periods in one frame lands correctly — and because it is the identity for `x` already inside `[-period, 0)` it never shows a seam. Pressing scatters the cards on a single paused timeline that is played forwards and reversed, and releasing hands the row over to a plugin-free inertial throw.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An endless row that drifts, takes a drag and a throw, and scatters its cards while your hand is down.

- Category: layout
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. The row is `N` copies of the children inside a `w-max` flex track. `period` is the measured width of one copy — `getBoundingClientRect().width`, not `offsetWidth`, because the latter rounds and half a pixel of error is half a pixel of gap that only ever shows at the seam. The copy count is `clamp(ceil(hostWidth / period) + 1, 2, 8)`, which is exactly enough that a translation bounded by one period can never expose the end of the track.
2. Everything that moves the row adds to one number that is never corrected: the drift subtracts `speed * dt`, each `pointermove` adds `dx`, the release adds the throw distance. It walks off to -50000 and nothing cares, because the only consumer of it applies a modulo.
3. That modulo lives in `gsap.quickTo`'s `modifiers`, which post-processes the value on its way to the target. It cannot feed back: `resetTo` advances the tween's start from its own `s + ratio * c` rather than re-reading the target, so the wrapped value is output-only. Wrapping in `onUpdate` instead makes the next retarget interpolate from a value the tween does not believe in, and the row lurches a whole period.
4. For `x` in `[-period, 0)`, `mod(x, period) === x + period`, so `mod(x, period) - period === x`. The wrap is therefore the identity across the entire range the row normally occupies and only bites when the accumulator leaves it — the two sides of the boundary paint identical pixels, so there is nothing to snap.
5. The gap is a trailing `margin-right` on each tile *inside* a copy rather than `gap` on the track. A track-level gap sits between copies too, so the measured copy width would no longer equal the wrap period and the seam would gain one gap of drift every lap.
6. Release velocity is measured over a rolling ~70 ms window of `(accumulator, time)`, then projected with the `power3.out` identity: `p(t) = 1 - (1 - t)^3` has `p'(0) = 3`, so a tween of duration `D` covering `delta` departs at `3 * delta / D`. Retargeting by `v * D / 3` continues the gesture at exactly the speed the hand left, with the core library and no `InertiaPlugin`.
7. The press scatter is one paused timeline built once and stored in a ref, `play()` on `pointerdown` and `reverse()` on the release path. Per-tile rotation and offset come from a seeded generator indexed by position *within* a copy, so every copy of a tile scatters identically and the duplication stays invisible while the cards move.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `copies = clamp(ceil(hostWidth / period) + 1, 2, 8)`
  The `+ 1` is the copy that covers the wrap: with the translation bounded to one period, the window can start one full period into the track and still needs `hostWidth` of content after it. Drop it and the tail of the row shows background for part of every lap. The floor of 2 is the minimum that can hide a seam at all; the ceiling of 8 stops a one-word tile in a wide hero from producing hundreds of nodes.
- `POWER3_OUT_SLOPE = 3`
  The initial derivative of `power3.out`, and the divisor in `delta = v * D / 3`. Exact, not tuned: change the follow tween's ease and this changes with it — `power2` needs 2, `power4` needs 4. Leave it at 3 against a different ease and every throw is off by a constant factor.
- `smoothing = 0.5`
  Seconds the row takes to catch up with the pointer, and the `D` in the throw projection. Under ~0.2 s the row is welded to the finger and the throw is over before it registers; over ~0.8 s the lag between hand and content is large enough to read as dropped frames rather than as weight.
- `speed = 60`
  Idle drift in px/s. Below ~20 the row looks frozen at a glance and the affordance is lost; above ~120 the text is unreadable at rest, which defeats the point of putting words in it. At 0 the ticker is never registered at all, so a parked marquee costs nothing per frame.
- `VELOCITY_WINDOW = 0.07`
  Seconds of gesture history the release speed is averaged over. Shorter is effectively the last delta, which is noisy at 120 Hz and gives visibly different throws for identical gestures; much longer averages away a deliberate slow-down before release, so the row flies off when the user meant to place it.
- `MAX_VELOCITY = 4000`
  px/s the measured speed is clamped to. A coalesced pointer batch, a tab switch mid-drag or a synthetic event can report tens of thousands; without the clamp one bad sample throws the row several periods, and the wrap makes the result look random rather than fast.
- `MAX_THROW = 1200`
  Pixels one throw may carry. Roughly a screen and a half — far enough that a hard flick feels unbounded, close enough that the content the user was looking at is still findable when it stops.
- `DRAG_THRESHOLD = 5`
  Pixels of travel before a press becomes a drag. Below ~3 the tremor in a normal tap counts as a drag and every tap on a card is swallowed; above ~10 a small deliberate nudge does nothing at all.
- `scatter / spin = 6 (percent) / 10 (deg)`
  Half-ranges for the per-tile offset and rotation on press. The offset is a percentage of each tile's own size, so mixed tile widths scatter proportionally instead of the small ones flying off. Past ~15% and ~25° the tiles overlap their neighbours and the row stops reading as a row; below ~3% and ~5° the press produces no visible acknowledgement.
- `ease: back.inOut(3) = 3`
  The overshoot of the scatter, applied at both ends because the same timeline is played and reversed. It is what makes the cards spring apart and spring back rather than easing politely; at 1 the overshoot is invisible, past ~5 the return visibly overshoots the resting layout and the row wobbles after release.

## API

```ts
function DragMarquee(props: { children: ReactNode; speed?: number; gap?: number; smoothing?: number; scatter?: number; spin?: number; pressScale?: number; scatterDuration?: number; seed?: number | string; className?: string; tileClassName?: string; 'aria-label'?: string }): JSX.Element
```

- `children: ReactNode`
  One tile per child. The whole set is duplicated as many times as the width needs.
- `speed: number` — default `60`
  Idle drift in px/s. Positive drifts left; 0 parks the row and skips the ticker entirely.
- `gap: number` — default `24`
  Pixels between tiles, applied inside a copy so the spacing also spans the seam.
- `smoothing: number` — default `0.5`
  Seconds the row takes to catch up with the pointer. Doubles as the throw duration.
- `scatter: number` — default `6`
  Scatter distance on press, as a percentage of each tile's own size.
- `spin: number` — default `10`
  Half-range of the per-tile rotation on press, in degrees.
- `pressScale: number` — default `0.95`
  Tile scale while the pointer is down.
- `scatterDuration: number` — default `0.5`
  Seconds for the scatter out, and the same again back.
- `seed: number | string` — default `'drag-marquee'`
  Seeds the scatter. The same seed gives the same arrangement on server and client.
- `className: string`
  Merged onto the drag surface.
- `tileClassName: string`
  Merged onto every tile. Size the items here.
- `aria-label: string` — default `'Marquee'`
  Label for the focusable row, which also takes left and right arrow keys.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** The only place the track's transform is written. */
const paint = useCallback(() => {
  const track = trackRef.current;
  if (!track) return;
  track.style.transform = `translate3d(${proxyRef.current.x.toFixed(2)}px, 0px, 0px)`;
}, []);

/**
 * Move the accumulator to `value`. With motion allowed this retargets the
 * follow tween — `quickTo` reuses one tween and one `PropTween` rather than
 * allocating a tween per frame — and the wrap happens in its modifier. With
 * reduced motion there is no tween, so the wrap is applied here instead.
 */
const push = useCallback(
  (value: number) => {
    rawRef.current = value;
    const xTo = xToRef.current;
    if (xTo) {
      xTo(value);
      return;
    }
    const period = periodRef.current;
    proxyRef.current.x = period < 1 ? 0 : mod(value, period) - period;
    paint();
  },
  [paint],
);

/**
 * One follow tween for the life of the component. The wrap lives in
 * `modifiers`, which post-processes the value on its way to the target and
 * never feeds back: `resetTo` advances the tween's start from its own
 * `s + ratio * c`, not by re-reading `proxy.x`. Put the wrap anywhere else
 * — in `onUpdate`, say — and the next retarget interpolates from a value the
 * tween does not believe in, and the row lurches a full period.
 */
useEffect(() => {
  const proxy = proxyRef.current;
  if (reduced) {
    xToRef.current = null;
    return;
  }

  const xTo = gsap.quickTo(proxy, 'x', {
    duration: smoothing,
    ease: 'power3',
    modifiers: {
      // Reads the ref, so a resize changes the period without rebuilding
      // the tween — rebuilding mid-throw would restart the ease from rest.
      x: (value: number) => {
        const period = periodRef.current;
        return period < 1 ? 0 : mod(value, period) - period;
      },
    },
    onUpdate: paint,
  });
  xToRef.current = xTo;

  return () => {
    xToRef.current = null;
    gsap.killTweensOf(proxy);
  };
}, [reduced, smoothing, paint]);

useEffect(() => {
  const host = hostRef.current;
  if (!host) return;

  let pointerId: number | null = null;
  let lastX = 0;
  let pressX = 0;
  let pressY = 0;
  let moved = false;
  let swallowClick = false;
  let swallowTimer: number | null = null;

  // The gate expires. A throw released over a gap in the row, or one the
  // browser cancels, produces no click at all — and a gate left standing
  // eats the visitor's next real click, however long afterwards it lands.
  const disarmSwallow = () => {
    swallowClick = false;
    if (swallowTimer !== null) {
      window.clearTimeout(swallowTimer);
      swallowTimer = null;
    }
  };
  /** Rolling window: the accumulator and clock at the start of the window. */
  let sampleRaw = 0;
  let sampleTime = 0;

  const now = () => performance.now() / 1000;

  const onPointerDown = (e: PointerEvent) => {
    // One pointer owns the row. A second finger arriving mid-throw would
    // otherwise reset the origin and the row would jump.
    if (pointerId !== null || !e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // A new press means the last gesture is finished and whatever click it
    // was owed never arrived.
    disarmSwallow();
    pointerId = e.pointerId;
    lastX = e.clientX;
    pressX = e.clientX;
    pressY = e.clientY;
    moved = false;
    sampleRaw = rawRef.current;
    sampleTime = now();
    pressedRef.current = true;

    // Capture on press, not once the threshold is crossed: by then the
    // pointer may already have left the element and `pointermove` would have
    // stopped arriving.
    host.setPointerCapture(e.pointerId);
    // Scatter on press, like a physical stack of cards being pinned — the
    // press, not the drag, is what the eye reads as "I have hold of this".
    scatterRef.current?.play();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (pointerId !== e.pointerId) return;

    const dx = e.clientX - lastX;
    lastX = e.clientX;

    if (!moved) {
      if (Math.hypot(e.clientX - pressX, e.clientY - pressY) < DRAG_THRESHOLD) return;
      moved = true;
    }

    push(rawRef.current + dx);

    // Retire the velocity window once it is full. Measuring over a window
    // rather than off the last delta is what stops "drag, pause, lift" from
    // throwing the row: with no movement there are no events, the window
    // never advances, and the measured speed decays toward zero on its own.
    const t = now();
    if (t - sampleTime > VELOCITY_WINDOW) {
      sampleRaw = rawRef.current;
      sampleTime = t;
    }
  };

  /**
   * Idempotent. Called from `pointerup`, `pointercancel` and
   * `lostpointercapture`, all three of which can be the last event a gesture
   * produces, and at least one of which always arrives — including when the
   * pointer is released outside the window or the OS takes it away for a
   * gesture of its own. Guarding on `pointerId` makes the extra calls no-ops
   * instead of a double throw, and it is what stops a drag that ended
   * off-screen from leaving the row stuck mid-throw with the cards still
   * scattered.
   */
  const finish = (e: PointerEvent) => {
    if (pointerId !== e.pointerId) return;
    const id = pointerId;
    pointerId = null;
    pressedRef.current = false;

    const elapsed = now() - sampleTime;
    const velocity =
      moved && elapsed > 0
        ? clamp((rawRef.current - sampleRaw) / elapsed, -MAX_VELOCITY, MAX_VELOCITY)
        : 0;

    disarmSwallow();
    if (moved) {
      swallowClick = true;
      swallowTimer = window.setTimeout(disarmSwallow, SWALLOW_TIMEOUT_MS);
    }
    moved = false;

    if (host.hasPointerCapture(id)) host.releasePointerCapture(id);
    scatterRef.current?.reverse();

    if (velocity !== 0) {
      // v·D/3 is the distance a `power3.out` of duration D covers when it
      // departs at v. Retargeting by exactly that hands the row over from
      // the finger without a change of speed.
      push(
        rawRef.current +
          clamp((velocity * smoothing) / POWER3_OUT_SLOPE, -MAX_THROW, MAX_THROW),
      );
    }
  };

  // Capture phase, ahead of any child's own handler. A drag ends with a
  // `click` on whatever happens to be under the pointer, so without this the
  // gesture that scrolls the row also activates a card.
  const onClick = (e: MouseEvent) => {
    if (!swallowClick) return;

    // Enter or Space on a focused card dispatches a click with `detail === 0`
    // and no pointer sequence behind it. That is not the tail of a throw, and
    // swallowing it is what makes the row keyboard-inoperable.
    if (e.detail === 0) return;

    disarmSwallow();
    e.preventDefault();
    e.stopPropagation();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const direction = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (direction === 0) return;
    e.preventDefault();
    const step = perCopy > 0 ? periodRef.current / perCopy : periodRef.current;
    push(rawRef.current + direction * step);
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
    // Or the timer outlives the effect and a remount starts life armed.
    disarmSwallow();
    if (pointerId !== null && host.hasPointerCapture(pointerId)) {
      host.releasePointerCapture(pointerId);
    }
    pointerId = null;
    pressedRef.current = false;
  };
}, [push, smoothing, perCopy]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `lostpointercapture`, the capture-phase `click` and `keydown`; releases pointer capture if a gesture is still live at unmount; removes the drift callback from `gsap.ticker`; kills the tweens on the proxy object so an in-flight throw cannot call `onUpdate` against a detached track; and reverts the `gsap.context` holding the scatter timeline, which also restores the tiles' inline transforms. Both shared resize observers and the shared intersection observer unregister.

**Reduced motion.** Dragging is unchanged — it is the user's own motion, and tracking it is the component. Everything the component would have animated by itself is dropped: the idle drift is never registered on the ticker, the follow tween is never created (so the row is written straight to the wrapped position, one-to-one with the pointer, and a release does not throw), and the scatter timeline is not built, so pressing moves nothing but the row. Arrow keys still step one tile, instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Correcting the offset with `if (x < -period) x += period` instead of a modulo. It only ever undoes one period, so a fast flick, a coalesced pointer batch, or a tab that was backgrounded for a second leaves the row several periods out and it jumps to the wrong tile. `mod` is total: any magnitude, one step, right answer.
- Applying the wrap in `onUpdate` rather than in `modifiers`. The tween then interpolates from a start value it computed internally toward a target the wrap has already moved, so the next retarget travels a whole extra period. `modifiers` is post-processing on the way out and never feeds back into the tween's own bookkeeping.
- Putting the gap on the track with `gap` or `space-x`. It lands between copies as well as between tiles, so the measured copy width no longer equals the wrap period; the seam gains one gap per lap and slowly slides out of register. The gap belongs inside the copy, as a trailing margin on every tile.
- Measuring the period with `offsetWidth`. It rounds to whole pixels, and a sub-pixel error in the period is a permanent sub-pixel misalignment at the seam that shows as a hairline flicker once per lap.
- Hard-coding two copies. Two is enough only while one copy is at least as wide as the container; a short tile set in a wide hero runs out of content mid-lap and the row ends in empty space. The count has to come from the measured width.
- Randomising the scatter per DOM node. The duplicates are the whole trick, and the instant the cards move with different rotations the eye reads them as different content — the seam becomes obvious. Index the seed by position within a copy, so copy 3 tile 5 matches copy 1 tile 5.
- Rebuilding the scatter timeline per press, or putting the pressed flag in the `useGsap` deps. `revert()` strips the inline transforms GSAP wrote, so the reverse starts from the untouched stylesheet values and animates nowhere — the cards stay scattered. One paused timeline, `play()` and `reverse()` from the pointer handlers.
- Leaving the idle drift running during a drag. The row creeps out from under the finger, which is precisely what one-to-one tracking exists to prevent; over a slow careful drag the divergence is several tiles.
- Calling `setPointerCapture` only after the drag threshold is crossed. A fast gesture has already left the element by then, `pointermove` stops arriving, and the row sticks at the offset it had when the pointer crossed the boundary.
- Handling only `pointerup`. Release outside the window, or let the OS claim the gesture, and no `pointerup` arrives: the row stays captured, the drift never resumes, and the cards stay scattered mid-throw. `pointercancel` and `lostpointercapture` route to the same idempotent finish, guarded on the stored `pointerId` so the duplicate is a no-op rather than a second throw.
- Letting the click through after a drag. The gesture ends with a `click` on whichever card is under the pointer, so dragging the row also opens a project. It is swallowed in the capture phase, once, and only when the gesture actually moved.

## Notes

- The follow tween is retargeted, not recreated: `gsap.quickTo` keeps one tween and one `PropTween` alive and calls `resetTo` on it, so a marquee dragged for ten seconds allocates nothing per frame.
- The drift is registered on `gsap.ticker` rather than a second rAF loop, so the target and the tween that chases it advance in the same tick. On separate loops the row is one frame stale every other frame, which reads as a faint shimmer at speed.
- Because the drift keeps retargeting the same tween after release, the throw decays exponentially with a time constant of `smoothing / 3` rather than tracing a literal `power3` curve. The departure speed is still exactly the hand's, which is the part the eye judges.
- Only the first copy is exposed to assistive technology; the rest carry `aria-hidden`, so a screen reader reads the list once rather than four times.

## Definition of done

The row drifts on its own. Grab it and it follows your hand exactly, with no creep in the drift direction, and the cards tilt and shrink apart the instant you press — then settle back when you let go. Flick and release: it coasts on at the speed you left, slows, and rejoins the drift with no visible seam or jump. Drag several screens' worth in one fast swipe and the tiles stay in order — nothing teleports. Watch one tile go off the left edge and it reappears on the right at the same spacing as every other gap. Release the pointer outside the browser window and the row keeps drifting instead of freezing scattered. Release over a card and no click reaches it; tap without moving and it does. Resize the container narrower and wider — the seam never appears. Scroll it out of view and the drift stops until it is back.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
