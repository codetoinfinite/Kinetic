import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'capture-phase-click-swallow',
  title: 'Capture-Phase Click Swallow',
  category: 'primitive',
  tags: ['click', 'capture-phase', 'drag', 'stoppropagation', 'keyboard', 'input'],
  blurb: 'Cancels the single click a finished drag would fire, in the capture phase, without eating the next real click or keyboard activation.',
  cost: 'dom',
  motif: 'stack',

  files: [
    { path: 'registry/ui/capture-phase-click-swallow.tsx', type: 'registry:ui', role: 'hook' },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'Throw a drag carousel and let go over a card, and the browser dispatches a `click` on it — `mousedown` and `mouseup` landed in the same subtree, so that is exactly what the spec asks for. The result is that flinging the track navigates somewhere. One listener on the drag surface in the capture phase, which runs before any descendant handler, calls `stopPropagation` and `preventDefault` and the click is gone. The work is in the two edges: it has to swallow exactly one, and it has to let keyboard activation through, because Enter and Space fire a click with no pointer sequence behind it.',

  mechanism: [
    'The listener is registered with `addEventListener(\'click\', handler, true)` on the drag surface. The third argument is the technique: capture runs root-down, so this handler sees the click before the card\'s own `onClick` and before a router\'s link interception. In the bubble phase the navigation has already happened.',
    'It calls both `stopPropagation()` and `preventDefault()`. They do different jobs and neither covers the other: propagation stops listeners deeper in the path, while the default action — following an `<a href>`, submitting a form, toggling a `<label>` — is not a listener and is only cancelled by `preventDefault`. A swallow with only `stopPropagation` still navigates.',
    '`arm()` is called by the gesture when it ends *having moved*, which `drag-deadzone-capture` reports as `onDragEnd(state, { moved })`. Arming on a stationary press is how the click a user actually meant gets eaten.',
    'The arm is consumed inside the handler before the event is cancelled, so exactly one click is swallowed. A flag that stays set is the bug this replaces: the drag is suppressed, and so is the deliberate click that follows it.',
    'Two independent stand-downs cover the drag that produces no click at all — one that ends over empty space, or that the browser cancelled. A `pointerdown` on the surface disarms, because a fresh press means the awaited click never came; and a 250 ms timer disarms as a backstop, since the click that follows a `pointerup` is dispatched in the same turn and anything later is not it.',
    '`event.detail` is the keyboard test. For a pointer click it is the click count, 1 or more; for Enter, Space, and `element.click()` it is 0. Those return early and pass through untouched, so the widget stays operable from the keyboard.',
  ],

  constants: [
    {
      name: 'TIMEOUT_MS',
      value: '250',
      why: 'How long an arm survives with no click. The click after a `pointerup` arrives in the same turn, so one frame would do for a mouse; the margin is for the delayed synthetic click some touch browsers still emit. The ceiling is the time a person needs to press and release again — go much past ~400 ms and the arm can outlive its own gesture and reach into the next one, which is exactly the bug the expiry exists to prevent.',
    },
    {
      name: 'event.detail threshold',
      value: '0',
      why: 'Not a tuned number but a specified one: `UIEvent.detail` is the click count for a pointer-driven click and exactly 0 for a keyboard-driven or scripted one. Testing `detail === 0` is the only cross-browser tell available on the click event itself — `pointerId === -1` is only present where `click` is a `PointerEvent`, and the `screenX === 0 && screenY === 0` heuristic misfires on a genuine click in the top-left corner of the screen.',
    },
  ],

  pitfalls: [
    'Registering in the bubble phase. The card\'s own `onClick` runs first and the link has already navigated by the time the handler sees the event — the listener is correct and completely useless. The third argument to `addEventListener` is the whole fix.',
    'Calling `stopPropagation()` without `preventDefault()`. Every JavaScript handler is silenced and the `<a href>` still navigates, because following a link is a default action rather than a listener. The failure is confusing precisely because the swallow visibly "works" on buttons and does nothing on links.',
    'Leaving the flag set after the swallow. It eats the click after the drag as well, so the user drags, then clicks a card deliberately, and nothing happens. Consuming it inside the handler is one line and is the difference between a fix and a new bug.',
    'Setting the flag with no expiry at all. A drag that ends over empty space never produces a click, so the arm just sits there — and swallows a genuine click a minute later, at which point nobody will connect the two events.',
    'Swallowing keyboard activation. Enter and Space on a focused card dispatch a click with `detail === 0`, and if the flag happens to be armed the widget silently stops responding to the keyboard. It never shows up in testing because a carousel is tested by dragging it.',
    'Arming on every gesture instead of only on ones that moved. Without a dead zone upstream reporting `moved`, a two-pixel wobble during a click arms the swallow and the click is cancelled — the exact behaviour that makes drag carousels feel unreliable.',
    'Assuming the click lands on the element the pointer is over. Click targets the nearest common ancestor of the `mousedown` and `mouseup` targets, and while a pointer is captured the compatibility mouse events are retargeted to the capturing element. Scoping the listener to the drag surface is what makes it see the click at all.',
    'Reaching for `stopImmediatePropagation()` by default. It also silences capture-phase listeners registered earlier on the same node, which can include analytics or a focus manager that had nothing to do with the drag. Escalate to it only when a library has attached its own capture listener to the same element.',
    'Leaving the timer running at unmount. It fires against a ref nothing reads, and on remount the widget can start life armed and swallow the first click a user makes.',
  ],

  notes: [
    'Designed to pair with `drag-deadzone-capture`: that hook decides whether the gesture moved, this one suppresses the consequence. They are separate because the classification is useful on its own, and because the swallow has edge cases — one click and no more, keyboard passes through — that have nothing to do with dragging.',
    'A component that activates on `pointerup` rather than on `click` cannot be helped by this; there is no click to cancel. That is a good argument for activating on `click` in a draggable surface, since `click` is also what the keyboard produces.',
    '`preventDefault` on the click does not undo focus. Focus was moved by `mousedown`, earlier in the sequence, so a swallowed drag can leave the card under the pointer focused. It is invisible in practice because focus from a pointer does not match `:focus-visible`.',
    'A `dblclick` is dispatched independently of the clicks that preceded it, so a component listening for double-click needs the same treatment applied to `dblclick`.',
  ],

  apiSignature:
    'function useClickSwallow(ref: RefObject<HTMLElement | null>, options?: { timeoutMs?: number; enabled?: boolean; onSwallow?: (event: MouseEvent) => void }): { arm: () => void; disarm: () => void; armed: RefObject<boolean>; swallowed: RefObject<number> }',

  props: [
    { name: 'timeoutMs', type: 'number', default: '250', description: 'How long an arm survives with no click arriving. Backstop for a drag that ends over nothing clickable.' },
    { name: 'enabled', type: 'boolean', default: 'true', description: 'Detach the listeners and stand down when false.' },
    { name: 'onSwallow', type: '(event: MouseEvent) => void', description: 'The click that was cancelled. Already stopped and prevented by the time this runs.' },
  ],

  reducedMotion:
    'Nothing changes, and the omission is deliberate rather than an oversight: this hook cancels an event, it does not animate anything, and there is no duration, distance, or easing in it to reduce. Behaviour identical under `prefers-reduced-motion: reduce`. Note that the keyboard path is unconditional for the same reason it matters here — the pass-through for `detail === 0` is an accessibility guarantee, not a motion setting, and it is not something a preference should be able to switch off.',

  cleanup:
    'The effect removes the capture-phase `click` listener with the same capture flag it was added with — passing `true` on the way out is required, since a listener added with capture is a different registration from one added without — removes the `pointerdown` listener, and calls `disarm()`, which clears the pending timeout and resets the flag so a remount does not start armed. No rAF, no pointer capture, nothing else held.',

  acceptance:
    'Click a card: it opens, and the on-screen counter shows one activation and no swallow. Drag the row and release over a card: the row moves, the card does not open, and the swallow counter goes up by exactly one. Immediately click that same card: it opens — the swallow was consumed by the drag and did not carry over. Drag and release over the gap between cards, then click a card: it opens, because the arm expired instead of waiting for a click that never came. Tab to a card and press Enter, then Space: it opens both times, including immediately after a drag, and the swallow counter does not move. Put a real `<a href>` in the row and drag onto it: the page does not navigate.',

  criticalRegion: 'critical',
};

export default meta;
