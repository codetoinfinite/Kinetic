import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'file-upload',
  title: 'File Upload',
  category: 'form',
  kit: 'boardui',
  tags: ['upload', 'dropzone', 'drag-and-drop', 'progress', 'form', 'boardui'],
  blurb:
    'A drag-and-drop zone that validates type and size, traces progress around its own border, then reports the finished file.',
  cost: 'dom',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/file-upload.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A 164px dashed drop zone that accepts a click, Enter or Space, or a dropped file. A bad extension or an oversized file swaps the prompt for a red message for 2.6 seconds; a good one fades the dashes out, draws an accent line clockwise around the rounded border from top centre as a percentage badge rises over the edge, and shows the file icon, name and size. The upload is simulated, so `onUploadComplete` is where the real storage call goes.',

  mechanism: [
    'The zone is a `div role="button"` (tabbable only when idle) holding a visually hidden `<input type="file">` whose `accept` is built from `allowedExtensions`. Click and Enter / Space call `input.click()`; `onDragOver` prevents the default and sets `dragOver`, `onDrop` takes `dataTransfer.files[0]`. The input clears its `value` after reading so choosing the same file again still fires `change`.',
    '`startUpload` checks the lower-cased extension against `allowedExtensions` and the size against `maxBytes`, and on failure sets a rejection string that a 2600ms timeout clears. On success it stores the file, sets phase `uploading` and starts a self-scheduling `tick`: first after 250ms, then every 90ms, adding the next of `PROGRESS_STEPS` (3, 6, 4, 7, 2, 5 percent, cycled) until 100. At 100 the phase becomes `complete`, and 1600ms later it calls `onUploadComplete(file)` and returns to `idle`. Every timeout id goes into one ref that unmount clears.',
    'A ResizeObserver keeps the measured box size in state. An SVG with `viewBox` equal to that size draws a 2px grey rounded rect and, over it, a path from `ringPath(width, height, 1, 15)`: start at top centre, run clockwise with 15px arcs, close. The path has `pathLength={100}`, so `strokeDasharray` is simply `${progress} 200` (102 once at 100, so the round caps overlap and close the loop) with a 200ms linear transition on `stroke-dasharray`.',
    'The idle layer (icon disc, prompt, allowed types) and the busy layer (file icon, name, uploading / success line) are both always rendered on top of each other. `useStaggerState` turns a boolean into `shown`, `hiding` (200ms) or `hidden`, and the `.t-stagger` classes in the theme sheet animate each `.t-stagger-line` from 12px down, blurred 3px and transparent to rest over 500ms on `cubic-bezier(0.22, 1, 0.36, 1)`, with lines 2 and 3 delayed 40ms and 80ms. Hiding is a plain 200ms fade with no movement.',
    'The "Uploading 1.7 MB..." and "Uploaded successfully!" lines share one 18px slot and cross-fade with the same three-state helper. The percentage badge sits at `-top-[9.5px]` centred on the border and enters by sliding 10px down while unblurring (opacity and blur 160ms, translate 300ms). The dashed border and the SVG ring cross-fade on `busy` over 300ms, and the background shifts from secondary to primary.',
  ],

  constants: [
    {
      name: 'defaults',
      value: 'maxBytes 8 * 1024 * 1024; extensions pdf, jpg, jpeg, png, xlsx',
      why: 'From the Figma copy ("PDF, JPG, PNG, XLSX (max 8 MB)"). JPEG is accepted but hidden from the label so the copy does not list JPG twice.',
    },
    {
      name: 'simulated progress',
      value: '250ms lead-in, 90ms ticks, +3 +6 +4 +7 +2 +5 percent cycled, 1600ms success hold',
      why: 'Averages a little under two seconds per file with uneven steps, so it reads like a network upload instead of a linear timer, and the success state stays up long enough to read. The steps are a fixed cycle rather than `Math.random()`, so every run (and every test) sees the same percentages.',
    },
    {
      name: 'ring geometry',
      value: 'inset 1, radius 15, strokeWidth 2, pathLength 100',
      why: 'The zone is `rounded-2xl` (16px); a 2px stroke centred 1px inside it needs a 15px radius to sit exactly on the border. `pathLength` lets progress map straight onto the dash length whatever the measured size.',
    },
    {
      name: 'closing dash',
      value: '102 at 100%',
      why: 'At exactly 100 the round caps leave a hairline gap at the top centre; overshooting by 2 closes the loop.',
    },
    {
      name: 'stagger',
      value: '500ms cubic-bezier(0.22, 1, 0.36, 1), 12px, blur 3px, 40ms per line; hide 200ms',
      why: 'The theme\'s shared text-reveal. A long ease-out reveal and a fast, motionless hide keep the swap from looking like content sliding back down.',
    },
    {
      name: 'rejection',
      value: '2600ms',
      why: 'Long enough to read a sentence-length message, short enough that the prompt comes back before the user tries again.',
    },
  ],

  pitfalls: [
    'Do not mount and unmount the idle and busy layers. Both stay rendered and swap through the stagger classes; conditional rendering kills the exit fade and the blur-in.',
    'Do not leave the input\'s `value` set after reading it. The browser then fires no `change` when the same file is chosen again.',
    'Do not hard-code the ring path to the default 533 by 164 box. The path is rebuilt from the ResizeObserver size so the corners stay 15px at any width; a fixed path with `preserveAspectRatio="none"` would stretch the arcs.',
    'Do not schedule ticks without tracking them. Every `setTimeout` id is pushed to a ref and cleared on unmount, otherwise a navigation mid-upload sets state on an unmounted component and still fires `onUploadComplete`.',
    'Do not feed the zone a file with `new DataTransfer()` and a synthetic `change` event. The constructor is missing in older browsers, and assigning `input.files` bypasses the zone\'s busy check. Pass the File to `incomingFile` instead; a new File object starts one upload.',
    'Do not treat the progress as real. It is a timer; wire the actual upload in `onUploadComplete` or replace `tick` with your request\'s progress events.',
  ],

  notes: [
    '`incomingFile` starts an upload as if that file had been dropped: same validation, ignored while busy, keyed on the File object so re-renders never restart it.',
    '`renderFileIcon(file)` replaces the default icon in the busy state (spreadsheet for xlsx, image for jpg/jpeg/png, document otherwise).',
    '`formatFileSize` is exported: KB below 1 MB (minimum 1 KB), one decimal under 10 MB, whole MB above.',
    'Strings go through `useTemplateCopy`, so the prompt and status lines can be translated by a `TemplateCopyProvider`.',
  ],

  apiSignature:
    'function FileUpload(props: { onUploadComplete?: (file: File) => void; allowedExtensions?: readonly string[]; maxBytes?: number; renderFileIcon?: (file: File) => ReactNode; incomingFile?: File | null; className?: string }): JSX.Element\nfunction formatFileSize(bytes: number): string',

  props: [
    { name: 'onUploadComplete', type: '(file: File) => void', description: 'Called after the progress ring fills and the success line has shown for 1.6s.' },
    { name: 'allowedExtensions', type: 'readonly string[]', default: '["pdf", "jpg", "jpeg", "png", "xlsx"]', description: 'Extensions without dots; drives validation, `accept` and the hint line.' },
    { name: 'maxBytes', type: 'number', default: '8 * 1024 * 1024', description: 'Larger files are rejected with "That file is larger than 8 MB".' },
    { name: 'renderFileIcon', type: '(file: File) => ReactNode', description: 'Custom icon for the file being uploaded.' },
    { name: 'incomingFile', type: 'File | null', description: 'Starts an upload of this file as if it were dropped (same validation; ignored while busy). Each new File object starts once.' },
    { name: 'className', type: 'string', description: 'Merged onto the 164px zone, e.g. a width.' },
  ],

  reducedMotion:
    'The theme sheet sets `transition: none` on `.t-stagger-line` under `prefers-reduced-motion: reduce`, so the text layers swap instantly with no rise or blur. The progress ring still fills (it carries the progress information) and the border, badge and background still cross-fade.',

  cleanup:
    'The ResizeObserver disconnects on unmount, every upload and rejection timeout is cleared from the shared timer ref, and the 200ms hide timer in `useStaggerState` clears itself.',

  acceptance:
    'An idle dashed zone shows the upload icon, "Drag and drop to upload or select" and "PDF, JPG, PNG, XLSX (max 8 MB)". Dropping a .zip shows "Only PDF, JPG, JPEG, PNG, XLSX files are supported" in red, which clears after about 2.6s. Dropping a 1.7 MB PDF fades the dashes out, the icon, file name and "Uploading 1.7 MB..." rise in, an accent line runs clockwise from top centre around the border with a rising percentage badge, and at 100% the line closes and the status changes to "Uploaded successfully!". About 1.6s later `onUploadComplete` fires once and the zone returns to idle.',

  criticalRegion: 'critical',
};

export default meta;
