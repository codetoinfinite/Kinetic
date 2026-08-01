import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'pause-dont-unmount',
  title: "Pause, Don't Unmount",
  category: 'primitive',
  tags: ['activity', 'react-19', 'lifecycle', 'webgl', 'three'],
  blurb:
    "React 19's Activity hides a WebGL scene without losing its state. Effects still tear down, so the GL context is genuinely released.",
  cost: 'webgl',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/pause-dont-unmount.tsx',
      type: 'registry:ui',
      role: 'Activity boundary, the scene inside it, and the A/B switch',
    },
  ],
  dependencies: ['three@^0.185.1'],
  registryDependencies: ['webgl', 'prng', 'use-raf', 'use-reduced-motion', 'use-resize-observer'],

  summary:
    'A rotating stack of slabs mounted twice over: once behind `<Activity mode="hidden">` and once behind a plain conditional, switchable live. Hiding tears the Effects down either way — the WebGL context is released, which is what you want, since contexts are a scarce per-process resource. What Activity keeps is everything React owns: the fiber, the DOM, and every `useState` and `useRef` value inside. So the stack resumes at the angle it left, and the build counter on its fiber survives to be incremented again. Requires React 19.2 or newer.',

  mechanism: [
    '`<Activity mode="hidden">` does three separable things, and conflating them is where the misuse starts: it sets `display: none` on the host children, it destroys the Effects inside — cleanup functions run, in order, exactly as on unmount — and it keeps the fiber alive, so state, refs and DOM nodes are all still there when `mode` goes back to `visible`. Children continue to re-render, at a priority below anything visible.',
    'Because Effects are destroyed, the scene\'s cleanup runs on every hide: materials and geometry are disposed and `disposeRenderer` calls `renderer.forceContextLoss()`. That is the correct behaviour rather than a shortfall — Chromium hands out roughly sixteen WebGL contexts per renderer process and evicts the oldest past that, so a context parked behind `display: none` is the thing that blanks an unrelated canvas three sections down the page.',
    'The rotation phase lives in a `useRef` inside the hidden subtree, and the build Effect seeds the slab rotations from it BEFORE the first draw. On re-show the scene is correct on frame one; there is no snap from zero up to the resumed angle. Under the `unmount` arm the same ref is a fresh zero because the fiber it lived on was collected.',
    'The build counter is the proof, and it needs both halves to move: it increments inside the Effect, so it only rises if the Effect really re-ran, and it survives between runs only if the fiber was preserved. Under `activity` it climbs 1, 2, 3; under `unmount` it is pinned, because each show starts a new fiber whose counter is new too.',
    'Build cost is measured with `performance.now()` from the top of the Effect to the end of the first completed `render`, so it covers context acquisition, program linking and the initial upload — the work Activity does not save. On a desktop GPU it lands in the tens of milliseconds; the point of the readout is that the number is not zero.',
    'The size hook re-seeds synchronously from `getBoundingClientRect` on every Effect run, and its state is preserved across the hide as well, so the re-shown scene already knows its dimensions and skips the zero-sized first render that a fresh mount has to pass through. That one saved render round-trip is a second, quieter thing the preserved fiber buys.',
    'The renderer creates its own canvas inside the Effect and it is removed in cleanup. A React-rendered `<canvas ref>` cannot work here: with `forceContextLoss()` in cleanup, StrictMode\'s double-invoke hands the second run a permanently dead element, and Activity turns that from a once-per-mount hazard into a once-per-toggle one.',
  ],

  constants: [
    {
      name: 'GAP',
      value: '0.2',
      why: 'Vertical spacing between slabs in world units, at a slab height of 1.15. Tight enough that the group reads as one stack rather than seven separate cards, wide enough that the back-to-front transparent sort has visible separation to work with.',
    },
    {
      name: 'TWIST',
      value: '0.24',
      why: 'Radians of rotation between neighbouring slabs — about 14 degrees, so seven slabs fan through 84 degrees, just under a quarter turn. Past a full turn the stack becomes rotationally ambiguous and "it resumed where it left" stops being checkable by eye.',
    },
    {
      name: 'count / period',
      value: '7 / 24',
      why: 'Seven slabs at 24 seconds a revolution: 15 degrees per second. Slow enough that a hide and a show a second apart leaves a gap the eye can measure against the readout, which is the entire experiment.',
    },
    {
      name: 'CAM_Y / CAM_Z',
      value: '2.05 / 4.4',
      why: 'A camera lean of about 25 degrees above the stack. Flatter and the slabs collapse into a single silhouette; steeper and it reads as a plan view where the vertical stacking disappears.',
    },
    {
      name: 'opacity ramp',
      value: '0.34 to 0.80',
      why: 'Bottom slab to top. The ramp is what makes the stack legible through itself; a constant alpha turns seven slabs into one muddy plane.',
    },
  ],

  pitfalls: [
    'Expecting Activity to keep the WebGL context alive. It does not, by design — Effects are destroyed on hide, so your cleanup runs and the context is released. If you had assumed otherwise and skipped disposal, you leak instead; if you assumed re-showing is free, the rebuild millisecond readout says otherwise.',
    'Lifting the state you wanted preserved above the boundary. Anything outside the `<Activity>` was never at risk, and anything the parent owns is not evidence of anything. The value has to live on a fiber inside the boundary or the comparison proves nothing.',
    'Changing the element at the boundary position instead of changing `mode`. Swapping `<Activity>{scene}</Activity>` for `{scene}` reconciles as a different type at that slot, so React unmounts the subtree and every preserved value goes with it. Keep the boundary mounted and toggle `mode`.',
    'Treating hidden as unrendered. Children keep re-rendering, only at a lower priority, so a parent state update still walks the hidden subtree. Anything expensive in render — not in an Effect — is still paid for while hidden.',
    'Assuming a ref into hidden DOM behaves the same as a ref into visible DOM. The DOM nodes themselves survive, but ref attachment is part of the layout-effect phase that the offscreen path tears down and replays, and this component does not depend on the answer either way. Do the work in an Effect, which is re-run on show, rather than caching a node in a closure that outlives the hide.',
    'Handing three\'s renderer a React-rendered `<canvas ref>`. Cleanup calls `forceContextLoss()`, and the next Effect run — from StrictMode or from a re-show — is given the same dead element. Let the renderer build its own canvas in the Effect and remove it in cleanup.',
    'Reading the build counter in development and taking the absolute number literally. StrictMode double-invokes Effects on mount, so the first build reads 2, not 1. The claim to check is the shape: climbing under `activity`, pinned under `unmount`.',
  ],

  notes: [
    '`Activity` is exported from `react` from 19.2 (verified against 19.2.8: `exports.Activity = REACT_ACTIVITY_TYPE`, typed as `ExoticComponent<ActivityProps>` with `mode?: "hidden" | "visible"`). On anything older the import is undefined at runtime, not a build error, which fails as a blank subtree.',
    'The strongest real use is not a canvas at all — it is a tab, a route the user is likely to come back to, or a filter panel: scroll offsets, uncontrolled input values and list virtualisation windows are all preserved for free, and none of them cost a GPU context to rebuild.',
    'Pre-rendering the other direction, `mode="hidden"` on a subtree that has never been visible, mounts it at low priority without running Effects. Useful for warming a route, useless for warming a renderer, for the same reason as above.',
  ],

  apiSignature:
    "function PauseDontUnmount(props: { strategy?: 'activity' | 'unmount'; count?: number; period?: number; color?: string; accent?: string; seed?: number | string; className?: string }): JSX.Element",

  props: [
    { name: 'strategy', type: "'activity' | 'unmount'", default: "'activity'", description: 'Which arm the switch starts on.' },
    { name: 'count', type: 'number', default: '7', description: 'Slabs in the stack.' },
    { name: 'period', type: 'number', default: '24', description: 'Seconds for one full rotation.' },
    { name: 'color', type: 'string', default: "'#5f6873'", description: 'Colour of the bottom slab.' },
    { name: 'accent', type: 'string', default: "'#e8e4dc'", description: 'Colour of the top slab. The stack lerps between the two.' },
    { name: 'seed', type: 'number | string', default: "'pause-dont-unmount'", description: 'Seeds the per-slab size jitter.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'The stack holds still — the phase is integrated from delta time, so freezing it is a matter of adding nothing — and with nothing marking the frame dirty the renderer draws once per build and then idles. The demonstration survives the loss of motion because it was never really about the motion: the build counter still climbs under `activity` and stays pinned under `unmount`, and the rebuild cost in milliseconds is still charged on every show. Only the resumed rotation angle stops being informative, since both arms sit at zero degrees.',

  cleanup:
    'The Effect removes each slab and disposes its material, disposes the one shared geometry, calls `disposeRenderer` — which stops the loop, disposes the renderer and calls `forceContextLoss()` — and removes the canvas it appended. This runs on unmount, on a StrictMode double-invoke, and on every Activity hide, so it is exercised constantly rather than once. `useRaf` unsubscribes and the shared loop parks when its last subscriber leaves; the `ResizeObserver` unobserves with its hook. A separate Effect reports the scene as gone on teardown so the readout does not freeze on a stale row.',

  acceptance:
    'On `activity`: press hide, wait, press show. The stack picks up at the angle the readout froze at, `builds` has gone up by one, and the rebuild cost is a real number of milliseconds. On `unmount`: the same sequence returns the stack to zero degrees and `builds` never moves. Hide on either arm and the canvas is gone from the DOM inspector under `unmount` but present with `display: none` under `activity`. Neither arm accumulates WebGL contexts — toggle twenty times and the other previews on the page stay drawn.',

  criticalRegion: 'critical',
};

export default meta;
