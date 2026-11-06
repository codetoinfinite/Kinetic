import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'keyframe-param-object',
  title: 'Single Param Object Timeline',
  category: 'scroll',
  tags: ['gsap', 'scrolltrigger', 'scrub', 'keyframes', 'architecture', 'timeline'],
  blurb: 'One plain object holds every animated value; the scroll story is a table of keyframes anchored to real sections.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/keyframe-param-object.tsx',
      target: 'components/motion/keyframe-param-object.tsx',
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
      role: 'reflow detection for anchor rebuild',
    },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'A scroll-driven scene written as data instead of as tweens. One mutable object holds every animated quantity, GSAP tweens the object rather than the DOM, and a single onUpdate writes one transform string and two opacities. The story is then an array of rows — section id, point through the section, params to move to — each anchored to where its section actually sits after layout.',

  mechanism: [
    'Every animated quantity lives in one object: `{ scale, spin, driftX, driftY, glow, dissolve }`. No element is a tween target; GSAP tweens the plain object and one `onUpdate` renders it, so the number of tweens is the number of story beats rather than the number of moving parts.',
    'Each keyframe is anchored to a real section: `anchor = clamp(0, 1, (el.offsetTop + el.offsetHeight * t - view / 2) / total)`, where `total = container.offsetHeight - view` is the scroll distance the trigger covers.',
    'That expression reads as "when the point `t` through this section reaches the middle of the viewport". `t = 0.5` is the section\'s own middle, so the beat fires when the reader is looking at the copy it belongs to, at any column width.',
    'Rows are sorted by anchor and each is given `duration = nextAnchor - thisAnchor`, so the scene is continuously in motion between beats instead of arriving early and sitting still until the next anchor.',
    '`ease: "none"` on every row. Under a scrub the ease warps timeline time, not screen time, so an eased row reaches its params before or after the section it is anchored to — which defeats the anchoring.',
    'A `useResizeObserver` on the container re-runs the whole build when its height changes, because every anchor is a function of `offsetTop` and `offsetTop` moves whenever a line wraps.',
  ],

  constants: [
    {
      name: 'scrub',
      value: '0.8',
      why: 'Just under a second of catch-up. Enough that the scene continues to resolve after the wheel stops, which is what makes it read as a film rather than a slider; `true` welds it to the wheel and every scroll jitter shows up in the mark.',
    },
    {
      name: 'at',
      value: '0.5',
      why: 'Default point through a section at which its keyframe lands. 0.5 puts the beat on the section\'s midpoint crossing the middle of the scroller. Values near 0 fire while the section is still entering, which reads as the scene reacting to copy the reader has not got to yet.',
    },
    {
      name: 'REST.glow',
      value: '0.35',
      why: 'The scene\'s idle state, not zero. The stage has to be worth looking at before the first keyframe and after the last one; starting at 0 means the reader\'s first impression of the component is an empty box.',
    },
    {
      name: 'total floor',
      value: '1',
      why: 'Guards `container.offsetHeight - view` against 0 or negative, which happens for one frame during layout and on a short container. Without it every anchor divides by zero, becomes Infinity, clamps to 1, and the whole story collapses onto the last frame.',
    },
    {
      name: 'span floor',
      value: '0.001',
      why: 'Two keyframes anchored to the same point would otherwise get duration 0. GSAP accepts it, but the row then applies as an instant jump, so a carefully anchored beat becomes a snap.',
    },
    {
      name: 'section gap',
      value: '45vh',
      why: 'Spacing between story sections, in scroller heights. Below about 30vh two anchors land close enough that their spans overlap heavily and the beats blur together; well above it the scene is static for long stretches.',
    },
  ],

  pitfalls: [
    'Hand-tuning keyframe positions as raw timeline fractions. A single line wrap moves every section below it, so the beat that was on the right paragraph at 1440px is a paragraph early at 1280px. Anchoring to `offsetTop` is the fix and is the reason for the whole `anchor` expression.',
    'Not rebuilding when the container reflows. The anchors are computed once from measurements taken at build time; a font swap, an image load or an orientation change moves the sections and the timeline keeps using the old numbers.',
    'Tweening the DOM directly instead of the object. With six properties across three elements you get a tween per property per beat, they fight over the same transform string, and the last one to write wins non-deterministically.',
    'Easing the rows under a scrub. The ease is applied to timeline time, so the params reach their target at a different scroll position than the anchor says — the beat visibly detaches from its heading.',
    'Reusing one module-level params object across builds. On rebuild the tweens start from wherever the previous scrub left the object rather than from the resting state, so the scene is subtly different after every resize.',
    'Letting `total` be zero. It happens on the first layout pass and on any container shorter than the viewport; every anchor becomes Infinity, clamps to 1, and the entire story plays in the last pixel of scroll.',
  ],

  notes: [
    'The stage is `position: sticky`, not fixed, so it is bounded by the component rather than by the page and works inside any scroll container.',
    'Pass `sections` as a stable reference (module scope or memoised) — it is a dependency of the build effect.',
  ],

  apiSignature:
    'function KeyframeParamObject(props: { sections: { id: string; label: string; title: string; body?: string; at?: number; to: Partial<StageParams> }[]; scrub?: number; scrollerRef?: RefObject<HTMLElement | null>; className?: string }): JSX.Element',

  props: [
    { name: 'sections', type: 'KeyframeSection[]', description: 'The story. Each row names a section, an optional point through it, and the params to move to.' },
    { name: 'sections[].at', type: 'number', default: '0.5', description: 'Point through the section, 0-1, at which its keyframe lands.' },
    { name: 'sections[].to', type: 'Partial<StageParams>', description: 'Params this beat moves to. Anything omitted holds its current value.' },
    { name: 'scrub', type: 'number', default: '0.8', description: 'Seconds of catch-up behind the scroll position.' },
    { name: 'scrollerRef', type: 'RefObject<HTMLElement | null>', description: 'The scroll container that owns the scroll position. Omit for the document.' },
    { name: 'className', type: 'string', description: 'Merged onto the container via `cn`.' },
  ],

  reducedMotion:
    'No timeline and no ScrollTrigger are created. Every keyframe is folded into the params object in order and rendered once, so the stage shows the end of the story and the copy is fully readable and correctly laid out.',

  cleanup:
    '`useGsap` reverts the `gsap.context`, which kills the timeline and its ScrollTrigger and drops the reference to the params object. This runs on every reflow as well as on unmount: a surviving trigger would keep scrubbing a timeline built against stale `offsetTop` values while a new one runs alongside it, and the two would write conflicting transforms to the same element on the same frame.',

  acceptance:
    'Scroll through the column: the mark scales, spins, drifts and dims, and each change lines up with the heading that names it reaching the middle of the panel. Resize the panel so the copy rewraps and scroll again — the beats still land on their headings. Stop mid-scroll and the scene keeps resolving for around a second. With reduced motion on, the stage shows the final state and nothing moves.',

  criticalRegion: 'critical',
};

export default meta;
