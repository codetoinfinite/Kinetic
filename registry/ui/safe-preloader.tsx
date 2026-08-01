'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Preloader That Cannot Hang
   --------------------------------------------------------------------------
   Every hand-rolled preloader eventually ships the same bug: a promise that
   never resolves — a 404 on a font, a decode that fails on iOS, an image
   behind a dead CDN — and the site is a permanent black rectangle. The user
   cannot see the content, cannot tab to it, and has no idea anything loaded.

   Three rules fix it, and all three have to be there:

     CEILING  a hard setTimeout that reveals the page whether or not the
              load signal ever arrives. This is the one that matters. It is
              not a fallback, it is the actual contract: the page WILL be
              visible by T, and the load signal only ever makes it faster.

     FLOOR    a minimum visible time. On a warm cache the signal resolves in
              40 ms, and without a floor the overlay appears and vanishes
              inside two frames — a black flash that reads as a rendering
              fault.

     ONCE     a sessionStorage flag. A preloader is an introduction. Playing
              it again when someone comes back from a second tab is a toll
              booth.
   ========================================================================== */

export interface SafePreloaderProps {
  /** Overlay content. Defaults to a wordmark-sized label. */
  children?: ReactNode;
  /**
   * The load signal. Leave undefined to use the browser's own `load` event,
   * which fires after images, fonts and stylesheets have settled.
   */
  ready?: boolean;
  /** Hard ceiling in ms. The reveal happens by this time no matter what. */
  ceilingMs?: number;
  /** Minimum time the overlay stays up once shown. */
  floorMs?: number;
  /** Fade-out duration in ms. */
  fadeMs?: number;
  /** sessionStorage key. Set `once={false}` to replay on every load. */
  sessionKey?: string;
  once?: boolean;
  /** Fires after the overlay has finished leaving and unmounted. */
  onDone?: () => void;
  position?: 'fixed' | 'absolute';
  className?: string;
}

const CSS = `
.k-safe-pre {
  transition: opacity var(--k-safe-fade, 420ms) cubic-bezier(0.22, 1, 0.36, 1);
  opacity: 1;
}
.k-safe-pre[data-leaving='true'] {
  opacity: 0;
  pointer-events: none;
}
.k-safe-pre__bar {
  transform-origin: left center;
  animation: k-safe-scan 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
@keyframes k-safe-scan {
  0%   { transform: scaleX(0); opacity: 1; }
  60%  { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(1); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .k-safe-pre { transition-duration: 1ms; }
  .k-safe-pre__bar { animation: none; transform: scaleX(1); }
}
`;

function markShown(key: string) {
  try {
    window.sessionStorage.setItem(key, '1');
  } catch {
    /* Safari private mode throws on setItem. A preloader is not worth a crash. */
  }
}

function wasShown(key: string) {
  try {
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function SafePreloader({
  children,
  ready,
  ceilingMs = 4000,
  floorMs = 700,
  fadeMs = 420,
  sessionKey = 'k-preloader',
  once = true,
  onDone,
  position = 'fixed',
  className,
}: SafePreloaderProps) {
  // Starts visible on both server and client so the markup matches. The
  // sessionStorage check happens in a layout effect below — before paint —
  // so a returning visitor never sees a frame of it.
  const [phase, setPhase] = useState<'holding' | 'leaving' | 'gone'>('holding');
  const started = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const revealed = useRef(false);
  const reduced = useReducedMotion();

  const done = useRef(onDone);
  done.current = onDone;

  const clearTimers = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);

  // #region critical
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
  // #endregion critical

  useEffect(() => clearTimers, [clearTimers]);

  if (phase === 'gone') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-leaving={phase === 'leaving'}
      style={{ ['--k-safe-fade' as string]: `${fadeMs}ms` }}
      className={cn(
        'k-safe-pre z-50 flex flex-col items-center justify-center gap-4 bg-fg text-bg',
        position === 'fixed' ? 'fixed inset-0' : 'absolute inset-0',
        className,
      )}
    >
      <style>{CSS}</style>
      {children ?? (
        <>
          <span className="meta opacity-70">Loading</span>
          <div className="h-px w-32 overflow-hidden bg-current/25">
            <div className="k-safe-pre__bar h-full w-full bg-current" />
          </div>
        </>
      )}
    </div>
  );
}
