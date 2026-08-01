'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';

/* ==========================================================================
   Drag with a Dead Zone and Pointer Capture
   --------------------------------------------------------------------------
   A press is not a drag until it has travelled. Nobody's hand is steady: a
   deliberate click on a trackpad moves the pointer one to three pixels
   between `pointerdown` and `pointerup`, and a tap on a phone moves five or
   more. A drag handler with no dead zone treats every one of those as a
   gesture, so the carousel lurches two pixels on every click and — worse —
   the code that suppresses the post-drag click now suppresses the click the
   user actually meant. The dead zone is not a nicety; it is the thing that
   keeps tapping and dragging separable at all.

   Two ideas, and their order is the whole trick:

   1. **Capture on press.** `setPointerCapture` routes every subsequent
      pointer event for that pointer to this element regardless of what is
      under the cursor. Without it, a fast throw leaves the element,
      `pointermove` stops arriving, and the track freezes mid-gesture with
      the button still held.

   2. **Commit on distance.** The gesture is only a drag once the pointer is
      further than `threshold` from the press point. Capture happens first,
      commitment second — capturing at the moment of commitment is too late,
      because the pointer may already be outside the element by then, and
      `setPointerCapture` on a pointer that has already ended throws
      `NotFoundError`.

   Then there is the part that gets skipped: a gesture has four ways to end
   and only one of them is `pointerup`. `pointercancel` fires when the browser
   takes the gesture for its own scrolling or a long-press menu.
   `lostpointercapture` fires if the capture is dropped without a release —
   an OS window switch, a device disconnect. And the caller may want to abort
   it themselves. All four land in one `finish()` here, because a gesture that
   ends through a path you did not handle leaves `dragging` true forever, and
   the track stays stuck to a pointer that is no longer in the room.
   ========================================================================== */

export type DragAxis = 'both' | 'x' | 'y';

export interface DragDeadzoneState {
  /** Offset from the press point, in viewport pixels. Includes the dead zone. */
  dx: number;
  dy: number;
  /**
   * Movement since the previous reported move. Re-based at the moment of
   * commitment, so integrating these never replays the dead zone as a jump.
   */
  deltaX: number;
  deltaY: number;
  clientX: number;
  clientY: number;
  /** Straight-line distance from the press point. What the dead zone tests. */
  distance: number;
  /** Total path length walked. Larger than `distance` on anything but a line. */
  travel: number;
  pointerId: number;
  pointerType: string;
}

export interface DragEnd {
  /** True if the dead zone was cleared. False means: treat this as a click. */
  moved: boolean;
  /** True if the system or the caller ended it, rather than the pointer lifting. */
  cancelled: boolean;
}

export interface UseDragDeadzoneOptions {
  /** Dead-zone radius in pixels for mouse and pen. */
  threshold?: number;
  /** Dead-zone radius for `pointerType === 'touch'`, which needs more. */
  touchThreshold?: number;
  /**
   * Which direction owns the gesture. `'x'` and `'y'` add a directional lock:
   * if the other axis clears the dead zone first, the gesture is abandoned so
   * the page can scroll.
   */
  axis?: DragAxis;
  /** Ignore secondary touches and non-left mouse buttons. */
  primaryOnly?: boolean;
  /**
   * Set `touch-action` (derived from `axis`) and `user-select: none` on the
   * element, restoring the previous inline values on cleanup.
   */
  manageStyles?: boolean;
  enabled?: boolean;
  /** `pointerdown` accepted. The place to kill an in-flight settle tween. */
  onPress?: (state: DragDeadzoneState) => void;
  /** The dead zone was cleared. Fires at most once per gesture. */
  onDragStart?: (state: DragDeadzoneState) => void;
  onDrag?: (state: DragDeadzoneState) => void;
  /** The single exit. Always runs, whichever of the four paths ended it. */
  onDragEnd?: (state: DragDeadzoneState, end: DragEnd) => void;
}

export interface DragDeadzoneHandle {
  /** True between commitment and the end of the gesture. */
  dragging: RefObject<boolean>;
  /** True between `pointerdown` and the end, committed or not. */
  pressed: RefObject<boolean>;
  /** Live distance from the press point. Zero while idle. */
  distance: RefObject<number>;
  /** End the gesture now and release the capture. Safe to call when idle. */
  cancel: () => void;
}

// #region critical
/**
 * Dead-zone radius for a mouse, in pixels. Below ~6 a normal click's own
 * tremor clears it and every click becomes a two-pixel drag; above ~14 the
 * start of a deliberate drag feels glued down.
 */
const THRESHOLD = 8;
/** Dead-zone radius for touch. A finger rolls further than a mouse slips. */
const TOUCH_THRESHOLD = 16;

/**
 * Pointer drag that captures immediately and commits on distance.
 *
 * Deliberately does not swallow the trailing `click` — that is a separate
 * concern with its own edge cases (see `capture-phase-click-swallow`). What
 * this reports is the fact the swallow needs: whether the gesture moved.
 */
export function useDragDeadzone(
  ref: RefObject<HTMLElement | null>,
  options: UseDragDeadzoneOptions = {},
): DragDeadzoneHandle {
  const {
    threshold = THRESHOLD,
    touchThreshold = TOUCH_THRESHOLD,
    axis = 'both',
    primaryOnly = true,
    manageStyles = true,
    enabled = true,
  } = options;

  const dragging = useRef(false);
  const pressed = useRef(false);
  const distance = useRef(0);
  const abort = useRef<() => void>(() => {});

  const config = useRef({ threshold, touchThreshold, axis, primaryOnly, options });
  config.current = { threshold, touchThreshold, axis, primaryOnly, options };

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    /** Non-null exactly while a gesture is live. The guard on every handler. */
    let pointerId: number | null = null;
    let pointerType = '';
    let startX = 0;
    let startY = 0;
    /** Origin for `deltaX/deltaY`. Re-based at commitment. */
    let lastX = 0;
    let lastY = 0;
    /** Previous sample, for the path-length integral. */
    let prevX = 0;
    let prevY = 0;
    let travel = 0;
    let committed = false;

    const previousTouchAction = el.style.touchAction;
    const previousUserSelect = el.style.userSelect;
    if (manageStyles) {
      // Without this, the first touch on a drag surface is arbitrated by the
      // browser: it starts a pan, fires `pointercancel`, and the drag never
      // happens. `pan-y` on a horizontal dragger keeps vertical page
      // scrolling working, which `none` would break.
      el.style.touchAction = axis === 'x' ? 'pan-y' : axis === 'y' ? 'pan-x' : 'none';
      el.style.userSelect = 'none';
    }

    const stateAt = (clientX: number, clientY: number): DragDeadzoneState => {
      const dx = clientX - startX;
      const dy = clientY - startY;
      return {
        dx,
        dy,
        deltaX: clientX - lastX,
        deltaY: clientY - lastY,
        clientX,
        clientY,
        distance: Math.hypot(dx, dy),
        travel,
        pointerId: pointerId ?? -1,
        pointerType,
      };
    };

    /**
     * The single exit. `pointerup`, `pointercancel`, `lostpointercapture` and
     * `cancel()` all arrive here, and the `pointerId` guard makes the second
     * arrival for one gesture a no-op — `lostpointercapture` always follows a
     * release, so without the guard every drag would end twice.
     */
    const finish = (clientX: number, clientY: number, cancelled: boolean) => {
      if (pointerId === null) return;
      const state = stateAt(clientX, clientY);
      const moved = committed;

      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
      pointerId = null;
      committed = false;
      travel = 0;
      dragging.current = false;
      pressed.current = false;
      distance.current = 0;

      config.current.options.onDragEnd?.(state, { moved, cancelled });
    };

    const onPointerDown = (e: PointerEvent) => {
      const cfg = config.current;
      // A second finger is not a new gesture. Overwriting `pointerId` here
      // orphans the first pointer's capture, which is then never released.
      if (pointerId !== null) return;
      if (cfg.primaryOnly && !e.isPrimary) return;
      // Right and middle button, and the second click of a double-click drag.
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      pointerId = e.pointerId;
      pointerType = e.pointerType;
      startX = lastX = prevX = e.clientX;
      startY = lastY = prevY = e.clientY;
      travel = 0;
      committed = false;
      pressed.current = true;
      distance.current = 0;

      // Inside its own `pointerdown` the pointer is guaranteed active, so this
      // cannot throw. Deferring it to the commit is where it can: by then the
      // pointer may have ended, and `setPointerCapture` throws NotFoundError.
      el.setPointerCapture(e.pointerId);
      cfg.options.onPress?.(stateAt(e.clientX, e.clientY));
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      const cfg = config.current;

      travel += Math.hypot(e.clientX - prevX, e.clientY - prevY);
      prevX = e.clientX;
      prevY = e.clientY;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      distance.current = Math.hypot(dx, dy);

      if (!committed) {
        const limit = pointerType === 'touch' ? cfg.touchThreshold : cfg.threshold;

        if (cfg.axis === 'both') {
          if (distance.current < limit) return;
        } else {
          const main = cfg.axis === 'x' ? dx : dy;
          const cross = cfg.axis === 'x' ? dy : dx;
          // Whichever axis clears the dead zone first owns the gesture. A
          // horizontal dragger that skips this eats every vertical flick that
          // happens to start on it, and the page will not scroll.
          if (Math.abs(cross) >= limit && Math.abs(cross) > Math.abs(main)) {
            finish(e.clientX, e.clientY, true);
            return;
          }
          if (Math.abs(main) < limit) return;
        }

        committed = true;
        dragging.current = true;
        // Re-base the delta origin at the commit point. Without this the first
        // `onDrag` carries the whole dead zone as its delta, and a consumer
        // integrating deltas sees the track snap 8 px the instant it commits.
        lastX = e.clientX;
        lastY = e.clientY;
        cfg.options.onDragStart?.(stateAt(e.clientX, e.clientY));
        return;
      }

      cfg.options.onDrag?.(stateAt(e.clientX, e.clientY));
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      finish(e.clientX, e.clientY, false);
    };

    /** Browser took the gesture: its own pan, a long-press menu, a stylus lift. */
    const onPointerCancel = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      finish(e.clientX, e.clientY, true);
    };

    /**
     * Capture ended without a release — an OS window switch, a disconnected
     * device, another element calling `setPointerCapture`. Omitting this is
     * how a carousel ends up stuck to a pointer that left the building:
     * `dragging` stays true and no further event will ever clear it.
     */
    const onLostCapture = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      finish(e.clientX, e.clientY, true);
    };

    /** HTML's own drag-and-drop. Left alone it hijacks any press on an image. */
    const onNativeDragStart = (e: Event) => e.preventDefault();

    abort.current = () => finish(lastX, lastY, true);

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerCancel);
    el.addEventListener('lostpointercapture', onLostCapture);
    el.addEventListener('dragstart', onNativeDragStart);

    return () => {
      // Release first, while `pointerId` still says which pointer. An element
      // that unmounts holding a capture leaves the browser routing pointer
      // events at a detached node, and the pointer stays captured until the
      // next `pointerdown` anywhere in the document.
      if (pointerId !== null && el.hasPointerCapture(pointerId)) {
        el.releasePointerCapture(pointerId);
      }
      pointerId = null;
      committed = false;
      dragging.current = false;
      pressed.current = false;
      distance.current = 0;
      abort.current = () => {};

      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerCancel);
      el.removeEventListener('lostpointercapture', onLostCapture);
      el.removeEventListener('dragstart', onNativeDragStart);

      if (manageStyles) {
        el.style.touchAction = previousTouchAction;
        el.style.userSelect = previousUserSelect;
      }
    };
  }, [ref, enabled, manageStyles, axis]);
  // #endregion critical

  const cancel = useCallback(() => abort.current(), []);

  return { dragging, pressed, distance, cancel };
}
