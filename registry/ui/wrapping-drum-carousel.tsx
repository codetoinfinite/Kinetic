'use client';

import gsap from 'gsap';
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useDrag } from '@/registry/hooks/use-drag';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { wrapIndex } from '@/registry/lib/wrap';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Wrapping Drum Carousel
   --------------------------------------------------------------------------
   A carousel that reads as a rotating drum while being entirely flat. There
   is no `rotateY`, no `translateZ`, no `perspective` — the component sets
   `rotationY: 0` and `z: 0` explicitly so that no ambient 3D can leak in from
   a parent. Depth comes from three flat properties moving together with
   distance from centre: `x`, `scale`, and `autoAlpha`.

   The endlessness comes from one function. `gsap.utils.wrap(-n/2, n/2)` maps
   `i - position` into a signed ring offset, so card 5 of 6 at position 0 sits
   one slot to the LEFT of centre rather than five slots to the right. The
   carousel has no ends and `position` may drift to ±10000 without breaking.
   ========================================================================== */

export interface WrappingDrumCarouselProps {
  /** One card per child. Each is wrapped in a positioned cell we control. */
  children: ReactNode;
  /** Card spacing as a fraction of stage width. */
  spacingRatio?: number;
  /** Upper bound on spacing in px, so an ultrawide monitor does not fling
   *  the neighbours into the next county. */
  maxSpacing?: number;
  /** How much a card shrinks by one slot out. */
  scaleFalloff?: number;
  className?: string;
  /** Applied to each positioned cell — this is where you size the cards. */
  cardClassName?: string;
  /** Fires with the wrapped index (always `0..count-1`) on every snap. */
  onIndexChange?: (index: number) => void;
}

const SNAP_DURATION = 0.7;
const WHEEL_STEP = 90;
const MAX_WHEEL_STEPS = 3;
const DRAG_THRESHOLD = 8;
const ALPHA_INTERCEPT = 1.15;
const ALPHA_SLOPE = 0.75;

// #region critical
export function WrappingDrumCarousel({
  children,
  spacingRatio = 0.46,
  maxSpacing = 560,
  scaleFalloff = 0.2,
  className,
  cardClassName,
  onIndexChange,
}: WrappingDrumCarouselProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<Array<HTMLDivElement | null>>([]);
  /** Fractional carousel position. Tweened by the snap, driven raw by drag. */
  const posRef = useRef({ pos: 0 });
  /** Integer target index. Unwrapped — it counts up forever. */
  const indexRef = useRef(0);
  /** Last computed spacing in px. Drag divides by this for 1:1 tracking. */
  const stepRef = useRef(1);

  const reduced = useReducedMotion();
  const size = useResizeObserver(stageRef);

  const items = Children.toArray(children);
  const count = items.length;

  const notify = useRef(onIndexChange);
  notify.current = onIndexChange;

  /**
   * Lay every card out for the current `pos`. Called on mount, on resize,
   * on every frame of the snap tween, and on every pointermove during a drag.
   * It is a pure function of `pos` — there is no accumulated state in here,
   * which is why interrupting the tween mid-flight cannot desynchronise it.
   */
  const layout = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || count === 0) return;

    const step = Math.min(spacingRatio * stage.clientWidth, maxSpacing);
    stepRef.current = step > 0 ? step : 1;

    // Signed ring offset in (-count/2, count/2]. The whole illusion is here.
    const ring = gsap.utils.wrap(-count / 2, count / 2);
    const pos = posRef.current.pos;

    for (let i = 0; i < count; i += 1) {
      const card = cardsRef.current[i];
      if (!card) continue;

      const offset = ring(i - pos);
      const distance = Math.abs(offset);

      gsap.set(card, {
        xPercent: -50,
        yPercent: -50,
        x: offset * step,
        // Explicitly flat. Without these two, a `transform-style: preserve-3d`
        // or a stray `rotateY` on an ancestor turns a deliberately 2D drum
        // into a half-broken 3D one that skews at the edges.
        rotationY: 0,
        z: 0,
        // Scale bottoms out at one slot out; alpha keeps falling and hits 0 at
        // distance 1.533. Cards therefore fade into fog rather than shrink to
        // a vanishing point — that mismatch is what sells the cylinder.
        scale: 1 - scaleFalloff * Math.min(distance, 1),
        autoAlpha: gsap.utils.clamp(0, 1, ALPHA_INTERCEPT - ALPHA_SLOPE * distance),
        zIndex: 100 - Math.round(10 * distance),
        transformOrigin: '50% 50%',
      });
    }
  }, [count, spacingRatio, maxSpacing, scaleFalloff]);

  /** Tween `pos` to an integer index and re-lay out on every frame. */
  const snapTo = useCallback(
    (index: number) => {
      indexRef.current = index;
      notify.current?.(wrapIndex(index, count));

      if (reduced) {
        // Not "duration 0" via the tween: a zero-duration gsap.to does not
        // guarantee an onUpdate call, so the layout would never run.
        posRef.current.pos = index;
        layout();
        return;
      }

      gsap.to(posRef.current, {
        pos: index,
        duration: SNAP_DURATION,
        ease: 'power3.out',
        overwrite: true,
        onUpdate: layout,
      });
    },
    [count, layout, reduced],
  );

  useDrag(stageRef, {
    threshold: DRAG_THRESHOLD,
    onDragStart: () => {
      // Kill the snap first or it keeps writing `pos` underneath the drag and
      // the cards visibly fight the finger.
      gsap.killTweensOf(posRef.current);
    },
    onDrag: (state) => {
      posRef.current.pos -= state.deltaX / stepRef.current;
      layout();
    },
    onDragEnd: (_state, moved) => {
      if (moved) snapTo(Math.round(posRef.current.pos));
    },
  });
  // #endregion critical

  // Re-lay out whenever the stage resizes: spacing is a fraction of width, so
  // a sidebar opening changes every card's position.
  useEffect(() => {
    layout();
  }, [layout, size.width, size.height]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let accumulated = 0;

    const onWheel = (e: WheelEvent) => {
      // Only horizontal intent drives the drum. A trackpad's vertical swipe
      // belongs to the page — claiming it here would trap the scroll on any
      // page that puts this component in the middle of an article.
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || e.deltaX === 0) return;
      e.preventDefault();

      accumulated += e.deltaX;
      let steps = 0;
      while (Math.abs(accumulated) >= WHEEL_STEP && steps < MAX_WHEEL_STEPS) {
        const direction = accumulated > 0 ? 1 : -1;
        accumulated -= WHEEL_STEP * direction;
        snapTo(indexRef.current + direction);
        steps += 1;
      }
      // Drop the remainder once a step fired. Keeping it lets a long inertial
      // trackpad flick queue up steps that keep firing after the fingers lift.
      if (steps > 0) accumulated = 0;
    };

    // `passive: false` is required: preventDefault on a passive wheel listener
    // is ignored and logs a console warning on every event.
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [snapTo]);

  useEffect(() => {
    const position = posRef.current;
    const cells = cardsRef.current;
    return () => {
      gsap.killTweensOf(position);
      const live = cells.filter((c): c is HTMLDivElement => c !== null);
      if (live.length > 0) {
        gsap.killTweensOf(live);
        gsap.set(live, { clearProps: 'all' });
      }
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className={cn(
        'relative h-full w-full touch-pan-y select-none overflow-hidden',
        'cursor-grab active:cursor-grabbing',
        className,
      )}
    >
      {items.map((child, i) => (
        <div
          key={isValidElement(child) && child.key !== null ? child.key : i}
          ref={(node) => {
            cardsRef.current[i] = node;
          }}
          // `invisible` for the first paint: layout() runs in an effect, so
          // without it every card flashes stacked at the centre for one frame.
          className={cn(
            'invisible absolute left-1/2 top-1/2 will-change-transform',
            cardClassName,
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
