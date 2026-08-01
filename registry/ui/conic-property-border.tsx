'use client';

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Conic @property Border
   --------------------------------------------------------------------------
   A gradient ring that rotates around a rounded box, in pure CSS. Two things
   make it work and both are non-obvious:

   1. `@property` registration. A custom property is a *token stream* by
      default — the browser has no idea `0deg` is an angle, so a keyframe from
      `0deg` to `360deg` has nothing to interpolate and the value flips at the
      50% mark. Registering it with `syntax: "<angle>"` gives it a type, and
      typed values interpolate.

   2. Two backgrounds with different clip boxes. A flat fill clipped to
      `padding-box` covers the interior; the conic gradient clipped to
      `border-box` runs underneath the border. With a transparent border, the
      only place the gradient survives the clip is the ring itself — which is
      how you get a gradient border that follows `border-radius`.
      `border-image` cannot do that.
   ========================================================================== */

/** Lets an inline `style` object carry custom properties without a cast. */
type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>;

export interface ConicBorderProps {
  children: ReactNode;
  /** One full revolution, in milliseconds. */
  durationMs?: number;
  /** Ring thickness. Any CSS length. */
  thickness?: string;
  /** Corner radius. Any CSS length or percentage. */
  radius?: string;
  /** Colour of the two travelling highlights. Defaults to `currentColor`. */
  glow?: string;
  /** Colour of the dim majority of the ring. */
  rest?: string;
  /** Interior fill. Must be opaque, or the gradient shows through the middle. */
  fill?: string;
  /** Holds the ring still without unmounting the animation. */
  paused?: boolean;
  className?: string;
}

// #region critical
/* Injected once per document. React 19 hoists `<style href precedence>` into
   <head> and de-duplicates by `href`, so a hundred rings ship one rule set —
   and `@property` registration is global anyway, so re-declaring it per
   instance would be pure waste. */
const CONIC_BORDER_CSS = `
@property --kx-conic-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@keyframes kx-conic-spin {
  to { --kx-conic-angle: 360deg; }
}

.kx-conic {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  isolation: isolate;

  border: var(--kx-conic-width, 1.5px) solid transparent;
  border-radius: var(--kx-conic-radius, 9999px);

  /* padding-box layer paints the interior, border-box layer paints under the
     ring. Order matters: the first background listed is the topmost. */
  background:
    linear-gradient(var(--kx-conic-fill), var(--kx-conic-fill)) padding-box,
    conic-gradient(
      from var(--kx-conic-angle),
      var(--kx-conic-rest)   0deg,
      var(--kx-conic-glow)  55deg,
      var(--kx-conic-rest) 130deg,
      var(--kx-conic-rest) 230deg,
      var(--kx-conic-glow) 305deg,
      var(--kx-conic-rest) 360deg
    ) border-box;

  animation: kx-conic-spin var(--kx-conic-duration, 4s) linear infinite;
}

.kx-conic[data-paused='true'] {
  animation-play-state: paused;
}

/* No motion: keep the ring, stop the revolution, and park a highlight
   off-axis so the border still reads as decorated rather than broken. */
@media (prefers-reduced-motion: reduce) {
  .kx-conic {
    animation: none;
    --kx-conic-angle: 132deg;
  }
}
`;

export function ConicBorder({
  children,
  durationMs = 4000,
  thickness = '1.5px',
  radius = '9999px',
  glow,
  rest,
  fill,
  paused = false,
  className,
}: ConicBorderProps) {
  /* Every colour resolves through a `var(..., fallback)` chain, so the
     component works with zero configuration and is themeable by setting one
     property on any ancestor. `Canvas` is the system background keyword — a
     last resort that is at least the right polarity in both colour schemes. */
  const style: StyleWithVars = {
    '--kx-conic-duration': `${durationMs}ms`,
    '--kx-conic-width': thickness,
    '--kx-conic-radius': radius,
    '--kx-conic-glow': glow ?? 'var(--conic-glow, currentColor)',
    '--kx-conic-rest':
      rest ?? 'var(--conic-rest, color-mix(in oklab, currentColor 10%, transparent))',
    '--kx-conic-fill': fill ?? 'var(--conic-fill, var(--color-bg, Canvas))',
  };

  return (
    <>
      <style href="kinetic-conic-property-border" precedence="medium">
        {CONIC_BORDER_CSS}
      </style>
      <div
        className={cn('kx-conic', className)}
        style={style}
        data-paused={paused ? 'true' : undefined}
      >
        {children}
      </div>
    </>
  );
}
// #endregion critical
