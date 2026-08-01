# Build: IntersectionObserver Reveal

A wrapper that fades and lifts its child into place the first time it enters the scroll container. The transition is one inline string built from four numbers, so nothing is injected into the document and nothing has to load. Every instance that asks for the same root and the same observation box shares one IntersectionObserver, which is what makes it safe to put two hundred of these on a page.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

One element, one fade-and-rise on entry, no stylesheet and no library — with a single observer shared across every instance.

- Category: scroll
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The element renders at `opacity: 0` and `translate3d(0, 28px, 0)` with a transition string of `opacity 0.7s cubic-bezier(0.22,1,0.36,1) {delay}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) {delay}s`. State flips both properties at once, so the browser interpolates on the compositor and the main thread does nothing after the flip.
2. The observer is pooled in a two-level module map: root element first, then a `rootMargin|threshold` string. `null` is a legal Map key, so "the viewport" gets its own bucket without a sentinel. Each bucket holds a `Map<Element, handler>` and the observer callback dispatches by target — one callback for every reveal in a container.
3. The pool is refcounted. Teardown deletes the handler and unobserves, then disconnects and drops the bucket only when the last target has left. Disconnecting per instance would tear the shared observer out from under every other reveal in the same container.
4. The root is resolved as: an explicit `scroller` ref, else the first ancestor whose computed `overflow-x` or `overflow-y` is `auto`, `scroll` or `overlay`, else `null` for the viewport. `window` is never referenced, so the component behaves the same inside a 320 px preview card as on a full page.
5. `threshold: 0.15` with `rootMargin: "0px 0px -8% 0px"` shrinks the observation box 8% up from the bottom, so an element must be genuinely inside the container before it fires rather than merely touching its edge.
6. Staggering is the caller's job and costs one number: give siblings `delay={0}`, `0.08`, `0.16`. There is no group concept and no shared timeline, which is precisely what keeps the component this small.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `duration = 0.7`
  Seconds. Long enough that a 28 px rise reads as a settle rather than a snap; past ~1s a fast scroller has already read the text while it is still moving.
- `distance = 28`
  Pixels of travel. Roughly one and a half line heights — the element stays inside its own block, so the reveal reads as the content arriving rather than as a card flying in from off-screen. Above ~60 px the motion starts to compete with the scroll itself.
- `ease = cubic-bezier(0.22, 1, 0.36, 1)`
  Ease-out-quint. Most of the travel is spent in the first third, which is what makes a reveal feel like arrival. A symmetric curve on an entrance always reads as sluggish because the slow part happens while the element is still visibly out of place.
- `threshold = 0.15`
  15% of the element must be visible. At 0 a single intersecting pixel fires the reveal, so a tall element finishes animating before it is on screen. Above ~0.4 an element taller than the container can never satisfy it and never reveals at all.
- `rootMargin = 0px 0px -8% 0px`
  The negative bottom is the whole point: it pulls the trigger line 8% up from the container's bottom edge so the element is inside the box, not touching it. A positive bottom margin fires below the fold and the user scrolls onto content that has already finished.

## API

```ts
function IoReveal(props: { children: ReactNode; scroller?: RefObject<HTMLElement | null>; delay?: number; duration?: number; distance?: number; ease?: string; threshold?: number; rootMargin?: string; repeat?: boolean; as?: ElementType; className?: string }): JSX.Element
```

- `children: ReactNode`
  The revealed content.
- `scroller: RefObject<HTMLElement | null>`
  Scroll container for the observer. Omit and the nearest scrollable ancestor is found by walking computed overflow.
- `delay: number` — default `0`
  Seconds of delay. Staggering siblings is done by passing 0, 0.08, 0.16.
- `duration: number` — default `0.7`
  Seconds of travel and fade.
- `distance: number` — default `28`
  Starting vertical offset in pixels. Positive rises into place.
- `ease: string` — default `'cubic-bezier(0.22, 1, 0.36, 1)'`
  Any CSS timing function.
- `threshold: number` — default `0.15`
  Fraction of the element that must be visible before it fires.
- `rootMargin: string` — default `'0px 0px -8% 0px'`
  Observation box inset. Part of the shared-observer pool key.
- `repeat: boolean` — default `false`
  Re-hide when the element leaves. Off by default, which also lets settled targets be unobserved.
- `as: ElementType` — default `'div'`
  Element to render, so the wrapper can be inline or a list item.
- `className: string`
  Merged onto the rendered element.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/* --------------------------------------------------------------------------
   The shared observer pool.

   Keyed by root element first, then by the option string. `null` is a legal
   key in a Map, which is what lets "the viewport" share a bucket with itself
   without a sentinel value. Each bucket refcounts its targets and the
   observer is disconnected when the last one leaves, so a route change does
   not leave observers watching detached nodes.
   -------------------------------------------------------------------------- */
type Handler = (entry: IntersectionObserverEntry) => void;

interface Bucket {
  observer: IntersectionObserver;
  handlers: Map<Element, Handler>;
}

const pools = new Map<Element | null, Map<string, Bucket>>();

function bucketFor(root: Element | null, rootMargin: string, threshold: number): Bucket {
  let byOptions = pools.get(root);
  if (!byOptions) {
    byOptions = new Map<string, Bucket>();
    pools.set(root, byOptions);
  }
  const key = `${rootMargin}|${threshold}`;
  const existing = byOptions.get(key);
  if (existing) return existing;

  const handlers = new Map<Element, Handler>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) handlers.get(entry.target)?.(entry);
    },
    { root, rootMargin, threshold },
  );
  const bucket: Bucket = { observer, handlers };
  byOptions.set(key, bucket);
  return bucket;
}

function release(root: Element | null, rootMargin: string, threshold: number): void {
  const byOptions = pools.get(root);
  if (!byOptions) return;
  const key = `${rootMargin}|${threshold}`;
  const bucket = byOptions.get(key);
  if (!bucket || bucket.handlers.size > 0) return;
  bucket.observer.disconnect();
  byOptions.delete(key);
  if (byOptions.size === 0) pools.delete(root);
}

/**
 * Nearest ancestor that actually scrolls. An `overflow: auto` element that has
 * not overflowed yet still counts: it is the container this reveal will live
 * inside once content arrives. Returning `null` means the viewport, which is
 * the value IntersectionObserver's `root` already uses for that.
 */
function nearestScrollParent(node: Element | null): Element | null {
  let el = node?.parentElement ?? null;
  while (el) {
    const { overflowY, overflowX } = getComputedStyle(el);
    if (/(auto|scroll|overlay)/.test(overflowY + overflowX)) return el;
    el = el.parentElement;
  }
  return null;
}

export function IoReveal({
  children,
  scroller,
  delay = 0,
  duration = DURATION,
  distance = DISTANCE,
  ease = EASE,
  threshold = THRESHOLD,
  rootMargin = ROOT_MARGIN,
  repeat = false,
  as,
  className,
}: IoRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    if (typeof IntersectionObserver === 'undefined') {
      // A missing API degrades to visible content, never to a blank page.
      setRevealed(true);
      return;
    }

    const root = scroller ? scroller.current : nearestScrollParent(el);
    const bucket = bucketFor(root, rootMargin, threshold);

    const handle: Handler = (entry) => {
      if (entry.isIntersecting) {
        setRevealed(true);
        if (!repeat) {
          bucket.handlers.delete(el);
          bucket.observer.unobserve(el);
        }
      } else if (repeat) {
        setRevealed(false);
      }
    };

    bucket.handlers.set(el, handle);
    bucket.observer.observe(el);

    return () => {
      bucket.handlers.delete(el);
      bucket.observer.unobserve(el);
      // Refcounted: the observer only dies with its last target. Disconnecting
      // per instance would tear the shared observer out from under every other
      // reveal in the same container.
      release(root, rootMargin, threshold);
    };
  }, [scroller, rootMargin, threshold, repeat, reduced]);

  /* Reduced motion is a different render, not a faster one: no transition
     property is emitted at all, and the element is at its resolved end state
     from the first paint. */
  const style: CSSProperties = reduced
    ? {}
    : {
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translate3d(0, 0, 0)' : `translate3d(0, ${distance}px, 0)`,
        // One string, two properties, one shared delay. Written inline on
        // purpose: this variant ships no stylesheet, so there is nothing for a
        // consumer's CSS to load and nothing to hoist.
        transition: `opacity ${duration}s ${ease} ${delay}s, transform ${duration}s ${ease} ${delay}s`,
        willChange: revealed ? undefined : 'opacity, transform',
      };
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The effect deletes its handler from the shared bucket, unobserves its own element, then calls `release`, which disconnects the observer and drops the bucket only when no handlers remain. No listeners, no rAF, no timers. The pool itself holds no reference to an element once its handler is removed, so nothing keeps a detached node alive.

**Reduced motion.** The reduced branch renders a different element, not a faster one: the style object is empty, so no `opacity`, no `transform` and no `transition` are emitted and the content is at its resolved final state on the first paint. No observer is created either, which also means no work is scheduled for a user who asked for none. `useReducedMotion` reads through `useSyncExternalStore`, so the value lands in the hydration commit and the animated variant is never painted.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Keying the shared observer on `rootMargin` and `threshold` but not on the root. The first instance to mount then decides which container everyone measures against, and every later instance inside a different scroll panel reports "in view" from the start — so an entire panel reveals on mount and never animates again. The root has to be part of the key.
- Calling `observer.disconnect()` in a single instance's cleanup. With a shared observer that stops every other reveal in the same container dead, and the symptom appears only after a route change unmounts one card. Delete the handler, unobserve the one target, and disconnect only when the handler map is empty.
- Constructing an observer per element. It works and it is invisible at ten elements; at two hundred the browser services two hundred separate intersection computations on every scroll of the container and the frame budget goes to bookkeeping.
- One observer for the whole page with `root: null` when the content is inside an `overflow-y: auto` panel. Everything in the panel intersects the viewport from the start, so every reveal fires at mount.
- Animating `top` or `margin-top` instead of `transform`. Both are layout properties: the reveal then triggers layout on every frame for every element currently animating, and a page with a dozen simultaneous reveals visibly stutters.
- Leaving `will-change: opacity, transform` on after the reveal. Every settled element keeps its own compositor layer, and a long page accumulates hundreds of them until scrolling gets slower the further down you go. It is set only while the element is still hidden.
- Treating reduced motion as `duration: 0`. That still emits a transition and still runs the state flip through the compositor. Here the reduced branch emits no `transition`, no `opacity` and no `transform` at all, so the element is simply in its final position from the first paint.

## Notes

- This variant ships zero CSS, which is the trade it makes: the hidden start state is an inline style on the first render, so a document that never executes scripts renders the content hidden. `css-var-stagger-reveal` is the sibling that pays for a hoisted stylesheet and gets a `@media (scripting: none)` escape hatch in return. Choose this one for a component library where injecting global CSS is unwelcome; choose that one for a site where a designer will retune the choreography and no-JS has to look right.
- Compared to a GSAP reveal system, this cannot scrub, cannot be measured against a `containerAnimation`, and has no timeline you can seek. It is deliberately the floor of the feature set: entry, once, with a delay.
- `as` lets the wrapper be a `span` inside a paragraph or an `li` inside a list, so the reveal does not force an invalid nesting or an extra block-level box into the layout.

## Definition of done

Scroll the container and each element rises 28 px and fades in as it comes properly into view, not as it touches the bottom edge. Give three siblings delays of 0, 0.08 and 0.16 and they arrive in sequence. Mount fifty of them and the browser reports one IntersectionObserver, not fifty. Unmount one card and the rest keep revealing. With reduced motion on, every element is already in place and inspecting it shows no inline `transition` at all.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
