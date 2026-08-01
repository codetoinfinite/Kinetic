'use client';

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Re-Key Caption Replay
   --------------------------------------------------------------------------
   The problem: a slideshow caption must replay its entrance every time the
   index changes. The usual solutions are both bad.

     1. Toggle a class off and on. The browser coalesces both mutations into
        one style recalculation and the animation never restarts, so you end up
        writing `void el.offsetWidth` between them to force a reflow — a
        deliberate layout thrash, in a comment nobody can justify later.
     2. Tween it with a library. Now a fast prev/next leaves two opposing
        tweens on the same node and the caption jitters.

   The fix is to make the node itself new. `key={entryKey}` means React
   unmounts the caption and mounts a different one, and a freshly mounted
   element runs its CSS animation from frame zero. No reflow hack, no tween to
   kill, and a fast index change cannot land in a half-finished state because
   the half-finished node no longer exists.

   `animation-fill-mode: both` is load-bearing. With a per-line delay, `both`
   holds the from-frame through the delay; without it every line is painted at
   full opacity for the length of its own delay and then snaps back to hidden
   to start animating.
   ========================================================================== */

// #region critical
/**
 * How many direct children get their own delay. Eight covers eyebrow, title,
 * two metadata rows and a counter with room to spare; children past the eighth
 * are pinned to the eighth's delay rather than falling back to zero, so an
 * overlong block degrades to "the tail arrives together" instead of "the tail
 * arrives first".
 */
const MAX_STAGGERED_LINES = 8;

const STAGGER_RULES = [
  ...Array.from(
    { length: MAX_STAGGERED_LINES },
    (_, i) =>
      `.kinetic-rekey > :nth-child(${i + 1}) { animation-delay: calc(var(--kx-rekey-stagger, 0.06s) * ${i}); }`,
  ),
  `.kinetic-rekey > :nth-child(n + ${MAX_STAGGERED_LINES + 1}) { animation-delay: calc(var(--kx-rekey-stagger, 0.06s) * ${MAX_STAGGERED_LINES - 1}); }`,
].join('\n');

const REKEY_CSS = `
@keyframes kinetic-rekey-in {
  from { opacity: 0; transform: translateY(var(--kx-rekey-from, 14px)); }
  to   { opacity: 1; transform: translateY(0); }
}
/* One keyframe covers both directions: the offset is a custom property, so
   flipping its sign on the root turns a rise into a drop without a second
   set of keyframes to keep in sync. */
.kinetic-rekey > * {
  animation: var(--kx-rekey-duration, 0.5s) cubic-bezier(0.22, 1, 0.36, 1)
    both kinetic-rekey-in;
}
${STAGGER_RULES}
@media (prefers-reduced-motion: reduce) {
  /* The still state IS the destination: full opacity, no offset. Dropping the
     animation re-exposes those as the base values, which is why there is
     nothing to declare here beyond 'none'. A zero-duration animation would
     instead hold whatever 'both' resolved and still fire animationend. */
  .kinetic-rekey > * { animation: none; }
}
`;

export interface RekeyCaptionReplayProps {
  /**
   * Identity of the current caption. Any change replays the entrance — in a
   * slideshow this is the slide index, in a filter it is the active facet.
   */
  entryKey: string | number;
  /** Direct children each get their own delay, in source order. */
  children: ReactNode;
  /** Seconds one line's entrance lasts. */
  duration?: number;
  /** Pixels a line travels. Signed by `direction`. */
  distance?: number;
  /** Seconds between successive lines. 0 makes the block arrive as one piece. */
  stagger?: number;
  /**
   * `up` enters from below — the default, and correct for advancing forward.
   * `down` enters from above, which is what makes a step backward read as a
   * step backward rather than as another step forward.
   */
  direction?: 'up' | 'down';
  className?: string;
}

export function RekeyCaptionReplay({
  entryKey,
  children,
  duration = 0.5,
  distance = 14,
  stagger = 0.06,
  direction = 'up',
  className,
}: RekeyCaptionReplayProps) {
  const from = direction === 'up' ? distance : -distance;

  return (
    <>
      <style href="kinetic-rekey-caption-replay" precedence="medium">
        {REKEY_CSS}
      </style>

      {/* The key is on this wrapper, so every child is a new node on every
          change and every child animation restarts. Putting the key on the
          children individually would replay only the ones whose own identity
          changed, which for a caption is usually none of them. */}
      <div
        key={entryKey}
        className={cn('kinetic-rekey', className)}
        style={
          {
            '--kx-rekey-duration': `${duration}s`,
            '--kx-rekey-stagger': `${stagger}s`,
            '--kx-rekey-from': `${from}px`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </>
  );
}
// #endregion critical
