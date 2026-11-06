/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Row Actions" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'row-actions',
  title: 'Row Actions',
  category: 'overlay',
  kit: 'boardui',
  tags: ['boardui', 'table', 'kebab', 'dropdown', 'confirm', 'dashboard'],
  blurb: 'Kebab menu at the end of a table row with Edit, Duplicate and a red Delete that asks first through the kit AlertDialog.',
  cost: 'css',
  motif: 'stack',
  files: [{ path: 'registry/ui/row-actions.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],
  summary:
    'The action cluster from the BoardUI finance table rows: a 32px bordered kebab that opens the kit Dropdown with Edit, Duplicate and Delete. Delete never fires straight away; it opens the kit AlertDialog with a row-specific title and focus on Cancel. With inline, delete and edit also appear as 32px icon buttons in front of the kebab, as in the reference, and fold into the kebab on phones. The component owns no row data: it calls onEdit, onDuplicate and onDelete and the table updates itself.',
  mechanism: [
    'The kebab is the kit DropdownTrigger styled with the exported buttonStyles (secondary, small, icon-only), so it matches the inline kit Buttons beside it; while the menu is open it keeps the pressed background and border.',
    'The menu is the kit Dropdown (non-modal React Aria popover with outside-press dismissal) narrowed to w-48 with p-1.5 and denser px-2 py-1.5 rows; only actions with a handler are rendered, and Delete sits under a divider in text-error-primary with a tertiary-error hover.',
    'Choosing a row first focuses the kebab, then closes the panel and runs the action. Any dialog opened next (the caller\'s edit form, the confirm) therefore records the kebab as its restore target instead of a menu row that is about to unmount.',
    'Delete, from the menu or the inline trash button, only sets confirmOpen. The kit AlertDialog (role=alertdialog, no backdrop dismissal, focus on Cancel) calls onDelete on confirm, and an async onDelete keeps it open with a busy Delete button until the promise settles.',
    'Inline buttons carry max-sm:hidden, so below 640px the row keeps a single kebab that still holds every action.',
  ],
  constants: [
    { name: 'button size', value: '32px (kit Button small icon-only), gap-2', why: 'Matches the finance table\'s trash / edit / kebab squares and keeps a comfortable touch target.' },
    { name: 'menu width', value: 'w-48, p-1.5', why: 'Three short verbs do not need the 266px kit default; the narrow panel stays inside the row on phones.' },
    { name: 'placement', value: "'bottom end', offset 4", why: 'The kebab is the last cell, so the panel grows leftwards into the table instead of off the edge.' },
    { name: 'danger row', value: 'text-error-primary, bg-background-tertiary-error on hover', why: 'Marks the destructive verb in both themes before the confirm even appears.' },
  ],
  pitfalls: [
    'Deleting the row unmounts the focused controls and the open dialog with it; move focus to a neighbouring row (the demo uses its kebab) or focus drops to <body>.',
    'Do not pass a ref to DropdownTrigger: it would replace the Dropdown\'s own trigger ref and break outside-press and toggle handling. RowActions finds the kebab through data-row-actions-trigger instead.',
    'Give every row a distinct name; the labels ("Actions for Ana Carter", "Delete Ana Carter?") are the only thing that tells repeated buttons apart.',
  ],
  notes: [
    'Leave out onDuplicate (or onEdit) to drop that row from the menu; without onDelete there is no divider and no dialog.',
    'Pass confirmDescription with the row\'s details ("The $640 payment from Jun 12 ...") so the confirm says exactly what goes away.',
  ],
  apiSignature:
    'export function RowActions({ name, onEdit, onDuplicate, onDelete, inline, confirmTitle, confirmDescription, confirmLabel, placement, className }: RowActionsProps): JSX.Element',
  props: [
    { name: 'name', type: 'string', description: 'Row name used in the kebab, inline and dialog labels.' },
    { name: 'onEdit', type: '() => void', description: 'Adds Edit to the menu (and the inline pencil).' },
    { name: 'onDuplicate', type: '() => void', description: 'Adds Duplicate to the menu.' },
    { name: 'onDelete', type: '() => void | Promise<unknown>', description: 'Adds Delete and runs after confirmation; a promise keeps the dialog busy.' },
    { name: 'inline', type: 'boolean', default: 'false', description: 'Show delete and edit as icon buttons before the kebab from 640px up.' },
    { name: 'confirmTitle', type: 'ReactNode', default: '`Delete ${name}?`', description: 'Confirm dialog title.' },
    { name: 'confirmDescription', type: 'ReactNode', description: 'Confirm dialog body; defaults to a generic cannot-undo line.' },
    { name: 'confirmLabel', type: 'ReactNode', default: "'Delete'", description: 'Label of the danger button.' },
    { name: 'placement', type: "'bottom end' | 'bottom start' | 'top end' | 'top start'", default: "'bottom end'", description: 'Menu placement relative to the kebab.' },
  ],
  reducedMotion:
    'The kit Dropdown drops its fade, scale and blur under reduced motion and the kit AlertDialog keeps only its fade; RowActions adds no motion of its own.',
  cleanup: 'No timers or listeners of its own. The kit Dropdown removes its outside-press listener on close and unmount, and the modal releases its scroll lock when it unmounts.',
  acceptance:
    'Opening "Actions for Mia Chen" shows Edit, Duplicate and Delete; Duplicate inserts "Mia Chen (copy)" below it and the count reads 6 payments; Delete asks "Delete Mia Chen?" with focus on Cancel, Cancel keeps the row, Delete removes it, the count drops and focus lands on the next row\'s kebab.',
  criticalRegion: 'critical',
};

export default meta;
