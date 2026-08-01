import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'gsap-cursor-follower',
  title: 'GSAP Cursor Follower',
  category: 'cursor',
  tags: ['gsap', 'pointer', 'custom-cursor', 'follower', 'overwrite'],
  blurb: 'A puck that replaces the arrow inside a panel, trailing 0.4s behind and swelling to a label over targets.',
  cost: 'dom',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/gsap-cursor-follower.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: [],

  summary:
    'A container hides its native cursor and draws its own: a small disc that lags the pointer by a settling tween, and swells into a labelled puck whenever it passes over an element marked `data-cursor-target`. The lag comes from GSAP rather than from a damped rAF loop, which is why the disc comes to rest when the pointer stops instead of asymptoting toward it forever.',

  mechanism: [
    'On mount the puck is centred on its own coordinates with `gsap.set(circle, { xPercent: -50, yPercent: -50 })` and the positioning wrapper is parked at `x: -999, y: -999`. From then on the follow tween writes raw x/y and the centring composes into the same matrix, so there is no per-move offset arithmetic and exactly one composited transform per node.',
    'Every `pointermove` issues `gsap.to(wrapper, { x: e.clientX - rect.left, y: e.clientY - rect.top, duration, ease: "power2.out", overwrite: "auto" })`. `overwrite: "auto"` retires the previous tween so the ~120 events a second do not accumulate into ~120 concurrent tweens writing the same transform.',
    'This is deliberately GSAP smoothing rather than `useSmoothPointer`. A tween re-eases from its current velocity to a *rest* at the target, so the puck decelerates into stillness the instant the pointer stops; an exponential `damp` never actually arrives. Reach for the damped hook when you want a value that is permanently chasing, and for this when you want it to settle.',
    '`pointerenter` teleports first (`duration: 0`) and only then fades in, so re-entering the panel does not drag a visible streak across it from wherever the puck was last parked.',
    'The hover state is delegated: one handler runs `e.target.closest("[data-cursor-target]")` per move and compares the result with the previous state, tweening `scale` on the disc and `autoAlpha`/`scale` on the label only on the transition. Scale — not width/height — keeps the resize on the compositor with no layout pass.',
  ],

  constants: [
    {
      name: 'PARK',
      value: '-999',
      why: 'Initial x/y. The element exists from first paint but must be *nowhere*; at 0,0 it flashes in the top-left corner for the frames between mount and the first pointer event.',
    },
    {
      name: 'duration',
      value: '0.4',
      why: 'Seconds of catch-up. Below ~0.2 the puck is welded to the pointer and the trailing read disappears; past ~0.7 it feels detached from the hand and users start chasing it.',
    },
    {
      name: 'size',
      value: '16',
      why: 'Resting diameter. Small enough to point precisely with, large enough to see against a busy panel. Applied as `scale: size / targetSize` so only the transform changes.',
    },
    {
      name: 'targetSize',
      value: '112',
      why: 'Diameter over a target. It has to hold a short label at 14px with real breathing room — under ~90 the text touches the circle edge and the puck reads as a broken badge.',
    },
    {
      name: 'RESIZE_DURATION',
      value: '0.45',
      why: 'The swell. With `expo.out` this is almost all its motion in the first 120ms, which is what makes the state change feel like a snap rather than an inflation.',
    },
    {
      name: 'FADE_DURATION',
      value: '0.3',
      why: 'Enter/leave opacity. Fast enough that the puck is present before the user has moved a meaningful distance into the panel.',
    },
  ],

  pitfalls: [
    'Calling `gsap.to` per pointermove without `overwrite: "auto"`. Sixty to a hundred and twenty 0.4s tweens end up live at once, all writing the same transform, and the puck stutters instead of gliding — the single most common way this effect is got wrong.',
    'Fading in without teleporting first. On every re-entry the puck tweens from its parked coordinates, drawing a diagonal streak across the whole panel before it reaches the pointer.',
    'Re-issuing the resize tween on every move instead of only on the hover transition. Each call restarts the `expo.out` ease from the beginning, so the puck creeps toward the target size and never gets there while the pointer keeps moving.',
    'Transitioning `width` and `height` for the swell. That is a layout write per frame on an element the compositor could otherwise leave alone; `scale` on a fixed-size disc is the same picture for free.',
    'Caching the container rect on mount. The panel scrolls, resizes, and may sit inside a transformed ancestor — a stale rect offsets the puck from the real pointer by a constant amount that never corrects itself.',
    'Putting `cursor: none` in the class list. It then applies on touch devices too, where it hides nothing but does suppress the text-selection caret; setting it from the effect means it only ever exists where the puck does.',
  ],

  notes: [
    'Gated on `(pointer: fine)`. On touch nothing attaches: no listeners, no `cursor: none`, and the puck stays at `autoAlpha: 0` parked off-container, so a tap does not flash a disc at the touch point.',
    'Mark any element inside with `data-cursor-target` to trigger the labelled state — including elements nested arbitrarily deep, since the check is a `closest()` walk.',
    'The root sets `isolate`, so the puck stacks above the panel content without needing a page-level z-index.',
  ],

  apiSignature:
    'function CursorFollower(props: { children: ReactNode; label?: string; duration?: number; size?: number; targetSize?: number; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Panel content. Anything inside carrying `data-cursor-target` triggers the labelled state.' },
    { name: 'label', type: 'string', default: "'View'", description: 'Text revealed inside the puck over a target.' },
    { name: 'duration', type: 'number', default: '0.4', description: 'Seconds of catch-up on the follow tween.' },
    { name: 'size', type: 'number', default: '16', description: 'Resting diameter in px.' },
    { name: 'targetSize', type: 'number', default: '112', description: 'Diameter over a target, in px. Also the disc\'s laid-out size.' },
    { name: 'className', type: 'string', description: 'Merged onto the root container via `cn`.' },
  ],

  reducedMotion:
    'The puck still appears and still swells over targets — the affordance is preserved — but every duration collapses to 0, so it is welded to the pointer with no trailing lag and the size change is a hard cut. The native cursor stays hidden, because a container with no cursor at all would be worse than one that moves.',

  cleanup:
    'Removes the three container listeners, restores the container\'s previous inline `cursor`, calls `gsap.killTweensOf` on the wrapper, disc and label, then `gsap.set(..., { clearProps: "all" })`. Kill precedes clear so no in-flight tween can write the transform back after React has recycled the node.',

  acceptance:
    'Move into the panel: the arrow disappears and a small disc arrives at the pointer without sweeping in from an edge, then trails about 0.4s behind as you move. Pass over a marked target and it swells into a labelled puck; leave and it shrinks back. Stop moving and it comes fully to rest rather than creeping. On a touch device the native cursor and all default behaviour are untouched.',

  criticalRegion: 'critical',
};

export default meta;
