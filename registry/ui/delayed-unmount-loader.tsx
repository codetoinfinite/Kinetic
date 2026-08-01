'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Delayed-Unmount Loader
   --------------------------------------------------------------------------
   The entire technique is that the component does NOT unmount when loading
   ends. It sets `data-exit`, which starts a 600 ms CSS opacity transition,
   and only removes itself 600 ms later. Unmounting on the signal removes the
   node before the transition can run, and the loader vanishes on a cut — the
   bug everyone then tries to fix by reaching for an animation library.

   No JS animates anything here. One state flag, one timeout, one transition.
   ========================================================================== */

export interface DelayedUnmountLoaderProps {
  /** While true the overlay is opaque. Flip to false to begin the reveal. */
  loading: boolean;
  /** Fade length in ms. Must match the unmount delay — it drives both. */
  exitMs?: number;
  /** Left-hand text. */
  label?: string;
  /** Right-hand text. */
  hint?: string;
  /**
   * `fixed` covers the viewport (real usage). `absolute` covers the nearest
   * positioned ancestor, which is what you want inside a preview or a card.
   */
  position?: 'fixed' | 'absolute';
  className?: string;
}

const CSS = `
.k-dul {
  opacity: 1;
  transition: opacity var(--k-dul-exit) cubic-bezier(0.4, 0, 0.2, 1);
}
.k-dul[data-exit='true'] {
  opacity: 0;
  pointer-events: none;
}
@keyframes k-dul-pulse {
  0%, 100% { opacity: 0.25; transform: scale(0.86); }
  50%      { opacity: 1;    transform: scale(1); }
}
.k-dul-dot { animation: k-dul-pulse 1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .k-dul-dot { animation: none; opacity: 0.7; }
  .k-dul { transition-duration: 1ms; }
}
`;

// #region critical
export function DelayedUnmountLoader({
  loading,
  exitMs = 600,
  label = 'Loading experience',
  hint = 'it won’t be long',
  position = 'fixed',
  className,
}: DelayedUnmountLoaderProps) {
  // Starts true so the overlay is in the very first paint. Deriving it from
  // `loading` alone is what makes the exit un-animatable.
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (loading) {
      // A second load (route change, refetch) re-arms the overlay.
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [loading, exitMs]);

  if (!mounted && !loading) return null;

  return (
    <div
      // `data-exit` is the only thing that changes on the element. The
      // transition is declarative, so an interrupted reveal (loading goes
      // true again mid-fade) reverses from wherever it got to instead of
      // jumping.
      data-exit={!loading}
      aria-hidden={!loading}
      className={cn(
        'k-dul z-50 flex items-center justify-center',
        // Inverted: the loader is the page's negative, so the reveal reads as
        // a tonal flip rather than a curtain being pulled aside.
        'bg-fg text-bg',
        position === 'fixed' ? 'fixed inset-0' : 'absolute inset-0',
        className,
      )}
      style={{ ['--k-dul-exit' as string]: `${exitMs}ms` }}
    >
      <style>{CSS}</style>
      <div className="flex w-full items-center justify-between gap-2 px-4">
        <p className="w-1/3 font-mono text-[0.6875rem] uppercase leading-none tracking-[0.08em]">
          {label}
        </p>
        <p className="flex w-1/3 justify-center font-mono text-2xl leading-none tracking-[0.1em]">
          <span aria-hidden>[</span>
          <span className="k-dul-dot inline-block px-[0.15em]" aria-hidden>
            &middot;
          </span>
          <span aria-hidden>]</span>
        </p>
        <p className="w-1/3 text-right font-mono text-[0.6875rem] uppercase leading-none tracking-[0.08em]">
          {hint}
        </p>
      </div>
    </div>
  );
}
// #endregion critical
