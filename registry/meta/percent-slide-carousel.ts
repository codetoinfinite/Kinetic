import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'percent-slide-carousel',
  title: 'Percent Slide Carousel',
  category: 'layout',
  tags: ['carousel', 'css', 'transition', 'slider', 'no-js-motion'],
  blurb: 'A flex track translated by -100% per slide. One CSS transition, no measurement, no library.',
  cost: 'css',
  motif: 'stack',

  files: [
    { path: 'registry/ui/percent-slide-carousel.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: [],
  registryDependencies: ['use-reduced-motion', 'damp', 'wrap'],

  summary:
    'The simplest slide carousel that is still correct. A flex track holds one full-width slide per child and translates by `-100% * index`; because a percentage translate resolves against the translated element\'s own width, and the track is exactly one viewport-box wide, one step is exactly one slide. Nothing is measured, so nothing goes stale on resize.',

  mechanism: [
    'The viewport box is `overflow: hidden`. Inside it a flex track is `h-full w-full`, and every slide is `w-full shrink-0` — full width of the *track*, not of the flex line, so `count` slides overflow the track by `count - 1` widths instead of being compressed into it.',
    'The track carries `transform: translateX(-${100 * index}%)`. A percentage in `translateX` is relative to the border box of the element being transformed, which is the track, whose width equals the viewport box, which equals one slide. So `-100%` is one slide exactly, with no numbers taken from layout.',
    'That is the whole reason to prefer this over a pixel translate: a pixel offset needs a measured slide width, which needs a resize observer, which needs a re-measure pass that can land a frame late and show a seam. Here a resize changes the meaning of `100%` on the next paint for free.',
    'The transition is `transform 600ms cubic-bezier(0.22, 1, 0.36, 1)` on the track only. Interrupting it mid-flight is handled by the compositor: the browser retargets from the current computed transform, so rapid clicks chain smoothly rather than restarting from the last committed index.',
    'Navigation clamps rather than wraps by default. `-100% * index` is a linear function of the index with no modulo in it, so a wrap from the last slide to the first would translate the whole track back across every intermediate slide — a visible rewind. `loop` is offered but honest about that.',
    'Each slide is a `role="group"` with `aria-roledescription="slide"` and an `aria-label` of `n of N`, so a screen reader announces position without the component owning any live region.',
  ],

  constants: [
    {
      name: 'duration',
      value: '600',
      why: 'Milliseconds for a full slide. Under ~350 ms a full-width traversal reads as a cut rather than a move and the eye loses which direction it went; over ~900 ms a rapid click-through feels blocked because each step is still finishing when the next arrives.',
    },
    {
      name: 'EASE',
      value: 'cubic-bezier(0.22, 1, 0.36, 1)',
      why: 'An expo-out curve: ~80% of the distance is covered in the first third of the duration. On a full-viewport traversal that front-loading is what keeps a 600 ms move from feeling slow, while the long flat tail hides the exact moment the slide lands.',
    },
    {
      name: 'translate step',
      value: '100%',
      why: 'Locked to the slide width by construction, not by choice. Any other value desynchronises the track from the slides and leaves a permanent sliver of the neighbour visible at rest.',
    },
    {
      name: 'shrink-0 on slides',
      value: 'flex-shrink: 0',
      why: 'Without it flexbox honours the container width and squeezes every slide to `1/count` of the track. The translate still moves a full track-width, so one click jumps `count` slides — the single most common way this pattern breaks.',
    },
    {
      name: 'loop',
      value: 'false',
      why: 'Default off. With a linear percentage translate there is no cheap wrap: going from the last index to 0 animates back through every slide. If you need a true loop, reach for the drum instead.',
    },
  ],

  pitfalls: [
    'Omitting `flex-shrink: 0` on the slides. Flexbox compresses them to fit the track, the `-100%` step no longer equals one slide, and the carousel advances by the whole set on the first click.',
    'Putting the transition on the slides instead of the track. Only the track moves; a transition on the children costs a style recalculation per slide per frame and animates nothing.',
    'Translating in pixels from a measured slide width. It works until the container resizes between the measure and the paint, at which point the track is offset by the difference and every slide sits a few pixels off-centre until the next navigation.',
    'Wrapping the index with a modulo and expecting a loop. `-100% * 0` after `-100% * (n - 1)` animates the whole track backwards past every slide; users read it as the carousel malfunctioning, not as a wrap.',
    'Marking off-screen slides `aria-hidden` while they still contain focusable children. Tab lands inside a hidden subtree, which is an accessibility violation and, in practice, scrolls the overflow container sideways and desynchronises it from the transform.',
    'Forgetting `overflow: hidden` on the viewport box. The overflowing slides remain visible, and inside a page-level container they widen the document and add a horizontal scrollbar.',
    'Killing the transition under reduced motion but also killing the index change. The slide must still change — reduced motion removes the traversal, not the navigation.',
  ],

  notes: [
    'This is the flat, non-3D member of the carousel trio. `wrapping-drum-carousel` fakes depth with scale and `autoAlpha` over a `gsap.utils.wrap` ring and loops infinitely; `perspective-coverflow-scroller` uses real `perspective()` / `rotateY()` / `translateZ()` driven by a native scroll container. This one has no depth, no wrap and no JavaScript in the motion path at all — reach for it when the content is the point and the carousel is not.',
    'Because the motion is a single compositor-friendly transform on one element, it holds 60 fps on hardware where the other two do not. If you are shipping a hero on a low-end phone, this is the one that survives.',
    'Controlled and uncontrolled: pass `index` to drive it from outside, omit it and the component keeps its own state. `onIndexChange` fires in both cases.',
  ],

  apiSignature:
    'function PercentSlideCarousel(props: { children: ReactNode; duration?: number; index?: number; defaultIndex?: number; onIndexChange?: (index: number) => void; loop?: boolean; className?: string; slideClassName?: string; "aria-label"?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'One slide per child. Each is wrapped in a full-width, non-shrinking cell.' },
    { name: 'duration', type: 'number', default: '600', description: 'Slide transition duration in milliseconds.' },
    { name: 'index', type: 'number', description: 'Controlled index. Omit to let the component hold its own state.' },
    { name: 'defaultIndex', type: 'number', default: '0', description: 'Starting index when uncontrolled.' },
    { name: 'onIndexChange', type: '(index: number) => void', description: 'Fires with the resolved index after clamping or wrapping.' },
    { name: 'loop', type: 'boolean', default: 'false', description: 'Wrap past the ends. Off by default because the wrap animates backwards through every slide.' },
    { name: 'className', type: 'string', description: 'Merged onto the viewport box.' },
    { name: 'slideClassName', type: 'string', description: 'Merged onto every slide cell.' },
    { name: 'aria-label', type: 'string', default: "'Carousel'", description: 'Label for the carousel group.' },
  ],

  reducedMotion:
    'The track transition is set to `none`, so the slide changes on the next paint with no traversal. Navigation, focus order and the announced position are untouched — only the movement between slides is removed.',

  cleanup:
    'Nothing to clean up. No listeners, no timers, no animation frames, no imperative writes to the DOM; the only state is the current index and the browser owns the transition.',

  acceptance:
    'Click next and exactly one slide traverses the box in 600 ms with no neighbour visible at rest. Hold the next button down and the slides chain without restarting from the previous index. Resize the container mid-transition and the resting position stays flush with the box edges. At the last slide the next button is disabled unless `loop` is set. With reduced motion the slide changes instantly and the buttons still work.',

  criticalRegion: 'critical',
};

export default meta;
