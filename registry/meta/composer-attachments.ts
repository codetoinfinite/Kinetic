import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'composer-attachments',
  title: 'Composer Attachments',
  category: 'form',
  kit: 'boardui',
  tags: ['attachments', 'file-input', 'upload', 'composer', 'chat', 'boardui'],
  blurb:
    '56px attachment tiles for a chat composer: type icon, name, size and remove, with a ring that traces the tile edge while uploading.',
  cost: 'dom',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/composer-attachments.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The strip of file tiles that sits above a chat prompt. Each 56px tile shows a coloured icon for the file type, the name and the size, with a dismiss in the corner. Give a tile a `progress` value and an accent ring draws clockwise around its rounded edge from top centre while a 9px percentage counts in the corner; when it reaches 100 the percentage blurs out and the dismiss blurs in on the same spot. `ComposerAttachButton` opens the real file picker and hands back `File` objects; only names and sizes are read.',

  mechanism: [
    '`kindOf(name, mime)` maps the extension through a lookup table (png → image, xlsx → spreadsheet, tsx → code, and so on), then falls back to the MIME family (`image/`, `video/`, `audio/`), then to "file". Each kind has one Remix icon and one status text token, so a PDF is always rose and a spreadsheet always lime in both themes.',
    '`formatBytes` divides by 1024 until the value is under 1024 and prints one decimal below 10 and a whole number above: 812 B, 4.2 KB, 37 MB.',
    'The upload ring is one SVG `<path>` laid over the tile at `-inset-px`, so the 2px stroke sits on the 1px border. The path is the tile outline itself: a 54px rect with an 11px radius, starting at (28, 1) top centre and running clockwise. `pathLength={100}` normalises its length, so `strokeDashoffset = 100 - progress` draws exactly that percentage of the edge, with a 200ms transition between ticks.',
    'The top-right corner holds two layers: the percentage and the remove button. While `progress < 100` the percentage is visible and the button is at opacity 0 with a 2px blur; landing swaps the two classes, so one blurs out as the other blurs in. Hovering or focusing the tile (`group-hover`, `group-focus-within`) swaps them early, which turns the button into "Cancel <name>" for a file still uploading.',
    '`ComposerAttachButton` renders a normal `<button>` that calls `.click()` on a hidden `<input type="file" multiple>`. On change it copies `files` into an array, then clears `value`, so picking the same file twice still fires `change`. `attachmentsFromFiles` turns the `File` list into `{ id, name, size, kind, progress }` without reading file contents.',
    'The strip is a horizontally scrolling `<ul>`. New tiles pop in from 50% scale with the kit `cell-pop` keyframes over 240ms, behind `motion-safe:`.',
  ],

  constants: [
    {
      name: 'tile',
      value: '56px square, 12px radius, 1px composer-panel-tile-border',
      why: 'Large enough for an 18px icon over two 11px text lines with 6px padding, small enough that five tiles fit above a 360px-wide prompt. The border token is neutral-200 in light and 14% white in dark, so tiles separate from the composer surface in both themes.',
    },
    {
      name: 'RING_PATH',
      value: 'M28 1H44A11 11 0 0 1 55 12 … Z (54px rect, r 11)',
      why: 'Centring a 2px stroke 1px inside the 56px box puts it exactly over the border. The radius drops from 12 to 11 because the stroke centre is 1px in from the outer curve. Starting at x=28 makes the ring begin at top centre, not at a corner.',
    },
    {
      name: 'pathLength',
      value: '100',
      why: 'The real path length of a rounded rect is awkward to compute. Normalising it to 100 lets progress go straight into `strokeDashoffset` with no measuring and no `getTotalLength()` call.',
    },
    {
      name: 'corner swap',
      value: '200ms opacity + blur(2px)',
      why: 'Blur alongside opacity makes the percentage and the dismiss read as one element changing, not two elements fighting for the corner.',
    },
  ],

  pitfalls: [
    'Forgetting to clear the input `value` after reading it. Without that, picking the same file a second time fires no `change` event and the click looks broken.',
    'Hiding the dismiss completely while uploading. A visitor who attached the wrong file must be able to cancel, so hover and keyboard focus reveal it early.',
    'Using a `<circle>` or a CSS conic gradient for the ring. The tile is a rounded square, and a ring that does not follow its edge reads as a separate spinner.',
    'Reading file contents or creating object URLs just to show a name. The tile needs `name`, `size` and `type`, which are on the `File` object already. Object URLs also need revoking.',
    'Generating tile ids from the file name alone. The same file picked twice would collide. Prefix ids with a per-pick counter, as `attachmentsFromFiles(files, prefix)` expects.',
  ],

  notes: [
    'The component never uploads. A real uploader updates `progress` on each attachment; the demo simulates that with a 40ms interval that moves one queued file at a time, so tiles land in order.',
    'Image files show the image icon, not a thumbnail. Pass your own tile for thumbnails if you create object URLs.',
  ],

  apiSignature:
    'function ComposerAttachments(props: { attachments: ComposerAttachment[]; onRemove?: (id: string) => void; className?: string }): JSX.Element | null\nfunction ComposerAttachmentTile(props: { attachment: ComposerAttachment; onRemove?: (id: string) => void; className?: string }): JSX.Element\nfunction ComposerAttachButton(props: ButtonHTMLAttributes<HTMLButtonElement> & { onFiles: (files: File[]) => void; accept?: string; multiple?: boolean; children: ReactNode }): JSX.Element\nfunction kindOf(name: string, mime?: string): AttachmentKind\nfunction formatBytes(bytes: number): string\nfunction attachmentsFromFiles(files: File[], idPrefix: string, progress?: number): ComposerAttachment[]\ninterface ComposerAttachment { id: string; name: string; size: number; kind?: AttachmentKind; progress?: number }',

  props: [
    { name: 'attachments', type: 'ComposerAttachment[]', description: 'Tiles in order. An empty array renders nothing.' },
    { name: 'attachment.progress', type: 'number', description: '0-100 draws the ring and the corner percentage. Omit it, or pass 100, for a landed file.' },
    { name: 'attachment.kind', type: 'AttachmentKind', description: 'Icon and colour. Derived from the name with `kindOf` when omitted.' },
    { name: 'onRemove', type: '(id: string) => void', description: 'Shows the corner dismiss. Called with the attachment id for remove and for cancel.' },
    { name: 'onFiles', type: '(files: File[]) => void', description: '`ComposerAttachButton`: receives the picked files. Never called with an empty array.' },
    { name: 'accept', type: 'string', description: '`ComposerAttachButton`: forwarded to the file input, e.g. "image/*,.pdf".' },
    { name: 'multiple', type: 'boolean', default: 'true', description: '`ComposerAttachButton`: allow picking several files at once.' },
    { name: 'className', type: 'string', description: 'Merged onto the strip, tile or button.' },
  ],

  reducedMotion:
    'The ring\'s dash transition, the corner blur swap and the hover colours all carry `motion-reduce:transition-none`, and the pop-in animation is behind `motion-safe:`, so tiles appear in place and states switch instantly. The demo also skips the simulated upload and lands files at once.',

  cleanup:
    'The component holds no timers or listeners; the file input is part of the tree. The demo\'s upload interval is keyed to the active file id and cleared when that file lands, is removed, or the demo unmounts.',

  acceptance:
    'Three tiles show a coloured type icon, a truncated name and a size. "Add sample files" queues three more that upload one after another: an accent ring draws clockwise from top centre and the corner counts up, then the percentage blurs into a dismiss. Hovering an uploading tile shows "Cancel". The + button opens the browser file picker and picked files appear as tiles with their real names and sizes. Clicking a dismiss removes that tile.',

  criticalRegion: 'critical',
};

export default meta;
