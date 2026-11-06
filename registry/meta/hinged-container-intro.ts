import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'hinged-container-intro',
  title: 'Hinged Container Intro',
  category: 'transition',
  tags: ['gsap', 'intro', 'rotatex', 'stagger', 'page-enter'],
  blurb: 'The page body swings up from below the fold, hinged on its own bottom edge, with captions following it in.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/hinged-container-intro.tsx',
      target: 'components/motion/hinged-container-intro.tsx',
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
      role: 'motion preference',
    },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'A page-enter that tips its container up from below the fold like a lid rather than sliding it in. The panel starts at 120% of its own height, rotated -45deg in X about its bottom edge, and lands over 1.4s on expo.out; captions inside it stagger in starting 0.6s before it arrives. A cue fires at 0.8s so an expensive scene can start while the panel is still in flight.',

  mechanism: [
    'A wrapper carries `perspective: 1200px` and the panel inside it gets `transformOrigin: "center bottom"` plus `transformPerspective`, so the rotation pivots on the edge the panel is about to rest on and the top edge sweeps a much longer arc than the bottom.',
    'The panel tween is `fromTo(el, { yPercent: 120, rotateX: -45, opacity: 0 }, { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.4, ease: "expo.out" })`. `yPercent` rather than a viewport unit means the same component works inside a 320px card and a full-bleed layout without re-tuning.',
    'Elements matching `detailSelector` are collected with `querySelectorAll` on the panel and appended at `"-=0.6"`, so their 0.9s stagger overlaps the tail of the flight and the two moves read as one gesture.',
    'A `tl.call(cue, undefined, 0.8)` sits at an absolute timeline position, so the cue stays at 0.8s even if either tween is retimed. That is where a WebGL scene, a video `play()`, or a data fetch is kicked off — mid-flight, while the eye is on the moving panel.',
    'The whole timeline is built inside `useGsap`, keyed on `routeKey`; a key change reverts the previous context (restoring the inline styles GSAP wrote) and builds a fresh timeline from frame zero.',
  ],

  constants: [
    {
      name: 'duration',
      value: '1.4',
      why: 'Panel flight in seconds. Under ~1.1s the expo.out tail is too short to read as deceleration and the panel appears to snap; over ~1.8s the visitor is waiting on chrome before they can read anything.',
    },
    {
      name: 'tilt',
      value: '-45',
      why: 'Degrees of X rotation at the start. At -20deg the perspective foreshortening is barely visible so it looks like a plain slide; past about -70deg the panel is nearly edge-on and its content is an unreadable sliver for most of the flight.',
    },
    {
      name: 'travel',
      value: '120',
      why: 'Percent of the panel\'s own height it starts below rest. 100 would put its top edge exactly at the bottom of its box, but the rotation lifts the top edge upward, so 100 lets a corner peek in at frame zero. The extra 20% covers the rotated bounding box.',
    },
    {
      name: 'perspective',
      value: '1200',
      why: 'Pixels. Around 600 the lens is wide enough that the panel visibly skews toward one corner; above ~2000 the projection is near-orthographic and the hinge stops reading as depth.',
    },
    {
      name: 'DETAIL_OVERLAP',
      value: '0.6',
      why: 'Seconds the caption stagger starts before the panel lands. At 0 the two moves read as two separate events with a dead beat between them; beyond ~0.9 the captions are moving while the panel is still steeply rotated and the text shears.',
    },
    {
      name: 'DETAIL_STAGGER',
      value: '0.1',
      why: 'Seconds between captions. Fast enough that three to five items finish inside the panel tween, slow enough that each is individually perceptible.',
    },
    {
      name: 'sceneCue',
      value: '0.8',
      why: 'Seconds into the timeline before the heavy cue fires. Late enough that the panel has visually committed to arriving (so a first-frame stall is hidden by motion), early enough that a 1.6s scene intro finishes about 1s after the panel lands rather than long after.',
    },
  ],

  pitfalls: [
    'Setting the start state only inside the effect. `useEffect` can run after the browser has painted, so the finished page flashes for one frame and then jumps below the fold. The start state is a CSS rule on `[data-hinged-panel]`; the reduced-motion branch of that same rule is what keeps the content from depending on JS at all.',
    'Rotating without `transformOrigin: "center bottom"`. About the centre the panel appears to tumble through its own resting position, and the bottom edge dips below the fold on the way in.',
    'Putting `perspective` on the panel instead of an ancestor. Then any transformed child gets its own vanishing point and the parallax between panel and captions is wrong at the edges.',
    'Positioning the cue with a relative `"-=0.6"` string. Retiming the panel tween silently moves the cue with it; a numeric position pins it to 0.8s absolute.',
    'Firing the cue only in the animated branch. Reduced-motion users then never get the scene, the video or the fetch it was gating — the cue is content delivery, not decoration.',
    'Passing an inline arrow as `onSceneCue` and putting it in the effect deps. Every parent render rebuilds the timeline and the intro restarts mid-flight; the callback is held in a ref instead.',
  ],

  notes: [
    'App Router wiring: render this inside `app/layout.tsx` around `{children}` and pass `routeKey={usePathname()}`. The component itself never imports a router, so the same file works in Pages Router, Remix, or a modal keyed on a record id.',
    'The cue is not a substitute for a load event. If the thing it starts can fail, give it its own timeout — see `safe-preloader` for the ceiling pattern.',
  ],

  apiSignature:
    'function HingedContainerIntro(props: { children: ReactNode; routeKey?: string; duration?: number; tilt?: number; travel?: number; perspective?: number; detailSelector?: string; onSceneCue?: () => void; sceneCue?: number; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Page body. Rendered inside the hinging panel.' },
    { name: 'routeKey', type: 'string', description: 'Change to replay. Pass `usePathname()` in an App Router layout.' },
    { name: 'duration', type: 'number', default: '1.4', description: 'Panel flight time in seconds.' },
    { name: 'tilt', type: 'number', default: '-45', description: 'Starting X rotation in degrees.' },
    { name: 'travel', type: 'number', default: '120', description: 'Starting offset as a percentage of the panel\'s own height.' },
    { name: 'perspective', type: 'number', default: '1200', description: 'Perspective on the wrapper, in pixels.' },
    { name: 'detailSelector', type: 'string', default: "'[data-hinge-detail]'", description: 'Descendants that stagger in behind the panel.' },
    { name: 'onSceneCue', type: '() => void', description: 'Called `sceneCue` seconds in. Start expensive work here.' },
    { name: 'sceneCue', type: 'number', default: '0.8', description: 'Absolute timeline position of the cue, in seconds.' },
    { name: 'className', type: 'string', description: 'Merged onto the perspective wrapper.' },
  ],

  reducedMotion:
    'No timeline is built. A `prefers-reduced-motion` rule in the component\'s own stylesheet cancels the `opacity: 0` start state, so the panel and its captions render in their final position immediately, and `onSceneCue` fires on mount so anything it gates still loads.',

  cleanup:
    '`useGsap` reverts the `gsap.context` on unmount and on every `routeKey` change, which kills the timeline and restores the inline styles GSAP wrote to the panel and captions. The cue callback lives in a ref that React discards with the component, so a call queued at 0.8s cannot reach a stale closure.',

  acceptance:
    'On mount the panel rises from below with its top edge visibly further away than its bottom, settles without overshoot, and the captions land about a third of a second later. Switching route replays it from frame zero with no flash of the previous content. With reduced motion on, the panel is simply there, and the cue still fires.',

  criticalRegion: 'critical',
};

export default meta;
