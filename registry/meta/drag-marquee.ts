import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'drag-marquee',
  title: 'Drag Marquee',
  category: 'layout',
  tags: ['marquee', 'drag', 'infinite', 'wrap', 'pointer-events', 'gsap'],
  blurb:
    'An endless row that drifts, takes a drag and a throw, and scatters its cards while your hand is down.',
  cost: 'dom',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/drag-marquee.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'One unwrapped accumulator carries the idle drift, the drag and the throw; the wrap happens once, in the follow tween\'s `modifiers`, as `mod(x, period) - period`. Because that is a true modulo it is total — a delta of four periods in one frame lands correctly — and because it is the identity for `x` already inside `[-period, 0)` it never shows a seam. Pressing scatters the cards on a single paused timeline that is played forwards and reversed, and releasing hands the row over to a plugin-free inertial throw.',

  mechanism: [
    'The row is `N` copies of the children inside a `w-max` flex track. `period` is the measured width of one copy — `getBoundingClientRect().width`, not `offsetWidth`, because the latter rounds and half a pixel of error is half a pixel of gap that only ever shows at the seam. The copy count is `clamp(ceil(hostWidth / period) + 1, 2, 8)`, which is exactly enough that a translation bounded by one period can never expose the end of the track.',
    'Everything that moves the row adds to one number that is never corrected: the drift subtracts `speed * dt`, each `pointermove` adds `dx`, the release adds the throw distance. It walks off to -50000 and nothing cares, because the only consumer of it applies a modulo.',
    'That modulo lives in `gsap.quickTo`\'s `modifiers`, which post-processes the value on its way to the target. It cannot feed back: `resetTo` advances the tween\'s start from its own `s + ratio * c` rather than re-reading the target, so the wrapped value is output-only. Wrapping in `onUpdate` instead makes the next retarget interpolate from a value the tween does not believe in, and the row lurches a whole period.',
    'For `x` in `[-period, 0)`, `mod(x, period) === x + period`, so `mod(x, period) - period === x`. The wrap is therefore the identity across the entire range the row normally occupies and only bites when the accumulator leaves it — the two sides of the boundary paint identical pixels, so there is nothing to snap.',
    'The gap is a trailing `margin-right` on each tile *inside* a copy rather than `gap` on the track. A track-level gap sits between copies too, so the measured copy width would no longer equal the wrap period and the seam would gain one gap of drift every lap.',
    'Release velocity is measured over a rolling ~70 ms window of `(accumulator, time)`, then projected with the `power3.out` identity: `p(t) = 1 - (1 - t)^3` has `p\'(0) = 3`, so a tween of duration `D` covering `delta` departs at `3 * delta / D`. Retargeting by `v * D / 3` continues the gesture at exactly the speed the hand left, with the core library and no `InertiaPlugin`.',
    'The press scatter is one paused timeline built once and stored in a ref, `play()` on `pointerdown` and `reverse()` on the release path. Per-tile rotation and offset come from a seeded generator indexed by position *within* a copy, so every copy of a tile scatters identically and the duplication stays invisible while the cards move.',
  ],

  constants: [
    {
      name: 'copies',
      value: 'clamp(ceil(hostWidth / period) + 1, 2, 8)',
      why: 'The `+ 1` is the copy that covers the wrap: with the translation bounded to one period, the window can start one full period into the track and still needs `hostWidth` of content after it. Drop it and the tail of the row shows background for part of every lap. The floor of 2 is the minimum that can hide a seam at all; the ceiling of 8 stops a one-word tile in a wide hero from producing hundreds of nodes.',
    },
    {
      name: 'POWER3_OUT_SLOPE',
      value: '3',
      why: 'The initial derivative of `power3.out`, and the divisor in `delta = v * D / 3`. Exact, not tuned: change the follow tween\'s ease and this changes with it — `power2` needs 2, `power4` needs 4. Leave it at 3 against a different ease and every throw is off by a constant factor.',
    },
    {
      name: 'smoothing',
      value: '0.5',
      why: 'Seconds the row takes to catch up with the pointer, and the `D` in the throw projection. Under ~0.2 s the row is welded to the finger and the throw is over before it registers; over ~0.8 s the lag between hand and content is large enough to read as dropped frames rather than as weight.',
    },
    {
      name: 'speed',
      value: '60',
      why: 'Idle drift in px/s. Below ~20 the row looks frozen at a glance and the affordance is lost; above ~120 the text is unreadable at rest, which defeats the point of putting words in it. At 0 the ticker is never registered at all, so a parked marquee costs nothing per frame.',
    },
    {
      name: 'VELOCITY_WINDOW',
      value: '0.07',
      why: 'Seconds of gesture history the release speed is averaged over. Shorter is effectively the last delta, which is noisy at 120 Hz and gives visibly different throws for identical gestures; much longer averages away a deliberate slow-down before release, so the row flies off when the user meant to place it.',
    },
    {
      name: 'MAX_VELOCITY',
      value: '4000',
      why: 'px/s the measured speed is clamped to. A coalesced pointer batch, a tab switch mid-drag or a synthetic event can report tens of thousands; without the clamp one bad sample throws the row several periods, and the wrap makes the result look random rather than fast.',
    },
    {
      name: 'MAX_THROW',
      value: '1200',
      why: 'Pixels one throw may carry. Roughly a screen and a half — far enough that a hard flick feels unbounded, close enough that the content the user was looking at is still findable when it stops.',
    },
    {
      name: 'DRAG_THRESHOLD',
      value: '5',
      why: 'Pixels of travel before a press becomes a drag. Below ~3 the tremor in a normal tap counts as a drag and every tap on a card is swallowed; above ~10 a small deliberate nudge does nothing at all.',
    },
    {
      name: 'scatter / spin',
      value: '6 (percent) / 10 (deg)',
      why: 'Half-ranges for the per-tile offset and rotation on press. The offset is a percentage of each tile\'s own size, so mixed tile widths scatter proportionally instead of the small ones flying off. Past ~15% and ~25° the tiles overlap their neighbours and the row stops reading as a row; below ~3% and ~5° the press produces no visible acknowledgement.',
    },
    {
      name: 'ease: back.inOut(3)',
      value: '3',
      why: 'The overshoot of the scatter, applied at both ends because the same timeline is played and reversed. It is what makes the cards spring apart and spring back rather than easing politely; at 1 the overshoot is invisible, past ~5 the return visibly overshoots the resting layout and the row wobbles after release.',
    },
  ],

  pitfalls: [
    'Correcting the offset with `if (x < -period) x += period` instead of a modulo. It only ever undoes one period, so a fast flick, a coalesced pointer batch, or a tab that was backgrounded for a second leaves the row several periods out and it jumps to the wrong tile. `mod` is total: any magnitude, one step, right answer.',
    'Applying the wrap in `onUpdate` rather than in `modifiers`. The tween then interpolates from a start value it computed internally toward a target the wrap has already moved, so the next retarget travels a whole extra period. `modifiers` is post-processing on the way out and never feeds back into the tween\'s own bookkeeping.',
    'Putting the gap on the track with `gap` or `space-x`. It lands between copies as well as between tiles, so the measured copy width no longer equals the wrap period; the seam gains one gap per lap and slowly slides out of register. The gap belongs inside the copy, as a trailing margin on every tile.',
    'Measuring the period with `offsetWidth`. It rounds to whole pixels, and a sub-pixel error in the period is a permanent sub-pixel misalignment at the seam that shows as a hairline flicker once per lap.',
    'Hard-coding two copies. Two is enough only while one copy is at least as wide as the container; a short tile set in a wide hero runs out of content mid-lap and the row ends in empty space. The count has to come from the measured width.',
    'Randomising the scatter per DOM node. The duplicates are the whole trick, and the instant the cards move with different rotations the eye reads them as different content — the seam becomes obvious. Index the seed by position within a copy, so copy 3 tile 5 matches copy 1 tile 5.',
    'Rebuilding the scatter timeline per press, or putting the pressed flag in the `useGsap` deps. `revert()` strips the inline transforms GSAP wrote, so the reverse starts from the untouched stylesheet values and animates nowhere — the cards stay scattered. One paused timeline, `play()` and `reverse()` from the pointer handlers.',
    'Leaving the idle drift running during a drag. The row creeps out from under the finger, which is precisely what one-to-one tracking exists to prevent; over a slow careful drag the divergence is several tiles.',
    'Calling `setPointerCapture` only after the drag threshold is crossed. A fast gesture has already left the element by then, `pointermove` stops arriving, and the row sticks at the offset it had when the pointer crossed the boundary.',
    'Handling only `pointerup`. Release outside the window, or let the OS claim the gesture, and no `pointerup` arrives: the row stays captured, the drift never resumes, and the cards stay scattered mid-throw. `pointercancel` and `lostpointercapture` route to the same idempotent finish, guarded on the stored `pointerId` so the duplicate is a no-op rather than a second throw.',
    'Letting the click through after a drag. The gesture ends with a `click` on whichever card is under the pointer, so dragging the row also opens a project. It is swallowed in the capture phase, once, and only when the gesture actually moved.',
  ],

  notes: [
    'The follow tween is retargeted, not recreated: `gsap.quickTo` keeps one tween and one `PropTween` alive and calls `resetTo` on it, so a marquee dragged for ten seconds allocates nothing per frame.',
    'The drift is registered on `gsap.ticker` rather than a second rAF loop, so the target and the tween that chases it advance in the same tick. On separate loops the row is one frame stale every other frame, which reads as a faint shimmer at speed.',
    'Because the drift keeps retargeting the same tween after release, the throw decays exponentially with a time constant of `smoothing / 3` rather than tracing a literal `power3` curve. The departure speed is still exactly the hand\'s, which is the part the eye judges.',
    'Only the first copy is exposed to assistive technology; the rest carry `aria-hidden`, so a screen reader reads the list once rather than four times.',
  ],

  apiSignature:
    "function DragMarquee(props: { children: ReactNode; speed?: number; gap?: number; smoothing?: number; scatter?: number; spin?: number; pressScale?: number; scatterDuration?: number; seed?: number | string; className?: string; tileClassName?: string; 'aria-label'?: string }): JSX.Element",

  props: [
    { name: 'children', type: 'ReactNode', description: 'One tile per child. The whole set is duplicated as many times as the width needs.' },
    { name: 'speed', type: 'number', default: '60', description: 'Idle drift in px/s. Positive drifts left; 0 parks the row and skips the ticker entirely.' },
    { name: 'gap', type: 'number', default: '24', description: 'Pixels between tiles, applied inside a copy so the spacing also spans the seam.' },
    { name: 'smoothing', type: 'number', default: '0.5', description: 'Seconds the row takes to catch up with the pointer. Doubles as the throw duration.' },
    { name: 'scatter', type: 'number', default: '6', description: 'Scatter distance on press, as a percentage of each tile\'s own size.' },
    { name: 'spin', type: 'number', default: '10', description: 'Half-range of the per-tile rotation on press, in degrees.' },
    { name: 'pressScale', type: 'number', default: '0.95', description: 'Tile scale while the pointer is down.' },
    { name: 'scatterDuration', type: 'number', default: '0.5', description: 'Seconds for the scatter out, and the same again back.' },
    { name: 'seed', type: 'number | string', default: "'drag-marquee'", description: 'Seeds the scatter. The same seed gives the same arrangement on server and client.' },
    { name: 'className', type: 'string', description: 'Merged onto the drag surface.' },
    { name: 'tileClassName', type: 'string', description: 'Merged onto every tile. Size the items here.' },
    { name: 'aria-label', type: 'string', default: "'Marquee'", description: 'Label for the focusable row, which also takes left and right arrow keys.' },
  ],

  reducedMotion:
    'Dragging is unchanged — it is the user\'s own motion, and tracking it is the component. Everything the component would have animated by itself is dropped: the idle drift is never registered on the ticker, the follow tween is never created (so the row is written straight to the wrapped position, one-to-one with the pointer, and a release does not throw), and the scatter timeline is not built, so pressing moves nothing but the row. Arrow keys still step one tile, instantly.',

  cleanup:
    'Removes `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `lostpointercapture`, the capture-phase `click` and `keydown`; releases pointer capture if a gesture is still live at unmount; removes the drift callback from `gsap.ticker`; kills the tweens on the proxy object so an in-flight throw cannot call `onUpdate` against a detached track; and reverts the `gsap.context` holding the scatter timeline, which also restores the tiles\' inline transforms. Both shared resize observers and the shared intersection observer unregister.',

  acceptance:
    'The row drifts on its own. Grab it and it follows your hand exactly, with no creep in the drift direction, and the cards tilt and shrink apart the instant you press — then settle back when you let go. Flick and release: it coasts on at the speed you left, slows, and rejoins the drift with no visible seam or jump. Drag several screens\' worth in one fast swipe and the tiles stay in order — nothing teleports. Watch one tile go off the left edge and it reappears on the right at the same spacing as every other gap. Release the pointer outside the browser window and the row keeps drifting instead of freezing scattered. Release over a card and no click reaches it; tap without moving and it does. Resize the container narrower and wider — the seam never appears. Scroll it out of view and the drift stops until it is back.',

  criticalRegion: 'critical',
};

export default meta;
