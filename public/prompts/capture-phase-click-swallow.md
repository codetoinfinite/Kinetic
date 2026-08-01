# Build: Capture-Phase Click Swallow

Throw a drag carousel and let go over a card, and the browser dispatches a `click` on it — `mousedown` and `mouseup` landed in the same subtree, so that is exactly what the spec asks for. The result is that flinging the track navigates somewhere. One listener on the drag surface in the capture phase, which runs before any descendant handler, calls `stopPropagation` and `preventDefault` and the click is gone. The work is in the two edges: it has to swallow exactly one, and it has to let keyboard activation through, because Enter and Space fire a click with no pointer sequence behind it.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Cancels the single click a finished drag would fire, in the capture phase, without eating the next real click or keyboard activation.

- Category: primitive
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. The listener is registered with `addEventListener('click', handler, true)` on the drag surface. The third argument is the technique: capture runs root-down, so this handler sees the click before the card's own `onClick` and before a router's link interception. In the bubble phase the navigation has already happened.
2. It calls both `stopPropagation()` and `preventDefault()`. They do different jobs and neither covers the other: propagation stops listeners deeper in the path, while the default action — following an `<a href>`, submitting a form, toggling a `<label>` — is not a listener and is only cancelled by `preventDefault`. A swallow with only `stopPropagation` still navigates.
3. `arm()` is called by the gesture when it ends *having moved*, which `drag-deadzone-capture` reports as `onDragEnd(state, { moved })`. Arming on a stationary press is how the click a user actually meant gets eaten.
4. The arm is consumed inside the handler before the event is cancelled, so exactly one click is swallowed. A flag that stays set is the bug this replaces: the drag is suppressed, and so is the deliberate click that follows it.
5. Two independent stand-downs cover the drag that produces no click at all — one that ends over empty space, or that the browser cancelled. A `pointerdown` on the surface disarms, because a fresh press means the awaited click never came; and a 250 ms timer disarms as a backstop, since the click that follows a `pointerup` is dispatched in the same turn and anything later is not it.
6. `event.detail` is the keyboard test. For a pointer click it is the click count, 1 or more; for Enter, Space, and `element.click()` it is 0. Those return early and pass through untouched, so the widget stays operable from the keyboard.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `TIMEOUT_MS = 250`
  How long an arm survives with no click. The click after a `pointerup` arrives in the same turn, so one frame would do for a mouse; the margin is for the delayed synthetic click some touch browsers still emit. The ceiling is the time a person needs to press and release again — go much past ~400 ms and the arm can outlive its own gesture and reach into the next one, which is exactly the bug the expiry exists to prevent.
- `event.detail threshold = 0`
  Not a tuned number but a specified one: `UIEvent.detail` is the click count for a pointer-driven click and exactly 0 for a keyboard-driven or scripted one. Testing `detail === 0` is the only cross-browser tell available on the click event itself — `pointerId === -1` is only present where `click` is a `PointerEvent`, and the `screenX === 0 && screenY === 0` heuristic misfires on a genuine click in the top-left corner of the screen.

## API

```ts
function useClickSwallow(ref: RefObject<HTMLElement | null>, options?: { timeoutMs?: number; enabled?: boolean; onSwallow?: (event: MouseEvent) => void }): { arm: () => void; disarm: () => void; armed: RefObject<boolean>; swallowed: RefObject<number> }
```

- `timeoutMs: number` — default `250`
  How long an arm survives with no click arriving. Backstop for a drag that ends over nothing clickable.
- `enabled: boolean` — default `true`
  Detach the listeners and stand down when false.
- `onSwallow: (event: MouseEvent) => void`
  The click that was cancelled. Already stopped and prevented by the time this runs.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The effect removes the capture-phase `click` listener with the same capture flag it was added with — passing `true` on the way out is required, since a listener added with capture is a different registration from one added without — removes the `pointerdown` listener, and calls `disarm()`, which clears the pending timeout and resets the flag so a remount does not start armed. No rAF, no pointer capture, nothing else held.

**Reduced motion.** Nothing changes, and the omission is deliberate rather than an oversight: this hook cancels an event, it does not animate anything, and there is no duration, distance, or easing in it to reduce. Behaviour identical under `prefers-reduced-motion: reduce`. Note that the keyboard path is unconditional for the same reason it matters here — the pass-through for `detail === 0` is an accessibility guarantee, not a motion setting, and it is not something a preference should be able to switch off.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Registering in the bubble phase. The card's own `onClick` runs first and the link has already navigated by the time the handler sees the event — the listener is correct and completely useless. The third argument to `addEventListener` is the whole fix.
- Calling `stopPropagation()` without `preventDefault()`. Every JavaScript handler is silenced and the `<a href>` still navigates, because following a link is a default action rather than a listener. The failure is confusing precisely because the swallow visibly "works" on buttons and does nothing on links.
- Leaving the flag set after the swallow. It eats the click after the drag as well, so the user drags, then clicks a card deliberately, and nothing happens. Consuming it inside the handler is one line and is the difference between a fix and a new bug.
- Setting the flag with no expiry at all. A drag that ends over empty space never produces a click, so the arm just sits there — and swallows a genuine click a minute later, at which point nobody will connect the two events.
- Swallowing keyboard activation. Enter and Space on a focused card dispatch a click with `detail === 0`, and if the flag happens to be armed the widget silently stops responding to the keyboard. It never shows up in testing because a carousel is tested by dragging it.
- Arming on every gesture instead of only on ones that moved. Without a dead zone upstream reporting `moved`, a two-pixel wobble during a click arms the swallow and the click is cancelled — the exact behaviour that makes drag carousels feel unreliable.
- Assuming the click lands on the element the pointer is over. Click targets the nearest common ancestor of the `mousedown` and `mouseup` targets, and while a pointer is captured the compatibility mouse events are retargeted to the capturing element. Scoping the listener to the drag surface is what makes it see the click at all.
- Reaching for `stopImmediatePropagation()` by default. It also silences capture-phase listeners registered earlier on the same node, which can include analytics or a focus manager that had nothing to do with the drag. Escalate to it only when a library has attached its own capture listener to the same element.
- Leaving the timer running at unmount. It fires against a ref nothing reads, and on remount the widget can start life armed and swallow the first click a user makes.

## Notes

- Designed to pair with `drag-deadzone-capture`: that hook decides whether the gesture moved, this one suppresses the consequence. They are separate because the classification is useful on its own, and because the swallow has edge cases — one click and no more, keyboard passes through — that have nothing to do with dragging.
- A component that activates on `pointerup` rather than on `click` cannot be helped by this; there is no click to cancel. That is a good argument for activating on `click` in a draggable surface, since `click` is also what the keyboard produces.
- `preventDefault` on the click does not undo focus. Focus was moved by `mousedown`, earlier in the sequence, so a swallowed drag can leave the card under the pointer focused. It is invisible in practice because focus from a pointer does not match `:focus-visible`.
- A `dblclick` is dispatched independently of the clicks that preceded it, so a component listening for double-click needs the same treatment applied to `dblclick`.

## Definition of done

Click a card: it opens, and the on-screen counter shows one activation and no swallow. Drag the row and release over a card: the row moves, the card does not open, and the swallow counter goes up by exactly one. Immediately click that same card: it opens — the swallow was consumed by the drag and did not carry over. Drag and release over the gap between cards, then click a card: it opens, because the arm expired instead of waiting for a click that never came. Tab to a card and press Enter, then Space: it opens both times, including immediately after a drag, and the swallow counter does not move. Put a real `<a href>` in the row and drag onto it: the page does not navigate.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
