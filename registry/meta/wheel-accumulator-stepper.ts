import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'wheel-accumulator-stepper',
  title: 'Wheel Accumulator Stepper',
  category: 'primitive',
  tags: ['wheel', 'deltamode', 'trackpad', 'momentum', 'input', 'stepper'],
  blurb: 'Wheel input normalised by deltaMode and accumulated to a threshold, so one flick of any device moves exactly one step.',
  cost: 'dom',
  motif: 'stack',

  files: [
    { path: 'registry/ui/wheel-accumulator-stepper.tsx', type: 'registry:ui', role: 'hook' },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    '`wheel` is four input devices wearing one event name. A mouse notch is a single event carrying 100 units; a trackpad swipe is forty events of four units each, followed by a synthesised momentum tail that keeps arriving for about a second after the fingers lift; and `deltaMode` decides whether those numbers are pixels, lines, or whole pages. This hook scales the delta by `deltaMode`, sums it, and emits one step per 90 normalised pixels — then latches, and re-arms only when the incoming magnitude stops decaying, which is the one signal that separates a fresh flick from the tail of the last one.',

  mechanism: [
    '`wheelDelta(e, axis)` picks the axis — `Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY` for `both`, so a sideways two-finger swipe and a mouse wheel drive the same widget — then multiplies by the scale `deltaMode` implies: 1 for pixel mode, 40 for line mode, 800 for page mode. Everything downstream counts pixels.',
    'A signed accumulator sums the normalised deltas. While `Math.abs(units) >= step` it subtracts one signed `step` and calls `onStep(direction, detail)`, capped at `maxPerEvent` iterations. One mouse notch (100 units) clears the 90-unit threshold on its own; a trackpad swipe clears it after roughly a dozen events. No device detection anywhere.',
    'After any step the accumulator is zeroed rather than left holding the remainder, and a latch closes. `peak` records the magnitude of the event that fired the step.',
    'While latched, an event whose magnitude is below `peak` is absorbed: no accumulation, no step, but `preventDefault` still runs so the page does not scroll underneath the widget. The first event whose magnitude reaches `peak` re-arms. macOS momentum is monotonically decreasing, so a tail can never reach its own peak and is swallowed entirely; the next notch of a mouse wheel has an identical magnitude and re-arms immediately; a second deliberate flick exceeds it on its first event.',
    'Two further resets bypass the latch: a gap greater than `gestureGapMs` since the previous accepted event, which means the gesture and its tail are finished, and a change of sign, since no momentum tail reverses direction.',
    '`e.ctrlKey` events return before `preventDefault` and before accumulation — that combination is pinch-zoom on a trackpad and page zoom on a mouse, and swallowing it removes the only way to enlarge the page.',
    'The listener is registered `{ passive: !preventDefault }`, so it is non-passive exactly when it intends to cancel. The live accumulator is exposed as a `RefObject`, not state, so a gauge can read it every frame without re-rendering the widget forty times per swipe.',
  ],

  constants: [
    {
      name: 'STEP',
      value: '90',
      why: 'Normalised pixels per step. It has to sit below one mouse notch so a single notch always moves exactly one item — Chrome reports 100 per notch and legacy browsers 120, so anything above 100 makes a mouse feel broken. Going much below ~60 puts it inside the range of a small trackpad twitch and the widget steps when the user meant to scroll past it.',
    },
    {
      name: 'LINE_UNITS',
      value: '40',
      why: 'Pixels assumed per line for `deltaMode === 1`. Firefox reports line mode on several platforms, where `deltaY` is typically 3 — 3 x 40 = 120 units, which matches what the same physical notch reports as pixels in Chrome. Using 1 here (i.e. not normalising at all) makes the stepper need thirty notches per step in Firefox and one in Chrome.',
    },
    {
      name: 'PAGE_UNITS',
      value: '800',
      why: 'Pixels assumed per page for `deltaMode === 2`. Roughly one viewport. The exact figure barely matters because any page-mode event is far past the threshold; what matters is that it is not 1, which would make a full-page wheel event register as almost no movement.',
    },
    {
      name: 'GESTURE_GAP_MS',
      value: '140',
      why: 'Silence that ends a gesture. Momentum tail events arrive at frame rate, so ~8-17 ms apart; sustained finger input is similar. 140 ms is far above both and far below the ~250 ms a person needs to lift, reposition, and flick again, so it never splits one gesture in two and never merges two.',
    },
    {
      name: 'MAX_PER_EVENT',
      value: '1',
      why: 'Steps emitted from a single event. One event should mean at most one step, and with the latch in place the only thing this guards is a single enormous delta — a page-mode wheel worth 800 units, or a synthetic event from an automation script, either of which would otherwise advance eight items in one frame. Raise it to 2 or 3 if a violent flick should travel further; the demo keeps it at 1.',
    },
  ],

  pitfalls: [
    'Reading `deltaY` without reading `deltaMode`. The same physical notch is `deltaY: 100` in pixel mode and `deltaY: 3` in line mode, so a threshold tuned in Chrome needs about thirty notches per step in a line-mode browser. The bug never reproduces on the developer\'s machine.',
    'Stepping on every wheel event. A trackpad emits thirty to forty events per swipe, so a carousel jumps thirty slides for one gesture — the single most common wheel bug and the reason the accumulator exists at all.',
    'Accumulating with no latch. The accumulator fixes the burst but not the tail: macOS keeps synthesising decaying wheel events for about a second after the fingers lift, and a hard flick has enough left in that tail for three or four more thresholds. The carousel takes one step under your fingers and then keeps going on its own.',
    'Latching with a fixed cooldown instead. A cooldown long enough to outlast the tail (roughly 600-1000 ms) also eats the second of two deliberate flicks, so the widget feels dead when hurried; a cooldown short enough to keep double flicks alive lets the loud part of the tail through. Decay is the only signal that separates the two cases.',
    'Comparing each tail event against the previous event rather than against the peak. Tail magnitudes jitter, so `39 >= 38` looks like new input and re-arms mid-tail, which is exactly the extra step the latch was added to prevent. Comparing against the peak since the latch closed cannot be fooled by jitter.',
    'Carrying the leftover units past a step. Zeroing looks lossy but is correct: the overshoot belongs to the gesture that just ended, and banking 80 of 90 units means the next flick fires after a single event of travel.',
    'Skipping `preventDefault` while the latch is absorbing the tail. The widget correctly refuses to step, and the page scrolls instead — so the carousel holds still and the whole section slides away underneath it.',
    'Registering the listener non-passive when it never cancels. That opts the element out of the browser\'s scrolling fast path for nothing. The mirror-image bug is calling `preventDefault` inside a passive listener, where it is silently ignored with a console error and the page scrolls anyway.',
    'Swallowing `ctrl`+wheel. That is pinch-zoom on every trackpad and page zoom on every mouse; intercepting it means a low-vision user cannot enlarge the page while the pointer is anywhere over the widget.',
    'Publishing the accumulator as React state. Forty state updates per swipe re-render the whole widget to move a 40 px gauge; a ref plus one CSS custom property write costs nothing and cannot tear.',
    'Attaching to `window` instead of the element. The widget then steps while the pointer is somewhere else entirely, and a non-passive window-level wheel listener degrades scrolling for the whole document.',
  ],

  notes: [
    'The latch makes one gesture mean one step, which is right for a carousel, a chapter list, or anything with discrete positions. For a continuous value — a zoom level, a scrub position — drop the latch and use the normalised delta directly; the `deltaMode` scaling is the part you still need.',
    '`onStep` is called synchronously inside the wheel handler, so it runs before the frame that would have scrolled. Keep it to a state update or a ref write; layout reads there cost a forced synchronous reflow on every notch.',
    'A trackpad in a browser that supports it will also fire `gesturestart` / `gesturechange` for pinch, which is a separate event stream. This hook deliberately ignores it rather than trying to reconstruct pinch from `ctrl`+wheel.',
  ],

  apiSignature:
    "function useWheelStepper(ref: RefObject<HTMLElement | null>, options: { step?: number; axis?: 'both' | 'x' | 'y'; maxPerEvent?: number; gestureGapMs?: number; preventDefault?: boolean; enabled?: boolean; onStep: (direction: 1 | -1, detail: { index: number; delta: number; deltaMode: number; event: WheelEvent }) => void }): { units: RefObject<number>; latched: RefObject<boolean> }\nfunction wheelDelta(e: WheelEvent, axis?: 'both' | 'x' | 'y'): number\nfunction wheelUnitScale(deltaMode: number): number",

  props: [
    { name: 'step', type: 'number', default: '90', description: 'Normalised pixels of travel per emitted step. Must stay below one mouse notch (100).' },
    { name: 'axis', type: "'both' | 'x' | 'y'", default: "'both'", description: '`both` uses whichever of `deltaX` / `deltaY` dominates, so horizontal and vertical input both work.' },
    { name: 'maxPerEvent', type: 'number', default: '1', description: 'Ceiling on steps emitted from one event. Guards a single page-mode delta worth 800 units.' },
    { name: 'gestureGapMs', type: 'number', default: '140', description: 'Silence that ends the gesture and clears the latch. Above frame interval, below a human reflick.' },
    { name: 'preventDefault', type: 'boolean', default: 'true', description: 'Cancel the page scroll on every accepted event. Also decides whether the listener is passive.' },
    { name: 'enabled', type: 'boolean', default: 'true', description: 'Detaches the listener when false — for a widget that only owns the wheel while open.' },
    { name: 'onStep', type: '(direction: 1 | -1, detail: WheelStepDetail) => void', description: 'Called once per step, synchronously in the wheel handler. `+1` is down or right.' },
  ],

  reducedMotion:
    'Steps still fire — a step is the user\'s input, not decoration, and suppressing it would leave the widget unresponsive. What changes is the burst: the per-event step count is clamped to 1 regardless of `maxPerEvent`, so a violent flick advances one item instead of travelling several in a single frame. Whatever the consumer animates in response to a step is where a reduced-motion transition belongs.',

  cleanup:
    'The effect removes the `wheel` listener with the same capture flag it was added with, and zeroes both the accumulator and the latch so a remount does not inherit half a gesture. There is no timer, no rAF, and no pointer capture to release. Re-running under React 19 StrictMode is harmless: the second effect attaches a second listener only after the first has removed its own.',

  acceptance:
    'Wheel over the panel with a mouse: every notch moves exactly one item, and a fast spin moves one per notch with no skipping. Flick hard on a trackpad and let go: the index advances exactly once and then holds still while the readout shows the tail arriving and being absorbed. Flick twice in quick succession and it advances twice. Push slowly and continuously and the gauge fills to the threshold before each step, so the accumulation is visible. Reverse direction mid-gesture and it steps back without first having to unwind the units already banked. Hold ctrl and wheel: the browser zooms, and the index does not move. Scroll the outer page with the pointer just outside the panel and the panel ignores it.',

  criticalRegion: 'critical',
};

export default meta;
