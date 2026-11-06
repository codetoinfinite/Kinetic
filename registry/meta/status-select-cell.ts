/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Status Select Cell" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'status-select-cell',
  title: 'Status Select Cell',
  category: 'form',
  kit: 'boardui',
  tags: ['boardui', 'status', 'select', 'table', 'pill', 'inline-edit'],
  blurb: 'Table status pill in status-* colours that is also a select: hover reveals a chevron, press or Enter opens the list to change it.',
  cost: 'css',
  motif: 'stack',
  files: [{ path: 'registry/ui/status-select-cell.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['react-aria-components@^1.22.1', '@remixicon/react@^4.9.0'],
  summary:
    'The coloured status badge from BoardUI table rows ("Recovering", "Under observation", "Critical") turned into its own editor. It is a React Aria Select whose trigger wears the kit Chip colours, so the cell still reads as a static pill; hovering or focusing reveals a chevron, and the list shows each status as its own pill with a check on the current one. Arrow keys, type-ahead, Enter and Escape come from the listbox.',
  mechanism: [
    'Value is controlled (value + onChange) or uncontrolled (defaultValue); the current option is looked up in options by id and its color picks the bg/text pair from the kit CHIP_COLORS map (status-*-background / status-*-text tokens).',
    'A React Aria Select wraps an AriaButton styled as the pill (rounded-md, py-0.5, ps-1.5, text-body-medium) whose SelectValue renders only the option label, so the trigger\'s accessible name is "<label> <aria-label>", e.g. "Critical Status for Livia Saris".',
    'A ChevronDownSmall sits at the end of the pill collapsed to width 0 and opacity 0; on data-hovered or data-focus-visible (and always on hover:none touch screens or while open) it grows to 14px wide at 0.7 opacity, 2px from the label and pulled 4px into the end padding, and rotates 180deg while open.',
    'The Popover is isNonModal like the kit Select, so it never locks <html> scroll; the kit useDismissOnOutsidePress and useTriggerToggle hooks restore outside-press closing and trigger toggling with a controlled isOpen.',
    'Each ListBoxItem renders the status pill and an optional description as React Aria Text slots (label / description, so the option is named by its label and described by the line), plus a RiCheckLine that is visible only when isSelected; choosing the current status is ignored, any other calls onChange(id) and the listbox returns focus to the pill.',
  ],
  constants: [
    { name: 'popover width', value: 'w-60 (240px), offset 6px', why: 'Fits the longest pill ("Under observation") plus a one-line description and the check column.' },
    { name: 'chevron', value: 'w-0 -> w-3.5 (ms-0.5, -me-1), opacity 0 -> 0.7', why: 'At rest the pill is as tight as a static badge; on hover the chevron signals "editable" without turning every row into a form field.' },
    { name: 'hover ring', value: 'ring-1 ring-current/25', why: 'Derived from the pill\'s own text colour, so the hover outline matches every status tone in light and dark.' },
    { name: 'focus ring', value: 'ring-2 ring-border-focus-ring ring-offset-1', why: 'The kit focus treatment; the offset keeps it legible against tinted pills.' },
    { name: 'list height', value: 'max-h-[280px]', why: 'Five statuses with descriptions fit without scrolling; longer workflows scroll inside the surface.' },
  ],
  pitfalls: [
    'Do not render the label as plain children of the trigger without SelectValue: React Aria labels the button with the SelectValue id, and the value would drop out of the accessible name.',
    'Pass a row-specific aria-label ("Status for John Clarkson"); a column of identical "Status" names is useless to screen-reader users.',
    'If the popover is made modal instead, React Aria puts overflow:hidden on <html> while open, which jumps pages that scroll the root element.',
  ],
  notes: [
    'size="sm" uses caption text for dense tables; chevron="always" suits touch-first layouts, chevron="none" a pure badge look.',
    'Options without a match render a dashed placeholder pill ("Set status").',
  ],
  apiSignature:
    'export function StatusSelectCell<K extends string = string>({ options, value, defaultValue, onChange, "aria-label", size, chevron, placeholder, isDisabled, placement, className, popoverClassName }: StatusSelectCellProps<K>): JSX.Element',
  props: [
    { name: 'options', type: 'readonly StatusOption<K>[]', description: 'Each { id, label, color: ChipColor, description? }.' },
    { name: 'value / defaultValue', type: 'K', description: 'Selected status id, controlled or initial.' },
    { name: 'onChange', type: '(value: K) => void', description: 'Called when a different status is picked.' },
    { name: 'aria-label', type: 'string', default: "'Status'", description: 'Accessible name; include the row, e.g. "Status for Ana Carter".' },
    { name: 'size', type: "'md' | 'sm'", default: "'md'", description: 'Body (14px) or caption (12px) pill text.' },
    { name: 'chevron', type: "'hover' | 'always' | 'none'", default: "'hover'", description: 'When the dropdown chevron is shown.' },
    { name: 'placeholder', type: 'ReactNode', default: "'Set status'", description: 'Shown in a dashed pill when nothing matches.' },
    { name: 'isDisabled', type: 'boolean', default: 'false', description: 'Renders the pill at 60% opacity and blocks opening.' },
    { name: 'placement', type: "'bottom start' | 'bottom end' | 'top start' | 'top end'", default: "'bottom start'", description: 'Popover placement relative to the pill.' },
  ],
  reducedMotion:
    'Ring and chevron transitions are removed (motion-reduce:transition-none) and the popover drops its scale and blur entry, keeping only the opacity fade.',
  cleanup: 'Its only listeners are the kit hooks\' capture-phase pointerdown handlers, added while open and removed on close or unmount; the toggle hook\'s 400ms safety timeout only clears a ref.',
  acceptance:
    'Tabbing to "Critical Status for Livia Saris" and pressing Enter opens a list of five status pills with a check on Critical; typing "S" moves to "Stable" and Enter closes it, the pill turns lime and reads Stable, the Critical count drops to 0 and Stable rises to 3.',
  criticalRegion: 'critical',
};

export default meta;
