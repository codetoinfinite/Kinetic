# Build: AI Image Generation

A full image-generation workspace for a 1280 × 800 frame. The left card lists repositories and their threads, the grey middle pane holds the selected thread and a pill composer, and the right pane is the gallery. Sending a prompt adds a user bubble and a generating tile that counts up with the halftone loader, reveals its picture, then turns into a finished card with copy, like, dislike, regenerate and download actions while the picture is filed at the top of the gallery. Automations and Customize are real views inside the block, and Customize settings change how the next image is made.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Three-pane image studio: repo sidebar, prompt thread with a pill composer and live generating tiles, and a masonry gallery with styles.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. All state lives in `AiImageGeneration`: repositories, a `Record<sessionId, ThreadEntry[]>` of threads, the gallery list, the running jobs, the composer draft and styles, and the Customize defaults. The sidebar, thread, composer and panels are controlled components in their own files.
2. Running generations are a `Record<entryId, Job>` with a `progress` and a per-tick `step`. One `setInterval` at 100ms exists only while at least one job does. It reads the jobs from a ref, advances each, removes those that reach 100, prepends their pictures to the gallery when Save to gallery is on, and raises an "Image ready" toast. Each tile gets its progress and seconds left as props, so `ImageGeneratingLoader` runs controlled.
3. A job's step is `100 × 100ms / duration`. The duration is `generationMs`, halved for the Fable 5 Mini model and halved again in Draft mode, so the model picker and the mode picker change real behaviour.
4. Pictures come from `itemFromPrompt`: an FNV-1a hash of the entry id and prompt picks one of twelve inline-SVG artworks and one of six palettes, the title is the prompt with its leading verb stripped, the ratio comes from the Customize aspect setting and the style line is the chosen styles or the model name. The same prompt and id always draw the same picture.
5. The composer is a form: Enter or the round send button submits, and the button is disabled while the field is empty. The + menu and the Styles tab toggle the same style list, which shows as removable chips and is cleared after sending. Dictate is a pressed toggle that, after 1.8s, writes a phrase into the field.
6. Thread actions are real: Share copies a label to the clipboard, the more menu duplicates the finished entries into a new thread, clears the thread or deletes it (hidden for the last thread), and Stop generating removes a running tile. Clearing or deleting also cancels that thread's jobs.
7. The sidebar collapse button hides the sidebar and the thread header shows a button to bring it back; the gallery's panel button does the same on the right. Below 1024px both panes become drawers over a backdrop, opened from the thread header and closed by the backdrop, Escape or their own close buttons.
8. Quick Search opens the kit Command palette (also on ⌘L) with actions and every thread; Settings opens the kit Settings modal.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `frame = 12px padding and gaps; sidebar 240px; gallery 372px, 500px when widened`
  At 1280px this leaves about 620px for the thread, enough for a 640px message column to sit centered with room for a 200px loader card.
- `tick = 100ms`
  Ten updates a second keeps the percentage and the halftone reveal smooth without re-rendering the page every frame.
- `generationMs = 7000ms default`
  Long enough to watch the loader stages and the reveal, short enough that a demo visitor sees the result land in the gallery.
- `context = 114k of 200k tokens, +3200 plus 4 per character per prompt`
  Opens at 57% like the reference ring and climbs visibly with each send.

## API

```ts
function AiImageGeneration(props: AiImageGenerationProps): JSX.Element
interface AiImageGenerationProps { generationMs?: number; defaultSessionId?: string; className?: string }
```

- `generationMs: number` — default `7000`
  Milliseconds one generation takes with the default model and mode.
- `defaultSessionId: string` — default `"image-generation"`
  Thread selected on first render.
- `className: string`
  Merged onto the root, which is h-full w-full.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// One interval drives every running generation. It only exists while a job
// does, reads the latest jobs from a ref, and files finished pictures in
// the gallery (unless Customize turned that off) before announcing them.
const running = Object.keys(jobs).length > 0;
useEffect(() => {
  if (!running) return;
  const id = window.setInterval(() => {
    const next: Record<string, Job> = {};
    const done: Job[] = [];
    for (const [key, job] of Object.entries(jobsRef.current)) {
      const progress = Math.min(100, job.progress + job.step);
      if (progress >= 100) done.push(job);
      else next[key] = { ...job, progress };
    }
    jobsRef.current = next;
    setJobs(next);
    if (done.length === 0) return;
    if (saveRef.current) {
      setGallery((prev) => [...done.map((job) => job.item), ...prev.filter((item) => !done.some((job) => job.item.id === item.id))]);
    }
    for (const job of done) {
      toast("Image ready", {
        id: `ready-${job.item.id}`,
        description: saveRef.current ? `“${job.item.title}” was added to the gallery.` : `“${job.item.title}” is in the thread.`,
        status: "success",
      });
    }
  }, TICK_MS);
  return () => window.clearInterval(id);
}, [running]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The generation interval is cleared when the last job ends and on unmount. The copied-state, dictation and focus effects clear their timers, and the Escape listener for the drawers is removed when they close.

**Reduced motion.** Hover and press transitions use motion-reduce:transition-none and the dictation pulse is motion-reduce:animate-none. The generating loader drops its ripple under reduced motion while progress keeps counting, the gallery stops zooming on hover, and the kit palette, modal and toasts follow their own reduced-motion rules.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Doing side effects inside a `setJobs` updater. React may call updaters twice in development, which would double the gallery insert and the toast. The interval computes the next jobs from a ref, then sets state and fires effects once.
- Keying a running tile by its array index. Regenerate, Stop and Clear change the list while the timer runs; every entry has its own id and jobs are keyed by it.
- Unmounting the Automations view when switching away. Its rows are local state, so it stays mounted and is hidden with `display: none` instead.

## Notes

- The opening thread starts with one generation in flight, so the first image lands in the gallery about seven seconds after load.
- Downloads, Support and Upgrade are local stand-ins that report through toasts; wire them to a real endpoint in an app.

## Definition of done

At 1280 × 800 a sidebar, a grey thread pane and a gallery fill the frame. The "image generation" thread shows a user prompt and a loader that counts to 100% and then becomes a finished card while the picture appears first in the gallery with an "Image ready" toast. Typing a prompt and pressing Enter adds a bubble and a new loader. Picking a style chip, a model, Draft mode or a new aspect changes the next image. Selecting another thread, Automations or Customize switches the middle pane. The sidebar and gallery hide and come back. Below 1024px both become drawers.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
