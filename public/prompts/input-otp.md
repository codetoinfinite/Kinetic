# Build: Input OTP

A verification-code field that looks like six boxes but holds one digit string. Every box is a real `<input>` with `autoComplete="one-time-code"`, and all edits go through one `writeFrom` function, so typing, pasting and OS autofill all write digits from the current box onward and move focus to the next empty one. It has no dependency beyond React and works controlled or uncontrolled.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

One-time-code field: a monospace box per digit that advances on type, steps back on Backspace, spreads a paste and accepts OS autofill.

- Category: form
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. The value is a single string of digits. `code` is the controlled `value` (or internal state seeded from `defaultValue`) with every non-digit removed (`/\D/g`) and cut to `length`. Box `i` shows `code[i]`, or an empty string.
2. `writeFrom(index, digits)` strips non-digits, pads `code` to `length` with spaces, overwrites positions from `index` onward, and passes the result to `commit`, then calls `focusBox(index + digits.length)`. `focusBox` clamps the index to the last box, focuses it and selects its content, so the next keystroke replaces rather than appends.
3. `commit` strips non-digits again, sets internal state when uncontrolled, calls `onChange`, and calls `onComplete` whenever the result has `length` digits. Each box's `onChange` calls `writeFrom(index, event.target.value)`. `maxLength` is `length`, not 1, so when iOS or Chrome autofill drops the whole code into one box, all of it is distributed instead of five digits being lost.
4. `onKeyDown` handles Backspace itself (`preventDefault`): on a filled box it clears that position and keeps focus; on an empty box it clears the previous position and moves focus back. ArrowLeft and ArrowRight move focus without editing. `onPaste` prevents the default and sends the clipboard text to `writeFrom` from the box with the caret. `onFocus` selects the box content.
5. The wrapper is `role="group"` with the `aria-label` (default "One-time code") and `dir="ltr"`, so digits run left to right even in an RTL page. Each input has `aria-label="Digit i of n"`, `type="text"` with `inputMode="numeric"`, and `aria-invalid` when `isInvalid`. `groupEvery` adds `ms-3` before every nth box to split the code, for example into 3 + 3.
6. Each box is `size-12 rounded-2lg` with `font-mono text-title-3-medium tabular-nums`, a 1px `border-border-button-default` and `shadow-xs`. Hover darkens the border; `focus-visible` draws the focus border and a 2px ring; `isInvalid` sets a red border and tint; `isDisabled` greys it out. These changes transition over 150ms.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `length = 6 (default)`
  The common length for email and SMS codes, and the default the `aria-label`s count against ("Digit 1 of 6").
- `maxLength = length (not 1)`
  OS autofill writes the whole code into the focused box. With `maxLength={1}` the browser would keep only the first digit.
- `box = size-12 (48px), rounded-2lg, font-mono text-title-3-medium tabular-nums`
  Monospace digits keep a row of fixed boxes optically even; in a proportional face a 1 is visibly narrower than an 8.
- `group gap = gap-2 between boxes, extra ms-3 at each groupEvery boundary`
  An 8px gap keeps the boxes separate; the extra 12px reads as a break, so 000 000 is easier to copy from a phone.

## API

```ts
function InputOtp(props: { length?: number; value?: string; defaultValue?: string; onChange?: (value: string) => void; onComplete?: (value: string) => void; isDisabled?: boolean; isInvalid?: boolean; groupEvery?: number; "aria-label"?: string; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element
```

- `length: number` — default `6`
  Number of digit boxes.
- `value / defaultValue: string`
  Controlled or uncontrolled digits. Non-digits are dropped and the string is cut to `length`.
- `onChange: (value: string) => void`
  Called with the new digit string on every edit.
- `onComplete: (value: string) => void`
  Called after any edit that leaves every box filled, so editing a digit of a full code calls it again.
- `groupEvery: number`
  Adds a wider gap before every nth box, for example 3.
- `isInvalid: boolean` — default `false`
  Red border and tint, `aria-invalid` on every box.
- `isDisabled: boolean` — default `false`
  Disables every box.
- `aria-label: string` — default `"One-time code"`
  Name of the group.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const commit = (next: string) => {
  const clean = next.replace(DIGITS_ONLY, "").slice(0, length);
  if (!controlled) setInternal(clean);
  onChange?.(clean);
  if (clean.length === length) onComplete?.(clean);
};

const focusBox = (index: number) => {
  const target = inputsRef.current[Math.max(0, Math.min(index, length - 1))];
  target?.focus();
  target?.select();
};

/** Writes `digits` starting at `index`, which covers typing and autofill. */
const writeFrom = (index: number, digits: string) => {
  const clean = digits.replace(DIGITS_ONLY, "");
  if (clean === "") return;

  const chars = code.padEnd(length, " ").split("");
  for (let offset = 0; offset < clean.length && index + offset < length; offset += 1) {
    chars[index + offset] = clean.charAt(offset);
  }
  commit(chars.join("").trimEnd());
  focusBox(index + clean.length);
};

const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
  if (event.key === "Backspace") {
    event.preventDefault();
    if (code[index]) {
      // Clear in place; the caret only steps back on an already-empty box,
      // which is what makes holding Backspace feel right.
      const chars = code.padEnd(length, " ").split("");
      chars[index] = " ";
      commit(chars.join("").trimEnd());
      return;
    }
    const chars = code.padEnd(length, " ").split("");
    chars[Math.max(0, index - 1)] = " ";
    commit(chars.join("").trimEnd());
    focusBox(index - 1);
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    focusBox(index - 1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    focusBox(index + 1);
  }
};

const onPaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
  event.preventDefault();
  writeFrom(index, event.clipboardData.getData("text"));
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component keeps a ref array of inputs and at most one piece of state; it sets no timers or listeners outside React's own handlers.

**Reduced motion.** The component does not check `prefers-reduced-motion`. Its only motion is the 150ms border, background and shadow transition on each box, which a global rule that removes transitions makes instant.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not use `type="number"` for the boxes. It adds spinners, accepts `e` and `-`, and reports an empty value for input it considers malformed. Use `type="text"` with `inputMode="numeric"`.
- Do not set `maxLength={1}`. Autofill hands the full code to one box and the browser would drop the rest.
- Do not put `aria-invalid` on the `role="group"` wrapper. The group role does not support it; each input carries its own.
- Do not remove `dir="ltr"` from the wrapper. In an RTL page the code would otherwise read right to left.

## Notes

- The value is stored as a compact digit string, so clearing a box in the middle of a full code shifts the digits after it one place left.
- Arrow keys are not mirrored; the wrapper is always left to right.

## Definition of done

Six empty boxes sit in a row. Typing 7 fills the first box and moves focus to the second. Pasting "731428" into the first box fills all six and calls `onComplete`. Backspace on a filled box clears it and keeps focus; Backspace on an empty box clears the previous one and moves back. Arrow keys move between boxes without changing anything. Letters are ignored. With `groupEvery={3}` a wider gap separates 3 + 3. `isInvalid` turns every box red.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
