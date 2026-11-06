import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'relaxed-seeded-scatter',
  title: 'Relaxed Seeded Scatter',
  category: 'primitive',
  tags: ['prng', 'lloyd-relaxation', 'scatter', 'deterministic', 'layout'],
  blurb: 'Seeded angles around a ring, pushed apart until nothing collides. Ghost ticks mark where they started.',
  cost: 'dom',
  motif: 'orbit',

  files: [
    {
      path: 'registry/ui/relaxed-seeded-scatter.tsx',
      target: 'components/motion/relaxed-seeded-scatter.tsx',
      type: 'registry:ui',
      role: 'component + relaxedRingAngles()',
    },
    {
      path: 'registry/lib/prng.ts',
      target: 'lib/prng.ts',
      type: 'registry:lib',
      role: 'seeded random — mulberry32, hashSeed, createRng',
    },
    {
      path: 'registry/lib/wrap.ts',
      target: 'lib/wrap.ts',
      type: 'registry:lib',
      role: 'true modulo for gap measurement across the wrap',
    },
    {
      path: 'registry/lib/easing.ts',
      target: 'lib/easing.ts',
      type: 'registry:lib',
      role: 'easing functions for the settle',
    },
    {
      path: 'registry/hooks/use-raf.ts',
      target: 'hooks/use-raf.ts',
      type: 'registry:hook',
      role: 'shared rAF loop with clamped delta',
    },
    {
      path: 'registry/hooks/use-in-view.ts',
      target: 'hooks/use-in-view.ts',
      type: 'registry:hook',
      role: 'IntersectionObserver, pooled per option set',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      target: 'hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'prefers-reduced-motion, SSR-safe',
    },
  ],
  dependencies: [],

  summary:
    'Half the points sit on an exact lattice and half are seeded noise; fifteen relaxation sweeps then push the noisy ones apart until no neighbour pair is closer than 40% of the mean spacing. The result keeps the liveliness of random placement without the clusters that read as a bug. The visualiser leaves a dashed ghost at each point\'s pre-relaxation angle, so the displacement is legible, and prints the smallest gap before and after.',

  mechanism: [
    '`floor(count * evenRatio)` points are written at `(i / fixedCount) * 2PI` and flagged fixed; the remainder get `rng() * 2PI` from `createRng(seed)`, a mulberry32 stream. The raw array is copied before anything moves so the two states can be compared and interpolated.',
    'The target gap is `(2PI / count) * 0.4` — 40% of the mean spacing on the full ring, not on the random subset, so the floor means the same thing regardless of how many points are pinned.',
    'Each sweep sorts the nodes by `mod(angle, 2PI)`, then walks consecutive pairs measuring `gap = mod(next.angle - current.angle, 2PI)`. Because `mod` always measures the short way round, the pair that straddles zero needs no special case.',
    'When a gap is under target, each free endpoint is moved by `(target - gap) * 0.5` away from the other; if one endpoint is pinned to the lattice the free one absorbs the whole `(target - gap)` instead, or points pile up against the lattice and never separate.',
    'Angles are stored unwrapped — a point pushed below zero keeps a small negative value rather than jumping to just under 2PI — so the component can interpolate `raw -> relaxed` linearly and never take the long way round. Only the sort and the gap measurement wrap.',
    'The visualiser eases that interpolation over 1.4 s with `easeOutQuart` on the shared rAF loop, writing the `transform` attribute of one `<g>` per point. The SVG uses a `-50 -50 100 100` viewBox, so it resizes with its container and needs no ResizeObserver.',
  ],

  constants: [
    {
      name: 'RELAX_PASSES',
      value: '15',
      why: 'Each sweep removes about half the remaining overlap, so 15 leaves 2^-15 of the initial error — fully converged for any count up to ~64. At 3 passes the tightest pairs are still visibly paired; past ~20 nothing measurable changes and you are paying O(passes · n log n) for nothing.',
    },
    {
      name: 'MIN_GAP_RATIO',
      value: '0.4',
      why: 'Floor on the neighbour gap as a fraction of the mean, so `targetGap = 0.4 * 2PI / count`. Below ~0.25 clusters survive and the scatter still reads as clumped. Above ~0.6 the relaxation cannot satisfy every pair at once, so it oscillates between passes and converges toward the lattice — which throws away the randomness you asked for.',
    },
    {
      name: 'EVEN_RATIO',
      value: '0.5',
      why: 'Fraction pinned to the exact lattice. At 0 the composition has no skeleton and the eye finds no structure; at 1 it is a clock face. Half and half is the mix that reads as deliberate but not mechanical.',
    },
    {
      name: 'PUSH_SHARE',
      value: '0.5',
      why: 'Each free neighbour absorbs half the deficit, so a pair separates by exactly the deficit per sweep. At 1.0 both move the full amount, overshoot, and the pair oscillates instead of settling.',
    },
    {
      name: 'MORPH_DURATION',
      value: '1.4',
      why: 'Seconds for the raw-to-relaxed sweep. Long enough to follow individual points leaving their ghosts; under ~0.6 s it reads as a single cut and the comparison is lost.',
    },
    {
      name: 'seed',
      value: "'kinetic'",
      why: 'Any fixed value works — what matters is that it is fixed. `hashSeed` turns the string into a 32-bit integer, so a named seed per instance gives every ring its own reproducible composition.',
    },
  ],

  pitfalls: [
    '`Math.random()` instead of a seeded generator. The server renders one arrangement and the client another, React reports a hydration mismatch and re-renders the subtree, and the layout is different on every reload so no visual diff is ever reviewable.',
    'Not re-sorting between sweeps. A push can carry a point across zero, which re-orders the ring; the next sweep then measures the gap to a point that is no longer the neighbour, pushes the wrong one, and leaves a permanent clump sitting exactly on the wrap.',
    'Measuring the gap as `next - current`. For the pair that straddles zero that is a large negative number, which is always below the target, so the relaxation shoves those two apart on every sweep forever and one point walks all the way around the ring.',
    'Splitting the deficit evenly when one neighbour is pinned. The free point only ever gets half the correction it needs, so it converges to half the required gap and stays visibly stuck to the lattice tick.',
    'Wrapping the angles into `[0, 2PI)` on the way out. The interpolation from `raw` to `angles` then sends any point that crossed zero the long way round the ring, and one tick sweeps a full circle during the settle while the rest move a few degrees.',
    'Rebuilding the ring on every render. `relaxedRingAngles` is O(passes · n log n) and allocates; without `useMemo` keyed on the inputs, every parent render re-runs 15 sweeps and re-allocates two typed arrays.',
  ],

  notes: [
    'Relaxing over the full ring with the lattice pinned is a deliberate deviation from the version this was taken from, which relaxed only the random subset against itself. That version lets a random point land exactly on a lattice point, which is the one collision the technique is supposed to prevent.',
    '`relaxedRingAngles` is the shipped part. Feed the angles into whatever you are placing — CSS `rotate()`, an instanced attribute, a `THREE.Vector3` per item — the visualiser is only here to show what the numbers do.',
  ],

  apiSignature:
    'function relaxedRingAngles(count: number, seed: number | string, options?: { passes?: number; minGapRatio?: number; evenRatio?: number; pushShare?: number }): RelaxedRing;\nfunction RelaxedSeededScatter(props: { count?: number; seed?: number | string; passes?: number; minGapRatio?: number; evenRatio?: number; morph?: boolean; className?: string }): JSX.Element',

  props: [
    { name: 'count', type: 'number', default: '24', description: 'Points on the ring.' },
    { name: 'seed', type: 'number | string', default: "'kinetic'", description: 'Fixed seed. Strings are hashed with `hashSeed`.' },
    { name: 'passes', type: 'number', default: '15', description: 'Relaxation sweeps.' },
    { name: 'minGapRatio', type: 'number', default: '0.4', description: 'Minimum neighbour gap as a fraction of the mean spacing.' },
    { name: 'evenRatio', type: 'number', default: '0.5', description: 'Fraction of points pinned to an exact lattice.' },
    { name: 'morph', type: 'boolean', default: 'true', description: 'Ease from the raw angles to the relaxed ones on first view.' },
    { name: 'className', type: 'string', description: 'Merged onto the outer element via `cn`.' },
  ],

  reducedMotion:
    'The relaxed angles render immediately with no sweep. The dashed ghosts at the raw angles stay, so the before/after comparison the component exists to make is fully readable without anything moving, and the gap readout is unchanged.',

  cleanup:
    '`useRaf` unsubscribes on unmount and the shared frame is cancelled when the last subscriber leaves; the loop also unsubscribes itself the moment the morph completes, so a settled ring costs nothing. `useInView` unobserves the root. No timers, no listeners, no retained typed arrays beyond the memo.',

  acceptance:
    'On first scroll into view the solid ticks slide off their dashed ghosts and stop; every accent tick stays exactly on its ghost because the lattice is pinned. The "min gap" readout shows a struck-through small number followed by a larger one at or above the target. Reload ten times and the arrangement is byte-identical. Set `evenRatio` to 0 and every tick moves.',

  criticalRegion: 'critical',
};

export default meta;
