'use client';

import gsap from 'gsap';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Cursor Clip-Path Mask
   --------------------------------------------------------------------------
   Two stacked layers. The upper one is clipped to a disc that follows the
   pointer, so it exists only where the pointer is and the base layer shows
   everywhere else. Hovering the trigger grows that disc past the panel
   diagonal, at which point the upper layer simply IS the panel.

   The technique that matters here is that `clip-path` is NOT tweened. GSAP
   tweens a plain proxy object `{ x, y, r }`, and a single `onUpdate` writes
   both the clip string and the ring outline from the SAME values on the SAME
   frame. Tween `clipPath` directly and you have two independent interpolations
   of the same idea — a string being parsed and re-serialised for the mask, a
   transform for the ring — which drift apart under fast movement and leave a
   visible gap between the ring and the edge of the hole.

   The proxy also lets position and radius run as separate tweens with separate
   durations and eases while still producing one coherent write, which is not
   expressible as a single `clipPath` tween at all.
   ========================================================================== */

export interface CursorClipPathMaskProps {
  /**
   * The always-visible layer. Sits underneath and keeps all pointer events,
   * so any `[data-mask-trigger]` belongs here — it must stay hoverable even
   * where the disc is not covering it.
   */
  base: ReactNode;
  /** Shown only inside the disc. Sits on top and is the layer being clipped. */
  reveal: ReactNode;
  /** Disc radius in CSS px at rest. */
  radius?: number;
  className?: string;
}

// #region critical
const FOLLOW_DURATION = 0.4;
const EXPAND_DURATION = 0.55;

export function CursorClipPathMask({
  base,
  reveal,
  radius = 130,
  className,
}: CursorClipPathMaskProps) {
  const root = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const layer = overlay.current;
    const outline = ring.current;
    if (!el || !layer || !outline) return;

    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* One object, three numbers, tweened by GSAP like any DOM property. The
       clip string is derived from it — never tweened itself. */
    const proxy = { x: 0, y: 0, r: radius };

    const write = () => {
      /* Radius in px, not `%`. A percentage radius in `circle()` resolves
         against sqrt(w^2 + h^2) / sqrt(2), NOT against the width — so a
         percentage hole is a different physical size on every panel aspect
         ratio, and the px-sized ring drawn on top of it stops matching. */
      layer.style.clipPath = `circle(${proxy.r}px at ${proxy.x}px ${proxy.y}px)`;

      /* Same frame, same numbers. The ring is a fixed-diameter element scaled
         to the current radius, so this is one composited transform rather than
         a width/height write that would relayout every frame. */
      const scale = proxy.r / radius;
      outline.style.transform = `translate3d(${proxy.x - radius}px, ${proxy.y - radius}px, 0) scale(${scale})`;
      // The border thickens with the scale, so the ring is faded out well
      // before the expansion makes that obvious.
      outline.style.opacity = String(gsap.utils.clamp(0, 1, 2 - scale));
    };

    if (!fine || reduced) {
      /* No pointer to follow, or motion the user declined. Park a static hole
         left-of-centre so both layers are legible at once and the component
         reads as a composed still rather than a blank panel. */
      const rect = el.getBoundingClientRect();
      proxy.x = rect.width * 0.34;
      proxy.y = rect.height * 0.5;
      write();
      return () => {
        layer.style.clipPath = '';
        outline.style.transform = '';
        outline.style.opacity = '';
      };
    }

    // Start off-panel so nothing is revealed before the first move.
    proxy.x = -radius * 3;
    proxy.y = -radius * 3;
    write();

    let entered = false;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (!entered) {
        entered = true;
        // Teleport on entry, otherwise the hole slides in from the corner
        // over 400ms and reveals a diagonal streak of the layer beneath.
        gsap.set(proxy, { x, y });
        write();
        return;
      }

      /* `ease: 'none'` is deliberate. An eased follow re-eases from a new
         start value on every event, which under continuous movement reads as
         the hole surging and stalling. Linear catch-up at 0.4s gives a steady
         drag. `overwrite: 'auto'` claims x and y and leaves the radius tween
         from the trigger running underneath. */
      gsap.to(proxy, {
        x,
        y,
        duration: FOLLOW_DURATION,
        ease: 'none',
        overwrite: 'auto',
        onUpdate: write,
      });
    };

    const onLeave = () => {
      entered = false;
      gsap.to(proxy, {
        x: -radius * 3,
        y: -radius * 3,
        duration: 0.35,
        ease: 'power2.in',
        overwrite: 'auto',
        onUpdate: write,
      });
    };

    /* Enough radius to cover the panel from any point inside it: the far
       corner is at most one diagonal away. */
    const full = () => Math.hypot(el.clientWidth, el.clientHeight);

    const onEnterTrigger = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Element) || !target.closest('[data-mask-trigger]')) return;
      gsap.to(proxy, {
        r: full(),
        duration: EXPAND_DURATION,
        ease: 'power3.inOut',
        overwrite: 'auto',
        onUpdate: write,
      });
    };

    const onLeaveTrigger = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Element) || !target.closest('[data-mask-trigger]')) return;
      gsap.to(proxy, {
        r: radius,
        duration: EXPAND_DURATION,
        ease: 'power3.inOut',
        overwrite: 'auto',
        onUpdate: write,
      });
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    /* `pointerover`/`pointerout` bubble, so one pair of listeners covers every
       trigger in the subtree no matter how React re-renders it. `pointerenter`
       does not bubble and would need a listener per trigger. */
    el.addEventListener('pointerover', onEnterTrigger);
    el.addEventListener('pointerout', onLeaveTrigger);

    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerover', onEnterTrigger);
      el.removeEventListener('pointerout', onLeaveTrigger);
      gsap.killTweensOf(proxy);
      layer.style.clipPath = '';
      outline.style.transform = '';
      outline.style.opacity = '';
    };
  }, [radius]);
  // #endregion critical

  return (
    <div ref={root} className={cn('relative isolate overflow-hidden', className)}>
      {/* Base layer: always visible, always interactive. */}
      <div className="absolute inset-0 z-0">{base}</div>

      {/* The clipped layer, visible only inside the disc. `pointer-events-none`
          is not optional: `clip-path` clips HIT TESTING as well as paint, so an
          interactive overlay would be a region that swallows events inside the
          disc and passes them through everywhere else. Keeping every event on
          the base layer means hover targets behave the same wherever the disc
          happens to be. */}
      <div
        ref={overlay}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
      >
        {reveal}
      </div>

      <div
        ref={ring}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-20 rounded-full border border-line-strong opacity-0 will-change-transform"
        style={{ width: radius * 2, height: radius * 2 }}
      />
    </div>
  );
}
