# Build: Image Prompt Composer

The prompt box at the foot of an image-generation chat. A white card on a grey tray stacks a row of style chips, a prompt that grows with its text, an aspect-ratio select with a proportional glyph, an image-count stepper and a Generate button; the tray's footer reads back the output size or what is missing. Submitting hands a typed request to `onGenerate`, and while `isGenerating` is set the whole form locks, Generate becomes Stop and the footer shimmers.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

The request form of an image model: style chips, an auto-growing prompt, ratio select, count stepper and a Generate that turns into Stop.

- Category: form
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. The style chips are a React Aria `ToggleButtonGroup` in `multiple` mode, so they share one tab stop, move with the arrow keys and expose `aria-pressed`. Each chip shows a two-tone swatch, swapped for a check while selected, and the selected chips take the status-blue tokens. The request lists styles in option order, not click order.
2. The prompt is the kit `Textarea` with `autoResize` from 2 to 6 rows. Its own field shell is made transparent and borderless, and the card shows focus instead through `has-[textarea:focus]:ring-border-button-hover`, so the whole card reads as one input. A `keydown` handler on the field submits on ⌘ / Ctrl + Enter through `form.requestSubmit()`, so the same `onSubmit` runs as for a click; a plain Enter stays a new line.
3. The ratio select is the kit `Select` at `sm` size. Every option draws a glyph whose box is the ratio scaled to 14px on its long side, and the trigger shows only the glyph and the ratio id. The count is the kit `NumberField` with steppers, clamped to `1…maxImages`, and a cleared field falls back to 1.
4. Generate is a submit button that uses `aria-disabled` while the prompt is blank, so it stays focusable and the footer explains why ("Write a prompt to generate"). The submit handler trims the prompt and returns early unless the form can generate.
5. With `isGenerating`, the chips, select and stepper get `isDisabled`, the prompt becomes read-only, the form sets `aria-busy`, and the Generate button becomes a secondary Stop button. It stays the same submit button, so focus does not jump, and `onSubmit` calls `onStop` instead of `onGenerate` while a run is on. The footer is a polite live region whose text switches to "Generating N images · ratio" with the kit's `agent-progress-loading-text` shimmer.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `tray and card = tray radius 26px with 6px padding, card radius 20px, 12px padding and 12px gaps`
  The 6px tray reads as a frame around the card, and the inner radius is the outer one minus the padding, so the two curves stay concentric.
- `prompt rows = auto-resize from 2 to 6 lines, 600 characters`
  Two lines invite a sentence rather than a keyword. Six lines is where the toolbar would leave a laptop viewport, so the field scrolls from there.
- `aspect ratios = 1:1 1024², 4:5 896×1120, 3:2 1216×832, 16:9 1344×768, 9:16 768×1344`
  Common output sizes of current diffusion models, each about one megapixel and divisible by 64, so every ratio costs roughly the same to render.
- `image count = 1 to 4 (maxImages)`
  Four is a full row of thumbnails under the message. More belongs to a batch tool, not a chat.

## API

```ts
function ImagePromptComposer(props: ImagePromptComposerProps): JSX.Element
interface ImagePromptComposerProps { defaultPrompt?: string; placeholder?: string; aspectRatios?: readonly AspectRatioOption[]; defaultAspectRatio?: string; styleOptions?: readonly StyleOption[]; defaultStyles?: Iterable<string>; defaultCount?: number; maxImages?: number; maxLength?: number; isGenerating?: boolean; onGenerate?: (request: ImagePromptRequest) => void; onStop?: () => void; className?: string }
interface ImagePromptRequest { prompt: string; aspectRatio: AspectRatioOption; count: number; styles: string[] }
interface AspectRatioOption { id: string; label: string; width: number; height: number }
interface StyleOption { id: string; label: string; swatch: readonly [string, string] }
```

- `defaultPrompt: string` — default `""`
  Initial prompt text.
- `placeholder: string` — default `"Describe the image you want…"`
  Prompt placeholder; also the field's hint.
- `aspectRatios: readonly AspectRatioOption[]` — default `ASPECT_RATIOS`
  Ratio options with their output size.
- `defaultAspectRatio: string`
  Id of the starting ratio; the first option when omitted.
- `styleOptions: readonly StyleOption[]` — default `IMAGE_STYLES`
  Style chips with a two-colour swatch each.
- `defaultStyles: Iterable<string>`
  Style ids selected at first.
- `defaultCount: number` — default `1`
  Starting image count.
- `maxImages: number` — default `4`
  Upper bound of the count stepper.
- `maxLength: number` — default `600`
  Character limit on the prompt.
- `isGenerating: boolean` — default `false`
  Locks the form, swaps Generate for Stop and shimmers the footer.
- `onGenerate: (request: ImagePromptRequest) => void`
  Called on submit with the trimmed prompt, ratio, count and styles.
- `onStop: () => void`
  Called when the button is pressed during a run (it reads Stop then).
- `className: string`
  Merged onto the tray.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ImagePromptComposer({
  defaultPrompt = "",
  placeholder = "Describe the image you want…",
  aspectRatios = ASPECT_RATIOS,
  defaultAspectRatio,
  styleOptions = IMAGE_STYLES,
  defaultStyles,
  defaultCount = 1,
  maxImages = 4,
  maxLength = 600,
  isGenerating = false,
  onGenerate,
  onStop,
  className,
}: ImagePromptComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [ratioId, setRatioId] = useState<Key | null>(defaultAspectRatio ?? aspectRatios[0]?.id ?? null);
  const [count, setCount] = useState(defaultCount);
  const [styles, setStyles] = useState<Set<Key>>(() => new Set(defaultStyles));

  const ratio = aspectRatios.find((option) => option.id === ratioId) ?? aspectRatios[0];
  const trimmed = prompt.trim();
  const canGenerate = trimmed.length > 0 && ratio !== undefined && !isGenerating;
  const images = `${count} ${count === 1 ? "image" : "images"}`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isGenerating) {
      onStop?.();
      return;
    }
    if (!canGenerate) return;
    onGenerate?.({
      prompt: trimmed,
      aspectRatio: ratio,
      count,
      // Keep the option order, not the click order.
      styles: styleOptions.filter((option) => styles.has(option.id)).map((option) => option.id),
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      aria-busy={isGenerating || undefined}
      className={cx("flex w-full flex-col rounded-[26px] bg-background-secondary-default p-1.5", className)}
    >
      <div
        className={cx(
          "flex flex-col gap-3 rounded-[20px] bg-background-primary-default p-3 shadow-xs ring-1 ring-border-ai-profile-card",
          "transition-shadow duration-200 ease-out motion-reduce:transition-none has-[textarea:focus]:ring-border-button-hover",
        )}
      >
        <ToggleButtonGroup
          aria-label="Style"
          selectionMode="multiple"
          selectedKeys={styles}
          onSelectionChange={setStyles}
          isDisabled={isGenerating}
          className="flex flex-wrap gap-1.5"
        >
          {styleOptions.map((option) => (
            <ToggleButton key={option.id} id={option.id} className={chip}>
              {({ isSelected }) => (
                <>
                  {isSelected ? <RiCheckLine aria-hidden className="size-3 shrink-0" /> : <Swatch colors={option.swatch} />}
                  {option.label}
                </>
              )}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Textarea
          aria-label="Prompt"
          placeholder={placeholder}
          value={prompt}
          onChange={setPrompt}
          isReadOnly={isGenerating}
          maxLength={maxLength}
          rows={2}
          maxRows={6}
          autoResize
          onKeyDown={(event) => {
            // ⌘ / Ctrl + Enter sends; a plain Enter is a new line.
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              if (!isGenerating) formRef.current?.requestSubmit();
            } else {
              event.continuePropagation();
            }
          }}
          fieldClassName="bg-transparent p-0 ring-transparent"
          inputClassName="px-0.5 text-body-regular"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Aspect ratio"
            size="sm"
            value={ratioId}
            onChange={(key) => {
              if (key !== null) setRatioId(key);
            }}
            isDisabled={isGenerating}
            renderValue={
              ratio ? (
                <>
                  <RatioGlyph ratio={ratio} />
                  {ratio.id}
                </>
              ) : null
            }
            triggerClassName="h-8 min-w-[84px] tabular-nums"
          >
            {aspectRatios.map((option) => (
              <SelectItem key={option.id} id={option.id} textValue={`${option.id} ${option.label}`}>
                <RatioGlyph ratio={option} />
                <span className="tabular-nums">{option.id}</span>
                <span className="ms-auto text-text-tertiary">{option.label}</span>
              </SelectItem>
            ))}
          </Select>

          <NumberField
            aria-label="Number of images"
            size="small"
            leadingIcon={RiImage2Line}
            minValue={1}
            maxValue={maxImages}
            value={count}
            onChange={(next) => setCount(Number.isNaN(next) ? 1 : next)}
            isDisabled={isGenerating}
            className="w-[108px]"
          />

          {/* One submit button that turns into Stop, so focus stays on it. Two
              buttons swapped in place would share a DOM node: a click on Stop
              re-renders it as a submit button before the browser runs the
              click's default action, which then submits the form again. */}
          <Button
            type="submit"
            variant={isGenerating ? "secondary" : "primary"}
            size="small"
            leadingIcon={isGenerating ? RiStopFill : RiSparkling2Line}
            // aria-disabled keeps it focusable; the footer says what is missing.
            aria-disabled={(!isGenerating && !canGenerate) || undefined}
            aria-keyshortcuts={isGenerating ? undefined : "Meta+Enter Control+Enter"}
            className="ms-auto"
          >
            {isGenerating ? "Stop" : "Generate"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-3 pt-2 pb-1.5 text-caption-1-medium">
        <p aria-live="polite" className="min-w-0 truncate" data-testid="composer-footer">
          {isGenerating ? (
            <span className="agent-progress-loading-text">
              Generating {images} · {ratio?.id}
            </span>
          ) : trimmed ? (
            <span className="text-text-secondary tabular-nums">
              {images} · {ratio ? `${ratio.width} × ${ratio.height}` : "no size"}
            </span>
          ) : (
            <span className="text-text-tertiary">Write a prompt to generate</span>
          )}
        </p>
        <p className="hidden shrink-0 items-center gap-1 text-text-tertiary sm:flex">
          <Kbd aria-hidden>⌘</Kbd>
          <Kbd aria-hidden>↵</Kbd>
          <span aria-hidden>to generate</span>
          <span className="sr-only">Press Command or Control and Enter to generate</span>
        </p>
      </div>
    </form>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The component adds no listeners, timers or observers of its own: the shortcut is a React `onKeyDown` on the field, and the Select's outside-press listener and the Textarea's resize measuring belong to those kit parts. The demo's fake run is one `setTimeout`, cleared when the run ends, is stopped or the demo unmounts.

**Reduced motion.** With prefers-reduced-motion the chips and the card change colour and ring without a transition, and the kit Textarea, Select and NumberField follow their own reduced-motion rules. The footer shimmer is the kit's `agent-progress-loading-text`, which stops moving and keeps its text readable.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Submitting on a plain Enter. A prompt is often several lines, so Enter must stay a newline; only ⌘ / Ctrl + Enter submits, and the button advertises it through `aria-keyshortcuts`.
- Calling `onGenerate` straight from the shortcut. It would skip the guard in `onSubmit` and send blank prompts. `requestSubmit()` routes the shortcut through the same handler as the button.
- Putting the focus ring on the textarea shell inside the card. It draws a box within a box. The shell is made transparent and the card reacts to `has-[textarea:focus]` instead.
- Swapping a submit Generate and a `type="button"` Stop in place. React reuses the DOM node, so a click on Stop re-renders it as a submit button before the browser runs the click's default action, and the form submits again: the run restarts instead of stopping. One submit button that changes its label and `onSubmit` branch avoids it.
- Letting a cleared NumberField pass `NaN` into the request. The change handler maps it back to 1.

## Notes

- `ASPECT_RATIOS` and `IMAGE_STYLES` are exported defaults; pass `aspectRatios` and `styleOptions` to use your model's sizes and presets.
- The form keeps its own prompt, ratio, count and styles. It does not clear the prompt after a run, so a user can tweak and regenerate.

## Definition of done

A grey tray holds a white card with six style chips (Illustration selected), the prompt "A hoopoe on an olive branch, warm paper texture", a 4:5 ratio select and a stepper at 2. The footer reads "2 images · 896 × 1120". Clearing the prompt makes Generate look disabled and the footer reads "Write a prompt to generate"; clicking it does nothing. Generate (or ⌘/Ctrl + Enter) shows the prompt as a bubble with two shimmering frames, locks the form, swaps in Stop and shimmers "Generating 2 images · 4:5"; after about 2.4s two pictures fade in and the status reads "2 ready". Stop during a run leaves dashed "Stopped" frames.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
