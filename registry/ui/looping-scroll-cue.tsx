'use client';

import type { CSSProperties } from 'react';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Looping Scroll Cue
   --------------------------------------------------------------------------
   The hairline that dives down a hero and tells you the page continues. One
   keyframe pair, one easing curve, and a clipping tube — no rAF, no
   observer, no JavaScript running after mount at all.

   The two numbers are the whole component.

   The travel is -100% to 250%, measured against the LINE's own height rather
   than the tube's. With the line at 40% of the tube, -100% puts its bottom
   edge exactly on the top of the tube and 250% puts its top edge exactly on
   the bottom: the line is fully outside the clip at both ends, so the jump
   back to the start happens while nothing is on screen and the loop has no
   seam. A cue that reappears at the top mid-fade is the tell that someone
   animated 0% to 100%.

   The easing is cubic-bezier(.76, 0, .24, 1) — a hard ease-in-out with almost
   no linear middle. It is what turns a continuously moving line into a
   gesture: the line hangs above the tube, dives through it, hangs below, and
   the pause between dives is what reads as an instruction rather than as
   decoration.

   Reduced motion is handled twice on purpose. The media query is in the
   stylesheet so the very first paint is already correct on the server-rendered
   markup, and the hook drives `data-static` so the cue also responds when the
   setting is changed while the page is open. Either way the static state is a
   line parked in the middle of the tube — the animation's literal end state is
   off-screen, so honouring reduced motion by "rendering the end state" would
   render nothing at all.
   ========================================================================== */

// #region critical
const CUE_CSS = `
@keyframes kx-scroll-cue-travel {
  from { transform: translateY(-100%); }
  to   { transform: translateY(250%); }
}
.kx-scroll-cue {
  position: relative;
  display: block;
  overflow: hidden;
  flex: none;
  inline-size: var(--kx-cue-thickness, 1px);
  block-size: var(--kx-cue-length, 3.5rem);
  color: currentColor;
}
.kx-scroll-cue-line {
  position: absolute;
  inset-inline: 0;
  top: 0;
  block-size: var(--kx-cue-run, 40%);
  background-color: currentColor;
  /* Matches the keyframe start, so the line is already outside the clip
     before the first frame and never flashes at rest. */
  transform: translateY(-100%);
  animation: var(--kx-cue-period, 1.8s) cubic-bezier(.76, 0, .24, 1) infinite
    kx-scroll-cue-travel;
  animation-delay: var(--kx-cue-delay, 0s);
}
/* Parked, not frozen. 'animation-play-state: paused' stops on whatever frame
   it reached, and for roughly half the cycle that frame is off-screen — the
   cue would simply vanish. */
.kx-scroll-cue[data-static='true'] .kx-scroll-cue-line {
  animation: none;
  top: 50%;
  transform: translateY(-50%);
}
@media (prefers-reduced-motion: reduce) {
  .kx-scroll-cue .kx-scroll-cue-line {
    animation: none;
    top: 50%;
    transform: translateY(-50%);
  }
}
`;

export interface LoopingScrollCueProps {
  /** Height of the tube. Any CSS length. */
  length?: string;
  /** Width of the line. Any CSS length. */
  thickness?: string;
  /** Height of the travelling segment, as a percentage of the tube. */
  run?: string;
  /** Seconds for one full dive. */
  period?: number;
  /** Seconds before the first dive. Stagger a row of cues with this. */
  delay?: number;
  /** Park the line in the middle instead of running it. */
  paused?: boolean;
  className?: string;
}

export function LoopingScrollCue({
  length = '3.5rem',
  thickness = '1px',
  run = '40%',
  period = 1.8,
  delay = 0,
  paused = false,
  className,
}: LoopingScrollCueProps) {
  const reduced = useReducedMotion();

  return (
    <>
      {/* Hoisted once by React 19 regardless of how many cues are on the page. */}
      <style href="kinetic-looping-scroll-cue" precedence="medium">
        {CUE_CSS}
      </style>
      <span
        aria-hidden
        data-static={reduced || paused ? 'true' : 'false'}
        className={cn('kx-scroll-cue', className)}
        style={
          {
            '--kx-cue-length': length,
            '--kx-cue-thickness': thickness,
            '--kx-cue-run': run,
            '--kx-cue-period': `${period}s`,
            '--kx-cue-delay': `${delay}s`,
          } as CSSProperties
        }
      >
        <span className="kx-scroll-cue-line" />
      </span>
    </>
  );
}
// #endregion critical
