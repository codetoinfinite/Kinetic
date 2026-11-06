# Build: Composer Panel

The taller composer for agent surfaces. A radius-24 card holds the prompt on top and the controls underneath: a round + that opens the file picker, a permission picker (Auto, Manual, Plan mode, Bypass all), a model menu, an optional mic and send. A 34px grey status tab can hang off the top edge with the branch, the project folder and a 16px context ring. Send is live only when there is text; Enter sends and Shift+Enter breaks the line.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Two-row agent composer: a growing prompt over a toolbar with add, permission mode, model and send, plus a status tab with a context ring.

- Category: form
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The prompt is a one-row `<textarea>`. A layout effect on every draft change sets `height: auto`, reads `scrollHeight`, and writes back `min(scrollHeight, 10 lines × 20px + 20px padding)`. Resetting to auto first lets the field shrink when lines are deleted; past ten lines it stops growing and scrolls.
2. `onKeyDown` sends on Enter unless Shift is held or `nativeEvent.isComposing` is true, so an IME confirming a word never sends half a message. Shift+Enter falls through to the textarea's own newline. The form's submit handler calls the same `send()`.
3. `send()` returns early unless the trimmed draft is non-empty and `disabled` is false. It calls `onSubmit({ text, attachments, model, permission })`, clears the draft and the attachment strip, and puts focus back in the field. The send button is `disabled` by the same check, and the kit `bg-button-primary` utility paints its own grey disabled gradient.
4. The + is a `ComposerAttachButton` from Composer Attachments: a button that clicks a hidden `<input type="file" multiple>`. Picked files become tiles through `attachmentsFromFiles`, each batch prefixed by a counter so the same file picked twice gets a new id. Tiles render in a `ComposerAttachments` strip above the prompt, and their dismiss removes them.
5. The permission and model pickers are kit `Dropdown`s with controlled `isOpen`, opening upward (`top start` and `top end`). Each row is a `DropdownItem` with a label, a one-line description and a check on the current choice; choosing a row sets state and closes the menu. The permission trigger shows its surface only on hover, press or while open, so at rest it reads as a label.
6. `ComposerStatusTab` is a separate element passed through the `status` slot, inset 28px (`mx-7`) with top corners rounded. Its ring is two SVG circles rotated -90°; the arc uses `pathLength={100}` and `strokeDasharray="<pct> 100"`, so the percentage maps straight onto the dash. It is exposed as `role="meter"` with `aria-valuenow`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `MAX_LINES = 10`
  Long enough for a pasted paragraph or a short stack trace without the toolbar leaving the screen; beyond that the field scrolls.
- `LINE_HEIGHT / FIELD_PADDING_Y = 20px / 20px`
  text-body-regular is 14/20, and the textarea carries pt-3.5 + pb-1.5. `scrollHeight` includes padding, so the cap must add it or the tenth line is clipped.
- `status tab = 34px high, 28px inset, composer-panel-tab-background`
  Inset more than the card's 24px radius, so the tab meets the flat part of the top edge and never the curve. The token is neutral-200 in light and half-opacity neutral-700 in dark, so it separates from the card in both themes.
- `card radius = 24px (rounded-3xl)`
  Close to concentric with the round 36px controls in the 8px-padded toolbar (18 + 8 = 26px), so the + and send sit evenly inside the curve. A smaller radius leaves a visible gap at the corners.

## API

```ts
function ComposerPanel(props: { placeholder?: string; status?: ReactNode; models?: ComposerModel[]; defaultModel?: string; defaultPermission?: ComposerPermission; onSubmit?: (message: ComposerPanelMessage) => void; disabled?: boolean; onVoice?: () => void; voiceActive?: boolean; accept?: string; inputRef?: RefObject<HTMLTextAreaElement | null>; className?: string }): JSX.Element
function ComposerStatusTab(props: { branch?: string; project?: string; context?: number; className?: string }): JSX.Element
interface ComposerPanelMessage { text: string; attachments: ComposerAttachment[]; model: ComposerModel; permission: ComposerPermission }
type ComposerPermission = "auto" | "manual" | "plan" | "bypass"
```

- `placeholder: string` — default `"Hi, what do you need today?"`
  Prompt placeholder.
- `status: ReactNode`
  Slot above the card, usually a `ComposerStatusTab`. Omit for the bare card.
- `models: ComposerModel[]` — default `COMPOSER_MODELS`
  Rows of the model menu: `{ id, name, description? }`.
- `defaultModel: string`
  Model id to start on. Defaults to the first model.
- `defaultPermission: ComposerPermission` — default `"auto"`
  Starting permission mode.
- `onSubmit: (message: ComposerPanelMessage) => void`
  Receives the trimmed text, attachments, model and permission. The panel clears itself after.
- `disabled: boolean` — default `false`
  Greys out send while a turn is in flight. Typing stays possible.
- `onVoice: () => void`
  Shows the mic button and is called when it is pressed.
- `voiceActive: boolean` — default `false`
  Pressed state of the mic button.
- `accept: string`
  Forwarded to the file input, e.g. "image/*,.pdf".
- `inputRef: RefObject<HTMLTextAreaElement | null>`
  Reaches the prompt field, e.g. to focus it.
- `context: number`
  `ComposerStatusTab`: context window used, 0-100, drawn as a 16px ring and a percentage.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Grow with the content a line at a time, then cap and scroll. Resetting to
// "auto" first lets the field shrink again when lines are deleted.
useLayoutEffect(() => {
  const el = fieldRef.current;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, MAX_LINES * LINE_HEIGHT + FIELD_PADDING_Y)}px`;
}, [draft, fieldRef]);

const send = () => {
  if (!canSend || !model) return;
  onSubmit?.({ text: draft.trim(), attachments, model, permission });
  setDraft("");
  setAttachments([]);
  fieldRef.current?.focus();
};

// Enter sends; Shift+Enter falls through to the textarea's own newline.
// isComposing keeps an IME's confirming Enter from sending half a word.
const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
  e.preventDefault();
  send();
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The panel holds no timers, listeners or observers. The textarea height is set inline in a layout effect and recomputed on each change; the dropdowns clean up through React Aria.

**Reduced motion.** Hover colours, the chevron flip and the send press scale carry `motion-reduce:transition-none` (and `motion-reduce:active:scale-100`), and the attachment pop-in is behind `motion-safe:`, so states change instantly. The kit dropdown handles its own open animation.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Measuring `scrollHeight` without first setting `height: auto`. The field can then grow but never shrink back after text is deleted.
- Sending on every Enter. During IME composition (Japanese, Chinese, Korean) Enter confirms the candidate; check `isComposing` or the half-typed word is sent.
- Leaving the dropdowns uncontrolled. Kit `DropdownItem` is a plain button and does not close its popover; the panel closes each menu in `onSelect`.
- Painting a background over the disabled send button. `bg-button-primary` already has a disabled gradient; overriding it breaks dark mode. Only the icon colour changes.

## Notes

- Attachments live inside the panel and are handed to `onSubmit`, then cleared. Nothing is uploaded; only names and sizes are read from the picked files.
- The mic button appears only when `onVoice` is passed. The panel does no speech recognition; `voiceActive` only sets its pressed look.
- The demo lists what was sent with the model and permission each message went out with, and moves the context ring up by 6% per turn.

## Definition of done

A status tab with branch, folder and a context ring sits on top of a white card. Send stays grey until text is typed. Typing several lines grows the field; Shift+Enter adds a line and Enter sends. The demo lists the sent message with its model and permission mode and the ring moves up. The permission picker lists four modes with descriptions and a check, the model menu switches the label, and + opens the browser file picker.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
