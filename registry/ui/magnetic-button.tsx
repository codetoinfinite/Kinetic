'use client';

import gsap from 'gsap';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Magnetic Pointer Button
   ========================================================================== */

export interface MagneticButtonProps {
  children: ReactNode;
  /**
   * How far the element travels, as a fraction of pointer offset from centre.
   * 0.35 reads as magnetic; past ~0.6 it reads as broken.
   */
  strength?: number;
  /** Label travel relative to the button. >1 makes the text lead the box. */
  labelStrength?: number;
  /** Pixels beyond the border that still count as "near". */
  padding?: number;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

// #region critical
const RETURN_DURATION = 0.6;
const FOLLOW_DURATION = 0.35;

export function MagneticButton({
  children,
  strength = 0.35,
  labelStrength = 1.6,
  padding = 24,
  className,
  onClick,
  disabled = false,
}: MagneticButtonProps) {
  const root = useRef<HTMLButtonElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const text = label.current;
    if (!el || !text || disabled) return;

    // A coarse pointer has no hover state: the effect would only ever fire on
    // touch-down, which reads as a glitch rather than an affordance.
    const fine = window.matchMedia('(pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduced.matches) return;

    // quickTo builds one reusable tween per property. The naive version calls
    // gsap.to() on every pointermove, which allocates a tween per event (~120
    // a second) and makes each one fight the last for the same property.
    const xTo = gsap.quickTo(el, 'x', { duration: FOLLOW_DURATION, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: FOLLOW_DURATION, ease: 'power3.out' });
    const labelXTo = gsap.quickTo(text, 'x', { duration: FOLLOW_DURATION, ease: 'power3.out' });
    const labelYTo = gsap.quickTo(text, 'y', { duration: FOLLOW_DURATION, ease: 'power3.out' });

    const onMove = (e: PointerEvent) => {
      // Read the rect per move, not once on mount: the element is being
      // translated by this very effect, and any scroll or reflow invalidates
      // a cached rect. Stale centres make the button drift away permanently.
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const withinX = Math.abs(e.clientX - cx) < rect.width / 2 + padding;
      const withinY = Math.abs(e.clientY - cy) < rect.height / 2 + padding;

      if (withinX && withinY) {
        const dx = (e.clientX - cx) * strength;
        const dy = (e.clientY - cy) * strength;
        xTo(dx);
        yTo(dy);
        labelXTo(dx * (labelStrength - 1));
        labelYTo(dy * (labelStrength - 1));
        return;
      }

      // Release. Overshoot on the way home is what sells the elastic.
      gsap.to([el, text], {
        x: 0,
        y: 0,
        duration: RETURN_DURATION,
        ease: 'elastic.out(1, 0.4)',
        overwrite: 'auto',
      });
    };

    // Listen on the window, not the element. On the element, `pointerleave`
    // fires the moment the button moves out from under the cursor — it
    // chases itself away and stutters at the edge of the hit area.
    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onMove);
      // Kill before clearing: an in-flight tween would otherwise write a
      // transform back onto a node React has already handed to something else.
      gsap.killTweensOf([el, text]);
      gsap.set([el, text], { clearProps: 'transform' });
    };
  }, [strength, labelStrength, padding, disabled]);
  // #endregion critical

  return (
    <button
      ref={root}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full',
        'border border-line-strong px-8 py-3',
        'text-sm tracking-tight',
        'transition-colors duration-300 hover:bg-surface',
        'disabled:pointer-events-none disabled:opacity-50',
        'will-change-transform',
        className,
      )}
    >
      <span ref={label} className="pointer-events-none inline-block will-change-transform">
        {children}
      </span>
    </button>
  );
}
