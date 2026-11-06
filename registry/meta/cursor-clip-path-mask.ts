import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'cursor-clip-path-mask',
  title: 'Cursor Clip-Path Mask',
  category: 'cursor',
  tags: ['gsap', 'clip-path', 'mask', 'pointer', 'reveal', 'proxy-tween'],
  blurb: 'A disc of a second layer follows the pointer; hovering the trigger grows it until it covers the panel.',
  cost: 'dom',
  motif: 'rings',

  files: [
    { path: 'registry/ui/cursor-clip-path-mask.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'An upper layer is clipped to a circle that trails the pointer, so a disc of alternate content moves across a base layer. GSAP never tweens `clip-path`; it tweens a plain `{ x, y, r }` object and one `onUpdate` writes both the clip string and the ring outline from the same numbers on the same frame.',

  mechanism: [
    'The animated value is a proxy object, not a DOM property. `gsap.to(proxy, { x, y, onUpdate: write })` gives normal tween semantics — easing, overwrite, duration — over three plain numbers, and `write()` turns them into a `clip-path` string plus a transform for the ring.',
    'That indirection is the whole point. Tweening `clipPath` directly means GSAP parses and re-serialises a string each frame, and the ring outline drawn on top must be animated by a second, independent tween. Two interpolations of the same idea drift under fast movement, and a visible sliver of base layer appears between the ring and the edge of the disc.',
    'It also lets position and radius be separate tweens with different durations and eases — 0.4s linear for the follow, 0.55s `power3.inOut` for the expansion — while still producing one coherent write. That is not expressible as a single `clipPath` tween.',
    'The radius is written in px, not `%`. A percentage radius in `circle()` resolves against `sqrt(w^2 + h^2) / sqrt(2)`, not against the width, so the same percentage is a different physical size at every aspect ratio and the px-sized ring stops matching the disc it is supposed to outline.',
    'Expansion targets `Math.hypot(clientWidth, clientHeight)` — one full diagonal, which is enough to cover the panel from any point inside it, including a corner.',
    'The ring is a fixed-diameter element scaled by `r / radius` rather than an element whose width and height are rewritten, so each frame is a composited transform instead of a layout pass.',
    'Hover detection uses `pointerover`/`pointerout` on the container, which bubble, so one listener pair covers every trigger in the subtree regardless of how React re-renders it. `pointerenter` does not bubble and would need a listener per trigger plus subscription bookkeeping.',
  ],

  constants: [
    {
      name: 'radius',
      value: '130',
      why: 'Resting disc radius in px. Small enough that the base layer still dominates and the disc reads as an instrument, large enough to show a readable fragment of the layer underneath. Below ~60 you are looking through a keyhole and cannot tell what the reveal layer is.',
    },
    {
      name: 'FOLLOW_DURATION',
      value: '0.4',
      why: 'Seconds of catch-up on position. Long enough that the disc reads as being dragged rather than teleported, short enough that it is still under the pointer when you stop to read what is inside it.',
    },
    {
      name: "ease: 'none' on the follow",
      value: 'linear',
      why: 'Deliberately linear, unlike most cursor follows. The end value is remutated on every pointer event, so an eased tween re-eases from a fresh start each time and the disc reads as surging and stalling. Linear catch-up gives one steady drag speed no matter how the pointer moves.',
    },
    {
      name: 'EXPAND_DURATION',
      value: '0.55',
      why: 'Seconds for the disc to grow to a full diagonal and back. The distance travelled is large, so a follow-length 0.4s makes it feel like a cut; past ~0.8s the reveal has not finished before an impatient pointer has left the trigger.',
    },
    {
      name: "expand ease 'power3.inOut'",
      value: 'power3.inOut',
      why: 'In-out for the expansion because it is a discrete state change with a beginning and an end, unlike the follow. The slow start keeps the growth from looking explosive; the slow finish stops the edge whipping off-panel.',
    },
    {
      name: 'ring opacity ramp',
      value: 'clamp(0, 1, 2 - scale)',
      why: 'The ring is scaled, so its 1px border thickens with it. Fading it out by the time the disc has doubled hides that artefact before it becomes visible, and it also gets the outline out of the way of a full-panel reveal.',
    },
    {
      name: 'off-panel park',
      value: '-radius * 3',
      why: 'Where the disc sits before the first move and after leaving. Three radii guarantees no part of it clips back into view at any aspect ratio, and the reveal layer is invisible until the pointer earns it.',
    },
  ],

  pitfalls: [
    'Tweening `clipPath` as a string. GSAP re-parses it each frame and the ring must then be animated separately; the two interpolations diverge under fast movement and a crescent of the base layer shows between the outline and the disc edge.',
    'A percentage radius. `circle(20% at ...)` resolves against `sqrt(w^2 + h^2) / sqrt(2)`, so the disc is a different size on a wide panel than a tall one and no px-based outline can be made to match it.',
    'Forgetting `pointer-events: none` on the clipped layer. `clip-path` clips hit testing, not just paint, so the overlay becomes a region that swallows events inside the disc and passes them through everywhere else — hover targets then work or do not work depending on where the disc happens to be.',
    'Putting the trigger inside the reveal layer. It is clipped away, so it is only hoverable when it is already inside the disc, which is exactly when you no longer need to hover it. Triggers belong in the base layer.',
    'Easing the position follow. Because the tween restarts from a new end value on every event, an ease-out curve reads as the disc lunging and hesitating rather than being dragged.',
    'Animating the ring by writing `width` and `height`. That is a layout invalidation on every frame of the expansion, and it shows as jank on the exact interaction that is meant to feel expensive.',
    'Not teleporting on entry. Without the `gsap.set` on the first move, the disc eases in from its parked corner over 0.4s and drags a diagonal streak of the reveal layer across the panel every time the pointer enters.',
    '`overwrite: true` on either tween. It kills the other one, so the disc either freezes mid-expansion or stops following. `overwrite: "auto"` claims only the properties that tween actually animates, which is why position and radius can coexist on one proxy.',
  ],

  notes: [
    'Gated on `(pointer: fine)`. On touch there is no pointer to follow: `pointermove` only fires mid-drag, so the disc would sit under the finger hiding it, and it would be stranded wherever the finger lifted. The touch path parks a static disc at 34% across and vertically centred, so both layers are legible at once and the panel reads as a composed still rather than blank.',
    'Reduced motion takes the same static path — the entire effect is continuous movement, so there is nothing to slow down honestly.',
    'The reveal layer is `aria-hidden`: it is a second rendering of content the base layer already presents, and exposing both would double every heading to a screen reader.',
    'Scoped to its own container rather than the viewport. Position is measured against the container rect, so the component composes anywhere and does not assume it owns the page.',
  ],

  apiSignature:
    'function CursorClipPathMask(props: { base: ReactNode; reveal: ReactNode; radius?: number; className?: string }): JSX.Element',

  props: [
    { name: 'base', type: 'ReactNode', description: 'Always-visible bottom layer, and the layer that keeps all pointer events. Put `[data-mask-trigger]` elements here.' },
    { name: 'reveal', type: 'ReactNode', description: 'Top layer, visible only inside the disc. Clipped, `aria-hidden` and non-interactive.' },
    { name: 'radius', type: 'number', default: '130', description: 'Resting disc radius in CSS px.' },
    { name: 'className', type: 'string', description: 'Merged onto the root container via `cn`.' },
  ],

  reducedMotion:
    'No listeners attach. The disc is written once, parked at 34% across and vertically centred, and never moves. Both layers stay readable and the composition still communicates what the component does; it simply does not animate.',

  cleanup:
    'Removes all four container listeners, calls `gsap.killTweensOf(proxy)` so no tween can write to a detached node after React releases it, then clears the inline `clipPath`, `transform` and `opacity` that `write()` set. The proxy is a local object and is garbage-collected with the closure.',

  acceptance:
    'Move across the panel and a disc of the second layer drags along behind the pointer at a steady speed, with a thin ring exactly on its edge — no gap, no crescent of the base layer showing between them, even when you flick the pointer. Hover the trigger and the disc grows smoothly past the corners until the reveal layer fills the panel, with the ring fading out as it goes; leave and it shrinks back to the pointer. Resize the panel to a very wide or very tall aspect ratio and the disc stays circular and stays the same physical size. On touch the disc is parked left-of-centre and static.',

  criticalRegion: 'critical',
};

export default meta;
