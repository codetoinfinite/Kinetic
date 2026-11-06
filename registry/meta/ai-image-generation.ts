/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Image Generation" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'ai-image-generation',
  title: 'AI Image Generation',
  category: 'block',
  kit: 'boardui',
  tags: ['template', 'ai', 'image-generation', 'gallery', 'composer', 'sidebar', 'boardui'],
  blurb:
    'Three-pane image studio: repo sidebar, prompt thread with a pill composer and live generating tiles, and a masonry gallery with styles.',
  cost: 'dom',
  motif: 'split',

  files: [
    { path: 'registry/ui/ai-image-generation.tsx', type: 'registry:ui', role: 'page: state, generation timer, layout, search palette and toasts' },
    { path: 'registry/ui/ai-image-generation-sidebar.tsx', type: 'registry:ui', role: 'repository sidebar with account menu, nav and session tree' },
    { path: 'registry/ui/ai-image-generation-thread.tsx', type: 'registry:ui', role: 'thread header, entries, pill composer and status row' },
    { path: 'registry/ui/ai-image-generation-panels.tsx', type: 'registry:ui', role: 'gallery and styles tabs, Automations and Customize views' },
    { path: 'registry/ui/ai-image-generation-data.tsx', type: 'registry:ui', role: 'seed repositories, threads, models, style presets and the prompt-to-picture hash' },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A full image-generation workspace for a 1280 × 800 frame. The left card lists repositories and their threads, the grey middle pane holds the selected thread and a pill composer, and the right pane is the gallery. Sending a prompt adds a user bubble and a generating tile that counts up with the halftone loader, reveals its picture, then turns into a finished card with copy, like, dislike, regenerate and download actions while the picture is filed at the top of the gallery. Automations and Customize are real views inside the block, and Customize settings change how the next image is made.',

  mechanism: [
    'All state lives in `AiImageGeneration`: repositories, a `Record<sessionId, ThreadEntry[]>` of threads, the gallery list, the running jobs, the composer draft and styles, and the Customize defaults. The sidebar, thread, composer and panels are controlled components in their own files.',
    'Running generations are a `Record<entryId, Job>` with a `progress` and a per-tick `step`. One `setInterval` at 100ms exists only while at least one job does. It reads the jobs from a ref, advances each, removes those that reach 100, prepends their pictures to the gallery when Save to gallery is on, and raises an "Image ready" toast. Each tile gets its progress and seconds left as props, so `ImageGeneratingLoader` runs controlled.',
    'A job\'s step is `100 × 100ms / duration`. The duration is `generationMs`, halved for the Fable 5 Mini model and halved again in Draft mode, so the model picker and the mode picker change real behaviour.',
    'Pictures come from `itemFromPrompt`: an FNV-1a hash of the entry id and prompt picks one of twelve inline-SVG artworks and one of six palettes, the title is the prompt with its leading verb stripped, the ratio comes from the Customize aspect setting and the style line is the chosen styles or the model name. The same prompt and id always draw the same picture.',
    'The composer is a form: Enter or the round send button submits, and the button is disabled while the field is empty. The + menu and the Styles tab toggle the same style list, which shows as removable chips and is cleared after sending. Dictate is a pressed toggle that, after 1.8s, writes a phrase into the field.',
    'Thread actions are real: Share copies a label to the clipboard, the more menu duplicates the finished entries into a new thread, clears the thread or deletes it (hidden for the last thread), and Stop generating removes a running tile. Clearing or deleting also cancels that thread\'s jobs.',
    'The sidebar collapse button hides the sidebar and the thread header shows a button to bring it back; the gallery\'s panel button does the same on the right. Below 1024px both panes become drawers over a backdrop, opened from the thread header and closed by the backdrop, Escape or their own close buttons.',
    'Quick Search opens the kit Command palette (also on ⌘L) with actions and every thread; Settings opens the kit Settings modal.',
  ],

  constants: [
    { name: 'frame', value: '12px padding and gaps; sidebar 240px; gallery 372px, 500px when widened', why: 'At 1280px this leaves about 620px for the thread, enough for a 640px message column to sit centered with room for a 200px loader card.' },
    { name: 'tick', value: '100ms', why: 'Ten updates a second keeps the percentage and the halftone reveal smooth without re-rendering the page every frame.' },
    { name: 'generationMs', value: '7000ms default', why: 'Long enough to watch the loader stages and the reveal, short enough that a demo visitor sees the result land in the gallery.' },
    { name: 'context', value: '114k of 200k tokens, +3200 plus 4 per character per prompt', why: 'Opens at 57% like the reference ring and climbs visibly with each send.' },
  ],

  pitfalls: [
    'Doing side effects inside a `setJobs` updater. React may call updaters twice in development, which would double the gallery insert and the toast. The interval computes the next jobs from a ref, then sets state and fires effects once.',
    'Keying a running tile by its array index. Regenerate, Stop and Clear change the list while the timer runs; every entry has its own id and jobs are keyed by it.',
    'Unmounting the Automations view when switching away. Its rows are local state, so it stays mounted and is hidden with `display: none` instead.',
  ],

  notes: [
    'The opening thread starts with one generation in flight, so the first image lands in the gallery about seven seconds after load.',
    'Downloads, Support and Upgrade are local stand-ins that report through toasts; wire them to a real endpoint in an app.',
  ],

  apiSignature:
    'function AiImageGeneration(props: AiImageGenerationProps): JSX.Element\ninterface AiImageGenerationProps { generationMs?: number; defaultSessionId?: string; className?: string }',

  props: [
    { name: 'generationMs', type: 'number', default: '7000', description: 'Milliseconds one generation takes with the default model and mode.' },
    { name: 'defaultSessionId', type: 'string', default: '"image-generation"', description: 'Thread selected on first render.' },
    { name: 'className', type: 'string', description: 'Merged onto the root, which is h-full w-full.' },
  ],

  reducedMotion:
    'Hover and press transitions use motion-reduce:transition-none and the dictation pulse is motion-reduce:animate-none. The generating loader drops its ripple under reduced motion while progress keeps counting, the gallery stops zooming on hover, and the kit palette, modal and toasts follow their own reduced-motion rules.',

  cleanup:
    'The generation interval is cleared when the last job ends and on unmount. The copied-state, dictation and focus effects clear their timers, and the Escape listener for the drawers is removed when they close.',

  acceptance:
    'At 1280 × 800 a sidebar, a grey thread pane and a gallery fill the frame. The "image generation" thread shows a user prompt and a loader that counts to 100% and then becomes a finished card while the picture appears first in the gallery with an "Image ready" toast. Typing a prompt and pressing Enter adds a bubble and a new loader. Picking a style chip, a model, Draft mode or a new aspect changes the next image. Selecting another thread, Automations or Customize switches the middle pane. The sidebar and gallery hide and come back. Below 1024px both become drawers.',

  criticalRegion: 'critical',
};

export default meta;
