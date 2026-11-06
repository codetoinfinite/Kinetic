# Build: Converging Headline Words

A stacked headline assembles out of the margins as you approach it. Odd lines enter from the right, even lines from the left, and both land on zero at the same scrub position, so they cross the frame in opposite directions and lock into a sentence. Because the tween is scrubbed, scrolling back up disassembles it — the headline is a function of scroll position, not a playback that has happened or not happened.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Headline words slide in from opposite margins and lock into a sentence, pinned to scroll position.

- Category: text
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. Each word is a block-level span with `data-word`. A single `gsap.timeline` with a `scrollTrigger` holds one `fromTo` per word, all inserted at position `0`, so every word shares the timeline's full length and therefore the full scroll range.
2. The travel is `xPercent`, not `x`: percent of *the element's own width*, so a short word and a long word both start entirely outside the frame and neither needs a hand-tuned pixel value.
3. Direction alternates on index parity — `i % 2 === 0 ? -travel : travel` — and the text alignment alternates with it, so each word enters from the side it is aligned to and travels the shortest distance to its resting place.
4. `ease: "none"` on every tween. Under `scrub` the scroll position *is* the easing curve; layering `power2.out` on top means the words accelerate away from the scrollbar and then wait for it, which is precisely the sensation people describe as the scroll feeling sticky.
5. `fromTo`, not `to`. A bare `to` reads its start value from the DOM, and the DOM already says `xPercent: 0` because the rendered markup is the assembled headline — that is what the no-JS and reduced-motion renders show.
6. `gsap.registerPlugin(ScrollTrigger)` is called inside the effect rather than at module scope, because `registerPlugin` touches `window` and this module is still evaluated during server rendering.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `TRAVEL = 120`
  Percent of each word's own width. At exactly 100 the word starts flush against the frame edge and is already peeking in on the first pixel of scroll; the extra 20% buys a moment of empty margin before it arrives.
- `SCRUB = 1`
  One second of catch-up between the scrollbar and the words. `scrub: true` welds them exactly, which on a trackpad exposes every jitter in the input; past ~1.5s the headline is still assembling well after the reader has stopped scrolling.
- `START = 'top bottom'`
  The scrub begins the instant the headline's top edge enters the viewport. Starting later means the words are still outside the frame when the headline is already half on screen, which reads as missing content rather than as an entrance.
- `END = 'top 25%'`
  Assembly completes when the headline top reaches the upper quarter of the viewport. Ending at centre leaves the headline unresolved while it is the dominant thing on screen; ending earlier compresses the whole effect into the bottom sliver of the viewport.

## API

```ts
function ConvergingScrubWords(props: { words: string[]; travel?: number; scrub?: number; start?: string; end?: string; scroller?: Element | null; className?: string }): JSX.Element
```

- `words: string[]`
  One per line. Even indices enter from the left, odd from the right.
- `travel: number` — default `120`
  Percent of each word's own width that it starts offset by.
- `scrub: number` — default `1`
  Seconds of catch-up between the scrollbar and the words.
- `start: string` — default `'top bottom'`
  ScrollTrigger `start`.
- `end: string` — default `'top 25%'`
  ScrollTrigger `end`.
- `scroller: Element | null` — default `null`
  Scroll container, when the headline is not in the document scroller.
- `className: string`
  Merged onto the wrapper via `cn` — type size and tracking go here.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const TRAVEL = 120;
const SCRUB = 1;
const START = 'top bottom';
const END = 'top 25%';

export function ConvergingScrubWords({
  words,
  travel = TRAVEL,
  scrub = SCRUB,
  start = START,
  end = END,
  scroller = null,
  className,
}: ConvergingScrubWordsProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  /* The words by content, not by array identity. A caller writes
     `words={['Between', 'Signals']}` inline, which is a new array on every
     parent render — and this component's parent re-renders often, because the
     preview host's `useInView` sets state on every IntersectionObserver entry
     and there are five thresholds. With the array itself in the dep list below,
     a single scroll past the card tore the timeline and its ScrollTrigger down
     and rebuilt them up to five times, each rebuild forcing a layout-reading
     `refresh()` and visibly resetting the scrub mid-gesture. The effect never
     reads `words` anyway — it works off the rendered `[data-word]` nodes — so
     content is the only thing that should re-run it. */
  // Joined on an escaped NUL rather than a space: ['a b'] and ['a', 'b']
  // render a different number of nodes and must not share a key.
  const wordsKey = words.join('\u0000');

  useEffect(() => {
    const el = root.current;
    // Reduced motion: the JSX below already renders the assembled headline at
    // its final position, so declining to attach the trigger is the whole
    // implementation. Nothing is hidden and nothing is left off-screen.
    if (!el || reduced) return;

    // Registered here rather than at module scope: registerPlugin touches
    // window, and this file is still evaluated during server rendering.
    gsap.registerPlugin(ScrollTrigger);

    const wordEls = Array.from(el.querySelectorAll<HTMLElement>('[data-word]'));
    if (wordEls.length === 0) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          scroller: scroller ?? undefined,
          start,
          end,
          scrub,
        },
      });

      wordEls.forEach((w, i) => {
        // fromTo, not to. A bare `to` would read the start value off the DOM,
        // and the DOM already says 0 because the inline style below is the
        // final position for the no-JS and reduced-motion renders.
        tl.fromTo(
          w,
          { xPercent: i % 2 === 0 ? -travel : travel },
          { xPercent: 0, ease: 'none' },
          0,
        );
      });
    }, el);

    return () => ctx.revert();
    // `wordsKey` stands in for `words`, which the effect never reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey, travel, scrub, start, end, scroller, reduced]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `ctx.revert()` on the `gsap.context` scoped to the root. That kills the timeline, disposes the ScrollTrigger instance (so it stops measuring a detached element and stops contributing to `ScrollTrigger.refresh()`), and strips the inline transforms GSAP wrote.

**Reduced motion.** No ScrollTrigger is attached and no tween is created. The markup React renders is already the assembled headline at `xPercent: 0`, so the finished sentence is on screen from first paint — nothing is off-screen waiting for a scroll that will not drive it.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using an ease other than `none` under `scrub`. The words lead or lag the scrollbar and the page feels like it is fighting the input — the single most common complaint about scrubbed animation.
- Using `to` instead of `fromTo`. GSAP samples the current DOM value as the start, which is the resting position, so nothing moves — or worse, it moves only after a resize invalidates the cached start.
- Animating `x` in pixels. A word that is 400px wide and one that is 120px wide need different offsets to clear the frame; `xPercent` is self-scaling and survives a font-size change.
- Setting `overflow: hidden` on the container. It stops the horizontal scrollbar, but CSS forces `overflow-y` to `auto` when one axis is `hidden`, which silently breaks any sticky ancestor and clips descenders. `overflow-x: clip` does the same job without that side effect.
- Omitting the `scroller` option when the headline lives inside a scrolling panel rather than the document. ScrollTrigger measures against the window, so the trigger fires at the wrong time or never.
- Registering ScrollTrigger at module scope. `registerPlugin` reaches for `window` and throws during server rendering.
- Cleaning up with `kill()` on the timeline only. The ScrollTrigger instance survives and keeps measuring a detached element; `ctx.revert()` disposes both and strips the inline transforms.

## Notes

- No text-splitting library: the words arrive as an array prop and are rendered as spans by React. A splitter would add a dependency and a DOM-mutation lifecycle for something the caller already has as data.
- If you feed this component text you split elsewhere, gate the split on `document.fonts.ready` — measuring before the webfont lands gives fallback-font line breaks that never re-flow. See `font-safe-text-split`.
- The `scroller` prop exists so the component can be demoed and used inside an `overflow-y-auto` panel rather than only in the document scroller.

## Definition of done

Scroll down slowly: the words travel inward from alternating sides and are exactly aligned when the headline top reaches the upper quarter of the viewport. Scroll back up and they separate again, tracking the scrollbar. No horizontal scrollbar appears on the document at any point. With reduced motion enabled the assembled headline is present on first paint and does not move.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
