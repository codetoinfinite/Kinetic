'use client';

import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { easeOutQuart } from '@/registry/lib/easing';
import { createRng } from '@/registry/lib/prng';
import { mod } from '@/registry/lib/wrap';

/* ==========================================================================
   Relaxed Seeded Scatter
   --------------------------------------------------------------------------
   Pure random angles clump: uniform sampling produces gaps and clusters, and
   the eye reads a cluster as a mistake. Pure even spacing reads as a machine.
   The composition everyone actually wants is half lattice, half noise, with
   the noise pushed apart until nothing collides — a couple of Lloyd
   relaxation passes over the circle.

   Seeded, so the server and the client agree and the layout is the same on
   every reload. `Math.random()` here is a hydration mismatch and an
   un-reviewable visual diff.
   ========================================================================== */

const TAU = Math.PI * 2;

export interface RelaxedRingOptions {
  /** Relaxation sweeps. Each one halves the remaining overlap. */
  passes?: number;
  /** Minimum neighbour gap as a fraction of the mean gap `2PI / count`. */
  minGapRatio?: number;
  /** Fraction of the points pinned to an exact lattice. */
  evenRatio?: number;
  /** Share of a deficit each of the two neighbours absorbs. */
  pushShare?: number;
}

export interface RelaxedRing {
  /**
   * Relaxed angles in radians, indexed by item. Deliberately NOT wrapped into
   * `[0, 2PI)`: a point pushed past zero keeps a small negative value so that
   * interpolating from `raw` to here never takes the long way round. `cos` and
   * `sin` do not care.
   */
  angles: Float32Array;
  /** The same items before relaxation, same indices. */
  raw: Float32Array;
  /** Smallest neighbour gap after relaxation, radians. */
  minGap: number;
  /** Smallest neighbour gap before relaxation, radians. */
  rawMinGap: number;
  /** Neighbour pairs closer than `targetGap`, after and before. */
  crowded: number;
  rawCrowded: number;
  /** The gap the relaxation was aiming for. */
  targetGap: number;
  /** Number of points pinned to the lattice. */
  fixedCount: number;
}

// #region critical
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
// #endregion critical

export interface RelaxedSeededScatterProps {
  count?: number;
  seed?: number | string;
  passes?: number;
  minGapRatio?: number;
  evenRatio?: number;
  /** Ease from the raw angles to the relaxed ones the first time it is seen. */
  morph?: boolean;
  className?: string;
}

/** Seconds for the raw -> relaxed sweep. */
const MORPH_DURATION = 1.4;
const RING_RADIUS = 33;
const TICK_INNER = 27;
const TICK_OUTER = 38;

export function RelaxedSeededScatter({
  count = 24,
  seed = 'kinetic',
  passes = RELAX_PASSES,
  minGapRatio = MIN_GAP_RATIO,
  evenRatio = EVEN_RATIO,
  morph = true,
  className,
}: RelaxedSeededScatterProps) {
  const root = useRef<HTMLDivElement>(null);
  const groups = useRef<(SVGGElement | null)[]>([]);
  const elapsed = useRef(0);
  const [settled, setSettled] = useState(false);

  const reduced = useReducedMotion();
  const { inView } = useInView(root, { threshold: 0.35, once: true });

  const ring = useMemo(
    () => relaxedRingAngles(count, seed, { passes, minGapRatio, evenRatio }),
    [count, seed, passes, minGapRatio, evenRatio],
  );

  const animating = morph && !reduced && inView && !settled;

  useRaf((dt) => {
    elapsed.current += dt;
    const t = easeOutQuart(Math.min(elapsed.current / MORPH_DURATION, 1));
    for (let i = 0; i < count; i++) {
      const g = groups.current[i];
      const from = ring.raw[i];
      const to = ring.angles[i];
      if (!g || from === undefined || to === undefined) continue;
      const angle = from + (to - from) * t;
      g.setAttribute('transform', `rotate(${((angle * 180) / Math.PI).toFixed(3)})`);
    }
    if (elapsed.current >= MORPH_DURATION) setSettled(true);
  }, animating);

  const fmt = (v: number) => v.toFixed(3);

  return (
    <div ref={root} className={cn('flex h-full w-full flex-col', className)}>
      <div className="min-h-0 flex-1">
        <svg viewBox="-50 -50 100 100" className="h-full w-full" aria-hidden>
          <circle r={RING_RADIUS} className="fill-none stroke-line" strokeWidth={0.3} />

          {/* Where the seeded sampler put each point. Half of them collide. */}
          {Array.from({ length: count }, (unused, i) => {
            const a = ring.raw[i];
            if (a === undefined || i < ring.fixedCount) return null;
            return (
              <g key={`ghost-${i}`} transform={`rotate(${(a * 180) / Math.PI})`}>
                <line
                  x1={0}
                  y1={-TICK_INNER}
                  x2={0}
                  y2={-TICK_OUTER}
                  className="stroke-faint"
                  strokeWidth={0.35}
                  strokeDasharray="1 1.4"
                />
              </g>
            );
          })}

          {/* Where relaxation put them. Pinned lattice points never left. */}
          {Array.from({ length: count }, (unused, i) => {
            const start = morph && !reduced ? ring.raw[i] : ring.angles[i];
            const fixed = i < ring.fixedCount;
            if (start === undefined) return null;
            return (
              <g
                key={i}
                ref={(el) => {
                  groups.current[i] = el;
                }}
                transform={`rotate(${(start * 180) / Math.PI})`}
              >
                <line
                  x1={0}
                  y1={-TICK_INNER}
                  x2={0}
                  y2={-TICK_OUTER}
                  className={fixed ? 'stroke-accent' : 'stroke-fg'}
                  strokeWidth={fixed ? 0.7 : 0.5}
                />
                <circle
                  cy={-TICK_OUTER}
                  r={fixed ? 1.5 : 1.1}
                  className={fixed ? 'fill-accent' : 'fill-fg'}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <dl className="grid shrink-0 grid-cols-3 gap-px border-t border-line bg-line font-mono text-[10px] uppercase tracking-[0.08em]">
        <div className="bg-bg px-3 py-2">
          <dt className="text-faint">min gap</dt>
          <dd className="mt-0.5 tabular-nums text-fg">
            <span className="text-faint line-through">{fmt(ring.rawMinGap)}</span>{' '}
            {fmt(ring.minGap)}
          </dd>
        </div>
        <div className="bg-bg px-3 py-2">
          <dt className="text-faint">target</dt>
          <dd className="mt-0.5 tabular-nums text-muted">{fmt(ring.targetGap)}</dd>
        </div>
        <div className="bg-bg px-3 py-2">
          <dt className="text-faint">crowded</dt>
          <dd className="mt-0.5 tabular-nums text-fg">
            <span className="text-faint line-through">{ring.rawCrowded}</span> {ring.crowded}
          </dd>
        </div>
      </dl>
    </div>
  );
}
