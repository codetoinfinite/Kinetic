import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'composer-panel',
  title: 'Composer Panel',
  category: 'form',
  kit: 'boardui',
  tags: ['composer', 'chat', 'textarea', 'agent', 'prompt', 'boardui'],
  blurb:
    'Two-row agent composer: a growing prompt over a toolbar with add, permission mode, model and send, plus a status tab with a context ring.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/composer-panel.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The taller composer for agent surfaces. A radius-24 card holds the prompt on top and the controls underneath: a round + that opens the file picker, a permission picker (Auto, Manual, Plan mode, Bypass all), a model menu, an optional mic and send. A 34px grey status tab can hang off the top edge with the branch, the project folder and a 16px context ring. Send is live only when there is text; Enter sends and Shift+Enter breaks the line.',

  mechanism: [
    'The prompt is a one-row `<textarea>`. A layout effect on every draft change sets `height: auto`, reads `scrollHeight`, and writes back `min(scrollHeight, 10 lines × 20px + 20px padding)`. Resetting to auto first lets the field shrink when lines are deleted; past ten lines it stops growing and scrolls.',
    '`onKeyDown` sends on Enter unless Shift is held or `nativeEvent.isComposing` is true, so an IME confirming a word never sends half a message. Shift+Enter falls through to the textarea\'s own newline. The form\'s submit handler calls the same `send()`.',
    '`send()` returns early unless the trimmed draft is non-empty and `disabled` is false. It calls `onSubmit({ text, attachments, model, permission })`, clears the draft and the attachment strip, and puts focus back in the field. The send button is `disabled` by the same check, and the kit `bg-button-primary` utility paints its own grey disabled gradient.',
    'The + is a `ComposerAttachButton` from Composer Attachments: a button that clicks a hidden `<input type="file" multiple>`. Picked files become tiles through `attachmentsFromFiles`, each batch prefixed by a counter so the same file picked twice gets a new id. Tiles render in a `ComposerAttachments` strip above the prompt, and their dismiss removes them.',
    'The permission and model pickers are kit `Dropdown`s with controlled `isOpen`, opening upward (`top start` and `top end`). Each row is a `DropdownItem` with a label, a one-line description and a check on the current choice; choosing a row sets state and closes the menu. The permission trigger shows its surface only on hover, press or while open, so at rest it reads as a label.',
    '`ComposerStatusTab` is a separate element passed through the `status` slot, inset 28px (`mx-7`) with top corners rounded. Its ring is two SVG circles rotated -90°; the arc uses `pathLength={100}` and `strokeDasharray="<pct> 100"`, so the percentage maps straight onto the dash. It is exposed as `role="meter"` with `aria-valuenow`.',
  ],

  constants: [
    {
      name: 'MAX_LINES',
      value: '10',
      why: 'Long enough for a pasted paragraph or a short stack trace without the toolbar leaving the screen; beyond that the field scrolls.',
    },
    {
      name: 'LINE_HEIGHT / FIELD_PADDING_Y',
      value: '20px / 20px',
      why: 'text-body-regular is 14/20, and the textarea carries pt-3.5 + pb-1.5. `scrollHeight` includes padding, so the cap must add it or the tenth line is clipped.',
    },
    {
      name: 'status tab',
      value: '34px high, 28px inset, composer-panel-tab-background',
      why: 'Inset more than the card\'s 24px radius, so the tab meets the flat part of the top edge and never the curve. The token is neutral-200 in light and half-opacity neutral-700 in dark, so it separates from the card in both themes.',
    },
    {
      name: 'card radius',
      value: '24px (rounded-3xl)',
      why: 'Close to concentric with the round 36px controls in the 8px-padded toolbar (18 + 8 = 26px), so the + and send sit evenly inside the curve. A smaller radius leaves a visible gap at the corners.',
    },
  ],

  pitfalls: [
    'Measuring `scrollHeight` without first setting `height: auto`. The field can then grow but never shrink back after text is deleted.',
    'Sending on every Enter. During IME composition (Japanese, Chinese, Korean) Enter confirms the candidate; check `isComposing` or the half-typed word is sent.',
    'Leaving the dropdowns uncontrolled. Kit `DropdownItem` is a plain button and does not close its popover; the panel closes each menu in `onSelect`.',
    'Painting a background over the disabled send button. `bg-button-primary` already has a disabled gradient; overriding it breaks dark mode. Only the icon colour changes.',
  ],

  notes: [
    'Attachments live inside the panel and are handed to `onSubmit`, then cleared. Nothing is uploaded; only names and sizes are read from the picked files.',
    'The mic button appears only when `onVoice` is passed. The panel does no speech recognition; `voiceActive` only sets its pressed look.',
    'The demo lists what was sent with the model and permission each message went out with, and moves the context ring up by 6% per turn.',
  ],

  apiSignature:
    'function ComposerPanel(props: { placeholder?: string; status?: ReactNode; models?: ComposerModel[]; defaultModel?: string; defaultPermission?: ComposerPermission; onSubmit?: (message: ComposerPanelMessage) => void; disabled?: boolean; onVoice?: () => void; voiceActive?: boolean; accept?: string; inputRef?: RefObject<HTMLTextAreaElement | null>; className?: string }): JSX.Element\nfunction ComposerStatusTab(props: { branch?: string; project?: string; context?: number; className?: string }): JSX.Element\ninterface ComposerPanelMessage { text: string; attachments: ComposerAttachment[]; model: ComposerModel; permission: ComposerPermission }\ntype ComposerPermission = "auto" | "manual" | "plan" | "bypass"',

  props: [
    { name: 'placeholder', type: 'string', default: '"Hi, what do you need today?"', description: 'Prompt placeholder.' },
    { name: 'status', type: 'ReactNode', description: 'Slot above the card, usually a `ComposerStatusTab`. Omit for the bare card.' },
    { name: 'models', type: 'ComposerModel[]', default: 'COMPOSER_MODELS', description: 'Rows of the model menu: `{ id, name, description? }`.' },
    { name: 'defaultModel', type: 'string', description: 'Model id to start on. Defaults to the first model.' },
    { name: 'defaultPermission', type: 'ComposerPermission', default: '"auto"', description: 'Starting permission mode.' },
    { name: 'onSubmit', type: '(message: ComposerPanelMessage) => void', description: 'Receives the trimmed text, attachments, model and permission. The panel clears itself after.' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Greys out send while a turn is in flight. Typing stays possible.' },
    { name: 'onVoice', type: '() => void', description: 'Shows the mic button and is called when it is pressed.' },
    { name: 'voiceActive', type: 'boolean', default: 'false', description: 'Pressed state of the mic button.' },
    { name: 'accept', type: 'string', description: 'Forwarded to the file input, e.g. "image/*,.pdf".' },
    { name: 'inputRef', type: 'RefObject<HTMLTextAreaElement | null>', description: 'Reaches the prompt field, e.g. to focus it.' },
    { name: 'context', type: 'number', description: '`ComposerStatusTab`: context window used, 0-100, drawn as a 16px ring and a percentage.' },
  ],

  reducedMotion:
    'Hover colours, the chevron flip and the send press scale carry `motion-reduce:transition-none` (and `motion-reduce:active:scale-100`), and the attachment pop-in is behind `motion-safe:`, so states change instantly. The kit dropdown handles its own open animation.',

  cleanup:
    'The panel holds no timers, listeners or observers. The textarea height is set inline in a layout effect and recomputed on each change; the dropdowns clean up through React Aria.',

  acceptance:
    'A status tab with branch, folder and a context ring sits on top of a white card. Send stays grey until text is typed. Typing several lines grows the field; Shift+Enter adds a line and Enter sends. The demo lists the sent message with its model and permission mode and the ring moves up. The permission picker lists four modes with descriptions and a check, the model menu switches the label, and + opens the browser file picker.',

  criticalRegion: 'critical',
};

export default meta;
