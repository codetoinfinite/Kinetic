'use client';

import gsap from 'gsap';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   GSAP Cursor Follower
   --------------------------------------------------------------------------
   A DOM puck that replaces the pointer inside a container.

   The smoothing here comes from GSAP, not from a damped rAF loop: every
   pointermove starts a fresh 0.4s tween toward the new coordinates and
   `overwrite: 'auto'` retires the previous one. That is a genuinely different
   curve from `damp(x, target, s, dt)` — a tween re-eases from its current
   velocity to a rest at the target, so the puck decelerates into stillness the
   moment the pointer stops, where a damped follower asymptotes forever and
   never quite arrives. Use this when you want the puck to *settle*; use
   `useSmoothPointer` when you want a value that is always chasing.
   ========================================================================== */

export interface CursorFollowerProps {
  children: ReactNode;
  /** Text revealed inside the puck when it is over a `[data-cursor-target]`. */
  label?: string;
  /** Seconds of catch-up. The whole character of the effect lives here. */
  duration?: number;
  /** Diameter of the resting dot, in px. */
  size?: number;
  /** Diameter over a target, in px. Must be large enough to hold the label. */
  targetSize?: number;
  className?: string;
}

// #region critical
/** Far outside any container, so the puck is nowhere until a pointer exists. */
const PARK = -999;
const FADE_DURATION = 0.3;
const RESIZE_DURATION = 0.45;

export function CursorFollower({
  children,
  label = 'View',
  duration = 0.4,
  size = 16,
  targetSize = 112,
  className,
}: CursorFollowerProps) {
  const root = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const disc = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const point = wrap.current;
    const circle = disc.current;
    const caption = text.current;
    if (!el || !point || !circle || !caption) return;

    // A coarse pointer has no hover state, so the puck could only ever exist
    // between pointerdown and pointerup — and `cursor: none` on a touch device
    // hides nothing while still suppressing the text-selection caret.
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const follow = reduced ? 0 : duration;
    const fade = reduced ? 0 : FADE_DURATION;
    const resize = reduced ? 0 : RESIZE_DURATION;

    // Centre both layers on their own coordinates once. After this the follow
    // tween writes raw x/y and the centring composes into the same matrix —
    // no offset arithmetic per move, and one composited transform per node.
    gsap.set(point, { x: PARK, y: PARK, autoAlpha: 0 });
    gsap.set(circle, { xPercent: -50, yPercent: -50, scale: size / targetSize });
    gsap.set(caption, { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.5 });

    // The puck *replaces* the arrow rather than accompanying it. Set from JS,
    // not from the class list, so a touch device never loses its cursor.
    const previousCursor = el.style.cursor;
    el.style.cursor = 'none';

    let overTarget = false;

    const place = (e: PointerEvent, instant: boolean) => {
      // Live rect: the container can scroll, resize, or be inside a
      // transformed ancestor. A rect cached on mount puts the puck at a
      // constant offset from the real pointer as soon as anything moves.
      const rect = el.getBoundingClientRect();
      gsap.to(point, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        duration: instant ? 0 : follow,
        ease: 'power2.out',
        // Each move REPLACES the last tween instead of queueing behind it.
        // Without it, ~120 events a second means ~120 live 0.4s tweens all
        // writing the same transform, and the puck visibly stutters.
        overwrite: 'auto',
      });
    };

    const onEnter = (e: PointerEvent) => {
      // Teleport on entry, then fade in. Tweening from wherever the puck was
      // parked draws a visible streak diagonally across the panel every time
      // the pointer re-enters.
      place(e, true);
      gsap.to(point, { autoAlpha: 1, duration: fade, ease: 'power2.out', overwrite: 'auto' });
    };

    const onMove = (e: PointerEvent) => {
      place(e, false);

      const hit =
        e.target instanceof Element ? e.target.closest('[data-cursor-target]') : null;
      const next = hit !== null;
      // Only tween on the transition. Re-firing the same resize tween on every
      // move restarts its ease and the puck never reaches the target size.
      if (next === overTarget) return;
      overTarget = next;

      gsap.to(circle, {
        scale: next ? 1 : size / targetSize,
        duration: resize,
        ease: 'expo.out',
        overwrite: 'auto',
      });
      gsap.to(caption, {
        autoAlpha: next ? 1 : 0,
        scale: next ? 1 : 0.5,
        duration: resize,
        ease: 'expo.out',
        overwrite: 'auto',
      });
    };

    const onLeave = () => {
      gsap.to(point, { autoAlpha: 0, duration: fade, ease: 'power2.out', overwrite: 'auto' });
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.style.cursor = previousCursor;
      // Kill before clearing, or an in-flight tween writes the transform
      // straight back onto a node React has already recycled.
      gsap.killTweensOf([point, circle, caption]);
      gsap.set([point, circle, caption], { clearProps: 'all' });
    };
  }, [duration, size, targetSize]);
  // #endregion critical

  return (
    <div ref={root} className={cn('relative isolate overflow-hidden', className)}>
      {children}

      {/* Hidden in the markup, not only by the effect. `autoAlpha: 0` is set
          from JS, and there are two windows where that never happens: the frame
          between paint and hydration, and a coarse pointer — where the effect
          bails before it reaches the `gsap.set`. Both left a `targetSize` accent
          disc and the caption sitting in the panel's top-left corner. GSAP's
          `autoAlpha` writes exactly these two properties, so it takes over
          cleanly from here. */}
      <div
        ref={wrap}
        aria-hidden
        style={{ visibility: 'hidden', opacity: 0 }}
        className="pointer-events-none absolute left-0 top-0 z-30 h-0 w-0"
      >
        <div
          ref={disc}
          className="absolute left-0 top-0 rounded-full bg-accent will-change-transform"
          style={{ width: targetSize, height: targetSize }}
        />
        <span
          ref={text}
          className="absolute left-0 top-0 whitespace-nowrap text-sm font-medium tracking-tight text-accent-fg will-change-transform"
        >
          {label}
        </span>
      </div>
    </div>
  );
}
