# Build: Row Actions

The action cluster from the BoardUI finance table rows: a 32px bordered kebab that opens the kit Dropdown with Edit, Duplicate and Delete. Delete never fires straight away; it opens the kit AlertDialog with a row-specific title and focus on Cancel. With inline, delete and edit also appear as 32px icon buttons in front of the kebab, as in the reference, and fold into the kebab on phones. The component owns no row data: it calls onEdit, onDuplicate and onDelete and the table updates itself.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Kebab menu at the end of a table row with Edit, Duplicate and a red Delete that asks first through the kit AlertDialog.

- Category: overlay
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. The kebab is the kit DropdownTrigger styled with the exported buttonStyles (secondary, small, icon-only), so it matches the inline kit Buttons beside it; while the menu is open it keeps the pressed background and border.
2. The menu is the kit Dropdown (non-modal React Aria popover with outside-press dismissal) narrowed to w-48 with p-1.5 and denser px-2 py-1.5 rows; only actions with a handler are rendered, and Delete sits under a divider in text-error-primary with a tertiary-error hover.
3. Choosing a row first focuses the kebab, then closes the panel and runs the action. Any dialog opened next (the caller's edit form, the confirm) therefore records the kebab as its restore target instead of a menu row that is about to unmount.
4. Delete, from the menu or the inline trash button, only sets confirmOpen. The kit AlertDialog (role=alertdialog, no backdrop dismissal, focus on Cancel) calls onDelete on confirm, and an async onDelete keeps it open with a busy Delete button until the promise settles.
5. Inline buttons carry max-sm:hidden, so below 640px the row keeps a single kebab that still holds every action.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `button size = 32px (kit Button small icon-only), gap-2`
  Matches the finance table's trash / edit / kebab squares and keeps a comfortable touch target.
- `menu width = w-48, p-1.5`
  Three short verbs do not need the 266px kit default; the narrow panel stays inside the row on phones.
- `placement = 'bottom end', offset 4`
  The kebab is the last cell, so the panel grows leftwards into the table instead of off the edge.
- `danger row = text-error-primary, bg-background-tertiary-error on hover`
  Marks the destructive verb in both themes before the confirm even appears.

## API

```ts
export function RowActions({ name, onEdit, onDuplicate, onDelete, inline, confirmTitle, confirmDescription, confirmLabel, placement, className }: RowActionsProps): JSX.Element
```

- `name: string`
  Row name used in the kebab, inline and dialog labels.
- `onEdit: () => void`
  Adds Edit to the menu (and the inline pencil).
- `onDuplicate: () => void`
  Adds Duplicate to the menu.
- `onDelete: () => void | Promise<unknown>`
  Adds Delete and runs after confirmation; a promise keeps the dialog busy.
- `inline: boolean` — default `false`
  Show delete and edit as icon buttons before the kebab from 640px up.
- `confirmTitle: ReactNode` — default ``Delete ${name}?``
  Confirm dialog title.
- `confirmDescription: ReactNode`
  Confirm dialog body; defaults to a generic cannot-undo line.
- `confirmLabel: ReactNode` — default `'Delete'`
  Label of the danger button.
- `placement: 'bottom end' | 'bottom start' | 'top end' | 'top start'` — default `'bottom end'`
  Menu placement relative to the kebab.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function RowActions({
  name,
  onEdit,
  onDuplicate,
  onDelete,
  inline = false,
  confirmTitle,
  confirmDescription,
  confirmLabel = 'Delete',
  placement = 'bottom end',
  className,
}: RowActionsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Park focus on the kebab before the panel unmounts: whatever opens next
  // (the caller's edit form, the confirm dialog) then records the kebab as
  // the element to restore focus to, instead of a detached menu row.
  const run = (action: (() => void) | undefined) => {
    rootRef.current?.querySelector<HTMLElement>('[data-row-actions-trigger]')?.focus();
    setMenuOpen(false);
    action?.();
  };
  const askDelete = () => setConfirmOpen(true);
  const hasMenuAbove = Boolean(onEdit || onDuplicate);

  return (
    <div ref={rootRef} className={cx('inline-flex items-center gap-2', className)}>
      {inline && onDelete ? (
        <Button
          variant="secondary"
          size="small"
          iconOnly
          leadingIcon={RiDeleteBinLine}
          aria-label={`Delete ${name}`}
          onClick={askDelete}
          className="max-sm:hidden"
        />
      ) : null}
      {inline && onEdit ? (
        <Button
          variant="secondary"
          size="small"
          iconOnly
          leadingIcon={RiPencilLine}
          aria-label={`Edit ${name}`}
          onClick={onEdit}
          className="max-sm:hidden"
        />
      ) : null}

      <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownTrigger data-row-actions-trigger aria-label={`Actions for ${name}`} className={cx(KEBAB, menuOpen && KEBAB_OPEN)}>
          <RiMore2Fill aria-hidden className={buttonStyles.icon.small} />
        </DropdownTrigger>
        <DropdownPopover aria-label={`Actions for ${name}`} placement={placement} className="w-48 p-1.5" dialogClassName="gap-0.5">
          {onEdit ? (
            <DropdownItem onSelect={() => run(onEdit)} className="px-2 py-1.5">
              <ItemLabel icon={RiPencilLine}>Edit</ItemLabel>
            </DropdownItem>
          ) : null}
          {onDuplicate ? (
            <DropdownItem onSelect={() => run(onDuplicate)} className="px-2 py-1.5">
              <ItemLabel icon={RiFileCopyLine}>Duplicate</ItemLabel>
            </DropdownItem>
          ) : null}
          {onDelete ? (
            <>
              {hasMenuAbove ? <DropdownDivider className="-mx-1.5 my-1" /> : null}
              <DropdownItem onSelect={() => run(askDelete)} className={cx('px-2 py-1.5', DANGER_ITEM)}>
                <ItemLabel icon={RiDeleteBinLine} danger>
                  Delete
                </ItemLabel>
              </DropdownItem>
            </>
          ) : null}
        </DropdownPopover>
      </Dropdown>

      {onDelete ? (
        <AlertDialog
          isOpen={confirmOpen}
          onOpenChange={setConfirmOpen}
          icon={RiDeleteBinLine}
          title={confirmTitle ?? `Delete ${name}?`}
          description={confirmDescription ?? 'This row will be removed from the table. You can’t undo this.'}
          confirmLabel={confirmLabel}
          onConfirm={onDelete}
        />
      ) : null}
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers or listeners of its own. The kit Dropdown removes its outside-press listener on close and unmount, and the modal releases its scroll lock when it unmounts.

**Reduced motion.** The kit Dropdown drops its fade, scale and blur under reduced motion and the kit AlertDialog keeps only its fade; RowActions adds no motion of its own.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Deleting the row unmounts the focused controls and the open dialog with it; move focus to a neighbouring row (the demo uses its kebab) or focus drops to <body>.
- Do not pass a ref to DropdownTrigger: it would replace the Dropdown's own trigger ref and break outside-press and toggle handling. RowActions finds the kebab through data-row-actions-trigger instead.
- Give every row a distinct name; the labels ("Actions for Ana Carter", "Delete Ana Carter?") are the only thing that tells repeated buttons apart.

## Notes

- Leave out onDuplicate (or onEdit) to drop that row from the menu; without onDelete there is no divider and no dialog.
- Pass confirmDescription with the row's details ("The $640 payment from Jun 12 ...") so the confirm says exactly what goes away.

## Definition of done

Opening "Actions for Mia Chen" shows Edit, Duplicate and Delete; Duplicate inserts "Mia Chen (copy)" below it and the count reads 6 payments; Delete asks "Delete Mia Chen?" with focus on Cancel, Cancel keeps the row, Delete removes it, the count drops and focus lands on the next row's kebab.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
