import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'drag-deadzone-capture',
  title: 'Drag with a Dead Zone and Pointer Capture',
  category: 'primitive',
  tags: ['pointer', 'drag', 'dead-zone', 'setpointercapture', 'pointercancel', 'input'],
  blurb: 'Captures the pointer on press but only commits to a drag past a distance threshold, so a shaky click stays a click.',
  cost: 'dom',
  motif: 'stack',

  files: [{ path: 'registry/ui/drag-deadzone-capture.tsx', type: 'registry:ui', role: 'hook' }],
  dependencies: [],
  registryDependencies: [],

  summary:
    'A deliberate click moves the pointer one to three pixels; a tap on a phone moves five or more. A drag handler with no dead zone calls all of them drags, so the track lurches on every click and the code that suppresses the post-drag click starts suppressing clicks the user meant. This hook captures the pointer on `pointerdown` — so a fast throw that leaves the element keeps delivering moves — and only commits to a drag once the pointer is further than the threshold from the press point. Every one of the four ways a gesture can end funnels through a single exit, because the path you forget is the one that leaves the track welded to a pointer that is no longer there.',

  mechanism: [
    '`pointerdown` records the press point and calls `setPointerCapture(e.pointerId)` immediately, before any distance test. Capture first, commit second: at the moment the threshold is crossed the pointer may already be outside the element, and `setPointerCapture` on a pointer that has since ended throws `NotFoundError`. Inside its own `pointerdown` the pointer is guaranteed active, so it cannot throw there.',
    '`pointermove` computes `distance = Math.hypot(clientX - startX, clientY - startY)` and returns early while it is under the threshold — 8 px for mouse and pen, 16 px for touch, read from `pointerType` on the live pointer rather than from a media query. Until it commits, no callback fires and nothing moves.',
    'At the moment of commitment the delta origin is re-based to the current point (`lastX = clientX`). A consumer that integrates `deltaX` therefore starts from zero at the commit point instead of receiving the entire dead zone as the first frame\'s delta, which would snap the track 8 px the instant it engaged. `dx` still measures from the true press point, so the distance maths stays honest.',
    'With `axis` set to `x` or `y` the threshold test becomes directional: if the cross axis clears the dead zone first *and* dominates the main axis, the gesture is abandoned as cancelled so the browser can scroll. Combined with `touch-action: pan-y`, a horizontal dragger and vertical page scrolling coexist on a phone.',
    'One `finish(clientX, clientY, cancelled)` handles `pointerup`, `pointercancel`, `lostpointercapture` and the returned `cancel()`. It releases the capture if still held, nulls `pointerId`, and calls `onDragEnd(state, { moved, cancelled })`. The `pointerId === null` guard at the top makes the second arrival for one gesture a no-op — `lostpointercapture` always follows a release, so without it every drag would end twice.',
    'The effect sets `touch-action` (from `axis`) and `user-select: none` on the element and restores the previous inline values on cleanup, and it cancels HTML5 `dragstart` so a press on an image does not turn into a native file drag.',
    '`moved` is the whole output that matters downstream: false means the gesture was a tap and the consumer should treat it as a click; true means a click that arrives next should be swallowed.',
  ],

  constants: [
    {
      name: 'THRESHOLD',
      value: '8',
      why: 'Dead-zone radius in pixels for mouse and pen. A deliberate trackpad click slips one to three pixels, and a click while the hand is moving toward the target slips more, so below about 6 the dead zone stops catching real clicks. Above about 14 the beginning of a genuine drag feels glued down — the pointer has visibly moved and the track has not.',
    },
    {
      name: 'TOUCH_THRESHOLD',
      value: '16',
      why: 'Dead-zone radius for touch. A finger pad rolls as it presses and the reported point moves with it, typically 5-10 px on a tap; 8 px would classify a large share of taps as drags. Chrome\'s own touch-slop for scroll arbitration is in the same range, so this roughly matches what the platform already considers a tap.',
    },
    {
      name: "touch-action (axis 'x')",
      value: "'pan-y'",
      why: 'Not `none`. `none` gives the element every gesture, including the vertical swipe that was meant to scroll the page, and a horizontal carousel that eats vertical swipes makes a phone page feel broken. `pan-y` hands vertical panning back to the browser, which then fires `pointercancel` when it claims the gesture — which is exactly why `pointercancel` has to be handled.',
    },
  ],

  pitfalls: [
    'No dead zone at all. Every click becomes a two-pixel drag, so the track twitches on each press, and any click suppression built on "did it drag" now eats clicks the user intended. This is the failure that makes drag carousels feel untrustworthy.',
    'Capturing the pointer at the moment of commitment rather than on press. Two bugs at once: the moves that happened during the dead zone are lost, and if the pointer has already ended, `setPointerCapture` throws `NotFoundError` and the drag silently never starts.',
    'No pointer capture. Throw the track quickly and the pointer leaves the element; `pointermove` stops arriving, the track freezes mid-throw with the button still down, and the eventual `pointerup` lands somewhere else entirely, so the gesture never ends.',
    'Handling only `pointerup`. `pointercancel` fires whenever the browser claims the gesture for scrolling or a long-press menu — routine on touch — and `lostpointercapture` fires when the capture is dropped without a release. Miss either and `dragging` stays true forever: the next `pointermove` from an unrelated hover keeps driving the track.',
    'Not guarding against the second end event. `lostpointercapture` always follows a release, so a naive implementation runs its end logic twice per drag — two snap tweens, two velocity readings, and a click-swallow flag set and then cleared.',
    'Ending the drag without re-basing the delta origin at commitment. The first `onDrag` then reports the full dead-zone offset, and the track jumps by the threshold the moment it engages — small, but it is exactly the wrong 8 px because it lands on the frame the user is watching for feedback.',
    'Overwriting `pointerId` when a second finger lands. The first pointer\'s capture is then never released, so the element holds a capture for a pointer that has ended and the next gesture on it behaves unpredictably.',
    'Forgetting `touch-action`. On touch the browser arbitrates the gesture, decides it is a pan, and fires `pointercancel` before the dead zone is even cleared. The drag works perfectly on a desktop and does nothing at all on a phone, which is a hard bug to find without a device.',
    "Setting `touch-action: none` on a horizontal dragger. The element swallows vertical swipes too, so the page cannot be scrolled by dragging anywhere over the carousel — on a phone that is often most of the screen.",
    'Unmounting while the capture is held. The browser keeps routing pointer events to a detached node, and the pointer stays captured until the next `pointerdown` anywhere in the document, so the rest of the page appears to ignore the mouse.',
    'Using cumulative path length instead of straight-line distance for the dead zone. A hand tremor that wobbles back and forth over the same three pixels accumulates past any threshold without the pointer ever leaving the press point, so the click is classified as a drag — the tremor case the dead zone existed to catch.',
    'Calling `preventDefault()` on `pointerdown` to stop text selection. It also prevents focus, so the element can no longer be reached or activated from the keyboard. Setting `user-select: none` costs nothing and breaks nothing.',
  ],

  notes: [
    'Pairs with `capture-phase-click-swallow`: this hook decides whether the gesture moved, that one suppresses the resulting click. They are separate because the swallow has its own edge cases — one click and no more, and keyboard activation must pass through — and because plenty of consumers want the classification without wanting to intercept clicks at all.',
    'Both `distance` and `travel` are reported. `distance` is what the dead zone tests; `travel` is the path integral, and their ratio is a cheap measure of how straight the gesture was, which is useful if you want to distinguish a flick from a scribble.',
    'The returned `cancel()` exists so a host can abort a gesture on Escape, on a route change, or when a modal opens. It runs the same single exit, so the capture is released and `onDragEnd` reports `cancelled: true`.',
    'Momentum, snapping and rubber-banding are deliberately absent. This is the input layer; what the position does after release belongs to whatever integrates the deltas.',
  ],

  apiSignature:
    "function useDragDeadzone(ref: RefObject<HTMLElement | null>, options?: { threshold?: number; touchThreshold?: number; axis?: 'both' | 'x' | 'y'; primaryOnly?: boolean; manageStyles?: boolean; enabled?: boolean; onPress?: (state: DragDeadzoneState) => void; onDragStart?: (state: DragDeadzoneState) => void; onDrag?: (state: DragDeadzoneState) => void; onDragEnd?: (state: DragDeadzoneState, end: { moved: boolean; cancelled: boolean }) => void }): { dragging: RefObject<boolean>; pressed: RefObject<boolean>; distance: RefObject<number>; cancel: () => void }",

  props: [
    { name: 'threshold', type: 'number', default: '8', description: 'Dead-zone radius in pixels for mouse and pen input.' },
    { name: 'touchThreshold', type: 'number', default: '16', description: 'Dead-zone radius for touch, which needs roughly double.' },
    { name: 'axis', type: "'both' | 'x' | 'y'", default: "'both'", description: 'A single axis adds a directional lock and narrows `touch-action` to the other one.' },
    { name: 'primaryOnly', type: 'boolean', default: 'true', description: 'Ignore secondary touches and any mouse button but the left one.' },
    { name: 'manageStyles', type: 'boolean', default: 'true', description: 'Set `touch-action` and `user-select` on the element, restoring inline values on cleanup.' },
    { name: 'enabled', type: 'boolean', default: 'true', description: 'Detach every listener when false. Any live capture is released as it detaches.' },
    { name: 'onPress', type: '(state: DragDeadzoneState) => void', description: 'An accepted `pointerdown`, before any commitment. Kill in-flight settle tweens here.' },
    { name: 'onDragStart', type: '(state: DragDeadzoneState) => void', description: 'The dead zone was cleared. At most once per gesture.' },
    { name: 'onDrag', type: '(state: DragDeadzoneState) => void', description: 'Every move after commitment. `deltaX/deltaY` are re-based to the commit point.' },
    { name: 'onDragEnd', type: '(state: DragDeadzoneState, end: DragEnd) => void', description: 'The single exit. `moved: false` means treat the gesture as a click.' },
  ],

  reducedMotion:
    'Nothing changes, and that is the correct behaviour rather than an omission. Every position this hook reports is one the user is currently holding under their own finger — direct manipulation, one to one, with no animation of its own to shorten or remove, which is why the reduced-motion guidance explicitly exempts it. Reduced motion belongs to whatever happens after release: the settle, the snap, the momentum. Note that the dead zone is deliberately not widened either; a tremor threshold and a motion preference are different user needs and conflating them would degrade dragging for people who never asked for it.',

  cleanup:
    'The cleanup releases the pointer capture first, while `pointerId` still records which pointer holds it, then nulls the gesture state, removes all six listeners (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `lostpointercapture`, `dragstart`), neuters the `cancel()` closure, and restores the element\'s previous inline `touch-action` and `user-select`. There is no timer and no rAF. Under React 19 StrictMode the first effect has fully released its capture before the second attaches.',

  acceptance:
    'Press and release without moving: the row does not shift by even a pixel and the readout says the gesture was a tap. Press, wobble a few pixels inside the dead-zone ring, release: still a tap, and the ring never fills. Push past the ring and the row starts following the pointer from where it committed, with no initial jump. Drag fast off the side of the panel and keep going — the row keeps tracking, because the capture holds. Release outside the panel and the gesture ends there. On a phone, swipe horizontally and the row moves; swipe vertically and the page scrolls while the readout reports a cancelled gesture. Right-click on the row: nothing starts. Drag with a second finger already down: the first gesture keeps control. Unmount mid-drag and the rest of the page still responds to the mouse.',

  criticalRegion: 'critical',
};

export default meta;
