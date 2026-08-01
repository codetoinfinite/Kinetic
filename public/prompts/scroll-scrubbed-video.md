# Build: Scroll-Scrubbed Video

The hard part of a scroll-scrubbed hero is never the playback — it is the mapping and the throttle. Scroll becomes a smoothed progress value that snaps when it arrives; progress becomes a quantised frame index; the frame is only ever requested when that index changes; and the loop unsubscribes once the two agree. This component ships all four and draws its frames procedurally onto a canvas, so the technique can be read without a video file in the way.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

The scroll-to-frame mapping a scrubbed hero actually needs: smoothing, a snap, a frame quantiser and a loop that parks itself.

- Category: scroll
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. Progress is `(hostTop - sectionTop) / (total - hostHeight)` against a manufactured range, read from live rects each frame. The range height is written on mount and on resize as well as from the loop, so a section still below the fold already occupies its full height instead of shifting the page when it arrives.
2. The playhead follows with `damp(current, target, smoothing, dt)`, the per-second form of the familiar `current += (target - current) * 0.12`. `perFrameToSmoothing(0.12)` performs that conversion, so the feel is preserved and the settle no longer runs at double speed on a 144 Hz display.
3. A snap threshold ends the approach. Exponential smoothing is asymptotic: without `if (|target - current| < 0.0002) current = target` the value never arrives, and any loop that waits for arrival runs forever.
4. The frame index is `round(progress * (frames - 1))`, and the draw call is guarded by `index !== drawnIndex`. This is the same guard as the `Math.abs(video.currentTime - t) > 0.003` test in a real player: asking the decoder to seek to the frame it is already showing is what makes a scrubbed video judder.
5. The loop parks itself. Once the value has snapped, `useRaf` is disabled and the subscription dropped; a scroll listener on the container wakes it. A settled hero therefore costs nothing, rather than 60 wasted frames a second over a still image.
6. Work is gated on `useInView` with `rootMargin: 200px`, so the first frame is painted just before the section enters rather than just after — the difference between arriving on a picture and arriving on a blank box.
7. The canvas backing store is sized in device pixels and the element in CSS pixels, with the ratio clamped at 2. Assigning `width`/`height` also clears the canvas, so the resize path forces a redraw by resetting the drawn index to -1.
8. Smoothed progress is published as `--scrub-progress` on the section, so a scrubber bar can move continuously in CSS while the frame behind it advances in steps.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `frames = 96`
  Steps the range quantises to. Around three seconds of 30 fps footage. Fewer than ~48 and the stepping is visible as stutter; many more and consecutive frames differ by less than the smoothing can resolve, so decode work is spent on frames nobody perceives.
- `smoothing = perFrameToSmoothing(0.12)`
  The classic `0.12` per frame at 60 Hz expressed per second (~0.0004). It absorbs wheel steps without the playhead feeling detached from the gesture. The conversion is the point: the raw 0.12 would settle more than twice as fast at 144 Hz.
- `SNAP = 0.0002`
  Progress delta below which the playhead is considered arrived. Two ten-thousandths of the range is well under one frame at any sane frame count, so snapping is invisible — and it is what allows the loop to terminate at all.
- `rootMargin = 200px`
  Starts work just before the section enters. Enough lead time to decode and paint the first frame at typical scroll speeds, small enough that scrolling past does not warm up work that is never seen.
- `viewports = 2`
  Scroll travel as a multiple of the scroller height. Two screens over ~96 frames is roughly one frame per 15 px of scroll, which reads as a continuous shot rather than a flipbook.
- `MAX_DPR = 2`
  Backing-store cap. Past 2x the extra pixels are invisible on the phones that report 3x and 4x, but the per-frame fill cost scales with their square.

## API

```ts
function ScrollScrubbedVideo(props: { frames?: number; draw?: (ctx: CanvasRenderingContext2D, frame: ScrubFrame) => void; viewports?: number; smoothing?: number; children?: ReactNode; scroller?: RefObject<HTMLElement | null>; className?: string }): JSX.Element
```

- `frames: number` — default `96`
  Discrete frames the scroll range quantises to.
- `draw: (ctx, frame: ScrubFrame) => void`
  Called only when the frame index changes or after a resize. Replace with a `currentTime` write for real footage.
- `viewports: number` — default `2`
  Scroll travel as a multiple of the scroller height.
- `smoothing: number` — default `perFrameToSmoothing(0.12)`
  Fraction of the progress gap left after one second.
- `children: ReactNode`
  Overlaid on the canvas — captions, a scrubber, a title.
- `scroller: RefObject<HTMLElement | null>`
  Scroll container. Omit to auto-detect.
- `className: string`
  Merged onto the outer section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ScrollScrubbedVideo({
  frames = 96,
  draw = defaultDraw,
  viewports = 2,
  smoothing = DEFAULT_SMOOTHING,
  children,
  scroller,
  className,
}: ScrollScrubbedVideoProps) {
  const section = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  const current = useRef(0);
  const drawnIndex = useRef(-1);
  const lastProgress = useRef('');
  const lastHeight = useRef(0);
  const palette = useRef<ScrubPalette | null>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  const reduced = useReducedMotion();
  const size = useResizeObserver(pin);
  // Work starts 200 px before the section enters, so the first frame is
  // already painted when it arrives rather than after it.
  const { inView } = useInView(section, { rootMargin: '200px' });

  // A self-parking loop. Once the smoothed value has reached the target there
  // is nothing left to compute, so the subscription is dropped entirely; a
  // scroll on the container wakes it. Without this, a settled hero keeps a
  // core busy re-deriving the same frame index sixty times a second.
  const [awake, setAwake] = useState(true);

  const render = (index: number, progress: number) => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx || size.width === 0 || size.height === 0) return;
    if (!palette.current) palette.current = readPalette(el);

    drawnIndex.current = index;
    ctx.save();
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawRef.current(ctx, {
      progress,
      index,
      frames,
      width: size.width,
      height: size.height,
      palette: palette.current,
    });
    ctx.restore();
  };

  useEffect(() => {
    const el = canvas.current;
    if (!el || size.width === 0 || size.height === 0) return;
    // The backing store is sized in device pixels and the element in CSS
    // pixels; assigning width/height also clears it, so a redraw is forced.
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    el.width = Math.round(size.width * dpr);
    el.height = Math.round(size.height * dpr);
    palette.current = readPalette(el);
    drawnIndex.current = -1;
    setAwake(true);
  }, [size.width, size.height]);

  useEffect(() => {
    const sectionEl = section.current;
    if (!sectionEl) return;
    const host = scroller?.current ?? nearestScroller(sectionEl);
    const target = host === document.documentElement ? window : host;
    const wake = () => setAwake(true);
    target.addEventListener('scroll', wake, { passive: true });
    return () => target.removeEventListener('scroll', wake);
  }, [scroller]);

  // The manufactured range is layout, so it is written on mount and on resize
  // rather than only from the loop — a section still below the fold must
  // already occupy its full height, or entering it shifts everything below.
  useEffect(() => {
    const sync = () => {
      const sectionEl = section.current;
      const pinEl = pin.current;
      if (!sectionEl || !pinEl) return;
      const host = scroller?.current ?? nearestScroller(sectionEl);
      const hostHeight =
        host === document.documentElement ? window.innerHeight : host.clientHeight;
      if (hostHeight === 0) return;
      const total = Math.round(hostHeight * (reduced ? 1 : 1 + viewports));
      if (total === lastHeight.current) return;
      lastHeight.current = total;
      sectionEl.style.height = `${total}px`;
      pinEl.style.height = `${hostHeight}px`;
      setAwake(true);
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [reduced, viewports, scroller]);

  useRaf((dt) => {
    const sectionEl = section.current;
    const pinEl = pin.current;
    if (!sectionEl || !pinEl) return;

    const host = scroller?.current ?? nearestScroller(sectionEl);
    const hostIsRoot = host === document.documentElement;
    const hostTop = hostIsRoot ? 0 : host.getBoundingClientRect().top;
    const hostHeight = hostIsRoot ? window.innerHeight : host.clientHeight;
    if (hostHeight === 0) return;

    const total = Math.round(hostHeight * (reduced ? 1 : 1 + viewports));
    if (total !== lastHeight.current) {
      lastHeight.current = total;
      sectionEl.style.height = `${total}px`;
      pinEl.style.height = `${hostHeight}px`;
    }

    const travel = total - hostHeight;
    const target = reduced
      ? 0.5
      : travel > 0
        ? clamp((hostTop - sectionEl.getBoundingClientRect().top) / travel, 0, 1)
        : 0;

    // Smooth, then snap. Without the snap the value approaches the target
    // asymptotically and the loop can never decide it has arrived.
    current.current = reduced ? target : damp(current.current, target, smoothing, dt);
    let settled = false;
    if (Math.abs(target - current.current) < SNAP) {
      current.current = target;
      settled = true;
    }

    const text = current.current.toFixed(4);
    if (text !== lastProgress.current) {
      lastProgress.current = text;
      sectionEl.style.setProperty('--scrub-progress', text);
    }

    // The seek throttle. A real player writes `video.currentTime` here, and
    // only when the frame actually changed — re-seeking to the frame already
    // displayed makes the decoder stall and the playhead judder.
    const index = clamp(Math.round(current.current * (frames - 1)), 0, frames - 1);
    if (index !== drawnIndex.current) render(index, current.current);

    if (settled) setAwake(false);
  }, awake && inView);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useRaf` unsubscribes on unmount and again whenever the loop parks. The scroll and resize listeners are removed with their effects, `useInView` unobserves through its pool, and `useResizeObserver` disconnects. The canvas holds no timers and no decoded resources.

**Reduced motion.** The manufactured range collapses to a single screen and the playhead is pinned to the middle frame with no smoothing, so the section becomes a still image with its caption rather than several screens of scroll that scrub something. The loop parks immediately and never redraws.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Writing `video.currentTime` on every frame. The decoder is asked to seek to the position it is already at dozens of times a second, and on Safari in particular the playhead visibly stalls and jumps. Quantise to a frame and guard the assignment.
- Smoothing without a snap. The playhead approaches the target forever, the "is it settled" test never passes, and a loop written to park itself never does.
- Using a per-frame smoothing constant. The scrub lags noticeably further behind the scroll at 60 Hz than at 144 Hz, and there is no single value that feels right on both.
- Encoding the source with long GOPs. Seeking then lands on the nearest keyframe and decodes forward, which is why a scrub built on a normal web encode stutters no matter how good the JavaScript is — an all-intra encode is a prerequisite, not an optimisation.
- Running the loop while the section is off screen. The whole point of a scrubbed hero is that it costs nothing until it is on screen; without an IntersectionObserver gate it costs a decode loop for the entire page lifetime.
- Sizing the canvas in CSS only. The backing store stays at its default 300x150 and the image is stretched — the resize path must assign `width` and `height` in device pixels.
- Ignoring the device pixel ratio cap. A 4x phone quadruples the fill area for pixels nobody can see, and the scrub drops to single-digit frame rates.
- Leaving the manufactured range in place under reduced motion. The user gets several screens of scroll during which nothing at all changes.

## Notes

- No video file is shipped. `draw(ctx, frame)` renders each frame procedurally so the mapping, the quantiser and the throttle can be read on their own. A real implementation replaces the body of that call with a single assignment — `video.currentTime = frame.progress * (video.duration - 0.05)` — keeping the surrounding `index !== drawnIndex` guard exactly as it is, and draws the video element instead of the canvas.
- The other things a production version needs, none of which are part of the mapping: an all-intra encode (`-g 1`), several responsive encodes selected by width with the playhead position preserved across the swap, and a decode prime on Safari — `play()` followed immediately by `pause()` — because a video that has never played will not seek.
- The `frames` value should match the source: with a video, use `duration * fps` so one index step is one real frame.
- The default draw reads its colours from the `--k-*` custom properties on the canvas, so the placeholder footage follows the theme.

## Definition of done

Scrolling advances the frame counter smoothly and reverses exactly. Stopping settles within a few frames, after which a performance profile shows no rAF activity until the next scroll. Scrolling the section off screen stops all work. Resizing redraws at the correct resolution with no stretching. The settle takes the same wall-clock time at 60 and 144 Hz. With reduced motion on, one static frame is shown and the section is one screen tall.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
