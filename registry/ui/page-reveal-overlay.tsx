'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Key-Replayed Page Reveal
   --------------------------------------------------------------------------
   A route transition with no animation library, no state machine and no
   cleanup, built on one fact about React: changing an element's `key`
   unmounts it and mounts a new one, and a freshly mounted element runs its
   CSS animation from frame zero.

   So the inbound half is a single opaque div with `key={revealKey}` that
   animates itself from opacity 1 to 0. Every time the key changes the fade
   replays. There is nothing to reset, nothing to cancel, and nothing that can
   be left in a half-finished state by a fast double navigation.

   The outbound half is the mirror: a second layer fades UP to opaque, and the
   route commit fires while it is still settling. At the instant the key
   changes the screen is already covered, so the two halves — which never talk
   to each other — hand off invisibly.

     cover:  0 ------------- 0.32s   (opacity 0 -> 1)
     commit:        0.26s            (80% through: >95% opaque)
     reveal:        0.26s ---------------------------- 0.81s

   `usePageCover` owns the timer and the covering flag; the component owns the
   two layers. Neither imports a router — the hook takes the commit as a
   callback, so the same component works under Next.js, React Router, or a
   `useState` page switch.
   ========================================================================== */

// #region critical
/**
 * Seconds the outbound cover takes to reach opaque. Shared default so the hook
 * that times the commit and the layer that runs the transition cannot be given
 * two different numbers.
 */
export const PAGE_COVER_DURATION = 0.32;

/**
 * Fraction of the cover the commit waits for. On the `cubic-bezier(0.4, 0, 1,
 * 1)` cover, 80% of the way through the screen is about 96% opaque, so the
 * step to fully covered is imperceptible — and a fifth of the perceived
 * navigation latency is gone. Waiting for 100% is a fifth of a second of dead
 * time on every single click.
 */
const COMMIT_FRACTION = 0.8;

const REVEAL_CSS = `
@keyframes kinetic-page-reveal {
  from { opacity: 1; }
  to   { opacity: 0; visibility: hidden; }
}
.kinetic-reveal-root {
  /* Never eats a click, not even mid-fade. The layer is opaque and covers the
     whole viewport; one swallowed click on a nav item is a dead site. */
  pointer-events: none;
  z-index: var(--kx-reveal-z, 195);
}
.kinetic-reveal-layer {
  position: absolute;
  inset: 0;
  background: var(--kx-reveal-color, #000);
}
/* Inbound. Starts opaque because it is mounted at the moment the destination
   is mounted, and holds the end frame with 'forwards' so 'visibility: hidden'
   retires the layer from compositing instead of leaving an invisible
   full-screen surface alive for the rest of the page's life. */
.kinetic-reveal-in {
  opacity: 1;
  animation: var(--kx-reveal-duration, 0.55s) cubic-bezier(0.4, 0, 0.2, 1)
    forwards kinetic-page-reveal;
}
/* Outbound. Idle is hidden as well as transparent, for the same reason. */
.kinetic-reveal-cover {
  opacity: 0;
  visibility: hidden;
}
/* The transition is declared on the covering state ONLY, so release is a cut.
   That is deliberate: at release the re-keyed inbound layer is already sitting
   at opacity 1 directly above this one, so a second fade here would compound
   two opacities and hold the screen dark past the end of the reveal. */
.kinetic-reveal-cover[data-covering='true'] {
  opacity: 1;
  visibility: visible;
  transition: opacity var(--kx-cover-duration, 0.32s)
    cubic-bezier(0.4, 0, 1, 1);
}
@media (prefers-reduced-motion: reduce) {
  /* Not 'animation: none' — that would leave the inbound layer parked at its
     opaque from-frame, permanently covering the site. The layers are removed
     entirely, and 'usePageCover' commits synchronously, so navigation is a
     hard cut to the destination with no flash of overlay in either direction. */
  .kinetic-reveal-layer { display: none; }
}
`;

export interface PageRevealOverlayProps {
  /**
   * Identity of the current page. A change replays the reveal. In Next.js App
   * Router this is `usePathname()`; in the demo it is a local state value.
   */
  revealKey: string;
  /** Seconds the inbound cover takes to fade away. */
  revealDuration?: number;
  /** Seconds the outbound cover takes to reach opaque. */
  coverDuration?: number;
  /** Drive from `usePageCover().covering`. */
  covering?: boolean;
  /** Any CSS colour. Must be opaque, or the page shows through the handoff. */
  color?: string;
  /** Above the site, below a preloader. */
  zIndex?: number;
  /** `absolute` to demo inside a bounded box; `fixed` for a real page. */
  position?: 'fixed' | 'absolute';
  className?: string;
}

export function PageRevealOverlay({
  revealKey,
  revealDuration = 0.55,
  coverDuration = PAGE_COVER_DURATION,
  covering = false,
  color = '#000',
  zIndex = 195,
  position = 'fixed',
  className,
}: PageRevealOverlayProps) {
  return (
    <>
      {/* React 19 hoists and dedupes by `href`, so a hundred navigations and
          any number of instances still emit exactly one rule block. Per
          instance values ride in custom properties for that reason. */}
      <style href="kinetic-page-reveal-overlay" precedence="medium">
        {REVEAL_CSS}
      </style>

      <div
        aria-hidden
        className={cn(
          'kinetic-reveal-root',
          position === 'fixed' ? 'fixed inset-0' : 'absolute inset-0',
          className,
        )}
        style={
          {
            '--kx-reveal-duration': `${revealDuration}s`,
            '--kx-cover-duration': `${coverDuration}s`,
            '--kx-reveal-color': color,
            '--kx-reveal-z': zIndex,
          } as CSSProperties
        }
      >
        {/* Cover first, reveal second: later in the DOM paints on top, and the
            inbound layer's opaque first frame is what hides the cover's cut. */}
        <div
          className="kinetic-reveal-layer kinetic-reveal-cover"
          data-covering={covering ? 'true' : 'false'}
        />
        <div key={revealKey} className="kinetic-reveal-layer kinetic-reveal-in" />
      </div>
    </>
  );
}

export interface PageCover {
  /** Feed to `PageRevealOverlay`. */
  covering: boolean;
  /** Raise the cover, then run `commit` — your navigation — under it. */
  cover: (commit: () => void) => void;
}

/**
 * The outbound half. `commit` is a callback rather than a router call so
 * nothing here depends on a routing library.
 */
export function usePageCover(coverDuration = PAGE_COVER_DURATION): PageCover {
  const [covering, setCovering] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    },
    [],
  );

  const cover = useCallback(
    (commit: () => void) => {
      // Reduced motion: no cover at all, and the commit is synchronous. A
      // zero-duration cover would still be one frame of opaque colour, which
      // is a flash — the single most unpleasant thing to show someone who has
      // asked for less motion.
      if (reduced) {
        commit();
        return;
      }
      // A second click while a cover is already up would schedule a second
      // commit and navigate twice. The live timer is the lock.
      if (timer.current !== null) return;

      setCovering(true);
      timer.current = setTimeout(
        () => {
          timer.current = null;
          // Both in one tick, so React batches them into a single commit: the
          // cover drops to transparent on the exact frame the re-keyed reveal
          // layer mounts at opacity 1. Split across two ticks and there is one
          // frame of bare destination content between them.
          setCovering(false);
          commit();
        },
        coverDuration * COMMIT_FRACTION * 1000,
      );
    },
    [coverDuration, reduced],
  );

  return { covering, cover };
}
// #endregion critical
