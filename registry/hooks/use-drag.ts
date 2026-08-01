'use client';

import { useEffect, useRef, type RefObject } from 'react';

/* ==========================================================================
   Pointer drag with capture, a dead zone, and a click gate.
   --------------------------------------------------------------------------
   Three things every hand-rolled drag gets wrong:

   1. No pointer capture. Drag fast, leave the element, and `pointermove`
      stops firing — the track sticks mid-throw. `setPointerCapture` keeps
      events coming to the origin element until release.

   2. No dead zone. Without one, a 1 px wobble during a click is a drag, and
      the drag handler fights the click handler on every tap.

   3. The click still fires. After a real drag, the browser dispatches
      `click` on whatever is under the pointer, so throwing a carousel opens
      whichever slide you happen to release over. Swallowing that one click
      in the capture phase is the fix; `onDragEnd`'s `moved` flag tells the
      caller whether it happened.
   ========================================================================== */

export interface DragState {
  /** Pixels from the press point. */
  dx: number;
  dy: number;
  /** Pixels since the previous move event. */
  deltaX: number;
  deltaY: number;
  /** Viewport pixels. */
  clientX: number;
  clientY: number;
}

export interface UseDragOptions {
  /** Pixels of travel before it counts as a drag. Default 4. */
  threshold?: number;
  /** Ignore the wrong mouse buttons / a secondary touch. Default true. */
  primaryOnly?: boolean;
  onDragStart?: (state: DragState) => void;
  onDrag?: (state: DragState) => void;
  /** `moved` is false for a tap: the caller should treat it as a click. */
  onDragEnd?: (state: DragState, moved: boolean) => void;
  enabled?: boolean;
}

export function useDrag(
  ref: RefObject<HTMLElement | null>,
  options: UseDragOptions = {},
): { current: boolean } {
  const { threshold = 4, primaryOnly = true, enabled = true } = options;

  const dragging = useRef(false);
  const handlers = useRef(options);
  handlers.current = options;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let passed = false;
    let swallowClick = false;

    const stateAt = (clientX: number, clientY: number): DragState => ({
      dx: clientX - startX,
      dy: clientY - startY,
      deltaX: clientX - lastX,
      deltaY: clientY - lastY,
      clientX,
      clientY,
    });

    const onPointerDown = (e: PointerEvent) => {
      if (primaryOnly && !e.isPrimary) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      passed = false;
      // Capture on press, not on threshold: by the time the threshold is
      // crossed the pointer may already be outside the element.
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      const state = stateAt(e.clientX, e.clientY);

      if (!passed) {
        if (Math.hypot(state.dx, state.dy) < threshold) return;
        passed = true;
        dragging.current = true;
        handlers.current.onDragStart?.(state);
      }

      handlers.current.onDrag?.(state);
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const finish = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      const state = stateAt(e.clientX, e.clientY);
      const moved = passed;

      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      pointerId = null;
      passed = false;
      dragging.current = false;
      swallowClick = moved;

      handlers.current.onDragEnd?.(state, moved);
    };

    // Capture phase, so it runs before any child's own click handler.
    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', finish);
    el.addEventListener('pointercancel', finish);
    el.addEventListener('click', onClick, true);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', finish);
      el.removeEventListener('pointercancel', finish);
      el.removeEventListener('click', onClick, true);
      if (pointerId !== null && el.hasPointerCapture(pointerId)) {
        el.releasePointerCapture(pointerId);
      }
      dragging.current = false;
    };
  }, [ref, threshold, primaryOnly, enabled]);

  return dragging;
}
