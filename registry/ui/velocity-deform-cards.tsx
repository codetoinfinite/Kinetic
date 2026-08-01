'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useScrollVelocity } from '@/registry/hooks/use-scroll-velocity';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Velocity-Deformed Cards
   --------------------------------------------------------------------------
   Scroll position tells you where the page is. Scroll *velocity* tells you
   how hard the user is pushing it, and that is the input that makes a list
   feel like it is made of something.

   Cards skew and stretch along the direction of travel, lag behind by an
   amount proportional to how fast you are going, and settle when you stop —
   with no easing curve anywhere. The ease-out is a property of the filter,
   not a keyframe: `useScrollVelocity` low-passes the raw delta, then damps
   toward that filtered value, so a step change in speed comes out the far
   end as a curve.

   Nothing here re-renders React. Velocity lives in a ref, transforms are
   written directly, and a stationary list writes nothing at all.
   ========================================================================== */

export interface VelocityDeformCardsProps {
  children: ReactNode;
  /** Degrees of skew at full velocity. */
  maxSkew?: number;
  /** Pixels a card trails behind at full velocity. */
  maxLag?: number;
  /** Stretch along the travel axis at full velocity, as a fraction. */
  maxStretch?: number;
  /** Velocity in px/s that counts as "full". */
  reference?: number;
  /** Fraction of the velocity gap remaining after one second. */
  smoothing?: number;
  /** Scroll container. Omit to auto-detect the nearest scrollable ancestor. */
  scroller?: RefObject<HTMLElement | null>;
  className?: string;
}

const SCROLLABLE = /(auto|scroll|overlay)/;

function nearestScroller(el: HTMLElement): HTMLElement {
  let node = el.parentElement;
  while (node) {
    if (SCROLLABLE.test(getComputedStyle(node).overflowY)) return node;
    node = node.parentElement;
  }
  return document.documentElement;
}

// #region critical
export function VelocityDeformCards({
  children,
  maxSkew = 5,
  maxLag = 28,
  maxStretch = 0.14,
  reference = 1400,
  smoothing = 0.0002,
  scroller,
  className,
}: VelocityDeformCardsProps) {
  const root = useRef<HTMLDivElement>(null);
  const cards = useRef<HTMLElement[]>([]);
  const written = useRef<string[]>([]);
  const lastVelocity = useRef('');
  const reduced = useReducedMotion();

  // The hook wants an element, not a ref, so the container is resolved once
  // after mount — `document.documentElement` is the window-scroll case and is
  // read through `scrollTop` there too, which is correct on every engine.
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;
    setHost(scroller?.current ?? nearestScroller(rootEl));
  }, [scroller]);

  const velocity = useScrollVelocity({
    reference,
    smoothing,
    target: host === document.documentElement ? null : host,
  });

  // Cached rather than queried per frame: a `querySelectorAll` inside the rAF
  // loop is a forced style recalc 60 times a second for a list that changed
  // once.
  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;
    cards.current = Array.from(rootEl.querySelectorAll<HTMLElement>('[data-deform]'));
    written.current = cards.current.map(() => '');
  }, [children]);

  useRaf((_dt) => {
    const rootEl = root.current;
    if (!rootEl) return;

    if (reduced) {
      // One pass to clear, then nothing. The guard below keeps it to one pass.
      for (let i = 0; i < cards.current.length; i += 1) {
        if (written.current[i] === '') continue;
        written.current[i] = '';
        const card = cards.current[i];
        if (card) card.style.transform = '';
      }
      return;
    }

    // -1..1, already low-passed twice. Positive is scrolling down.
    const v = velocity.current.normalized;
    const magnitude = Math.abs(v);

    for (let i = 0; i < cards.current.length; i += 1) {
      const card = cards.current[i];
      if (!card) continue;

      // Per-card depth is the whole effect: identical values make the list
      // move as one rigid sheet, varied values make it bend like cloth.
      const raw = Number.parseFloat(card.dataset.deform ?? '');
      const depth = Number.isFinite(raw) ? raw : 1;

      const lag = -v * maxLag * depth;
      const skew = -v * maxSkew * depth;
      const stretch = 1 + magnitude * maxStretch * depth;
      // Squash across the travel axis by half the stretch: the card keeps
      // roughly its area, which is what stops the deformation reading as a
      // scaling bug.
      const squash = 1 - magnitude * maxStretch * depth * 0.5;

      const transform =
        `translate3d(0, ${lag.toFixed(2)}px, 0) ` +
        `skewY(${skew.toFixed(2)}deg) ` +
        `scale(${squash.toFixed(4)}, ${stretch.toFixed(4)})`;

      // At rest every card produces the same string as last frame, so an idle
      // list costs one comparison per card and zero style invalidations.
      if (written.current[i] === transform) continue;
      written.current[i] = transform;
      card.style.transform = transform;
    }

    // Published for anything that would rather react in CSS than in JS —
    // guarded, so a stationary list stops writing to the DOM entirely.
    const text = v.toFixed(3);
    if (text !== lastVelocity.current) {
      lastVelocity.current = text;
      rootEl.style.setProperty('--scroll-velocity', text);
    }
  });
  // #endregion critical

  return (
    <div ref={root} className={cn('w-full', className)}>
      {children}
    </div>
  );
}
