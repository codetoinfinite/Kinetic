'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useRaf } from '@/registry/hooks/use-raf';
import { useSmoothPointer } from '@/registry/hooks/use-smooth-pointer';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Radial Mask Spotlight
   --------------------------------------------------------------------------
   A layer is masked to a soft disc that follows the pointer, so content is
   lit rather than revealed — the difference from a clip-path mask is that the
   edge is a falloff, not a boundary.

   The gradient stops are the whole design:

       #000 0%, #000 30%, transparent 72%

   Solid black out to 30% of the radius, THEN a ramp. That flat core is what
   makes it read as a light with a beam rather than a smudge. A gradient that
   starts falling off at 0% has no lit region at all — it has a bright point
   that fades, which the eye reads as blur.

   Position comes from `useSmoothPointer` and is written once per frame in a
   rAF, not per `pointermove`. Mask writes are paint-invalidating and a fast
   pointer can deliver several events between frames, so writing per event
   means doing the same work two or three times for one visible result.
   ========================================================================== */

export interface RadialMaskSpotlightProps {
  children: ReactNode;
  /** Radius of the beam in CSS px. */
  radius?: number;
  /**
   * Fraction of the gap remaining after one second. Lower is tighter.
   * Passed straight to `useSmoothPointer`.
   */
  smoothing?: number;
  className?: string;
}

// #region critical
/** Where the solid core ends, as a fraction of `radius`. */
const CORE_STOP = 0.3;
/** Where the falloff reaches full transparency, as a fraction of `radius`. */
const EDGE_STOP = 0.72;
const FADE_MS = 260;

export function RadialMaskSpotlight({
  children,
  radius = 220,
  smoothing = 0.0006,
  className,
}: RadialMaskSpotlightProps) {
  const root = useRef<HTMLDivElement>(null);
  const lit = useRef<HTMLDivElement>(null);
  const enabled = useRef(false);
  const visible = useRef(false);

  const pointer = useSmoothPointer({
    target: root,
    smoothing,
    // Touch is explicitly off: this component is fine-pointer only, and
    // letting touch drags drive the mask would move the beam under the finger.
    touch: false,
  });

  useEffect(() => {
    const el = root.current;
    const layer = lit.current;
    if (!el || !layer) return;

    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!fine) {
      /* No pointer to track. Rather than leaving a masked layer invisible, the
         mask is removed entirely so the lit layer simply shows in full — the
         content stays readable and nothing is hidden behind an effect that
         cannot be operated. */
      layer.style.maskImage = '';
      layer.style.webkitMaskImage = '';
      layer.style.opacity = '1';
      return;
    }

    enabled.current = !reduced;

    if (reduced) {
      /* Reduced motion keeps the spotlight — it is a hover affordance, not
         gratuitous movement — but pins it. A beam that chases the pointer with
         inertia is the part that was objected to, so the mask is written once,
         parked, and never updated again. */
      const rect = el.getBoundingClientRect();
      writeMask(layer, rect.width * 0.5, rect.height * 0.45, radius);
      layer.style.opacity = '1';
      return;
    }

    const onEnter = () => {
      visible.current = true;
      layer.style.opacity = '1';
    };
    const onLeave = () => {
      visible.current = false;
      layer.style.opacity = '0';
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      enabled.current = false;
      layer.style.maskImage = '';
      layer.style.webkitMaskImage = '';
      layer.style.opacity = '';
    };
  }, [radius]);

  useRaf(() => {
    const layer = lit.current;
    if (!layer || !enabled.current) return;
    const p = pointer.current;
    // `active` is false until a real pointer has been seen. Writing before
    // that would place the beam at the hook's centre-parked seed value, which
    // flashes a spotlight the user never asked for.
    if (!p.active) return;
    writeMask(layer, p.x, p.y, radius);
  });

  return (
    <div ref={root} className={cn('relative isolate overflow-hidden', className)}>
      <div
        ref={lit}
        className="absolute inset-0"
        style={{
          opacity: 0,
          transition: `opacity ${FADE_MS}ms ease-out`,
          // Seeded off-panel so the very first painted frame cannot show an
          // unmasked layer before rAF runs.
          maskImage: restMask(radius),
          WebkitMaskImage: restMask(radius),
        }}
      >
        {children}
      </div>
    </div>
  );
}

function maskFor(x: number, y: number, radius: number): string {
  /* `circle <radius>px at <x>px <y>px` — an explicit px radius rather than a
     percentage, because a percentage radius in a radial gradient resolves
     against the box and would make the beam a different physical size on
     every panel it is dropped into. */
  return `radial-gradient(circle ${radius}px at ${x}px ${y}px, #000 0%, #000 ${
    CORE_STOP * 100
  }%, transparent ${EDGE_STOP * 100}%)`;
}

function restMask(radius: number): string {
  return maskFor(-radius * 2, -radius * 2, radius);
}

function writeMask(layer: HTMLElement, x: number, y: number, radius: number) {
  const value = maskFor(x, y, radius);
  /* Both spellings. Safari has shipped unprefixed `mask-image` for years but
     still mishandles gradient masks without `-webkit-` in enough released
     versions that dropping the prefix means the layer is either fully visible
     or fully gone on those browsers — a total failure, not a degraded one. */
  layer.style.maskImage = value;
  layer.style.webkitMaskImage = value;
}
// #endregion critical
