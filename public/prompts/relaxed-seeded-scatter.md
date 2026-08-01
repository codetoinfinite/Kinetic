# Build: Relaxed Seeded Scatter

Half the points sit on an exact lattice and half are seeded noise; fifteen relaxation sweeps then push the noisy ones apart until no neighbour pair is closer than 40% of the mean spacing. The result keeps the liveliness of random placement without the clusters that read as a bug. The visualiser leaves a dashed ghost at each point's pre-relaxation angle, so the displacement is legible, and prints the smallest gap before and after.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Seeded angles around a ring, pushed apart until nothing collides. Ghost ticks mark where they started.

- Category: primitive
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. `floor(count * evenRatio)` points are written at `(i / fixedCount) * 2PI` and flagged fixed; the remainder get `rng() * 2PI` from `createRng(seed)`, a mulberry32 stream. The raw array is copied before anything moves so the two states can be compared and interpolated.
2. The target gap is `(2PI / count) * 0.4` — 40% of the mean spacing on the full ring, not on the random subset, so the floor means the same thing regardless of how many points are pinned.
3. Each sweep sorts the nodes by `mod(angle, 2PI)`, then walks consecutive pairs measuring `gap = mod(next.angle - current.angle, 2PI)`. Because `mod` always measures the short way round, the pair that straddles zero needs no special case.
4. When a gap is under target, each free endpoint is moved by `(target - gap) * 0.5` away from the other; if one endpoint is pinned to the lattice the free one absorbs the whole `(target - gap)` instead, or points pile up against the lattice and never separate.
5. Angles are stored unwrapped — a point pushed below zero keeps a small negative value rather than jumping to just under 2PI — so the component can interpolate `raw -> relaxed` linearly and never take the long way round. Only the sort and the gap measurement wrap.
6. The visualiser eases that interpolation over 1.4 s with `easeOutQuart` on the shared rAF loop, writing the `transform` attribute of one `<g>` per point. The SVG uses a `-50 -50 100 100` viewBox, so it resizes with its container and needs no ResizeObserver.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `RELAX_PASSES = 15`
  Each sweep removes about half the remaining overlap, so 15 leaves 2^-15 of the initial error — fully converged for any count up to ~64. At 3 passes the tightest pairs are still visibly paired; past ~20 nothing measurable changes and you are paying O(passes · n log n) for nothing.
- `MIN_GAP_RATIO = 0.4`
  Floor on the neighbour gap as a fraction of the mean, so `targetGap = 0.4 * 2PI / count`. Below ~0.25 clusters survive and the scatter still reads as clumped. Above ~0.6 the relaxation cannot satisfy every pair at once, so it oscillates between passes and converges toward the lattice — which throws away the randomness you asked for.
- `EVEN_RATIO = 0.5`
  Fraction pinned to the exact lattice. At 0 the composition has no skeleton and the eye finds no structure; at 1 it is a clock face. Half and half is the mix that reads as deliberate but not mechanical.
- `PUSH_SHARE = 0.5`
  Each free neighbour absorbs half the deficit, so a pair separates by exactly the deficit per sweep. At 1.0 both move the full amount, overshoot, and the pair oscillates instead of settling.
- `MORPH_DURATION = 1.4`
  Seconds for the raw-to-relaxed sweep. Long enough to follow individual points leaving their ghosts; under ~0.6 s it reads as a single cut and the comparison is lost.
- `seed = 'kinetic'`
  Any fixed value works — what matters is that it is fixed. `hashSeed` turns the string into a 32-bit integer, so a named seed per instance gives every ring its own reproducible composition.

## API

```ts
function relaxedRingAngles(count: number, seed: number | string, options?: { passes?: number; minGapRatio?: number; evenRatio?: number; pushShare?: number }): RelaxedRing;
function RelaxedSeededScatter(props: { count?: number; seed?: number | string; passes?: number; minGapRatio?: number; evenRatio?: number; morph?: boolean; className?: string }): JSX.Element
```

- `count: number` — default `24`
  Points on the ring.
- `seed: number | string` — default `'kinetic'`
  Fixed seed. Strings are hashed with `hashSeed`.
- `passes: number` — default `15`
  Relaxation sweeps.
- `minGapRatio: number` — default `0.4`
  Minimum neighbour gap as a fraction of the mean spacing.
- `evenRatio: number` — default `0.5`
  Fraction of points pinned to an exact lattice.
- `morph: boolean` — default `true`
  Ease from the raw angles to the relaxed ones on first view.
- `className: string`
  Merged onto the outer element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Sweeps. Each halves the residual overlap; 15 is fully converged for n<=64. */
const RELAX_PASSES = 15;
/** Floor on the neighbour gap, as a fraction of the mean gap. */
const MIN_GAP_RATIO = 0.4;
/** Half the points sit on an exact lattice and never move. */
const EVEN_RATIO = 0.5;
/** Each free neighbour absorbs half the deficit. */
const PUSH_SHARE = 0.5;

type Node = { id: number; angle: number; fixed: boolean };

/** Smallest neighbour gap on the circle, and how many pairs are under `target`. */
function ringStats(values: ArrayLike<number>, target: number) {
  const n = values.length;
  if (n < 2) return { minGap: TAU, crowded: 0 };
  const sorted = Array.from(values, (v) => mod(v, TAU)).sort((a, b) => a - b);
  let minGap = TAU;
  let crowded = 0;
  for (let i = 0; i < n; i++) {
    const a = sorted[i] ?? 0;
    const b = sorted[(i + 1) % n] ?? 0;
    const gap = i === n - 1 ? b + TAU - a : b - a;
    if (gap < minGap) minGap = gap;
    if (gap < target) crowded++;
  }
  return { minGap, crowded };
}

export function relaxedRingAngles(
  count: number,
  seed: number | string,
  options: RelaxedRingOptions = {},
): RelaxedRing {
  const {
    passes = RELAX_PASSES,
    minGapRatio = MIN_GAP_RATIO,
    evenRatio = EVEN_RATIO,
    pushShare = PUSH_SHARE,
  } = options;

  const n = Math.max(0, Math.floor(count));
  const angles = new Float32Array(n);
  const raw = new Float32Array(n);
  const targetGap = n > 0 ? (TAU / n) * minGapRatio : 0;
  const fixedCount = Math.floor(n * evenRatio);

  if (n === 0) {
    return { angles, raw, minGap: 0, rawMinGap: 0, crowded: 0, rawCrowded: 0, targetGap, fixedCount };
  }

  // Half order: an exact lattice, so the composition has a skeleton.
  for (let i = 0; i < fixedCount; i++) angles[i] = (i / fixedCount) * TAU;
  // Half chaos: seeded, never Math.random().
  const rng = createRng(seed);
  for (let i = fixedCount; i < n; i++) angles[i] = rng() * TAU;
  raw.set(angles);

  const nodes: Node[] = Array.from({ length: n }, (unused, id) => ({
    id,
    angle: angles[id] ?? 0,
    fixed: id < fixedCount,
  }));

  for (let pass = 0; pass < passes && n > 1; pass++) {
    // Re-sort every sweep. A push can carry a point across zero, which
    // re-orders the ring; a gap computed from stale neighbours pushes the
    // wrong point and leaves a permanent clump at the wrap.
    nodes.sort((a, b) => mod(a.angle, TAU) - mod(b.angle, TAU));

    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      const b = nodes[(i + 1) % n];
      if (!a || !b || a === b) continue;

      // mod() measures the gap the short way round, so the pair that straddles
      // zero needs no special case.
      const gap = mod(b.angle - a.angle, TAU);
      if (gap >= targetGap) continue;

      const deficit = (targetGap - gap) * pushShare;
      if (a.fixed && b.fixed) continue;
      // A pinned neighbour cannot absorb its share, so the free one takes all
      // of it. Otherwise points pile up against the lattice and never separate.
      if (a.fixed) b.angle += deficit * 2;
      else if (b.fixed) a.angle -= deficit * 2;
      else {
        a.angle -= deficit;
        b.angle += deficit;
      }
    }
  }

  for (const node of nodes) angles[node.id] = node.angle;

  const after = ringStats(angles, targetGap);
  const before = ringStats(raw, targetGap);

  return {
    angles,
    raw,
    minGap: after.minGap,
    rawMinGap: before.minGap,
    crowded: after.crowded,
    rawCrowded: before.crowded,
    targetGap,
    fixedCount,
  };
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useRaf` unsubscribes on unmount and the shared frame is cancelled when the last subscriber leaves; the loop also unsubscribes itself the moment the morph completes, so a settled ring costs nothing. `useInView` unobserves the root. No timers, no listeners, no retained typed arrays beyond the memo.

**Reduced motion.** The relaxed angles render immediately with no sweep. The dashed ghosts at the raw angles stay, so the before/after comparison the component exists to make is fully readable without anything moving, and the gap readout is unchanged.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- `Math.random()` instead of a seeded generator. The server renders one arrangement and the client another, React reports a hydration mismatch and re-renders the subtree, and the layout is different on every reload so no visual diff is ever reviewable.
- Not re-sorting between sweeps. A push can carry a point across zero, which re-orders the ring; the next sweep then measures the gap to a point that is no longer the neighbour, pushes the wrong one, and leaves a permanent clump sitting exactly on the wrap.
- Measuring the gap as `next - current`. For the pair that straddles zero that is a large negative number, which is always below the target, so the relaxation shoves those two apart on every sweep forever and one point walks all the way around the ring.
- Splitting the deficit evenly when one neighbour is pinned. The free point only ever gets half the correction it needs, so it converges to half the required gap and stays visibly stuck to the lattice tick.
- Wrapping the angles into `[0, 2PI)` on the way out. The interpolation from `raw` to `angles` then sends any point that crossed zero the long way round the ring, and one tick sweeps a full circle during the settle while the rest move a few degrees.
- Rebuilding the ring on every render. `relaxedRingAngles` is O(passes · n log n) and allocates; without `useMemo` keyed on the inputs, every parent render re-runs 15 sweeps and re-allocates two typed arrays.

## Notes

- Relaxing over the full ring with the lattice pinned is a deliberate deviation from the version this was taken from, which relaxed only the random subset against itself. That version lets a random point land exactly on a lattice point, which is the one collision the technique is supposed to prevent.
- `relaxedRingAngles` is the shipped part. Feed the angles into whatever you are placing — CSS `rotate()`, an instanced attribute, a `THREE.Vector3` per item — the visualiser is only here to show what the numbers do.

## Definition of done

On first scroll into view the solid ticks slide off their dashed ghosts and stop; every accent tick stays exactly on its ghost because the lattice is pinned. The "min gap" readout shows a struck-through small number followed by a larger one at or above the target. Reload ten times and the arrangement is byte-identical. Set `evenRatio` to 0 and every tick moves.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
