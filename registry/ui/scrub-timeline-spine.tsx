'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, type RefObject } from 'react';
import { cn } from '@/lib/cn';
import { useGsap } from '@/registry/hooks/use-gsap';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';

/* ==========================================================================
   Scrub Timeline Spine
   --------------------------------------------------------------------------
   A vertical rule that fills as you scroll, with entries alternating either
   side of it. Two ideas make it work and both are easy to get wrong.

   1. Entries rest at 50% opacity, not 0. The animation adds emphasis to
      content that is already legible, rather than gating it behind a scroll
      event. The page still reads with JavaScript disabled and a screen
      reader never meets an invisible entry.

   2. `toggleActions: "play reverse play reverse"` — the four slots are
      onEnter, onLeave, onEnterBack, onLeaveBack. The usual
      "play none none none" fires once and never reverts, so scrolling back
      up shows a column of already-finished animations. Reversing on the way
      out makes the whole spine scrubbable in both directions.
   ========================================================================== */

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

export interface SpineEntry {
  /** Date, phase, or index. Rendered in the metadata voice. */
  label: string;
  title: string;
  body?: string;
}

export interface ScrubTimelineSpineProps {
  entries: SpineEntry[];
  /** Seconds of catch-up on the fill. */
  scrub?: number;
  /** Resting opacity of an inactive entry. Never 0 — see notes. */
  restOpacity?: number;
  /** Resting scale of an inactive entry. */
  restScale?: number;
  /** Seconds for one entry to come to full emphasis. */
  entryDuration?: number;
  fillStart?: string;
  fillEnd?: string;
  entryStart?: string;
  /** Container width, in px, below which entries stop alternating. */
  alternateAbove?: number;
  /** The scroll container that owns the scroll position. Omit for the document. */
  scrollerRef?: RefObject<HTMLElement | null>;
  className?: string;
}

// #region critical
export function ScrubTimelineSpine({
  entries,
  scrub = 0.6,
  restOpacity = 0.5,
  restScale = 0.9,
  entryDuration = 0.6,
  fillStart = 'top 55%',
  fillEnd = 'bottom 75%',
  entryStart = 'top 78%',
  alternateAbove = 420,
  scrollerRef,
  className,
}: ScrubTimelineSpineProps) {
  const root = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { width } = useResizeObserver(root);
  const alternate = width >= alternateAbove;

  useGsap(
    gsap,
    () => {
      const container = root.current;
      const line = fill.current;
      if (!container || !line) return;

      const items = Array.from(container.querySelectorAll<HTMLElement>('[data-spine-entry]'));
      const scroller = scrollerRef?.current ?? undefined;

      if (reduced) {
        gsap.set(line, { scaleY: 1 });
        gsap.set(items, { opacity: 1, scale: 1 });
        return;
      }

      gsap.fromTo(
        line,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          // transformOrigin is set in CSS too, but GSAP writes its own
          // transform string; without stating it here the fill grows from the
          // centre and the rule appears to unroll in both directions.
          transformOrigin: 'top center',
          scrollTrigger: {
            trigger: container,
            scroller,
            // Starts filling once the section is just past halfway up and
            // completes before its bottom leaves — so the rule is never still
            // filling while the last entry is already being read.
            start: fillStart,
            end: fillEnd,
            scrub,
            invalidateOnRefresh: true,
          },
        },
      );

      items.forEach((item, i) => {
        gsap.fromTo(
          item,
          { opacity: restOpacity, scale: restScale },
          {
            opacity: 1,
            scale: 1,
            duration: entryDuration,
            ease: 'power2.out',
            // Scale from the edge the entry hangs off, so it grows outward
            // from the spine. A centre origin pulls both columns toward the
            // middle and the rule looks like it is being squeezed.
            transformOrigin: alternate && i % 2 === 1 ? 'right center' : 'left center',
            scrollTrigger: {
              trigger: item,
              scroller,
              start: entryStart,
              // onEnter, onLeave, onEnterBack, onLeaveBack. Reversing on the
              // way out is what makes the column scrubbable upward as well as
              // downward.
              toggleActions: 'play reverse play reverse',
            },
          },
        );
      });
    },
    root,
    [
      scrub,
      restOpacity,
      restScale,
      entryDuration,
      fillStart,
      fillEnd,
      entryStart,
      alternate,
      reduced,
      entries.length,
    ],
  );
  // #endregion critical

  return (
    <div ref={root} className={cn('relative', className)}>
      {/* Track and fill are two elements: the track is the faint full-height
          rule that tells you how much is left, the fill is the scaled one. */}
      <div
        aria-hidden
        className={cn(
          'absolute top-0 h-full w-px bg-line',
          alternate ? 'left-1/2 -translate-x-1/2' : 'left-1',
        )}
      />
      <div
        ref={fill}
        aria-hidden
        className={cn(
          'absolute top-0 h-full w-px origin-top bg-accent',
          alternate ? 'left-1/2 -translate-x-1/2' : 'left-1',
        )}
        style={{ transform: 'scaleY(0)' }}
      />

      <ol className="relative flex flex-col gap-6">
        {entries.map((entry, i) => {
          const right = alternate && i % 2 === 1;
          return (
            <li
              key={entry.label + entry.title}
              className={cn(
                'flex',
                alternate ? 'w-1/2' : 'ml-6 w-full',
                right && 'self-end justify-start pl-6',
                alternate && !right && 'justify-end pr-6 text-right',
              )}
            >
              <div
                data-spine-entry
                className="w-full rounded-md border border-line bg-surface p-3 will-change-transform"
                style={{ opacity: restOpacity }}
              >
                <p className="meta">{entry.label}</p>
                <h3 className="mt-1.5 text-sm leading-snug tracking-tight text-fg">
                  {entry.title}
                </h3>
                {entry.body !== undefined && (
                  <p className="mt-1 text-xs leading-relaxed text-muted">{entry.body}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
