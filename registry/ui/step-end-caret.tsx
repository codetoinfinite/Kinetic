'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Step-End Blinking Caret
   --------------------------------------------------------------------------
   One rule carries this component: `animation-timing-function: step-end`. A
   real terminal cursor is a hardware blink — it is on, then it is off, with
   nothing in between. Interpolate the opacity and you get a pulsing glow,
   which reads as decoration rather than as an insertion point.

   The keyframe distribution is deliberately uneven — on 0-20%, off 20-50%, on
   50-70%, off 70-100%. A perfect square wave reads as a metronome; the long
   on / short off / long on pattern reads as something alive.

   Cost is CSS: no JavaScript runs after mount, no rAF, nothing to clean up.
   The stylesheet is emitted once through React 19's `<style precedence>`
   hoisting, so a hundred carets on a page produce one rule.
   ========================================================================== */

// #region critical
const CARET_CSS = `
@keyframes kinetic-caret-blink {
  0%, 70%, 100% { opacity: 1; }
  20%, 50%      { opacity: 0; }
}
.kinetic-caret {
  display: inline-block;
  background-color: currentColor;
  vertical-align: -0.14em;
  animation: var(--kx-caret-period, 1.05s) step-end infinite kinetic-caret-blink;
}
/* Paused means solid, not frozen. 'animation-play-state: paused' stops on
   whatever frame it happened to be on, which is a 50% chance of an invisible
   caret. Dropping the animation entirely re-exposes the base opacity. */
.kinetic-caret[data-paused='true'] {
  animation: none;
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .kinetic-caret {
    animation: none;
    opacity: 1;
  }
}
`;

export interface StepEndCaretProps {
  /** Bar width in px. */
  width?: number;
  /** Any CSS length. `em` keeps it locked to the type size around it. */
  height?: string;
  /** Seconds for one on-off-on-off cycle. */
  period?: number;
  /** Hold the caret solid — what a real terminal does while keys are down. */
  paused?: boolean;
  className?: string;
}

export function StepEndCaret({
  width = 2,
  height = '1em',
  period = 1.05,
  paused = false,
  className,
}: StepEndCaretProps) {
  return (
    <>
      <style href="kinetic-step-end-caret" precedence="medium">
        {CARET_CSS}
      </style>
      <span
        aria-hidden
        data-paused={paused ? 'true' : 'false'}
        className={cn('kinetic-caret', className)}
        style={
          {
            width,
            height,
            '--kx-caret-period': `${period}s`,
          } as CSSProperties
        }
      />
    </>
  );
}
// #endregion critical
