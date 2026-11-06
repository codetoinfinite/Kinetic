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
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { clamp } from '@/registry/lib/damp';
import { wrapIndex, wrapRange } from '@/registry/lib/wrap';

/* ==========================================================================
   Rotary Drag Carousel
   --------------------------------------------------------------------------
   A dial. Items sit at fixed stations around a circle whose centre is below
   the frame, so you only ever see the top arc; grabbing anywhere in the box
   and moving turns the whole wheel, and letting go throws it and lands it on
   a station.

   The input is angular, not linear. A drag is measured as
   `atan2(y - cy, x - cx)`, and the frame's rotation is the *shortest signed*
   change in that angle — which is why a gesture that sweeps across the top of
   the wheel turns it the amount your hand actually travelled around the hub,
   rather than the amount it travelled sideways. Dragging in a straight line
   across the top does less and less as you near the edges, exactly like a
   physical wheel.

   Two things you would normally add a GSAP plugin to get (Draggable plus
   InertiaPlugin), and this component derives from plain tweens instead:

   1. **Inertia.** `power3.out` has an initial slope of exactly 3 — for
      `p(t) = 1 - (1 - t)^3`, `p'(0) = 3` — so a tween of duration `D` that
      covers `Δ` degrees leaves the wheel at `3Δ/D` deg/s on its first frame.
      Solve for `Δ = v·D/3` and a plain `gsap.to` continues the gesture at the
      exact speed the hand left it. One import instead of three.

   2. **Snapping.** The landing angle is rounded to a multiple of the station
      spacing *before* the tween starts, so there is one motion from release to
      rest instead of a throw followed by a corrective hop.
   ========================================================================== */

export interface RotaryDragCarouselProps {
  /** One item per child. Each gets a station on the wheel. */
  children: ReactNode;
  /** Wheel radius as a fraction of container width. Floored against height. */
  radiusRatio?: number;
  /** Where the top of the wheel sits, as a fraction of container height. */
  topInsetRatio?: number;
  /** Degrees the wheel snaps to. Defaults to one station, `360 / count`. */
  snapDeg?: number;
  /** Seconds of inertial travel after release. */
  throwDuration?: number;
  /** Hard cap on how far one throw may carry, in degrees. */
  maxThrow?: number;
  /** Opacity lost per 90° away from the top station. */
  fade?: number;
  /** Scale lost at 90° away from the top station. */
  scaleFalloff?: number;
  /** Station facing up on mount. */
  initialIndex?: number;
  className?: string;
  /** Applied to every station — size the items here. */
  itemClassName?: string;
  /** Fires with the wrapped index of the station that lands facing up. */
  onIndexChange?: (index: number) => void;
  'aria-label'?: string;
}

/** Screen-space angle of straight up, in degrees. `atan2` puts +y downward. */
const UP_DEG = -90;
const DEG_TO_RAD = Math.PI / 180;

const RADIUS_RATIO = 0.78;
const TOP_INSET_RATIO = 0.08;
const THROW_DURATION = 1.1;
const MAX_THROW = 260;
const FADE = 0.85;
const SCALE_FALLOFF = 0.22;

/**
 * Radius floor as a multiple of container height. Keeping the hub strictly
 * below the box is a correctness requirement, not a style choice: `atan2`
 * around a point the user can actually touch turns a two-pixel wobble near the
 * hub into a hundred degrees of spin.
 */
const MIN_RADIUS_HEIGHT_RATIO = 1.25;
/** Initial slope of `power3.out`. `d/dt [1 - (1 - t)^3]` at t = 0. */
const POWER3_OUT_SLOPE = 3;
/** Pixels of travel before a press counts as a drag rather than a tap. */
const DRAG_THRESHOLD = 5;
/** Seconds of gesture history the release velocity is measured over. */
const VELOCITY_WINDOW = 0.07;
/** Degrees per second. Above this a fling is a mis-measurement, not a throw. */
const MAX_VELOCITY = 900;
/** Stations further than this from the top are not painted at all. */
const CULL_DEG = 96;
/**
 * How long the post-throw click gate stays armed, in ms. The click a release
 * produces arrives in the same task or the next; past this it is a new intent
 * rather than the tail of the gesture.
 */
const SWALLOW_TIMEOUT_MS = 300;

export function RotaryDragCarousel({
  children,
  radiusRatio = RADIUS_RATIO,
  topInsetRatio = TOP_INSET_RATIO,
  snapDeg,
  throwDuration = THROW_DURATION,
  maxThrow = MAX_THROW,
  fade = FADE,
  scaleFalloff = SCALE_FALLOFF,
  initialIndex = 0,
  className,
  itemClassName,
  onIndexChange,
  'aria-label': ariaLabel = 'Carousel',
}: RotaryDragCarouselProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stationsRef = useRef<Array<HTMLDivElement | null>>([]);
  /** Wheel rotation in degrees. Unbounded — it counts up forever. */
  const angleRef = useRef(0);
  const seededRef = useRef(false);
  const reportedRef = useRef(-1);

  const reduced = useReducedMotion();
  const size = useResizeObserver(hostRef);

  const items = Children.toArray(children);
  const count = items.length;
  const step = count > 0 ? 360 / count : 360;
  const snap = snapDeg !== undefined && snapDeg > 0 ? snapDeg : step;

  const notify = useRef(onIndexChange);
  notify.current = onIndexChange;

  // #region critical
  /**
   * Write one transform per station from the current wheel angle. A pure
   * function of `angleRef.current` and the box size — nothing accumulates in
   * here, so interrupting the throw tween mid-flight cannot desynchronise it.
   */
  const layout = useCallback(() => {
    const host = hostRef.current;
    if (!host || count === 0) return;

    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width < 1 || height < 1) return;

    const radius = Math.max(radiusRatio * width, height * MIN_RADIUS_HEIGHT_RATIO);
    const cx = width / 2;
    const cy = topInsetRatio * height + radius;
    const angle = angleRef.current;

    for (let i = 0; i < count; i += 1) {
      const station = stationsRef.current[i];
      if (!station) continue;

      // Station i's screen angle. `UP_DEG` puts station 0 at the top when the
      // wheel is at 0, so the maths and the visual agree at rest.
      const theta = angle + i * step + UP_DEG;
      // Shortest signed distance to the top, in (-180, 180]. The wheel is a
      // real circle, so this is the only place wrapping is needed at all —
      // `angle` itself may be -4000 without consequence.
      const away = wrapRange(theta - UP_DEG, -180, 180);
      const distance = Math.abs(away);

      if (distance > CULL_DEG) {
        station.style.visibility = 'hidden';
        continue;
      }

      const rad = theta * DEG_TO_RAD;
      const x = cx + radius * Math.cos(rad);
      const y = cy + radius * Math.sin(rad);
      const t = Math.min(distance / 90, 1);

      station.style.visibility = 'visible';
      // Counter-rotating by `-away` would keep the cards upright; leaving the
      // rotation in is what makes it read as one rigid wheel rather than a row
      // of cards travelling along an arc.
      station.style.transform =
        `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) ` +
        `rotate(${away.toFixed(2)}deg) ` +
        `scale(${(1 - scaleFalloff * t).toFixed(3)})`;
      station.style.opacity = clamp(1 - fade * t, 0, 1).toFixed(3);
      station.style.zIndex = String(100 - Math.round(distance));
    }
  }, [count, step, radiusRatio, topInsetRatio, fade, scaleFalloff]);

  /** Angle at which station `index` faces up: `angle + index * step = 0`. */
  const angleForIndex = useCallback((index: number) => -index * step, [step]);

  const report = useCallback(() => {
    if (count === 0) return;
    // `angle = -i * step` puts station i up, so `i = -angle / step`.
    const index = wrapIndex(Math.round(-angleRef.current / step), count);
    if (index === reportedRef.current) return;
    reportedRef.current = index;
    notify.current?.(index);
  }, [count, step]);

  /**
   * Land the wheel. `velocity` is degrees per second at the moment of release;
   * pass 0 for a keyboard step or a tap.
   */
  const settle = useCallback(
    (velocity: number) => {
      const projected =
        angleRef.current +
        clamp(
          (velocity * throwDuration) / POWER3_OUT_SLOPE,
          -maxThrow,
          maxThrow,
        );
      // Round to a station BEFORE tweening. Snapping afterwards is a second
      // animation that starts from rest, which is the little hop that gives
      // away every hand-rolled dial.
      const landing = Math.round(projected / snap) * snap;

      gsap.killTweensOf(angleRef);

      if (reduced || Math.abs(landing - angleRef.current) < 0.01) {
        angleRef.current = landing;
        layout();
        report();
        return;
      }

      gsap.to(angleRef, {
        current: landing,
        duration: throwDuration,
        ease: 'power3.out',
        overwrite: true,
        onUpdate: layout,
        onComplete: report,
      });
    },
    [throwDuration, maxThrow, snap, reduced, layout, report],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let pointerId: number | null = null;
    let lastPointerAngle = 0;
    let pressX = 0;
    let pressY = 0;
    let moved = false;
    let swallowClick = false;
    let swallowTimer: number | null = null;

    // The gate expires. A throw released over a gap between cards, or one the
    // browser cancels, produces no click at all — and a gate left armed eats
    // the visitor's next real click, however long afterwards it lands.
    const disarmSwallow = () => {
      swallowClick = false;
      if (swallowTimer !== null) {
        window.clearTimeout(swallowTimer);
        swallowTimer = null;
      }
    };
    /** Rolling window: the wheel angle and clock at the start of the window. */
    let sampleAngle = 0;
    let sampleTime = 0;

    const now = () => performance.now() / 1000;

    const pointerAngle = (clientX: number, clientY: number) => {
      const rect = host.getBoundingClientRect();
      const radius = Math.max(
        radiusRatio * rect.width,
        rect.height * MIN_RADIUS_HEIGHT_RATIO,
      );
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + topInsetRatio * rect.height + radius;
      return Math.atan2(clientY - cy, clientX - cx) / DEG_TO_RAD;
    };

    const onPointerDown = (e: PointerEvent) => {
      // One pointer owns the wheel. A second finger arriving mid-throw would
      // otherwise reset the origin angle and the wheel would jump.
      if (pointerId !== null || !e.isPrimary) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      // A new press means the previous gesture is over and whatever click it
      // was owed never came.
      disarmSwallow();
      pointerId = e.pointerId;
      pressX = e.clientX;
      pressY = e.clientY;
      moved = false;
      lastPointerAngle = pointerAngle(e.clientX, e.clientY);
      sampleAngle = angleRef.current;
      sampleTime = now();

      // Capture on press, not once the threshold is crossed: by then the
      // pointer may already have left the element, and `pointermove` would
      // have stopped arriving.
      host.setPointerCapture(e.pointerId);
      gsap.killTweensOf(angleRef);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;

      const current = pointerAngle(e.clientX, e.clientY);
      // Shortest signed step. Without the wrap, dragging across the 180°
      // seam reads as a 359° jerk in the wrong direction.
      const delta = wrapRange(current - lastPointerAngle, -180, 180);
      lastPointerAngle = current;

      if (!moved) {
        if (Math.hypot(e.clientX - pressX, e.clientY - pressY) < DRAG_THRESHOLD) return;
        moved = true;
      }

      angleRef.current += delta;
      layout();

      // Retire the velocity window once it is full. Measuring over a window
      // rather than off the last delta is what stops "drag, pause, lift" from
      // throwing the wheel: with no movement there are no events, the window
      // never advances, and the measured speed decays toward zero on its own.
      const t = now();
      if (t - sampleTime > VELOCITY_WINDOW) {
        sampleAngle = angleRef.current;
        sampleTime = t;
      }
    };

    /**
     * Idempotent. Called from `pointerup`, `pointercancel` and
     * `lostpointercapture`, all three of which can be the last event a gesture
     * produces, and at least one of which will always arrive — including when
     * the pointer is released outside the window, or the OS takes it away for
     * a gesture of its own. Guarding on `pointerId` makes the extra calls
     * no-ops instead of a double throw.
     */
    const finish = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      const id = pointerId;
      pointerId = null;

      const elapsed = now() - sampleTime;
      const velocity =
        moved && elapsed > 0
          ? clamp((angleRef.current - sampleAngle) / elapsed, -MAX_VELOCITY, MAX_VELOCITY)
          : 0;

      disarmSwallow();
      if (moved) {
        swallowClick = true;
        swallowTimer = window.setTimeout(disarmSwallow, SWALLOW_TIMEOUT_MS);
      }
      moved = false;

      if (host.hasPointerCapture(id)) host.releasePointerCapture(id);
      settle(velocity);
    };

    // Capture phase, ahead of any child's own handler. A throw ends with a
    // `click` on whatever happens to be under the pointer, so without this the
    // gesture that spins the wheel also activates a card.
    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return;

      // Enter or Space on a focused card dispatches a click with `detail === 0`
      // and no pointer sequence behind it. Nothing was thrown, and swallowing
      // it is what makes the wheel keyboard-inoperable.
      if (e.detail === 0) return;

      disarmSwallow();
      e.preventDefault();
      e.stopPropagation();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const direction =
        e.key === 'ArrowRight' || e.key === 'ArrowDown'
          ? -1
          : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
            ? 1
            : 0;
      if (direction === 0) return;
      e.preventDefault();
      gsap.killTweensOf(angleRef);
      angleRef.current = Math.round(angleRef.current / snap) * snap + direction * snap;
      settle(0);
    };

    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerup', finish);
    host.addEventListener('pointercancel', finish);
    host.addEventListener('lostpointercapture', finish);
    host.addEventListener('click', onClick, true);
    host.addEventListener('keydown', onKeyDown);

    return () => {
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', finish);
      host.removeEventListener('pointercancel', finish);
      host.removeEventListener('lostpointercapture', finish);
      host.removeEventListener('click', onClick, true);
      // Or the timer outlives the effect and a remount starts life armed.
      disarmSwallow();
      host.removeEventListener('keydown', onKeyDown);
      if (pointerId !== null && host.hasPointerCapture(pointerId)) {
        host.releasePointerCapture(pointerId);
      }
      pointerId = null;
    };
  }, [layout, settle, snap, radiusRatio, topInsetRatio]);
  // #endregion critical

  useEffect(() => {
    const angle = angleRef;
    return () => {
      gsap.killTweensOf(angle);
    };
  }, []);

  // Seed the starting station once. Re-seeding on resize would teleport the
  // wheel back to `initialIndex` mid-gesture on a phone rotation.
  useEffect(() => {
    if (seededRef.current || count === 0) return;
    seededRef.current = true;
    angleRef.current = angleForIndex(clamp(Math.round(initialIndex), 0, count - 1));
    layout();
    report();
  }, [angleForIndex, count, initialIndex, layout, report]);

  useEffect(() => {
    layout();
  }, [layout, size.width, size.height]);

  return (
    <div
      ref={hostRef}
      role="group"
      aria-label={ariaLabel}
      tabIndex={0}
      className={cn(
        // `touch-action: none` on the drag surface, not `pan-y`: the gesture is
        // rotary, so there is no axis to hand back to the browser. Without it
        // the first few degrees of every touch drag are eaten by a scroll.
        'relative h-full w-full touch-none select-none overflow-hidden',
        'cursor-grab active:cursor-grabbing focus-visible:outline-none',
        className,
      )}
    >
      {items.map((child, i) => (
        <div
          key={isValidElement(child) && child.key !== null ? child.key : i}
          ref={(node) => {
            stationsRef.current[i] = node;
          }}
          // `invisible` covers the single frame between mount and the first
          // layout, when every station would otherwise be stacked at the
          // container's top-left corner.
          className={cn(
            'invisible absolute left-0 top-0 origin-center will-change-transform',
            itemClassName,
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
