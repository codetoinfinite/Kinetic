'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Pointer-Variable Gradient
   --------------------------------------------------------------------------
   The cheapest pointer effect there is, and the one most often built the
   expensive way.

   The gradient is declared ONCE in CSS and reads two custom properties for its
   centre. JavaScript's entire job per event is two `setProperty` calls with a
   percentage string. It never builds a `background` string, never touches a
   transform, never schedules a frame, never runs a tween.

   That matters because the alternative — reassembling
   `background: radial-gradient(38rem 30rem at 41% 62%, ...), linear-gradient(...)`
   in JS on every move — makes the browser re-parse the whole shorthand,
   including the layer that never changes. Writing a custom property invalidates
   only the paint of the gradient that consumes it.

   There is deliberately no rAF here. A custom-property write is not a layout
   read, so there is nothing to batch; the style change is coalesced into the
   next paint by the browser regardless. Adding a frame loop would add a frame
   of latency to buy nothing.
   ========================================================================== */

export interface PointerVarGradientProps {
  children?: ReactNode;
  /** Horizontal size of the glow, any CSS length. */
  glowWidth?: string;
  /** Vertical size of the glow, any CSS length. */
  glowHeight?: string;
  /** Peak opacity of the glow at its centre, 0..1. */
  intensity?: number;
  className?: string;
}

// #region critical
/** Where the glow sits before the pointer has ever been seen. */
const REST_X = '50%';
const REST_Y = '38%';

export function PointerVarGradient({
  children,
  glowWidth = '38rem',
  glowHeight = '30rem',
  intensity = 0.09,
  className,
}: PointerVarGradientProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    /* Fine pointers only. On touch a `pointermove` exists only during a drag,
       so the glow would be pinned under the finger that is scrolling the page
       and then abandoned there on lift — worse than not moving at all. The
       rest position set in the inline style stays, so touch users still get a
       composed gradient. */
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      /* Percentages, not px. The gradient position resolves against the
         element box, so a percentage survives a resize with no listener and
         no recalculation — the glow stays where it was relative to the panel
         even if the panel changes size between moves. */
      el.style.setProperty(
        '--pointer-x',
        `${((e.clientX - rect.left) / rect.width) * 100}%`,
      );
      el.style.setProperty(
        '--pointer-y',
        `${((e.clientY - rect.top) / rect.height) * 100}%`,
      );
    };

    const onLeave = () => {
      /* Removing the property rather than writing the rest value back lets the
         inline `style` fallback take over, so the resting position is declared
         in exactly one place. */
      el.style.removeProperty('--pointer-x');
      el.style.removeProperty('--pointer-y');
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.style.removeProperty('--pointer-x');
      el.style.removeProperty('--pointer-y');
    };
  }, []);

  /* The gradient definition lives here and only here. The handler above never
     mentions colours, sizes or stops — it only moves the centre.

     No `transition`: an unregistered custom property is an untyped token, so
     the browser cannot interpolate it and a transition on the gradient would
     silently do nothing. Making the leave ease would mean registering the
     properties with `@property { syntax: '<percentage>' }` in a stylesheet,
     which is a real option but not a free one. The snap back is acceptable
     here because the glow at rest is barely above the background. */
  const style = {
    '--pointer-x': REST_X,
    '--pointer-y': REST_Y,
    backgroundImage: `radial-gradient(${glowWidth} ${glowHeight} at var(--pointer-x) var(--pointer-y), color-mix(in oklab, var(--k-accent) ${Math.round(
      intensity * 100,
    )}%, transparent), transparent 68%)`,
  } as CSSProperties;
  // #endregion critical

  return (
    <div
      ref={root}
      style={style}
      className={cn('relative isolate overflow-hidden bg-bg', className)}
    >
      {children}
    </div>
  );
}
