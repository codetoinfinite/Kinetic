# Build: Lottie Ratio Poster

A slot for a Lottie that costs nothing until the slot is nearly on screen. The box is reserved at a provisional ratio and filled with a poster drawn in CSS; an IntersectionObserver on the already-sized box starts the fetch; the resolved JSON reports its own composition size in its `w` and `h` fields, the box takes that exact ratio, the player mounts underneath and the poster crossfades away. The readout prices the provisional guess in pixels of layout shift. No Lottie runtime is imported — loading and playback go through a render prop, so the packaged part is the reservation, not the player.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Reserves the box, holds a drawn poster, fetches the JSON only in view, then corrects the ratio from the animation's own w and h.

- Category: primitive
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. The reserved box is a single `aspect-ratio` declaration on a full-width element, applied on first paint from the provisional ratio. That is what makes everything after it possible: a box with height cannot shift when it fills, and a box with height gives the IntersectionObserver something real to test.
2. The intersection test runs on that reserved box, with `once: true` and a 240px root margin, so the fetch starts roughly one flick of the wrist before the box arrives. Observing an unreserved, zero-height element instead is the classic failure — a collapsed box intersects the viewport from almost anywhere on the page, so the lazy load fires immediately and the laziness was decorative.
3. A Lottie JSON carries its composition size at the root: `w` and `h`, alongside `v`, `fr`, `ip`, `op` and `layers`. `w / h` is therefore the exact box before the player has been constructed, let alone measured, so the correction happens on the frame the file lands rather than after a layout pass.
4. The provisional ratio and the real ratio are both kept, and the difference is reported as `Math.abs(width / ratio - width / actual)` — the number of pixels everything below the box moved, at the current width. It is the same quantity that feeds Cumulative Layout Shift, in the units the user actually experienced.
5. The in-flight promise is stored in a ref rather than guarded by a boolean. StrictMode double-invokes the Effect: with a `started` flag the first call is abandoned by its own cleanup and the second is blocked by the flag, so the load silently never completes. Reusing the promise means one request and one subscription per Effect run.
6. The poster is dissolved two animation frames after `ready`, not on the same tick — one frame for React to commit the player and one for the browser to paint it. It is then unmounted on a timer rather than on `transitionend`, because a transition on a subtree that has been hidden never fires the event and the poster would sit over the player permanently.
7. A zero or missing dimension is treated as a failed load rather than divided by. `w / 0` is Infinity, which collapses `aspect-ratio` and takes the reserved box with it — the exact failure the component exists to prevent, arriving through the component itself.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `DEFAULT_RATIO = 16 / 9`
  The provisional ratio, and named as a guess rather than a default so nobody inherits it by accident. Take the real number out of the design file: against the 3:2 composition in the demo, 16:9 costs 47 pixels of shift at 380px wide.
- `ROOT_MARGIN = '240px'`
  About a third of a laptop viewport, or roughly 400ms of ordinary scrolling — enough for a one-megabyte JSON on a decent connection to land before the box arrives. Larger and you are prefetching things the user will never reach; smaller and the poster is still up when the box is centred.
- `FADE_MS = 320`
  Poster crossfade. Long enough to read as a dissolve rather than a cut, short enough that the poster is not still visibly over the first second of the animation.
- `FADE_SLACK = 60`
  Extra milliseconds before the poster is unmounted. The transition is driven by a class change, so the removal timer and the transition clock do not share an origin; without the slack the poster can be pulled at opacity 0.04.

## API

```ts
function LottieRatioPoster<T extends LottieRatioSource>(props: { load: () => Promise<T>; children: (state: { source: T; reduced: boolean }) => ReactNode; ratio?: number; rootMargin?: string; fade?: number; label?: string; className?: string }): JSX.Element
```

- `load: () => Promise<T>`
  Fetches the animation JSON. Called at most once, and only once the reserved box is within `rootMargin`.
- `children: (state: { source: T; reduced: boolean }) => ReactNode`
  Render prop for the player. Mounted absolutely inside the reserved box.
- `ratio: number` — default `16 / 9`
  Provisional width / height, used until the JSON reports its own.
- `rootMargin: string` — default `'240px'`
  How early to start fetching, as an IntersectionObserver root margin.
- `fade: number` — default `320`
  Poster crossfade in milliseconds.
- `label: string` — default `'animation'`
  Short text on the poster.
- `className: string`
  Merged onto the outer element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
useEffect(() => {
  if (!inView) return;
  let alive = true;

  request.current ??= loadRef.current();
  setPhase((prev) => (prev === 'waiting' ? 'loading' : prev));

  request.current.then(
    (data) => {
      if (alive) apply(data);
    },
    () => {
      if (alive) setPhase('failed');
    },
  );

  return () => {
    alive = false;
  };
}, [inView, apply]);

// The real ratio comes from the JSON's own composition size, so the box is
// exact from the frame the file lands rather than from the frame the player
// finishes measuring itself.
const actual = source ? source.w / source.h : null;
const applied = actual ?? ratio;

// What the guess cost, in the units the user experiences it in. Everything
// below this box moves by exactly this many pixels at the current width.
const shift =
  actual !== null && width > 0 ? Math.abs(width / ratio - width / actual) : 0;
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The intersection subscription is removed by `useInView`, which also unobserves after the first hit because it is used with `once`. Both timers are cleared and both `requestAnimationFrame` handles cancelled on teardown. The load promise cannot be aborted, so it is neutered instead: an `alive` flag in the Effect closure means a late resolution calls no setter after teardown. The promise itself is deliberately retained in a ref across Effect runs, which is what makes the request happen once rather than once per run.

**Reduced motion.** The poster loses its shimmer and the crossfade collapses to a zero-duration swap, so the poster is replaced rather than dissolved. The fetch is unaffected — reduced motion is a request about movement, not about content, and withholding the animation entirely would leave a permanent placeholder where the user expected something. The render prop is handed `reduced: true` so the player itself can park on its last frame, which is the conventional still for a Lottie.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Lazy-loading against an unreserved box. A zero-height element intersects the viewport from nearly anywhere in the document, so the observer fires on mount and the fetch was never deferred. Reserve first, observe second — in that order, in the same element.
- Waiting for the player to report the size. `lottie-web` measures its own SVG after construction, which is after the layout has already happened at the wrong ratio. The JSON's `w` and `h` are available the instant the fetch resolves, before anything is instantiated.
- Guarding a one-shot fetch with a boolean ref. StrictMode runs the Effect, tears it down and runs it again; the first call is discarded by its own cleanup and the second is refused by the flag, so the promise never lands and the poster stays up in development only. Hold the promise itself in the ref.
- Dissolving the poster in the same commit that mounts the player. The player has not painted, so the crossfade runs over an empty box and reads as a flash. Two `requestAnimationFrame` calls put it after the paint.
- Unmounting the poster on `transitionend`. If the subtree is hidden mid-transition — a route change, a tab switch, an `Activity` boundary — no event is delivered and the poster is stranded on top of the player. Use a timer.
- Dividing by a dimension you did not check. A malformed or truncated JSON with `h: 0` produces an Infinite ratio, `aspect-ratio` gives up, and the reserved box collapses to nothing.
- Shipping the Lottie runtime for a decoration. `lottie-web` is around 60KB gzipped before any animation data; if the thing being animated is one badge in a footer, the runtime costs more than the effect is worth, and this component is where you notice.

## Notes

- No Lottie runtime is imported and no `.json` is committed. `load` is any function returning the parsed animation, and `children` is where the player goes, so the same slot works for `lottie-web`, `@lottiefiles/dotlottie-web`, a video, or a canvas.
- Type the resolved JSON yourself and pass it as the generic: `LottieRatioPoster<MyLottie>` gives the render prop the full object rather than only `w` and `h`.
- For reduced motion the render prop receives `reduced: true`. The conventional response with `lottie-web` is to construct it with `autoplay: false` and call `anim.goToAndStop(anim.getDuration(true) - 1, true)` — `getDuration(true)` returns frames, so the last frame is one less than that.

## Definition of done

On load the box already occupies its full reserved height, with a poster in it and a readout reading `reserved 1.78 · waiting for viewport`. Scroll it into view and the readout goes to `fetching json` roughly a scroll-flick before the box arrives. When the JSON lands the box snaps to 1.50, the player fades up under the dissolving poster, and the readout names the shift in pixels. Set the provisional ratio to 1.5 and reload: same sequence, and the readout says `no shift`. With reduced motion the poster does not shimmer and the swap is instant.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
