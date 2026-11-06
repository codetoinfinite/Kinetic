'use client';

import gsap from 'gsap';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { useGsap } from '@/registry/hooks/use-gsap';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Idle-Gated Page States
   --------------------------------------------------------------------------
   A page entrance is the one animation guaranteed to run at the worst
   possible moment: hydration, font swap, image decode and layout measurement
   all land in the same few hundred milliseconds. Start a stagger there and it
   does not look slow, it looks broken — three elements arrive, the thread
   blocks, the rest snap in.

   So the entrance is not started by mount. It is started by a gate that opens
   only when BOTH of these are true:

     1. a floor delay has elapsed, resolved on a requestAnimationFrame so the
        first tween lands at the top of a frame rather than mid-task;
     2. the main thread has reported itself idle at least once.

   Whichever finishes last opens the gate. Neither alone is enough: the delay
   alone still fires into a busy thread on a slow device, and idle alone fires
   instantly on a fast one, straight into the hydration burst that has not
   started yet.

     preload --ready()--> gating --gate--> entering --tl done--> settled
                            ^                                      |
                            +----------- left() <-- leaving <-- leave(commit)

   The whole choreography is ONE paused timeline: `play()` enters, `reverse()`
   leaves. Reversing is not a shortcut — a reversed positive stagger runs
   last-element-first, which is what an exit should do, and it guarantees the
   exit can never disagree with the entrance about where an element rests.
   ========================================================================== */

// #region critical
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
  // #endregion critical

  return (
    <div
      ref={root}
      data-page-state={state}
      className={cn('kx-idle-page', className)}
    >
      {/* React 19 hoists and dedupes by `href`, so any number of instances and
          any number of navigations emit exactly one rule block. */}
      <style href="kinetic-idle-gated-page-states" precedence="medium">
        {PAGE_CSS}
      </style>
      {children}
    </div>
  );
}
