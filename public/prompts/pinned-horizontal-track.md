# Build: Pinned Horizontal Track

A full-height section is pinned by ScrollTrigger while a flex strip inside it translates on x. The pin lasts exactly as many scroll pixels as the strip has to travel, so the mapping is 1:1 and the section releases the moment the last panel lands. The tween and the trigger are handed back to the parent, so reveal systems and drag handles can drive off the same pin instead of building a second one.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A section pins while a strip of panels slides sideways, one scroll pixel per track pixel.

- Category: scroll
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. One measurement backs the whole construction: `distanceOf() = max(0, track.scrollWidth - root.clientWidth)`. It is a function, not a captured number, because fonts, images and container resizes all change it after first paint.
2. `gsap.to(track, { x: () => -distanceOf(), ease: "none" })` uses a function-based end value, so `invalidateOnRefresh: true` re-derives the travel on every refresh rather than replaying a stale target.
3. The ScrollTrigger pins the root with `start: "top top"` and `end: () => "+=" + distanceOf()`. Because the pin duration and the tween distance come from the same call, one scroll pixel always buys one track pixel.
4. `scrub: 1` gives the strip one second of catch-up, so a flicked wheel produces a glide rather than a jump; `anticipatePin: 1` lets ScrollTrigger apply the pin a frame early, which removes the single-frame jitter at high scroll speeds.
5. `document.fonts.ready` triggers `ScrollTrigger.refresh()`. A font swap changes `scrollWidth` after the pin was measured, and without the refresh the pin ends before the track does — the last panel is unreachable.
6. On build the component calls `onTrack({ animation, trigger, getDistance })`; on teardown it calls `onTrack(null)`, so consumers rebuild rather than holding a reverted tween.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `scrub = 1`
  Seconds of catch-up between the scrollbar and the strip. `true` (0) locks the track to the scrollbar and inherits every wheel step as a visible stutter; above ~1.5 the track keeps moving long after the wheel stops and reads as broken input.
- `anticipatePin = 1`
  Applies the pin one frame of predicted scroll early. At 0, a fast flick pins one frame late and the section visibly slips before locking. Above 1 it pins early enough to look premature.
- `end = `+=${max(1, distanceOf())}``
  Pin duration in pixels, equal to the horizontal travel. The `max(1, …)` floor exists because a track narrower than its container yields 0, and an end equal to start makes ScrollTrigger treat the trigger as degenerate and never fire it.

## API

```ts
function PinnedHorizontalTrack(props: { children: ReactNode; scroller?: RefObject<HTMLElement | null>; scrub?: number; onTrack?: (track: PinnedTrack | null) => void; className?: string; trackClassName?: string }): JSX.Element
```

- `children: ReactNode`
  Panels. The track is a flex row, so give each panel a width and `shrink-0`.
- `scroller: RefObject<HTMLElement | null>`
  The scroll container the trigger reads. Omit to use the document.
- `scrub: number` — default `1`
  Seconds of catch-up between scrollbar and strip.
- `onTrack: (track: PinnedTrack | null) => void`
  Receives `{ animation, trigger, getDistance }` on build and `null` on teardown.
- `className: string`
  Merged onto the pinned root.
- `trackClassName: string`
  Merged onto the moving strip.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function PinnedHorizontalTrack({
  children,
  scroller,
  scrub = 1,
  onTrack,
  className,
  trackClassName,
}: PinnedHorizontalTrackProps) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const onTrackRef = useRef(onTrack);
  onTrackRef.current = onTrack;
  const reduced = useReducedMotion();

  useEffect(() => {
    const rootEl = root.current;
    const trackEl = track.current;
    if (!rootEl || !trackEl || reduced) return;

    // `undefined` means "the document" to ScrollTrigger. Passing `null` would
    // be read as an explicit scroller and throw on the first refresh.
    const scrollerEl = scroller?.current ?? undefined;

    // The single source of truth. Both the tween's end value and the pin's
    // duration call it, so a refresh that changes one changes the other.
    const distanceOf = () => Math.max(0, trackEl.scrollWidth - rootEl.clientWidth);

    let cancelled = false;

    const ctx = gsap.context(() => {
      const animation = gsap.to(trackEl, {
        // Function-based value: re-evaluated by `invalidateOnRefresh`.
        x: () => -distanceOf(),
        ease: 'none',
        scrollTrigger: {
          trigger: rootEl,
          scroller: scrollerEl,
          pin: true,
          anticipatePin: 1,
          scrub,
          start: 'top top',
          // 1 px of scroll buys 1 px of track. Expressing the end as a
          // percentage of viewport height instead makes the mapping depend
          // on window shape, and the track finishes early on a short screen.
          end: () => `+=${Math.max(1, distanceOf())}`,
          invalidateOnRefresh: true,
        },
      });

      const trigger = animation.scrollTrigger;
      if (trigger) {
        onTrackRef.current?.({ animation, trigger, getDistance: distanceOf });
      }
    }, rootEl);

    // The most-forgotten line in scroll-driven layout. A font swap changes
    // `scrollWidth` after the pin has already been measured, and the last
    // panel becomes unreachable because the pin ends before the track does.
    void document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      onTrackRef.current?.(null);
      // revert(), not kill(): it also removes the pin-spacer GSAP injected
      // into the DOM and restores the inline transform on the strip.
      ctx.revert();
    };
  }, [scroller, scrub, reduced]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Calls `onTrack(null)` so consumers drop their reference, then `ctx.revert()`, which kills the tween and the ScrollTrigger, removes the injected pin-spacer, and clears the inline transform from the strip. A pending `document.fonts.ready` refresh is gated behind a `cancelled` flag.

**Reduced motion.** No ScrollTrigger and no pin are created. The root becomes a horizontally scrollable row, so the same panels are still read left to right — under the reader's own control, at the reader's own speed.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Measuring `scrollWidth - clientWidth` once into a variable. Fonts swap after first paint and the number grows; the pin then ends before the track has finished travelling and the final panel can never be reached.
- Expressing `end` as a percentage of viewport height (`"+=" + distance * 100 / innerWidth + "%"`). It works on the machine it was tuned on and finishes the track early on a shorter screen, because the mapping now depends on window shape rather than on the travel itself.
- Passing `scroller: null` when the component sits on the page rather than in a box. ScrollTrigger reads `null` as an explicit scroller element and throws on the first refresh; omit the option instead, which is why the code coalesces to `undefined`.
- Calling `kill()` instead of `revert()` on unmount. `kill()` leaves the pin-spacer div GSAP injected into the DOM and the inline transform on the strip, so the next mount measures a layout that still contains the last one.
- Forgetting that a pinned element inside a custom scroller needs that scroller passed explicitly. Without it, ScrollTrigger measures the document, the trigger never becomes active inside the box, and the panels sit motionless.

## Notes

- Under `prefers-reduced-motion: reduce` no trigger is created at all and the strip becomes a native `overflow-x-auto` row, so every panel stays reachable by thumb, trackpad and keyboard.
- `gsap.registerPlugin(ScrollTrigger)` runs once at module scope behind a `typeof window` guard, so repeated imports are harmless and prerender never touches the plugin.

## Definition of done

Scroll down: the section locks, the panels slide left, and the last panel reaches the right edge at exactly the moment the section unpins. Resize the container mid-pin and the track still ends flush. With reduced motion on, the section never pins and the panels can be swiped sideways instead.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
