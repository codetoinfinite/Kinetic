'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';

/* ==========================================================================
   Capture-Phase Click Swallow
   --------------------------------------------------------------------------
   A drag that ends on a link activates the link. Nothing is broken — the
   browser sees `mousedown` and `mouseup` inside the same subtree and does
   exactly what the spec says, which is to dispatch a `click`. So throwing a
   carousel navigates to whichever slide you happened to let go over, and the
   user never gets to see where they threw it to.

   The fix is one listener in the *capture* phase on the drag surface. Capture
   runs from the root down, so a listener there sees the click before any
   descendant handler — before the card's own `onClick`, before the router's
   link interception. That is the only phase where it can be stopped.

   Two calls, and neither one substitutes for the other:

   - `stopPropagation()` keeps the event away from every listener deeper in
     the path.
   - `preventDefault()` cancels the *default action*. Following an `<a href>`
     is not a listener, so stopping propagation does not stop it; a swallow
     that omits `preventDefault` still navigates.

   Which leaves the two edge cases that turn a correct swallow into a bug:

   1. **It has to swallow exactly one.** A flag that is set but never cleared
      eats the next genuine click too. So it is consumed on the click it
      swallows, disarmed by the next `pointerdown` — a new press means the
      click it was waiting for never came — and expired by a short timer, for
      the drag that ends over nothing clickable and produces no click at all.

   2. **Keyboard activation must pass.** Enter and Space on a focused link
      dispatch a `click` with no pointer sequence behind it, so there is no
      drag for it to be the tail of. The tell is `event.detail`: the click
      count for a pointer click, and 0 for a keyboard or scripted one.
      Swallow those and the widget becomes unusable without a mouse, which is
      the version of this bug that ships, because nobody tests a carousel with
      the Tab key.
   ========================================================================== */

export interface UseClickSwallowOptions {
  /** How long an arm survives with no click, in milliseconds. */
  timeoutMs?: number;
  enabled?: boolean;
  /** The swallowed event, for instrumentation. Already cancelled by then. */
  onSwallow?: (event: MouseEvent) => void;
}

export interface ClickSwallowHandle {
  /** Arm it. Call at the end of a gesture that actually moved. */
  arm: () => void;
  /** Stand it down without consuming — a cancelled gesture produces no click. */
  disarm: () => void;
  /** True while a swallow is pending. */
  armed: RefObject<boolean>;
  /** Clicks swallowed since mount. */
  swallowed: RefObject<number>;
}

// #region critical
/**
 * Milliseconds an arm survives if no click follows. The click that follows a
 * `pointerup` is dispatched in the same turn, so anything over one frame is
 * already generous; the margin is for the delayed click some touch browsers
 * still emit. It has to stay well under the time a person needs to press and
 * release again, or the arm outlives its own gesture.
 */
const TIMEOUT_MS = 250;

/**
 * Suppress the one `click` that a finished drag is about to produce.
 *
 * Pairs with any gesture that reports whether it moved — `drag-deadzone-capture`
 * exposes exactly that as `onDragEnd(state, { moved })`. Arm on `moved`, and
 * only on `moved`: arming after a stationary press is how the click a user
 * meant gets eaten.
 */
export function useClickSwallow(
  ref: RefObject<HTMLElement | null>,
  options: UseClickSwallowOptions = {},
): ClickSwallowHandle {
  const { timeoutMs = TIMEOUT_MS, enabled = true } = options;

  const armed = useRef(false);
  const swallowed = useRef(0);
  const timer = useRef<number | null>(null);

  const config = useRef({ timeoutMs, options });
  config.current = { timeoutMs, options };

  const disarm = useCallback(() => {
    armed.current = false;
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const arm = useCallback(() => {
    disarm();
    armed.current = true;
    // An expiry, not a standing flag. A drag that ends over empty space, or
    // one the browser cancelled, produces no click at all — and an arm left
    // standing swallows the user's next real click, whenever that arrives.
    timer.current = window.setTimeout(() => {
      armed.current = false;
      timer.current = null;
    }, config.current.timeoutMs);
  }, [disarm]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const onClickCapture = (e: MouseEvent) => {
      if (!armed.current) return;

      // Enter and Space on a focused link or button dispatch a click with
      // `detail === 0` and no pointer sequence behind it, as does
      // `element.click()`. There is no drag for those to be the tail of, and
      // swallowing them is what makes a drag carousel keyboard-inoperable.
      if (e.detail === 0) return;

      // Consumed here, so exactly one click is swallowed per arm.
      disarm();
      swallowed.current += 1;

      // Both, always. stopPropagation keeps it from the card's own handler and
      // from the router's link interception; preventDefault cancels the
      // default action, which is the part that actually follows an href.
      e.stopPropagation();
      e.preventDefault();

      config.current.options.onSwallow?.(e);
    };

    // A fresh press means the previous gesture is finished and the click it
    // was going to produce never arrived. Second safety net under the timer,
    // and the one that matters — it is deterministic rather than timed.
    const onPointerDown = () => disarm();

    // The third argument is the entire technique. In the bubble phase the
    // card's own handler has already run and the link has already navigated.
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('pointerdown', onPointerDown);

    return () => {
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('pointerdown', onPointerDown);
      // Without this the timer can fire after unmount and write to a ref that
      // nothing reads, and on a remount the widget starts life armed.
      disarm();
    };
  }, [ref, enabled, disarm]);
  // #endregion critical

  return { arm, disarm, armed, swallowed };
}
