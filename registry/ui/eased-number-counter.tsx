'use client';

import gsap from 'gsap';
import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Eased Number Counter
   --------------------------------------------------------------------------
   The number that is animated is never the string on screen. A plain object
   `{ v: from }` is the tween target; `onUpdate` formats `v` and writes it into
   a text node. That separation is what lets the count be *eased* — a linear
   count reads as a progress meter, `power2.inOut` reads as loading: slow to
   commit, fast through the middle, settling gently on the final figure.

   Two things make the naive version bad rather than merely different:

     1. `new Intl.NumberFormat()` inside `onUpdate`. Constructing a formatter
        costs tens of microseconds and it is being constructed 60-120 times a
        second, per counter, for no benefit. One instance, hoisted.
     2. Rendering the value as React children. A tween writing through
        `setState` at display refresh rate re-renders the subtree every frame,
        and any *parent* re-render snaps the number back to whatever the last
        committed value was. The live node here has no React children at all.
   ========================================================================== */

export interface EasedNumberCounterProps {
  /** Value to land on. */
  to: number;
  /** Value to start from. */
  from?: number;
  /** Seconds. */
  duration?: number;
  /** Any GSAP ease string. The count reads mechanical with `none`. */
  ease?: string;
  /** Seconds to wait after the trigger before counting. */
  delay?: number;
  /** BCP 47 tag. `undefined` uses the runtime's default locale. */
  locale?: string;
  /** Fixed fraction digits. Also the rounding — no `Math.round` needed. */
  decimals?: number;
  /** Thousands separators. */
  grouping?: boolean;
  prefix?: string;
  suffix?: string;
  /** Count when scrolled into view rather than on mount. */
  startOnView?: boolean;
  className?: string;
  onComplete?: () => void;
}

// #region critical
const DURATION = 1.6;
const EASE = 'power2.inOut';
const VIEW_THRESHOLD = 0.6;

export function EasedNumberCounter({
  to,
  from = 0,
  duration = DURATION,
  ease = EASE,
  delay = 0,
  locale,
  decimals = 0,
  grouping = true,
  prefix = '',
  suffix = '',
  startOnView = true,
  className,
  onComplete,
}: EasedNumberCounterProps) {
  const root = useRef<HTMLSpanElement>(null);
  const live = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const { inView } = useInView(root, { threshold: VIEW_THRESHOLD, once: true });

  // Held in a ref so an inline arrow from the caller does not restart the
  // count on every parent render.
  const complete = useRef(onComplete);
  complete.current = onComplete;

  // One formatter for the whole tween, keyed only on the primitives that
  // change it. An options *object* prop would be a new reference every render
  // and would rebuild the formatter — and restart the tween — continuously.
  const format = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: grouping,
      }),
    [locale, decimals, grouping],
  );

  useEffect(() => {
    const el = live.current;
    if (!el) return;

    const counter = { v: from };
    const write = () => {
      el.textContent = `${prefix}${format.format(counter.v)}${suffix}`;
    };

    // Reduced motion is the final figure, immediately — not a blank slot and
    // not a 0.01s tween that still flickers through every intermediate value.
    if (reduced) {
      counter.v = to;
      write();
      complete.current?.();
      return;
    }

    write();
    if (startOnView && !inView) return;

    const tween = gsap.to(counter, {
      v: to,
      duration,
      ease,
      delay,
      overwrite: true,
      onUpdate: write,
      onComplete: () => {
        // Snap to the exact target. Floating-point tweens land on
        // 99.99999999 often enough that a counter visibly stopping one short
        // of its own headline number is a real bug report.
        counter.v = to;
        write();
        complete.current?.();
      },
    });

    return () => {
      tween.kill();
    };
  }, [
    from,
    to,
    duration,
    ease,
    delay,
    prefix,
    suffix,
    format,
    reduced,
    inView,
    startOnView,
  ]);
  // #endregion critical

  // Reserve the wider of the two endpoints. 9 → 10 → 100 each add a digit, and
  // without a reserved box every element after the counter slides right three
  // times while it runs.
  const widest =
    format.format(to).length >= format.format(from).length ? to : from;
  const reserve = `${prefix}${format.format(widest)}${suffix}`;

  return (
    <span ref={root} className={cn('inline-grid tabular-nums', className)}>
      {/* Sizer. Transparent rather than `visibility: hidden`, because hidden
          also removes it from the accessibility tree — this copy is what a
          screen reader and a no-JS render actually get. */}
      <span className="col-start-1 row-start-1 select-none text-transparent">
        {reserve}
      </span>
      {/* Live node. No React children, by design: it is written with
          `textContent` from the tween and React must never diff it. */}
      <span
        ref={live}
        aria-hidden
        className="col-start-1 row-start-1 justify-self-start"
      />
    </span>
  );
}
