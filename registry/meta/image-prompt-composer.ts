/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Image Prompt Composer" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'image-prompt-composer',
  title: 'Image Prompt Composer',
  category: 'form',
  kit: 'boardui',
  tags: ['composer', 'prompt', 'form', 'ai', 'image-generation', 'toggle-group', 'boardui'],
  blurb:
    'The request form of an image model: style chips, an auto-growing prompt, ratio select, count stepper and a Generate that turns into Stop.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/image-prompt-composer.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'The prompt box at the foot of an image-generation chat. A white card on a grey tray stacks a row of style chips, a prompt that grows with its text, an aspect-ratio select with a proportional glyph, an image-count stepper and a Generate button; the tray\'s footer reads back the output size or what is missing. Submitting hands a typed request to `onGenerate`, and while `isGenerating` is set the whole form locks, Generate becomes Stop and the footer shimmers.',

  mechanism: [
    'The style chips are a React Aria `ToggleButtonGroup` in `multiple` mode, so they share one tab stop, move with the arrow keys and expose `aria-pressed`. Each chip shows a two-tone swatch, swapped for a check while selected, and the selected chips take the status-blue tokens. The request lists styles in option order, not click order.',
    'The prompt is the kit `Textarea` with `autoResize` from 2 to 6 rows. Its own field shell is made transparent and borderless, and the card shows focus instead through `has-[textarea:focus]:ring-border-button-hover`, so the whole card reads as one input. A `keydown` handler on the field submits on ⌘ / Ctrl + Enter through `form.requestSubmit()`, so the same `onSubmit` runs as for a click; a plain Enter stays a new line.',
    'The ratio select is the kit `Select` at `sm` size. Every option draws a glyph whose box is the ratio scaled to 14px on its long side, and the trigger shows only the glyph and the ratio id. The count is the kit `NumberField` with steppers, clamped to `1…maxImages`, and a cleared field falls back to 1.',
    'Generate is a submit button that uses `aria-disabled` while the prompt is blank, so it stays focusable and the footer explains why ("Write a prompt to generate"). The submit handler trims the prompt and returns early unless the form can generate.',
    'With `isGenerating`, the chips, select and stepper get `isDisabled`, the prompt becomes read-only, the form sets `aria-busy`, and the Generate button becomes a secondary Stop button. It stays the same submit button, so focus does not jump, and `onSubmit` calls `onStop` instead of `onGenerate` while a run is on. The footer is a polite live region whose text switches to "Generating N images · ratio" with the kit\'s `agent-progress-loading-text` shimmer.',
  ],

  constants: [
    {
      name: 'tray and card',
      value: 'tray radius 26px with 6px padding, card radius 20px, 12px padding and 12px gaps',
      why: 'The 6px tray reads as a frame around the card, and the inner radius is the outer one minus the padding, so the two curves stay concentric.',
    },
    {
      name: 'prompt rows',
      value: 'auto-resize from 2 to 6 lines, 600 characters',
      why: 'Two lines invite a sentence rather than a keyword. Six lines is where the toolbar would leave a laptop viewport, so the field scrolls from there.',
    },
    {
      name: 'aspect ratios',
      value: '1:1 1024², 4:5 896×1120, 3:2 1216×832, 16:9 1344×768, 9:16 768×1344',
      why: 'Common output sizes of current diffusion models, each about one megapixel and divisible by 64, so every ratio costs roughly the same to render.',
    },
    {
      name: 'image count',
      value: '1 to 4 (maxImages)',
      why: 'Four is a full row of thumbnails under the message. More belongs to a batch tool, not a chat.',
    },
  ],

  pitfalls: [
    'Submitting on a plain Enter. A prompt is often several lines, so Enter must stay a newline; only ⌘ / Ctrl + Enter submits, and the button advertises it through `aria-keyshortcuts`.',
    'Calling `onGenerate` straight from the shortcut. It would skip the guard in `onSubmit` and send blank prompts. `requestSubmit()` routes the shortcut through the same handler as the button.',
    'Putting the focus ring on the textarea shell inside the card. It draws a box within a box. The shell is made transparent and the card reacts to `has-[textarea:focus]` instead.',
    'Swapping a submit Generate and a `type="button"` Stop in place. React reuses the DOM node, so a click on Stop re-renders it as a submit button before the browser runs the click\'s default action, and the form submits again: the run restarts instead of stopping. One submit button that changes its label and `onSubmit` branch avoids it.',
    'Letting a cleared NumberField pass `NaN` into the request. The change handler maps it back to 1.',
  ],

  notes: [
    '`ASPECT_RATIOS` and `IMAGE_STYLES` are exported defaults; pass `aspectRatios` and `styleOptions` to use your model\'s sizes and presets.',
    'The form keeps its own prompt, ratio, count and styles. It does not clear the prompt after a run, so a user can tweak and regenerate.',
  ],

  apiSignature:
    'function ImagePromptComposer(props: ImagePromptComposerProps): JSX.Element\ninterface ImagePromptComposerProps { defaultPrompt?: string; placeholder?: string; aspectRatios?: readonly AspectRatioOption[]; defaultAspectRatio?: string; styleOptions?: readonly StyleOption[]; defaultStyles?: Iterable<string>; defaultCount?: number; maxImages?: number; maxLength?: number; isGenerating?: boolean; onGenerate?: (request: ImagePromptRequest) => void; onStop?: () => void; className?: string }\ninterface ImagePromptRequest { prompt: string; aspectRatio: AspectRatioOption; count: number; styles: string[] }\ninterface AspectRatioOption { id: string; label: string; width: number; height: number }\ninterface StyleOption { id: string; label: string; swatch: readonly [string, string] }',

  props: [
    { name: 'defaultPrompt', type: 'string', default: '""', description: 'Initial prompt text.' },
    { name: 'placeholder', type: 'string', default: '"Describe the image you want…"', description: 'Prompt placeholder; also the field\'s hint.' },
    { name: 'aspectRatios', type: 'readonly AspectRatioOption[]', default: 'ASPECT_RATIOS', description: 'Ratio options with their output size.' },
    { name: 'defaultAspectRatio', type: 'string', description: 'Id of the starting ratio; the first option when omitted.' },
    { name: 'styleOptions', type: 'readonly StyleOption[]', default: 'IMAGE_STYLES', description: 'Style chips with a two-colour swatch each.' },
    { name: 'defaultStyles', type: 'Iterable<string>', description: 'Style ids selected at first.' },
    { name: 'defaultCount', type: 'number', default: '1', description: 'Starting image count.' },
    { name: 'maxImages', type: 'number', default: '4', description: 'Upper bound of the count stepper.' },
    { name: 'maxLength', type: 'number', default: '600', description: 'Character limit on the prompt.' },
    { name: 'isGenerating', type: 'boolean', default: 'false', description: 'Locks the form, swaps Generate for Stop and shimmers the footer.' },
    { name: 'onGenerate', type: '(request: ImagePromptRequest) => void', description: 'Called on submit with the trimmed prompt, ratio, count and styles.' },
    { name: 'onStop', type: '() => void', description: 'Called when the button is pressed during a run (it reads Stop then).' },
    { name: 'className', type: 'string', description: 'Merged onto the tray.' },
  ],

  reducedMotion:
    'With prefers-reduced-motion the chips and the card change colour and ring without a transition, and the kit Textarea, Select and NumberField follow their own reduced-motion rules. The footer shimmer is the kit\'s `agent-progress-loading-text`, which stops moving and keeps its text readable.',

  cleanup:
    'The component adds no listeners, timers or observers of its own: the shortcut is a React `onKeyDown` on the field, and the Select\'s outside-press listener and the Textarea\'s resize measuring belong to those kit parts. The demo\'s fake run is one `setTimeout`, cleared when the run ends, is stopped or the demo unmounts.',

  acceptance:
    'A grey tray holds a white card with six style chips (Illustration selected), the prompt "A hoopoe on an olive branch, warm paper texture", a 4:5 ratio select and a stepper at 2. The footer reads "2 images · 896 × 1120". Clearing the prompt makes Generate look disabled and the footer reads "Write a prompt to generate"; clicking it does nothing. Generate (or ⌘/Ctrl + Enter) shows the prompt as a bubble with two shimmering frames, locks the form, swaps in Stop and shimmers "Generating 2 images · 4:5"; after about 2.4s two pictures fade in and the status reads "2 ready". Stop during a run leaves dashed "Stopped" frames.',

  criticalRegion: 'critical',
};

export default meta;
