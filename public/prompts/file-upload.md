# Build: File Upload

A 164px dashed drop zone that accepts a click, Enter or Space, or a dropped file. A bad extension or an oversized file swaps the prompt for a red message for 2.6 seconds; a good one fades the dashes out, draws an accent line clockwise around the rounded border from top centre as a percentage badge rises over the edge, and shows the file icon, name and size. The upload is simulated, so `onUploadComplete` is where the real storage call goes.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A drag-and-drop zone that validates type and size, traces progress around its own border, then reports the finished file.

- Category: form
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The zone is a `div role="button"` (tabbable only when idle) holding a visually hidden `<input type="file">` whose `accept` is built from `allowedExtensions`. Click and Enter / Space call `input.click()`; `onDragOver` prevents the default and sets `dragOver`, `onDrop` takes `dataTransfer.files[0]`. The input clears its `value` after reading so choosing the same file again still fires `change`.
2. `startUpload` checks the lower-cased extension against `allowedExtensions` and the size against `maxBytes`, and on failure sets a rejection string that a 2600ms timeout clears. On success it stores the file, sets phase `uploading` and starts a self-scheduling `tick`: first after 250ms, then every 90ms, adding the next of `PROGRESS_STEPS` (3, 6, 4, 7, 2, 5 percent, cycled) until 100. At 100 the phase becomes `complete`, and 1600ms later it calls `onUploadComplete(file)` and returns to `idle`. Every timeout id goes into one ref that unmount clears.
3. A ResizeObserver keeps the measured box size in state. An SVG with `viewBox` equal to that size draws a 2px grey rounded rect and, over it, a path from `ringPath(width, height, 1, 15)`: start at top centre, run clockwise with 15px arcs, close. The path has `pathLength={100}`, so `strokeDasharray` is simply `${progress} 200` (102 once at 100, so the round caps overlap and close the loop) with a 200ms linear transition on `stroke-dasharray`.
4. The idle layer (icon disc, prompt, allowed types) and the busy layer (file icon, name, uploading / success line) are both always rendered on top of each other. `useStaggerState` turns a boolean into `shown`, `hiding` (200ms) or `hidden`, and the `.t-stagger` classes in the theme sheet animate each `.t-stagger-line` from 12px down, blurred 3px and transparent to rest over 500ms on `cubic-bezier(0.22, 1, 0.36, 1)`, with lines 2 and 3 delayed 40ms and 80ms. Hiding is a plain 200ms fade with no movement.
5. The "Uploading 1.7 MB..." and "Uploaded successfully!" lines share one 18px slot and cross-fade with the same three-state helper. The percentage badge sits at `-top-[9.5px]` centred on the border and enters by sliding 10px down while unblurring (opacity and blur 160ms, translate 300ms). The dashed border and the SVG ring cross-fade on `busy` over 300ms, and the background shifts from secondary to primary.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `defaults = maxBytes 8 * 1024 * 1024; extensions pdf, jpg, jpeg, png, xlsx`
  From the Figma copy ("PDF, JPG, PNG, XLSX (max 8 MB)"). JPEG is accepted but hidden from the label so the copy does not list JPG twice.
- `simulated progress = 250ms lead-in, 90ms ticks, +3 +6 +4 +7 +2 +5 percent cycled, 1600ms success hold`
  Averages a little under two seconds per file with uneven steps, so it reads like a network upload instead of a linear timer, and the success state stays up long enough to read. The steps are a fixed cycle rather than `Math.random()`, so every run (and every test) sees the same percentages.
- `ring geometry = inset 1, radius 15, strokeWidth 2, pathLength 100`
  The zone is `rounded-2xl` (16px); a 2px stroke centred 1px inside it needs a 15px radius to sit exactly on the border. `pathLength` lets progress map straight onto the dash length whatever the measured size.
- `closing dash = 102 at 100%`
  At exactly 100 the round caps leave a hairline gap at the top centre; overshooting by 2 closes the loop.
- `stagger = 500ms cubic-bezier(0.22, 1, 0.36, 1), 12px, blur 3px, 40ms per line; hide 200ms`
  The theme's shared text-reveal. A long ease-out reveal and a fast, motionless hide keep the swap from looking like content sliding back down.
- `rejection = 2600ms`
  Long enough to read a sentence-length message, short enough that the prompt comes back before the user tries again.

## API

```ts
function FileUpload(props: { onUploadComplete?: (file: File) => void; allowedExtensions?: readonly string[]; maxBytes?: number; renderFileIcon?: (file: File) => ReactNode; incomingFile?: File | null; className?: string }): JSX.Element
function formatFileSize(bytes: number): string
```

- `onUploadComplete: (file: File) => void`
  Called after the progress ring fills and the success line has shown for 1.6s.
- `allowedExtensions: readonly string[]` — default `["pdf", "jpg", "jpeg", "png", "xlsx"]`
  Extensions without dots; drives validation, `accept` and the hint line.
- `maxBytes: number` — default `8 * 1024 * 1024`
  Larger files are rejected with "That file is larger than 8 MB".
- `renderFileIcon: (file: File) => ReactNode`
  Custom icon for the file being uploaded.
- `incomingFile: File | null`
  Starts an upload of this file as if it were dropped (same validation; ignored while busy). Each new File object starts once.
- `className: string`
  Merged onto the 164px zone, e.g. a width.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function FileUpload({
  onUploadComplete,
  allowedExtensions = DEFAULT_EXTENSIONS,
  maxBytes = DEFAULT_MAX_BYTES,
  renderFileIcon,
  incomingFile,
  className,
}: FileUploadProps) {
  const localize = useTemplateCopy();
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 533, height: 164 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0) setBox({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const startUpload = (nextFile: File) => {
    const extension = extensionFor(nextFile.name);
    if (!allowedExtensions.map((value) => value.toLowerCase()).includes(extension)) {
      setRejection(`Only ${allowedExtensions.map((value) => value.toUpperCase()).join(", ")} files are supported`);
      timers.current.push(setTimeout(() => setRejection(null), 2600));
      return;
    }
    if (nextFile.size > maxBytes) {
      setRejection(`That file is larger than ${formatFileSize(maxBytes)}`);
      timers.current.push(setTimeout(() => setRejection(null), 2600));
      return;
    }

    setFile(nextFile);
    setProgress(0);
    setPhase("uploading");

    let value = 0;
    let step = 0;
    const tick = () => {
      value = Math.min(100, value + PROGRESS_STEPS[step++ % PROGRESS_STEPS.length]!);
      setProgress(Math.round(value));
      if (value < 100) {
        timers.current.push(setTimeout(tick, 90));
        return;
      }

      setPhase("complete");
      timers.current.push(
        setTimeout(() => {
          onUploadComplete?.(nextFile);
          setPhase("idle");
          setFile(null);
        }, 1600),
      );
    };
    timers.current.push(setTimeout(tick, 250));
  };

  const busy = phase !== "idle";

  // A new `incomingFile` behaves like a drop: ignored while an upload runs.
  // Keyed on the File object itself, so a re-render never restarts it.
  useEffect(() => {
    if (incomingFile && !busy) startUpload(incomingFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingFile]);

  const progressPath = ringPath(box.width, box.height, 1, 15);
  const idleReveal = useStaggerState(!busy);
  const busyReveal = useStaggerState(busy);
  const uploadingLine = useStaggerState(phase === "uploading");
  const completeLine = useStaggerState(phase === "complete");
  const allowedLabel = allowedExtensions
    .filter((extension) => extension.toLowerCase() !== "jpeg")
    .map((extension) => extension.toUpperCase())
    .join(", ");

  return localize(
    <div
      ref={boxRef}
      role="button"
      tabIndex={busy ? -1 : 0}
      aria-label="Upload a file"
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(event) => {
        if (!busy && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        const droppedFile = event.dataTransfer.files?.[0];
        if (droppedFile && !busy) startUpload(droppedFile);
      }}
      className={cx(
        "group relative h-[164px] w-full shrink-0 rounded-2xl outline-none",
        "transition-colors duration-300 ease-out",
        busy ? "bg-background-primary-default" : "cursor-pointer bg-background-secondary-default",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        aria-label="Choose a file to upload"
        accept={allowedExtensions.map((extension) => `.${extension}`).join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const selectedFile = event.target.files?.[0];
          event.target.value = "";
          if (selectedFile) startUpload(selectedFile);
        }}
      />

      <div
        aria-hidden
        className={cx(
          "pointer-events-none absolute inset-0 rounded-2xl border-2 border-dashed",
          dragOver
            ? "border-border-button-active"
            : "border-border-checkbox-default group-hover:border-border-button-active",
          "transition-[opacity,border-color] duration-300 ease-out",
          busy ? "opacity-0" : "opacity-100",
        )}
      />

      <svg
        aria-hidden
        viewBox={`0 0 ${box.width} ${box.height}`}
        preserveAspectRatio="none"
        className={cx(
          "pointer-events-none absolute inset-0 size-full transition-opacity duration-300 ease-out",
          busy ? "opacity-100" : "opacity-0",
        )}
      >
        <rect
          x={1}
          y={1}
          width={box.width - 2}
          height={box.height - 2}
          rx={15}
          fill="none"
          stroke="var(--color-border-button-default)"
          strokeWidth={2}
        />
        <path
          d={progressPath}
          fill="none"
          stroke="var(--color-accent-400)"
          strokeWidth={2}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${busy ? (progress >= 100 ? 102 : progress) : 0} 200`}
          className="transition-[stroke-dasharray] duration-200 ease-linear"
        />
      </svg>

      <div
        aria-hidden
        className={cx(
          "absolute -top-[9.5px] left-1/2 -translate-x-1/2 rounded-md bg-accent-400 px-1.5 py-0.5",
          "text-caption-1-medium whitespace-nowrap text-white tabular-nums",
          "[transition:opacity_160ms_ease-out,filter_160ms_ease-out,translate_300ms_ease-out]",
          busy ? "translate-y-0 opacity-100 blur-none" : "-translate-y-2.5 opacity-0 blur-[2px]",
        )}
      >
        {progress}%
      </div>

      <div
        className={cx(
          "absolute inset-0 flex flex-col items-center justify-center gap-3.5",
          staggerContainer(idleReveal),
          busy && "pointer-events-none",
        )}
      >
        <span className="t-stagger-line t-stagger-line--1 flex size-10 items-center justify-center rounded-full bg-file-upload-icon-background p-2.5">
          <RiUploadCloud2Line
            className="size-6 shrink-0 text-file-upload-icon-foreground transition-colors duration-150 ease group-hover:text-file-upload-icon-foreground-hover"
            aria-hidden
          />
        </span>
        <div className="flex flex-col items-center gap-2 text-center">
          <p
            className={cx(
              "t-stagger-line t-stagger-line--2 text-body-medium",
              rejection ? "text-text-error-primary" : "text-text-secondary",
            )}
          >
            {rejection ?? (
              <>
                Drag and drop to upload or <span className="text-accent-500">select</span>
              </>
            )}
          </p>
          <p className="t-stagger-line t-stagger-line--3 text-body-2-regular text-text-tertiary">
            {allowedLabel} (max {formatFileSize(maxBytes)})
          </p>
        </div>
      </div>

      <div
        className={cx(
          "absolute inset-0 flex flex-col items-center justify-center",
          staggerContainer(busyReveal),
          !busy && "pointer-events-none",
        )}
      >
        <span className="t-stagger-line t-stagger-line--1 flex size-10 items-center justify-center rounded-full border border-border-button-default bg-background-primary-default p-2">
          {file && (renderFileIcon ? renderFileIcon(file) : <DefaultFileIcon file={file} />)}
        </span>
        <p className="t-stagger-line t-stagger-line--2 mt-3.5 max-w-[90%] truncate text-body-medium text-text-primary">
          {file?.name}
        </p>
        <div className="t-stagger-line t-stagger-line--3 relative mt-1 h-[18px] w-full">
          <p
            className={cx(
              "absolute inset-x-0 text-center text-body-2-regular text-text-secondary",
              staggerLine(uploadingLine),
            )}
          >
            Uploading {file ? formatFileSize(file.size) : ""}
            ...
          </p>
          <p
            className={cx(
              "absolute inset-x-0 text-center text-body-2-regular text-text-secondary",
              staggerLine(completeLine),
            )}
          >
            Uploaded successfully!
          </p>
        </div>
      </div>
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The ResizeObserver disconnects on unmount, every upload and rejection timeout is cleared from the shared timer ref, and the 200ms hide timer in `useStaggerState` clears itself.

**Reduced motion.** The theme sheet sets `transition: none` on `.t-stagger-line` under `prefers-reduced-motion: reduce`, so the text layers swap instantly with no rise or blur. The progress ring still fills (it carries the progress information) and the border, badge and background still cross-fade.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not mount and unmount the idle and busy layers. Both stay rendered and swap through the stagger classes; conditional rendering kills the exit fade and the blur-in.
- Do not leave the input's `value` set after reading it. The browser then fires no `change` when the same file is chosen again.
- Do not hard-code the ring path to the default 533 by 164 box. The path is rebuilt from the ResizeObserver size so the corners stay 15px at any width; a fixed path with `preserveAspectRatio="none"` would stretch the arcs.
- Do not schedule ticks without tracking them. Every `setTimeout` id is pushed to a ref and cleared on unmount, otherwise a navigation mid-upload sets state on an unmounted component and still fires `onUploadComplete`.
- Do not feed the zone a file with `new DataTransfer()` and a synthetic `change` event. The constructor is missing in older browsers, and assigning `input.files` bypasses the zone's busy check. Pass the File to `incomingFile` instead; a new File object starts one upload.
- Do not treat the progress as real. It is a timer; wire the actual upload in `onUploadComplete` or replace `tick` with your request's progress events.

## Notes

- `incomingFile` starts an upload as if that file had been dropped: same validation, ignored while busy, keyed on the File object so re-renders never restart it.
- `renderFileIcon(file)` replaces the default icon in the busy state (spreadsheet for xlsx, image for jpg/jpeg/png, document otherwise).
- `formatFileSize` is exported: KB below 1 MB (minimum 1 KB), one decimal under 10 MB, whole MB above.
- Strings go through `useTemplateCopy`, so the prompt and status lines can be translated by a `TemplateCopyProvider`.

## Definition of done

An idle dashed zone shows the upload icon, "Drag and drop to upload or select" and "PDF, JPG, PNG, XLSX (max 8 MB)". Dropping a .zip shows "Only PDF, JPG, JPEG, PNG, XLSX files are supported" in red, which clears after about 2.6s. Dropping a 1.7 MB PDF fades the dashes out, the icon, file name and "Uploading 1.7 MB..." rise in, an accent line runs clockwise from top centre around the border with a rising percentage badge, and at 100% the line closes and the status changes to "Uploaded successfully!". About 1.6s later `onUploadComplete` fires once and the zone returns to idle.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
