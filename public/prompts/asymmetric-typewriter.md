# Build: Asymmetric Typewriter

A phrase erases itself and a new one is typed in its place, cycling forever. Deleting runs at exactly half the interval of typing, because backspacing is a held key with a mechanical auto-repeat while typing is composition — give both phases the same interval and the result reads as a ticker tape rather than as somebody at a keyboard. A quarter-second pause at the empty string turns the turnaround from a dropped frame into a decision.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Rotating phrases that delete at twice the speed they type, with a beat of nothing at the empty string.

- Category: text
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. Timing is a chain of `setTimeout` calls, not a `setInterval`: the four phases (type, hold, delete, empty) each have their own interval, and the boundaries between them are pauses that a fixed interval cannot express without a counter and a modulo.
2. The state machine is four closures over a `text` local — `type` slices one more character off the target and reschedules at `typeMs`; on reaching full length it schedules `beginErase` at `holdMs`. `erase` slices one character off and reschedules at `deleteMs`; at length zero it schedules `advance` at `emptyMs`. `advance` moves the phrase index modulo the list length and re-enters `type`.
3. Typing slices the *target* string (`target.slice(0, text.length + 1)`) rather than concatenating a looked-up character. Under `noUncheckedIndexedAccess` an index read is `string | undefined`, and slicing also means the visible text can never desync from the source phrase.
4. A single `timer` ref holds the one outstanding timeout id, so cleanup is a single `clearTimeout` regardless of which phase was in flight.
5. The effect is keyed on `phrases.join("\u0000")` rather than on the array itself. An array prop is a fresh reference every parent render, which would tear the machine down and restart it, pinning the typewriter to its first character forever. NUL is the delimiter because real phrases contain spaces and commas.
6. The caret is the `step-end-caret` component, driven with `paused={busy}`: while characters are being added or removed the caret holds solid, and it resumes blinking only during the hold and empty beats.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `TYPE_MS = 70`
  Milliseconds per character while typing. Around 14 characters a second — brisk human typing. Below ~45ms the reader cannot follow the word forming; above ~110ms the phrase takes longer to appear than anyone will wait for.
- `DELETE_MS = 35`
  Exactly half of `TYPE_MS`. This ratio is the whole component: deleting is a held key on auto-repeat, typing is composition. Equal intervals make both directions read as machine output.
- `HOLD_MS = 1500`
  How long a completed phrase stays up. It has to exceed the time to read four or five words. Under ~900ms the phrase is gone before it has been parsed and the component reads as flickering.
- `EMPTY_MS = 250`
  The beat at zero characters. Without it the string bottoms out and immediately rebounds, which the eye reads as a dropped frame rather than as a turnaround.
- `START_DELAY_MS = 1500`
  Longer than a normal hold, so the first phrase is legible while the rest of the page is still settling. Starting the erase immediately makes the component look like it is correcting a mistake.

## API

```ts
function AsymmetricTypewriter(props: { phrases: string[]; typeMs?: number; deleteMs?: number; holdMs?: number; emptyMs?: number; startDelayMs?: number; caret?: boolean; className?: string }): JSX.Element
```

- `phrases: string[]`
  Cycled in order, forever. Index 0 is also the server-rendered string.
- `typeMs: number` — default `70`
  Milliseconds between characters while typing.
- `deleteMs: number` — default `35`
  Milliseconds between characters while deleting.
- `holdMs: number` — default `1500`
  Milliseconds a completed phrase is held.
- `emptyMs: number` — default `250`
  Milliseconds held at the empty string.
- `startDelayMs: number` — default `1500`
  Milliseconds before the very first deletion.
- `caret: boolean` — default `true`
  Render the blinking caret after the text.
- `className: string`
  Merged onto the outer span via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const TYPE_MS = 70;
const DELETE_MS = 35;
const HOLD_MS = 1500;
const EMPTY_MS = 250;
const START_DELAY_MS = 1500;

export function AsymmetricTypewriter({
  phrases,
  typeMs = TYPE_MS,
  deleteMs = DELETE_MS,
  holdMs = HOLD_MS,
  emptyMs = EMPTY_MS,
  startDelayMs = START_DELAY_MS,
  caret = true,
  className,
}: AsymmetricTypewriterProps) {
  const reduced = useReducedMotion();

  // An array prop is a fresh reference on every parent render. Keying on the
  // joined string is what stops the effect tearing down and restarting each
  // time — which would pin the typewriter to its first character forever.
  // NUL is the delimiter because real phrases contain spaces and commas, and
  // a separator that occurs in the data silently splits one phrase into two.
  const key = phrases.join('\u0000');
  const list = useMemo(() => key.split('\u0000'), [key]);

  const [shown, setShown] = useState(() => list[0] ?? '');
  const [busy, setBusy] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    const first = list[0] ?? '';
    if (reduced || list.length < 2) {
      setShown(first);
      setBusy(false);
      return;
    }

    let index = 0;
    let text = first;
    setShown(text);

    const at = (fn: () => void, ms: number) => {
      timer.current = window.setTimeout(fn, ms);
    };

    const erase = () => {
      if (text.length === 0) {
        // The beat. Caret goes back to blinking because nothing is happening.
        setBusy(false);
        at(advance, emptyMs);
        return;
      }
      text = text.slice(0, -1);
      setShown(text);
      at(erase, deleteMs);
    };

    const advance = () => {
      index = (index + 1) % list.length;
      setBusy(true);
      at(type, typeMs);
    };

    const type = () => {
      const target = list[index] ?? '';
      if (text.length >= target.length) {
        setBusy(false);
        at(beginErase, holdMs);
        return;
      }
      // Slice the target rather than concatenating a looked-up character:
      // `target[i]` is `string | undefined` and the slice cannot desync from
      // the source string if the phrase list changes underneath.
      text = target.slice(0, text.length + 1);
      setShown(text);
      at(type, typeMs);
    };

    const beginErase = () => {
      setBusy(true);
      erase();
    };

    at(beginErase, startDelayMs);

    return () => {
      window.clearTimeout(timer.current);
    };
  }, [list, reduced, typeMs, deleteMs, holdMs, emptyMs, startDelayMs]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** A single `window.clearTimeout(timer.current)` in the effect teardown. Only one timeout is ever outstanding, so no phase can survive unmount and call `setState` on a dead component.

**Reduced motion.** The machine never starts. The first phrase is rendered in full and stays — the final text state, immediately, rather than an empty slot or a sped-up cycle. The caret is still rendered but its own reduced-motion rule holds it solid.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Driving the whole cycle from one `setInterval`. Hold and empty pauses then have to be faked with a frame counter, and every change to a phase length becomes an arithmetic edit rather than a constant.
- Depending on the `phrases` array identity in the effect. Every parent render gives a new array, the effect restarts, and the typewriter is stuck showing the first character of the first phrase.
- Joining phrases with a comma or a pipe as the effect key. Both occur in real copy, so one phrase silently becomes two.
- Letting the element size itself from the current string. It grows and shrinks by tens of pixels several times a second and drags every neighbouring element with it — a transparent copy of the longest phrase reserves the box instead.
- Using normal whitespace collapsing. A phrase erased back to "Product " loses its trailing space, so the caret jumps one character left and then right again on the next tick.
- Blinking the caret while characters are being typed. Real cursors hold solid during input; a caret blinking mid-word makes the text look like it is being deleted by something else.

## Notes

- No text-splitting library is involved: the component owns a single string in React state and never mutates the DOM. Adding a split dependency here would buy nothing, since there are no per-character targets to animate.
- React state at ~14 updates a second is a deliberate tradeoff. The subtree is one span, and holding the string in state is what keeps the server-rendered first phrase and the client in agreement.
- A list of fewer than two phrases renders the first one statically and never starts the machine.

## Definition of done

Watch one full cycle: the phrase erases visibly faster than the next one types — time it and the ratio is 2:1. At the empty string there is a perceptible pause before the next phrase starts. The caret holds solid while characters move and blinks while the phrase is held. Nothing to the right of the component moves at any point during the cycle. With reduced motion enabled the first phrase is present on first paint and never changes.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
