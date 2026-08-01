'use client';

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Slow Idle Float
   --------------------------------------------------------------------------
   A 14px rise and fall over 5 seconds. Slow enough that nobody consciously
   notices it and the element still feels alive rather than pasted on.

   It animates the independent `translate` property, not `transform`. That is
   the whole reason this is a component and not two lines of CSS:

     - `transform` is one property. An animation on it beats any transition on
       it, for the entire duration, because animations sit above transitions
       in the cascade. Put an idle float and a `hover:scale-105` on the same
       element with `transform` and the hover silently does nothing.
     - `translate`, `rotate` and `scale` are separate properties that compose
       with `transform` (applied in that order). The float owns `translate`
       and leaves `transform` free for whatever the consumer wants.
   ========================================================================== */

/** Lets an inline `style` object carry custom properties without a cast. */
type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>;

export interface SlowFloatIdleProps {
  children: ReactNode;
  /** Peak travel in pixels, reached at the midpoint of the cycle. */
  distance?: number;
  /** Full round trip, in milliseconds. */
  durationMs?: number;
  /** Direction of travel. `y` rises, `x` drifts right. */
  axis?: 'x' | 'y';
  /**
   * Where in the cycle this instance starts, 0-1. Applied as a NEGATIVE
   * `animation-delay`, so the element is already mid-flight on first paint
   * instead of waiting motionless for its turn.
   */
  phase?: number;
  className?: string;
}

// #region critical
const FLOAT_CSS = `
@keyframes kx-float-idle {
  0%, 100% { translate: 0 0; }
  50%      { translate: var(--kx-float-x, 0px) var(--kx-float-y, -14px); }
}

.kx-float {
  display: block;
  animation: kx-float-idle var(--kx-float-duration, 5s) ease-in-out infinite;
  animation-delay: var(--kx-float-delay, 0s);
  /* Names the property that is actually animating. 'will-change: transform'
     is the reflex here and it hints at the wrong property entirely. */
  will-change: translate;
}

/* No motion: the element rests at its natural layout position, not at the
   midpoint of the float. The hint is released too — a promoted layer for an
   animation that is not running is pure GPU memory. */
@media (prefers-reduced-motion: reduce) {
  .kx-float {
    animation: none;
    will-change: auto;
  }
}
`;

export function SlowFloatIdle({
  children,
  distance = 14,
  durationMs = 5000,
  axis = 'y',
  phase = 0,
  className,
}: SlowFloatIdleProps) {
  const style: StyleWithVars = {
    '--kx-float-duration': `${durationMs}ms`,
    // Negative: the animation is treated as having already run for this long,
    // so a set of floats is out of phase from the very first frame.
    '--kx-float-delay': `${-durationMs * phase}ms`,
    // Rise, not fall: negative Y is up. X drifts right on the positive side.
    '--kx-float-x': axis === 'x' ? `${distance}px` : '0px',
    '--kx-float-y': axis === 'y' ? `${-distance}px` : '0px',
  };

  return (
    <>
      <style href="kinetic-slow-float-idle" precedence="medium">
        {FLOAT_CSS}
      </style>
      <div className={cn('kx-float', className)} style={style}>
        {children}
      </div>
    </>
  );
}
// #endregion critical
