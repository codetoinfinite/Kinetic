import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'slow-float-idle',
  title: 'Slow Idle Float',
  category: 'primitive',
  tags: ['css', 'idle', 'keyframes', 'translate', 'zero-js'],
  blurb: 'A 14px rise and fall over 5 seconds, on the independent translate property so hover transforms still work.',
  cost: 'css',
  motif: 'wave',

  files: [
    {
      path: 'registry/ui/slow-float-idle.tsx',
      target: 'components/motion/slow-float-idle.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'The ambient motion you put on a hero image, a floating card or a badge so the page does not feel frozen. Fourteen pixels over five seconds is under the threshold at which the eye tracks it as movement — you read it as presence. Because it animates `translate` rather than `transform`, the element can still carry a hover scale or a tilt without the two fighting.',

  mechanism: [
    'A two-pose keyframe: `0%, 100% { translate: 0 0 }` and `50% { translate: var(--kx-float-x) var(--kx-float-y) }`. Both endpoints of the round trip are the resting position, so the loop has no seam and the element always returns to exactly its layout position.',
    'The animated property is `translate`, not `transform`. They are separate properties that compose in the order translate, rotate, scale, transform — so a consumer can put `hover:scale-105` (a `transform`) on the same element and both apply. An animation on `transform` would instead override any transition on `transform` for its entire duration, and the hover would appear dead.',
    'Direction comes from custom properties rather than separate keyframe blocks: `axis="y"` writes `--kx-float-y: -14px` and leaves X at 0, `axis="x"` does the reverse. One keyframe block covers both axes and any diagonal a consumer wants to set by hand.',
    '`phase` is applied as a negative `animation-delay` — `-durationMs * phase`. A negative delay means the animation is treated as having already been running for that long, so an element starts mid-flight on its first painted frame. A positive delay would make it sit dead still until its turn came round, which is exactly what makes staggered idle animations look broken on load.',
    '`ease-in-out` is what makes it buoyant. The element decelerates into both extremes and hangs there; `linear` gives constant velocity and reads as a mechanical lift.',
    '`will-change: translate` names the property that is actually animating. `will-change: transform` — the reflex — hints at a property this component never touches.',
  ],

  constants: [
    {
      name: 'distance',
      value: '14px',
      why: 'Peak travel. Average speed works out at roughly 11px per second, which is below the rate at which the eye starts tracking an object instead of just registering it. Under about 6px the motion is invisible on a 1x display; over about 24px it reads as a balloon on a string and pulls focus from the content.',
    },
    {
      name: 'durationMs',
      value: '5000',
      why: 'The round trip. Faster than about 3s and it becomes a pulse that competes with real feedback in the UI; slower than about 8s and the element appears to have simply drifted out of position rather than to be floating.',
    },
    {
      name: 'timing function',
      value: 'ease-in-out',
      why: 'Buoyancy comes from the hold at the two extremes. `linear` moves at constant velocity, which reads as a machine; `ease-out` alone makes the return leg abrupt and the loop develops a visible tick at 100%.',
    },
    {
      name: 'phase sign',
      value: 'negative',
      why: 'Negative delay starts the animation partway through its first cycle instead of postponing it. With a positive delay a staggered group is motionless for the first phase*duration milliseconds after mount — on a five-second cycle with four items that is several seconds of a page that looks frozen.',
    },
  ],

  pitfalls: [
    'Animating `transform` instead of `translate`. Animations beat transitions on the same property for as long as they run, so a `transition: transform` hover on the same element never has a visible effect — the hover looks broken and the cause is a keyframe elsewhere in the file.',
    'Animating `top` or `margin-top` for the float. Those are layout properties: the ancestor reflows on every frame and any sibling laid out after it jitters. Only `translate`, `transform`, `opacity` and `filter` stay off the layout path.',
    'Staggering a group with positive `animation-delay`. Every element holds at its 0% pose until its delay expires, so the group starts as a static row and comes alive one item at a time — most visible right after a page load, which is the worst possible moment.',
    'Setting `will-change: transform` for an animation on `translate`. The hint names a property that never changes; the browser may still promote the layer for other reasons, so the mistake produces no error and no benefit.',
    'Leaving `will-change` on when reduced motion is active. The element keeps a dedicated compositor layer for an animation that has been switched off — cost with no motion in exchange.',
    'Parking the element at the midpoint of the float for reduced motion. The float exists to add life, not to reposition anything; freezing it 14px above its layout position leaves a permanent, unexplained gap under the element.',
  ],

  notes: [
    'The independent `translate`, `rotate` and `scale` properties need Chrome 104+, Safari 14.1+ and Firefox 72+. In an older engine the declaration is dropped and the element simply does not float — the layout is unaffected.',
    'The wrapper is a `div` with `display: block`. To float an inline element, pass `className="inline-block"`; a floated `display: inline` box would have nothing to translate.',
    'For a group, give each instance a different `phase` — 0, 0.25, 0.5, 0.75 for four items. Equal phases make the group move as one rigid object, which is more noticeable than no motion at all.',
  ],

  apiSignature:
    "function SlowFloatIdle(props: { children: ReactNode; distance?: number; durationMs?: number; axis?: 'x' | 'y'; phase?: number; className?: string }): JSX.Element",

  props: [
    { name: 'children', type: 'ReactNode', description: 'What floats. Wrapped in a block-level element that owns the `translate`.' },
    { name: 'distance', type: 'number', default: '14', description: 'Peak travel in pixels, reached at the midpoint of the cycle.' },
    { name: 'durationMs', type: 'number', default: '5000', description: 'Full round trip in milliseconds.' },
    { name: 'axis', type: "'x' | 'y'", default: "'y'", description: 'Direction of travel. `y` rises then falls; `x` drifts right then back.' },
    { name: 'phase', type: 'number', default: '0', description: 'Start position in the cycle, 0-1. Applied as a negative `animation-delay`.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper via `cn`. Safe to use `transform`-based utilities here — the float does not use `transform`.' },
  ],

  reducedMotion:
    'A `@media (prefers-reduced-motion: reduce)` block sets `animation: none` and `will-change: auto`. The element rests at its natural layout position — not at the top of the float — so nothing shifts and no gap appears where the animation used to be.',

  cleanup:
    'Nothing to clean up. No listeners, no timers, no animation frames. Unmounting removes the element and its CSS animation; React removes the hoisted `<style>` when the last instance unmounts.',

  acceptance:
    'The element rises about 14px, hangs, and settles back over five seconds with no visible tick at the loop point. Add a `hover:scale-110` to the same element and the scale still works while the float continues. Give three instances phases 0, 0.33 and 0.66 and all three are already at different heights on the first painted frame. With reduced motion on, the element sits exactly where the layout puts it.',

  criticalRegion: 'critical',
};

export default meta;
