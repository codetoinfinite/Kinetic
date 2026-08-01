import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'throttled-scrub-state',
  title: 'Throttled Scrub To State',
  category: 'scroll',
  tags: ['gsap', 'scrolltrigger', 'scrub', 'react-state', 'throttle', 'performance'],
  blurb: 'A scrubbed trigger fires 120x a second; a time, distance and frame gate turns that into a handful of React renders.',
  cost: 'dom',
  motif: 'wave',

  files: [
    {
      path: 'registry/ui/throttled-scrub-state.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/hooks/use-gsap.ts',
      type: 'registry:hook',
      role: 'gsap.context lifecycle',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'reduced-motion query',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: [],

  summary:
    'The bridge between a continuous scroll signal and discrete React state. A scrubbed ScrollTrigger calls back on every frame the scroll position moves; this component gates those ticks on elapsed time, on distance travelled, and on the animation frame, so the tree below it renders a few times per scroll instead of a hundred. The boundary frames always get through, which is what stops a fast flick from leaving the state stranded at 0.93.',

  mechanism: [
    'A single `ScrollTrigger.create` with `scrub` runs `onUpdate`, which increments a tick counter in a ref and then decides whether that tick is worth a React render. Refs are used for everything except the committed state, because a ref write does not render.',
    'Gate 1 is time: `performance.now() - lastAt < interval` returns early. A monotonic clock rather than `Date.now()`, so a system clock correction cannot produce a negative elapsed time and latch the gate shut.',
    'Gate 2 is distance: `Math.abs(p - lastProgress) < minDelta` returns early. A slow drag passes the time gate continuously while moving a fraction of a percent, and that is a render for a change no one can see.',
    'Gate 3 is the frame: the passing value is parked in a `pending` ref and a single `requestAnimationFrame` is scheduled if one is not already outstanding. ScrollTrigger fires per scroll event, not per paint, so several ticks can clear both other gates inside one frame — coalescing makes that one render.',
    'The override: when `p <= 0 || p >= 1` the time and distance gates are skipped entirely, because there is no later tick to correct a dropped endpoint. A second guard compares against the last committed value so that sitting at the end of the range does not re-commit on every tick.',
    'The committed state carries `commits` and `ticks` alongside `progress`, so the ratio between callbacks and renders is visible in the UI rather than only in a profiler.',
  ],

  constants: [
    {
      name: 'interval',
      value: '100',
      why: 'Milliseconds between commits — about 10 renders a second against roughly 120 ticks. Around 16ms the gate stops doing anything useful because it approximates one render per frame; past ~200ms the discrete steps are large enough that a reader notices the value lagging behind the scroll.',
    },
    {
      name: 'minDelta',
      value: '0.02',
      why: '2% of the trigger range. Below about 0.005 a slow drag commits on almost every time window; above ~0.05 short triggers can complete their whole range in two or three commits and the readout jumps.',
    },
    {
      name: 'scrub',
      value: '0.4',
      why: 'Under half a second of catch-up. Long enough to smooth a jittery wheel into a continuous ramp, short enough that the committed value still feels attached to the hand. `true` welds it to the wheel and every scroll spike becomes a tick.',
    },
    {
      name: 'boundary test',
      value: 'p <= 0 || p >= 1',
      why: 'Inclusive, not strict. ScrollTrigger reports exactly 0 and exactly 1 at the ends, so `< 0` and `> 1` never match and the override silently does nothing.',
    },
  ],

  pitfalls: [
    'Calling `setState` directly from `onUpdate`. On a trackpad flick that is 100+ renders a second of the entire subtree; the symptom is that scrolling is smooth on an empty page and drops to single-digit frame rates as soon as a real list is rendered below the component.',
    'Throttling without the boundary override. Release a fast flick and the final tick lands inside the cooldown window, so the state stops at whatever value last got through — a progress bar that never quite reaches 100% and a "complete" branch that never runs.',
    'Re-committing the boundary on every tick. Once progress is pinned at 1, every subsequent tick passes the override, so idling at the end of the range renders continuously — the opposite of the intent.',
    'Skipping the rAF coalescer. ScrollTrigger fires per scroll event, so two or three ticks can pass the time and distance gates within a single frame and React renders three times for one painted change.',
    'Cancelling the frame before killing the trigger. The trigger can schedule a new frame between the two calls, and that flush lands after unmount — `setState` on a dead tree, thrown from a rAF callback with no component in the stack trace.',
    'Storing tick and commit counts in state. They are diagnostics about renders; putting them in state makes every diagnostic a render and the measurement becomes the thing being measured.',
  ],

  notes: [
    'The continuous signal is still available: anything that needs per-frame precision should be written imperatively from `onUpdate`, and only the coarse state should come through the gate.',
    'The render prop receives the committed state only, so consumers cannot accidentally subscribe to the raw tick rate.',
  ],

  apiSignature:
    'function ThrottledScrubState(props: { children: (state: { progress: number; commits: number; ticks: number }) => ReactNode; interval?: number; minDelta?: number; scrub?: number | boolean; scrollerRef?: RefObject<HTMLElement | null>; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: '(state: ScrubState) => ReactNode', description: 'Render prop, called only on committed states.' },
    { name: 'interval', type: 'number', default: '100', description: 'Minimum milliseconds between commits.' },
    { name: 'minDelta', type: 'number', default: '0.02', description: 'Minimum change in progress before a commit is worth making.' },
    { name: 'scrub', type: 'number | boolean', default: '0.4', description: 'Seconds of catch-up behind the scroll position.' },
    { name: 'scrollerRef', type: 'RefObject<HTMLElement | null>', description: 'The scroll container that owns the scroll position. Omit for the document.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper via `cn`.' },
  ],

  reducedMotion:
    'The trigger stays, because the value tracks a scroll the reader is performing rather than animating on its own, but `scrub` becomes `true` — welded to the scroll position with no catch-up easing, so nothing continues to move after the reader stops. The gate is unchanged.',

  cleanup:
    'The context cleanup kills the ScrollTrigger first and only then cancels any outstanding animation frame, and nulls the pending value. Reversing the order leaves a window in which the still-live trigger schedules a frame that is never cancelled, and that flush calls `setState` on an unmounted tree — thrown from inside a rAF callback, so the stack trace names no component.',

  acceptance:
    'Scroll the panel and watch the two counters: ticks climbs continuously while commits climbs in steps, at roughly a tenth the rate. Flick hard to the very bottom and the progress readout reads exactly 100%, not 93%. Hold still at the bottom and the commit counter stops increasing. Move the scroller by one or two pixels at a time and no commit happens until the distance threshold is crossed.',

  criticalRegion: 'critical',
};

export default meta;
