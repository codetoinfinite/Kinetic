import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'pinned-horizontal-track',
  title: 'Pinned Horizontal Track',
  category: 'scroll',
  tags: ['gsap', 'scrolltrigger', 'pin', 'horizontal', 'scrub'],
  blurb: 'A section pins while a strip of panels slides sideways, one scroll pixel per track pixel.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/pinned-horizontal-track.tsx',
      target: 'components/motion/pinned-horizontal-track.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      target: 'hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'reduced-motion query, SSR-safe',
    },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'A full-height section is pinned by ScrollTrigger while a flex strip inside it translates on x. The pin lasts exactly as many scroll pixels as the strip has to travel, so the mapping is 1:1 and the section releases the moment the last panel lands. The tween and the trigger are handed back to the parent, so reveal systems and drag handles can drive off the same pin instead of building a second one.',

  mechanism: [
    'One measurement backs the whole construction: `distanceOf() = max(0, track.scrollWidth - root.clientWidth)`. It is a function, not a captured number, because fonts, images and container resizes all change it after first paint.',
    '`gsap.to(track, { x: () => -distanceOf(), ease: "none" })` uses a function-based end value, so `invalidateOnRefresh: true` re-derives the travel on every refresh rather than replaying a stale target.',
    'The ScrollTrigger pins the root with `start: "top top"` and `end: () => "+=" + distanceOf()`. Because the pin duration and the tween distance come from the same call, one scroll pixel always buys one track pixel.',
    '`scrub: 1` gives the strip one second of catch-up, so a flicked wheel produces a glide rather than a jump; `anticipatePin: 1` lets ScrollTrigger apply the pin a frame early, which removes the single-frame jitter at high scroll speeds.',
    '`document.fonts.ready` triggers `ScrollTrigger.refresh()`. A font swap changes `scrollWidth` after the pin was measured, and without the refresh the pin ends before the track does — the last panel is unreachable.',
    'On build the component calls `onTrack({ animation, trigger, getDistance })`; on teardown it calls `onTrack(null)`, so consumers rebuild rather than holding a reverted tween.',
  ],

  constants: [
    {
      name: 'scrub',
      value: '1',
      why: 'Seconds of catch-up between the scrollbar and the strip. `true` (0) locks the track to the scrollbar and inherits every wheel step as a visible stutter; above ~1.5 the track keeps moving long after the wheel stops and reads as broken input.',
    },
    {
      name: 'anticipatePin',
      value: '1',
      why: 'Applies the pin one frame of predicted scroll early. At 0, a fast flick pins one frame late and the section visibly slips before locking. Above 1 it pins early enough to look premature.',
    },
    {
      name: 'end',
      value: '`+=${max(1, distanceOf())}`',
      why: 'Pin duration in pixels, equal to the horizontal travel. The `max(1, …)` floor exists because a track narrower than its container yields 0, and an end equal to start makes ScrollTrigger treat the trigger as degenerate and never fire it.',
    },
  ],

  pitfalls: [
    'Measuring `scrollWidth - clientWidth` once into a variable. Fonts swap after first paint and the number grows; the pin then ends before the track has finished travelling and the final panel can never be reached.',
    'Expressing `end` as a percentage of viewport height (`"+=" + distance * 100 / innerWidth + "%"`). It works on the machine it was tuned on and finishes the track early on a shorter screen, because the mapping now depends on window shape rather than on the travel itself.',
    'Passing `scroller: null` when the component sits on the page rather than in a box. ScrollTrigger reads `null` as an explicit scroller element and throws on the first refresh; omit the option instead, which is why the code coalesces to `undefined`.',
    'Calling `kill()` instead of `revert()` on unmount. `kill()` leaves the pin-spacer div GSAP injected into the DOM and the inline transform on the strip, so the next mount measures a layout that still contains the last one.',
    'Forgetting that a pinned element inside a custom scroller needs that scroller passed explicitly. Without it, ScrollTrigger measures the document, the trigger never becomes active inside the box, and the panels sit motionless.',
  ],

  notes: [
    'Under `prefers-reduced-motion: reduce` no trigger is created at all and the strip becomes a native `overflow-x-auto` row, so every panel stays reachable by thumb, trackpad and keyboard.',
    '`gsap.registerPlugin(ScrollTrigger)` runs once at module scope behind a `typeof window` guard, so repeated imports are harmless and prerender never touches the plugin.',
  ],

  apiSignature:
    'function PinnedHorizontalTrack(props: { children: ReactNode; scroller?: RefObject<HTMLElement | null>; scrub?: number; onTrack?: (track: PinnedTrack | null) => void; className?: string; trackClassName?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Panels. The track is a flex row, so give each panel a width and `shrink-0`.' },
    { name: 'scroller', type: 'RefObject<HTMLElement | null>', description: 'The scroll container the trigger reads. Omit to use the document.' },
    { name: 'scrub', type: 'number', default: '1', description: 'Seconds of catch-up between scrollbar and strip.' },
    { name: 'onTrack', type: '(track: PinnedTrack | null) => void', description: 'Receives `{ animation, trigger, getDistance }` on build and `null` on teardown.' },
    { name: 'className', type: 'string', description: 'Merged onto the pinned root.' },
    { name: 'trackClassName', type: 'string', description: 'Merged onto the moving strip.' },
  ],

  reducedMotion:
    'No ScrollTrigger and no pin are created. The root becomes a horizontally scrollable row, so the same panels are still read left to right — under the reader\'s own control, at the reader\'s own speed.',

  cleanup:
    'Calls `onTrack(null)` so consumers drop their reference, then `ctx.revert()`, which kills the tween and the ScrollTrigger, removes the injected pin-spacer, and clears the inline transform from the strip. A pending `document.fonts.ready` refresh is gated behind a `cancelled` flag.',

  acceptance:
    'Scroll down: the section locks, the panels slide left, and the last panel reaches the right edge at exactly the moment the section unpins. Resize the container mid-pin and the track still ends flush. With reduced motion on, the section never pins and the panels can be swiped sideways instead.',

  criticalRegion: 'critical',
};

export default meta;
