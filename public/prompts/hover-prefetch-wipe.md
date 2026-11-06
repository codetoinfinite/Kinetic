# Build: Prefetch-On-Hover Wipe

Two halves of one idea: spend the gap between "the visitor has decided" and "the visitor has clicked" making the next page free. `pointerenter` on any link inside the container prefetches it — 200 to 800 ms of warm-up nobody paid for — and the click covers the screen with a wipe, navigating only once the wipe has genuinely finished covering. Both halves are delegated from a single container, and the same predicate that decides what to intercept decides what to prefetch, so a download link or a cross-origin link is left entirely alone by both.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Warms the next page on hover, wipes the screen on click, and navigates once the wipe has actually covered.

- Category: transition
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. One container holds both delegated listeners. The click listener bubbles normally; the `pointerenter` listener cannot, because `pointerenter` does not bubble at all — so it is registered with `{ capture: true }`. The capture phase runs root-to-target for every event whether it bubbles or not, which makes it the only way to delegate the pointer-enter family.
2. `resolveLink` walks up from the event target with `closest('a[href]')` and returns null for anything the browser must handle itself: a `target` other than `_self`, a `download` attribute, `rel="external"`, a different origin, or a hash pointing at the current document. It gates both halves — a link you must not intercept is a link you must not prefetch either, and a cross-origin prefetch leaks the visitor's intent to a third party.
3. The prefetch is `onPrefetch(href)` if a callback was supplied, otherwise an injected `<link rel="prefetch" as="document">`. `as="document"` matters: without it the browser cannot pick a cache partition or a priority and will report the hint as unused even when the navigation follows immediately. A module-scope `Set` of already-hinted hrefs means a nav that remounts on every route change does not re-hint its whole link set each time.
4. The click calls `preventDefault()`, stores the resolved href in a ref, and flips `data-leaving` on the overlay, which runs a `transform: scaleX(0) -> scaleX(1)` transition from the anchored edge. Navigation waits for `transitionend`, filtered on both `event.target === overlay` and `event.propertyName === "transform"`, because `transitionend` fires once per property and also for descendants.
5. `transitionend` never fires for an element that is not being rendered — a `display: none` ancestor, a tab backgrounded mid-wipe — so a `duration + 120 ms` timer races it and a `fired` flag makes whichever wins the only one that navigates. A navigation that silently never happens is a dead link, which is strictly worse than an early one.
6. A `pageshow` listener clears the wipe. Back-navigation out of the browser's back/forward cache restores the DOM exactly as it was left, including the wipe mid-cover, with no script running to undo it — and `pageshow` is the only event dispatched on a bfcache restore. `load` is not, and neither are React's mount effects. `data-instant` suppresses the transition for exactly one frame so the restore snaps rather than playing a reveal of a page the visitor already saw.
7. The base rule carries an ease-out curve and the `[data-leaving="true"]` rule overrides the timing function with an ease-in, so covering accelerates away and retracting decelerates into place. One declaration, and it is the difference between a page transition and a garage door.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `duration = 0.3`
  Seconds to cover. This is dead time the visitor pays for on every click, so it is priced against the prefetch: roughly 300 ms is what a warm document needs to parse and paint, which is why the wipe and the fetch finish together. Past ~0.5 s the wipe is the slowest part of the navigation it was added to hide.
- `SAFETY_MS = 120`
  Milliseconds past the duration before navigation is forced. Long enough to lose the race with a real `transitionend` under load — a frame or two of jank costs more than 16 ms — short enough that a wipe which genuinely never rendered does not strand the visitor.
- `cover ease = cubic-bezier(0.4, 0, 1, 1)`
  Ease-in, no ease-out. The wipe must be at its fastest as it reaches full coverage: the last sliver of uncovered page is the part that reads as sluggishness, and an ease-out spends its longest stretch there.
- `retract ease = cubic-bezier(0, 0, 0.2, 1)`
  Ease-out, the mirror. Arriving should settle rather than snap. Reusing the cover curve for the retract makes the wipe linger and then flick away, because a reversed transition traverses the same curve in the same direction.
- `zIndex = 190`
  Above a custom cursor (150) and a scroll progress bar (120), both of which must be hidden while the screen is covered, and below a preloader (200), which owns first load outright.

## API

```ts
function HoverPrefetchWipe(props: { children: ReactNode; onNavigate: (href: string) => void; onPrefetch?: (href: string) => void; pageKey?: string; duration?: number; color?: string; direction?: "left" | "right" | "up" | "down"; zIndex?: number; position?: "fixed" | "absolute"; className?: string }): JSX.Element
```

- `children: ReactNode`
  Anything containing anchors. Every `<a href>` inside is handled by delegation.
- `onNavigate: (href: string) => void`
  Runs once the wipe has fully covered. Receives `pathname + search + hash`, which is what a router expects.
- `onPrefetch: (href: string) => void`
  The framework-specific half. Omitted, a `<link rel="prefetch" as="document">` is injected instead.
- `pageKey: string`
  Identity of the current page; a change retracts the wipe. Leave undefined for a full document navigation so the cover holds.
- `duration: number` — default `0.3`
  Seconds to cover, and to retract.
- `color: string` — default `'#fff'`
  Any CSS colour. Must be opaque or the swap shows through.
- `direction: "left" | "right" | "up" | "down"` — default `"left"`
  Edge the wipe grows from.
- `zIndex: number` — default `190`
  Above a custom cursor and a progress bar, below a preloader.
- `position: "fixed" | "absolute"` — default `"fixed"`
  `absolute` to scope the wipe to a bounded box; `fixed` for a real page transition.
- `className: string`
  Merged onto the container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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

  // Same document. Nothing to fetch, and covering the screen in order to
  // scroll down the page is absurd.
  //
  // The hash is deliberately not part of this test, and that is the whole
  // point. Requiring one meant a plain `<a href="/work">` clicked while
  // already on `/work` — the nav item for the page you are on, the most
  // common accidental click there is — was treated as a real navigation:
  // `preventDefault()` suppressed the browser, the wipe covered the screen,
  // and `onNavigate` was handed the route already showing. `pageKey` then
  // never changed, so the retract effect below early-returned on
  // `seenKey.current === pageKey` and nothing else in the component ever
  // clears `leaving`. The overlay takes `pointer-events: auto` while it
  // covers, so the site stayed opaque and unclickable until a hard reload.
  if (
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Both delegated listeners are removed with the same `{ capture: true }` flag they were added with, or the removal silently fails to match. The `transitionend` listener and the safety timer are torn down together whenever the leaving state changes, the rAF that re-enables the transition after a bfcache restore is cancelled, and the `pageshow` listener is removed on unmount. Injected `<link rel="prefetch">` tags are deliberately left in the head: removing a hint mid-flight cancels the fetch it exists to start.

**Reduced motion.** The overlay gets `display: none` and the click handler calls `onNavigate` synchronously, so navigation is a hard cut with no coloured frame in either direction. Not a zero-duration wipe — that is still one painted frame of full-bleed colour, which is a flash. The prefetch half is untouched, because a warm cache is not motion and is precisely the thing a visitor on a slow connection wants kept.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Delegating `pointerenter` with a normal bubbling listener. It does not bubble, so the handler fires only when the pointer enters the container itself — once — and every link in the nav is silently never prefetched. `{ capture: true }` is not an optimisation here, it is the mechanism.
- Prefetching everything on mount. A nav of twelve links becomes twelve speculative document fetches competing with the page the visitor is actually reading. Hover is the signal that makes it worth the bandwidth.
- Prefetching cross-origin hrefs. Beyond the wasted request, it tells a third party which of its pages this visitor was considering before they chose. `resolveLink` rejects them for both halves.
- Navigating on a timer instead of `transitionend`. Under load the timer fires while the page is still visible through a half-drawn wipe, which is the exact artefact the wipe exists to hide. Under a throttled background tab it fires long after.
- Trusting `transitionend` alone. It never fires for an unrendered element, so a wipe inside a collapsed ancestor turns every link into a no-op. The safety timer is not belt-and-braces, it is the only thing standing between a CSS edge case and a dead nav.
- Filtering `transitionend` on neither target nor property name. It fires once per animated property and bubbles from descendants, so a hover transition on a child inside the overlay triggers the navigation early.
- Forgetting `pageshow`. On a bfcache restore the visitor lands on a full-bleed sheet of colour with nothing running to clear it. This is the single most common way a wipe transition ships broken, because it never reproduces on a hard reload.
- Leaving the overlay `pointer-events: none` while it covers. The outgoing page is still live underneath, so a second click on a nav item queues a second navigation behind an opaque surface. It flips to `auto` only in the leaving state, because at rest it must not eat the click it is waiting for.
- Retracting the wipe immediately after a full document navigation. The browser keeps painting the old page until the new one is ready, so lowering the curtain early re-reveals the page just left. That is why the retract is driven by `pageKey` and why leaving it undefined holds the cover.

## Notes

- Next.js App Router: `onPrefetch={(href) => router.prefetch(href)}`, `onNavigate={(href) => router.push(href)}`, `pageKey={usePathname()}`. Nothing in this file imports `next/link` or `next/navigation` — the prefetch half is the only framework-specific part of the technique, so it is a callback, and `router.prefetch` already dedupes and no-ops in dev.
- React Router: `onPrefetch` can stay omitted and let the injected `<link rel="prefetch">` warm the loader's data URL, or call your own route-module preloader. `pageKey={useLocation().pathname}`.
- Plain multi-page site: omit `onPrefetch` entirely and set `onNavigate={(href) => window.location.assign(href)}`. Leave `pageKey` undefined so the wipe stays up while the browser fetches, and let `pageshow` clear it on Back.
- Wrap the whole layout, not each nav: one container, one overlay, one pair of listeners, and every link on the page is covered including ones rendered later. `position="fixed"` for that; `absolute` only when the transition is scoped to a panel.
- The colour must be opaque. A translucent wipe shows the outgoing page through the swap, which is the one artefact the whole sequence exists to prevent.
- Pairs with `page-reveal-overlay` if you want the inbound half animated too — this component covers and hands off, that one replays a reveal on arrival.

## Definition of done

Hover a nav item and its dot lights — the href has been hinted, once, and hovering again does not re-hint. Click and the panel wipes over from the left in 0.4 s, the content swaps while covered, and the wipe retracts to the same edge with the opposite ease. Cmd-click, middle-click and a `download` link all behave like ordinary links with no wipe. On a real site, navigate away and press Back: the page appears with no leftover overlay and no reveal animation. With reduced motion the content swaps instantly and no coloured surface is ever painted.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
