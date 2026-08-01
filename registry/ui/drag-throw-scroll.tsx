'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { useLenis } from '@/registry/hooks/use-lenis';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { clamp, damp, perFrameToSmoothing } from '@/registry/lib/damp';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Drag-Throw Scroll
   --------------------------------------------------------------------------
   Grab the page and pull it. Let go while still moving and it keeps going,
   decaying, exactly as far as the flick deserved. Wheel, drag and arrow keys
   all write to one scroll position, so the three inputs can never disagree.

   Two things make this hard, and neither is the drag itself.

   The first is the throw. Averaging "pixels since the last event" is the
   version everybody writes, and it is frame-rate dependent: the same physical
   flick produces half the velocity at 120 Hz because each event covers half
   the distance. Velocity here is measured in px per SECOND across a fixed
   100 ms window, so a flick throws the same distance on any display, and a
   drag that stalls before release throws nothing at all.

   The second is the pointer lifecycle. `setPointerCapture` on press keeps
   moves arriving after the pointer leaves the element — without it a fast
   drag dies the instant it crosses the edge and the content sticks
   mid-gesture. But capture can also be taken away without a `pointerup`:
   the OS claims the gesture, the element is detached, a second finger
   arrives. `pointercancel` and `lostpointercapture` are therefore both
   terminators, so there is no path that leaves the surface believing a
   finger is still down.
   ========================================================================== */

/** One position sample. `t` is `event.timeStamp`, i.e. ms on the page clock. */
interface Sample {
  y: number;
  t: number;
}

export interface DragThrowScrollProps {
  children?: ReactNode;
  /**
   * The box to scroll. Omit to drive the page through the shared Lenis
   * instance — which is also what gives the throw its glide.
   */
  scroller?: RefObject<HTMLElement | null>;
  /** Scroll px per pointer px, for mouse and pen. Touch is always 1. */
  multiplier?: number;
  /** Seconds of coast after release. Throw distance is velocity × this. */
  throwSeconds?: number;
  /** Arrow-key step in px, applied when the surface has focus. */
  keyStep?: number;
  enabled?: boolean;
  className?: string;
}

// #region critical
/**
 * Lenis's per-frame lerp for the throw, and the same curve expressed for
 * `damp` so a box scroller decays identically to the page. One number, two
 * sinks — tuning it in one place cannot desync them.
 */
const THROW_LERP = 0.05;
const THROW_SMOOTHING = perFrameToSmoothing(THROW_LERP);

const SAMPLE_COUNT = 5;
const SAMPLE_WINDOW_MS = 100;
const MIN_THROW_SPEED = 120;
const SETTLE_EPSILON = 0.5;
const KEY_STEP_SECONDS = 0.2;

/** Presses on real controls belong to those controls, not to the drag. */
const NO_DRAG = 'a,button,input,select,textarea,label,[data-no-drag]';

function scrollBoxOf(scroller?: RefObject<HTMLElement | null>): Element | null {
  if (scroller) return scroller.current;
  return typeof document === 'undefined' ? null : document.scrollingElement;
}

export function DragThrowScroll({
  children,
  scroller,
  multiplier = 2,
  throwSeconds = 0.65,
  keyStep = 100,
  enabled = true,
  className,
}: DragThrowScrollProps) {
  const surface = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  /* Lenis owns the document and nothing else. A component pointed at its own
     box must not build one — and under reduced motion nobody wants smoothing
     at all, so the page sink degrades to direct `scrollTop` writes. The hook
     is refcounted: several of these on one page share the single instance
     rather than stacking `wheel` handlers that each call `preventDefault`. */
  const viaLenis = enabled && !reduced && scroller === undefined;
  const lenis = useLenis({ enabled: viaLenis });

  /** Coast target for the box sink. `null` means nothing is in flight. */
  const glide = useRef<number | null>(null);

  useRaf(
    (dt) => {
      const to = glide.current;
      const box = scrollBoxOf(scroller);
      if (to === null || !box) return;
      const next = damp(box.scrollTop, to, THROW_SMOOTHING, dt);
      // Snap and stop. An exponential never arrives, so without a floor this
      // writes a sub-pixel delta every frame forever and the loop never idles.
      if (Math.abs(to - next) < SETTLE_EPSILON) {
        glide.current = null;
        box.scrollTop = to;
        return;
      }
      box.scrollTop = next;
    },
    // Only the box sink needs a loop: Lenis animates its own scrollTo, and
    // reduced motion has nothing to animate.
    enabled && !reduced && scroller !== undefined,
  );

  useEffect(() => {
    const el = surface.current;
    if (!el || !enabled) return;

    let pointerId: number | null = null;
    let startY = 0;
    let startScroll = 0;
    let target = 0;
    let gain = 1;
    const samples: Sample[] = [];

    /* -- the sink: Lenis when it exists, the raw box otherwise -------------- */

    const read = (): number => {
      const l = lenis.current;
      // `scroll`, not `targetScroll`. This is read on press, and grabbing a
      // coasting page has to stop it where the content LOOKS, not where it was
      // headed — otherwise the first pixel of the drag jumps forward by
      // whatever the throw had left to run.
      if (l) return l.scroll;
      return scrollBoxOf(scroller)?.scrollTop ?? 0;
    };

    const limitOf = (): number => {
      const l = lenis.current;
      if (l) return l.limit;
      const box = scrollBoxOf(scroller);
      return box ? Math.max(0, box.scrollHeight - box.clientHeight) : 0;
    };

    /** Direct manipulation: the content is under a finger, so no smoothing. */
    const jump = (y: number) => {
      glide.current = null;
      const l = lenis.current;
      if (l) {
        l.scrollTo(y, { immediate: true });
        return;
      }
      const box = scrollBoxOf(scroller);
      if (box) box.scrollTop = y;
    };

    /** Release: an exponential decay toward the thrown target. */
    const coast = (y: number) => {
      const l = lenis.current;
      if (l) {
        l.scrollTo(y, { lerp: THROW_LERP });
        return;
      }
      glide.current = y;
    };

    const step = (y: number) => {
      const l = lenis.current;
      if (l) {
        l.scrollTo(y, { duration: KEY_STEP_SECONDS });
        return;
      }
      glide.current = null;
      scrollBoxOf(scroller)?.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    };

    /* -- velocity ---------------------------------------------------------- */

    /**
     * Pointer velocity in px/s, measured from the oldest sample still inside
     * the window to the newest. Time-based rather than per-event, so the
     * number describes the hand rather than the display.
     */
    const velocityAt = (now: number): number => {
      let oldest: Sample | undefined;
      for (const sample of samples) {
        if (now - sample.t <= SAMPLE_WINDOW_MS) {
          oldest = sample;
          break;
        }
      }
      const newest = samples[samples.length - 1];
      if (!oldest || !newest) return 0;
      const span = newest.t - oldest.t;
      if (span <= 0) return 0;
      return ((newest.y - oldest.y) / span) * 1000;
    };

    /* -- pointer lifecycle ------------------------------------------------- */

    const onPointerDown = (e: PointerEvent) => {
      if (pointerId !== null || !e.isPrimary) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target instanceof Element && e.target.closest(NO_DRAG)) return;

      pointerId = e.pointerId;
      // A finger is physically on the content: any gain but 1 slides the
      // content out from under it. A mouse is an indirect device with a
      // window-height of travel available, so it gets the multiplier.
      gain = e.pointerType === 'touch' ? 1 : multiplier;
      startY = e.clientY;
      startScroll = read();
      target = startScroll;
      jump(startScroll);
      samples.length = 0;
      samples.push({ y: e.clientY, t: e.timeStamp });
      // Captured on press, not on some later threshold: by the time a
      // threshold would trip, the pointer may already be off the element.
      el.setPointerCapture(e.pointerId);
      el.dataset.dragging = 'true';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      // Absolute, from the press point. Accumulating per-event deltas onto the
      // live scroll position loses whatever the sink has not applied yet, and
      // the content drifts behind the hand over a long drag.
      target = clamp(startScroll - (e.clientY - startY) * gain, 0, limitOf());
      jump(target);
      samples.push({ y: e.clientY, t: e.timeStamp });
      if (samples.length > SAMPLE_COUNT) samples.shift();
    };

    const release = (e: PointerEvent, thrown: boolean) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      el.dataset.dragging = 'false';
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);

      if (!thrown || reduced) {
        samples.length = 0;
        return;
      }
      samples.push({ y: e.clientY, t: e.timeStamp });
      const velocity = velocityAt(e.timeStamp);
      samples.length = 0;
      const scrollVelocity = -velocity * gain;
      if (Math.abs(scrollVelocity) < MIN_THROW_SPEED) return;
      coast(clamp(target + scrollVelocity * throwSeconds, 0, limitOf()));
    };

    const onPointerUp = (e: PointerEvent) => release(e, true);
    // Both of these are aborts, so neither throws. `pointercancel` is the OS
    // taking the gesture; `lostpointercapture` is the catch-all — capture
    // revoked with no `pointerup` at all, which is the one path that would
    // otherwise leave the surface stuck believing a finger is still down. It
    // also fires immediately after a normal release, where the `pointerId`
    // guard above has already made it a no-op.
    const onPointerCancel = (e: PointerEvent) => release(e, false);
    const onLostCapture = (e: PointerEvent) => release(e, false);

    // Native HTML5 drag on any image or link inside would hijack the gesture
    // and hand back a ghost image instead of a scroll.
    const onDragStart = (e: Event) => e.preventDefault();

    const onKeyDown = (e: KeyboardEvent) => {
      const dir = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (dir === 0) return;
      e.preventDefault();
      step(clamp(read() + dir * keyStep, 0, limitOf()));
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerCancel);
    el.addEventListener('lostpointercapture', onLostCapture);
    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('keydown', onKeyDown);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerCancel);
      el.removeEventListener('lostpointercapture', onLostCapture);
      el.removeEventListener('dragstart', onDragStart);
      el.removeEventListener('keydown', onKeyDown);
      if (pointerId !== null && el.hasPointerCapture(pointerId)) {
        el.releasePointerCapture(pointerId);
      }
      el.dataset.dragging = 'false';
      glide.current = null;
    };
  }, [scroller, lenis, multiplier, throwSeconds, keyStep, enabled, reduced]);
  // #endregion critical

  return (
    <div
      ref={surface}
      // Rendered rather than added later so the attribute exists in the
      // server markup and the `data-` variants below have something to miss.
      data-dragging="false"
      tabIndex={enabled ? 0 : -1}
      className={cn(
        'relative',
        enabled &&
          // `touch-action: none` is what stops the browser scrolling the page
          // itself while we scroll it: without it a touch drag is claimed by
          // the compositor, `pointermove` stops arriving, and the gesture ends
          // in a `pointercancel` on the first frame.
          'touch-none cursor-grab data-[dragging=true]:cursor-grabbing data-[dragging=true]:select-none',
        className,
      )}
    >
      {children}
    </div>
  );
}
