'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/cn';
import { useGsap } from '@/registry/hooks/use-gsap';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Throttled Scrub To State
   --------------------------------------------------------------------------
   A scrubbed ScrollTrigger fires `onUpdate` on every frame the scroll
   position moves — 60 to 120 times a second, and more on a trackpad. Calling
   `setState` from there hands React 120 renders a second of whatever tree is
   below you. That is fine for a number in a box and catastrophic for
   anything that reconciles a list, so the usual outcome is that scroll-linked
   React state gets abandoned and everything moves to imperative writes.

   The alternative is a gate. This component keeps the continuous signal
   imperative and commits a *discrete* React state only when three conditions
   are met:

     1. TIME     at least `interval` ms since the last commit
     2. DISTANCE progress moved at least `minDelta` since the last commit
     3. FRAME    at most one commit per animation frame, coalesced

   with one override: the boundary frames (progress <= 0 and >= 1) always
   commit, whatever the clock says. Without that override the gate eats the
   last update of a fast flick and the tree is left at 0.93 forever — the
   single most common bug in hand-rolled scroll throttles.

   The two counters this exposes are the point. `ticks` is how many times
   ScrollTrigger called back; `commits` is how many times React rendered.
   Watch the ratio while you scroll.
   ========================================================================== */

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

export interface ScrubState {
  /** Latest committed progress, 0-1. */
  progress: number;
  /** How many times React has re-rendered from this component. */
  commits: number;
  /** How many times ScrollTrigger called back, as of that commit. */
  ticks: number;
}

export interface ThrottledScrubStateProps {
  /** Render prop. Called only on committed states, not on every tick. */
  children: (state: ScrubState) => ReactNode;
  /** Minimum milliseconds between commits. */
  interval?: number;
  /** Minimum change in progress, 0-1, before a commit is worth making. */
  minDelta?: number;
  /** Seconds of catch-up behind the scroll position. */
  scrub?: number | boolean;
  scrollerRef?: RefObject<HTMLElement | null>;
  className?: string;
}

// #region critical
export function ThrottledScrubState({
  children,
  interval = 100,
  minDelta = 0.02,
  scrub = 0.4,
  scrollerRef,
  className,
}: ThrottledScrubStateProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // The only React state in the component. Everything else is a ref, because
  // a ref write does not render.
  const [state, setState] = useState<ScrubState>({ progress: 0, commits: 0, ticks: 0 });

  const ticks = useRef(0);
  const commits = useRef(0);
  const lastAt = useRef(0);
  const lastProgress = useRef(0);
  const pending = useRef<number | null>(null);
  const frame = useRef(0);

  useGsap(
    gsap,
    () => {
      const el = root.current;
      if (!el) return;

      // Gate 3: coalesce. Several ticks can pass all the other gates inside
      // one frame (ScrollTrigger fires per scroll event, not per paint), and
      // three setStates in a frame is three renders for one visible change.
      const flush = () => {
        frame.current = 0;
        const value = pending.current;
        if (value === null) return;
        pending.current = null;
        commits.current += 1;
        setState({ progress: value, commits: commits.current, ticks: ticks.current });
      };

      const trigger = ScrollTrigger.create({
        trigger: el,
        scroller: scrollerRef?.current ?? undefined,
        start: 'top bottom',
        end: 'bottom top',
        // Reduced motion welds the readout to the wheel: the value still
        // tracks the scroll the reader is performing, but nothing continues
        // to move after they stop.
        scrub: reduced ? true : scrub,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          ticks.current += 1;

          // The override. The ends of the range are the two values that must
          // never be dropped, because there is no later tick to correct them.
          const boundary = p <= 0 || p >= 1;

          if (boundary) {
            // ...but do not re-commit the same boundary on every one of the
            // dozens of ticks that arrive while sitting at the end.
            if (p === lastProgress.current) return;
          } else {
            // Gate 1: time. `performance.now()` and not `Date.now()` — a
            // monotonic clock, so an NTP correction cannot make the elapsed
            // time negative and freeze the gate shut.
            if (performance.now() - lastAt.current < interval) return;
            // Gate 2: distance. A slow drag passes the time gate constantly
            // while moving a fraction of a percent, which is a render for a
            // change nobody can see.
            if (Math.abs(p - lastProgress.current) < minDelta) return;
          }

          lastAt.current = performance.now();
          lastProgress.current = p;
          pending.current = p;
          if (frame.current === 0) frame.current = requestAnimationFrame(flush);
        },
      });

      return () => {
        // Order matters: kill the source first, then drop the frame it may
        // have just scheduled. A flush that survives teardown calls setState
        // on an unmounted tree.
        trigger.kill();
        if (frame.current !== 0) {
          cancelAnimationFrame(frame.current);
          frame.current = 0;
        }
        pending.current = null;
      };
    },
    root,
    [interval, minDelta, scrub, scrollerRef, reduced],
  );
  // #endregion critical

  return (
    <div ref={root} className={cn('relative', className)}>
      {children(state)}
    </div>
  );
}
