# Build: Batched Blur Reveal

A page-wide entrance that reveals elements in groups rather than one at a time. Everything that crosses the start line inside the same 100 ms window is handed to one tween, so a real stagger runs across a row of cards that entered simultaneously. Opacity, rise, scale and blur move together, which reads as the content focusing rather than sliding.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Cards that enter together focus in as one staggered group instead of arriving as a slab.

- Category: scroll
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. On mount, every `[data-reveal]` descendant of the container — queried from the container element, never from `document` — is set to `{ opacity: 0, y: 90, scale: 0.94, filter: "blur(12px)" }` plus a `will-change` hint for transform, filter and opacity.
2. `ScrollTrigger.batch(targets, { start: "top 88%", interval: 0.1, batchMax: 6 })` replaces the usual one-trigger-per-element loop. Elements that cross the start line within `interval` seconds of each other are collected and delivered to `onEnter` as a single array.
3. That array is animated by one `gsap.to` with `stagger: 0.14`, so the offset is computed across the whole group. Individual triggers cannot do this: each one starts at its own t=0 and knows nothing about its neighbours.
4. The tween carries `overwrite: true` so a fast flick that re-enters an element mid-reveal restarts it cleanly instead of interpolating from a half-finished state.
5. `onComplete` calls `gsap.set(batch, { clearProps: "filter,willChange" })`. A `filter` that survives the animation keeps the node on its own composited layer for the life of the page, which is exactly the cost the reveal was supposed to pay once.
6. Under `prefers-reduced-motion`, no trigger is created at all: the targets are `gsap.set` to their final values and the content is already correct on first paint.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `start = 'top 88%'`
  The element begins revealing when its top reaches 88% down the scroller — a sliver above the fold. At `top bottom` the reveal happens off-screen and the user sees nothing; below about 80% the element is already well into view before it starts, which reads as a late load.
- `BATCH_INTERVAL = 0.1`
  Seconds of grace before a batch is flushed. Too small and a row of three cards splits into three batches with no stagger between them — the exact failure this component exists to avoid. Too large and the first element visibly waits before anything moves.
- `batchMax = 6`
  Cap on group size. With `stagger: 0.14`, a batch of 20 puts 2.7 s between the first and last element, so the tail is still blurred long after the user has read the head. Six keeps the whole group inside roughly a second.
- `stagger = 0.14`
  Offset within a batch. Below ~0.08 the group reads as simultaneous and the batching is invisible; above ~0.2 it reads as a queue rather than a wave.
- `blur = 12`
  Starting blur in pixels. This is the expensive property — it forces a full repaint of the layer every frame — and it is what turns a slide into a focus-pull. Past ~20px the text is unreadable for long enough that the reveal feels broken.
- `distance = 90`
  Pixels of rise. Paired with `scale: 0.94` it reads as depth. Much more and the element travels further than its own height, which looks like a layout jump rather than an entrance.
- `duration = 1.1`
  Long for an entrance, and deliberately so: the blur needs time to resolve or the focus-pull reads as a flicker.

## API

```ts
function BatchedBlurReveal(props: { children: ReactNode; selector?: string; start?: string; distance?: number; blur?: number; scale?: number; duration?: number; stagger?: number; once?: boolean; batchMax?: number; scrollerRef?: RefObject<HTMLElement | null>; className?: string }): JSX.Element
```

- `children: ReactNode`
  Section content. Anything matching `selector` inside it is revealed.
- `selector: string` — default `'[data-reveal]'`
  Which descendants reveal. Queried against the container, not the document.
- `start: string` — default `'top 88%'`
  ScrollTrigger start position for every batched element.
- `distance: number` — default `90`
  Pixels the element rises through.
- `blur: number` — default `12`
  Starting blur radius. Set 0 to drop the focus-pull and keep the rise.
- `scale: number` — default `0.94`
  Starting scale.
- `duration: number` — default `1.1`
  Seconds per element.
- `stagger: number` — default `0.14`
  Seconds between elements within one batch.
- `once: boolean` — default `true`
  Reveal once and never replay.
- `batchMax: number` — default `6`
  Largest group a single callback may receive.
- `scrollerRef: RefObject<HTMLElement | null>`
  The scroll container that owns the scroll position. Omit for the document.
- `className: string`
  Merged onto the container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const BATCH_INTERVAL = 0.1;

export function BatchedBlurReveal({
  children,
  selector = '[data-reveal]',
  start = 'top 88%',
  distance = 90,
  blur = 12,
  scale = 0.94,
  duration = 1.1,
  stagger = 0.14,
  once = true,
  batchMax = 6,
  scrollerRef,
  className,
}: BatchedBlurRevealProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGsap(
    gsap,
    () => {
      const el = root.current;
      if (!el) return;

      // Query from the container, never `document`. Two instances of this
      // component on one page would otherwise each claim the other's targets
      // and fight over the same tweens.
      const targets = Array.from(el.querySelectorAll<HTMLElement>(selector));
      if (targets.length === 0) return;

      if (reduced) {
        // Not "duration 0" — no trigger at all. The content is simply already
        // in its final state on first paint.
        gsap.set(targets, { opacity: 1, y: 0, scale: 1, filter: 'none' });
        return;
      }

      gsap.set(targets, {
        opacity: 0,
        y: distance,
        scale,
        filter: `blur(${blur}px)`,
        // Promoting up front matters more than usual here: an animated
        // `filter` repaints the layer every frame, and without the hint the
        // first two or three frames of every batch are the browser deciding
        // whether to promote at all.
        willChange: 'transform, filter, opacity',
      });

      ScrollTrigger.batch(targets, {
        start,
        once,
        batchMax,
        interval: BATCH_INTERVAL,
        scroller: scrollerRef?.current ?? undefined,
        onEnter: (batch) => {
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration,
            ease: 'power3.out',
            stagger,
            // A fast flick can re-enter an element while its own reveal is
            // still running. Without overwrite the second tween interpolates
            // from wherever the first had got to and the two fight.
            overwrite: true,
            onComplete: () => {
              // A permanent `filter` keeps the element on its own composited
              // layer for the life of the page. Drop both hints once settled.
              gsap.set(batch, { clearProps: 'filter,willChange' });
            },
          });
        },
      });
    },
    root,
    [selector, start, distance, blur, scale, duration, stagger, once, batchMax, reduced],
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useGsap` runs the whole setup inside a `gsap.context` and calls `ctx.revert()` on unmount and on any prop change. That kills every batched ScrollTrigger and every in-flight tween, and restores the inline styles the initial `gsap.set` wrote, so an unmount mid-reveal leaves no opacity or blur behind on a node React may reuse.

**Reduced motion.** No ScrollTrigger is created. The targets are set to their final state — full opacity, no offset, no blur — during the first effect, so the section renders as finished content and never moves.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Creating one ScrollTrigger per element. Sixty targets means sixty sets of start/end calculations on every refresh, and — the visible part — two cards entering in the same frame both begin at t=0, so the row lands flat. `stagger` cannot cross independent triggers.
- Querying targets with `document.querySelectorAll`. Two instances of the component on one page each claim the other's elements, so both apply the initial state and both tween it, and elements reveal twice at different speeds.
- Leaving `filter` on the node after the reveal. A non-`none` filter keeps the element on its own composited layer permanently; on a page with sixty of them the compositor memory cost outlives the animation by the whole session. Clear it in `onComplete`.
- Omitting `overwrite: true`. Flick-scrolling re-enters an element while its reveal is running and the second tween starts from the partial state, so opacity and blur end up somewhere between the two.
- Animating `filter: blur()` without a `will-change` hint. The first frames go to the browser deciding whether to promote the layer, so every reveal starts with a visible hitch.
- Registering ScrollTrigger inside the component body. It runs on every render and touches `document`, which throws during server rendering. Register once at module scope behind a `typeof window` guard.

## Notes

- Pass `scrollerRef` when the content scrolls inside a container rather than the document — ScrollTrigger measures against the window by default and every start position will be wrong.
- `once: true` is the default because these are entrances, not a narrative. Set it false when the section is something the user is expected to scroll back through.

## Definition of done

Scroll a grid of cards into view: the cards in the same row lift and focus one after another with a visible offset, not all at once. Scroll back up and they stay revealed. Inspect a settled card and it has no `filter` or `will-change` left in its inline style. With reduced motion enabled the section is fully visible before any scrolling happens.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
