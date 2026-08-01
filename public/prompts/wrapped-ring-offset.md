# Build: Shortest Signed Ring Offset

A ring of items laid out from `wrappedOffset(i, position, count)` — the shortest signed distance around the circle — with the naive `i - position` printed beside each one so the two can be compared while the ring turns. The dots move continuously through the seam; the raw numbers leap by a whole count at it. This is the single function that makes a finite array behave like an infinite one, and the only honest way to teach it is to show the version it replaces failing.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Ten dots on a ring, each showing its wrapped offset and the raw index difference it replaces.

- Category: primitive
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. `wrappedOffset(i, position, count)` computes `mod(i - position, count)` and then subtracts `count` when the result exceeds `count / 2`, producing a signed distance in `(-count/2, count/2]`. Negative means the item is behind the read head.
2. Each item is placed at `angle = (offset / count) * 2PI - PI/2`, so offset 0 sits under the notch at twelve o'clock and the ring is symmetric about it. Because a ±count jump in the offset is exactly one full turn, the dot lands on the same pixel and the seam is invisible.
3. Focus is `gaussian(|offset|, 0.45)` — `exp(-(0.45·d)²)` — driving scale from 0.74 to 1.20 and opacity from 0.30 to 1.00. A continuous falloff with no thresholds is what makes the ring read as analogue rather than stepped.
4. Dragging converts the pointer to an angle about the ring centre with `atan2`, then advances the target position by `shortestAngle(previous, current) / 2PI * count`. `shortestAngle` is required here for the same reason `wrappedOffset` is required for the layout: `atan2` flips from +PI to -PI at nine o'clock.
5. The ring position is eased with `damp(position, target, 0.0015, dt)` on the shared rAF loop, and every frame writes only `transform`, `opacity` and `z-index` — no layout reads, because width and height come from a ResizeObserver rather than `clientWidth`.
6. React re-renders only when `wrapIndex(Math.round(position), count)` changes, which is a couple of times a second; the sixty-times-a-second work is plain style writes on refs.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `count = 10`
  Items on the ring, and therefore the wrap threshold at count / 2 = 5. Ten keeps every raw label at most two characters wide, so the pills fit on a 320 px preview without colliding; above ~16 the labels overlap tangentially and the comparison becomes unreadable.
- `FOCUS_FALLOFF = 0.45`
  Gaussian falloff on |offset|. Yields 1.00 / 0.82 / 0.44 / 0.16 / 0.04 at distances 0-4, so roughly four items read as "near" on a ten-item ring. At 1.0 only the centre item is lit and the ring looks broken; at 0.2 nothing falls off and there is no focus at all.
- `SMOOTHING = 0.0015`
  Fraction of the remaining gap left after one second. Fast enough that the ring feels attached to the pointer, slow enough that releasing mid-drag reads as momentum rather than a cut. This is `damp`'s smoothing argument, not a per-frame lerp constant — a per-frame constant converges twice as fast at 120 Hz.
- `RADIUS_RATIO = 0.36`
  Ring radius as a fraction of the shorter container side. Above ~0.42 the 36 px pills clip the edges of a 16:10 frame; below ~0.30 adjacent pills touch.
- `IDLE_DRIFT = 0.22`
  Ring positions per second before the first interaction, so the seam sweeps past roughly every 45 s and the component demonstrates itself without being touched. Faster than ~0.6 and the raw labels change too quickly to read.
- `threshold (useDrag) = 3`
  Pixels of travel before a press becomes a rotation. Lower than the 8 px a carousel wants, because this ring has no click target to protect — it only has to reject hand tremor.

## API

```ts
function WrappedRingOffset(props: { count?: number; drift?: number; className?: string }): JSX.Element
```

- `count: number` — default `10`
  Items on the ring. The wrap threshold is count / 2.
- `drift: number` — default `0.22`
  Ring positions per second before the first interaction. 0 to sit still.
- `className: string`
  Merged onto the outer element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Fraction of the gap to the target that survives one second. */
const SMOOTHING = 0.0015;
/** Gaussian falloff on |offset|. At 0.45: 1.00 / 0.82 / 0.44 / 0.16 / 0.04. */
const FOCUS_FALLOFF = 0.45;
const RADIUS_RATIO = 0.36;
const IDLE_DRIFT = 0.22;

export function WrappedRingOffset({
  count = 10,
  drift = IDLE_DRIFT,
  className,
}: WrappedRingOffsetProps) {
  const root = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLLIElement | null)[]>([]);

  /** Where the ring is being pulled to. Fractional and unbounded. */
  const target = useRef(0);
  /** Where the ring actually is. Eased toward `target`. */
  const position = useRef(0);
  /** Suppresses the idle drift once a human has touched it. */
  const engaged = useRef(false);
  const grabAngle = useRef(0);
  const shown = useRef(0);

  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const { width, height } = useResizeObserver(root);

  /** Pointer angle around the ring centre, measured fresh: the page scrolls. */
  const angleAt = useCallback((clientX: number, clientY: number) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return 0;
    return Math.atan2(clientY - (box.top + box.height / 2), clientX - (box.left + box.width / 2));
  }, []);

  useDrag(root, {
    threshold: 3,
    onDragStart: (s) => {
      engaged.current = true;
      grabAngle.current = angleAt(s.clientX, s.clientY);
    },
    onDrag: (s) => {
      const angle = angleAt(s.clientX, s.clientY);
      // shortestAngle, not `angle - grabAngle`: atan2 flips from +PI to -PI at
      // nine o'clock, and the raw difference there is a full turn of garbage
      // that spins the ring backwards every time the pointer crosses it.
      const step = (shortestAngle(grabAngle.current, angle) / TAU) * count;
      target.current -= step;
      grabAngle.current = angle;
    },
  });

  useRaf((dt) => {
    if (!engaged.current && !reduced) target.current += drift * dt;

    // Reduced motion still moves the ring — it just does not ease into place.
    position.current = reduced
      ? target.current
      : damp(position.current, target.current, SMOOTHING, dt);

    const p = position.current;
    const radius = Math.min(width, height) * RADIUS_RATIO;

    for (let i = 0; i < count; i++) {
      const el = nodes.current[i];
      if (!el) continue;

      // The one line the whole component exists to demonstrate. `offset` is
      // continuous in `p` even across the seam, because the ±count jump maps
      // to exactly one turn of the circle and lands on the same place.
      const offset = wrappedOffset(i, p, count);
      const angle = (offset / count) * TAU - Math.PI / 2;
      const focus = gaussian(Math.abs(offset), FOCUS_FALLOFF);

      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      // translate3d places the box origin, translate(-50%,-50%) re-centres it,
      // scale runs about that centre. One string, one composited property.
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) scale(${(0.74 + focus * 0.46).toFixed(3)})`;
      el.style.opacity = (0.3 + focus * 0.7).toFixed(3);
      el.style.zIndex = String(10 + Math.round(focus * 40));
    }

    // Labels are integers, so they only need a render when the rounded ring
    // position changes — a couple of times a second, not sixty.
    const next = wrapIndex(Math.round(p), count);
    if (next !== shown.current) {
      shown.current = next;
      setIndex(next);
    }
  });
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useDrag` removes its five pointer listeners and releases any outstanding pointer capture; `useRaf` unsubscribes and cancels the shared frame when it was the last subscriber; `useResizeObserver` unobserves the root. No transforms are left behind because the nodes unmount with the component.

**Reduced motion.** The idle drift never starts and the `damp` easing is bypassed, so the ring tracks the drag one-to-one and stops dead on release. Dragging and the arrow keys still work, and the labels still update — the maths is the content here, so removing it would remove the component.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using `i - position` for layout. The ring still turns, but item 0 renders nine slots away from item 9 instead of one slot back, so the last item snaps across the entire ring every time the position passes zero. That snap is the seam, and it is the whole reason this function exists.
- Using `%` instead of a true modulo. JavaScript's `%` returns a negative result for negative operands, so scrolling backwards past zero produces offsets outside `[0, count)` and half the ring inverts. `mod(n, m) = ((n % m) + m) % m` is the fix.
- Comparing `offset > count / 2` with `>=`. On an even count that puts the antipodal item at `-count/2` instead of `+count/2`, and the item directly opposite the read head flickers between the two on alternate frames.
- Taking `angle - previousAngle` when converting pointer motion to rotation. `atan2` wraps from +PI to -PI at nine o'clock, so the raw difference there is a full turn and the ring spins backwards once per lap. `shortestAngle` wraps the difference into `(-PI, PI]`.
- Reading `element.clientWidth` inside the rAF callback to compute the radius. The same loop has already written transforms, so every read forces a synchronous reflow — sixty per second, and it only shows up as jank once there are a few of these on a page. The size comes from a ResizeObserver instead.
- Driving the per-item transforms through React state. Sixty commits a second for ten nodes is an order of magnitude more work than writing `style.transform` on refs, and it makes the labels — which change twice a second — re-render at frame rate for nothing.

## Notes

- `wrappedOffset` is the same three lines behind an infinite marquee, a drum carousel, a cylinder of image planes, and any "closest N to the playhead" query. Pair it with a scroll library set to `infinite: true` and the sequence has no beginning and no end.
- The idle drift stops permanently at the first drag or arrow key. An ambient motion that resumes on top of a user's input reads as the component fighting them.

## Definition of done

Leave it alone: the ring drifts and, as each item passes the six o'clock antipode, its struck-through raw label flips sign by the full count while the dot itself does not move. Drag the ring in a full circle past nine o'clock and it keeps turning in the same direction. Press ArrowRight and the position readout increments by one. Resize the frame and the ring re-radiuses without the dots drifting off-centre.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
