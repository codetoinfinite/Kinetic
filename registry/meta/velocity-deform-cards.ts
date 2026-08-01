import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'velocity-deform-cards',
  title: 'Velocity-Deformed Cards',
  category: 'scroll',
  tags: ['scroll', 'velocity', 'skew', 'cards', 'damping'],
  blurb: 'Cards skew, stretch and trail in proportion to scroll speed, then settle on their own with no easing curve anywhere.',
  cost: 'dom',
  motif: 'wave',

  files: [
    { path: 'registry/ui/velocity-deform-cards.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/hooks/use-scroll-velocity.ts', type: 'registry:hook', role: 'two-stage smoothed scroll velocity' },
    { path: 'registry/hooks/use-raf.ts', type: 'registry:hook', role: 'shared rAF loop with clamped delta' },
    { path: 'registry/hooks/use-reduced-motion.ts', type: 'registry:hook', role: 'reduced-motion query, SSR-safe' },
    { path: 'registry/lib/damp.ts', type: 'registry:lib', role: 'frame-rate-independent interpolation' },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'Scroll position says where the page is; scroll velocity says how hard the user is pushing it, and that is the input that gives a list a material. Cards skew and stretch along the direction of travel, trail behind by an amount proportional to speed, and ease back to rest when you stop — the ease-out being a property of the filter rather than a keyframe.',

  mechanism: [
    'Velocity comes from `useScrollVelocity`, which filters twice: a one-pole low-pass on the raw per-frame delta so wheel steps stop ringing, then a damped approach toward that filtered value. The second stage is what produces the settle — a step change in speed leaves the filter as a curve, so no easing is ever authored.',
    'Both stages use `damp(current, target, smoothing, dt)`, where `smoothing` is the fraction of the gap left after one second. The deformation therefore looks identical on a 60 Hz laptop and a 144 Hz monitor, which the per-frame form (`v += (target - v) * 0.1`) does not.',
    'The normalised velocity drives four values per card: trailing translate, skew, stretch along the travel axis, and a squash across it at half the stretch, so the card roughly preserves its area. Without the squash the deformation reads as a scaling bug rather than as inertia.',
    'Each card scales its share by a `data-deform` depth. Identical depths make the grid move as one rigid sheet; varied depths make it bend, which is the entire difference between "the page is skewing" and "these cards have weight".',
    'Every transform is composed into a string, rounded, and compared with what was written last frame. A stationary list therefore performs zero style writes — at rest all cards produce the same string, and the loop costs one comparison each.',
    'Card elements are collected once per `children` change instead of per frame. A `querySelectorAll` inside a rAF loop is a forced style recalculation 60 times a second for a list that changed once.',
    'Only `transform` is animated, so the work stays on the compositor. Velocity is held in a ref and never enters React state — a value that changes every frame must not cause a render.',
  ],

  constants: [
    {
      name: 'maxSkew',
      value: '5',
      why: 'Degrees at full velocity. Around 5 the cards read as flexing; past ~10 the text inside becomes visibly sheared and the effect turns into a distraction the user actively fights.',
    },
    {
      name: 'maxLag',
      value: '28',
      why: 'Pixels a card trails at full velocity. Enough to open a visible gap against the container edge, small enough that a card never appears to belong to a different row.',
    },
    {
      name: 'maxStretch',
      value: '0.14',
      why: 'Fractional stretch along the travel axis. Fourteen percent is at the edge of what reads as elastic rather than broken; the cross-axis squash is half of it, which keeps the area roughly constant.',
    },
    {
      name: 'reference',
      value: '1400',
      why: 'Pixels per second that count as full deflection. A firm trackpad flick peaks around 1200-1800 px/s, so a normal gesture uses most of the range without a hard flick pinning it.',
    },
    {
      name: 'smoothing',
      value: '0.0002',
      why: 'Fraction of the velocity gap left after one second — a settle of roughly a third of a second. Faster and the cards twitch on every wheel step; slower and they keep moving after the scrollbar has visibly stopped, which reads as lag rather than as weight.',
    },
    {
      name: 'per-card depth',
      value: '0.55 – 1',
      why: 'The spread used in the demo. Below about 0.4 a card barely participates and looks broken next to its neighbours; a uniform 1 removes the bend that makes the grid feel like fabric.',
    },
  ],

  pitfalls: [
    'Feeding raw `scrollY` deltas straight into the transform. A trackpad emits bursts and a mouse wheel emits steps, so the cards strobe instead of flexing — the two filter stages exist precisely for this.',
    'Smoothing with a per-frame constant. The settle is more than twice as fast on a 144 Hz display, and every tuning pass that fixes one refresh rate breaks the other.',
    'Stretching without squashing. The cards visibly gain area at speed, which the eye reads as a rendering fault rather than as elasticity.',
    'Giving every card the same depth. The whole grid then skews as one plane, which looks like the viewport is broken rather than like the cards have mass.',
    'Putting velocity in React state. That is a re-render per frame, and the reconciliation cost alone is enough to lower the frame rate that the velocity is measured against — the effect degrades itself.',
    'Writing transforms unconditionally. Idle frames still cost a style invalidation and a composite for each card, on a list where nothing moved.',
    'Querying the cards inside the loop. `querySelectorAll` per frame forces style resolution 60 times a second for a list whose contents changed once.',
    'Animating `top`, `margin` or `height` for the trail instead of `transform`. Every frame relayouts the whole grid, and the deformation becomes a slideshow on any laptop.',
  ],

  notes: [
    'The scroll container is auto-detected by walking ancestors for a scrollable `overflow-y`; pass `scroller` when it is ambiguous. `useScrollVelocity` takes an element rather than a ref, so the container is resolved once after mount.',
    'The normalised velocity is also published as `--scroll-velocity` on the root, so a border colour or a blur can react in CSS without another JS subscriber.',
    'Set `will-change: transform` on the cards, not on the container: the container never moves, and promoting a large scrolling element wastes memory for nothing.',
  ],

  apiSignature:
    'function VelocityDeformCards(props: { children: ReactNode; maxSkew?: number; maxLag?: number; maxStretch?: number; reference?: number; smoothing?: number; scroller?: RefObject<HTMLElement | null>; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'The grid contents. Elements carrying `data-deform` are the ones deformed.' },
    { name: 'maxSkew', type: 'number', default: '5', description: 'Degrees of skew at full velocity.' },
    { name: 'maxLag', type: 'number', default: '28', description: 'Pixels a card trails at full velocity.' },
    { name: 'maxStretch', type: 'number', default: '0.14', description: 'Stretch along the travel axis at full velocity.' },
    { name: 'reference', type: 'number', default: '1400', description: 'Velocity in px/s that counts as full deflection.' },
    { name: 'smoothing', type: 'number', default: '0.0002', description: 'Fraction of the velocity gap left after one second.' },
    { name: 'scroller', type: 'RefObject<HTMLElement | null>', description: 'Scroll container. Omit to auto-detect.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper — the grid definition usually lives here.' },
  ],

  reducedMotion:
    'When `prefers-reduced-motion: reduce` matches, one pass clears every transform and the loop then writes nothing at all. The cards keep their layout, spacing and hover states, so the grid is intact — it simply does not flex. Toggling the OS setting takes effect on the next frame without a reload.',

  cleanup:
    '`useRaf` unsubscribes from the shared loop on unmount, and `useScrollVelocity` does the same. There are no listeners, observers or timers to remove; the only state is refs and one element resolved after mount, and every transform is written on nodes React owns.',

  acceptance:
    'A fast flick skews and stretches the cards in the direction of travel by different amounts per column, and they settle within about a third of a second after the scroll stops, with no overshoot. Text stays readable throughout. At rest, a paint-flashing or style-recalc profile shows no per-frame work. The settle takes the same wall-clock time at 60 and 144 Hz. With reduced motion on, nothing deforms.',

  criticalRegion: 'critical',
};

export default meta;
