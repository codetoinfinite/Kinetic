# Build: CSS Variable Stagger Reveal

A reveal system where JavaScript writes one number per element and then gets out of the way. The stagger delay is `calc(var(--kx-reveal-index) * var(--kx-reveal-step))`, so duration, travel, easing and the delay ramp all live in CSS where they can be retuned — or overridden from an unrelated stylesheet — without touching the component. The observer measures against the nearest scrollable ancestor, so the same component works inside a card, a modal, or the document.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Groups reveal as they enter their scroll container; the stagger delay is a CSS calc over an index the JS writes once.

- Category: scroll
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. On mount the component collects `[data-reveal-group]` descendants, falling back to itself as a single group, and writes `--kx-reveal-index` as an inline custom property on each `[data-reveal]` inside each group. Index restarts at zero per group, so a second group does not inherit a delay whose beginning the reader never saw.
2. One shipped rule computes the per-element delay: `--kx-reveal-delay: calc(var(--kx-reveal-index, 0) * var(--kx-reveal-step, 90ms))`, and both the opacity and transform transitions use it as their `transition-delay`. This is the entire stagger — there is no timeline object and no rAF loop anywhere in the component.
3. The start state (`opacity: 0`, `translate3d(0, var(--kx-reveal-distance), 0)`) is a CSS rule rather than an inline style, so it is already in effect before hydration and there is no frame of un-hidden content.
4. An IntersectionObserver with `threshold: 0.15` and `rootMargin: "0px 0px -8% 0px"` sets `data-kx-revealed` on the group. The negative bottom margin shrinks the observation box up from the bottom edge, so an element must be genuinely inside the container rather than merely touching its edge — without it, a reveal fires while the element is still one pixel of its own height into view.
5. The observer `root` is resolved in three steps: an explicit `scroller` ref if given, otherwise a walk up the ancestor chain for the first element whose computed `overflow-x` or `overflow-y` is `auto`, `scroll` or `overlay`, otherwise `null`, which is the value that means the viewport. Nothing in the component references `window`, so it behaves identically in a 320 px preview card and on a full page.
6. Revealed groups are unobserved immediately unless `repeat` is set, so a long page is not still servicing a hundred settled groups. `repeat` instead deletes the attribute on exit, and CSS runs the same transition backwards.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `stepMs = 90`
  Delay per index. Below ~50 ms the elements read as arriving together and the stagger is wasted; above ~140 ms a group of six takes over three quarters of a second to finish and the last line is still moving after the eye has reached it.
- `durationMs = 700`
  Per-element transition duration, roughly 8x the step. Keeping duration well above step is what makes the group overlap into one motion rather than resolve as six separate events.
- `distance = 28px`
  Travel. Small enough that the text never leaves its own line box — a reveal that starts 100 px down reads as an element flying in from elsewhere, which fights the impression that the content was always there.
- `ease = cubic-bezier(0.22, 1, 0.36, 1)`
  An ease-out-quint. Nearly all of the travel happens in the first third, so the element appears to arrive and settle rather than to decelerate the whole way. A symmetric ease-in-out on a reveal always reads as slow.
- `threshold = 0.15`
  Fraction of the group that must be visible. At 0 the reveal fires on a single pixel of intersection, which for a tall group means the stagger completes before the content is on screen. Past ~0.4 a group taller than the container can never satisfy it and never reveals at all.
- `rootMargin = 0px 0px -8% 0px`
  Shrinks the observation box 8% up from the bottom, so the element is genuinely inside the container before it fires. Positive values here are the usual mistake: they fire the reveal below the fold and the user scrolls onto content that has already finished animating.

## API

```ts
function CssVarStaggerReveal(props: { children: ReactNode; scroller?: RefObject<HTMLElement | null>; stepMs?: number; durationMs?: number; distance?: string; ease?: string; threshold?: number; rootMargin?: string; repeat?: boolean; className?: string }): JSX.Element
```

- `children: ReactNode`
  Mark groups with `data-reveal-group` and targets with `data-reveal`. A scope with no groups is treated as one group.
- `scroller: RefObject<HTMLElement | null>`
  Scroll container for the observer. Omit and the nearest scrollable ancestor is found by walking computed overflow.
- `stepMs: number` — default `90`
  Milliseconds of delay per index step. Written as `--kx-reveal-step`.
- `durationMs: number` — default `700`
  Transition duration. Written as `--kx-reveal-duration`.
- `distance: string` — default `'28px'`
  Starting vertical offset, any CSS length. Written as `--kx-reveal-distance`.
- `ease: string` — default `'cubic-bezier(0.22, 1, 0.36, 1)'`
  Timing function. Written as `--kx-reveal-ease`.
- `threshold: number` — default `0.15`
  Fraction of a group that must be visible before it reveals.
- `rootMargin: string` — default `'0px 0px -8% 0px'`
  Observation box inset. The negative bottom means "genuinely in view".
- `repeat: boolean` — default `false`
  Re-hide groups that leave the container. Off by default, which also lets settled groups be unobserved.
- `className: string`
  Merged onto the scope element.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Nearest ancestor that actually scrolls. `overflow: auto` on an element that
 * has not overflowed yet still counts — it is the container the reveal will
 * live inside once content arrives, and testing `scrollHeight > clientHeight`
 * on mount would pick the document instead and fire everything at once.
 *
 * Returns `null` for "the viewport", which is the IntersectionObserver
 * `root` value that means the document.
 */
function nearestScrollParent(node: Element | null): Element | null {
  let el = node?.parentElement ?? null;
  while (el) {
    const { overflowY, overflowX } = getComputedStyle(el);
    const scrollable = /(auto|scroll|overlay)/.test(overflowY + overflowX);
    if (scrollable) return el;
    el = el.parentElement;
  }
  return null;
}

export function CssVarStaggerReveal({
  children,
  scroller,
  stepMs = 90,
  durationMs = 700,
  distance = '28px',
  ease = 'cubic-bezier(0.22, 1, 0.36, 1)',
  threshold = 0.15,
  rootMargin = '0px 0px -8% 0px',
  repeat = false,
  className,
}: CssVarStaggerRevealProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;

    const groups = Array.from(rootEl.querySelectorAll<HTMLElement>(GROUP_SELECTOR));
    // A subtree with no declared groups is one group: the scope itself.
    const scopes: HTMLElement[] = groups.length > 0 ? groups : [rootEl];

    // Index is per group, not per document. Two sibling groups both start
    // their stagger at zero, so the second one does not inherit a delay the
    // reader never sees the beginning of.
    for (const group of scopes) {
      const targets = group.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
      targets.forEach((target, i) => {
        target.style.setProperty('--kx-reveal-index', String(i));
      });
    }

    const reveal = (group: HTMLElement) => {
      group.dataset.kxRevealed = 'true';
    };

    // No observer available: reveal rather than leave the content at
    // opacity 0 forever. A missing API must degrade to visible content.
    if (typeof IntersectionObserver === 'undefined') {
      for (const group of scopes) reveal(group);
      return;
    }

    // `undefined` from the prop means "find it"; `null` from the walk means
    // "the document", which is what IntersectionObserver's root expects.
    const container = scroller ? scroller.current : nearestScrollParent(rootEl);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target;
          if (!(target instanceof HTMLElement)) continue;
          if (entry.isIntersecting) {
            reveal(target);
            // One-shot is the default: stop watching immediately so a long
            // page is not still servicing a hundred settled groups.
            if (!repeat) observer.unobserve(target);
          } else if (repeat) {
            delete target.dataset.kxRevealed;
          }
        }
      },
      { root: container ?? null, rootMargin, threshold },
    );

    for (const group of scopes) observer.observe(group);
    return () => observer.disconnect();
  }, [scroller, threshold, rootMargin, repeat]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `observer.disconnect()` in the effect teardown, which releases the observer's references to every group. The inline `--kx-reveal-index` properties and the `data-kx-revealed` attributes live on nodes React owns and are discarded with them. There is no rAF, no listener and no timer to cancel — the hoisted `<style>` is reference-counted and removed by React when the last instance unmounts.

**Reduced motion.** A `@media (prefers-reduced-motion: reduce)` block in the shipped rule set resolves every target to its END state — `opacity: 1`, `transform: none`, `transition: none` — so the content is simply present, with no travel and no delay ramp to sit through. The observer still runs and still sets `data-kx-revealed`, so anything else keyed off that attribute keeps working; it just has nothing to transition.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Writing the delay as an inline `transition-delay` per element. It works, and it moves the choreography into JavaScript where a designer cannot reach it and a stylesheet cannot override it. The point of the index-as-custom-property indirection is that JS contributes a number and CSS owns every unit.
- Numbering targets across the whole scope instead of per group. The second group starts at index 6 and sits at a 540 ms delay, so the reader watches nothing happen for half a second after it enters view.
- Assuming the scroll container is the window. Inside any `overflow-y: auto` panel, an observer with `root: null` compares against the viewport: everything in the panel is "in view" from the start, so the entire page reveals at once on mount and never staggers again.
- Testing `scrollHeight > clientHeight` when hunting for the scroll parent. A panel that has not overflowed yet is still the container the reveal will live inside once content arrives; rejecting it picks the document and fires everything at once.
- Putting the hidden start state in an inline style set from an effect. The server-rendered markup then paints visible, hides on hydration, and animates — a flash of correct content followed by a reveal, which is worse than no reveal.
- Shipping a hidden-by-default rule with no escape hatch for a document that never runs scripts. `@media (scripting: none)` restores opacity and transform; without it the page is simply blank for anyone who has JS off.
- Leaving the observer connected. It keeps a strong reference to every observed group, so an unmounted section is still measured on every scroll of the container that outlived it.
- Adding only `[data-kx-revealed] [data-reveal]` as the revealed selector. When the scope declares no groups, the marker lands on the scope element itself, which is not a descendant of itself — so the reveal silently never applies.

## Notes

- Every knob is a custom property, which means a consumer can retune the whole system from any ancestor: `--kx-reveal-step`, `--kx-reveal-duration`, `--kx-reveal-distance`, `--kx-reveal-ease`. The props are conveniences that write those same properties onto the scope element.
- This is the CSS-owned sibling of the GSAP reveal systems in the registry. Choose this one when the choreography is a fade-and-rise and the value is that a designer can retune it; choose a GSAP builder when the reveal needs scrubbing, a per-element timeline, or to be measured against a horizontal container animation.
- The observer watches groups, not individual elements. A group that is taller than its container reveals when 15% of it is visible — if a section is very tall, wrap the parts you want revealed separately in their own `data-reveal-group`.

## Definition of done

Scroll the container: each group's children rise and fade in one after another, about 90 ms apart, and the group does not start until it is genuinely inside the box rather than touching its bottom edge. Inspect a revealed child and its computed `transition-delay` equals index x 90 ms. Set `--kx-reveal-step: 200ms` on any ancestor in dev tools and the stagger widens immediately with no re-render. With reduced motion on, everything is already visible and in place. Unmount the scroller and no observer callbacks fire.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
