import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'rotary-drag-carousel',
  title: 'Rotary Drag Carousel',
  category: 'layout',
  tags: ['drag', 'rotation', 'inertia', 'snap', 'pointer-events', 'dial'],
  blurb:
    'A wheel of cards you grab and spin. Angular drag, projected inertia, and it always lands on a station.',
  cost: 'dom',
  motif: 'orbit',

  files: [
    {
      path: 'registry/ui/rotary-drag-carousel.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: ['use-reduced-motion', 'use-resize-observer', 'damp', 'wrap'],

  summary:
    'Items sit at fixed stations around a circle whose hub is below the frame, so only the top arc is ever visible. The gesture is measured in angle rather than pixels: `atan2(y - cy, x - cx)`, differenced through a shortest-signed wrap, so a hand sweeping the top of the wheel turns it by the amount it actually travelled around the hub. Release and it keeps going at the speed it left at, then stops with a station facing up — one motion, no corrective hop.',

  mechanism: [
    'Layout is a pure function of one number. For wheel angle `A`, station `i` sits at screen angle `theta = A + i * (360 / count) - 90`, at `(cx + R cos theta, cy + R sin theta)`, rotated by the shortest signed distance to the top, `away = wrapRange(theta + 90, -180, 180)`. `A` is unbounded and may be -4000 without consequence, because `away` is the only value that ever needs wrapping.',
    'The radius is floored at `1.25 x containerHeight`, which forces the hub `cy = topInset * height + R` strictly below the box. That is a correctness constraint, not a look: `atan2` about a point the user can touch converts a two-pixel wobble near the hub into a hundred degrees of spin.',
    'Each `pointermove` computes the pointer\'s own angle about the hub and adds `wrapRange(current - previous, -180, 180)` to `A`. The wrap is what keeps a drag across the 180° seam from reading as a 359° jerk backwards.',
    'Release velocity is measured over a rolling ~70 ms window of `(angle, time)` rather than off the final delta. Because a stationary finger produces no `pointermove` events, the window never advances while the hand is still, and the measured speed decays toward zero on its own — "drag, pause, lift" therefore does not throw.',
    'Inertia without a plugin: `power3.out` is `p(t) = 1 - (1 - t)^3`, so `p\'(0) = 3`. A tween of duration `D` covering `delta` degrees departs at `3 * delta / D` deg/s, so setting `delta = v * D / 3` makes a plain `gsap.to` continue the gesture at exactly the speed the hand left.',
    'That projected landing angle is rounded to a multiple of the station spacing *before* the tween is created, so the throw and the snap are the same tween. Snapping afterwards is a second animation starting from rest — the small hop that gives away a hand-rolled dial.',
    'Pointer capture is taken on `pointerdown`, and the release path is one idempotent `finish` guarded on the stored `pointerId`, wired to `pointerup`, `pointercancel` and `lostpointercapture` alike. A drag that ends off-screen still lands.',
  ],

  constants: [
    {
      name: 'MIN_RADIUS_HEIGHT_RATIO',
      value: '1.25',
      why: 'Radius floor as a multiple of container height, so the hub is always below the visible box. At 1.0 the hub lands exactly on the bottom edge and a press there divides by a near-zero radius; below 1.0 it is reachable and the wheel spins wildly for a pointer that barely moved.',
    },
    {
      name: 'POWER3_OUT_SLOPE',
      value: '3',
      why: 'The initial derivative of `power3.out`, and the divisor in `delta = v * D / 3`. It is exact, not tuned: change the ease and this number changes with it — `power2.out` needs 2, `power4.out` needs 4. Leave it at 3 with a different ease and the throw either undershoots or overshoots by a constant factor.',
    },
    {
      name: 'throwDuration',
      value: '1.1',
      why: 'Seconds of inertial travel. Under ~0.6 s the wheel stops so abruptly that a fast fling feels like it hit a wall; over ~1.6 s the tail is so slow it reads as broken rather than as momentum, and it delays the settle callback past the point anyone is still watching.',
    },
    {
      name: 'maxThrow',
      value: '260',
      why: 'Degrees one throw may carry, applied to the projected distance before snapping. Without a cap, a 900 deg/s fling projects 330° and the wheel makes most of a revolution from a flick — past about 270° the user loses track of which way it went and which station is coming.',
    },
    {
      name: 'VELOCITY_WINDOW',
      value: '0.07',
      why: 'Seconds of gesture history the release speed is averaged over. Shorter and it is effectively the last delta, which is noisy at 120 Hz and jitters the throw distance between identical gestures; much longer and a deliberate slow-down before release is averaged away, so the wheel throws when the user meant to place it.',
    },
    {
      name: 'MAX_VELOCITY',
      value: '900',
      why: 'Degrees per second the measured speed is clamped to. A pointer that jumps (a tab switch mid-drag, a synthetic event, a coalesced move across the hub) can report thousands of deg/s; clamping keeps one bad sample from spinning the wheel several turns.',
    },
    {
      name: 'DRAG_THRESHOLD',
      value: '5',
      why: 'Pixels of travel before a press becomes a drag. Below ~3 the hand tremor in a normal tap counts as a drag, so every tap is swallowed as a gesture; above ~10 a small deliberate nudge of the wheel does nothing at all.',
    },
    {
      name: 'CULL_DEG',
      value: '96',
      why: 'Stations more than this far from the top are `visibility: hidden`. Just past 90° they are behind the horizontal through the hub and outside the box in every supported aspect ratio, so painting them is pure cost; culling at exactly 90° makes the boundary coincide with the fade reaching its floor and items visibly wink out.',
    },
    {
      name: 'radiusRatio',
      value: '0.78',
      why: 'Radius as a fraction of container width, before the height floor. Larger flattens the arc until the wheel reads as a straight row; much smaller pulls the hub up toward the box and the visible arc bends so hard that only three stations fit.',
    },
    {
      name: 'fade',
      value: '0.85',
      why: 'Opacity lost per 90° off the top. The station one step out stays clearly legible, which is the affordance that says the wheel turns; at 1.0 the neighbours reach zero exactly at the cull angle and the wheel looks like it holds one card.',
    },
  ],

  pitfalls: [
    'Driving the rotation from `deltaX` instead of from an angle. A linear delta turns the wheel by the same amount wherever you grab it, so a drag near the left edge feels geared wrong and a drag straight down the middle does nothing at all. Angular input is what makes it feel like a physical wheel.',
    'Differencing raw `atan2` output. Crossing the ±180° seam gives a delta of about -359° instead of +1°, and the wheel snaps a full turn backwards once per revolution. Every angle difference here goes through `wrapRange(d, -180, 180)`.',
    'Putting the hub inside the container. Near the hub the pointer\'s angular change per pixel goes to infinity, so a press within a few pixels of it and a one-pixel jitter spins the wheel a hundred degrees. The radius floor makes that geometrically impossible rather than guarding it after the fact.',
    'Taking the release velocity from the last `pointermove`. Drag, hold still for half a second, lift, and the wheel flies off at the speed from before the pause, because the last event recorded was the last time the hand moved. A rolling time window measured against `performance.now()` at release decays to zero on its own.',
    'Snapping after the inertial tween instead of before it. The throw finishes, comes to rest between two stations, and a second tween hops it into place — two eases back to back, and it is instantly recognisable as fake momentum.',
    'Calling `setPointerCapture` only after the drag threshold is crossed. By then a fast gesture has already left the element, `pointermove` has stopped arriving, and the wheel sticks at the angle it had when the pointer crossed the boundary.',
    'Handling only `pointerup`. Release outside the window, let the OS claim the gesture, or have the element re-parented mid-drag and no `pointerup` arrives; the wheel stays captured and frozen mid-throw. `pointercancel` and `lostpointercapture` both route to the same idempotent finish, guarded on the stored `pointerId` so the duplicate is a no-op rather than a second throw.',
    'Letting the click through. A throw ends with a `click` dispatched on whatever card is under the pointer, so spinning the wheel also opens a project. The click is swallowed in the capture phase, once, only when the gesture actually moved.',
    'Reaching for `InertiaPlugin`. It is a Club GreenSock plugin — not redistributable, and not installable from a public registry — so a component that depends on it fails to build for most consumers. The `v * D / 3` projection reproduces the throw with the free core.',
    'Re-seeding `initialIndex` on resize. Rotate a phone mid-gesture and the wheel teleports back to its opening station. The seed is guarded by a ref and runs exactly once.',
  ],

  notes: [
    'The counter-rotation is deliberately absent: each card is rotated *with* the wheel by `away`, so the whole thing reads as one rigid disc. Cancelling that rotation keeps labels upright but turns it into a row of cards sliding along an arc, which is a different and much weaker effect.',
    'The snap grid is a multiple of `360 / count`, so a station always lands facing up. The source of this technique snapped to a fixed 10°, which only coincides with item positions when `360 / count` is itself a multiple of 10 — with 7 or 9 items it lands between cards.',
    'Arrow keys step one station and route through the same settle path, so keyboard and pointer cannot disagree about where the wheel rests.',
  ],

  apiSignature:
    "function RotaryDragCarousel(props: { children: ReactNode; radiusRatio?: number; topInsetRatio?: number; snapDeg?: number; throwDuration?: number; maxThrow?: number; fade?: number; scaleFalloff?: number; initialIndex?: number; className?: string; itemClassName?: string; onIndexChange?: (index: number) => void; 'aria-label'?: string }): JSX.Element",

  props: [
    { name: 'children', type: 'ReactNode', description: 'One item per child. Each gets a station on the wheel.' },
    { name: 'radiusRatio', type: 'number', default: '0.78', description: 'Wheel radius as a fraction of container width, floored against height so the hub stays below the box.' },
    { name: 'topInsetRatio', type: 'number', default: '0.08', description: 'Where the top of the wheel sits, as a fraction of container height.' },
    { name: 'snapDeg', type: 'number', description: 'Degrees the wheel snaps to. Defaults to one station, `360 / count`.' },
    { name: 'throwDuration', type: 'number', default: '1.1', description: 'Seconds of inertial travel after release.' },
    { name: 'maxThrow', type: 'number', default: '260', description: 'Hard cap on how far one throw may carry, in degrees.' },
    { name: 'fade', type: 'number', default: '0.85', description: 'Opacity lost per 90° away from the top station.' },
    { name: 'scaleFalloff', type: 'number', default: '0.22', description: 'Scale lost at 90° away from the top station.' },
    { name: 'initialIndex', type: 'number', default: '0', description: 'Station facing up on mount. Seeded once, never re-applied.' },
    { name: 'className', type: 'string', description: 'Merged onto the drag surface.' },
    { name: 'itemClassName', type: 'string', description: 'Merged onto every station. Size the items here.' },
    { name: 'onIndexChange', type: '(index: number) => void', description: 'Fires with the wrapped index of the station that lands facing up.' },
    { name: 'aria-label', type: 'string', default: "'Carousel'", description: 'Label for the focusable wheel, which also takes arrow keys.' },
  ],

  reducedMotion:
    'Dragging is unchanged — it is the user\'s own motion, tracked one-to-one, and removing it would remove the component. What goes away is everything the component would have animated by itself: the inertial throw is not created, so release rounds the current angle to the nearest station and assigns it in one frame, and an arrow key moves one station instantly. The wheel never travels further than the hand did.',

  cleanup:
    'Removes `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `lostpointercapture`, the capture-phase `click` and `keydown`; releases pointer capture if a gesture is still live at unmount; and kills the throw tween on the angle ref via a separate effect so an in-flight `gsap.to` cannot call `onUpdate` against detached nodes. The shared resize observer unregisters. Nothing but inline styles on the stations remains, and those die with the nodes.',

  acceptance:
    'Grab anywhere in the box and drag in an arc: the wheel follows your hand around the hub, and a drag near the left or right edge turns it less than the same pixel distance across the top. Fling and release — it keeps going, decelerates, and comes to rest with one card exactly upright, in a single continuous motion with no hop at the end. Drag, hold still for a second, then lift: it settles to the nearest station without throwing. Start a drag, move the pointer off the window, and release outside — the wheel still lands rather than freezing. Release over a card and no click reaches it; tap the same card without moving and the click goes through. Arrow keys step one card at a time.',

  criticalRegion: 'critical',
};

export default meta;
