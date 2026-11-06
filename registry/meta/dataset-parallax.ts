import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'dataset-parallax',
  title: 'Dataset-Driven Parallax',
  category: 'scroll',
  tags: ['gsap', 'scrolltrigger', 'parallax', 'scrub', 'data-attribute'],
  blurb: 'Layers drift at a rate written on the element itself, over the widest possible scroll window.',
  cost: 'dom',
  motif: 'wave',

  files: [
    {
      path: 'registry/ui/dataset-parallax.tsx',
      target: 'components/motion/dataset-parallax.tsx',
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
    'Depth is declared in the markup: any descendant carrying `data-parallax="0.3"` drifts at that rate. One effect walks the container, parses the attribute and builds a scrubbed tween per layer, so adding a new plane to a hero is an attribute rather than a code change. Travel is expressed as a percentage of the element\'s own height, which keeps the effect proportional at every breakpoint.',

  mechanism: [
    'The container is walked once for `[data-parallax]` descendants. The depth is read with a double fallback — `parseFloat(el.getAttribute(attr) ?? "") || fallback` — so a missing value, an empty value and a non-numeric value all land on the same default.',
    'Each layer gets `gsap.to(layer, { yPercent: -(100 * depth), ease: "none" })`. `yPercent` is a percentage of the element\'s own height, so a 2000px hero and a 400px mobile hero travel proportionally with no media query.',
    '`ease: "none"` is required, not stylistic. Any easing on a scrubbed tween means the layer accelerates and decelerates independently of the wheel, so two layers at different depths drift out of sync mid-scroll and snap back at the ends.',
    'The trigger window is `start: "top bottom"` to `end: "bottom top"` — the full travel range, from the instant the element enters the scroller to the instant it leaves. That is the widest window available, which spreads the same travel across the most scroll distance.',
    '`invalidateOnRefresh: true` makes ScrollTrigger recompute start and end on resize; percentage-based travel is derived from element height and a stale measurement leaves every layer offset.',
    'Under reduced motion the effect returns before creating anything, so the layers render at their authored positions.',
  ],

  constants: [
    {
      name: 'DEFAULT_DEPTH',
      value: '0.15',
      why: 'Fallback drift: 15% of the element\'s height across the whole window. Below ~0.05 the layer looks static next to its neighbours; above ~0.4 it visibly separates from the content it belongs to and reads as a rendering fault.',
    },
    {
      name: 'start / end',
      value: "'top bottom' / 'bottom top'",
      why: 'The maximum-length window. Narrowing it (say `top 80%` to `bottom 20%`) forces the same travel through less scroll, which is the difference between drift and the page appearing to come apart.',
    },
    {
      name: 'yPercent multiplier',
      value: '-100',
      why: 'Negative so layers move against the scroll — the direction that reads as distance. A positive multiplier moves them with the scroll, which reads as the layer being dragged.',
    },
    {
      name: 'scrub',
      value: 'true',
      why: 'Locked to scroll position with no lag. Parallax is a spatial relationship: a numeric scrub adds lag, and lagging layers cross each other during a fast flick.',
    },
  ],

  pitfalls: [
    'Using `y` in pixels instead of `yPercent`. It looks correct at the breakpoint you tuned and wrong at every other one — on a short viewport a fixed 300px offset can push the layer entirely out of its own container.',
    'A single `|| 0.15` fallback. `el.dataset.parallax || "0.15"` covers the missing attribute, but `parseFloat("fast")` returns `NaN` and `NaN` reaching `yPercent` does not throw — the layer just silently stops moving, which is a bug you find by eye weeks later.',
    'Adding an ease to a scrubbed tween. The layer then accelerates on its own schedule rather than the wheel\'s, so layers at different depths drift out of relative order and snap at each end of the range.',
    'Omitting `invalidateOnRefresh`. Rotating a phone or opening a sidebar changes element height; the tween keeps using the height measured on mount and every layer sits at the wrong offset until reload.',
    'Leaving the scroller as the document when the content lives in an `overflow-y-auto` container. Every start and end is then measured against the window, so nothing moves at the right time — or at all.',
    'Building one giant timeline for all layers. Independent triggers per layer are correct here: a layer must respond to its own position in the scroller, not to a shared progress value.',
  ],

  notes: [
    'The attribute name is configurable so the component can coexist with an existing convention rather than forcing `data-parallax` onto a codebase that already has one.',
    'Depths above 1 are legal and useful for a single foreground element that should outrun everything, but two such layers next to each other stop reading as depth.',
  ],

  apiSignature:
    'function DatasetParallax(props: { children: ReactNode; attribute?: string; fallback?: number; scrub?: boolean | number; scrollerRef?: RefObject<HTMLElement | null>; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Section content. Any descendant with the depth attribute becomes a layer.' },
    { name: 'attribute', type: 'string', default: "'data-parallax'", description: 'Attribute carrying the depth. Its value is parsed as a float.' },
    { name: 'fallback', type: 'number', default: '0.15', description: 'Depth used when the attribute is missing, empty or not a number.' },
    { name: 'scrub', type: 'boolean | number', default: 'true', description: 'ScrollTrigger scrub. A number adds that many seconds of lag.' },
    { name: 'scrollerRef', type: 'RefObject<HTMLElement | null>', description: 'The scroll container that owns the scroll position. Omit for the document.' },
    { name: 'className', type: 'string', description: 'Merged onto the container via `cn`.' },
  ],

  reducedMotion:
    'The effect returns before creating any tween, so every layer stays exactly where the stylesheet put it. The layout is authored to be correct at rest, so nothing is missing — the planes simply do not separate.',

  cleanup:
    '`useGsap` wraps the whole walk in a `gsap.context`; `ctx.revert()` on unmount kills every tween and its ScrollTrigger and strips the inline `transform` GSAP wrote. Without the revert the triggers survive the unmount and keep scrubbing detached nodes on the next page.',

  acceptance:
    'Scroll the section: layers with a larger `data-parallax` value visibly outrun the ones with smaller values, and every layer is back in its authored position when it leaves the scroller. Change an attribute value in devtools and reload — the rate changes with no code edit. Resize the window mid-scroll and the layers stay aligned with their content.',

  criticalRegion: 'critical',
};

export default meta;
