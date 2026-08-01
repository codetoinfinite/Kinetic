# Build: Dual-Direction Scrub Entrance

Two elements arrive on the same scrubbed trigger from different directions — the copy rises 60px, the panel slides in from the side by 55% of its own width. Because both tweens sit at position 0 of one timeline, their progress is identical at every scroll position, so the pair reads as one composed arrival. The 0.6s scrub lets them keep moving briefly after the wheel stops, which is the difference between weighted and welded.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Copy rises while a panel slides in from the side, both on one scrub with 600ms of lag.

- Category: scroll
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. A single `gsap.timeline` is created with `scrollTrigger: { trigger: root, start: "top 82%", end: "top 38%", scrub: 0.6 }`. One trigger drives both elements, so there is exactly one progress value in the system.
2. The primary element gets `fromTo({ autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0 })` at position 0. `autoAlpha` rather than `opacity`: it also flips `visibility`, so the invisible element is not a click target on the way in.
3. The secondary gets `fromTo({ autoAlpha: 0, xPercent: ±55 }, { autoAlpha: 1, xPercent: 0 })`, also at position 0. `xPercent` is a share of its own width, so the entrance distance scales with the layout instead of being tuned per breakpoint.
4. Both tweens use `ease: "none"`. Under a scrub the ease is applied to timeline time, so easing here means the two elements travel at different rates through the same scroll range and stop looking like one gesture.
5. The secondary is wrapped in an `overflow-hidden` cell. At `xPercent: 55` it begins more than half its width outside the grid column, which without the clip is a horizontal scrollbar on the whole document.
6. `scrub: 0.6` gives ScrollTrigger 0.6s to catch the timeline up to the scroll position, so the elements decelerate into place after the wheel stops rather than freezing with it.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `scrub = 0.6`
  Seconds of catch-up. `true` (zero lag) welds the animation to the wheel and reads as dragging a slider. Past about 1.5s the section is still arriving long after you have stopped, which reads as lag rather than weight. 0.6 is the point where it feels like mass.
- `start / end = 'top 82%' / 'top 38%'`
  The section begins arriving just as it clears the bottom edge and is fully composed while still in the lower half of the screen. Ending at `top 38%` means the entrance completes before the content reaches the reading position — an animation that is still resolving under the eye is unreadable.
- `rise = 60`
  Pixels of vertical travel for the copy. Enough to register as arriving; small enough that the text is legible for most of the transit, which matters because the user is reading during it.
- `slide = 55`
  Percent of the secondary's own width. Above ~60% it starts entirely outside its column and the first half of the scrub shows an empty cell; below ~30% it reads as a nudge rather than an entrance.

## API

```ts
function DualDirectionScrubEntrance(props: { primary: ReactNode; secondary: ReactNode; from?: "left" | "right"; rise?: number; slide?: number; scrub?: number; start?: string; end?: string; scrollerRef?: RefObject<HTMLElement | null>; className?: string }): JSX.Element
```

- `primary: ReactNode`
  Rises from below. The reading anchor — usually the copy.
- `secondary: ReactNode`
  Slides in horizontally. Usually the card, figure or panel.
- `from: "left" | "right"` — default `'right'`
  Which edge the secondary enters from. Also flips the grid order.
- `rise: number` — default `60`
  Pixels the primary rises through.
- `slide: number` — default `55`
  Secondary travel as a percentage of its own width.
- `scrub: number` — default `0.6`
  Seconds of catch-up behind the scroll position.
- `start: string` — default `'top 82%'`
  ScrollTrigger start.
- `end: string` — default `'top 38%'`
  ScrollTrigger end.
- `scrollerRef: RefObject<HTMLElement | null>`
  The scroll container that owns the scroll position. Omit for the document.
- `className: string`
  Merged onto the grid container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function DualDirectionScrubEntrance({
  primary,
  secondary,
  from = 'right',
  rise = 60,
  slide = 55,
  scrub = 0.6,
  start = 'top 82%',
  end = 'top 38%',
  scrollerRef,
  className,
}: DualDirectionScrubEntranceProps) {
  const root = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGsap(
    gsap,
    () => {
      const container = root.current;
      const a = primaryRef.current;
      const b = secondaryRef.current;
      if (!container || !a || !b || reduced) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          scroller: scrollerRef?.current ?? undefined,
          start,
          end,
          // The number, not `true`. `true` welds the timeline to the wheel and
          // the section stops moving in the same millisecond the wheel does.
          scrub,
          invalidateOnRefresh: true,
        },
      });

      // `fromTo`, deliberately, and not `from`. A `from` tween on a scrubbed
      // trigger renders its start state immediately at build time and then
      // treats the element's *current* values as the destination — so a second
      // tween, a resize, or React re-applying a style mid-scroll silently
      // rewrites where the animation is heading. Stating both ends makes the
      // timeline idempotent.
      tl.fromTo(
        a,
        { autoAlpha: 0, y: rise },
        { autoAlpha: 1, y: 0, ease: 'none', duration: 1 },
        0,
      );

      tl.fromTo(
        b,
        { autoAlpha: 0, xPercent: from === 'right' ? slide : -slide },
        { autoAlpha: 1, xPercent: 0, ease: 'none', duration: 1 },
        // Position 0: both tweens share one progress value. Offsetting them
        // would make the pair read as a queue instead of a single arrival.
        0,
      );
    },
    root,
    [from, rise, slide, scrub, start, end, reduced],
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useGsap` builds the timeline inside a `gsap.context` and reverts it on unmount or any prop change. The revert kills the ScrollTrigger and restores the inline `transform`, `opacity` and `visibility` the tweens wrote — without it an unmount mid-scrub leaves the panel permanently half-slid and invisible if React reuses the node.

**Reduced motion.** No timeline and no trigger are created, so both elements render in their final layout position at full opacity on first paint. Nothing is hidden waiting for a scroll that the user may never make.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- `gsap.from()` on a scrubbed trigger. It renders the start state immediately at build time and treats whatever the element's values happen to be as the destination — so any later style change silently rewrites the target and the element ends up somewhere other than where the layout says. `fromTo` states both ends and is idempotent under a scrub.
- Two separate ScrollTriggers, one per element. Their start positions are computed from their own bounding boxes, so on a tall screen the copy is already finished before the panel has begun, and the composition falls apart at exactly the viewport heights you did not test.
- Easing a scrubbed tween. The ease is applied to timeline time, so the two elements move at different rates through the same scroll window and the pair stops reading as one gesture. Use `ease: "none"` and let the scrub supply the smoothing.
- No `overflow-hidden` around the sliding element. At `xPercent: 55` it sits outside its column at the start of the scrub, which extends the document width and adds a horizontal scrollbar that appears and disappears as you scroll.
- Using `opacity` instead of `autoAlpha`. The invisible element still receives pointer events, so a link inside a panel that has not arrived yet is clickable and focusable.
- Omitting `invalidateOnRefresh`. `xPercent` and the trigger boundaries are both derived from measurements taken at build time; after a resize the panel travels the wrong distance and starts at the wrong scroll position.

## Notes

- `from="left"` also reverses the grid order, so the panel enters from the side it visually occupies rather than crossing the copy on its way in.
- The `will-change-transform` hints sit on the two moving wrappers rather than on their contents, so the promoted layer is created once and the children are not each given their own.

## Definition of done

Scroll the section up from the bottom: the copy rises and the panel comes in from the right at exactly the same rate, both finishing together before the section reaches the middle of the screen. Stop the wheel mid-entrance and they keep moving for about half a second before settling. Scroll back down and the entrance reverses. No horizontal scrollbar appears at any point. With reduced motion on, the section is composed and static from the start.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
