import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'drag-throw-scroll',
  title: 'Drag-Throw Scroll',
  category: 'scroll',
  tags: ['lenis', 'pointer-events', 'inertia', 'drag', 'velocity'],
  blurb: 'Grab the page and pull it; let go mid-move and it coasts on, decaying, as far as the flick earned.',
  cost: 'dom',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/drag-throw-scroll.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['lenis@^1.3.11'],
  registryDependencies: ['use-lenis', 'use-raf', 'use-reduced-motion', 'damp'],

  summary:
    'A third input modality bolted onto a scroll position that already has two. Wheel, pointer drag and arrow keys all write to one place, so they cannot disagree — press stops whatever was coasting exactly where it looks, the drag maps 1:1 from the press point, and release converts the last 100 ms of hand movement into a decaying throw. Pointed at the document it drives the shared Lenis instance; pointed at a box it drives `scrollTop` through the same physics.',

  mechanism: [
    'On `pointerdown` the surface calls `setPointerCapture` and records `startY` plus `startScroll = lenis.scroll` — the animated position, not `targetScroll`, so grabbing a coasting page stops the content where the eye sees it rather than where the throw was headed.',
    'Every `pointermove` recomputes the scroll target absolutely: `clamp(startScroll - (clientY - startY) * gain, 0, limit)`. Gain is `multiplier` for mouse and pen and hard-wired to 1 for touch, because a finger is physically on the content and any other value slides the content out from under it.',
    'Positions are pushed into a 5-entry ring of `{ y, timeStamp }`. On release, velocity is `(newest.y - oldest.y) / (newest.t - oldest.t) * 1000` px/s using only samples inside a 100 ms window, so the number describes the hand rather than the event rate.',
    'The throw target is `target + (-velocity * gain) * throwSeconds`, clamped to the scroll limit. Below `MIN_THROW_SPEED` nothing is issued at all, so a careful release parks instead of drifting.',
    'The decay is one curve expressed twice: `lenis.scrollTo(y, { lerp: 0.05 })` for the page, and `damp(scrollTop, y, perFrameToSmoothing(0.05), dt)` on the shared rAF for a box scroller, which stops writing once it is within 0.5 px of target.',
    '`ArrowUp` / `ArrowDown` on the focused surface step by `keyStep` px through `scrollTo(y, { duration: 0.2 })`, so keyboard, wheel and hand all mutate the same single position.',
  ],

  constants: [
    {
      name: 'multiplier',
      value: '2',
      why: 'Scroll px per mouse px. At 1 a long page needs a grab per viewport, because the cursor runs out of window; above ~3 the content outruns the hand and the gesture stops reading as direct manipulation. Touch ignores this entirely and uses 1.',
    },
    {
      name: 'throwSeconds',
      value: '0.65',
      why: 'Coast distance is velocity × this, so it is the time constant of the flick. Under ~0.3 a hard flick barely outruns the release and the throw is invisible; over ~1 a flick crosses the whole document and lands somewhere the user did not aim.',
    },
    {
      name: 'THROW_LERP',
      value: '0.05',
      why: 'Per-frame fraction of the remaining gap, i.e. a long slow settle — the point of a throw is that it decays visibly. At 0.2 it arrives in a few frames and reads as a jump; `perFrameToSmoothing` converts the same number for the `damp` path so the two sinks decay identically.',
    },
    {
      name: 'SAMPLE_WINDOW_MS',
      value: '100',
      why: 'Only samples newer than this count toward the release velocity. Without the window, a drag that travels fast and then stops dead for a second still throws, because the fast samples are still in the buffer — the page launches from a hand that was holding still.',
    },
    {
      name: 'SAMPLE_COUNT',
      value: '5',
      why: 'Ring length. One sample is pure jitter, and more than about five spans long enough that the window filter is doing all the work anyway; five covers roughly 80 ms at 60 Hz, which is one flick.',
    },
    {
      name: 'MIN_THROW_SPEED',
      value: '120 px/s',
      why: 'Below this no throw is issued. At 0.65 s of coast, 120 px/s is a 78 px slide — around the point where a deliberate stop stops feeling deliberate. Lower and the content creeps after every release.',
    },
    {
      name: 'SETTLE_EPSILON',
      value: '0.5 px',
      why: 'An exponential never actually arrives. Without a floor the box sink writes a sub-pixel `scrollTop` every frame forever, so the rAF subscription never idles and the scroll event never stops firing.',
    },
    {
      name: 'KEY_STEP_SECONDS',
      value: '0.2',
      why: 'Arrow-key travel time. Instant is disorienting because nothing connects the two positions; beyond ~0.35 s holding the key queues steps faster than they complete and the page falls behind the keyboard.',
    },
  ],

  pitfalls: [
    'Constructing a second Lenis instance instead of sharing one. Both bind `wheel`, both call `preventDefault`, and the page scrolls at exactly double speed — which looks like a badly tuned multiplier and gets "fixed" by halving the multiplier instead.',
    'Measuring velocity as the mean of per-event deltas. That is px per event, not px per second: the identical physical flick throws half as far on a 120 Hz display, because each event covers half the distance. Divide by real elapsed time.',
    'Not expiring old samples. Drag fast, hold still for a second, release — the buffer still holds the fast samples and the page launches from a stationary hand.',
    'Accumulating `scrollTo(current + delta)` per move. `current` is the animated position, which lags the target, so every event throws away the part the sink has not applied yet and the content drifts behind the hand over a long drag. Track the press point and compute the target absolutely.',
    'Omitting `setPointerCapture`. Drag past the edge of the surface and `pointermove` stops arriving, so the content freezes mid-gesture and then teleports when the pointer comes back.',
    'Treating `pointerup` as the only terminator. Capture can be revoked with no `pointerup` — the OS claims the gesture, the element is detached, another finger lands — and the surface is left believing a finger is still down, ignoring every later press. `pointercancel` and `lostpointercapture` both have to end the drag.',
    'Leaving `touch-action` at its default. The compositor claims the touch gesture, `pointermove` stops, and the drag dies in a `pointercancel` on the first frame while the page scrolls natively underneath.',
    'Forgetting that a host stylesheet with `scroll-behavior: smooth` fights a direct `scrollTop` write on the box sink, which shows up as a rubbery lag under the finger. Set `scroll-behavior: auto` on the scroll container.',
  ],

  notes: [
    'The surface takes `tabIndex={0}` and binds `keydown` on itself rather than on `window`, so arrow keys still belong to a search field elsewhere on the page.',
    'Presses that land on `a, button, input, select, textarea, label` or anything marked `[data-no-drag]` are left alone, so a link inside the draggable area is still a link.',
    '`dragstart` is prevented on the surface: native HTML5 drag on an inner image or link would otherwise hand back a ghost image instead of a scroll.',
  ],

  apiSignature:
    'function DragThrowScroll(props: { children?: ReactNode; scroller?: RefObject<HTMLElement | null>; multiplier?: number; throwSeconds?: number; keyStep?: number; enabled?: boolean; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'The draggable content. The surface is `position: relative` and nothing else.' },
    { name: 'scroller', type: 'RefObject<HTMLElement | null>', description: 'Box to scroll. Omit to drive the document through the shared Lenis instance.' },
    { name: 'multiplier', type: 'number', default: '2', description: 'Scroll px per pointer px for mouse and pen. Touch is always 1.' },
    { name: 'throwSeconds', type: 'number', default: '0.65', description: 'Time constant of the release throw; distance is velocity × this.' },
    { name: 'keyStep', type: 'number', default: '100', description: 'Arrow-key step in px while the surface has focus.' },
    { name: 'enabled', type: 'boolean', default: 'true', description: 'False removes every listener and restores native scrolling.' },
    { name: 'className', type: 'string', description: 'Merged onto the drag surface.' },
  ],

  reducedMotion:
    'Dragging still works and is still 1:1 — pulling content with a finger is direct manipulation, not motion someone asked to be spared. What is removed is everything that keeps moving on its own: no Lenis instance is built, so the page scrolls natively, release stops exactly where the hand stopped, and arrow keys jump rather than travel.',

  cleanup:
    'All seven listeners are removed, any pointer still captured is released, the coast target is cleared so the shared rAF idles, and `data-dragging` is reset. The Lenis instance is refcounted by `useLenis`: the last consumer to unmount destroys it, earlier ones only detach.',

  acceptance:
    'Press and pull upward: the content follows the pointer and stops the moment the pointer does. Flick and release: it coasts on and decays to a stop. Grab it mid-coast and it stops dead under your hand with no forward jump. Start a drag, run the pointer off the edge of the window and release there — the content stops instead of sticking, and the next press still works. Focus the surface and hold ArrowDown for stepped travel. With reduced motion on, release stops instantly.',

  criticalRegion: 'critical',
};

export default meta;
