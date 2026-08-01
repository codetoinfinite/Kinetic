# Build: Hinged Container Intro

A page-enter that tips its container up from below the fold like a lid rather than sliding it in. The panel starts at 120% of its own height, rotated -45deg in X about its bottom edge, and lands over 1.4s on expo.out; captions inside it stagger in starting 0.6s before it arrives. A cue fires at 0.8s so an expensive scene can start while the panel is still in flight.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

The page body swings up from below the fold, hinged on its own bottom edge, with captions following it in.

- Category: transition
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. A wrapper carries `perspective: 1200px` and the panel inside it gets `transformOrigin: "center bottom"` plus `transformPerspective`, so the rotation pivots on the edge the panel is about to rest on and the top edge sweeps a much longer arc than the bottom.
2. The panel tween is `fromTo(el, { yPercent: 120, rotateX: -45, opacity: 0 }, { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.4, ease: "expo.out" })`. `yPercent` rather than a viewport unit means the same component works inside a 320px card and a full-bleed layout without re-tuning.
3. Elements matching `detailSelector` are collected with `querySelectorAll` on the panel and appended at `"-=0.6"`, so their 0.9s stagger overlaps the tail of the flight and the two moves read as one gesture.
4. A `tl.call(cue, undefined, 0.8)` sits at an absolute timeline position, so the cue stays at 0.8s even if either tween is retimed. That is where a WebGL scene, a video `play()`, or a data fetch is kicked off — mid-flight, while the eye is on the moving panel.
5. The whole timeline is built inside `useGsap`, keyed on `routeKey`; a key change reverts the previous context (restoring the inline styles GSAP wrote) and builds a fresh timeline from frame zero.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `duration = 1.4`
  Panel flight in seconds. Under ~1.1s the expo.out tail is too short to read as deceleration and the panel appears to snap; over ~1.8s the visitor is waiting on chrome before they can read anything.
- `tilt = -45`
  Degrees of X rotation at the start. At -20deg the perspective foreshortening is barely visible so it looks like a plain slide; past about -70deg the panel is nearly edge-on and its content is an unreadable sliver for most of the flight.
- `travel = 120`
  Percent of the panel's own height it starts below rest. 100 would put its top edge exactly at the bottom of its box, but the rotation lifts the top edge upward, so 100 lets a corner peek in at frame zero. The extra 20% covers the rotated bounding box.
- `perspective = 1200`
  Pixels. Around 600 the lens is wide enough that the panel visibly skews toward one corner; above ~2000 the projection is near-orthographic and the hinge stops reading as depth.
- `DETAIL_OVERLAP = 0.6`
  Seconds the caption stagger starts before the panel lands. At 0 the two moves read as two separate events with a dead beat between them; beyond ~0.9 the captions are moving while the panel is still steeply rotated and the text shears.
- `DETAIL_STAGGER = 0.1`
  Seconds between captions. Fast enough that three to five items finish inside the panel tween, slow enough that each is individually perceptible.
- `sceneCue = 0.8`
  Seconds into the timeline before the heavy cue fires. Late enough that the panel has visually committed to arriving (so a first-frame stall is hidden by motion), early enough that a 1.6s scene intro finishes about 1s after the panel lands rather than long after.

## API

```ts
function HingedContainerIntro(props: { children: ReactNode; routeKey?: string; duration?: number; tilt?: number; travel?: number; perspective?: number; detailSelector?: string; onSceneCue?: () => void; sceneCue?: number; className?: string }): JSX.Element
```

- `children: ReactNode`
  Page body. Rendered inside the hinging panel.
- `routeKey: string`
  Change to replay. Pass `usePathname()` in an App Router layout.
- `duration: number` — default `1.4`
  Panel flight time in seconds.
- `tilt: number` — default `-45`
  Starting X rotation in degrees.
- `travel: number` — default `120`
  Starting offset as a percentage of the panel's own height.
- `perspective: number` — default `1200`
  Perspective on the wrapper, in pixels.
- `detailSelector: string` — default `'[data-hinge-detail]'`
  Descendants that stagger in behind the panel.
- `onSceneCue: () => void`
  Called `sceneCue` seconds in. Start expensive work here.
- `sceneCue: number` — default `0.8`
  Absolute timeline position of the cue, in seconds.
- `className: string`
  Merged onto the perspective wrapper.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function HingedContainerIntro({
  children,
  routeKey,
  duration = 1.4,
  tilt = -45,
  travel = 120,
  perspective = 1200,
  detailSelector = '[data-hinge-detail]',
  onSceneCue,
  sceneCue = 0.8,
  className,
}: HingedContainerIntroProps) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Held in a ref so a caller passing an inline arrow does not have to
  // memoise it to avoid replaying the whole intro on every parent render.
  const cue = useRef(onSceneCue);
  cue.current = onSceneCue;

  useGsap(
    gsap,
    () => {
      const el = panel.current;
      if (!el || reduced) return;

      const details = Array.from(el.querySelectorAll<HTMLElement>(detailSelector));
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

      // transformOrigin bottom + negative rotateX is the whole trick: the
      // panel pivots on the edge it is about to sit on, so the top edge
      // travels much further than the bottom and the move reads as a hinge
      // instead of a translation with a tilt bolted on.
      tl.fromTo(
        el,
        {
          yPercent: travel,
          rotateX: tilt,
          opacity: 0,
          transformOrigin: 'center bottom',
          transformPerspective: perspective,
        },
        { yPercent: 0, rotateX: 0, opacity: 1, duration },
      );

      // Guarded: GSAP logs "target not found" for an empty array, and a
      // component that warns on every mount trains people to ignore the
      // console.
      if (details.length > 0) {
        tl.fromTo(
          details,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: DETAIL_DURATION, stagger: DETAIL_STAGGER },
          `-=${DETAIL_OVERLAP}`,
        );
      }

      // A number position is absolute on the timeline, so the cue stays at
      // 0.8 s no matter how the two tweens above are retimed.
      tl.call(
        () => {
          cue.current?.();
        },
        undefined,
        sceneCue,
      );
    },
    root,
    [routeKey, reduced],
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useGsap` reverts the `gsap.context` on unmount and on every `routeKey` change, which kills the timeline and restores the inline styles GSAP wrote to the panel and captions. The cue callback lives in a ref that React discards with the component, so a call queued at 0.8s cannot reach a stale closure.

**Reduced motion.** No timeline is built. A `prefers-reduced-motion` rule in the component's own stylesheet cancels the `opacity: 0` start state, so the panel and its captions render in their final position immediately, and `onSceneCue` fires on mount so anything it gates still loads.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Setting the start state only inside the effect. `useEffect` can run after the browser has painted, so the finished page flashes for one frame and then jumps below the fold. The start state is a CSS rule on `[data-hinged-panel]`; the reduced-motion branch of that same rule is what keeps the content from depending on JS at all.
- Rotating without `transformOrigin: "center bottom"`. About the centre the panel appears to tumble through its own resting position, and the bottom edge dips below the fold on the way in.
- Putting `perspective` on the panel instead of an ancestor. Then any transformed child gets its own vanishing point and the parallax between panel and captions is wrong at the edges.
- Positioning the cue with a relative `"-=0.6"` string. Retiming the panel tween silently moves the cue with it; a numeric position pins it to 0.8s absolute.
- Firing the cue only in the animated branch. Reduced-motion users then never get the scene, the video or the fetch it was gating — the cue is content delivery, not decoration.
- Passing an inline arrow as `onSceneCue` and putting it in the effect deps. Every parent render rebuilds the timeline and the intro restarts mid-flight; the callback is held in a ref instead.

## Notes

- App Router wiring: render this inside `app/layout.tsx` around `{children}` and pass `routeKey={usePathname()}`. The component itself never imports a router, so the same file works in Pages Router, Remix, or a modal keyed on a record id.
- The cue is not a substitute for a load event. If the thing it starts can fail, give it its own timeout — see `safe-preloader` for the ceiling pattern.

## Definition of done

On mount the panel rises from below with its top edge visibly further away than its bottom, settles without overshoot, and the captions land about a third of a second later. Switching route replays it from frame zero with no flash of the previous content. With reduced motion on, the panel is simply there, and the cue still fires.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
