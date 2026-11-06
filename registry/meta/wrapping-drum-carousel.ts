import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'wrapping-drum-carousel',
  title: 'Wrapping Drum Carousel',
  category: 'layout',
  tags: ['gsap', 'carousel', 'wrap', 'drag', 'infinite', 'fake-3d'],
  blurb:
    'An endless carousel that reads as a rotating drum with no 3D at all — only x, scale and fading opacity.',
  cost: 'dom',
  motif: 'orbit',

  files: [
    {
      path: 'registry/ui/wrapping-drum-carousel.tsx',
      target: 'components/motion/wrapping-drum-carousel.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'Cards sit stacked at the centre of the stage and are pushed outward by their signed distance from a fractional carousel position. That distance is wrapped into a ring, so the sequence has no first or last card and the position variable can drift forever. The drum reads as three-dimensional but every transform is flat: `rotationY` and `z` are pinned to zero on purpose.',

  mechanism: [
    '`gsap.utils.wrap(-count / 2, count / 2)` turns `i - pos` into a signed ring offset in `(-count/2, count/2]`. For six cards at `pos = 0`, card 5 resolves to `-1` and renders one slot to the *left* of centre instead of five slots right — this single call is what makes a finite array behave like an endless one.',
    'Horizontal placement is `x = offset * step` where `step = min(spacingRatio * stage.clientWidth, maxSpacing)`. Spacing is measured off the stage element, not `window.innerWidth`, so a preview in a grid cell lays out correctly when the grid reflows rather than only when the viewport does.',
    'Depth is faked by two curves with deliberately different clamps: `scale = 1 - scaleFalloff * min(distance, 1)` bottoms out one slot from centre, while `autoAlpha = clamp(0, 1, 1.15 - 0.75 * distance)` keeps falling and reaches zero at distance 1.533. Cards therefore fade out *before* they shrink far enough to look wrong, which reads as recession into fog rather than into a vanishing point.',
    '`rotationY: 0` and `z: 0` are written on every `gsap.set`. They are not decoration — they stop an ancestor `perspective` or `transform-style: preserve-3d` from turning a deliberately flat drum into a half-broken 3D one that skews at the edges.',
    '`zIndex = 100 - round(10 * distance)` is stepped, not continuous, so cards at similar distances do not flicker past each other as `pos` crosses an integer.',
    'Drag comes from `useDrag`, which handles pointer capture, an 8 px dead zone and the capture-phase click swallow. `onDrag` divides `deltaX` by the current spacing so the drum tracks the finger 1:1, and `onDragEnd` snaps to `Math.round(pos)` with a 0.7 s `power3.out` tween whose `onUpdate` re-runs the same layout function.',
    'The wheel handler accumulates `deltaX` and fires one step per 90 units, capped at 3 steps per event, then discards the remainder — an inertial trackpad flick otherwise keeps queuing steps after the fingers lift.',
  ],

  constants: [
    {
      name: 'spacingRatio',
      value: '0.46',
      why: 'Card spacing as a fraction of stage width. At 0.46 the neighbours are half-visible at the edges, which is what tells the user there is more to come. Below ~0.3 the cards overlap into a stack; above ~0.6 the neighbours leave the stage and the drum looks like a single card.',
    },
    {
      name: 'maxSpacing',
      value: '560',
      why: 'Upper bound in px. Without it a 3440 px monitor computes 1582 px of spacing and the neighbours are simply gone; the ratio has to stop scaling at roughly the width of one comfortable reading column.',
    },
    {
      name: 'scaleFalloff',
      value: '0.2',
      why: 'Neighbours render at 0.8. Less than ~0.12 and the depth cue disappears; more than ~0.3 and the off-centre cards look like a different component rather than the same one further away.',
    },
    {
      name: 'ALPHA_INTERCEPT / ALPHA_SLOPE',
      value: '1.15 / 0.75',
      why: 'Alpha is `1.15 - 0.75 * distance`. The intercept above 1 keeps the first ~0.2 of travel at full opacity so the centre card does not start dimming the instant you touch it; the slope puts the zero crossing at distance 1.533, comfortably past where scale clamps.',
    },
    {
      name: 'SNAP_DURATION',
      value: '0.7',
      why: 'Seconds for the release snap. Under ~0.45 the settle is abrupt enough that the drum reads as stepped; over ~0.9 a second drag arrives before the first has landed.',
    },
    {
      name: 'WHEEL_STEP',
      value: '90',
      why: 'Accumulated wheel units per index step. Matches roughly one detent on a mouse wheel and one deliberate trackpad swipe; at 40 a single flick advances four cards.',
    },
    {
      name: 'MAX_WHEEL_STEPS',
      value: '3',
      why: 'Ceiling on how many steps one wheel event may fire. A high-resolution trackpad can deliver a `deltaX` of 400+ in one event, which without the cap jumps five cards from a gesture the user read as one.',
    },
    {
      name: 'DRAG_THRESHOLD',
      value: '8',
      why: 'Pixels before a press counts as a drag. Below ~4 a click on a touchpad registers as a drag and the click swallow eats the tap; above ~12 short deliberate flicks are ignored.',
    },
  ],

  pitfalls: [
    'Reaching for `rotationY` and `translateZ` to get the drum look. This technique is flat on purpose — real 3D needs a shared or per-element perspective decision, correct `transform-style` on every ancestor, and it renders text on a rotated plane, which is where the blurring comes from. Write `rotationY: 0, z: 0` explicitly so an ancestor cannot opt you into 3D by accident.',
    'Accumulating position instead of recomputing it. If the layout adds a delta to each card\'s current transform, interrupting the snap tween mid-flight leaves the cards permanently offset from `pos`. Layout must be a pure function of `pos` and nothing else.',
    'Using `opacity` instead of `autoAlpha`. At `opacity: 0` the wrapped-around cards are still hit-testable, so a click intended for the centre card lands on an invisible one stacked on top of it. `autoAlpha` also sets `visibility: hidden`, which removes them from hit-testing.',
    'Forgetting to kill the snap tween on `onDragStart`. The tween keeps writing `pos` underneath the drag and the cards visibly stutter against the finger.',
    'Calling `preventDefault` on every wheel event. A vertical trackpad scroll over the carousel then does nothing and the page appears frozen. Only the horizontal component is claimed here — `Math.abs(deltaX) > Math.abs(deltaY)` gates the whole handler.',
    'Registering the wheel listener as passive. `preventDefault` is silently ignored on a passive listener and Chrome logs an "Unable to preventDefault inside passive event listener" warning on every event.',
    'Computing spacing from `window.innerWidth`. The carousel is then correct on load and wrong the moment it sits inside anything narrower than the viewport — a sidebar, a modal, a preview grid.',
  ],

  notes: [
    'This is one of three deliberately different carousel techniques in the registry, and they must not be collapsed into one. This one is **fake 3D driven by a JS position variable**: `gsap.utils.wrap` maps a continuous, unbounded index onto the item count, and depth is scale plus `autoAlpha` only. `perspective-coverflow-scroller` is **true 3D driven by a native scroll container** — real `rotateY`/`translateZ`, no JS loop. `percent-slide-carousel` is **flat percentage translation with a CSS transition** and no wrapping at all.',
    'Choose this one when the sequence must be endless in both directions and the item count is small enough that every item can stay mounted. It cannot virtualise: every card is laid out on every frame of a drag.',
    '`touch-action: pan-y` on the stage tells the browser that horizontal gestures belong to the carousel and vertical ones to the page. Without it, dragging on a phone either scrolls the page or forces you to `preventDefault` every `touchmove`, which fights the browser instead of cooperating with it.',
  ],

  apiSignature:
    'function WrappingDrumCarousel(props: { children: ReactNode; spacingRatio?: number; maxSpacing?: number; scaleFalloff?: number; className?: string; cardClassName?: string; onIndexChange?: (index: number) => void }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'One card per child. Each is wrapped in a positioned cell the component controls.' },
    { name: 'spacingRatio', type: 'number', default: '0.46', description: 'Card spacing as a fraction of the stage width.' },
    { name: 'maxSpacing', type: 'number', default: '560', description: 'Ceiling on spacing in pixels, so wide screens do not fling the neighbours off-stage.' },
    { name: 'scaleFalloff', type: 'number', default: '0.2', description: 'How much a card shrinks by one slot out from centre.' },
    { name: 'className', type: 'string', description: 'Merged onto the stage element.' },
    { name: 'cardClassName', type: 'string', description: 'Merged onto every positioned cell. This is where you size the cards.' },
    { name: 'onIndexChange', type: '(index: number) => void', description: 'Fires on every snap with the wrapped index, always in `0..count-1`.' },
  ],

  reducedMotion:
    'Drag still tracks the finger 1:1 — direct manipulation is not motion the user did not ask for. What changes is the release: instead of a 0.7 s `power3.out` tween, `pos` is assigned the target index and the layout runs once, so the drum arrives in a single frame. Wheel steps land instantly for the same reason.',

  cleanup:
    'Removes the wheel listener, kills the tween on the internal position object, kills any tween on the card elements and clears every property GSAP wrote with `clearProps: "all"`. `useDrag` releases pointer capture and removes its own five listeners. Ordering matters: tweens are killed before props are cleared, or an in-flight tween writes the transform straight back.',

  acceptance:
    'Drag left past the last card and the first one arrives from the right without a gap or a jump. Release mid-way and it settles onto the nearest card. Neighbours are visibly smaller and dimmer, and inspecting a card shows a `matrix()` transform with no 3D component. Scroll the page vertically with the cursor over the carousel and the page scrolls normally; swipe horizontally and the drum steps one card.',

  criticalRegion: 'critical',
};

export default meta;
