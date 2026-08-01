'use client';

import gsap from 'gsap';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   A/B Layer Ping-Pong
   --------------------------------------------------------------------------
   One element cannot crossfade with itself. Two stacked layers alternate:
   the incoming content is always written into whichever layer is currently
   at opacity 0, then the pair swap. However fast the key changes, a fade is
   always available in both directions and the previous content is still on
   screen to fade out of.

   Every transition starts with `killTweensOf` on both layers. Without it,
   moving quickly across a list stacks opposing opacity tweens on the same
   nodes and the layers flicker instead of blending.
   ========================================================================== */

export interface ABLayerCrossfadeProps {
  /** Identity of the current content. A change starts a crossfade. */
  contentKey: string;
  /** Content for the current key. Captured into a layer when the key changes. */
  children: ReactNode;
  /** Crossfade length in seconds. */
  duration?: number;
  /** GSAP ease for both halves of the fade. */
  ease?: string;
  className?: string;
}

type Slot = 'a' | 'b';

// #region critical
export function ABLayerCrossfade({
  contentKey,
  children,
  duration = 1,
  ease = 'power2.inOut',
  className,
}: ABLayerCrossfadeProps) {
  const aRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const [front, setFront] = useState<Slot>('a');
  const [layers, setLayers] = useState<{ a: ReactNode; b: ReactNode }>({
    a: children,
    b: null,
  });

  const shownKey = useRef(contentKey);
  const frontRef = useRef<Slot>('a');
  const first = useRef(true);

  // Write into the BACK layer, then flip. The back layer is already at
  // opacity 0, so the new content mounts invisibly — no flash of it at full
  // strength before the tween starts.
  useEffect(() => {
    if (shownKey.current === contentKey) return;
    shownKey.current = contentKey;
    const next: Slot = frontRef.current === 'a' ? 'b' : 'a';
    frontRef.current = next;
    setLayers((l) => ({ ...l, [next]: children }));
    setFront(next);
  }, [contentKey, children]);

  useEffect(() => {
    const inEl = front === 'a' ? aRef.current : bRef.current;
    const outEl = front === 'a' ? bRef.current : aRef.current;
    if (!inEl || !outEl) return;

    if (first.current) {
      first.current = false;
      gsap.set(inEl, { opacity: 1 });
      gsap.set(outEl, { opacity: 0 });
      return;
    }

    // Kill first, always. Two rapid changes otherwise leave an old fade-out
    // running on the layer the new fade-in is driving up.
    gsap.killTweensOf([inEl, outEl]);

    if (reduced) {
      gsap.set(inEl, { opacity: 1 });
      gsap.set(outEl, { opacity: 0 });
      return;
    }

    gsap.to(inEl, { opacity: 1, duration, ease });
    gsap.to(outEl, { opacity: 0, duration, ease });
  }, [front, duration, ease, reduced]);

  useEffect(
    () => () => {
      gsap.killTweensOf([aRef.current, bRef.current]);
    },
    [],
  );
  // #endregion critical

  return (
    <div className={cn('relative isolate overflow-hidden', className)}>
      <div ref={aRef} className="absolute inset-0" style={{ opacity: 1 }}>
        {layers.a}
      </div>
      <div ref={bRef} className="absolute inset-0" style={{ opacity: 0 }}>
        {layers.b}
      </div>
    </div>
  );
}
