import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'banded-scrollspy-rail',
  title: 'Banded Scrollspy Rail',
  category: 'scroll',
  tags: ['intersection-observer', 'scrollspy', 'navigation', 'rootmargin', 'no-dependencies'],
  blurb: 'A tick rail whose active mark widens as a section crosses a 7% band through the middle of the screen.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/banded-scrollspy-rail.tsx',
      target: 'components/motion/banded-scrollspy-rail.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      target: 'hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'reduced-motion query',
    },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'A section rail that never flickers, because only one section can be "active" at a time by construction. The IntersectionObserver root is shrunk to a 7%-tall band across the middle of the scroller, so a section registers only while it crosses that line. The active tick grows from 16 to 32 pixels — a size change, legible in peripheral vision, rather than a tint change that is not. No animation library: one observer, one CSS width transition.',

  mechanism: [
    'One IntersectionObserver watches every `[data-scrollspy]` element with `rootMargin: "-38% 0px -55% 0px"`. Trimming 38% off the top and 55% off the bottom leaves a 7%-tall detection band (100 − 38 − 55), positioned just below centre so a section becomes active while you are reading it rather than while it is still arriving.',
    'Entries maintain a `Set` of ids currently inside the band. The active id is resolved by scanning the authored `sections` order for the first member of that set — not by reading `entries[0]`, whose order depends on how the observer batched the callback and therefore on scroll direction.',
    'When the set is empty — a gap between sections, or a header taller than the band — the previous answer is held rather than cleared, so the rail never blanks between sections.',
    'A second observer watches the element named by `endId` with `rootMargin: "0px 0px -25% 0px"`, which makes "intersecting" mean exactly "its top has climbed above 75% of the root". That retires the whole rail, so it is not hovering over a footer with nothing left to navigate.',
    'The indicator itself is a `<span>` whose inline `width` flips between 16 and 32 px with a 260 ms CSS transition. The only JavaScript per scroll event is a `Set` mutation and at most one `setState`.',
    'Section elements are collected into an id → element `Map` by walking the attribute once, rather than running a `[data-scrollspy="id"]` selector per section — that form needs escaping for any id containing punctuation and silently matches nothing when the escaping is wrong.',
  ],

  constants: [
    {
      name: 'bandTop / bandBottom',
      value: '38 / 55',
      why: 'Leaves a 7% band. Widen it and two sections are inside at once on a tall screen, which is the flicker this design exists to remove. Narrow it below about 4% and a fast flick can jump the band entirely between two observer callbacks, leaving the rail on the previous section. The asymmetry (38 vs 55) puts the band below centre, where the eye is while reading.',
    },
    {
      name: 'ACTIVE_WIDTH / IDLE_WIDTH',
      value: '32 / 16',
      why: 'A 2x length change is detectable without looking directly at it. Equal widths with only a colour change is invisible in peripheral vision, which defeats the point of a rail you are not supposed to be looking at.',
    },
    {
      name: 'TRANSITION_MS',
      value: '260',
      why: 'Long enough that the width change reads as movement and draws the eye, short enough that it has finished before the next section can reach the band during normal scrolling.',
    },
    {
      name: 'hideAt',
      value: '0.75',
      why: 'Fraction of the root the end marker must pass before the rail retires. At 1.0 the rail is still on screen while the footer is being read; below about 0.6 it disappears while the last section is still active.',
    },
  ],

  pitfalls: [
    'Observing with the default full-height root. Three sections intersect at once on a tall screen and the active tick flickers between them on every callback. Debouncing hides the symptom and adds lag; shrinking the root removes the ambiguity.',
    'Taking the active section from `entries[0]`. The callback batches entries in an order that depends on which boundaries were crossed, so the same scroll direction can yield a different winner between two frames. Resolve against the authored order instead.',
    'Clearing the active state when nothing is intersecting. Any gap taller than the band — a spacer, a full-bleed image, a header — blanks the rail mid-scroll and it reads as broken.',
    'Signalling the active section with colour only. On a hairline tick in the corner of the eye a tint change is imperceptible; a width change is not, and it also survives a monochrome or high-contrast rendering.',
    'Rebuilding the observers on every render. `sections` is usually a fresh array literal from the parent, so keying the effect on it disconnects and reconnects two observers on every keystroke elsewhere in the page. Key on the joined id list and read the array from a ref.',
    'Forgetting `observer.disconnect()`. IntersectionObserver keeps a strong reference to every observed element, so an undisconnected observer pins the whole unmounted section tree in memory and keeps calling `setState` on a dead component.',
    'Scrolling with `window.scrollTo` on click when the sections live in a container. `scrollIntoView` walks up and scrolls whichever ancestor actually holds the overflow, which is the only version that works in both cases.',
  ],

  notes: [
    'No GSAP and no ScrollTrigger: the whole component is two IntersectionObservers and a CSS transition, which is why it is classed `css` cost and can be used dozens of times on a page.',
    'The labels are always in the DOM at `opacity: 0` and reveal on hover or keyboard focus, so the rail is operable and readable without a pointer.',
  ],

  apiSignature:
    'function BandedScrollspyRail(props: { sections: { id: string; label: string }[]; rootRef?: RefObject<HTMLElement | null>; bandTop?: number; bandBottom?: number; endId?: string; hideAt?: number; attribute?: string; onActiveChange?: (id: string | null) => void; className?: string }): JSX.Element',

  props: [
    { name: 'sections', type: '{ id: string; label: string }[]', description: 'Ordered list. Each `id` must match a `data-scrollspy` attribute inside the root.' },
    { name: 'rootRef', type: 'RefObject<HTMLElement | null>', description: 'The scroll container holding the sections. Omit for the document.' },
    { name: 'bandTop', type: 'number', default: '38', description: 'Percent of the root trimmed from the top to form the band.' },
    { name: 'bandBottom', type: 'number', default: '55', description: 'Percent trimmed from the bottom. The two must sum to under 100.' },
    { name: 'endId', type: 'string', description: 'Section after which the rail retires. Usually the footer.' },
    { name: 'hideAt', type: 'number', default: '0.75', description: 'Fraction down the root the end marker must pass before the rail hides.' },
    { name: 'attribute', type: 'string', default: "'data-scrollspy'", description: 'Attribute used to find sections inside the root.' },
    { name: 'onActiveChange', type: '(id: string | null) => void', description: 'Fires once per active-section change. Held in a ref, so it needs no memo.' },
    { name: 'className', type: 'string', description: 'Merged onto the nav element via `cn`.' },
  ],

  reducedMotion:
    'The rail still tracks the active section and still changes width — that is state, not decoration. Every `transition` is set to `none`, so the tick snaps between widths and the labels appear instantly, and click-to-navigate uses `behavior: "auto"` rather than a smooth scroll.',

  cleanup:
    'Both IntersectionObservers are disconnected on unmount and on any option change. An observer holds a strong reference to every element it watches, so skipping this pins the unmounted section tree in memory and keeps firing `setState` on a dead component.',

  acceptance:
    'Scroll slowly: the active tick changes exactly once as each section crosses the middle of the screen, with no flicker at the boundary and no blank state in the gaps. The active tick is visibly twice as long as the others. Scroll to the end and the whole rail fades out. Hover it and the labels appear; tab into it and they appear too. With reduced motion on, the tick still moves but snaps rather than eases.',

  criticalRegion: 'critical',
};

export default meta;
