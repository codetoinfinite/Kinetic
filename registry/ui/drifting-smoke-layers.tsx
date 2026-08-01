'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Drifting Smoke Layers
   --------------------------------------------------------------------------
   Volumetric-looking fog with no noise texture, no canvas and no JavaScript.
   Each layer is one element painting two soft radial gradients, heavily
   blurred, at low opacity, slowly translating, scaling and rotating.

   Three things do all the work:

     inset: -25%      the layer is 150% of its container in both axes and
                      overflows on every side, so translating and scaling it
                      never brings an edge into view.
     coprime periods  16s / 22s / 29s. The combined pattern only repeats at
                      lcm(16, 22, 29) = 5104s, about 85 minutes. Equal periods
                      would visibly loop every few seconds.
     unequal blur     40 / 55 / 70px reads as three distances rather than
                      three copies of the same cloud.

   Only `transform` is animated, so each blurred layer is rasterised and then
   composited — the blur itself is not recomputed per frame.
   ========================================================================== */

/** Lets an inline `style` object carry custom properties without a cast. */
type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>;

export interface DriftingSmokeLayersProps {
  /** How many layers to render, 1-3. More layers, more depth, more fill-rate. */
  layers?: 1 | 2 | 3;
  /** Any CSS colour. Defaults to `currentColor`, so the fog takes the text colour. */
  tint?: string;
  /** Multiplies every layer's opacity. 1 is the tuned default. */
  intensity?: number;
  /** Multiplies every layer's period. 2 is half speed. */
  speed?: number;
  className?: string;
}

interface Blob {
  /** Gradient ellipse size, as a percentage of the layer. */
  w: number;
  h: number;
  /** Gradient centre, as a percentage of the layer. */
  x: number;
  y: number;
  /** Tint percentage at the centre. */
  alpha: number;
  /** Where the gradient reaches full transparency. */
  edge: number;
}

interface LayerSpec {
  durationS: number;
  blurPx: number;
  opacity: number;
  /** Pose at 0% and 100% of the cycle. */
  fromX: string;
  fromY: string;
  fromScale: number;
  /** Pose at 50%. */
  toX: string;
  toY: string;
  toScale: number;
  rotateDeg: number;
  blobs: [Blob, Blob];
}

// #region critical
/* Hand-tuned rather than seeded-random: these are the poses, not samples from
   a distribution, and a PRNG here would only make them harder to adjust. */
const LAYER_SPECS: readonly LayerSpec[] = [
  {
    durationS: 16,
    blurPx: 40,
    opacity: 0.55,
    fromX: '-8%',
    fromY: '-6%',
    fromScale: 1.25,
    toX: '10%',
    toY: '8%',
    toScale: 1.45,
    rotateDeg: 8,
    blobs: [
      { w: 40, h: 50, x: 70, y: 30, alpha: 55, edge: 60 },
      { w: 45, h: 55, x: 30, y: 65, alpha: 40, edge: 62 },
    ],
  },
  {
    durationS: 22,
    blurPx: 55,
    opacity: 0.4,
    fromX: '6%',
    fromY: '4%',
    fromScale: 1.3,
    toX: '-9%',
    toY: '-7%',
    toScale: 1.5,
    rotateDeg: -11,
    blobs: [
      { w: 55, h: 45, x: 25, y: 35, alpha: 45, edge: 64 },
      { w: 50, h: 60, x: 75, y: 70, alpha: 32, edge: 66 },
    ],
  },
  {
    durationS: 29,
    blurPx: 70,
    opacity: 0.3,
    fromX: '-4%',
    fromY: '7%',
    fromScale: 1.35,
    toX: '8%',
    toY: '-9%',
    toScale: 1.55,
    rotateDeg: 6,
    blobs: [
      { w: 60, h: 60, x: 50, y: 20, alpha: 38, edge: 68 },
      { w: 48, h: 52, x: 20, y: 80, alpha: 28, edge: 70 },
    ],
  },
];

const SMOKE_CSS = `
/* One keyframe block for every layer. The transform endpoints are read from
   custom properties, which are resolved per element, so each layer follows a
   different path through the same two-pose cycle. */
@keyframes kx-smoke-drift {
  0%, 100% {
    transform:
      translate(var(--kx-smoke-x0), var(--kx-smoke-y0))
      scale(var(--kx-smoke-s0))
      rotate(0deg);
  }
  50% {
    transform:
      translate(var(--kx-smoke-x1), var(--kx-smoke-y1))
      scale(var(--kx-smoke-s1))
      rotate(var(--kx-smoke-r));
  }
}

.kx-smoke {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  /* Cuts the layers out of the page's paint and layout tree entirely. Without
     it the browser considers the oversized blurred children when computing
     the ancestor's ink overflow on every frame. */
  contain: paint;
}

.kx-smoke-layer {
  position: absolute;
  /* 150% of the container in both axes. A layer that exactly fits would show
     a hard edge the instant it translates. */
  inset: -25%;
  background: var(--kx-smoke-bg);
  filter: blur(var(--kx-smoke-blur));
  opacity: var(--kx-smoke-opacity);
  animation: kx-smoke-drift var(--kx-smoke-dur) ease-in-out infinite;
  will-change: transform;
}

/* Reduced motion parks every layer on its 50% pose rather than its 0% pose.
   The 50% pose is the fuller, more composed frame; 0% is where the layers are
   most nearly stacked, which reads as a single flat wash. */
@media (prefers-reduced-motion: reduce) {
  .kx-smoke-layer {
    animation: none;
    will-change: auto;
    transform:
      translate(var(--kx-smoke-x1), var(--kx-smoke-y1))
      scale(var(--kx-smoke-s1))
      rotate(var(--kx-smoke-r));
  }
}
`;

/** Two offset ellipses per layer. Percentages keep it resolution-independent. */
function backgroundFor(spec: LayerSpec, tint: string): string {
  return spec.blobs
    .map(
      (b) =>
        `radial-gradient(${b.w}% ${b.h}% at ${b.x}% ${b.y}%, ` +
        `color-mix(in oklab, ${tint} ${b.alpha}%, transparent), transparent ${b.edge}%)`,
    )
    .join(', ');
}

export function DriftingSmokeLayers({
  layers = 3,
  tint = 'var(--smoke-tint, currentColor)',
  intensity = 1,
  speed = 1,
  className,
}: DriftingSmokeLayersProps) {
  return (
    <>
      <style href="kinetic-drifting-smoke-layers" precedence="medium">
        {SMOKE_CSS}
      </style>
      <div className={cn('kx-smoke', className)} aria-hidden="true">
        {LAYER_SPECS.slice(0, layers).map((spec) => {
          const style: StyleWithVars = {
            '--kx-smoke-bg': backgroundFor(spec, tint),
            '--kx-smoke-blur': `${spec.blurPx}px`,
            '--kx-smoke-opacity': spec.opacity * intensity,
            '--kx-smoke-dur': `${spec.durationS * speed}s`,
            '--kx-smoke-x0': spec.fromX,
            '--kx-smoke-y0': spec.fromY,
            '--kx-smoke-s0': spec.fromScale,
            '--kx-smoke-x1': spec.toX,
            '--kx-smoke-y1': spec.toY,
            '--kx-smoke-s1': spec.toScale,
            '--kx-smoke-r': `${spec.rotateDeg}deg`,
          };
          return <span key={spec.durationS} className="kx-smoke-layer" style={style} />;
        })}
      </div>
    </>
  );
}
// #endregion critical
