import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'inverse-scroll-scale',
  title: 'Inverse Scroll Scale',
  category: 'scroll',
  tags: ['scroll', 'transform', 'raf', 'parallax', 'intersection-observer', 'no-deps'],
  blurb: 'Media enters oversized at 1.25x and settles to exactly 1.0 as it rises through the first 60% of the scroller.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/inverse-scroll-scale.tsx',
      target: 'components/motion/inverse-scroll-scale.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/hooks/use-raf.ts',
      target: 'hooks/use-raf.ts',
      type: 'registry:hook',
      role: 'shared frame loop',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      target: 'hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'reduced-motion query',
    },
    {
      path: 'registry/lib/damp.ts',
      target: 'lib/damp.ts',
      type: 'registry:lib',
      role: 'clamp and frame-rate-independent smoothing',
    },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'The inverse of the usual scroll-scale. Instead of growing as it rises, the media starts oversized and resolves down to exactly 1.0 over the first 60% of the scroller, so it settles into its frame rather than bursting out of it — and it is at rest for the whole time it is the thing you are actually looking at. No animation library: one rAF callback, gated by an IntersectionObserver.',

  mechanism: [
    'Each frame the component reads the frame element\'s `getBoundingClientRect().top`, converts it to a position inside the scroller by subtracting the scroller\'s own rect top, and computes `t = clamp((height - top) / (span * height), 0, 1)`.',
    '`t` is 0 while the frame\'s top edge sits on the bottom of the scroller and reaches 1 once it has climbed `span` of the scroller\'s height — 60% by default, so it is finished long before the element is centred.',
    'Scale is a straight linear ramp: `from - (from - 1) * t`. It ends on exactly 1.0 by construction, which matters because a scale below 1 on an element sized to its frame would let the frame show through at the edges.',
    'Optional smoothing runs the result through `damp(current, wanted, smoothing, dt)`, which raises the retention factor to the power of elapsed time and so converges at the same rate on 60Hz and 120Hz displays. The naive `x += (target - x) * 0.1` would run twice as fast on the faster display.',
    'The frame is rounded to four decimals and compared against what was last written; on the many frames where nothing changed the style write is skipped entirely, so an idle instance costs one rect read.',
    'An IntersectionObserver with a 20% rootMargin flips an `active` ref, and the rAF callback returns immediately when it is false. The observer is hand-rolled rather than pooled because it needs the demo\'s scroller as its `root`.',
  ],

  constants: [
    {
      name: 'from',
      value: '1.25',
      why: 'Starting scale. Must be at least 1 — anything less shows the frame through the edges of the media, because the media is sized to exactly fill the frame. Past ~1.4 the visible crop at the start is severe enough that the composition changes rather than just the size.',
    },
    {
      name: 'span',
      value: '0.6',
      why: 'Fraction of scroller height over which the scale resolves, measured up from the bottom edge. The whole argument for the effect: at 1.0 the media is still moving while it is centred and being read, which is exactly when it should be still. At 0.6 it lands well before that.',
    },
    {
      name: 'smoothing',
      value: '0',
      why: 'Off by default. The mapping from scroll position to scale is already continuous, so smoothing adds lag with nothing to hide. It exists for the case where the scroll source is itself steppy (a trackpad-free mouse wheel, or a snapped container).',
    },
    {
      name: 'rootMargin',
      value: "'20% 0px 20% 0px'",
      why: 'Starts the rAF work a fifth of a scroller height before the frame is visible, so the first painted frame is already at the correct scale. Without the margin the element pops from its authored scale to its computed one on the frame it enters.',
    },
    {
      name: 'toFixed precision',
      value: '4',
      why: 'Below one device pixel of difference on a 4000px-wide element, so the rounding is invisible; its purpose is to make the "unchanged" comparison actually hit, which it never would on raw floats.',
    },
  ],

  pitfalls: [
    'Using `window.innerHeight` when the element scrolls inside a container. Inside a 300px-tall panel on a 1000px-tall window, `t` never exceeds about 0.3, so the media stays visibly oversized for the whole scroll and never resolves.',
    'Scaling from below 1 up to 1 instead. The media is sized to its frame, so any scale under 1 leaves a gap at the edges and the background shows through as a hairline border that grows and shrinks.',
    'Reading `getBoundingClientRect()` after writing the transform in the same callback. That is a forced synchronous layout every frame, and it appears in a profile as a long purple bar attached to the rAF, not as anything obviously related to this component.',
    'Running the rAF callback for every instance on the page. Ten of these in a long article means ten rect reads per frame for elements that are nowhere near the viewport; the IntersectionObserver gate is what keeps the cost proportional to what is on screen.',
    'A per-frame lerp constant instead of `damp` when smoothing is enabled. On a 120Hz display the media reaches its target in half the scroll distance, so the effect is materially different on a MacBook Pro than on an external 60Hz monitor.',
    'Omitting `overflow: hidden` on the frame. At 1.25 the media is 25% larger than its box and overlaps whatever is next to it, which is most visible as text from the following section being covered as you scroll.',
  ],

  notes: [
    'No animation library. The whole component is one rAF subscription and one IntersectionObserver.',
    'The transform is written imperatively rather than through React state, so no scroll frame causes a render.',
  ],

  apiSignature:
    'function InverseScrollScale(props: { children: ReactNode; from?: number; span?: number; smoothing?: number; scrollerRef?: RefObject<HTMLElement | null>; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'The media. Sized to fill the frame; this is what gets scaled.' },
    { name: 'from', type: 'number', default: '1.25', description: 'Starting scale. Must be >= 1.' },
    { name: 'span', type: 'number', default: '0.6', description: 'Fraction of scroller height over which the scale resolves.' },
    { name: 'smoothing', type: 'number', default: '0', description: 'Fraction of the remaining gap left after one second. 0 disables smoothing.' },
    { name: 'scrollerRef', type: 'RefObject<HTMLElement | null>', description: 'The scroll container that owns the scroll position. Omit for the document.' },
    { name: 'className', type: 'string', description: 'Merged onto the frame via `cn`. Set the frame size here.' },
  ],

  reducedMotion:
    'The media renders at scale 1 — its resolved state, filling the frame — and neither the IntersectionObserver nor the rAF subscription is created, so there is no per-frame work at all.',

  cleanup:
    '`useRaf` unsubscribes on unmount and drops the shared loop entirely when it was the last subscriber; the IntersectionObserver is disconnected in its own effect cleanup. Without the disconnect the observer holds a reference to a removed element and keeps firing on every scroll of a container the component no longer participates in.',

  acceptance:
    'Scroll the frame up from the bottom of the scroller: the media is visibly cropped and oversized as it appears, and reaches its natural size a little past halfway up — after which it does not move at all while you read it. Scroll back down and it re-expands. No hairline of background is ever visible inside the frame. With reduced motion on, the media is at natural size at all scroll positions.',

  criticalRegion: 'critical',
};

export default meta;
