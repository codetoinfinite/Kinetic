# Build: Raycaster-Free Hover Picking

A ring of plates spins entirely on the compositor, so the main thread has no idea where anything is. Instead of measuring the DOM, the component recomputes the same transform in JavaScript — rotate, tilt, perspective divide — and hit-tests the resulting screen points against the pointer. A crosshair marks the computed position so you can see the mirror agreeing with the pixels.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Run the GPU's transform again on the CPU and hit-test the result. No raycaster, no rect reads.

- Category: primitive
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. The spin is one `Element.animate` keyframe pair with `iterations: Infinity`. It runs off the main thread, which means it keeps time even while JS is busy, and means the main thread must reconstruct the angle rather than remember it: `animation.currentTime` divided by the period gives the exact phase the compositor is drawing.
2. The mirror is four lines that shadow the CSS one for one. Two nested `rotateY` (ring spin, plate angle) collapse into a single angle sum, so a plate centre sits at `(r·sin a, 0, r·cos a)`. The stage `rotateX` turns that depth into vertical offset. The perspective divide `d / (d − z)` reproduces what the browser does with the `perspective` property.
3. Picking runs once per frame, not per `pointermove`. The geometry moves under a stationary cursor, so the correct answer changes on frames where no input arrived at all. An event-driven hit test would leave the hover state stuck on whatever plate happened to be there when the pointer last moved.
4. Plates with `z <= 0` are rejected before the distance compare. They are on the far side of the ring, drawn behind the near plates, and picking them would let a click pass through the front of the object.
5. The winner is the nearest projected point within a squared pick radius. Squared, because a comparison against `r²` gives the same ordering as a comparison against `r` without the square root.
6. This is the only correct approach when a vertex shader, a CSS transform, or GPU skinning moves the geometry after it leaves JavaScript. The CPU-side geometry never changed, so `Raycaster` intersects the undeformed mesh and reports hits on a shape that is not on screen. Mirroring the vertex transform on the CPU is the fix — the same maths, applied to one point instead of every vertex.
7. Everything inside the perspective root is `pointer-events: none`. There is nothing for the browser to hit-test; the container takes the pointer and the mirror decides what was under it.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `PERSPECTIVE = 900`
  Shared by the CSS `perspective` property and the JS divide. If the two ever disagree the crosshair drifts away from the plate it is meant to mark — which makes this the single most important value to keep in one place.
- `TILT = 16`
  Degrees of stage lean. Enough that the ring reads as a ring rather than a row; past ~30° the far plates hide behind the near ones and picking gets ambiguous even with the depth rejection.
- `PICK_RADIUS = 44`
  The pointer must land within 44 px of a projected centre. Matches the 44 px minimum touch target, and is wide enough to forgive the plate scaling down as it recedes.
- `PICK_RADIUS_SQ = PICK_RADIUS * PICK_RADIUS`
  Compared against squared distance so the loop never calls `Math.sqrt`. Fourteen square roots a frame is not a real cost, but the squared compare is free and is the habit worth having in a loop that might hold a thousand points.
- `RADIUS_RATIO = 0.36`
  Ring radius as a fraction of container width. Keeps the ring inside the box at its widest and leaves room for the pick-radius halo at the edges.
- `SPIN_PERIOD = 26`
  Seconds per revolution. Slow enough that a plate stays under the cursor long enough to click, fast enough that the per-frame re-pick is visibly necessary.

## API

```ts
function CpuMirrorPicking(props: { count?: number; period?: number; showMirror?: boolean; className?: string }): JSX.Element
```

- `count: number` — default `14`
  Plates around the ring.
- `period: number` — default `26`
  Seconds per revolution. The mirror divides the animation clock by this.
- `showMirror: boolean` — default `true`
  Draw the computed crosshair and the pick-radius halo.
- `className: string`
  Merged onto the perspective root via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Must match the CSS `perspective` exactly — the mirror divides by this. */
const PERSPECTIVE = 900;
/** Stage lean, degrees. Matches the CSS `rotateX`. */
const TILT = 16;
const SIN_TILT = Math.sin((TILT * Math.PI) / 180);
const COS_TILT = Math.cos((TILT * Math.PI) / 180);
/** Pointer-to-plate distance that counts as a hit, in CSS pixels. */
const PICK_RADIUS = 44;
const PICK_RADIUS_SQ = PICK_RADIUS * PICK_RADIUS;
const RADIUS_RATIO = 0.36;
const MIN_RADIUS = 64;
const MAX_RADIUS = 190;
const SPIN_PERIOD = 26;

interface Projected {
  x: number;
  y: number;
  z: number;
  scale: number;
}

/**
 * The mirror. Every line here has a counterpart in the element's CSS:
 *
 *   ul   transform: rotateY(spin)              <- from the running animation
 *   li   transform: rotateY(theta) translateZ(radius)
 *   root perspective: PERSPECTIVE
 *   stage transform: rotateX(TILT)
 *
 * A plate's centre starts at the ring origin, so `rotateY(a) translateZ(r)`
 * puts it at (r·sin a, 0, r·cos a) with a = theta + spin. Composing the two
 * rotateY into one addition is the whole trick — the rest is the standard
 * perspective divide.
 */
function project(theta: number, spin: number, radius: number, cx: number, cy: number, out: Projected): void {
  const a = theta + spin;
  const x = Math.sin(a) * radius;
  const depth = Math.cos(a) * radius;
  // rotateX(t): y' = y·cos t − z·sin t, z' = y·sin t + z·cos t. y is 0 here,
  // so the tilt turns depth into vertical offset and shortens the ring.
  const y = -depth * SIN_TILT;
  const z = depth * COS_TILT;
  // CSS perspective: everything at depth z scales by d / (d − z).
  const scale = PERSPECTIVE / (PERSPECTIVE - z);
  out.x = cx + x * scale;
  out.y = cy + y * scale;
  out.z = z;
  out.scale = scale;
}

/**
 * `Animation.currentTime` is typed `CSSNumberish | null`: a plain number in
 * every shipping engine, but the spec permits a CSSNumericValue. Narrow it
 * rather than cast, and treat a null clock (animation not yet started) as 0.
 */
function readMs(anim: Animation | null): number {
  if (!anim) return 0;
  const t = anim.currentTime;
  if (t === null) return 0;
  return typeof t === 'number' ? t : t.to('ms').value;
}

export function CpuMirrorPicking({
  count = 14,
  period = SPIN_PERIOD,
  showMirror = true,
  className,
}: CpuMirrorPickingProps) {
  const root = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLUListElement>(null);
  const plates = useRef<(HTMLLIElement | null)[]>([]);
  const probe = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);

  const anim = useRef<Animation | null>(null);
  /** Pointer in the root's own coordinate space. Null when it has left. */
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const hovered = useRef(-1);
  const scratch = useRef<Projected>({ x: 0, y: 0, z: 0, scale: 1 });

  const [hover, setHover] = useState(-1);
  const [picked, setPicked] = useState(-1);

  const reduced = useReducedMotion();
  const size = useResizeObserver(root);
  const radius = clamp(size.width * RADIUS_RATIO, MIN_RADIUS, MAX_RADIUS);

  // The compositor owns the spin. One keyframe pair, then the main thread is
  // out of the loop entirely — which is exactly why it has to reconstruct the
  // angle instead of remembering it.
  useEffect(() => {
    const el = ring.current;
    if (!el || reduced) return;
    const a = el.animate(
      [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(360deg)' }],
      { duration: period * 1000, iterations: Infinity, easing: 'linear' },
    );
    anim.current = a;
    return () => {
      a.cancel();
      anim.current = null;
    };
  }, [period, reduced]);

  const readPointer = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = root.current;
    if (!el) return;
    // One rect read per pointer event, for the container only. Reading a rect
    // per plate per event is the version that costs fourteen forced layouts.
    const rect = el.getBoundingClientRect();
    pointer.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const clearPointer = useCallback(() => {
    pointer.current = null;
  }, []);

  useRaf((_dt) => {
    if (size.width === 0) return;

    // Picking runs per frame, not per pointermove. The ring moves under a
    // stationary cursor, so the hit answer changes when nothing was pointed.
    const spin = reduced ? 0 : (readMs(anim.current) / (period * 1000)) * TAU;
    const cx = size.width / 2;
    const cy = size.height / 2;
    const p = pointer.current;
    const out = scratch.current;

    let best = -1;
    let bestDist = PICK_RADIUS_SQ;
    let bestX = 0;
    let bestY = 0;

    for (let i = 0; i < count; i += 1) {
      project((i / count) * TAU, spin, radius, cx, cy, out);

      // The projection pass already knows the depth, so the fade rides along
      // rather than needing a second traversal.
      const el = plates.current[i];
      if (el) {
        const depth = out.z / (radius * COS_TILT);
        el.style.opacity = (0.18 + 0.82 * (depth * 0.5 + 0.5)).toFixed(3);
      }

      // z <= 0 is the far half of the ring: drawn, but behind the near plates
      // and never the intended target of a click.
      if (!p || out.z <= 0) continue;
      const dx = p.x - out.x;
      const dy = p.y - out.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
        bestX = out.x;
        bestY = out.y;
      }
    }

    const marker = probe.current;
    if (marker) {
      marker.style.opacity = best >= 0 ? '1' : '0';
      if (best >= 0) {
        marker.style.transform = `translate3d(${bestX.toFixed(1)}px, ${bestY.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }
    }
    const cursor = halo.current;
    if (cursor) {
      cursor.style.opacity = p ? '1' : '0';
      if (p) {
        cursor.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }
    }

    if (best !== hovered.current) {
      hovered.current = best;
      setHover(best);
    }
  });
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The animation is cancelled on unmount or period change, which releases the compositor animation and nulls the ref. The frame loop unsubscribes with the hook; the shared RAF parks itself once no subscriber is left. No listeners are attached outside React.

**Reduced motion.** The spin animation is never created, so the ring holds still at phase zero. Picking is unaffected — the mirror simply reads a spin of 0 — which is the point: the technique is about where things are, not about them moving.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- `getBoundingClientRect()` per plate per pointermove. That is N forced layouts per event, and the rects are wrong anyway: a compositor-driven transform does not update layout boxes, so every rect reports the plate's unanimated position.
- Hit-testing only on `pointermove`. The ring rotates under a still cursor, so hover has to be re-evaluated every frame or it freezes on a stale plate.
- Letting the CSS and the mirror drift apart. A tweak to `perspective`, the tilt, or the transform order in one place and not the other produces a crosshair that is subtly, maddeningly offset. Keep both reading the same constants.
- Putting `overflow: hidden` on a `transform-style: preserve-3d` element. Overflow is a grouping property: it silently forces the subtree back to flat and the ring collapses into a line.
- Trusting `Raycaster` against a shader-deformed mesh. The vertex shader runs on the GPU; the `BufferGeometry` in memory is the rest pose. The ray intersects the rest pose and hits nothing you can see.
- Reading `animation.currentTime` as a number without narrowing. It is typed `CSSNumberish | null` — null before the animation starts, and permitted by spec to be a `CSSNumericValue`.
- Forgetting the far-half rejection. Without it the ring picks through itself, and a click near the centre selects a plate on the back.

## Notes

- The depth fade rides along on the projection pass that was going to run anyway — one extra style write per plate, no second traversal and no extra maths.
- The same mirror generalises: for a three.js scene, project the object's world position with `vector.project(camera)` and compare in NDC; for a shader-deformed mesh, re-run the deformation for that one vertex on the CPU. The principle is identical — hit-test the transform, not the source geometry.

## Definition of done

Hold the pointer still over a plate: the crosshair tracks the plate as it rotates away and hover releases at the pick radius, with no pointer events involved. Move to the middle of the ring and nothing on the far side lights up. Click and the plate under the crosshair — not the one under a stale rect — is the one that selects. With reduced motion the ring is static and picking still works.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
