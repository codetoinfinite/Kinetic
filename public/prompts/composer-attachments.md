# Build: Composer Attachments

The strip of file tiles that sits above a chat prompt. Each 56px tile shows a coloured icon for the file type, the name and the size, with a dismiss in the corner. Give a tile a `progress` value and an accent ring draws clockwise around its rounded edge from top centre while a 9px percentage counts in the corner; when it reaches 100 the percentage blurs out and the dismiss blurs in on the same spot. `ComposerAttachButton` opens the real file picker and hands back `File` objects; only names and sizes are read.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

56px attachment tiles for a chat composer: type icon, name, size and remove, with a ring that traces the tile edge while uploading.

- Category: form
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. `kindOf(name, mime)` maps the extension through a lookup table (png → image, xlsx → spreadsheet, tsx → code, and so on), then falls back to the MIME family (`image/`, `video/`, `audio/`), then to "file". Each kind has one Remix icon and one status text token, so a PDF is always rose and a spreadsheet always lime in both themes.
2. `formatBytes` divides by 1024 until the value is under 1024 and prints one decimal below 10 and a whole number above: 812 B, 4.2 KB, 37 MB.
3. The upload ring is one SVG `<path>` laid over the tile at `-inset-px`, so the 2px stroke sits on the 1px border. The path is the tile outline itself: a 54px rect with an 11px radius, starting at (28, 1) top centre and running clockwise. `pathLength={100}` normalises its length, so `strokeDashoffset = 100 - progress` draws exactly that percentage of the edge, with a 200ms transition between ticks.
4. The top-right corner holds two layers: the percentage and the remove button. While `progress < 100` the percentage is visible and the button is at opacity 0 with a 2px blur; landing swaps the two classes, so one blurs out as the other blurs in. Hovering or focusing the tile (`group-hover`, `group-focus-within`) swaps them early, which turns the button into "Cancel <name>" for a file still uploading.
5. `ComposerAttachButton` renders a normal `<button>` that calls `.click()` on a hidden `<input type="file" multiple>`. On change it copies `files` into an array, then clears `value`, so picking the same file twice still fires `change`. `attachmentsFromFiles` turns the `File` list into `{ id, name, size, kind, progress }` without reading file contents.
6. The strip is a horizontally scrolling `<ul>`. New tiles pop in from 50% scale with the kit `cell-pop` keyframes over 240ms, behind `motion-safe:`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `tile = 56px square, 12px radius, 1px composer-panel-tile-border`
  Large enough for an 18px icon over two 11px text lines with 6px padding, small enough that five tiles fit above a 360px-wide prompt. The border token is neutral-200 in light and 14% white in dark, so tiles separate from the composer surface in both themes.
- `RING_PATH = M28 1H44A11 11 0 0 1 55 12 … Z (54px rect, r 11)`
  Centring a 2px stroke 1px inside the 56px box puts it exactly over the border. The radius drops from 12 to 11 because the stroke centre is 1px in from the outer curve. Starting at x=28 makes the ring begin at top centre, not at a corner.
- `pathLength = 100`
  The real path length of a rounded rect is awkward to compute. Normalising it to 100 lets progress go straight into `strokeDashoffset` with no measuring and no `getTotalLength()` call.
- `corner swap = 200ms opacity + blur(2px)`
  Blur alongside opacity makes the percentage and the dismiss read as one element changing, not two elements fighting for the corner.

## API

```ts
function ComposerAttachments(props: { attachments: ComposerAttachment[]; onRemove?: (id: string) => void; className?: string }): JSX.Element | null
function ComposerAttachmentTile(props: { attachment: ComposerAttachment; onRemove?: (id: string) => void; className?: string }): JSX.Element
function ComposerAttachButton(props: ButtonHTMLAttributes<HTMLButtonElement> & { onFiles: (files: File[]) => void; accept?: string; multiple?: boolean; children: ReactNode }): JSX.Element
function kindOf(name: string, mime?: string): AttachmentKind
function formatBytes(bytes: number): string
function attachmentsFromFiles(files: File[], idPrefix: string, progress?: number): ComposerAttachment[]
interface ComposerAttachment { id: string; name: string; size: number; kind?: AttachmentKind; progress?: number }
```

- `attachments: ComposerAttachment[]`
  Tiles in order. An empty array renders nothing.
- `attachment.progress: number`
  0-100 draws the ring and the corner percentage. Omit it, or pass 100, for a landed file.
- `attachment.kind: AttachmentKind`
  Icon and colour. Derived from the name with `kindOf` when omitted.
- `onRemove: (id: string) => void`
  Shows the corner dismiss. Called with the attachment id for remove and for cancel.
- `onFiles: (files: File[]) => void`
  `ComposerAttachButton`: receives the picked files. Never called with an empty array.
- `accept: string`
  `ComposerAttachButton`: forwarded to the file input, e.g. "image/*,.pdf".
- `multiple: boolean` — default `true`
  `ComposerAttachButton`: allow picking several files at once.
- `className: string`
  Merged onto the strip, tile or button.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/*
 * The ring traces the tile's own rounded edge, starting at top centre and
 * running clockwise. Tile is 56px with a 12px radius; the stroke is centred
 * 1px in, so the path is a 54px rect with an 11px radius. pathLength=100 turns
 * progress straight into a dash offset.
 */
const RING_PATH =
  "M28 1H44A11 11 0 0 1 55 12V44A11 11 0 0 1 44 55H12A11 11 0 0 1 1 44V12A11 11 0 0 1 12 1Z";

function UploadRing({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 56 56" aria-hidden className="pointer-events-none absolute -inset-px size-14 overflow-visible">
      <path
        d={RING_PATH}
        pathLength={100}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="100 100"
        strokeDashoffset={100 - progress}
        className="text-accent-500 transition-[stroke-dashoffset] duration-200 ease-out motion-reduce:transition-none"
      />
    </svg>
  );
}

export interface ComposerAttachmentTileProps {
  attachment: ComposerAttachment;
  /** Removes a landed file, or cancels one still uploading. */
  onRemove?: (id: string) => void;
  className?: string;
}

export function ComposerAttachmentTile({ attachment, onRemove, className }: ComposerAttachmentTileProps) {
  const { id, name, size, progress } = attachment;
  const kind = attachment.kind ?? kindOf(name);
  const { icon: Icon, tone, label } = KIND_STYLE[kind];
  const pct = progress === undefined ? 100 : Math.max(0, Math.min(100, Math.round(progress)));
  const uploading = pct < 100;
  // The corner holds the percentage while uploading and the dismiss once landed.
  // Hover or keyboard focus swaps them early, so an upload can be cancelled.
  const fade = "transition-[opacity,filter] duration-200 ease-out motion-reduce:transition-none";

  return (
    <div
      title={`${name}, ${formatBytes(size)}`}
      data-uploading={uploading || undefined}
      className={cx(
        "group relative flex size-14 shrink-0 flex-col justify-between rounded-xl border border-composer-panel-tile-border bg-background-primary-default p-1.5",
        className,
      )}
    >
      <Icon className={cx("size-[18px] shrink-0", tone)} aria-hidden />
      <span className="sr-only">{label}:</span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[9px]/[11px] font-medium text-text-primary">{name}</span>
        <span className="truncate text-[9px]/[11px] text-text-tertiary tabular-nums">
          {formatBytes(size)}
          {uploading && <span className="sr-only">, uploading {pct}%</span>}
        </span>
      </span>

      {uploading && <UploadRing progress={pct} />}

      <span
        aria-hidden
        className={cx(
          "pointer-events-none absolute end-1 top-1 text-[9px]/[11px] font-semibold text-accent-500 tabular-nums",
          fade,
          uploading
            ? "opacity-100 blur-none group-focus-within:opacity-0 group-hover:opacity-0"
            : "opacity-0 blur-[2px]",
        )}
      >
        {pct}%
      </span>

      {onRemove && (
        <button
          type="button"
          aria-label={uploading ? `Cancel ${name}` : `Remove ${name}`}
          onClick={() => onRemove(id)}
          className={cx(
            "absolute end-1 top-1 grid size-[18px] place-items-center rounded-full bg-background-tertiary-default text-foreground-icon-secondary outline-none hover:bg-background-tertiary-hover hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            fade,
            uploading
              ? "opacity-0 blur-[2px] group-focus-within:opacity-100 group-focus-within:blur-none group-hover:opacity-100 group-hover:blur-none"
              : "opacity-100 blur-none",
          )}
        >
          <RiCloseLine className="size-3" aria-hidden />
        </button>
      )}
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The component holds no timers or listeners; the file input is part of the tree. The demo's upload interval is keyed to the active file id and cleared when that file lands, is removed, or the demo unmounts.

**Reduced motion.** The ring's dash transition, the corner blur swap and the hover colours all carry `motion-reduce:transition-none`, and the pop-in animation is behind `motion-safe:`, so tiles appear in place and states switch instantly. The demo also skips the simulated upload and lands files at once.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Forgetting to clear the input `value` after reading it. Without that, picking the same file a second time fires no `change` event and the click looks broken.
- Hiding the dismiss completely while uploading. A visitor who attached the wrong file must be able to cancel, so hover and keyboard focus reveal it early.
- Using a `<circle>` or a CSS conic gradient for the ring. The tile is a rounded square, and a ring that does not follow its edge reads as a separate spinner.
- Reading file contents or creating object URLs just to show a name. The tile needs `name`, `size` and `type`, which are on the `File` object already. Object URLs also need revoking.
- Generating tile ids from the file name alone. The same file picked twice would collide. Prefix ids with a per-pick counter, as `attachmentsFromFiles(files, prefix)` expects.

## Notes

- The component never uploads. A real uploader updates `progress` on each attachment; the demo simulates that with a 40ms interval that moves one queued file at a time, so tiles land in order.
- Image files show the image icon, not a thumbnail. Pass your own tile for thumbnails if you create object URLs.

## Definition of done

Three tiles show a coloured type icon, a truncated name and a size. "Add sample files" queues three more that upload one after another: an accent ring draws clockwise from top centre and the corner counts up, then the percentage blurs into a dismiss. Hovering an uploading tile shows "Cancel". The + button opens the browser file picker and picked files appear as tiles with their real names and sizes. Clicking a dismiss removes that tile.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
