import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'hover-prefetch-wipe',
  title: 'Prefetch-On-Hover Wipe',
  category: 'transition',
  tags: ['prefetch', 'event-delegation', 'bfcache', 'overlay', 'pointerenter'],
  blurb:
    'Warms the next page on hover, wipes the screen on click, and navigates once the wipe has actually covered.',
  cost: 'dom',
  motif: 'stack',

  files: [
    { path: 'registry/ui/hover-prefetch-wipe.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/hooks/use-reduced-motion.ts', type: 'registry:hook', role: 'motion preference' },
  ],
  dependencies: [],

  summary:
    'Two halves of one idea: spend the gap between "the visitor has decided" and "the visitor has clicked" making the next page free. `pointerenter` on any link inside the container prefetches it — 200 to 800 ms of warm-up nobody paid for — and the click covers the screen with a wipe, navigating only once the wipe has genuinely finished covering. Both halves are delegated from a single container, and the same predicate that decides what to intercept decides what to prefetch, so a download link or a cross-origin link is left entirely alone by both.',

  mechanism: [
    'One container holds both delegated listeners. The click listener bubbles normally; the `pointerenter` listener cannot, because `pointerenter` does not bubble at all — so it is registered with `{ capture: true }`. The capture phase runs root-to-target for every event whether it bubbles or not, which makes it the only way to delegate the pointer-enter family.',
    '`resolveLink` walks up from the event target with `closest(\'a[href]\')` and returns null for anything the browser must handle itself: a `target` other than `_self`, a `download` attribute, `rel="external"`, a different origin, or a hash pointing at the current document. It gates both halves — a link you must not intercept is a link you must not prefetch either, and a cross-origin prefetch leaks the visitor\'s intent to a third party.',
    'The prefetch is `onPrefetch(href)` if a callback was supplied, otherwise an injected `<link rel="prefetch" as="document">`. `as="document"` matters: without it the browser cannot pick a cache partition or a priority and will report the hint as unused even when the navigation follows immediately. A module-scope `Set` of already-hinted hrefs means a nav that remounts on every route change does not re-hint its whole link set each time.',
    'The click calls `preventDefault()`, stores the resolved href in a ref, and flips `data-leaving` on the overlay, which runs a `transform: scaleX(0) -> scaleX(1)` transition from the anchored edge. Navigation waits for `transitionend`, filtered on both `event.target === overlay` and `event.propertyName === "transform"`, because `transitionend` fires once per property and also for descendants.',
    '`transitionend` never fires for an element that is not being rendered — a `display: none` ancestor, a tab backgrounded mid-wipe — so a `duration + 120 ms` timer races it and a `fired` flag makes whichever wins the only one that navigates. A navigation that silently never happens is a dead link, which is strictly worse than an early one.',
    'A `pageshow` listener clears the wipe. Back-navigation out of the browser\'s back/forward cache restores the DOM exactly as it was left, including the wipe mid-cover, with no script running to undo it — and `pageshow` is the only event dispatched on a bfcache restore. `load` is not, and neither are React\'s mount effects. `data-instant` suppresses the transition for exactly one frame so the restore snaps rather than playing a reveal of a page the visitor already saw.',
    'The base rule carries an ease-out curve and the `[data-leaving="true"]` rule overrides the timing function with an ease-in, so covering accelerates away and retracting decelerates into place. One declaration, and it is the difference between a page transition and a garage door.',
  ],

  constants: [
    {
      name: 'duration',
      value: '0.3',
      why: 'Seconds to cover. This is dead time the visitor pays for on every click, so it is priced against the prefetch: roughly 300 ms is what a warm document needs to parse and paint, which is why the wipe and the fetch finish together. Past ~0.5 s the wipe is the slowest part of the navigation it was added to hide.',
    },
    {
      name: 'SAFETY_MS',
      value: '120',
      why: 'Milliseconds past the duration before navigation is forced. Long enough to lose the race with a real `transitionend` under load — a frame or two of jank costs more than 16 ms — short enough that a wipe which genuinely never rendered does not strand the visitor.',
    },
    {
      name: 'cover ease',
      value: 'cubic-bezier(0.4, 0, 1, 1)',
      why: 'Ease-in, no ease-out. The wipe must be at its fastest as it reaches full coverage: the last sliver of uncovered page is the part that reads as sluggishness, and an ease-out spends its longest stretch there.',
    },
    {
      name: 'retract ease',
      value: 'cubic-bezier(0, 0, 0.2, 1)',
      why: 'Ease-out, the mirror. Arriving should settle rather than snap. Reusing the cover curve for the retract makes the wipe linger and then flick away, because a reversed transition traverses the same curve in the same direction.',
    },
    {
      name: 'zIndex',
      value: '190',
      why: 'Above a custom cursor (150) and a scroll progress bar (120), both of which must be hidden while the screen is covered, and below a preloader (200), which owns first load outright.',
    },
  ],

  pitfalls: [
    'Delegating `pointerenter` with a normal bubbling listener. It does not bubble, so the handler fires only when the pointer enters the container itself — once — and every link in the nav is silently never prefetched. `{ capture: true }` is not an optimisation here, it is the mechanism.',
    'Prefetching everything on mount. A nav of twelve links becomes twelve speculative document fetches competing with the page the visitor is actually reading. Hover is the signal that makes it worth the bandwidth.',
    'Prefetching cross-origin hrefs. Beyond the wasted request, it tells a third party which of its pages this visitor was considering before they chose. `resolveLink` rejects them for both halves.',
    'Navigating on a timer instead of `transitionend`. Under load the timer fires while the page is still visible through a half-drawn wipe, which is the exact artefact the wipe exists to hide. Under a throttled background tab it fires long after.',
    'Trusting `transitionend` alone. It never fires for an unrendered element, so a wipe inside a collapsed ancestor turns every link into a no-op. The safety timer is not belt-and-braces, it is the only thing standing between a CSS edge case and a dead nav.',
    'Filtering `transitionend` on neither target nor property name. It fires once per animated property and bubbles from descendants, so a hover transition on a child inside the overlay triggers the navigation early.',
    'Forgetting `pageshow`. On a bfcache restore the visitor lands on a full-bleed sheet of colour with nothing running to clear it. This is the single most common way a wipe transition ships broken, because it never reproduces on a hard reload.',
    'Leaving the overlay `pointer-events: none` while it covers. The outgoing page is still live underneath, so a second click on a nav item queues a second navigation behind an opaque surface. It flips to `auto` only in the leaving state, because at rest it must not eat the click it is waiting for.',
    'Retracting the wipe immediately after a full document navigation. The browser keeps painting the old page until the new one is ready, so lowering the curtain early re-reveals the page just left. That is why the retract is driven by `pageKey` and why leaving it undefined holds the cover.',
  ],

  notes: [
    'Next.js App Router: `onPrefetch={(href) => router.prefetch(href)}`, `onNavigate={(href) => router.push(href)}`, `pageKey={usePathname()}`. Nothing in this file imports `next/link` or `next/navigation` — the prefetch half is the only framework-specific part of the technique, so it is a callback, and `router.prefetch` already dedupes and no-ops in dev.',
    'React Router: `onPrefetch` can stay omitted and let the injected `<link rel="prefetch">` warm the loader\'s data URL, or call your own route-module preloader. `pageKey={useLocation().pathname}`.',
    'Plain multi-page site: omit `onPrefetch` entirely and set `onNavigate={(href) => window.location.assign(href)}`. Leave `pageKey` undefined so the wipe stays up while the browser fetches, and let `pageshow` clear it on Back.',
    'Wrap the whole layout, not each nav: one container, one overlay, one pair of listeners, and every link on the page is covered including ones rendered later. `position="fixed"` for that; `absolute` only when the transition is scoped to a panel.',
    'The colour must be opaque. A translucent wipe shows the outgoing page through the swap, which is the one artefact the whole sequence exists to prevent.',
    'Pairs with `page-reveal-overlay` if you want the inbound half animated too — this component covers and hands off, that one replays a reveal on arrival.',
  ],

  apiSignature:
    'function HoverPrefetchWipe(props: { children: ReactNode; onNavigate: (href: string) => void; onPrefetch?: (href: string) => void; pageKey?: string; duration?: number; color?: string; direction?: "left" | "right" | "up" | "down"; zIndex?: number; position?: "fixed" | "absolute"; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Anything containing anchors. Every `<a href>` inside is handled by delegation.' },
    { name: 'onNavigate', type: '(href: string) => void', description: 'Runs once the wipe has fully covered. Receives `pathname + search + hash`, which is what a router expects.' },
    { name: 'onPrefetch', type: '(href: string) => void', description: 'The framework-specific half. Omitted, a `<link rel="prefetch" as="document">` is injected instead.' },
    { name: 'pageKey', type: 'string', description: 'Identity of the current page; a change retracts the wipe. Leave undefined for a full document navigation so the cover holds.' },
    { name: 'duration', type: 'number', default: '0.3', description: 'Seconds to cover, and to retract.' },
    { name: 'color', type: 'string', default: "'#fff'", description: 'Any CSS colour. Must be opaque or the swap shows through.' },
    { name: 'direction', type: '"left" | "right" | "up" | "down"', default: '"left"', description: 'Edge the wipe grows from.' },
    { name: 'zIndex', type: 'number', default: '190', description: 'Above a custom cursor and a progress bar, below a preloader.' },
    { name: 'position', type: '"fixed" | "absolute"', default: '"fixed"', description: '`absolute` to scope the wipe to a bounded box; `fixed` for a real page transition.' },
    { name: 'className', type: 'string', description: 'Merged onto the container via `cn`.' },
  ],

  reducedMotion:
    'The overlay gets `display: none` and the click handler calls `onNavigate` synchronously, so navigation is a hard cut with no coloured frame in either direction. Not a zero-duration wipe — that is still one painted frame of full-bleed colour, which is a flash. The prefetch half is untouched, because a warm cache is not motion and is precisely the thing a visitor on a slow connection wants kept.',

  cleanup:
    'Both delegated listeners are removed with the same `{ capture: true }` flag they were added with, or the removal silently fails to match. The `transitionend` listener and the safety timer are torn down together whenever the leaving state changes, the rAF that re-enables the transition after a bfcache restore is cancelled, and the `pageshow` listener is removed on unmount. Injected `<link rel="prefetch">` tags are deliberately left in the head: removing a hint mid-flight cancels the fetch it exists to start.',

  acceptance:
    'Hover a nav item and its dot lights — the href has been hinted, once, and hovering again does not re-hint. Click and the panel wipes over from the left in 0.4 s, the content swaps while covered, and the wipe retracts to the same edge with the opposite ease. Cmd-click, middle-click and a `download` link all behave like ordinary links with no wipe. On a real site, navigate away and press Back: the page appears with no leftover overlay and no reveal animation. With reduced motion the content swaps instantly and no coloured surface is ever painted.',

  criticalRegion: 'critical',
};

export default meta;
