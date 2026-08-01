'use client';

import gsap from 'gsap';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { cn } from '@/lib/cn';
import { useGsap } from '@/registry/hooks/use-gsap';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Slab Page Transition
   --------------------------------------------------------------------------
   Everything travels the same way. The outgoing page slides up out of frame
   while a solid slab rises from below to take its place; the route commits
   under the slab; then the slab keeps going up and out while the new page
   follows it in from below.

     content   0 ---------> -H      | commit |   +H ---------> 0
     slab     +H --------->  0      |  hold  |    0 ---------> -H
               0 ..... d           d ... d+h      d+h ..... 2d+h

   Nothing ever reverses. That single rule is what separates a slab from a
   curtain: a curtain that drops and lifts reads as an interruption, a slab
   that passes through reads as travel, and the page you arrive on feels like
   it was always the next one along.

   The whole gesture is ONE paused timeline played from zero, not two
   timelines awaited in sequence, because we own the moment the route changes
   — it is a `.call()` at the midpoint. The content element's jump from -H
   back to +H happens on that same frame, hidden under a slab that is exactly
   covering the frame.

   Both halves ease `power3.inOut` separately rather than one tween running
   the full 2H distance. An `inOut` across the whole travel is at its FASTEST
   in the middle, which is the one place the slab has to look like it stopped.
   Two of them meet at zero velocity, so the slab lands, holds, and leaves.
   ========================================================================== */

// #region critical
/**
 * Seconds for one half. The source ran 1 s per half; 0.8 keeps the weight and
 * takes 0.4 s off the round trip. Under ~0.5 s the slab stops reading as a
 * physical object and becomes a colour flash; over ~1.1 s the hold in the
 * middle turns into a wait, and people click a second nav item.
 */
export const SLAB_DURATION = 0.8;

/**
 * Seconds the slab sits still at full cover, between the two halves. Two jobs:
 * it is the beat in which the slab's label is legible, and it is the margin in
 * which React commits the destination. The commit fires at the start of the
 * hold, so a destination whose first layout costs two or three frames still
 * finishes laying out before the slab starts moving off it. At 0 a heavy page
 * visibly settles while it is sliding in.
 */
export const SLAB_HOLD = 0.12;

/** Both halves. `inOut` on each is what makes the midpoint a stop, not a peak. */
const SLAB_EASE = 'power3.inOut';

const SLAB_CSS = `
.kx-slab-panel {
  /* An opaque full-frame surface must never eat a click, not even while it is
     covering. Mid-transition the pointer is usually already aimed at the next
     nav item. */
  pointer-events: none;
  z-index: var(--kx-slab-z, 190);
  background: var(--kx-slab-color, #000);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
/* The parked position lives in CSS, not in an inline style and not in a
   'gsap.set' inside an effect. Effects run after the first paint, so a slab
   parked from JS is one frame of full-frame colour on mount. GSAP's inline
   'transform' outranks these rules while a transition runs, and when
   'useGsap' reverts it strips that inline value — which parks the slab again
   with no extra code. */
.kx-slab-park-up { transform: translateY(100%); }
.kx-slab-park-down { transform: translateY(-100%); }
`;

export interface SlabNavigateOptions {
  /** Written into the slab, legible during the hold. */
  label?: string;
  /** Overrides the component's `direction` for this one navigation. */
  direction?: 'up' | 'down';
}

/** What the component registers on the controller. Internal. */
export interface SlabRunner {
  run: (commit: () => void, options?: SlabNavigateOptions) => void;
}

export interface SlabNavigation {
  /** Pass straight to `<SlabPageTransition controller>`. Do not read it. */
  host: RefObject<SlabRunner | null>;
  /**
   * Raise the slab, run `commit` — your navigation — under it, then lower the
   * page in behind it.
   */
  navigate: (commit: () => void, options?: SlabNavigateOptions) => void;
}

/**
 * The caller's half. `commit` is a callback rather than a router call, so
 * nothing here depends on a routing library.
 */
export function useSlabNavigation(): SlabNavigation {
  const host = useRef<SlabRunner | null>(null);

  const navigate = useCallback(
    (commit: () => void, options?: SlabNavigateOptions) => {
      const runner = host.current;
      // No mounted component — the caller wired the hook up but rendered the
      // transition conditionally, or this fired during the first commit.
      // Navigate anyway. A transition that swallows navigations is worse than
      // no transition.
      if (!runner) {
        commit();
        return;
      }
      runner.run(commit, options);
    },
    [],
  );

  return useMemo(() => ({ host, navigate }), [navigate]);
}

export interface SlabPageTransitionProps {
  /** From `useSlabNavigation()`. */
  controller: SlabNavigation;
  /** The current page. Swapped by the `commit` you hand to `navigate`. */
  children: ReactNode;
  /** Seconds for ONE half. The full gesture is `2 * duration + hold`. */
  duration?: number;
  /** Seconds the slab holds at full cover between the halves. */
  hold?: number;
  /**
   * Default travel. `up` sends everything upward; `down` mirrors it, which is
   * what a back navigation wants. Overridable per navigation.
   */
  direction?: 'up' | 'down';
  /** Any CSS colour. Must be opaque, or the swap shows through the slab. */
  color?: string;
  /** Applied to the label span so the caller owns its type. */
  labelClassName?: string;
  /** `absolute` to demo inside a bounded box; `fixed` for a real page. */
  position?: 'fixed' | 'absolute';
  /** Above the site, below a preloader. */
  zIndex?: number;
  className?: string;
}

export function SlabPageTransition({
  controller,
  children,
  duration = SLAB_DURATION,
  hold = SLAB_HOLD,
  direction = 'up',
  color = '#000',
  labelClassName,
  position = 'fixed',
  zIndex = 190,
  className,
}: SlabPageTransitionProps) {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const slab = useRef<HTMLDivElement>(null);
  const labelEl = useRef<HTMLSpanElement>(null);

  const timeline = useRef<ReturnType<typeof gsap.timeline> | null>(null);
  const pending = useRef<(() => void) | null>(null);
  const reduced = useReducedMotion();

  // Read inside the tweens' function-based values, so flipping direction
  // between navigations needs no rebuild — and therefore no `revert()`, which
  // would strip the transform GSAP is mid-way through writing. Set in `run`,
  // never during render: `play(0)` renders the timeline synchronously, so a
  // value that only lands on the next React commit would be read one frame
  // too late and the two halves would disagree about which way is out.
  const dir = useRef<'up' | 'down'>(direction);
  const defaultDir = useRef(direction);
  defaultDir.current = direction;

  // Built once and held paused. `direction` is deliberately NOT a dependency:
  // `useGsap` reverts on every dependency change, and revert removes the
  // inline transform, so a rebuild during a transition drops the slab back to
  // its CSS park mid-cover and the swap is visible.
  useGsap(
    gsap,
    () => {
      const rootEl = root.current;
      const contentEl = content.current;
      const slabEl = slab.current;
      if (!rootEl || !contentEl || !slabEl) return;

      // Travel in pixels, measured per run. `yPercent: -100` would be 100% of
      // the CONTENT's own height — on a long page that is the whole document,
      // so the page would fly thousands of pixels instead of one screen. The
      // original wrote `y: '-100vh'` for exactly this reason; measuring the
      // real box also gets the bounded case right, where one screen is the
      // container and not the viewport.
      const travel = () =>
        position === 'fixed'
          ? window.innerHeight
          : rootEl.getBoundingClientRect().height;
      const sign = () => (dir.current === 'down' ? -1 : 1);

      const tl = gsap.timeline({ paused: true });

      tl.to(contentEl, { y: () => -travel() * sign(), duration, ease: SLAB_EASE }, 0)
        .fromTo(
          slabEl,
          { y: () => travel() * sign() },
          { y: 0, duration, ease: SLAB_EASE },
          0,
        )
        // Midpoint. The slab is exactly covering the frame for the whole of
        // this and the `set` below, so neither is ever seen.
        .add(() => {
          const commit = pending.current;
          pending.current = null;
          commit?.();
        })
        .set(contentEl, { y: () => travel() * sign() })
        .to(
          slabEl,
          { y: () => -travel() * sign(), duration, ease: SLAB_EASE },
          duration + hold,
        )
        .to(contentEl, { y: 0, duration, ease: SLAB_EASE }, duration + hold)
        // Re-park the slab below the frame at the very end, so `progress(0)`
        // and `progress(1)` describe the same rest state and a second run
        // starts from a known place rather than from wherever it stopped.
        .set(slabEl, { y: () => travel() * sign() });

      timeline.current = tl;

      return () => {
        timeline.current = null;
        // A dependency change reverts and kills this timeline. If it happened
        // mid-transition the commit had not fired yet, so fire it here: the
        // visitor clicked a link and must end up on that page whatever the
        // animation did.
        const commit = pending.current;
        pending.current = null;
        commit?.();
      };
    },
    root,
    [duration, hold, position],
  );

  const run = useCallback(
    (commit: () => void, options?: SlabNavigateOptions) => {
      const tl = timeline.current;
      const span = labelEl.current;
      if (span) span.textContent = options?.label ?? '';
      dir.current = options?.direction ?? defaultDir.current;

      // Reduced motion: no slab and a synchronous commit. Not a zero-duration
      // slab — that is still one frame of full-frame colour, which is the
      // single most unpleasant thing to show someone who asked for less
      // motion. `pause(0)` suppresses callbacks, so the midpoint `.call()`
      // cannot fire a second commit.
      if (!tl || reduced) {
        tl?.pause(0);
        commit();
        return;
      }
      // A second click while the slab is in flight would queue a second commit
      // and land the visitor one page past where they aimed.
      if (tl.isActive()) return;

      pending.current = commit;
      // `invalidate()` before replaying re-evaluates every function-based
      // value: the box may have been resized, and `direction` may have
      // flipped, since the timeline was built. Without it the slab travels the
      // height the container had on mount.
      tl.invalidate().play(0);
    },
    [reduced],
  );

  useEffect(() => {
    const host = controller.host;
    host.current = { run };
    return () => {
      if (host.current?.run === run) host.current = null;
    };
  }, [controller, run]);
  // #endregion critical

  return (
    <div
      ref={root}
      className={cn(
        position === 'absolute'
          ? 'relative isolate h-full w-full overflow-hidden'
          : 'relative',
        className,
      )}
      style={
        {
          '--kx-slab-color': color,
          '--kx-slab-z': zIndex,
        } as CSSProperties
      }
    >
      {/* React 19 hoists and dedupes by `href`, so any number of instances and
          any number of navigations emit exactly one rule block. Per-instance
          values ride in custom properties for that reason. */}
      <style href="kinetic-slab-page-transition" precedence="medium">
        {SLAB_CSS}
      </style>

      {/* In flow, so the page keeps its own height and the document still
          scrolls. A transform moves it without taking it out of flow. */}
      <div ref={content} className={cn(position === 'absolute' && 'h-full w-full')}>
        {children}
      </div>

      {/* The park class only governs the frames before the first navigation —
          every run writes its own start value explicitly, so a per-navigation
          direction override does not need the class to agree with it. */}
      <div
        ref={slab}
        aria-hidden
        className={cn(
          'kx-slab-panel',
          direction === 'down' ? 'kx-slab-park-down' : 'kx-slab-park-up',
          position === 'fixed' ? 'fixed inset-0' : 'absolute inset-0',
        )}
      >
        {/* Written with `textContent` from `run`, never through state. A
            setState there would re-render the tree React is about to hand to
            GSAP, on the exact frame the timeline starts. */}
        <span ref={labelEl} className={labelClassName} />
      </div>
    </div>
  );
}
