# Build: Drag-Throw Scroll

A third input modality bolted onto a scroll position that already has two. Wheel, pointer drag and arrow keys all write to one place, so they cannot disagree — press stops whatever was coasting exactly where it looks, the drag maps 1:1 from the press point, and release converts the last 100 ms of hand movement into a decaying throw. Pointed at the document it drives the shared Lenis instance; pointed at a box it drives `scrollTop` through the same physics.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Grab the page and pull it; let go mid-move and it coasts on, decaying, as far as the flick earned.

- Category: scroll
- Runtime cost: dom
- Dependencies: lenis@^1.3.11

## How it works

1. On `pointerdown` the surface calls `setPointerCapture` and records `startY` plus `startScroll = lenis.scroll` — the animated position, not `targetScroll`, so grabbing a coasting page stops the content where the eye sees it rather than where the throw was headed.
2. Every `pointermove` recomputes the scroll target absolutely: `clamp(startScroll - (clientY - startY) * gain, 0, limit)`. Gain is `multiplier` for mouse and pen and hard-wired to 1 for touch, because a finger is physically on the content and any other value slides the content out from under it.
3. Positions are pushed into a 5-entry ring of `{ y, timeStamp }`. On release, velocity is `(newest.y - oldest.y) / (newest.t - oldest.t) * 1000` px/s using only samples inside a 100 ms window, so the number describes the hand rather than the event rate.
4. The throw target is `target + (-velocity * gain) * throwSeconds`, clamped to the scroll limit. Below `MIN_THROW_SPEED` nothing is issued at all, so a careful release parks instead of drifting.
5. The decay is one curve expressed twice: `lenis.scrollTo(y, { lerp: 0.05 })` for the page, and `damp(scrollTop, y, perFrameToSmoothing(0.05), dt)` on the shared rAF for a box scroller, which stops writing once it is within 0.5 px of target.
6. `ArrowUp` / `ArrowDown` on the focused surface step by `keyStep` px through `scrollTo(y, { duration: 0.2 })`, so keyboard, wheel and hand all mutate the same single position.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `multiplier = 2`
  Scroll px per mouse px. At 1 a long page needs a grab per viewport, because the cursor runs out of window; above ~3 the content outruns the hand and the gesture stops reading as direct manipulation. Touch ignores this entirely and uses 1.
- `throwSeconds = 0.65`
  Coast distance is velocity × this, so it is the time constant of the flick. Under ~0.3 a hard flick barely outruns the release and the throw is invisible; over ~1 a flick crosses the whole document and lands somewhere the user did not aim.
- `THROW_LERP = 0.05`
  Per-frame fraction of the remaining gap, i.e. a long slow settle — the point of a throw is that it decays visibly. At 0.2 it arrives in a few frames and reads as a jump; `perFrameToSmoothing` converts the same number for the `damp` path so the two sinks decay identically.
- `SAMPLE_WINDOW_MS = 100`
  Only samples newer than this count toward the release velocity. Without the window, a drag that travels fast and then stops dead for a second still throws, because the fast samples are still in the buffer — the page launches from a hand that was holding still.
- `SAMPLE_COUNT = 5`
  Ring length. One sample is pure jitter, and more than about five spans long enough that the window filter is doing all the work anyway; five covers roughly 80 ms at 60 Hz, which is one flick.
- `MIN_THROW_SPEED = 120 px/s`
  Below this no throw is issued. At 0.65 s of coast, 120 px/s is a 78 px slide — around the point where a deliberate stop stops feeling deliberate. Lower and the content creeps after every release.
- `SETTLE_EPSILON = 0.5 px`
  An exponential never actually arrives. Without a floor the box sink writes a sub-pixel `scrollTop` every frame forever, so the rAF subscription never idles and the scroll event never stops firing.
- `KEY_STEP_SECONDS = 0.2`
  Arrow-key travel time. Instant is disorienting because nothing connects the two positions; beyond ~0.35 s holding the key queues steps faster than they complete and the page falls behind the keyboard.

## API

```ts
function DragThrowScroll(props: { children?: ReactNode; scroller?: RefObject<HTMLElement | null>; multiplier?: number; throwSeconds?: number; keyStep?: number; enabled?: boolean; className?: string }): JSX.Element
```

- `children: ReactNode`
  The draggable content. The surface is `position: relative` and nothing else.
- `scroller: RefObject<HTMLElement | null>`
  Box to scroll. Omit to drive the document through the shared Lenis instance.
- `multiplier: number` — default `2`
  Scroll px per pointer px for mouse and pen. Touch is always 1.
- `throwSeconds: number` — default `0.65`
  Time constant of the release throw; distance is velocity × this.
- `keyStep: number` — default `100`
  Arrow-key step in px while the surface has focus.
- `enabled: boolean` — default `true`
  False removes every listener and restores native scrolling.
- `className: string`
  Merged onto the drag surface.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** All seven listeners are removed, any pointer still captured is released, the coast target is cleared so the shared rAF idles, and `data-dragging` is reset. The Lenis instance is refcounted by `useLenis`: the last consumer to unmount destroys it, earlier ones only detach.

**Reduced motion.** Dragging still works and is still 1:1 — pulling content with a finger is direct manipulation, not motion someone asked to be spared. What is removed is everything that keeps moving on its own: no Lenis instance is built, so the page scrolls natively, release stops exactly where the hand stopped, and arrow keys jump rather than travel.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Constructing a second Lenis instance instead of sharing one. Both bind `wheel`, both call `preventDefault`, and the page scrolls at exactly double speed — which looks like a badly tuned multiplier and gets "fixed" by halving the multiplier instead.
- Measuring velocity as the mean of per-event deltas. That is px per event, not px per second: the identical physical flick throws half as far on a 120 Hz display, because each event covers half the distance. Divide by real elapsed time.
- Not expiring old samples. Drag fast, hold still for a second, release — the buffer still holds the fast samples and the page launches from a stationary hand.
- Accumulating `scrollTo(current + delta)` per move. `current` is the animated position, which lags the target, so every event throws away the part the sink has not applied yet and the content drifts behind the hand over a long drag. Track the press point and compute the target absolutely.
- Omitting `setPointerCapture`. Drag past the edge of the surface and `pointermove` stops arriving, so the content freezes mid-gesture and then teleports when the pointer comes back.
- Treating `pointerup` as the only terminator. Capture can be revoked with no `pointerup` — the OS claims the gesture, the element is detached, another finger lands — and the surface is left believing a finger is still down, ignoring every later press. `pointercancel` and `lostpointercapture` both have to end the drag.
- Leaving `touch-action` at its default. The compositor claims the touch gesture, `pointermove` stops, and the drag dies in a `pointercancel` on the first frame while the page scrolls natively underneath.
- Forgetting that a host stylesheet with `scroll-behavior: smooth` fights a direct `scrollTop` write on the box sink, which shows up as a rubbery lag under the finger. Set `scroll-behavior: auto` on the scroll container.

## Notes

- The surface takes `tabIndex={0}` and binds `keydown` on itself rather than on `window`, so arrow keys still belong to a search field elsewhere on the page.
- Presses that land on `a, button, input, select, textarea, label` or anything marked `[data-no-drag]` are left alone, so a link inside the draggable area is still a link.
- `dragstart` is prevented on the surface: native HTML5 drag on an inner image or link would otherwise hand back a ghost image instead of a scroll.

## Definition of done

Press and pull upward: the content follows the pointer and stops the moment the pointer does. Flick and release: it coasts on and decays to a stop. Grab it mid-coast and it stops dead under your hand with no forward jump. Start a drag, run the pointer off the edge of the window and release there — the content stops instead of sticking, and the next press still works. Focus the surface and hold ArrowDown for stepped travel. With reduced motion on, release stops instantly.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
