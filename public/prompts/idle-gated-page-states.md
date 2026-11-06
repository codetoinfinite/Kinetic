# Build: Idle-Gated Page States

A page entrance is the one animation guaranteed to run at the worst possible moment: hydration, font swap, image decode and the first layout pass all land in the same few hundred milliseconds. Start a stagger there and it does not look slow, it looks broken — three elements arrive, the thread blocks, the rest snap in. This gates the entrance on two conditions at once, a floor delay resolved on a frame boundary and at least one report of an idle main thread, and starts only when the slower of the two finishes. Enter and leave are one paused timeline played forward and reversed.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A page entrance that will not start until a floor delay has elapsed and the main thread has reported itself idle.

- Category: transition
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. The machine is `preload -> gating -> entering -> settled`, with `leave(commit)` sending it to `leaving` and the exit's completion sending it back to `gating` for the next page. The current phase is written to `data-page-state` on the root so CSS can read it without a second source of truth.
2. `whenIdleAfter(delay, timeout, done)` is the gate. It schedules two independent waits and calls `done` only when both flags are set: a `setTimeout(delay)` whose callback schedules a `requestAnimationFrame`, and either `requestIdleCallback(cb, { timeout })` or — where that is missing — `setTimeout(cb, timeout)`. It returns a canceller that clears the timer, cancels the frame, and releases whichever of the two idle mechanisms was actually used.
3. The floor delay resolves inside the rAF rather than in the timer itself. A timer callback can fire in the middle of a long task; the frame callback after it cannot, so the first tween is handed a fresh frame budget instead of the tail end of somebody else's work.
4. `requestIdleCallback`'s `timeout` option is the safety net — the callback is guaranteed to run within that many milliseconds whether the thread ever goes idle or not — and the `setTimeout` fallback uses the same number as its delay, so both code paths have identical worst-case behaviour.
5. The first entrance uses `preloadDelay` (0.8 s) and every subsequent one uses `routeDelay` (0.15 s), switched by a `firstEnter` ref. Only the first competes with hydration; keeping 0.8 s for route changes would put nearly a second of nothing between every click and its page.
6. The choreography is ONE paused GSAP timeline: `fromTo([data-page-enter], { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.08 })`. `state === "entering"` calls `play()`; `state === "leaving"` calls `timeScale(enterDuration / leaveDuration).reverse()`. The timeline's `onComplete` and `onReverseComplete` report back into the machine, so no phase is advanced by a timer that could disagree with what is on screen.
7. The pre-JS hidden state is a stylesheet rule keyed on `[data-page-state="preload"]` and `[data-page-state="gating"]`, not a `gsap.set` in an effect. Effects run after the first paint, so a JS-only hidden state paints the page fully composed and then hides it. The build then applies `gsap.set(targets, from)` immediately, in the same React commit that swapped the page in, which covers every frame after that.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `PRELOAD_DELAY = 0.8`
  Seconds of floor delay before the FIRST entrance — the one competing with hydration, font loading and the initial layout pass. Below ~0.5 s the stagger still lands inside the hydration burst on a mid-range phone; above ~1 s a fast device shows a finished, blank-looking page and waits.
- `ROUTE_DELAY = 0.15`
  Seconds of floor delay for every entrance after the first. Hydration has already happened; the only competing work is the destination subtree's own mount. Long enough that the mount lands inside it, short enough that the click still feels answered.
- `IDLE_TIMEOUT = 1200`
  Milliseconds after which the idle wait gives up, passed both as `requestIdleCallback`'s `timeout` and as the fallback timer's delay. A saturated thread — a WebGL hero, a heavy hydration, a third-party long task — may never report idle, and an entrance that never starts is a blank page. Longer than a typical hydration burst, comfortably shorter than the ~2 s at which a visitor decides the site is broken.
- `ENTER_DURATION = 0.5`
  Seconds for the entrance, matching the source's `enterDuration`. With a 0.08 s stagger over four elements the last one finishes at 0.74 s, which is the upper limit for a page that should feel like it is already there.
- `LEAVE_DURATION = 0.5`
  Seconds for the exit, matching the source's `leaveDuration`. Applied as `timeScale(enterDuration / leaveDuration)` on the reversed timeline rather than as a second set of tweens, so the exit cannot drift from the entrance. Drop it to 0.25 for an exit that feels decisive against a gradual arrival.
- `ENTER_STAGGER = 0.08`
  Seconds between elements. Below ~0.05 s the group reads as one block and the stagger is wasted; above ~0.12 s the last element arrives after the eye has already moved on and the page feels like it is still loading.
- `ENTER_DISTANCE = 24`
  Pixels each element rises through. Small enough that no element crosses another's resting position — which would read as the layout reflowing rather than arriving — and large enough to be legible at the 0.5 s duration.

## API

```ts
function IdleGatedPageStates(props: { controller: IdlePageStates; pageKey: string; children: ReactNode; enterDuration?: number; leaveDuration?: number; stagger?: number; distance?: number; className?: string }): JSX.Element
function useIdlePageStates(options?: { preloadDelay?: number; routeDelay?: number; idleTimeout?: number; onGateOpen?: () => void }): { state: PageState; ready: () => void; leave: (commit: () => void) => void; entered: () => void; left: () => void }
function whenIdleAfter(delaySeconds: number, timeout: number, done: () => void): () => void
type PageState = "preload" | "gating" | "entering" | "settled" | "leaving"
```

- `controller: IdlePageStates`
  From `useIdlePageStates()`. Supplies the phase and receives the timeline's completions.
- `pageKey: string`
  Identity of the current page. A change rebuilds the timeline against the new `[data-page-enter]` elements. `usePathname()` in Next.js.
- `children: ReactNode`
  The page. Descendants marked `data-page-enter` are staggered in and, reversed, out.
- `enterDuration: number` — default `0.5`
  Seconds for the entrance.
- `leaveDuration: number` — default `0.5`
  Seconds for the exit, applied as a `timeScale` on the reversed timeline.
- `stagger: number` — default `0.08`
  Seconds between staggered elements. Reversed on exit, so the last one leaves first.
- `distance: number` — default `24`
  Pixels each element rises through.
- `className: string`
  Merged onto the root via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Seconds of floor delay before the FIRST entrance. The one enter that
 * competes with hydration, font loading and the initial layout pass, so it is
 * the one that needs real headroom. Below ~0.5 s the stagger still lands
 * inside the hydration burst on a mid-range phone; above ~1 s a fast device
 * shows a finished, blank-looking page and waits.
 */
export const PRELOAD_DELAY = 0.8;

/**
 * Seconds of floor delay before every SUBSEQUENT entrance. Hydration has
 * already happened by then; the only competing work is the destination
 * subtree's own mount, which is a fraction of it. Keeping the first-load value
 * here would put nearly a second of nothing between every click and its page.
 */
export const ROUTE_DELAY = 0.15;

/**
 * Milliseconds after which the idle wait gives up. A thread that is genuinely
 * saturated — a WebGL hero, a heavy hydration, a long task from a third-party
 * script — may never report idle, and an entrance that never starts is a blank
 * page. 1200 ms is longer than a typical hydration burst and comfortably
 * shorter than the ~2 s at which a visitor decides the site is broken. It is
 * passed as `requestIdleCallback`'s own `timeout` option, and it is also the
 * fallback timer's delay, so both paths have identical worst-case behaviour.
 */
export const IDLE_TIMEOUT = 1200;

/** Seconds for the entrance. */
export const ENTER_DURATION = 0.5;
/** Seconds for the exit. */
export const LEAVE_DURATION = 0.5;

/** Seconds between staggered elements. */
const ENTER_STAGGER = 0.08;
/** Pixels each element rises through. */
const ENTER_DISTANCE = 24;
const ENTER_EASE = 'power2.out';

const PAGE_CSS = `
/* The pre-JS hidden state. It cannot come from a 'gsap.set' in an effect —
   effects run after the first paint, so the page would flash fully composed
   and then hide itself. Once GSAP is involved it writes 'opacity' to the
   inline style, which outranks this rule in both directions. */
.kx-idle-page[data-page-state='preload'] [data-page-enter],
.kx-idle-page[data-page-state='gating'] [data-page-enter] {
  opacity: 0;
}
/* Reduced motion never runs the gate, so nothing would ever remove the rule
   above before hydration. */
@media (prefers-reduced-motion: reduce) {
  .kx-idle-page[data-page-state='preload'] [data-page-enter],
  .kx-idle-page[data-page-state='gating'] [data-page-enter] {
    opacity: 1;
  }
}
/* Media Queries 5. Where it is unsupported the declaration is simply dropped,
   so this is a bonus rather than the fix — but where it is supported, a
   scripting-disabled visitor gets the page instead of an empty box. */
@media (scripting: none) {
  .kx-idle-page[data-page-state='preload'] [data-page-enter],
  .kx-idle-page[data-page-state='gating'] [data-page-enter] {
    opacity: 1;
  }
}
`;

/**
 * Call `done` once BOTH a floor delay has elapsed and the main thread has gone
 * idle. Returns the canceller — call it from effect cleanup.
 *
 * `requestIdleCallback` is used where it exists and a plain `setTimeout` where
 * it does not: Safari only shipped it in 17.4, so a fallback is not
 * hypothetical, and the two are cancelled with different functions. Exactly one
 * of them is ever scheduled, and the canceller releases whichever it was.
 */
export function whenIdleAfter(
  delaySeconds: number,
  timeout: number,
  done: () => void,
): () => void {
  let cancelled = false;
  let idleReady = false;
  let delayReady = false;

  const join = () => {
    if (cancelled || !idleReady || !delayReady) return;
    done();
  };

  // The floor delay resolves inside a rAF rather than directly in the timer.
  // A timer callback can fire in the middle of a long task; the frame callback
  // after it cannot, so the first tween is guaranteed a fresh frame budget
  // instead of the tail end of someone else's.
  let frame = 0;
  const delayTimer = setTimeout(() => {
    frame = requestAnimationFrame(() => {
      frame = 0;
      delayReady = true;
      join();
    });
  }, delaySeconds * 1000);

  let idleHandle = 0;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const onIdle = () => {
    idleHandle = 0;
    idleTimer = undefined;
    idleReady = true;
    join();
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    // The `timeout` option is the guarantee: the callback runs within this many
    // milliseconds whether the thread ever goes idle or not.
    idleHandle = window.requestIdleCallback(onIdle, { timeout });
  } else {
    idleTimer = setTimeout(onIdle, timeout);
  }

  return () => {
    cancelled = true;
    clearTimeout(delayTimer);
    if (frame !== 0) cancelAnimationFrame(frame);
    // Whichever branch ran is the one that gets released. Cancelling an idle
    // handle with `clearTimeout` is a silent no-op, which is how a gate leaks
    // into the next page and starts an entrance on a tree that no longer
    // exists.
    if (idleHandle !== 0) window.cancelIdleCallback(idleHandle);
    if (idleTimer !== undefined) clearTimeout(idleTimer);
  };
}

export type PageState =
  | 'preload'
  | 'gating'
  | 'entering'
  | 'settled'
  | 'leaving';

export interface IdlePageStatesOptions {
  /** Seconds of floor delay before the first entrance. */
  preloadDelay?: number;
  /** Seconds of floor delay before every entrance after the first. */
  routeDelay?: number;
  /** Milliseconds after which the idle wait gives up. */
  idleTimeout?: number;
  /**
   * Fired on the frame the gate opens, before the entrance starts. The place
   * for `ScrollTrigger.refresh()` — measure while nothing is moving, or every
   * trigger is offset by the distance the entrance travels.
   */
  onGateOpen?: () => void;
}

export interface IdlePageStates {
  /** Also written to `data-page-state` on the root, so CSS can read it. */
  state: PageState;
  /** Preload finished — fonts resolved, critical images decoded. */
  ready: () => void;
  /** Run the exit, then `commit` — your navigation. */
  leave: (commit: () => void) => void;
  /** Reported by the component when the entrance timeline completes. */
  entered: () => void;
  /** Reported by the component when the exit timeline reaches zero. */
  left: () => void;
}

export function useIdlePageStates(
  options: IdlePageStatesOptions = {},
): IdlePageStates {
  const {
    preloadDelay = PRELOAD_DELAY,
    routeDelay = ROUTE_DELAY,
    idleTimeout = IDLE_TIMEOUT,
    onGateOpen,
  } = options;

  const reduced = useReducedMotion();
  const [state, setState] = useState<PageState>('preload');

  const commit = useRef<(() => void) | null>(null);
  const firstEnter = useRef(true);
  const gateOpen = useRef(onGateOpen);
  gateOpen.current = onGateOpen;

  // The gate. Scheduled only while gating, and cancelled by returning the
  // canceller — so a route change or an unmount mid-wait releases the idle
  // handle instead of firing an entrance into a tree that has gone.
  useEffect(() => {
    if (state !== 'gating') return;

    // Reduced motion skips the gate entirely rather than waiting it out. The
    // gate exists to protect an animation; with no animation to protect, all it
    // would do is hold a blank page in front of someone who asked for less
    // motion, not more waiting.
    if (reduced) {
      firstEnter.current = false;
      setState('settled');
      return;
    }

    const delay = firstEnter.current ? preloadDelay : routeDelay;
    return whenIdleAfter(delay, idleTimeout, () => {
      firstEnter.current = false;
      gateOpen.current?.();
      setState('entering');
    });
  }, [state, reduced, preloadDelay, routeDelay, idleTimeout]);

  const ready = useCallback(() => {
    setState((s) => (s === 'preload' ? 'gating' : s));
  }, []);

  const entered = useCallback(() => {
    setState((s) => (s === 'entering' ? 'settled' : s));
  }, []);

  const leave = useCallback(
    (next: () => void) => {
      if (reduced) {
        next();
        return;
      }
      // A second click during an exit would queue a second commit and land the
      // visitor one page past where they aimed.
      if (commit.current !== null) return;

      // Only these three phases have an entrance on screen to reverse. Clicking
      // during 'preload' left the state unchanged — the updater below returned
      // `s` — but the commit had already been latched, and the only thing that
      // clears it is `left()`, which runs off a reverse that was never started.
      // One early click therefore killed every link on the page for the rest of
      // the session. Nothing to reverse means go straight there, as in the
      // reduced-motion branch above.
      if (state !== 'entering' && state !== 'settled' && state !== 'gating') {
        next();
        return;
      }

      commit.current = next;
      setState('leaving');
    },
    [reduced, state],
  );

  const left = useCallback(() => {
    const next = commit.current;
    commit.current = null;
    next?.();
    // Straight back to gating, not to preload: the preloader is a first-load
    // state and showing it again on every route change is the classic version
    // of this mistake.
    setState('gating');
  }, []);

  useEffect(
    () => () => {
      commit.current = null;
    },
    [],
  );

  return useMemo(
    () => ({ state, ready, leave, entered, left }),
    [state, ready, leave, entered, left],
  );
}

export interface IdleGatedPageStatesProps {
  /** From `useIdlePageStates()`. */
  controller: IdlePageStates;
  /**
   * Identity of the current page. A change rebuilds the timeline against the
   * new page's `[data-page-enter]` elements. `usePathname()` in Next.js.
   */
  pageKey: string;
  /** The page. Descendants marked `data-page-enter` are staggered in and out. */
  children: ReactNode;
  /** Seconds for the entrance. */
  enterDuration?: number;
  /** Seconds for the exit. Applied as a `timeScale` on the reversed timeline. */
  leaveDuration?: number;
  /** Seconds between staggered elements. */
  stagger?: number;
  /** Pixels each element rises through. */
  distance?: number;
  className?: string;
}

export function IdleGatedPageStates({
  controller,
  pageKey,
  children,
  enterDuration = ENTER_DURATION,
  leaveDuration = LEAVE_DURATION,
  stagger = ENTER_STAGGER,
  distance = ENTER_DISTANCE,
  className,
}: IdleGatedPageStatesProps) {
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<ReturnType<typeof gsap.timeline> | null>(null);
  const reduced = useReducedMotion();

  const { state, entered, left } = controller;

  // Held in refs so the timeline's completion callbacks are wired once, at
  // build time, and still call the current functions.
  const onEntered = useRef(entered);
  onEntered.current = entered;
  const onLeft = useRef(left);
  onLeft.current = left;

  // Built once per page and held paused. `state` is deliberately NOT a
  // dependency: `useGsap` reverts on every dependency change, and `revert()`
  // strips the inline values GSAP wrote — so a rebuild keyed on the phase would
  // hand the reverse tween the stylesheet default as its start value and the
  // exit would animate from nowhere to nowhere.
  useGsap(
    gsap,
    () => {
      const el = root.current;
      if (!el) return;

      const targets = Array.from(
        el.querySelectorAll<HTMLElement>('[data-page-enter]'),
      );

      const from = { opacity: 0, y: distance };

      const tl = gsap.timeline({
        paused: true,
        onComplete: () => onEntered.current(),
        onReverseComplete: () => onLeft.current(),
      });

      if (targets.length === 0) {
        // A page that marked nothing still has to run the state machine. This
        // used to bail before the timeline existed, which left the phase effect
        // with nothing to play: `entered()` never fired, the page sat in
        // 'entering' forever, and the first click latched a commit that no
        // reverse would ever release. An empty tween of the same length carries
        // the callbacks instead.
        tl.to({}, { duration: enterDuration });
      } else {
        // Applied immediately, in the same commit React swapped the page in, so
        // the destination is never painted composed and then hidden. The CSS
        // rule covers the frames before this file has run at all; this covers
        // every frame after.
        gsap.set(targets, from);

        tl.fromTo(
          targets,
          from,
          {
            opacity: 1,
            y: 0,
            duration: enterDuration,
            ease: ENTER_EASE,
            stagger,
          },
          0,
        );
      }

      timeline.current = tl;
      return () => {
        timeline.current = null;
      };
    },
    root,
    [pageKey, enterDuration, stagger, distance],
  );

  // The phase driver. Separate from the build for the reason above, and it
  // carries `pageKey` so it runs after — never before — a rebuild.
  useEffect(() => {
    const tl = timeline.current;
    if (!tl) return;

    if (reduced) {
      // A seek, not a zero-duration tween: the timeline is parked on its end
      // frame, so opacity, offset and stagger all land correctly because they
      // are all on this one timeline.
      tl.progress(1).pause();
      return;
    }

    if (state === 'entering') {
      tl.timeScale(1).play();
    } else if (state === 'leaving') {
      // One timeline, two speeds. `timeScale` is a ratio, so a 0.25 s exit off
      // a 0.5 s entrance is `0.5 / 0.25 = 2`, and the reversed stagger takes
      // the last element out first.
      tl.timeScale(enterDuration / Math.max(leaveDuration, 0.01)).reverse();
    }
  }, [state, reduced, pageKey, enterDuration, leaveDuration]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The gate's canceller is the effect's cleanup: it clears the floor-delay timer, cancels the pending `requestAnimationFrame`, and releases whichever idle mechanism was scheduled — `cancelIdleCallback` for the handle, `clearTimeout` for the fallback — with a `cancelled` flag so a callback already in the queue cannot fire after teardown. `useGsap` reverts the `gsap.context`, killing the timeline and stripping every inline style it wrote. The pending commit is nulled on unmount so a leave in flight cannot navigate a tree that has gone.

**Reduced motion.** The gate is skipped entirely — holding a blank page would be more waiting, not less motion — so `gating` advances straight to `settled` with no idle callback and no timer scheduled, and therefore nothing to cancel. The timeline is never played: the phase effect parks it with `tl.progress(1).pause()`, so opacity, offset and stagger all land on their end frame together because they are all on the one timeline. `leave()` calls the commit synchronously, and a stylesheet rule inside `@media (prefers-reduced-motion: reduce)` keeps `[data-page-enter]` visible for the frames before hydration.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Starting the entrance on mount. Mount is the single busiest moment in the page's life. The stagger runs against hydration and the first layout pass, so the first two or three elements animate and the rest jump — and it only reproduces on the devices you do not test on.
- Waiting for idle ALONE. On a fast machine `requestIdleCallback` fires almost immediately, before the hydration burst has even begun, so the gate opens straight into the work it was supposed to avoid. The floor delay is what makes the idle check meaningful.
- Waiting for a delay ALONE. On a slow machine the timer expires while the thread is still saturated and you are back to a stuttering stagger. Neither condition works without the other.
- Calling `requestIdleCallback` without the `timeout` option. On a page with a long-running rAF loop the callback may never fire, and the entrance never starts — a permanently blank page, on exactly the devices that can least afford it.
- Cancelling the wrong handle. `requestIdleCallback` returns a handle for `cancelIdleCallback`, and a `setTimeout` returns one for `clearTimeout`; passing either to the other is a silent no-op. Exactly one is ever scheduled and the canceller releases the one that was, or the gate outlives the page and fires an entrance into a tree that no longer exists.
- Assuming `requestIdleCallback` exists. Safari only shipped it in 17.4, so `window.requestIdleCallback(...)` throws on a browser that is still in real use — and it throws inside an effect, which takes the whole page down rather than degrading.
- Putting the phase in the `useGsap` dependency list. Every dependency change reverts the context, and `revert()` strips the inline values GSAP wrote — so the reverse tween reads the stylesheet default as its start value and the exit animates from nowhere to nowhere. The timeline is built once per page and driven from a second effect.
- Hiding `[data-page-enter]` from JavaScript only. An effect runs after the first paint, so the destination is painted fully composed and then hides itself — a flash of the finished page immediately before it animates in. The hidden state belongs in a stylesheet rule keyed on the phase.
- Returning to `preload` after a route change. The preloader is a first-load state; showing it again on every click is the classic version of this mistake. The machine goes back to `gating`, which re-runs the gate without re-running the preloader.
- Gating with reduced motion on. There is no animation left to protect, so all the gate does is hold a blank page in front of someone who asked for less motion, not more waiting. That path skips straight to `settled`.

## Notes

- In Next.js App Router: mount once in `app/layout.tsx` with `pageKey={usePathname()}`, call `ready()` from `document.fonts.ready`, and replace nav `<Link>` elements with buttons calling `leave(() => router.push(href))`. Nothing here imports `next/navigation` — the commit is a callback, so the same machine works under React Router or a plain `useState` page switch.
- `onGateOpen` fires on the frame the gate opens, before the entrance starts. That is where `ScrollTrigger.refresh()` belongs: measure while nothing is moving, or every trigger is offset by the distance the entrance travels. The source did the same thing, refreshing after its preload completed and before its enter.
- Neither `requestIdleCallback` nor `requestAnimationFrame` runs in a backgrounded tab, so the gate does not open until the tab is foregrounded. That is the correct behaviour — an entrance nobody can see is wasted work — but it is also why a headless screenshot taken against a background tab captures the pre-entrance state. Foreground the tab, or drive the timeline to `progress(1)` for capture.
- The preloader should stay up for the whole of `gating`, not just `preload`. The wait is dead time only if you show the visitor an empty page during it; behind a preloader it is indistinguishable from loading.
- The `@media (scripting: none)` rule reveals the content for visitors with JavaScript disabled. It is Media Queries 5 and is simply dropped where unsupported, so treat it as a bonus rather than as the fix.

## Definition of done

Load the preview: the preloader holds, then the content staggers up and in as one group with no element jumping ahead of the tween. Throttle the CPU to 6x in DevTools and reload — the entrance still runs as a smooth stagger rather than arriving in two jerks, because it starts later rather than starting on time and stuttering. Click a nav item: the current content staggers out last-element-first, the page swaps, and the next one arrives after a much shorter gate than the first load used. Click two nav items in quick succession and you land on the first one you clicked. With reduced motion the content is present immediately with no gate, no stagger, and no preloader held past the font load.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
