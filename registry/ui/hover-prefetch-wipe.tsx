'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Prefetch-On-Hover Wipe
   --------------------------------------------------------------------------
   Two halves of one idea: spend the gap between "the visitor has decided" and
   "the visitor has clicked" making the next page free.

     pointerenter -> prefetch starts        (200-800 ms of free warm-up)
     click        -> wipe covers the screen (0.3 s)
     wipe covered -> navigate               (destination already cached)
     page key     -> wipe retracts

   Both halves are delegated from one container, which is the only way to cover
   every link in a nav without wrapping each one. The catch is that
   `pointerenter` does not bubble — so the delegated listener is registered
   with `{ capture: true }`, because the capture phase runs root-to-target for
   every event whether it bubbles or not.

   The third half nobody writes is `pageshow`. Back-navigation out of the
   browser's back/forward cache restores the DOM exactly as it was left,
   including the wipe mid-cover, with no script running to clear it — so the
   visitor who presses Back lands on a blank sheet of colour. `pageshow` is the
   only event dispatched on a bfcache restore; `load` is not, and neither are
   React's mount effects.
   ========================================================================== */

// #region critical
/**
 * Hrefs already hinted to the browser. Module scope, so it is shared across
 * instances and survives remounts: a nav that remounts on every route change
 * would otherwise re-hint its entire link set on every navigation.
 */
const prefetched = new Set<string>();

/**
 * Milliseconds past the wipe duration before the navigation is forced.
 * `transitionend` is the accurate signal but it never fires if the overlay is
 * not being rendered — a `display: none` ancestor, a tab backgrounded mid-wipe
 * — and a navigation that silently never happens is a dead link.
 */
const SAFETY_MS = 120;

const WIPE_CSS = `
.kinetic-wipe {
  position: absolute;
  inset: 0;
  background: var(--kx-wipe-color, #fff);
  transform: var(--kx-wipe-from, scaleX(0));
  transform-origin: var(--kx-wipe-origin, left center);
  /* Base curve is the RETRACT: ease-out, so arriving decelerates. */
  transition: transform var(--kx-wipe-duration, 0.3s)
    cubic-bezier(0, 0, 0.2, 1);
  will-change: transform;
  /* Transparent and idle: must not eat the click it is waiting for. */
  pointer-events: none;
}
.kinetic-wipe[data-fixed='true'] {
  position: fixed;
}
.kinetic-wipe[data-leaving='true'] {
  transform: var(--kx-wipe-to, scaleX(1));
  /* Cover curve: ease-in, so leaving accelerates away. Asymmetry is the
     difference between a page transition and a garage door. */
  transition-timing-function: cubic-bezier(0.4, 0, 1, 1);
  /* Covering: now it SHOULD eat clicks. The outgoing page is still live
     underneath and a second click on a nav item would queue a second
     navigation behind an opaque surface. */
  pointer-events: auto;
}
/* Set for exactly one frame after a bfcache restore, so the overlay snaps back
   to rest instead of playing a reveal of a page the visitor already saw. */
.kinetic-wipe[data-instant='true'] {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  /* Removed entirely rather than zero-duration: a zero-duration wipe is still
     one painted frame of full-bleed colour, which is a flash. The click
     handler navigates synchronously in this mode, so nothing is lost. */
  .kinetic-wipe { display: none; }
}
`;

/** Per-direction geometry: the two transforms and the anchored edge. */
const GEOMETRY = {
  left: { from: 'scaleX(0)', to: 'scaleX(1)', origin: 'left center' },
  right: { from: 'scaleX(0)', to: 'scaleX(1)', origin: 'right center' },
  up: { from: 'scaleY(0)', to: 'scaleY(1)', origin: 'bottom center' },
  down: { from: 'scaleY(0)', to: 'scaleY(1)', origin: 'top center' },
} as const;

export type WipeDirection = keyof typeof GEOMETRY;

export interface HoverPrefetchWipeProps {
  /** Anything containing anchors. Every `<a href>` inside is handled. */
  children: ReactNode;
  /**
   * Runs once the wipe has fully covered. Receives the app-relative href —
   * `pathname + search + hash` — which is what a router expects.
   */
  onNavigate: (href: string) => void;
  /**
   * The framework-specific half. Next.js: `(href) => router.prefetch(href)`.
   * Omitted, a `<link rel="prefetch" as="document">` is injected instead,
   * which is the right hint for a plain multi-page site.
   */
  onPrefetch?: (href: string) => void;
  /**
   * Identity of the current page — `usePathname()` in Next.js. A change
   * retracts the wipe. Left undefined the wipe stays up after `onNavigate`,
   * which is correct for a full document navigation: the browser keeps
   * painting the old page until the new one is ready, so lowering the curtain
   * early re-reveals the page you just left.
   */
  pageKey?: string;
  /** Seconds the wipe takes to cover, and to retract. */
  duration?: number;
  /** Any CSS colour. Must be opaque or the swap shows through. */
  color?: string;
  /** Edge the wipe grows from. */
  direction?: WipeDirection;
  zIndex?: number;
  /** `absolute` to demo inside a bounded box; `fixed` for a real page. */
  position?: 'fixed' | 'absolute';
  className?: string;
}

/**
 * The anchor a delegated event belongs to, or null if the browser should be
 * left alone. Every clause is a link that would break if intercepted — and the
 * same predicate gates both halves, because a link you must not intercept is a
 * link you must not prefetch either.
 */
function resolveLink(event: Event, root: HTMLElement): HTMLAnchorElement | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;

  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (!root.contains(anchor)) return null;

  // Opens elsewhere, downloads, or is explicitly marked as leaving the site.
  if (anchor.target !== '' && anchor.target !== '_self') return null;
  if (anchor.hasAttribute('download')) return null;
  if (anchor.rel.split(/\s+/).includes('external')) return null;

  // Cross-origin: prefetching leaks the visitor's intent to a third party and
  // intercepting breaks the navigation outright.
  if (anchor.origin !== window.location.origin) return null;

  // Same document, different fragment. Nothing to fetch, and covering the
  // screen in order to scroll down the page is absurd.
  if (
    anchor.hash !== '' &&
    anchor.pathname === window.location.pathname &&
    anchor.search === window.location.search
  ) {
    return null;
  }

  return anchor;
}

function hrefOf(anchor: HTMLAnchorElement): string {
  // Resolved and app-relative. `getAttribute('href')` hands a router raw
  // authored text like '../work', which it cannot resolve on its own.
  return `${anchor.pathname}${anchor.search}${anchor.hash}`;
}

export function HoverPrefetchWipe({
  children,
  onNavigate,
  onPrefetch,
  pageKey,
  duration = 0.3,
  color = '#fff',
  direction = 'left',
  zIndex = 190,
  position = 'fixed',
  className,
}: HoverPrefetchWipeProps) {
  const root = useRef<HTMLDivElement>(null);
  const wipe = useRef<HTMLDivElement>(null);
  const pending = useRef<string | null>(null);
  const reduced = useReducedMotion();

  const [leaving, setLeaving] = useState(false);
  const [instant, setInstant] = useState(false);

  // Held in refs so a new handler identity on the parent's render does not
  // re-bind the delegated listeners.
  const navigate = useRef(onNavigate);
  navigate.current = onNavigate;
  const prefetch = useRef(onPrefetch);
  prefetch.current = onPrefetch;

  /* -- halves one and two, both delegated from the same container ------- */
  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const onEnter = (event: Event) => {
      const anchor = resolveLink(event, el);
      if (!anchor) return;

      const href = hrefOf(anchor);
      if (prefetched.has(href)) return;
      prefetched.add(href);

      const custom = prefetch.current;
      if (custom) {
        custom(href);
        return;
      }

      const link = document.createElement('link');
      link.rel = 'prefetch';
      // Without `as`, the browser cannot choose a cache partition or a
      // priority, and logs the hint as unused even when the navigation
      // follows immediately.
      link.as = 'document';
      link.href = href;
      document.head.appendChild(link);
    };

    const onClick = (event: MouseEvent) => {
      // Someone upstream already handled it, or the visitor asked for a new
      // tab, a new window, or a download. Middle and right clicks are not
      // navigations and must reach the browser untouched.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = resolveLink(event, el);
      if (!anchor) return;

      event.preventDefault();

      if (reduced) {
        navigate.current(hrefOf(anchor));
        return;
      }

      // A wipe already covering owns the navigation. Without this a second
      // click retargets `pending` mid-cover and the visitor lands on a page
      // they never aimed at.
      if (pending.current !== null) return;

      pending.current = hrefOf(anchor);
      setLeaving(true);
    };

    // `pointerenter` does not bubble, so delegation only works in the capture
    // phase — which runs root-to-target for every event, bubbling or not.
    el.addEventListener('pointerenter', onEnter, { capture: true, passive: true });
    el.addEventListener('click', onClick);

    return () => {
      el.removeEventListener('pointerenter', onEnter, { capture: true });
      el.removeEventListener('click', onClick);
    };
  }, [reduced]);

  /* -- navigate only once the wipe has actually finished covering ------- */
  useEffect(() => {
    if (!leaving) return;
    const overlay = wipe.current;
    const href = pending.current;
    if (!overlay || href === null) return;

    let fired = false;
    const commit = () => {
      if (fired) return;
      fired = true;
      navigate.current(href);
    };

    // `transitionend` fires once per animated property and also for
    // descendants, so both filters are required: without the target check a
    // transition on anything inside the overlay would trigger navigation.
    const onEnd = (event: TransitionEvent) => {
      if (event.target !== overlay || event.propertyName !== 'transform') return;
      commit();
    };

    overlay.addEventListener('transitionend', onEnd);
    const safety = window.setTimeout(commit, duration * 1000 + SAFETY_MS);

    return () => {
      overlay.removeEventListener('transitionend', onEnd);
      clearTimeout(safety);
    };
  }, [leaving, duration]);

  /* -- retract when the destination is on screen ----------------------- */
  const seenKey = useRef(pageKey);
  useEffect(() => {
    if (pageKey === undefined || seenKey.current === pageKey) return;
    seenKey.current = pageKey;
    // Driven by the same render that swapped the content in, so there is no
    // window in which the retracting wipe exposes the page just left.
    pending.current = null;
    setLeaving(false);
  }, [pageKey]);

  /* -- half three: survive the back/forward cache ---------------------- */
  useEffect(() => {
    const onShow = () => {
      pending.current = null;
      setInstant(true);
      setLeaving(false);
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  useEffect(() => {
    if (!instant) return;
    // One frame is enough for the resting transform to be committed with the
    // transition suppressed. Re-enable any earlier and style has not been
    // recalculated yet, so the snap becomes a fade after all.
    const frame = requestAnimationFrame(() => setInstant(false));
    return () => cancelAnimationFrame(frame);
  }, [instant]);

  const geometry = GEOMETRY[direction];

  return (
    <div ref={root} className={cn(position === 'absolute' && 'relative', className)}>
      <style href="kinetic-hover-prefetch-wipe" precedence="medium">
        {WIPE_CSS}
      </style>

      {children}

      <div
        ref={wipe}
        aria-hidden
        data-leaving={leaving ? 'true' : 'false'}
        data-instant={instant ? 'true' : 'false'}
        data-fixed={position === 'fixed' ? 'true' : 'false'}
        className="kinetic-wipe"
        style={
          {
            zIndex,
            '--kx-wipe-duration': `${duration}s`,
            '--kx-wipe-color': color,
            '--kx-wipe-from': geometry.from,
            '--kx-wipe-to': geometry.to,
            '--kx-wipe-origin': geometry.origin,
          } as CSSProperties
        }
      />
    </div>
  );
}
// #endregion critical
