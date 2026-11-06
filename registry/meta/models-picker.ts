/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Models Picker" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'models-picker',
  title: 'Models Picker',
  category: 'form',
  kit: 'boardui',
  tags: ['models', 'agent', 'radio', 'switch', 'search', 'settings', 'boardui'],
  blurb:
    'A card of models with provider monograms: pick one with radios, or enable several with switches, a search filter and a live count.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/models-picker.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'The model list from an agent\'s settings. Each row shows a small tinted provider monogram, the model name and a control on the right. In `single` mode the rows form one radio group and the chosen row sits on a soft grey fill, the way an active-model menu reads. In `multiple` mode every row is a switch that adds the model to the composer, and the header keeps an "N of M enabled" count. A search field filters by name and provider, and `children` render under a divider for things like an effort slider.',

  mechanism: [
    'Split the props into a discriminated union on `selectionMode`: `single` takes `value: string` and `onChange(id)`, `multiple` takes `value: string[]` and `onChange(ids)`. Both are controlled-or-uncontrolled: local state seeds from `defaultValue` and `value` wins when given.',
    'Single mode renders a react-aria `RadioGroup` whose `Radio`s ARE the rows (monogram, name, kit `RadioDot`), so one Tab stop enters the list, arrow keys move and select, and the selected row gets `bg-background-secondary-default`.',
    'Multiple mode renders each row as a react-aria `Switch` with the kit `SwitchTrack` on the right, inside a `role="group"` named by the label. Toggling rebuilds the value by filtering `models` in their own order, so the array is stable no matter which order rows were flipped.',
    'The search query is trimmed, lowercased and matched against `name + provider + description`; the filtered list replaces the rows, and an empty result prints "No models match …" instead. The count in the header always counts the whole list, not the filtered rows.',
    'The monogram is a 28px rounded square with one or two letters (`monogram` or the provider\'s first letter) on a status tint, `aria-hidden`; the provider name is added as visually hidden text so the radio or switch is announced as "Fable 5, Anthropic".',
  ],

  constants: [
    {
      name: 'monogram',
      value: 'size-7, rounded 8px, caption-1 semibold',
      why: 'Big enough for two letters at a glance, small enough that the model name stays the first thing read.',
    },
    {
      name: 'row padding',
      value: 'px-2.5 py-2, rounded-2lg, 2px gap',
      why: 'The selected fill needs air around it inside the 6px card padding, and a 2px gap keeps adjacent hover fills from merging.',
    },
    {
      name: 'searchable default',
      value: 'more than 5 models',
      why: 'A short list is faster to scan than to search; past a screenful, a filter pays for its height.',
    },
  ],

  pitfalls: [
    'Wrapping a radio input in a clickable div. The row must BE the radio (or switch) so the whole row is the hit target and the accessible name covers the model, not just the dot.',
    'Counting the filtered rows. "2 of 8 enabled" must not drop to "1 of 3" while a search is typed.',
    'Drawing provider logos. The glyph is letters on a tint, which avoids trademark artwork and still tells providers apart.',
  ],

  notes: [
    'Pass `searchable` explicitly to force the field on a short list or hide it on a long one.',
    'The demo puts the kit `Slider` (0–3, no tooltip) under the active-model list as an effort control with Faster and Smarter labels.',
  ],

  apiSignature:
    'function ModelsPicker(props: ({ selectionMode?: "single"; value?: string; defaultValue?: string; onChange?: (id: string) => void } | { selectionMode: "multiple"; value?: string[]; defaultValue?: string[]; onChange?: (ids: string[]) => void }) & { models: ModelOption[]; label?: ReactNode; searchable?: boolean; searchPlaceholder?: string; children?: ReactNode; className?: string }): JSX.Element\ntype ModelOption = { id: string; name: string; provider: string; monogram?: string; tone?: ModelMonogramTone; description?: string; isDisabled?: boolean }',

  props: [
    { name: 'models', type: 'ModelOption[]', description: 'Rows in display order: id, name, provider, optional monogram letters, tint, caption and disabled flag.' },
    { name: 'selectionMode', type: '"single" | "multiple"', default: '"single"', description: 'Radio rows for one active model, or switch rows for an enabled set.' },
    { name: 'value', type: 'string | string[]', description: 'Controlled selection: an id in single mode, an id array in multiple mode.' },
    { name: 'defaultValue', type: 'string | string[]', description: 'Initial selection when uncontrolled.' },
    { name: 'onChange', type: '(id: string) => void | (ids: string[]) => void', description: 'Called with the new id or the new id array, in the models\' order.' },
    { name: 'label', type: 'ReactNode', default: '"Models"', description: 'Header title; a string also names the radio group or switch group.' },
    { name: 'searchable', type: 'boolean', default: 'models.length > 5', description: 'Show the search field above the rows.' },
    { name: 'searchPlaceholder', type: 'string', default: '"Search models"', description: 'Placeholder of the search field.' },
    { name: 'children', type: 'ReactNode', description: 'Footer content under a divider, e.g. an effort control.' },
    { name: 'className', type: 'string', description: 'Merged onto the card.' },
  ],

  reducedMotion:
    'The only motion is the 150ms row hover and selected fill, plus the kit switch thumb; rows carry `motion-reduce:transition-none` and the switch track follows its own reduced-motion rule.',

  cleanup:
    'Nothing to clean up: state is the query and the uncontrolled selection, with no timers, listeners or observers.',

  acceptance:
    'Left card: "Fable 5" is selected; clicking "Sonnet 5" moves the grey fill and the radio, and ArrowDown from it wraps to "Composer 2.5". Pressing ArrowRight on the Effort slider changes "Medium" to "High". Right card reads "4 of 8 enabled"; switching on Gemini makes it "5 of 8"; typing "anthropic" leaves 3 rows with the count unchanged, and "zzz" shows "No models match".',

  criticalRegion: 'critical',
};

export default meta;
