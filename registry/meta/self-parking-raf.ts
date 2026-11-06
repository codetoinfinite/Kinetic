import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'self-parking-raf',
  title: 'Self-Parking RAF',
  category: 'primitive',
  tags: ['raf', 'damping', 'epsilon', 'idle', 'performance'],
  blurb: 'An epsilon snap lets a damped value reach its target exactly, so the frame loop hits its exit test and dies.',
  cost: 'dom',
  motif: 'wave',

  files: [{ path: 'registry/ui/self-parking-raf.tsx', type: 'registry:ui', role: 'hook' }],
  dependencies: [],

  summary:
    'An eased value never arrives. Closing 12% of the remaining gap each frame closes it 100% never — the distance decays asymptotically and `current !== target` stays true for the life of the page, so a loop conditioned on that comparison never stops. One line fixes it: below a threshold, assign the target outright. The equality test can now succeed, the loop reaches its own stopping condition, and it unsubscribes itself. The frame callback exists only while something is genuinely moving.',

  mechanism: [
    'The damped step is `damp(current, target, smoothing, dt)`, which is `current + (target - current) * (1 - smoothing^dt)`. The exponent is what makes it frame-rate independent: the naked `* 0.12` from the source converges twice as fast at 120 Hz as at 60 Hz, so the same code feels different on different hardware and visibly speeds up whenever the browser drops frames.',
    'After the step, `Math.abs(target - next) < epsilon` assigns `next = target` exactly. This is the entire technique. Without it the loop\'s exit condition — `next === target` — is unreachable, because exponential decay produces 1e-8, then 1e-9, then a denormal, and never a clean zero.',
    'Parking is expressed as React state, not as a local flag: `setRunning(false)` drops the `useRaf` subscription, and when the last subscriber leaves the shared loop calls `cancelAnimationFrame` and stops scheduling frames at all. The saving is the whole callback plus the paint it would have dirtied, not merely the arithmetic.',
    'Waking is driven by a `target` change in an effect, guarded by `value.current === target`. The guard is load-bearing: without it any unrelated re-render that happens to pass the same target restarts a loop that had already parked, which is how "self-parking" quietly degrades back into an always-on loop.',
    'Because `perFrameToSmoothing(0.12)` is `0.88^60 ≈ 0.00047`, the value retains 0.047% of its gap after a second — so the settle time is a few hundred milliseconds and the epsilon is crossed within roughly twenty frames rather than being an escape hatch from a genuinely long tail.',
    'A hidden tab and reduced motion both take the same short path: `park()` assigns the target, emits one `onFrame`, and never starts a loop. No observer means no reason to interpolate, and the value stays correct either way.',
  ],

  constants: [
    {
      name: 'per-frame rate',
      value: '0.12',
      why: 'Fraction of the remaining gap closed per frame at 60fps, converted through `perFrameToSmoothing`. It settles in about 300 ms — fast enough that a scrubber feels attached to the click, slow enough to read as motion. Above ~0.3 the damping is barely visible and the loop may as well be a jump; below ~0.05 the tail is long enough that a user beats it with the next click.',
    },
    {
      name: 'EPSILON',
      value: '0.0002',
      why: 'Snap threshold, in the units of the value. For the 0-1 normalised scrub position of the source this is a fifth of a pixel on a 1000 px track — invisible. Set it to 0 and the loop never parks, which is the exact bug this component exists to fix. Set it far too large and the last visible fraction of the travel is skipped as a jump.',
    },
    {
      name: 'MAX_DT',
      value: '0.1',
      why: 'Inherited from `useRaf`. A tab returning from the background delivers a multi-second delta; unclamped, `smoothing^dt` underflows to 0, the damp closes the entire gap in one frame, and the "settle" is a teleport.',
    },
  ],

  pitfalls: [
    'Omitting the epsilon snap. The value approaches the target forever, the exit test never passes, and one hover or one scrub leaves a rAF running for the rest of the session. It is invisible in a demo and shows up as a battery complaint.',
    'Expressing epsilon in the wrong unit. The threshold is compared against the value, so 0.0002 is correct for a 0-1 progress value and absurd for a pixel offset — at pixel scale it costs dozens of extra frames to cross, and the loop appears not to park.',
    'Keeping the loop alive to "avoid the cost of restarting it". Subscribing to a shared rAF is a `Set.add`; a frame callback plus the paint it dirties is orders of magnitude more. Restarting is free, running is not.',
    'Using `current += (target - current) * 0.12` directly. Frame-rate dependent: the same settle takes 300 ms at 60 Hz and 150 ms at 120 Hz, and speeds up mid-motion whenever a long task drops frames — the animation gets faster precisely when the page is struggling.',
    'Waking the loop without comparing against the current value. Every re-render that re-supplies the same target restarts the loop, which parks on its first frame and restarts on the next render — a loop that thrashes instead of resting.',
    'Calling `setState` from `onFrame`. That re-renders on every frame of the settle, which costs far more than the loop being parked ever saved. `onFrame` is for DOM writes.',
    'Reading the returned `value` ref during render. It changes between renders without notifying React, so the rendered output and the ref disagree; read it inside a frame callback or an event handler only.',
    'Forgetting that the loop is asleep when the target is set imperatively. Anything that mutates the underlying source without changing the `target` prop leaves the value stale, because nothing is polling — the trade for not running a loop is that changes must be declared.',
  ],

  notes: [
    'The natural pairing is with an invalidate-driven renderer: a WebGL scene that renders only on demand plus a value that only moves on demand gives a page that is genuinely idle at rest, not merely cheap.',
    'The `park()` escape hatch exists for handoffs — a drag that takes over the value, or a route change that should not animate the old position. It emits one final `onFrame` so the DOM is left in the correct end state rather than mid-travel.',
    '`running` is exposed because parking is otherwise unobservable, and a component that claims to park should be able to prove it. The demo prints it beside a frame count that freezes.',
    'For several values settling together, one hook per value is fine — they all share the single `useRaf` loop, and the last one to park is the one that stops it.',
  ],

  apiSignature:
    'function useSelfParkingRaf(target: number, options: { smoothing?: number; epsilon?: number; onFrame: (value: number) => void }): { running: boolean; value: RefObject<number>; park: () => void }',

  props: [
    { name: 'target', type: 'number', description: 'The value to settle toward. Changing it wakes the loop; it is the only trigger.' },
    { name: 'smoothing', type: 'number', default: 'perFrameToSmoothing(0.12)', description: 'Fraction of the gap remaining after one second. Smaller is snappier.' },
    { name: 'epsilon', type: 'number', default: '0.0002', description: 'Distance below which the value snaps to the target and the loop parks. Must match the unit of the value.' },
    { name: 'onFrame', type: '(value: number) => void', description: 'Called with the damped value every frame while running, and once when it parks. For DOM writes.' },
  ],

  reducedMotion:
    'No loop is started at all. A target change calls `park()`, which assigns the target and emits a single `onFrame`, so the value lands on its final position in one write. That is the still, correct state rather than a zero-duration animation: `onFrame` still fires, so the DOM the consumer writes is identical to the end of a full settle, and `running` never goes true.',

  cleanup:
    '`useRaf` removes the subscription when `running` goes false or the component unmounts, and cancels the shared frame when it was the last subscriber — so an unmount mid-settle leaves nothing scheduled. The visibility and media-query listeners belong to `useVisibility` and `useReducedMotion`, which detach their own. No timers and no direct `requestAnimationFrame` handles are held.',

  acceptance:
    'Click a timecode. The bar and the readout race to it and stop, and the status line goes from "rAF live" to "rAF parked" with the frame count frozen at roughly twenty — not climbing. Leave it alone for a minute: the count does not move. Open DevTools performance and record while idle after a seek; there are no animation frames. Click the timecode that is already active and nothing wakes. Switch tabs mid-settle and come back — the bar is already at its target with no catch-up sweep. With reduced motion on, a seek moves the bar in one step, the count reads 1, and the status never leaves "parked".',

  criticalRegion: 'critical',
};

export default meta;
