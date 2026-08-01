# Build: Percent Slide Carousel

The simplest slide carousel that is still correct. A flex track holds one full-width slide per child and translates by `-100% * index`; because a percentage translate resolves against the translated element's own width, and the track is exactly one viewport-box wide, one step is exactly one slide. Nothing is measured, so nothing goes stale on resize.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A flex track translated by -100% per slide. One CSS transition, no measurement, no library.

- Category: layout
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The viewport box is `overflow: hidden`. Inside it a flex track is `h-full w-full`, and every slide is `w-full shrink-0` — full width of the *track*, not of the flex line, so `count` slides overflow the track by `count - 1` widths instead of being compressed into it.
2. The track carries `transform: translateX(-${100 * index}%)`. A percentage in `translateX` is relative to the border box of the element being transformed, which is the track, whose width equals the viewport box, which equals one slide. So `-100%` is one slide exactly, with no numbers taken from layout.
3. That is the whole reason to prefer this over a pixel translate: a pixel offset needs a measured slide width, which needs a resize observer, which needs a re-measure pass that can land a frame late and show a seam. Here a resize changes the meaning of `100%` on the next paint for free.
4. The transition is `transform 600ms cubic-bezier(0.22, 1, 0.36, 1)` on the track only. Interrupting it mid-flight is handled by the compositor: the browser retargets from the current computed transform, so rapid clicks chain smoothly rather than restarting from the last committed index.
5. Navigation clamps rather than wraps by default. `-100% * index` is a linear function of the index with no modulo in it, so a wrap from the last slide to the first would translate the whole track back across every intermediate slide — a visible rewind. `loop` is offered but honest about that.
6. Each slide is a `role="group"` with `aria-roledescription="slide"` and an `aria-label` of `n of N`, so a screen reader announces position without the component owning any live region.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `duration = 600`
  Milliseconds for a full slide. Under ~350 ms a full-width traversal reads as a cut rather than a move and the eye loses which direction it went; over ~900 ms a rapid click-through feels blocked because each step is still finishing when the next arrives.
- `EASE = cubic-bezier(0.22, 1, 0.36, 1)`
  An expo-out curve: ~80% of the distance is covered in the first third of the duration. On a full-viewport traversal that front-loading is what keeps a 600 ms move from feeling slow, while the long flat tail hides the exact moment the slide lands.
- `translate step = 100%`
  Locked to the slide width by construction, not by choice. Any other value desynchronises the track from the slides and leaves a permanent sliver of the neighbour visible at rest.
- `shrink-0 on slides = flex-shrink: 0`
  Without it flexbox honours the container width and squeezes every slide to `1/count` of the track. The translate still moves a full track-width, so one click jumps `count` slides — the single most common way this pattern breaks.
- `loop = false`
  Default off. With a linear percentage translate there is no cheap wrap: going from the last index to 0 animates back through every slide. If you need a true loop, reach for the drum instead.

## API

```ts
function PercentSlideCarousel(props: { children: ReactNode; duration?: number; index?: number; defaultIndex?: number; onIndexChange?: (index: number) => void; loop?: boolean; className?: string; slideClassName?: string; "aria-label"?: string }): JSX.Element
```

- `children: ReactNode`
  One slide per child. Each is wrapped in a full-width, non-shrinking cell.
- `duration: number` — default `600`
  Slide transition duration in milliseconds.
- `index: number`
  Controlled index. Omit to let the component hold its own state.
- `defaultIndex: number` — default `0`
  Starting index when uncontrolled.
- `onIndexChange: (index: number) => void`
  Fires with the resolved index after clamping or wrapping.
- `loop: boolean` — default `false`
  Wrap past the ends. Off by default because the wrap animates backwards through every slide.
- `className: string`
  Merged onto the viewport box.
- `slideClassName: string`
  Merged onto every slide cell.
- `aria-label: string` — default `'Carousel'`
  Label for the carousel group.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const trackStyle = {
  // One slide is one track-width, so the step is exactly 100%. This is the
  // only carousel arithmetic that needs no numbers from layout at all.
  transform: `translateX(-${100 * current}%)`,
  // No transition under reduced motion: the slide still changes, it just
  // arrives instantly. Cutting the movement is the point; cutting the
  // navigation would be a bug.
  transition: reduced ? 'none' : `transform ${duration}ms ${EASE}`,
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. No listeners, no timers, no animation frames, no imperative writes to the DOM; the only state is the current index and the browser owns the transition.

**Reduced motion.** The track transition is set to `none`, so the slide changes on the next paint with no traversal. Navigation, focus order and the announced position are untouched — only the movement between slides is removed.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Omitting `flex-shrink: 0` on the slides. Flexbox compresses them to fit the track, the `-100%` step no longer equals one slide, and the carousel advances by the whole set on the first click.
- Putting the transition on the slides instead of the track. Only the track moves; a transition on the children costs a style recalculation per slide per frame and animates nothing.
- Translating in pixels from a measured slide width. It works until the container resizes between the measure and the paint, at which point the track is offset by the difference and every slide sits a few pixels off-centre until the next navigation.
- Wrapping the index with a modulo and expecting a loop. `-100% * 0` after `-100% * (n - 1)` animates the whole track backwards past every slide; users read it as the carousel malfunctioning, not as a wrap.
- Marking off-screen slides `aria-hidden` while they still contain focusable children. Tab lands inside a hidden subtree, which is an accessibility violation and, in practice, scrolls the overflow container sideways and desynchronises it from the transform.
- Forgetting `overflow: hidden` on the viewport box. The overflowing slides remain visible, and inside a page-level container they widen the document and add a horizontal scrollbar.
- Killing the transition under reduced motion but also killing the index change. The slide must still change — reduced motion removes the traversal, not the navigation.

## Notes

- This is the flat, non-3D member of the carousel trio. `wrapping-drum-carousel` fakes depth with scale and `autoAlpha` over a `gsap.utils.wrap` ring and loops infinitely; `perspective-coverflow-scroller` uses real `perspective()` / `rotateY()` / `translateZ()` driven by a native scroll container. This one has no depth, no wrap and no JavaScript in the motion path at all — reach for it when the content is the point and the carousel is not.
- Because the motion is a single compositor-friendly transform on one element, it holds 60 fps on hardware where the other two do not. If you are shipping a hero on a low-end phone, this is the one that survives.
- Controlled and uncontrolled: pass `index` to drive it from outside, omit it and the component keeps its own state. `onIndexChange` fires in both cases.

## Definition of done

Click next and exactly one slide traverses the box in 600 ms with no neighbour visible at rest. Hold the next button down and the slides chain without restarting from the previous index. Resize the container mid-transition and the resting position stays flush with the box edges. At the last slide the next button is disabled unless `loop` is set. With reduced motion the slide changes instantly and the buttons still work.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
