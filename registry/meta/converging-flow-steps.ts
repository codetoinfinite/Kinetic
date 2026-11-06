import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'converging-flow-steps',
  title: 'Converging Flow Steps',
  category: 'scroll',
  tags: ['gsap', 'scrolltrigger', 'scrub', 'diagram', 'stagger', 'process'],
  blurb: 'A process diagram that closes from both ends while the connectors pop in a third of the way through.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/converging-flow-steps.tsx',
      target: 'components/motion/converging-flow-steps.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/hooks/use-gsap.ts',
      target: 'hooks/use-gsap.ts',
      type: 'registry:hook',
      role: 'gsap.context lifecycle',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      target: 'hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'reduced-motion query',
    },
    {
      path: 'registry/hooks/use-resize-observer.ts',
      target: 'hooks/use-resize-observer.ts',
      type: 'registry:hook',
      role: 'container-width measurement',
    },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'A process diagram that assembles itself as you scroll. The two outer cards converge toward the middle from opposite ends while the connectors between them pop in at 35% through the timeline — after the cards are already moving. That ordering is the entire effect: connectors that arrive first read as "boxes with arrows", connectors that arrive during the movement read as "these things connect".',

  mechanism: [
    'One `gsap.timeline` on a `scrollTrigger` with `start: "top 92%"`, `end: "center 52%"` and `scrub: 1.2` — deliberately the slowest scrub in the set, because a diagram should settle rather than track the wheel.',
    'The first and last cards get `fromTo` tweens at position 0 with `±14` on the layout axis, so they close toward the centre from opposite ends. Cards in between have nowhere to converge from and only fade; giving them a direction too makes the row look shuffled rather than closing.',
    'The connectors get `fromTo({ autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, stagger: 0.2 })` placed at absolute timeline position `0.35`. The card tweens run 0 → 1, so 0.35 is a third of the way into their travel.',
    'The convergence axis is chosen from the measured container width, not the viewport: under `stackBelow` px the row becomes a column and the tweens switch from `xPercent` to `yPercent`. A stacked column with horizontal convergence has cards sliding past each other sideways.',
    'The single-step case is handled explicitly — `first === last` would otherwise mean two `fromTo` tweens fighting over one element, one pulling it from -14 and one from +14.',
    '`ease: "none"` throughout. Under a scrub the ease applies to timeline time, so easing here desynchronises the two converging cards from each other.',
  ],

  constants: [
    {
      name: 'scrub',
      value: '1.2',
      why: 'Over a second of catch-up — very slow. Right for a diagram, which you want to see settle; wrong for a hero, which would feel unresponsive. Below ~0.6 the diagram snaps together as fast as you scroll and the assembly reads as a jump.',
    },
    {
      name: 'connectorAt',
      value: '0.35',
      why: 'Absolute timeline position, in seconds, where the connectors start. The cards run 0 → 1, so this is a third of the way into their travel. At 0 the arrows are present before there is anything to connect; past ~0.6 they arrive after everything has stopped and read as an afterthought.',
    },
    {
      name: 'converge',
      value: '14',
      why: 'Percent of the card\'s own size. Small on purpose: this is a settling gesture, not an entrance. Past ~25% the outer cards start visibly outside the tinted wrapper and the diagram looks broken at the start of the scrub.',
    },
    {
      name: 'CONNECTOR_SCALE',
      value: '0.6',
      why: 'Starting scale for the pop. Below ~0.4 the arrow is a dot for the first half of its tween; above ~0.8 there is no pop left to see.',
    },
    {
      name: 'connectorStagger',
      value: '0.2',
      why: 'Seconds between connectors. Long enough that a three-step flow reads left to right rather than all at once, which is what tells the reader the diagram has a direction.',
    },
    {
      name: 'stackBelow',
      value: '420',
      why: 'Container width in px below which three cards in a row are too narrow to hold a title and a line of body. Measured from the element, not the window, because this component is usually inside a column that is narrow while the window is wide.',
    },
  ],

  pitfalls: [
    'Animating the connectors at position 0 alongside the cards. Everything arriving together reads as a set of boxes that happen to have arrows between them; the whole point is that the link appears while the boxes are still closing.',
    'Giving the middle cards a convergence direction too. With every card sliding, the row reads as being reshuffled rather than closing, and the two outer cards stop being the subject.',
    'Not handling the one-step case. `cards[0]` and `cards[cards.length - 1]` are the same element, so it receives two `fromTo` tweens with opposite start values and ends up wherever the second one decided.',
    'Choosing the layout axis from `window.innerWidth`. The component is usually inside a content column; a wide window with a narrow column stacks the cards visually while the tweens still converge horizontally, so they cross each other on the way in.',
    'Using `opacity` rather than `autoAlpha` on the connectors. An invisible SVG still takes hit-testing area between two cards, which quietly swallows clicks aimed at the card edges.',
    'Assuming `stagger` inside a scrubbed timeline behaves like duration. Each connector\'s start is offset in timeline seconds, so a large stagger pushes the timeline total past the card tweens and the cards finish before the scroll range ends — which is intended here, but is a surprise if you assumed the total was 1.',
  ],

  notes: [
    'The wrapper tint is derived from the accent token rather than a second hard-coded colour, so re-theming the accent moves the panel with it.',
    'Connectors are inline SVG paths, so they inherit `currentColor` and need no asset.',
  ],

  apiSignature:
    'function ConvergingFlowSteps(props: { steps: { title: string; body?: string; kicker?: string }[]; converge?: number; scrub?: number; connectorAt?: number; connectorStagger?: number; stackBelow?: number; start?: string; end?: string; scrollerRef?: RefObject<HTMLElement | null>; className?: string }): JSX.Element',

  props: [
    { name: 'steps', type: '{ title: string; body?: string; kicker?: string }[]', description: 'Ordered steps. Connectors are inserted between consecutive pairs.' },
    { name: 'converge', type: 'number', default: '14', description: 'Outer-card travel as a percentage of its own size, along the layout axis.' },
    { name: 'scrub', type: 'number', default: '1.2', description: 'Seconds of catch-up behind the scroll position.' },
    { name: 'connectorAt', type: 'number', default: '0.35', description: 'Timeline position, in seconds, at which the connectors begin.' },
    { name: 'connectorStagger', type: 'number', default: '0.2', description: 'Seconds between connectors.' },
    { name: 'stackBelow', type: 'number', default: '420', description: 'Container width in px below which the row becomes a column and the axis flips.' },
    { name: 'start', type: 'string', default: "'top 92%'", description: 'ScrollTrigger start.' },
    { name: 'end', type: 'string', default: "'center 52%'", description: 'ScrollTrigger end.' },
    { name: 'scrollerRef', type: 'RefObject<HTMLElement | null>', description: 'The scroll container that owns the scroll position. Omit for the document.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper via `cn`.' },
  ],

  reducedMotion:
    'No timeline is built, so the diagram renders assembled: cards at their layout positions, connectors at full opacity and scale. The layout still responds to container width, because that is layout rather than motion.',

  cleanup:
    '`useGsap` reverts the `gsap.context` on unmount and whenever the layout axis or any timing prop changes. That kills the ScrollTrigger and strips the inline transform and opacity from every card and connector, which matters here because the axis flip rebuilds the whole timeline on resize and a stale trigger would keep writing `xPercent` to elements now laid out in a column.',

  acceptance:
    'Scroll the diagram into view: the leftmost and rightmost cards slide toward the middle, and only once they are moving do the arrows between them scale up one after the other. Stop scrolling mid-way and the diagram keeps settling for more than a second. Narrow the container below 420px and the same sequence plays vertically with the arrows rotated. With reduced motion on, the diagram is complete before it scrolls into view.',

  criticalRegion: 'critical',
};

export default meta;
