import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'model-select',
  title: 'Model Select',
  category: 'form',
  kit: 'boardui',
  tags: ['select', 'model', 'composer', 'chat', 'listbox', 'boardui'],
  blurb:
    'Model picker on the kit Select. Rows show a tinted monogram, name, description, New/Pro badges and a check on the current model.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/model-select.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A model picker for chat composers, built on the kit Select so it keeps React Aria listbox behaviour: arrow keys, typeahead, Escape and screen-reader selection state. Each row shows a tinted two-letter monogram, the model name with optional New and Pro badges, a muted description and a check on the selected model. The trigger shows a small monogram and the name; the ghost variant sits flat in a toolbar, and the outline variant is the regular bordered field.',

  mechanism: [
    'The kit `Select` is driven through `selectedKey` and `onSelectionChange`. When `value` is passed the component is controlled; otherwise it keeps its own pick in state, seeded from `defaultValue` or the first enabled model. `onChange` receives both the id and the full model object.',
    'Rows are kit `SelectItem`s (React Aria `ListBoxItem`) with `textValue` set to the model name, so typing "de" jumps to Deep 1 even though the row also holds badges and a description.',
    'Inside each row the name and badges sit in a React Aria `Text slot="label"` and the description in `Text slot="description"`. The option is labelled by the name and described by the line under it, so the description is announced as a hint, not as part of the name.',
    'The monogram is the `monogram` field or, when it is missing, the first character of the first two words of the name ("Deep 1" becomes "D1"). Its square takes a `status-*-background` / `status-*-text` token pair from `tone`, which the kit theme defines for light and dark.',
    'The check is always rendered and switches between `opacity-0` and `opacity-100`, so rows never shift width when the selection moves. React Aria already sets `aria-selected` on the option, so the icon is `aria-hidden`.',
    '`renderValue` puts a 20px monogram and the name in the trigger. `compact` makes the name `sr-only`, leaving only the monogram on screen while the trigger keeps its accessible text.',
  ],

  constants: [
    {
      name: 'popover size',
      value: '320px wide, list up to 336px tall',
      why: 'Wide enough for a name with both badges and a description of about 34 characters on one line; the kit menu surface caps it at `100vw - 32px` on phones. The kit listbox stops at 240px, which would hide the fifth two-line row, so the popover lifts that cap through a `[&_[role=listbox]]` variant and longer lists scroll past 336px.',
    },
    {
      name: 'monogram',
      value: '32px rows / 20px trigger, two characters',
      why: 'Two characters keep model families apart ("S2" and "SM") without becoming a logo. 32px matches the height of the two-line text block, so rows stay centred.',
    },
    {
      name: 'GHOST_TRIGGER',
      value: 'transparent border, background and shadow; secondary surface on hover or press',
      why: 'Inside a composer toolbar a bordered field reads as a form input. The ghost trigger looks like a label until it is pointed at.',
    },
  ],

  pitfalls: [
    'Leaving out `textValue` on rows with rich content. React Aria then cannot build typeahead text or the trigger\'s accessible value from the row.',
    'Putting the description inside the label. Screen readers then read "Deep 1 Slower, reasons for longer" as the model\'s name; the `description` slot keeps it as a hint.',
    'Mounting the check only on the selected row. The text column then reflows as the check appears; toggling opacity keeps every row the same width.',
  ],

  notes: [
    'The model list, names and descriptions are sample data. Pass your own `models`; badges are any mix of `"new"` and `"pro"`.',
    'Disabled models go to the kit Select as `disabledKeys`, and the uncontrolled default skips them.',
    'The kit Select places its popover below the trigger and flips it above when there is no room, which is what happens at the foot of a chat.',
  ],

  apiSignature:
    'function ModelSelect(props: { models?: ModelOption[]; value?: string; defaultValue?: string; onChange?: (id: string, model: ModelOption) => void; variant?: "ghost" | "outline"; size?: "sm" | "md"; label?: ReactNode; "aria-label"?: string; isDisabled?: boolean; compact?: boolean; className?: string }): JSX.Element\ninterface ModelOption { id: string; name: string; description?: string; monogram?: string; tone?: ModelTone; badges?: ("new" | "pro")[]; isDisabled?: boolean }',

  props: [
    { name: 'models', type: 'ModelOption[]', default: 'MODEL_OPTIONS', description: 'Rows of the menu, in order.' },
    { name: 'value', type: 'string', description: 'Selected model id. Passing it makes the select controlled.' },
    { name: 'defaultValue', type: 'string', description: 'Starting model when uncontrolled. Defaults to the first enabled model.' },
    { name: 'onChange', type: '(id: string, model: ModelOption) => void', description: 'Called with the new id and its model when a row is chosen.' },
    { name: 'variant', type: '"ghost" | "outline"', default: '"ghost"', description: 'Flat trigger for toolbars, or the kit\'s bordered field.' },
    { name: 'size', type: '"sm" | "md"', default: '"md"', description: 'Trigger and row density, passed to the kit Select. `sm` also shrinks the row monograms.' },
    { name: 'label', type: 'ReactNode', description: 'Visible label above the trigger. Without it the select is named by `aria-label`.' },
    { name: 'aria-label', type: 'string', default: '"Model"', description: 'Accessible name when there is no visible label.' },
    { name: 'isDisabled', type: 'boolean', description: 'Disables the whole select.' },
    { name: 'compact', type: 'boolean', default: 'false', description: 'Shows only the monogram in the trigger; the name stays for screen readers.' },
    { name: 'className', type: 'string', description: 'Classes for the select wrapper.' },
  ],

  reducedMotion:
    'The check fades with `motion-reduce:transition-none`, so it switches instantly. The popover open animation and chevron turn come from the kit Select.',

  cleanup:
    'The component adds no timers or listeners of its own. Open state, outside-press dismissal and focus restore belong to the kit Select and React Aria.',

  acceptance:
    'The trigger shows a tinted monogram and the model name. Opening it lists five models with descriptions; Atlas 3 and Lumen 1 carry New, Deep 1 and Lumen 1 carry Pro. The current model has a check. Choosing a row closes the menu, moves the check and updates the trigger and the demo sentence. Arrow keys and typeahead work, and Escape closes the menu.',

  criticalRegion: 'critical',
};

export default meta;
