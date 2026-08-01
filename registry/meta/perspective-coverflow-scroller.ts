import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'perspective-coverflow-scroller',
  title: 'Perspective Coverflow Scroller',
  category: 'layout',
  tags: ['coverflow', '3d', 'scroll-snap', 'native-scroll', 'carousel'],
  blurb:
    'Panels turn away from the centre in real 3D as you scroll a native container — no tween, no loop.',
  cost: 'dom',
  motif: 'orbit',

  files: [
    {
      path: 'registry/ui/perspective-coverflow-scroller.tsx',
      target: 'components/motion/perspective-coverflow-scroller.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],
  registryDependencies: ['use-reduced-motion', 'use-resize-observer', 'damp'],

  summary:
    'A horizontal `overflow-x-auto` container with `scroll-snap-type: x proximity`. Each panel\'s distance from the centre of the viewport is normalised to roughly ±1 and mapped onto a per-element `perspective() translateZ() rotateY() scale()`, so panels turn their inside edge toward you as they leave the middle. The scroll position itself is never animated by JavaScript — momentum, rubber-banding and keyboard paging are the browser\'s.',

  mechanism: [
    'A measure pass caches each panel\'s layout centre as `panel.offsetLeft + panel.offsetWidth / 2` and sets the track\'s left and right padding to `(scroller.clientWidth - endPanel.offsetWidth) / 2`, which is exactly enough runway for the first and last panel to reach the middle of the viewport.',
    'On every coalesced scroll frame, the normalised offset is `r = clamp((centre - scrollLeft - half) / half, -1.2, 1.2)` where `half = scroller.clientWidth / 2`. `r = 0` is dead centre, `r = ±1` is one half-viewport out.',
    'That single scalar drives four things: `rotateY = -rotation * r` (negative, so a panel on the right turns its left edge toward you — the flip-book read), `translateZ = -depth * |r|` (always receding), `scale = 1 - scaleFalloff * min(|r|, 1)`, and `opacity = 1 - opacityFalloff * min(|r|, 1.2)`.',
    '`perspective(1300px)` is written inside each panel\'s own transform rather than as a `perspective` property on the track. A shared parent perspective gives every panel the same vanishing point, so panels near the edges skew as well as rotate; per-element perspective turns each panel about its own centre.',
    'The two clamps differ on purpose — `min(|r|, 1)` for scale and `min(|r|, 1.2)` for opacity — so distant panels keep their proportions while continuing to fade out.',
    'A `ResizeObserver` on the track re-runs the measure pass whenever content size changes (a font swap, a child growing), which is the deterministic replacement for the usual pile of `setTimeout(recompute, 300)` calls.',
  ],

  constants: [
    {
      name: 'perspective',
      value: '1300',
      why: 'Per-element perspective distance in px. Under ~700 the foreshortening is strong enough that a 40° turn hides most of the panel; over ~2000 the rotation flattens out and reads as a skew rather than a turn.',
    },
    {
      name: 'rotation',
      value: '40',
      why: 'Degrees of `rotateY` at the clamp. 40° is the point where the panel is visibly turned but still legible; past ~55° it is close enough to edge-on that text disappears and antialiasing on the near edge gets ugly.',
    },
    {
      name: 'depth',
      value: '130',
      why: 'Pixels of `translateZ`, always negative so off-centre panels recede. Combined with the rotation this is what makes the row read as the inside of a cylinder rather than a fanned deck. At 0 you get a pure hinge; past ~250 the far panels shrink faster than `scaleFalloff` intends and the two cues disagree.',
    },
    {
      name: 'scaleFalloff',
      value: '0.12',
      why: 'A panel at one half-width out renders at 0.88. Kept small because `translateZ` is already shrinking it perspectivally — stacking a large explicit scale on top double-counts the distance.',
    },
    {
      name: 'opacityFalloff',
      value: '0.35',
      why: 'The edge panels land near 0.58, not 0. They must stay readable, because on a proximity-snap track they are the affordance that tells you there is more to scroll to.',
    },
    {
      name: 'maxOffset',
      value: '1.2',
      why: 'Clamp on `r`. Without it, a long track keeps rotating panels past 90° and they flip to their back faces; 1.2 rather than 1.0 leaves a little travel past the half-width mark so the outermost visible panels are not all frozen at an identical angle.',
    },
  ],

  pitfalls: [
    'Computing the offset from `getBoundingClientRect()`. The rect reflects the transform this component just wrote, so each panel\'s `scale()` feeds back into the next frame\'s offset and the row slowly drifts to a wrong steady state. `offsetLeft`/`offsetWidth` are layout values — untouched by transforms and by `scrollLeft`.',
    'Putting `perspective` on the track instead of in each panel\'s transform. Every panel then shares one vanishing point, so the ones near the edges skew into parallelograms instead of turning.',
    'Handling `scroll` without coalescing into a frame. A trackpad fires scroll events considerably faster than the compositor paints, and every run writes N style strings for no visible benefit.',
    'Padding the track with a viewport unit like `24vw`. It is correct for exactly one panel width and one container width; inside a card, a modal or a split layout the end panels can never reach the centre and are permanently unselectable.',
    'Setting `scroll-snap-type: x mandatory`. Release between two panels and the browser yanks you to one of them, which fights every attempt to scan the row. `proximity` snaps only when you were already close.',
    'Starting at `scrollLeft = 0`. The first panel is then hard against the left edge with nothing to its left, so the effect is invisible until the user scrolls. Centring on a panel on mount shows the technique in both directions immediately.',
    'Re-centring on every resize. `scrollLeft` is only assigned once, guarded by a ref — otherwise rotating a phone, or any resize during a scroll, teleports the user back to the middle mid-gesture.',
  ],

  notes: [
    'One of three deliberately different carousel techniques here, and the distinctions are the point. This one is **true 3D on a native scroll container**: actual `rotateY` and `translateZ`, and no JavaScript animation drives the scroll at all — the handler only reads a position the browser already set. `wrapping-drum-carousel` is **fake 3D** driven by a tweened JS position with `rotationY: 0, z: 0` pinned, and wraps infinitely via `gsap.utils.wrap`. `percent-slide-carousel` is **flat, bounded, one CSS transition per index change**.',
    'Choose this one when the set is long, scanning matters more than stepping, and you want native momentum and keyboard support for free. It cannot loop: a native scroll container has real ends.',
    'Because the panels rotate in 3D, text inside them is composited on a rotated plane and will look softer than flat text. That is inherent to the technique, not a bug to tune away; keep small type out of the panels or accept it.',
  ],

  apiSignature:
    "function PerspectiveCoverflowScroller(props: { children: ReactNode; perspective?: number; rotation?: number; depth?: number; scaleFalloff?: number; opacityFalloff?: number; maxOffset?: number; initialIndex?: number; className?: string; panelClassName?: string; 'aria-label'?: string }): JSX.Element",

  props: [
    { name: 'children', type: 'ReactNode', description: 'One panel per child. Each is wrapped in a snap-aligned cell.' },
    { name: 'perspective', type: 'number', default: '1300', description: 'Per-element perspective distance in px.' },
    { name: 'rotation', type: 'number', default: '40', description: 'Degrees of `rotateY` at the clamp.' },
    { name: 'depth', type: 'number', default: '130', description: 'Pixels of `translateZ` at the clamp. Applied negatively, so panels recede.' },
    { name: 'scaleFalloff', type: 'number', default: '0.12', description: 'How much a panel shrinks one half-viewport out.' },
    { name: 'opacityFalloff', type: 'number', default: '0.35', description: 'How much a panel fades one half-viewport out.' },
    { name: 'maxOffset', type: 'number', default: '1.2', description: 'Clamp on the normalised offset, so distant panels stop turning further.' },
    { name: 'initialIndex', type: 'number', description: 'Panel centred on mount. Defaults to the middle of the set.' },
    { name: 'className', type: 'string', description: 'Merged onto the scroll container.' },
    { name: 'panelClassName', type: 'string', description: 'Merged onto each snap cell. Size the panels here.' },
    { name: 'aria-label', type: 'string', default: "'Gallery'", description: 'Label for the scrollable region, which is focusable for keyboard scrolling.' },
  ],

  reducedMotion:
    'The scroller keeps working exactly as it did — it is a real scroll container, and scrolling is user-driven, not animation. What is removed is the 3D: `transform` and `opacity` are cleared on every panel, so the row renders as a flat, fully opaque filmstrip that still snaps by proximity. Nothing moves that the user did not move.',

  cleanup:
    'Removes the `scroll` listener, cancels any pending `requestAnimationFrame`, and disconnects the track `ResizeObserver`. The shared element observer unregisters the scroller. Inline `transform`/`opacity` written on panels dies with the nodes; no timer or tween outlives the component.',

  acceptance:
    'On mount a panel sits centred and the ones either side are visibly turned toward it. Drag or trackpad-scroll and the turn follows continuously with no lag and no snap-back; release near a panel and it snaps, release between two and it does not. Scroll to either end and the outermost panel reaches the exact centre of the container. Resize the container and the end padding recomputes so it still can.',

  criticalRegion: 'critical',
};

export default meta;
