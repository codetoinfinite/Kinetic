import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'mixed-scrub-depth-layers',
  title: 'Mixed Scrub Depth Layers',
  category: 'scroll',
  tags: ['gsap', 'scrolltrigger', 'parallax', 'scrub', 'depth'],
  blurb: 'Layers separate while you scroll and converge when you stop, because each depth has its own scrub.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/mixed-scrub-depth-layers.tsx',
      target: 'components/motion/mixed-scrub-depth-layers.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      target: 'hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'reduced-motion query, SSR-safe',
    },
    {
      path: 'registry/lib/damp.ts',
      target: 'lib/damp.ts',
      type: 'registry:lib',
      role: 'clamp and frame-rate-independent interpolation',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: [],

  summary:
    'Elements marked with a depth index get two things from that index: how far they travel, and how much they lag. The travel is ordinary parallax; the lag — a different `scrub` value per depth — is what keeps the planes visibly apart while the eye is moving and lets them converge at rest. Works on a vertical page and, given a horizontal strip\'s tween, along that strip instead.',

  mechanism: [
    'Each `[data-depth]` element is read once: `depth = clamp(parseInt(dataset.depth), 0, ladder.length - 1)`, so bad or missing markup lands on the nearest plane rather than throwing.',
    'Distance comes from the normalised depth: `amount = (depth / (ladder.length - 1)) * travel`, tweened `fromTo(-amount → +amount)` in `yPercent` so it is relative to the element\'s own height and survives any layout.',
    'Lag comes from the ladder: `scrub = ladder[depth]`, giving 0 / 0.25 / 0.5 / 1 seconds of catch-up across four planes. Depth 0 uses `scrub: true` rather than `scrub: 0`, because ScrollTrigger reads 0 as falsy and would drop scrubbing entirely.',
    'The trigger window is the element\'s full crossing — `top bottom` to `bottom top` — so nothing is ever caught mid-tween on load and every layer is at a defined offset for any scroll position.',
    'Passing a `containerAnimation` swaps the position keywords to `left right` / `right left`, so the same ladder drives layers riding a pinned horizontal strip.',
    'The ladder array is serialised to a string for the effect dependency list, so a caller passing a fresh literal every render does not rebuild every trigger every render.',
  ],

  constants: [
    {
      name: 'DEFAULT_LADDER',
      value: '[0, 0.25, 0.5, 1]',
      why: 'Seconds of catch-up per plane. Four values is the most the eye separates reliably; a fifth reads as the same distance as the fourth. Doubling at each step keeps the ratio between adjacent planes constant, which is what makes them read as evenly spaced.',
    },
    {
      name: 'travel',
      value: '26',
      why: 'yPercent at the deepest plane, so a tile moves just over a quarter of its own height across the whole crossing. Past ~40 the tiles visibly leave their grid cells and the layout looks broken; below ~10 the parallax is invisible once the lag is doing the work.',
    },
    {
      name: 'scrub for depth 0',
      value: 'true',
      why: 'ScrollTrigger treats `scrub: 0` as falsy and turns scrubbing off, which makes the nearest plane a toggle animation instead of a locked one. `true` is the documented spelling of "no catch-up".',
    },
    {
      name: 'trigger window',
      value: "'top bottom' → 'bottom top'",
      why: 'The element\'s entire crossing of the scroller. A shorter window leaves the layer frozen at a partial offset above and below it, which shows up as a jump the first time it enters.',
    },
  ],

  pitfalls: [
    'Building parallax from distance alone. Every layer lands on its final offset on the same frame, so the depth cue vanishes the instant scrolling stops and the composition flattens.',
    'Writing `scrub: 0` for the locked plane. It is falsy, so ScrollTrigger disables scrubbing and the layer plays as a one-shot toggle animation — the one plane that was supposed to be rock solid becomes the one that pops.',
    'Using `y` in pixels instead of `yPercent`. The offsets stop being proportional to the tiles, so a layout that reads well at desktop width has layers sliding out of their cells on a phone.',
    'Recreating triggers on every render because the ladder is a fresh array literal in the caller\'s JSX. The triggers are torn down and rebuilt mid-scroll and the layers snap back to their start offsets.',
    'Indexing the ladder without a bound. `data-depth="7"` on a four-value ladder yields `undefined`, which GSAP coerces into a scrub of `NaN` and the layer stops responding to scroll entirely.',
    'Keeping vertical position keywords when a `containerAnimation` is supplied. The trigger measures along the container\'s axis, so vertical keywords resolve to a position the element never reaches and the layer never moves.',
  ],

  notes: [
    'Depth 0 is deliberately motionless. Something in the frame has to be still, or the whole composition reads as drift rather than depth.',
    'Combine with `pinned-horizontal-track` by feeding its `onTrack` payload\'s `animation` into `containerAnimation`.',
  ],

  apiSignature:
    'function MixedScrubLayers(props: { children: ReactNode; scroller?: RefObject<HTMLElement | null>; containerAnimation?: gsap.core.Animation | null; ladder?: number[]; travel?: number; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Markup containing `[data-depth]` elements; 0 is nearest.' },
    { name: 'scroller', type: 'RefObject<HTMLElement | null>', description: 'Scroll container the triggers read. Omit for the document.' },
    { name: 'containerAnimation', type: 'gsap.core.Animation | null', description: 'A horizontal strip tween to measure along. `null` defers until it exists.' },
    { name: 'ladder', type: 'number[]', default: '[0, 0.25, 0.5, 1]', description: 'Seconds of catch-up per depth index. Length defines how many planes exist.' },
    { name: 'travel', type: 'number', default: '26', description: 'yPercent travel at the deepest plane.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper.' },
  ],

  reducedMotion:
    'No triggers are created, so every layer sits at its natural document position with no transform at all. The grid is the same grid — it simply does not separate, which is the point of the setting.',

  cleanup:
    '`ctx.revert()` on unmount and on any dependency change kills each layer\'s tween and ScrollTrigger and strips the inline `transform` GSAP wrote, so a remount measures the authored layout rather than the previous run\'s offsets.',

  acceptance:
    'Scroll through the grid at speed: the tiles visibly separate into distinct planes, the depth-0 tile stays locked to the grid, and the deepest tiles trail furthest behind. Stop scrolling and, within about a second, everything settles into an aligned composition. Scroll backwards and the separation reverses rather than replaying.',

  criticalRegion: 'critical',
};

export default meta;
