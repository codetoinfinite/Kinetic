import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'batched-blur-reveal',
  title: 'Batched Blur Reveal',
  category: 'scroll',
  tags: ['gsap', 'scrolltrigger', 'reveal', 'batch', 'stagger', 'blur'],
  blurb: 'Cards that enter together focus in as one staggered group instead of arriving as a slab.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/batched-blur-reveal.tsx',
      target: 'components/motion/batched-blur-reveal.tsx',
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
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'A page-wide entrance that reveals elements in groups rather than one at a time. Everything that crosses the start line inside the same 100 ms window is handed to one tween, so a real stagger runs across a row of cards that entered simultaneously. Opacity, rise, scale and blur move together, which reads as the content focusing rather than sliding.',

  mechanism: [
    'On mount, every `[data-reveal]` descendant of the container — queried from the container element, never from `document` — is set to `{ opacity: 0, y: 90, scale: 0.94, filter: "blur(12px)" }` plus a `will-change` hint for transform, filter and opacity.',
    '`ScrollTrigger.batch(targets, { start: "top 88%", interval: 0.1, batchMax: 6 })` replaces the usual one-trigger-per-element loop. Elements that cross the start line within `interval` seconds of each other are collected and delivered to `onEnter` as a single array.',
    'That array is animated by one `gsap.to` with `stagger: 0.14`, so the offset is computed across the whole group. Individual triggers cannot do this: each one starts at its own t=0 and knows nothing about its neighbours.',
    'The tween carries `overwrite: true` so a fast flick that re-enters an element mid-reveal restarts it cleanly instead of interpolating from a half-finished state.',
    '`onComplete` calls `gsap.set(batch, { clearProps: "filter,willChange" })`. A `filter` that survives the animation keeps the node on its own composited layer for the life of the page, which is exactly the cost the reveal was supposed to pay once.',
    'Under `prefers-reduced-motion`, no trigger is created at all: the targets are `gsap.set` to their final values and the content is already correct on first paint.',
  ],

  constants: [
    {
      name: 'start',
      value: "'top 88%'",
      why: 'The element begins revealing when its top reaches 88% down the scroller — a sliver above the fold. At `top bottom` the reveal happens off-screen and the user sees nothing; below about 80% the element is already well into view before it starts, which reads as a late load.',
    },
    {
      name: 'BATCH_INTERVAL',
      value: '0.1',
      why: 'Seconds of grace before a batch is flushed. Too small and a row of three cards splits into three batches with no stagger between them — the exact failure this component exists to avoid. Too large and the first element visibly waits before anything moves.',
    },
    {
      name: 'batchMax',
      value: '6',
      why: 'Cap on group size. With `stagger: 0.14`, a batch of 20 puts 2.7 s between the first and last element, so the tail is still blurred long after the user has read the head. Six keeps the whole group inside roughly a second.',
    },
    {
      name: 'stagger',
      value: '0.14',
      why: 'Offset within a batch. Below ~0.08 the group reads as simultaneous and the batching is invisible; above ~0.2 it reads as a queue rather than a wave.',
    },
    {
      name: 'blur',
      value: '12',
      why: 'Starting blur in pixels. This is the expensive property — it forces a full repaint of the layer every frame — and it is what turns a slide into a focus-pull. Past ~20px the text is unreadable for long enough that the reveal feels broken.',
    },
    {
      name: 'distance',
      value: '90',
      why: 'Pixels of rise. Paired with `scale: 0.94` it reads as depth. Much more and the element travels further than its own height, which looks like a layout jump rather than an entrance.',
    },
    {
      name: 'duration',
      value: '1.1',
      why: 'Long for an entrance, and deliberately so: the blur needs time to resolve or the focus-pull reads as a flicker.',
    },
  ],

  pitfalls: [
    'Creating one ScrollTrigger per element. Sixty targets means sixty sets of start/end calculations on every refresh, and — the visible part — two cards entering in the same frame both begin at t=0, so the row lands flat. `stagger` cannot cross independent triggers.',
    'Querying targets with `document.querySelectorAll`. Two instances of the component on one page each claim the other\'s elements, so both apply the initial state and both tween it, and elements reveal twice at different speeds.',
    'Leaving `filter` on the node after the reveal. A non-`none` filter keeps the element on its own composited layer permanently; on a page with sixty of them the compositor memory cost outlives the animation by the whole session. Clear it in `onComplete`.',
    'Omitting `overwrite: true`. Flick-scrolling re-enters an element while its reveal is running and the second tween starts from the partial state, so opacity and blur end up somewhere between the two.',
    'Animating `filter: blur()` without a `will-change` hint. The first frames go to the browser deciding whether to promote the layer, so every reveal starts with a visible hitch.',
    'Registering ScrollTrigger inside the component body. It runs on every render and touches `document`, which throws during server rendering. Register once at module scope behind a `typeof window` guard.',
  ],

  notes: [
    'Pass `scrollerRef` when the content scrolls inside a container rather than the document — ScrollTrigger measures against the window by default and every start position will be wrong.',
    '`once: true` is the default because these are entrances, not a narrative. Set it false when the section is something the user is expected to scroll back through.',
  ],

  apiSignature:
    'function BatchedBlurReveal(props: { children: ReactNode; selector?: string; start?: string; distance?: number; blur?: number; scale?: number; duration?: number; stagger?: number; once?: boolean; batchMax?: number; scrollerRef?: RefObject<HTMLElement | null>; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Section content. Anything matching `selector` inside it is revealed.' },
    { name: 'selector', type: 'string', default: "'[data-reveal]'", description: 'Which descendants reveal. Queried against the container, not the document.' },
    { name: 'start', type: 'string', default: "'top 88%'", description: 'ScrollTrigger start position for every batched element.' },
    { name: 'distance', type: 'number', default: '90', description: 'Pixels the element rises through.' },
    { name: 'blur', type: 'number', default: '12', description: 'Starting blur radius. Set 0 to drop the focus-pull and keep the rise.' },
    { name: 'scale', type: 'number', default: '0.94', description: 'Starting scale.' },
    { name: 'duration', type: 'number', default: '1.1', description: 'Seconds per element.' },
    { name: 'stagger', type: 'number', default: '0.14', description: 'Seconds between elements within one batch.' },
    { name: 'once', type: 'boolean', default: 'true', description: 'Reveal once and never replay.' },
    { name: 'batchMax', type: 'number', default: '6', description: 'Largest group a single callback may receive.' },
    { name: 'scrollerRef', type: 'RefObject<HTMLElement | null>', description: 'The scroll container that owns the scroll position. Omit for the document.' },
    { name: 'className', type: 'string', description: 'Merged onto the container via `cn`.' },
  ],

  reducedMotion:
    'No ScrollTrigger is created. The targets are set to their final state — full opacity, no offset, no blur — during the first effect, so the section renders as finished content and never moves.',

  cleanup:
    '`useGsap` runs the whole setup inside a `gsap.context` and calls `ctx.revert()` on unmount and on any prop change. That kills every batched ScrollTrigger and every in-flight tween, and restores the inline styles the initial `gsap.set` wrote, so an unmount mid-reveal leaves no opacity or blur behind on a node React may reuse.',

  acceptance:
    'Scroll a grid of cards into view: the cards in the same row lift and focus one after another with a visible offset, not all at once. Scroll back up and they stay revealed. Inspect a settled card and it has no `filter` or `will-change` left in its inline style. With reduced motion enabled the section is fully visible before any scrolling happens.',

  criticalRegion: 'critical',
};

export default meta;
