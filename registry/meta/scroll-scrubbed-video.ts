import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'scroll-scrubbed-video',
  title: 'Scroll-Scrubbed Video',
  category: 'scroll',
  tags: ['scroll', 'video', 'canvas', 'scrub', 'throttle'],
  blurb: 'The scroll-to-frame mapping a scrubbed hero actually needs: smoothing, a snap, a frame quantiser and a loop that parks itself.',
  cost: 'dom',
  motif: 'wave',

  files: [
    { path: 'registry/ui/scroll-scrubbed-video.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/hooks/use-raf.ts', type: 'registry:hook', role: 'shared rAF loop with clamped delta' },
    { path: 'registry/hooks/use-in-view.ts', type: 'registry:hook', role: 'pooled IntersectionObserver' },
    { path: 'registry/hooks/use-resize-observer.ts', type: 'registry:hook', role: 'element size for canvas backing store' },
    { path: 'registry/hooks/use-reduced-motion.ts', type: 'registry:hook', role: 'reduced-motion query, SSR-safe' },
    { path: 'registry/lib/damp.ts', type: 'registry:lib', role: 'frame-rate-independent interpolation, clamp, per-frame conversion' },
  ],
  dependencies: [],

  summary:
    'The hard part of a scroll-scrubbed hero is never the playback — it is the mapping and the throttle. Scroll becomes a smoothed progress value that snaps when it arrives; progress becomes a quantised frame index; the frame is only ever requested when that index changes; and the loop unsubscribes once the two agree. This component ships all four and draws its frames procedurally onto a canvas, so the technique can be read without a video file in the way.',

  mechanism: [
    'Progress is `(hostTop - sectionTop) / (total - hostHeight)` against a manufactured range, read from live rects each frame. The range height is written on mount and on resize as well as from the loop, so a section still below the fold already occupies its full height instead of shifting the page when it arrives.',
    'The playhead follows with `damp(current, target, smoothing, dt)`, the per-second form of the familiar `current += (target - current) * 0.12`. `perFrameToSmoothing(0.12)` performs that conversion, so the feel is preserved and the settle no longer runs at double speed on a 144 Hz display.',
    'A snap threshold ends the approach. Exponential smoothing is asymptotic: without `if (|target - current| < 0.0002) current = target` the value never arrives, and any loop that waits for arrival runs forever.',
    'The frame index is `round(progress * (frames - 1))`, and the draw call is guarded by `index !== drawnIndex`. This is the same guard as the `Math.abs(video.currentTime - t) > 0.003` test in a real player: asking the decoder to seek to the frame it is already showing is what makes a scrubbed video judder.',
    'The loop parks itself. Once the value has snapped, `useRaf` is disabled and the subscription dropped; a scroll listener on the container wakes it. A settled hero therefore costs nothing, rather than 60 wasted frames a second over a still image.',
    'Work is gated on `useInView` with `rootMargin: 200px`, so the first frame is painted just before the section enters rather than just after — the difference between arriving on a picture and arriving on a blank box.',
    'The canvas backing store is sized in device pixels and the element in CSS pixels, with the ratio clamped at 2. Assigning `width`/`height` also clears the canvas, so the resize path forces a redraw by resetting the drawn index to -1.',
    'Smoothed progress is published as `--scrub-progress` on the section, so a scrubber bar can move continuously in CSS while the frame behind it advances in steps.',
  ],

  constants: [
    {
      name: 'frames',
      value: '96',
      why: 'Steps the range quantises to. Around three seconds of 30 fps footage. Fewer than ~48 and the stepping is visible as stutter; many more and consecutive frames differ by less than the smoothing can resolve, so decode work is spent on frames nobody perceives.',
    },
    {
      name: 'smoothing',
      value: 'perFrameToSmoothing(0.12)',
      why: 'The classic `0.12` per frame at 60 Hz expressed per second (~0.0004). It absorbs wheel steps without the playhead feeling detached from the gesture. The conversion is the point: the raw 0.12 would settle more than twice as fast at 144 Hz.',
    },
    {
      name: 'SNAP',
      value: '0.0002',
      why: 'Progress delta below which the playhead is considered arrived. Two ten-thousandths of the range is well under one frame at any sane frame count, so snapping is invisible — and it is what allows the loop to terminate at all.',
    },
    {
      name: 'rootMargin',
      value: '200px',
      why: 'Starts work just before the section enters. Enough lead time to decode and paint the first frame at typical scroll speeds, small enough that scrolling past does not warm up work that is never seen.',
    },
    {
      name: 'viewports',
      value: '2',
      why: 'Scroll travel as a multiple of the scroller height. Two screens over ~96 frames is roughly one frame per 15 px of scroll, which reads as a continuous shot rather than a flipbook.',
    },
    {
      name: 'MAX_DPR',
      value: '2',
      why: 'Backing-store cap. Past 2x the extra pixels are invisible on the phones that report 3x and 4x, but the per-frame fill cost scales with their square.',
    },
  ],

  pitfalls: [
    'Writing `video.currentTime` on every frame. The decoder is asked to seek to the position it is already at dozens of times a second, and on Safari in particular the playhead visibly stalls and jumps. Quantise to a frame and guard the assignment.',
    'Smoothing without a snap. The playhead approaches the target forever, the "is it settled" test never passes, and a loop written to park itself never does.',
    'Using a per-frame smoothing constant. The scrub lags noticeably further behind the scroll at 60 Hz than at 144 Hz, and there is no single value that feels right on both.',
    'Encoding the source with long GOPs. Seeking then lands on the nearest keyframe and decodes forward, which is why a scrub built on a normal web encode stutters no matter how good the JavaScript is — an all-intra encode is a prerequisite, not an optimisation.',
    'Running the loop while the section is off screen. The whole point of a scrubbed hero is that it costs nothing until it is on screen; without an IntersectionObserver gate it costs a decode loop for the entire page lifetime.',
    'Sizing the canvas in CSS only. The backing store stays at its default 300x150 and the image is stretched — the resize path must assign `width` and `height` in device pixels.',
    'Ignoring the device pixel ratio cap. A 4x phone quadruples the fill area for pixels nobody can see, and the scrub drops to single-digit frame rates.',
    'Leaving the manufactured range in place under reduced motion. The user gets several screens of scroll during which nothing at all changes.',
  ],

  notes: [
    'No video file is shipped. `draw(ctx, frame)` renders each frame procedurally so the mapping, the quantiser and the throttle can be read on their own. A real implementation replaces the body of that call with a single assignment — `video.currentTime = frame.progress * (video.duration - 0.05)` — keeping the surrounding `index !== drawnIndex` guard exactly as it is, and draws the video element instead of the canvas.',
    'The other things a production version needs, none of which are part of the mapping: an all-intra encode (`-g 1`), several responsive encodes selected by width with the playhead position preserved across the swap, and a decode prime on Safari — `play()` followed immediately by `pause()` — because a video that has never played will not seek.',
    'The `frames` value should match the source: with a video, use `duration * fps` so one index step is one real frame.',
    'The default draw reads its colours from the `--k-*` custom properties on the canvas, so the placeholder footage follows the theme.',
  ],

  apiSignature:
    'function ScrollScrubbedVideo(props: { frames?: number; draw?: (ctx: CanvasRenderingContext2D, frame: ScrubFrame) => void; viewports?: number; smoothing?: number; children?: ReactNode; scroller?: RefObject<HTMLElement | null>; className?: string }): JSX.Element',

  props: [
    { name: 'frames', type: 'number', default: '96', description: 'Discrete frames the scroll range quantises to.' },
    { name: 'draw', type: '(ctx, frame: ScrubFrame) => void', description: 'Called only when the frame index changes or after a resize. Replace with a `currentTime` write for real footage.' },
    { name: 'viewports', type: 'number', default: '2', description: 'Scroll travel as a multiple of the scroller height.' },
    { name: 'smoothing', type: 'number', default: 'perFrameToSmoothing(0.12)', description: 'Fraction of the progress gap left after one second.' },
    { name: 'children', type: 'ReactNode', description: 'Overlaid on the canvas — captions, a scrubber, a title.' },
    { name: 'scroller', type: 'RefObject<HTMLElement | null>', description: 'Scroll container. Omit to auto-detect.' },
    { name: 'className', type: 'string', description: 'Merged onto the outer section.' },
  ],

  reducedMotion:
    'The manufactured range collapses to a single screen and the playhead is pinned to the middle frame with no smoothing, so the section becomes a still image with its caption rather than several screens of scroll that scrub something. The loop parks immediately and never redraws.',

  cleanup:
    '`useRaf` unsubscribes on unmount and again whenever the loop parks. The scroll and resize listeners are removed with their effects, `useInView` unobserves through its pool, and `useResizeObserver` disconnects. The canvas holds no timers and no decoded resources.',

  acceptance:
    'Scrolling advances the frame counter smoothly and reverses exactly. Stopping settles within a few frames, after which a performance profile shows no rAF activity until the next scroll. Scrolling the section off screen stops all work. Resizing redraws at the correct resolution with no stretching. The settle takes the same wall-clock time at 60 and 144 Hz. With reduced motion on, one static frame is shown and the section is one screen tall.',

  criticalRegion: 'critical',
};

export default meta;
