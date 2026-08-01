# Build: Drag with a Dead Zone and Pointer Capture

A deliberate click moves the pointer one to three pixels; a tap on a phone moves five or more. A drag handler with no dead zone calls all of them drags, so the track lurches on every click and the code that suppresses the post-drag click starts suppressing clicks the user meant. This hook captures the pointer on `pointerdown` — so a fast throw that leaves the element keeps delivering moves — and only commits to a drag once the pointer is further than the threshold from the press point. Every one of the four ways a gesture can end funnels through a single exit, because the path you forget is the one that leaves the track welded to a pointer that is no longer there.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Captures the pointer on press but only commits to a drag past a distance threshold, so a shaky click stays a click.

- Category: primitive
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. `pointerdown` records the press point and calls `setPointerCapture(e.pointerId)` immediately, before any distance test. Capture first, commit second: at the moment the threshold is crossed the pointer may already be outside the element, and `setPointerCapture` on a pointer that has since ended throws `NotFoundError`. Inside its own `pointerdown` the pointer is guaranteed active, so it cannot throw there.
2. `pointermove` computes `distance = Math.hypot(clientX - startX, clientY - startY)` and returns early while it is under the threshold — 8 px for mouse and pen, 16 px for touch, read from `pointerType` on the live pointer rather than from a media query. Until it commits, no callback fires and nothing moves.
3. At the moment of commitment the delta origin is re-based to the current point (`lastX = clientX`). A consumer that integrates `deltaX` therefore starts from zero at the commit point instead of receiving the entire dead zone as the first frame's delta, which would snap the track 8 px the instant it engaged. `dx` still measures from the true press point, so the distance maths stays honest.
4. With `axis` set to `x` or `y` the threshold test becomes directional: if the cross axis clears the dead zone first *and* dominates the main axis, the gesture is abandoned as cancelled so the browser can scroll. Combined with `touch-action: pan-y`, a horizontal dragger and vertical page scrolling coexist on a phone.
5. One `finish(clientX, clientY, cancelled)` handles `pointerup`, `pointercancel`, `lostpointercapture` and the returned `cancel()`. It releases the capture if still held, nulls `pointerId`, and calls `onDragEnd(state, { moved, cancelled })`. The `pointerId === null` guard at the top makes the second arrival for one gesture a no-op — `lostpointercapture` always follows a release, so without it every drag would end twice.
6. The effect sets `touch-action` (from `axis`) and `user-select: none` on the element and restores the previous inline values on cleanup, and it cancels HTML5 `dragstart` so a press on an image does not turn into a native file drag.
7. `moved` is the whole output that matters downstream: false means the gesture was a tap and the consumer should treat it as a click; true means a click that arrives next should be swallowed.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `THRESHOLD = 8`
  Dead-zone radius in pixels for mouse and pen. A deliberate trackpad click slips one to three pixels, and a click while the hand is moving toward the target slips more, so below about 6 the dead zone stops catching real clicks. Above about 14 the beginning of a genuine drag feels glued down — the pointer has visibly moved and the track has not.
- `TOUCH_THRESHOLD = 16`
  Dead-zone radius for touch. A finger pad rolls as it presses and the reported point moves with it, typically 5-10 px on a tap; 8 px would classify a large share of taps as drags. Chrome's own touch-slop for scroll arbitration is in the same range, so this roughly matches what the platform already considers a tap.
- `touch-action (axis 'x') = 'pan-y'`
  Not `none`. `none` gives the element every gesture, including the vertical swipe that was meant to scroll the page, and a horizontal carousel that eats vertical swipes makes a phone page feel broken. `pan-y` hands vertical panning back to the browser, which then fires `pointercancel` when it claims the gesture — which is exactly why `pointercancel` has to be handled.

## API

```ts
function useDragDeadzone(ref: RefObject<HTMLElement | null>, options?: { threshold?: number; touchThreshold?: number; axis?: 'both' | 'x' | 'y'; primaryOnly?: boolean; manageStyles?: boolean; enabled?: boolean; onPress?: (state: DragDeadzoneState) => void; onDragStart?: (state: DragDeadzoneState) => void; onDrag?: (state: DragDeadzoneState) => void; onDragEnd?: (state: DragDeadzoneState, end: { moved: boolean; cancelled: boolean }) => void }): { dragging: RefObject<boolean>; pressed: RefObject<boolean>; distance: RefObject<number>; cancel: () => void }
```

- `threshold: number` — default `8`
  Dead-zone radius in pixels for mouse and pen input.
- `touchThreshold: number` — default `16`
  Dead-zone radius for touch, which needs roughly double.
- `axis: 'both' | 'x' | 'y'` — default `'both'`
  A single axis adds a directional lock and narrows `touch-action` to the other one.
- `primaryOnly: boolean` — default `true`
  Ignore secondary touches and any mouse button but the left one.
- `manageStyles: boolean` — default `true`
  Set `touch-action` and `user-select` on the element, restoring inline values on cleanup.
- `enabled: boolean` — default `true`
  Detach every listener when false. Any live capture is released as it detaches.
- `onPress: (state: DragDeadzoneState) => void`
  An accepted `pointerdown`, before any commitment. Kill in-flight settle tweens here.
- `onDragStart: (state: DragDeadzoneState) => void`
  The dead zone was cleared. At most once per gesture.
- `onDrag: (state: DragDeadzoneState) => void`
  Every move after commitment. `deltaX/deltaY` are re-based to the commit point.
- `onDragEnd: (state: DragDeadzoneState, end: DragEnd) => void`
  The single exit. `moved: false` means treat the gesture as a click.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The cleanup releases the pointer capture first, while `pointerId` still records which pointer holds it, then nulls the gesture state, removes all six listeners (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `lostpointercapture`, `dragstart`), neuters the `cancel()` closure, and restores the element's previous inline `touch-action` and `user-select`. There is no timer and no rAF. Under React 19 StrictMode the first effect has fully released its capture before the second attaches.

**Reduced motion.** Nothing changes, and that is the correct behaviour rather than an omission. Every position this hook reports is one the user is currently holding under their own finger — direct manipulation, one to one, with no animation of its own to shorten or remove, which is why the reduced-motion guidance explicitly exempts it. Reduced motion belongs to whatever happens after release: the settle, the snap, the momentum. Note that the dead zone is deliberately not widened either; a tremor threshold and a motion preference are different user needs and conflating them would degrade dragging for people who never asked for it.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- No dead zone at all. Every click becomes a two-pixel drag, so the track twitches on each press, and any click suppression built on "did it drag" now eats clicks the user intended. This is the failure that makes drag carousels feel untrustworthy.
- Capturing the pointer at the moment of commitment rather than on press. Two bugs at once: the moves that happened during the dead zone are lost, and if the pointer has already ended, `setPointerCapture` throws `NotFoundError` and the drag silently never starts.
- No pointer capture. Throw the track quickly and the pointer leaves the element; `pointermove` stops arriving, the track freezes mid-throw with the button still down, and the eventual `pointerup` lands somewhere else entirely, so the gesture never ends.
- Handling only `pointerup`. `pointercancel` fires whenever the browser claims the gesture for scrolling or a long-press menu — routine on touch — and `lostpointercapture` fires when the capture is dropped without a release. Miss either and `dragging` stays true forever: the next `pointermove` from an unrelated hover keeps driving the track.
- Not guarding against the second end event. `lostpointercapture` always follows a release, so a naive implementation runs its end logic twice per drag — two snap tweens, two velocity readings, and a click-swallow flag set and then cleared.
- Ending the drag without re-basing the delta origin at commitment. The first `onDrag` then reports the full dead-zone offset, and the track jumps by the threshold the moment it engages — small, but it is exactly the wrong 8 px because it lands on the frame the user is watching for feedback.
- Overwriting `pointerId` when a second finger lands. The first pointer's capture is then never released, so the element holds a capture for a pointer that has ended and the next gesture on it behaves unpredictably.
- Forgetting `touch-action`. On touch the browser arbitrates the gesture, decides it is a pan, and fires `pointercancel` before the dead zone is even cleared. The drag works perfectly on a desktop and does nothing at all on a phone, which is a hard bug to find without a device.
- Setting `touch-action: none` on a horizontal dragger. The element swallows vertical swipes too, so the page cannot be scrolled by dragging anywhere over the carousel — on a phone that is often most of the screen.
- Unmounting while the capture is held. The browser keeps routing pointer events to a detached node, and the pointer stays captured until the next `pointerdown` anywhere in the document, so the rest of the page appears to ignore the mouse.
- Using cumulative path length instead of straight-line distance for the dead zone. A hand tremor that wobbles back and forth over the same three pixels accumulates past any threshold without the pointer ever leaving the press point, so the click is classified as a drag — the tremor case the dead zone existed to catch.
- Calling `preventDefault()` on `pointerdown` to stop text selection. It also prevents focus, so the element can no longer be reached or activated from the keyboard. Setting `user-select: none` costs nothing and breaks nothing.

## Notes

- Pairs with `capture-phase-click-swallow`: this hook decides whether the gesture moved, that one suppresses the resulting click. They are separate because the swallow has its own edge cases — one click and no more, and keyboard activation must pass through — and because plenty of consumers want the classification without wanting to intercept clicks at all.
- Both `distance` and `travel` are reported. `distance` is what the dead zone tests; `travel` is the path integral, and their ratio is a cheap measure of how straight the gesture was, which is useful if you want to distinguish a flick from a scribble.
- The returned `cancel()` exists so a host can abort a gesture on Escape, on a route change, or when a modal opens. It runs the same single exit, so the capture is released and `onDragEnd` reports `cancelled: true`.
- Momentum, snapping and rubber-banding are deliberately absent. This is the input layer; what the position does after release belongs to whatever integrates the deltas.

## Definition of done

Press and release without moving: the row does not shift by even a pixel and the readout says the gesture was a tap. Press, wobble a few pixels inside the dead-zone ring, release: still a tap, and the ring never fills. Push past the ring and the row starts following the pointer from where it committed, with no initial jump. Drag fast off the side of the panel and keep going — the row keeps tracking, because the capture holds. Release outside the panel and the gesture ends there. On a phone, swipe horizontally and the row moves; swipe vertically and the page scrolls while the readout reports a cancelled gesture. Right-click on the row: nothing starts. Drag with a second finger already down: the first gesture keeps control. Unmount mid-drag and the rest of the page still responds to the mouse.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
