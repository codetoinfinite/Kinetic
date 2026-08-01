'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';

/* ==========================================================================
   Lottie Ratio Poster
   --------------------------------------------------------------------------
   The slot a Lottie goes into, minus the Lottie.

   A Lottie JSON is regularly one to six megabytes of vector keyframes, and
   the runtime that plays it is another sixty on top. Neither should be on the
   critical path for a decoration two screens down. So: reserve the box, draw
   a poster into it, and fetch the JSON only when the box is about to be seen.

   The one number that makes this work is the ratio. A Lottie carries its own
   composition size at the root of the JSON — `w` and `h` — so once the file
   lands you know the exact box it wants. Before it lands you are guessing,
   and the cost of a wrong guess is a layout shift at the worst possible
   moment: after the user has started reading. This component makes that cost
   a number on screen rather than a surprise, so you can go and fix the guess.

   It deliberately does not import `lottie-web`. Loading and playback are the
   consumer's, through a render prop; what is packaged here is the reservation
   and the swap, which is the part everyone gets wrong and nobody extracts.
   ========================================================================== */

/** The two fields every Lottie JSON carries at its root. */
export interface LottieRatioSource {
  /** Composition width in the JSON's own units. The `w` field. */
  w: number;
  /** Composition height. The `h` field. */
  h: number;
}

export type LottieRatioPhase = 'waiting' | 'loading' | 'ready' | 'failed';

export interface LottieRatioRender<T> {
  /** The resolved JSON, whatever shape you resolved it as. */
  source: T;
  /**
   * True when the user asked for reduced motion. Park the animation on its
   * last frame instead of playing it — `anim.goToAndStop(anim.getDuration(true) - 1, true)`.
   */
  reduced: boolean;
}

export interface LottieRatioPosterProps<T extends LottieRatioSource> {
  /**
   * Fetches the animation JSON. Called at most once, and only after the
   * reserved box comes within `rootMargin` of the viewport. Kept in a ref, so
   * an inline arrow does not restart the load on every parent render.
   */
  load: () => Promise<T>;
  /** Renders the player once the JSON has landed. */
  children: (state: LottieRatioRender<T>) => ReactNode;
  /**
   * Provisional width / height, used until the JSON reports its own. Get this
   * from the design file — it is the difference between a reserved box and a
   * nearly reserved box.
   */
  ratio?: number;
  /** How early to start fetching, as an IntersectionObserver root margin. */
  rootMargin?: string;
  /** Poster crossfade in milliseconds. Skipped entirely under reduced motion. */
  fade?: number;
  /** Text on the poster. Keep it short; it is a placeholder, not a caption. */
  label?: string;
  className?: string;
}

/** 16:9. A guess, and named as one — see the shift readout for its cost. */
const DEFAULT_RATIO = 16 / 9;
/** Poster crossfade, ms. */
const FADE_MS = 320;
/** Start fetching this far before the box scrolls in. */
const ROOT_MARGIN = '240px';
/** Slack after the fade before the poster is unmounted, ms. */
const FADE_SLACK = 60;

function formatRatio(value: number): string {
  return value.toFixed(2);
}

export function LottieRatioPoster<T extends LottieRatioSource = LottieRatioSource>({
  load,
  children,
  ratio = DEFAULT_RATIO,
  rootMargin = ROOT_MARGIN,
  fade = FADE_MS,
  label = 'animation',
  className,
}: LottieRatioPosterProps<T>) {
  const host = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<LottieRatioPhase>('waiting');
  const [source, setSource] = useState<T | null>(null);
  const [fading, setFading] = useState(false);
  const [posterGone, setPosterGone] = useState(false);

  const loadRef = useRef(load);
  loadRef.current = load;

  /**
   * The in-flight promise, held across effect runs. StrictMode double-invokes
   * this effect and Activity-style remounts re-run it; a plain `started` flag
   * would let the first call be abandoned and block the second from ever
   * being made. Reusing the promise means the request happens exactly once
   * and every run subscribes to the same result.
   */
  const request = useRef<Promise<T> | null>(null);

  const reduced = useReducedMotion();
  const { width } = useResizeObserver(host);

  // The box already has its reserved height here, which is what makes the
  // intersection test mean anything. Observing a zero-height element reports
  // it as visible from anywhere on the page.
  const { inView } = useInView(host, { rootMargin, once: true });

  const apply = useCallback((data: T) => {
    // A composition with a zero dimension would divide the ratio to Infinity
    // and collapse the box. Treat it as a failed load and keep the poster.
    if (!(data.w > 0) || !(data.h > 0)) {
      setPhase('failed');
      return;
    }
    setSource(data);
    setPhase('ready');
  }, []);

  // #region critical
  useEffect(() => {
    if (!inView) return;
    let alive = true;

    request.current ??= loadRef.current();
    setPhase((prev) => (prev === 'waiting' ? 'loading' : prev));

    request.current.then(
      (data) => {
        if (alive) apply(data);
      },
      () => {
        if (alive) setPhase('failed');
      },
    );

    return () => {
      alive = false;
    };
  }, [inView, apply]);

  // The real ratio comes from the JSON's own composition size, so the box is
  // exact from the frame the file lands rather than from the frame the player
  // finishes measuring itself.
  const actual = source ? source.w / source.h : null;
  const applied = actual ?? ratio;

  // What the guess cost, in the units the user experiences it in. Everything
  // below this box moves by exactly this many pixels at the current width.
  const shift =
    actual !== null && width > 0 ? Math.abs(width / ratio - width / actual) : 0;
  // #endregion critical

  useEffect(() => {
    if (phase !== 'ready') return;
    if (reduced) {
      setFading(true);
      return;
    }
    // Two frames: one for React to commit the player into the DOM, one for
    // the browser to paint it. Dissolving the poster before the thing behind
    // it has drawn shows the empty box through the gap.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setFading(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [phase, reduced]);

  useEffect(() => {
    if (!fading) return;
    if (reduced) {
      setPosterGone(true);
      return;
    }
    // Unmounted on a timer rather than on transitionend: a transition on a
    // display:none subtree never fires one, and the poster would be pinned
    // over the player forever.
    const timer = window.setTimeout(() => setPosterGone(true), fade + FADE_SLACK);
    return () => window.clearTimeout(timer);
  }, [fading, reduced, fade]);

  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      <div
        ref={host}
        className="relative w-full overflow-hidden border border-line bg-surface"
        // The whole technique in one declaration. Set before anything is
        // fetched, so the box occupies its final space from first paint.
        style={{ aspectRatio: String(applied) }}
      >
        {phase === 'ready' && source ? (
          <div className="absolute inset-0">{children({ source, reduced })}</div>
        ) : null}

        {posterGone ? null : (
          <div
            aria-hidden
            className={cn(
              'absolute inset-0 transition-opacity ease-out',
              fading ? 'opacity-0' : 'opacity-100',
            )}
            style={{ transitionDuration: reduced ? '0ms' : `${fade}ms` }}
          >
            <div className="absolute inset-0 bg-linear-to-br from-surface via-bg to-surface" />
            <div
              className={cn(
                'absolute inset-0 bg-linear-to-r from-transparent via-line-strong to-transparent opacity-30',
                !reduced && phase !== 'failed' ? 'animate-pulse' : null,
              )}
            />
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
                {phase === 'failed' ? 'unavailable' : label}
              </span>
            </div>
          </div>
        )}
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
        {phase === 'waiting' ? (
          <>reserved {formatRatio(ratio)} &middot; waiting for viewport</>
        ) : null}
        {phase === 'loading' ? (
          <>reserved {formatRatio(ratio)} &middot; fetching json</>
        ) : null}
        {phase === 'failed' ? <span className="text-muted">load failed &middot; poster held</span> : null}
        {phase === 'ready' && actual !== null ? (
          <>
            <span>{formatRatio(ratio)} guess</span>
            <span className="mx-2 text-line-strong">&rarr;</span>
            <span className="text-fg">{formatRatio(actual)} actual</span>
            <span className="mx-2 text-line-strong">/</span>
            <span className={shift >= 1 ? 'text-accent' : undefined}>
              {shift < 1 ? 'no shift' : `${Math.round(shift)} px shift`}
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}
