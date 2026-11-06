# Build: Composer Footer

The row under a composer prompt. On the left are a paperclip that opens the file picker, icon toggles for tools such as web search, and a slot for a model picker. A keyboard hint fills the middle, and on the right one round button sends, then turns into stop while a reply is generating, with an accent arc spinning around it. The footer owns no text field; the host passes `canSend`, `generating` and the two callbacks.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Bottom bar of a chat composer: attach, tool toggles, a model slot and a key hint, with a send button that becomes stop while replying.

- Category: form
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. `SendStopButton` is a single React Aria `Button`. While `generating` it is labelled "Stop generating" and calls `onStop`; otherwise it is labelled "Send", calls `onSend`, and is disabled until `canSend` is true. Keeping one element means focus and the pointer stay put when the job flips.
2. The arrow and the stop square share one grid cell (`[grid-area:1/1]`). The one not in use goes to `scale-50 opacity-0 blur-[2px]` and the other to full size, over a 200ms transition, so the icons cross-fade instead of jumping.
3. An SVG circle sits 4px outside the button. Its arc is `strokeDasharray="28 100"` on `pathLength={100}`, and while generating the SVG fades in and gets `motion-safe:animate-spin`. A visually hidden `role="status"` span says "Generating a reply" for screen readers.
4. Tools are React Aria `ToggleButton`s, so each one exposes `aria-pressed`. The set of active ids is controlled through `activeTools` / `onToolsChange`, or kept in local state seeded from `defaultActiveTools`. Pressed tools take the `status-blue` background and text tokens.
5. The paperclip is a React Aria `Button` that clicks a hidden `<input type="file" multiple>`. Picked files go to `onAttach` as `File[]`, and the input is cleared so the same file can be picked again. Nothing is read or uploaded.
6. The root is a container (`@container`). The hint paragraph carries `@max-[34rem]:hidden`, so in a narrow composer it disappears before the buttons have to shrink. The model slot is `min-w-0 shrink`, so a long model name truncates instead of pushing send off the edge.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `send button = 36px, arc ring 44px`
  The ring sits 4px outside the button, which leaves a visible gap. The arc covers 28% of the circle, enough to read as spinning without looking like a progress bar.
- `hint breakpoint = container width 34rem`
  Below this, the hint would truncate into fragments like "Enter to se…". Hiding it entirely keeps the controls intact at phone widths.
- `tooltip delay = 300ms`
  The kit tooltip defaults to no delay. In a row of five icon buttons, that makes tooltips flash while the pointer is moving across to send.

## API

```ts
function ComposerFooter(props: { onAttach?: (files: File[]) => void; accept?: string; tools?: ComposerTool[]; activeTools?: string[]; defaultActiveTools?: string[]; onToolsChange?: (ids: string[]) => void; model?: ReactNode; hint?: ReactNode; canSend?: boolean; generating?: boolean; onSend?: () => void; onStop?: () => void; className?: string }): JSX.Element
interface ComposerTool { id: string; label: string; icon: RemixiconComponentType }
```

- `onAttach: (files: File[]) => void`
  Shows the paperclip and receives picked files.
- `accept: string`
  Forwarded to the file input.
- `tools: ComposerTool[]` — default `COMPOSER_TOOLS`
  Icon toggles after the paperclip. Pass `[]` to hide them.
- `activeTools: string[]`
  Controlled ids of switched-on tools.
- `defaultActiveTools: string[]` — default `[]`
  Starting ids when uncontrolled.
- `onToolsChange: (ids: string[]) => void`
  Called with the new set after a toggle.
- `model: ReactNode`
  Slot after a divider, usually a ghost `ModelSelect`.
- `hint: ReactNode`
  Overrides the default hint ("Enter to send…" or "Writing a reply…").
- `canSend: boolean` — default `false`
  Enables send when not generating.
- `generating: boolean` — default `false`
  Turns send into stop and spins the ring.
- `onSend: () => void`
  Called when send is pressed.
- `onStop: () => void`
  Called when stop is pressed. Without it the stop button is disabled.
- `className: string`
  Classes for the footer row.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
function SendStopButton({
  generating,
  canSend,
  onSend,
  onStop,
}: Pick<ComposerFooterProps, "generating" | "canSend" | "onSend" | "onStop">) {
  // One button, two jobs. While generating it is always pressable and stops;
  // otherwise it sends and is disabled until there is something to send.
  const isDisabled = generating ? !onStop : !canSend;
  const swap = "[grid-area:1/1] transition-[opacity,scale,filter] duration-200 ease-out motion-reduce:transition-none";
  const shown = "scale-100 opacity-100 blur-none";
  const hidden = "scale-50 opacity-0 blur-[2px]";

  return (
    <span className="relative grid shrink-0 place-items-center">
      <svg
        aria-hidden
        viewBox="0 0 44 44"
        className={cx(
          "pointer-events-none absolute -inset-1 size-11 text-accent-500 transition-opacity duration-200 ease-out motion-reduce:transition-none",
          generating ? "opacity-100 motion-safe:animate-spin" : "opacity-0",
        )}
      >
        <circle cx="22" cy="22" r="20.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" pathLength={100} strokeDasharray="28 100" />
      </svg>
      <AriaButton
        aria-label={generating ? "Stop generating" : "Send"}
        isDisabled={isDisabled}
        onPress={() => (generating ? onStop?.() : onSend?.())}
        className={cx(
          "grid size-9 cursor-pointer place-items-center rounded-full bg-button-primary text-text-white shadow-xs outline-none",
          "transition-[scale] duration-150 ease-out data-[pressed]:scale-95 motion-reduce:transition-none motion-reduce:data-[pressed]:scale-100",
          "data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring data-[focus-visible]:ring-offset-2",
          "disabled:cursor-not-allowed disabled:text-button-primary-disabled-foreground",
        )}
      >
        <RiArrowUpLine aria-hidden className={cx("size-[18px]", swap, generating ? hidden : shown)} />
        <RiStopFill aria-hidden className={cx("size-3.5", swap, generating ? shown : hidden)} />
      </AriaButton>
    </span>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The footer has no timers or listeners of its own; React Aria owns the press, toggle and tooltip handlers. The demo clears its streaming interval on completion, on stop and on unmount.

**Reduced motion.** The ring keeps its arc but does not spin (`motion-safe:animate-spin`). The icon cross-fade, the ring fade and the press scale use `motion-reduce:transition-none` and `motion-reduce:data-[pressed]:scale-100`, so states switch instantly. Tooltips follow the kit's own reduced-motion rule.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Rendering separate send and stop buttons. Swapping them unmounts the focused button, so keyboard focus drops to the page body mid-reply.
- Disabling the button while generating. Stop must stay pressable, so the disabled check only applies when not generating.
- Expecting the footer to send on Enter. It has no text field. The default hint describes the usual wiring, which the host does in its textarea's `onKeyDown`; pass `hint` if your keys differ.

## Notes

- The demo streams a canned reply one word every 55ms from an interval that is cleared on completion, on stop and on unmount. Escape in the prompt also stops it.
- The model slot accepts any node. The demo passes a ghost `ModelSelect`, and attachments render above the prompt with `ComposerAttachments`. Below a 26rem container the demo hides the model name (`@max-[26rem]:[&_[data-model-name]]:sr-only`) so only the monogram shows, and the footer tightens its gap from 4px to 2px.
- The tool list is sample data: Search the web, Run code and Think longer. Pass `tools` with your own `{ id, label, icon }` entries.

## Definition of done

Send stays disabled until text is typed. Sending clears the prompt, the button turns into a stop square inside a spinning accent arc, and the reply streams in. Pressing stop, or Escape in the prompt, ends it and marks it Stopped. Letting it finish turns the button back into send. Tool toggles report pressed state, the paperclip opens the file picker, and the hint is hidden in narrow composers.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
