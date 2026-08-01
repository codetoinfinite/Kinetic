'use client';

import gsap from 'gsap';
import {
  Children,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { useGsap } from '@/registry/hooks/use-gsap';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Asymmetric In/Out Staggers
   --------------------------------------------------------------------------
   Entrances and exits are not the same animation played backwards.

     in   0.06 s apart, 0.5 s each, +24px, power2.out, after a 0.25 s hold
     out  0.03 s apart, 0.3 s each, -16px, power2.in,  from the last item

   An entrance is presented: it waits for whatever it is replacing to clear,
   then arrives item by item at a pace you can follow. An exit gets out of the
   way: twice as fast, no hold, and running from the end so the list appears
   to be pulled off rather than pushed. Mirroring the entrance on the way out
   is the single most common reason a UI feels sluggish while every individual
   duration looks reasonable in the code.
   ========================================================================== */

export interface AsymmetricStaggerProps {
  /** List items. Each direct child is wrapped and animated individually. */
  children: ReactNode;
  /** True enters, false exits. The component stays mounted either way. */
  show: boolean;
  /** Seconds between entering items. */
  inStagger?: number;
  /** Seconds between leaving items. */
  outStagger?: number;
  /** Seconds to wait before entering — room for the outgoing view to clear. */
  inDelay?: number;
  inDuration?: number;
  outDuration?: number;
  /** Pixels each item travels up into place. */
  inDistance?: number;
  /** Pixels each item travels up on the way out. */
  outDistance?: number;
  /** Fired once the last item has left. Unmount the source data here. */
  onExited?: () => void;
  className?: string;
  itemClassName?: string;
}

// #region critical
export function AsymmetricStagger({
  children,
  show,
  inStagger = 0.06,
  outStagger = 0.03,
  inDelay = 0.25,
  inDuration = 0.5,
  outDuration = 0.3,
  inDistance = 24,
  outDistance = 16,
  onExited,
  className,
  itemClassName,
}: AsymmetricStaggerProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const exited = useRef(onExited);
  exited.current = onExited;

  const startedHidden = useRef(!show);
  /* An exit only makes sense after an entrance. Without this, mounting with
     `show={false}` plays an invisible exit and fires `onExited` — and under
     StrictMode the double-invoked effect fires it a second time. */
  const hasShown = useRef(show);

  // Before paint, not after. A passive effect can land on the far side of the
  // first frame, so a list that starts closed would flash its items once.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !startedHidden.current) return;
    gsap.set(el.querySelectorAll('[data-stagger-item]'), { autoAlpha: 0 });
  }, []);

  useGsap(
    gsap,
    () => {
      const el = root.current;
      if (!el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>('[data-stagger-item]'));
      if (items.length === 0) return;

      if (!show && !hasShown.current) return;

      if (reduced) {
        // No travel and no stagger, but the state change still has to happen
        // or the list is stuck in whichever position it was left in.
        gsap.set(items, { autoAlpha: show ? 1 : 0, y: 0 });
        if (show) hasShown.current = true;
        else exited.current?.();
        return;
      }

      if (show) {
        hasShown.current = true;
        // autoAlpha, not opacity: at 0 it also sets visibility:hidden, so a
        // faded-out row cannot still swallow a click meant for what is
        // underneath it.
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: inDistance },
          {
            autoAlpha: 1,
            y: 0,
            duration: inDuration,
            ease: 'power2.out',
            stagger: inStagger,
            delay: inDelay,
            overwrite: 'auto',
          },
        );
        return;
      }

      gsap.to(items, {
        autoAlpha: 0,
        y: -outDistance,
        duration: outDuration,
        ease: 'power2.in',
        // `from: 'end'` reverses the wave. Same-direction staggers on the way
        // out read as the list re-entering backwards.
        stagger: { each: outStagger, from: 'end' },
        overwrite: 'auto',
        onComplete: () => exited.current?.(),
      });
    },
    root,
    [show, reduced],
  );
  // #endregion critical

  return (
    <div ref={root} className={cn('flex flex-col', className)}>
      {Children.map(children, (child, i) => (
        <div
          key={i}
          data-stagger-item
          className={cn('will-change-transform', itemClassName)}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
