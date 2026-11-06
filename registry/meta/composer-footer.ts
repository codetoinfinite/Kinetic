import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'composer-footer',
  title: 'Composer Footer',
  category: 'form',
  kit: 'boardui',
  tags: ['composer', 'chat', 'toolbar', 'send', 'stop', 'boardui'],
  blurb:
    'Bottom bar of a chat composer: attach, tool toggles, a model slot and a key hint, with a send button that becomes stop while replying.',
  cost: 'dom',
  motif: 'orbit',

  files: [
    {
      path: 'registry/ui/composer-footer.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'The row under a composer prompt. On the left are a paperclip that opens the file picker, icon toggles for tools such as web search, and a slot for a model picker. A keyboard hint fills the middle, and on the right one round button sends, then turns into stop while a reply is generating, with an accent arc spinning around it. The footer owns no text field; the host passes `canSend`, `generating` and the two callbacks.',

  mechanism: [
    '`SendStopButton` is a single React Aria `Button`. While `generating` it is labelled "Stop generating" and calls `onStop`; otherwise it is labelled "Send", calls `onSend`, and is disabled until `canSend` is true. Keeping one element means focus and the pointer stay put when the job flips.',
    'The arrow and the stop square share one grid cell (`[grid-area:1/1]`). The one not in use goes to `scale-50 opacity-0 blur-[2px]` and the other to full size, over a 200ms transition, so the icons cross-fade instead of jumping.',
    'An SVG circle sits 4px outside the button. Its arc is `strokeDasharray="28 100"` on `pathLength={100}`, and while generating the SVG fades in and gets `motion-safe:animate-spin`. A visually hidden `role="status"` span says "Generating a reply" for screen readers.',
    'Tools are React Aria `ToggleButton`s, so each one exposes `aria-pressed`. The set of active ids is controlled through `activeTools` / `onToolsChange`, or kept in local state seeded from `defaultActiveTools`. Pressed tools take the `status-blue` background and text tokens.',
    'The paperclip is a React Aria `Button` that clicks a hidden `<input type="file" multiple>`. Picked files go to `onAttach` as `File[]`, and the input is cleared so the same file can be picked again. Nothing is read or uploaded.',
    'The root is a container (`@container`). The hint paragraph carries `@max-[34rem]:hidden`, so in a narrow composer it disappears before the buttons have to shrink. The model slot is `min-w-0 shrink`, so a long model name truncates instead of pushing send off the edge.',
  ],

  constants: [
    {
      name: 'send button',
      value: '36px, arc ring 44px',
      why: 'The ring sits 4px outside the button, which leaves a visible gap. The arc covers 28% of the circle, enough to read as spinning without looking like a progress bar.',
    },
    {
      name: 'hint breakpoint',
      value: 'container width 34rem',
      why: 'Below this, the hint would truncate into fragments like "Enter to se…". Hiding it entirely keeps the controls intact at phone widths.',
    },
    {
      name: 'tooltip delay',
      value: '300ms',
      why: 'The kit tooltip defaults to no delay. In a row of five icon buttons, that makes tooltips flash while the pointer is moving across to send.',
    },
  ],

  pitfalls: [
    'Rendering separate send and stop buttons. Swapping them unmounts the focused button, so keyboard focus drops to the page body mid-reply.',
    'Disabling the button while generating. Stop must stay pressable, so the disabled check only applies when not generating.',
    'Expecting the footer to send on Enter. It has no text field. The default hint describes the usual wiring, which the host does in its textarea\'s `onKeyDown`; pass `hint` if your keys differ.',
  ],

  notes: [
    'The demo streams a canned reply one word every 55ms from an interval that is cleared on completion, on stop and on unmount. Escape in the prompt also stops it.',
    'The model slot accepts any node. The demo passes a ghost `ModelSelect`, and attachments render above the prompt with `ComposerAttachments`. Below a 26rem container the demo hides the model name (`@max-[26rem]:[&_[data-model-name]]:sr-only`) so only the monogram shows, and the footer tightens its gap from 4px to 2px.',
    'The tool list is sample data: Search the web, Run code and Think longer. Pass `tools` with your own `{ id, label, icon }` entries.',
  ],

  apiSignature:
    'function ComposerFooter(props: { onAttach?: (files: File[]) => void; accept?: string; tools?: ComposerTool[]; activeTools?: string[]; defaultActiveTools?: string[]; onToolsChange?: (ids: string[]) => void; model?: ReactNode; hint?: ReactNode; canSend?: boolean; generating?: boolean; onSend?: () => void; onStop?: () => void; className?: string }): JSX.Element\ninterface ComposerTool { id: string; label: string; icon: RemixiconComponentType }',

  props: [
    { name: 'onAttach', type: '(files: File[]) => void', description: 'Shows the paperclip and receives picked files.' },
    { name: 'accept', type: 'string', description: 'Forwarded to the file input.' },
    { name: 'tools', type: 'ComposerTool[]', default: 'COMPOSER_TOOLS', description: 'Icon toggles after the paperclip. Pass `[]` to hide them.' },
    { name: 'activeTools', type: 'string[]', description: 'Controlled ids of switched-on tools.' },
    { name: 'defaultActiveTools', type: 'string[]', default: '[]', description: 'Starting ids when uncontrolled.' },
    { name: 'onToolsChange', type: '(ids: string[]) => void', description: 'Called with the new set after a toggle.' },
    { name: 'model', type: 'ReactNode', description: 'Slot after a divider, usually a ghost `ModelSelect`.' },
    { name: 'hint', type: 'ReactNode', description: 'Overrides the default hint ("Enter to send…" or "Writing a reply…").' },
    { name: 'canSend', type: 'boolean', default: 'false', description: 'Enables send when not generating.' },
    { name: 'generating', type: 'boolean', default: 'false', description: 'Turns send into stop and spins the ring.' },
    { name: 'onSend', type: '() => void', description: 'Called when send is pressed.' },
    { name: 'onStop', type: '() => void', description: 'Called when stop is pressed. Without it the stop button is disabled.' },
    { name: 'className', type: 'string', description: 'Classes for the footer row.' },
  ],

  reducedMotion:
    'The ring keeps its arc but does not spin (`motion-safe:animate-spin`). The icon cross-fade, the ring fade and the press scale use `motion-reduce:transition-none` and `motion-reduce:data-[pressed]:scale-100`, so states switch instantly. Tooltips follow the kit\'s own reduced-motion rule.',

  cleanup:
    'The footer has no timers or listeners of its own; React Aria owns the press, toggle and tooltip handlers. The demo clears its streaming interval on completion, on stop and on unmount.',

  acceptance:
    'Send stays disabled until text is typed. Sending clears the prompt, the button turns into a stop square inside a spinning accent arc, and the reply streams in. Pressing stop, or Escape in the prompt, ends it and marks it Stopped. Letting it finish turns the button back into send. Tool toggles report pressed state, the paperclip opens the file picker, and the hint is hidden in narrow composers.',

  criticalRegion: 'critical',
};

export default meta;
