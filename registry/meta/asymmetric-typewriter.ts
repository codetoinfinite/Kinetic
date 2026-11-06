import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'asymmetric-typewriter',
  title: 'Asymmetric Typewriter',
  category: 'text',
  tags: ['typewriter', 'timing', 'caret', 'rotating-text', 'css'],
  blurb:
    'Rotating phrases that delete at twice the speed they type, with a beat of nothing at the empty string.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/asymmetric-typewriter.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A phrase erases itself and a new one is typed in its place, cycling forever. Deleting runs at exactly half the interval of typing, because backspacing is a held key with a mechanical auto-repeat while typing is composition — give both phases the same interval and the result reads as a ticker tape rather than as somebody at a keyboard. A quarter-second pause at the empty string turns the turnaround from a dropped frame into a decision.',

  mechanism: [
    'Timing is a chain of `setTimeout` calls, not a `setInterval`: the four phases (type, hold, delete, empty) each have their own interval, and the boundaries between them are pauses that a fixed interval cannot express without a counter and a modulo.',
    'The state machine is four closures over a `text` local — `type` slices one more character off the target and reschedules at `typeMs`; on reaching full length it schedules `beginErase` at `holdMs`. `erase` slices one character off and reschedules at `deleteMs`; at length zero it schedules `advance` at `emptyMs`. `advance` moves the phrase index modulo the list length and re-enters `type`.',
    'Typing slices the *target* string (`target.slice(0, text.length + 1)`) rather than concatenating a looked-up character. Under `noUncheckedIndexedAccess` an index read is `string | undefined`, and slicing also means the visible text can never desync from the source phrase.',
    'A single `timer` ref holds the one outstanding timeout id, so cleanup is a single `clearTimeout` regardless of which phase was in flight.',
    'The effect is keyed on `phrases.join("\\u0000")` rather than on the array itself. An array prop is a fresh reference every parent render, which would tear the machine down and restart it, pinning the typewriter to its first character forever. NUL is the delimiter because real phrases contain spaces and commas.',
    'The caret is the `step-end-caret` component, driven with `paused={busy}`: while characters are being added or removed the caret holds solid, and it resumes blinking only during the hold and empty beats.',
  ],

  constants: [
    {
      name: 'TYPE_MS',
      value: '70',
      why: 'Milliseconds per character while typing. Around 14 characters a second — brisk human typing. Below ~45ms the reader cannot follow the word forming; above ~110ms the phrase takes longer to appear than anyone will wait for.',
    },
    {
      name: 'DELETE_MS',
      value: '35',
      why: 'Exactly half of `TYPE_MS`. This ratio is the whole component: deleting is a held key on auto-repeat, typing is composition. Equal intervals make both directions read as machine output.',
    },
    {
      name: 'HOLD_MS',
      value: '1500',
      why: 'How long a completed phrase stays up. It has to exceed the time to read four or five words. Under ~900ms the phrase is gone before it has been parsed and the component reads as flickering.',
    },
    {
      name: 'EMPTY_MS',
      value: '250',
      why: 'The beat at zero characters. Without it the string bottoms out and immediately rebounds, which the eye reads as a dropped frame rather than as a turnaround.',
    },
    {
      name: 'START_DELAY_MS',
      value: '1500',
      why: 'Longer than a normal hold, so the first phrase is legible while the rest of the page is still settling. Starting the erase immediately makes the component look like it is correcting a mistake.',
    },
  ],

  pitfalls: [
    'Driving the whole cycle from one `setInterval`. Hold and empty pauses then have to be faked with a frame counter, and every change to a phase length becomes an arithmetic edit rather than a constant.',
    'Depending on the `phrases` array identity in the effect. Every parent render gives a new array, the effect restarts, and the typewriter is stuck showing the first character of the first phrase.',
    'Joining phrases with a comma or a pipe as the effect key. Both occur in real copy, so one phrase silently becomes two.',
    'Letting the element size itself from the current string. It grows and shrinks by tens of pixels several times a second and drags every neighbouring element with it — a transparent copy of the longest phrase reserves the box instead.',
    'Using normal whitespace collapsing. A phrase erased back to "Product " loses its trailing space, so the caret jumps one character left and then right again on the next tick.',
    'Blinking the caret while characters are being typed. Real cursors hold solid during input; a caret blinking mid-word makes the text look like it is being deleted by something else.',
  ],

  notes: [
    'No text-splitting library is involved: the component owns a single string in React state and never mutates the DOM. Adding a split dependency here would buy nothing, since there are no per-character targets to animate.',
    'React state at ~14 updates a second is a deliberate tradeoff. The subtree is one span, and holding the string in state is what keeps the server-rendered first phrase and the client in agreement.',
    'A list of fewer than two phrases renders the first one statically and never starts the machine.',
  ],

  apiSignature:
    'function AsymmetricTypewriter(props: { phrases: string[]; typeMs?: number; deleteMs?: number; holdMs?: number; emptyMs?: number; startDelayMs?: number; caret?: boolean; className?: string }): JSX.Element',

  props: [
    { name: 'phrases', type: 'string[]', description: 'Cycled in order, forever. Index 0 is also the server-rendered string.' },
    { name: 'typeMs', type: 'number', default: '70', description: 'Milliseconds between characters while typing.' },
    { name: 'deleteMs', type: 'number', default: '35', description: 'Milliseconds between characters while deleting.' },
    { name: 'holdMs', type: 'number', default: '1500', description: 'Milliseconds a completed phrase is held.' },
    { name: 'emptyMs', type: 'number', default: '250', description: 'Milliseconds held at the empty string.' },
    { name: 'startDelayMs', type: 'number', default: '1500', description: 'Milliseconds before the very first deletion.' },
    { name: 'caret', type: 'boolean', default: 'true', description: 'Render the blinking caret after the text.' },
    { name: 'className', type: 'string', description: 'Merged onto the outer span via `cn`.' },
  ],

  reducedMotion:
    'The machine never starts. The first phrase is rendered in full and stays — the final text state, immediately, rather than an empty slot or a sped-up cycle. The caret is still rendered but its own reduced-motion rule holds it solid.',

  cleanup:
    'A single `window.clearTimeout(timer.current)` in the effect teardown. Only one timeout is ever outstanding, so no phase can survive unmount and call `setState` on a dead component.',

  acceptance:
    'Watch one full cycle: the phrase erases visibly faster than the next one types — time it and the ratio is 2:1. At the empty string there is a perceptible pause before the next phrase starts. The caret holds solid while characters move and blinks while the phrase is held. Nothing to the right of the component moves at any point during the cycle. With reduced motion enabled the first phrase is present on first paint and never changes.',

  criticalRegion: 'critical',
};

export default meta;
