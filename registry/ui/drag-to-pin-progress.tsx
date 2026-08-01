'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, type ReactNode, type RefObject } from 'react';
import { useDrag } from '@/registry/hooks/use-drag';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { clamp, damp } from '@/registry/lib/damp';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Drag Mapped To Pin Progress
   --------------------------------------------------------------------------
   A pinned horizontal strip is a lie told with vertical scroll, and the lie
   breaks the moment someone tries to drag it: the strip moves sideways, the
   scrollbar moves down, and any hand-tuned "drag multiplier" is wrong the
   first time the panel widths change.

   The fix is to stop guessing. The pin knows how many scroll pixels it
   occupies (`trigger.end - trigger.start`) and the strip knows how many
   pixels it travels. Their ratio converts drag pixels into scroll pixels
   exactly, so one pixel of thumb movement is one pixel of track movement at
   any layout, any zoom, any panel count.
   ========================================================================== */

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface DragToPinProgressProps {
  children: ReactNode;
  /** The scroll container the pin lives in. Its `scrollTop` is what moves. */
  scroller: RefObject<HTMLElement | null>;
  /** The pinned trigger being scrubbed. `null` until it is built. */
  trigger: ScrollTrigger | null;
  /** Live horizontal travel of the strip in px. Defaults to a 1:1 mapping. */
  getDistance?: () => number;
  /** Fraction of throw velocity still left after one second. */
  friction?: number;
  className?: string;
}

const THROW_FLOOR = 20;
const MAX_THROW = 4000;

// #region critical
export function DragToPinProgress({
  children,
  scroller,
  trigger,
  getDistance,
  friction = 0.002,
  className,
}: DragToPinProgressProps) {
  const surface = useRef<HTMLDivElement>(null);
  const startScroll = useRef(0);
  const throwVelocity = useRef(0);
  const lastMoveX = useRef(0);
  const lastMoveTime = useRef(0);
  const lastProgress = useRef(-1);
  const reduced = useReducedMotion();

  // Scroll pixels per pixel of horizontal track travel. Read live, because
  // `end` is recomputed on every ScrollTrigger refresh and the panel widths
  // change with the container.
  const ratio = () => {
    if (!trigger) return 1;
    const span = trigger.end - trigger.start;
    const travel = getDistance?.() ?? span;
    return travel > 0 ? span / travel : 1;
  };

  const applyScroll = (value: number) => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = clamp(value, 0, max);
  };

  useDrag(surface, {
    enabled: trigger !== null,
    onDragStart: (state) => {
      throwVelocity.current = 0;
      startScroll.current = scroller.current?.scrollTop ?? 0;
      lastMoveX.current = state.clientX;
      lastMoveTime.current = performance.now();
    },
    onDrag: (state) => {
      // Absolute, from the press point — not an accumulation of deltas.
      // Accumulating drifts, because every clamp at the ends silently eats
      // part of a delta and the track never returns to where the hand is.
      applyScroll(startScroll.current - state.dx * ratio());

      const now = performance.now();
      const dt = (now - lastMoveTime.current) / 1000;
      if (dt > 0) {
        const instant = (state.clientX - lastMoveX.current) / dt;
        throwVelocity.current = clamp(instant, -MAX_THROW, MAX_THROW);
        lastMoveX.current = state.clientX;
        lastMoveTime.current = now;
      }
    },
    onDragEnd: (_state, moved) => {
      // A tap is not a throw. Without this, releasing after a pause launches
      // the track at whatever velocity the last move happened to record.
      if (!moved || reduced || performance.now() - lastMoveTime.current > 80) {
        throwVelocity.current = 0;
      }
    },
  });

  useRaf((dt) => {
    const el = surface.current;

    // Publish the pin's own progress as a CSS variable rather than state:
    // a progress rail must not cost a React render per frame.
    if (el && trigger) {
      const p = Math.round(trigger.progress * 1000) / 1000;
      if (p !== lastProgress.current) {
        lastProgress.current = p;
        el.style.setProperty('--pin-progress', String(p));
      }
    }

    if (throwVelocity.current === 0) return;

    // Exponential decay in wall-clock time, so the throw travels the same
    // distance on a 60 Hz panel as on a 144 Hz one.
    throwVelocity.current = damp(throwVelocity.current, 0, friction, dt);
    if (Math.abs(throwVelocity.current) < THROW_FLOOR) {
      throwVelocity.current = 0;
      return;
    }

    const current = scroller.current?.scrollTop ?? 0;
    applyScroll(current - throwVelocity.current * ratio() * dt);
  });
  // #endregion critical

  return (
    <div
      ref={surface}
      className={cn(
        'relative select-none',
        trigger ? 'cursor-grab active:cursor-grabbing' : null,
        className,
      )}
      // pan-y, not none: the browser keeps vertical scrolling on touch and
      // only hands us the horizontal gesture, so the page never feels stuck.
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
}
