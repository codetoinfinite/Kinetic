'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, type RefObject } from 'react';
import { cn } from '@/lib/cn';
import { useGsap } from '@/registry/hooks/use-gsap';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';

/* ==========================================================================
   Converging Flow Steps
   --------------------------------------------------------------------------
   A process diagram that assembles itself. The outer cards converge from
   opposite ends toward the middle, and the connectors between them pop in
   *after* the cards have already started moving — at 35% through the
   timeline. That ordering is the whole effect: connectors that arrive first,
   or at the same time, read as "here are some boxes with arrows". Connectors
   that arrive once the boxes are in motion read as "these things connect".

   `scrub: 1.2` is unusually slow, and correct for a diagram: you want it to
   settle into place rather than track your wheel.
   ========================================================================== */

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

export interface FlowStep {
  title: string;
  body?: string;
  /** Short label above the title — a number, a phase name. */
  kicker?: string;
}

export interface ConvergingFlowStepsProps {
  steps: FlowStep[];
  /** Outer-card travel as a percentage of its own size, along the layout axis. */
  converge?: number;
  /** Seconds of catch-up. Deliberately high — this is a diagram, not a hero. */
  scrub?: number;
  /** Timeline position, in seconds, at which the connectors begin. */
  connectorAt?: number;
  /** Seconds between connectors. */
  connectorStagger?: number;
  /** Container width, in px, below which the row becomes a column. */
  stackBelow?: number;
  start?: string;
  end?: string;
  /** The scroll container that owns the scroll position. Omit for the document. */
  scrollerRef?: RefObject<HTMLElement | null>;
  className?: string;
}

// #region critical
const CONNECTOR_SCALE = 0.6;

export function ConvergingFlowSteps({
  steps,
  converge = 14,
  scrub = 1.2,
  connectorAt = 0.35,
  connectorStagger = 0.2,
  stackBelow = 420,
  start = 'top 92%',
  end = 'center 52%',
  scrollerRef,
  className,
}: ConvergingFlowStepsProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { width } = useResizeObserver(root);

  // The convergence axis has to follow the layout axis, or a stacked column
  // gets cards sliding in sideways past each other. Measured from the element
  // rather than the viewport: this component is often inside a panel that is
  // narrow while the window is wide.
  const stacked = width > 0 && width < stackBelow;

  useGsap(
    gsap,
    () => {
      const container = root.current;
      if (!container || reduced) return;

      const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-flow-card]'));
      const connectors = Array.from(
        container.querySelectorAll<HTMLElement>('[data-flow-connector]'),
      );
      const first = cards[0];
      const last = cards[cards.length - 1];
      if (!first || !last) return;

      const axis = stacked ? 'yPercent' : 'xPercent';
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          scroller: scrollerRef?.current ?? undefined,
          start,
          end,
          scrub,
          invalidateOnRefresh: true,
        },
      });

      // Outer cards travel toward the centre from opposite ends. When there is
      // only one card, `first === last` and the two tweens would fight over
      // the same target, so it takes the middle treatment instead.
      if (first === last) {
        tl.fromTo(first, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'none', duration: 1 }, 0);
      } else {
        tl.fromTo(
          first,
          { autoAlpha: 0, [axis]: -converge },
          { autoAlpha: 1, [axis]: 0, ease: 'none', duration: 1 },
          0,
        );
        tl.fromTo(
          last,
          { autoAlpha: 0, [axis]: converge },
          { autoAlpha: 1, [axis]: 0, ease: 'none', duration: 1 },
          0,
        );
      }

      // Everything between the ends has nowhere to converge from, so it only
      // fades. Giving it a direction too would make the row look like it was
      // being shuffled rather than closing.
      const middle = cards.slice(1, -1);
      if (middle.length > 0) {
        tl.fromTo(middle, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'none', duration: 1 }, 0);
      }

      if (connectors.length > 0) {
        tl.fromTo(
          connectors,
          { autoAlpha: 0, scale: CONNECTOR_SCALE },
          {
            autoAlpha: 1,
            scale: 1,
            ease: 'none',
            duration: 1 - connectorAt,
            stagger: connectorStagger,
          },
          // Absolute timeline position in seconds. The cards occupy 0 -> 1, so
          // 0.35 puts the first connector a third of the way into their
          // travel: they are already moving when the link appears.
          connectorAt,
        );
      }
    },
    root,
    [converge, scrub, connectorAt, connectorStagger, start, end, stacked, reduced, steps.length],
  );
  // #endregion critical

  return (
    <div
      ref={root}
      className={cn(
        'flex items-stretch gap-2 rounded-lg bg-accent/8 p-4',
        stacked ? 'flex-col' : 'flex-row',
        className,
      )}
    >
      {/* `display: contents` on the wrapper keeps each card and its connector
          as direct flex items of the row while still sharing one React key. */}
      {steps.map((step, i) => (
        <div key={step.title} className="contents">
          {i > 0 && (
            <div
              data-flow-connector
              aria-hidden
              className="flex shrink-0 items-center justify-center text-accent"
            >
              <svg
                viewBox="0 0 24 24"
                className={cn('h-4 w-4', stacked && 'rotate-90')}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="square"
              >
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </div>
          )}
          <div
            data-flow-card
            className="min-w-0 flex-1 rounded-md border border-line bg-surface p-3 will-change-transform"
          >
            {step.kicker !== undefined && <p className="meta">{step.kicker}</p>}
            <h3 className="mt-1.5 text-sm leading-snug tracking-tight text-fg">{step.title}</h3>
            {step.body !== undefined && (
              <p className="mt-1 text-xs leading-relaxed text-muted">{step.body}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
