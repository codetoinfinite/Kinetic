# Build: Preloader That Cannot Hang

Every hand-rolled preloader eventually ships the same bug: a signal that never arrives — a 404 on a font, a decode that fails on iOS, an image behind a dead CDN — and the site is a permanent opaque rectangle nobody can see through or tab past. This inverts the contract. A hard ceiling guarantees the page is visible by a fixed time and the load signal only ever makes it sooner; a floor stops a warm cache turning the overlay into a two-frame flash; a session flag keeps it an introduction rather than a toll booth.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An intro overlay with a hard ceiling, a minimum visible time and a once-per-session flag, so a stalled load cannot trap the page.

- Category: transition
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. A three-state phase machine — `holding`, `leaving`, `gone` — drives the render. It starts at `holding` on both server and client so the markup matches, and the session check runs in a `useLayoutEffect`, before paint, so a returning visitor never sees a single frame of the overlay.
2. THE CEILING: `setTimeout(reveal, ceilingMs)` is armed in an effect on mount, before anything subscribes to a load signal, and nothing clears it except a successful reveal or unmount. This is not a fallback — it is the actual guarantee, and the load signal is the optimisation.
3. THE FLOOR: when the signal does arrive, the remaining hold is `Math.max(0, floorMs - (performance.now() - started))` and the reveal is deferred by that much. Measured from mount, not from the signal, so the floor overlaps the load instead of being added to it.
4. The signal is `ready` when the prop is passed, otherwise the browser's own: `document.readyState === "complete"` is checked first and only then is a one-shot `load` listener attached, because if the document has already finished the event has been and gone and a listener alone would wait forever.
5. ONCE: on reveal, `sessionStorage[sessionKey] = "1"`, wrapped in try/catch because `setItem` throws in Safari private browsing and a preloader is not worth taking the page down for. Both the read and the write are guarded.
6. `reveal()` guards on a ref, not on state, so the ceiling and the floor firing in the same tick still reveal exactly once. It sets `leaving` — a CSS opacity transition on `[data-leaving="true"]` — and schedules the actual removal `fadeMs` later, so the node is never pulled out of the tree mid-transition. `onDone` fires from that same timer, after the overlay is gone.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `ceilingMs = 4000`
  The reveal deadline. Long enough that a genuinely slow first paint on a cold 3G connection is not cut off mid-load, short enough that a user staring at a broken overlay gives up after it rather than before. Past ~6s people reload, which restarts the same stall.
- `floorMs = 700`
  Minimum visible time. On a warm cache the signal resolves in about 40ms; without a floor the overlay appears and vanishes inside two frames, which reads as a rendering fault rather than an introduction. Below ~400ms the fade has no room to be perceived as deliberate.
- `fadeMs = 420`
  Fade-out duration, passed to CSS as `--k-safe-fade` and used as the removal delay so the two can never disagree. Long enough that the page underneath is already composited and visible through the fade; past ~700ms the user is looking at content they cannot yet click.
- `fade easing = cubic-bezier(0.22, 1, 0.36, 1)`
  Heavily front-loaded, so most of the opacity is gone in the first third and the perceived wait is shorter than the measured one. A linear fade of the same length feels about twice as long.
- `scan bar = 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite`
  A determinate progress bar would be a lie — nothing here knows a byte count. This is an indeterminate scan whose cycle is slow enough not to read as urgency and fast enough to prove the page is not frozen. The in-out curve keeps the ends from clipping at the container edges.
- `sessionKey = 'k-preloader'`
  Session, not local, storage. Local storage would mean the introduction plays once ever, so a returning visitor months later gets no reveal and QA can never see it again without clearing site data.

## API

```ts
function SafePreloader(props: { children?: ReactNode; ready?: boolean; ceilingMs?: number; floorMs?: number; fadeMs?: number; sessionKey?: string; once?: boolean; onDone?: () => void; position?: 'fixed' | 'absolute'; className?: string }): JSX.Element | null
```

- `children: ReactNode`
  Overlay content. Defaults to a label and an indeterminate scan bar.
- `ready: boolean`
  The load signal. Leave undefined to use the browser's own `load` event and `readyState`.
- `ceilingMs: number` — default `4000`
  Hard ceiling. The reveal happens by this time whether or not the signal ever arrives.
- `floorMs: number` — default `700`
  Minimum time the overlay stays up, measured from mount.
- `fadeMs: number` — default `420`
  Fade-out duration in ms. Also the delay before the node is removed.
- `sessionKey: string` — default `'k-preloader'`
  sessionStorage key used by the once-per-session gate.
- `once: boolean` — default `true`
  Set false to replay on every load, for development.
- `onDone: () => void`
  Fires after the overlay has finished leaving and unmounted.
- `position: 'fixed' | 'absolute'` — default `'fixed'`
  Absolute lets the overlay be scoped to a container instead of the viewport.
- `className: string`
  Merged onto the overlay via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const reveal = useCallback(() => {
  if (revealed.current) return;
  revealed.current = true;
  clearTimers();
  if (once) markShown(sessionKey);
  setPhase('leaving');
  // The node is removed only after the fade has actually run, so nothing is
  // pulled out of the tree mid-transition.
  timers.current.push(
    setTimeout(
      () => {
        setPhase('gone');
        done.current?.();
      },
      reduced ? 0 : fadeMs,
    ),
  );
}, [clearTimers, fadeMs, once, reduced, sessionKey]);

useLayoutEffect(() => {
  if (once && wasShown(sessionKey)) {
    revealed.current = true;
    setPhase('gone');
    return;
  }
  started.current = performance.now();
}, [once, sessionKey]);

// THE CEILING. Armed on mount, before any load signal is subscribed to, and
// never cancelled by anything except a successful reveal. If the signal
// never comes, this is what saves the page.
useEffect(() => {
  if (revealed.current) return;
  const id = setTimeout(reveal, ceilingMs);
  timers.current.push(id);
  return () => clearTimeout(id);
}, [ceilingMs, reveal]);

// THE FLOOR. When the signal arrives, wait out whatever is left of the
// minimum so a warm cache does not produce a two-frame black flash.
useEffect(() => {
  if (revealed.current) return;

  const settle = () => {
    const elapsed = performance.now() - started.current;
    const remaining = Math.max(0, (reduced ? 0 : floorMs) - elapsed);
    const id = setTimeout(reveal, remaining);
    timers.current.push(id);
  };

  if (ready !== undefined) {
    if (ready) settle();
    return;
  }

  // No `ready` prop: use the browser's own signal. If the document has
  // already finished loading, the event has been and gone — check first.
  if (document.readyState === 'complete') {
    settle();
    return;
  }
  window.addEventListener('load', settle, { once: true });
  return () => window.removeEventListener('load', settle);
}, [floorMs, ready, reduced, reveal]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Every timeout is pushed into a ref array and cleared on unmount, the ceiling effect clears its own id, and the one-shot `load` listener is removed by its effect. Because the removal timer is cleared, `setPhase` cannot run on a dead component and `onDone` cannot fire for a page that has already gone. No rAF, no observers, no global state beyond the session flag.

**Reduced motion.** The overlay still appears and the ceiling still applies — withholding content is a behaviour, not an animation, so it is not skipped. What goes away is the motion: the floor collapses to 0 so nothing is held longer than it must be, the removal delay drops to 0 and the CSS transition to 1ms, and the scanning bar becomes a static full-width rule via `animation: none; transform: scaleX(1)` rather than a pulsing one. The result is a brief still plate, not a zero-duration version of the animated one.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Having no ceiling at all. One 404 on a font or a decode that fails only on iOS, and the overlay stays up forever: the content is not visible, not scrollable, and not reachable by keyboard, and it happens to a fraction of users you will never hear from.
- Clearing the ceiling when the load signal is subscribed to, or when it fires. Whatever the signal hands off to — a floor timer, a promise chain, a decode — can itself stall, and the one thing that guaranteed a reveal has already been thrown away.
- Attaching a `load` listener without checking `document.readyState` first. On a warm cache or after a client-side navigation the event has already fired, so the listener never runs; the ceiling silently does all the work and you only discover it the day someone shortens the ceiling.
- Shipping without a floor. The overlay appears and vanishes inside two frames on a fast connection, producing a black flash on every load that reads as a broken paint and is nearly impossible to reproduce on a throttled dev machine.
- Starting the floor clock when the signal arrives instead of at mount. The floor is then added to the load time rather than overlapping it, so a 2s load becomes a 2.7s hold for no benefit.
- Using state for the reveal-once guard. The ceiling and the floor can both fire before React re-renders, so `reveal` runs twice and the second call re-arms the fade on a node that is already leaving. A ref flips synchronously and cannot be raced.
- Unmounting the overlay in the same commit that starts the fade. The node leaves the tree before the transition can run a single frame, so the overlay simply disappears and the fade you wrote never happens.
- Reading `sessionStorage` in `useEffect` instead of `useLayoutEffect`. The overlay gets one painted frame before the effect runs, so a returning visitor sees a flash of it on every single navigation.
- Initialising state from `sessionStorage` during render. The server has no session storage, so it renders `holding` while the client renders `gone`, and React logs a hydration mismatch and re-renders the tree.
- Calling `sessionStorage.setItem` unguarded. It throws in Safari private browsing, and an unhandled throw inside the reveal path leaves the overlay up permanently — the exact failure the component exists to prevent.
- Replaying it on every visit. A preloader is an introduction; on the fourth arrival in the same session it is a toll booth, and the fix is one flag rather than a shorter animation.
- Leaving timers pending on unmount. The removal timer fires after the route has changed, so `setPhase` runs on a dead component and `onDone` fires for a page that is no longer mounted.

## Notes

- `position` defaults to `fixed` for real page use and can be switched to `absolute` so the overlay can be demonstrated, or used, inside a bounded container.
- The overlay is `role="status"` with `aria-live="polite"`, so a screen reader announces the loading state once rather than reading a decorative bar, and the announcement is not interrupted by the reveal.
- `once={false}` exists for development and for the demo. In production the default keeps the overlay to one appearance per tab session.

## Definition of done

Simulate a signal that never arrives and the page is nonetheless visible and interactive at the ceiling. Reload with a warm cache and the overlay is visible for at least the floor — never a single-frame flash. Reload again in the same tab and no overlay is painted at all, not even one frame. Watch the reveal and the overlay fades rather than vanishing, with the content already composited underneath. Navigate away mid-hold and no state update warning appears and `onDone` never fires. With reduced motion on, the plate appears static and leaves immediately.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
