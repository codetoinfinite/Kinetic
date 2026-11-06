/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Row Actions" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */
'use client';

import { useRef, useState, type ComponentType, type ReactNode } from 'react';
import { RiDeleteBinLine, RiFileCopyLine, RiMore2Fill, RiPencilLine } from '@remixicon/react';
import { Button, buttonStyles } from '@/registry/ui/button';
import { Dropdown, DropdownDivider, DropdownItem, DropdownPopover, DropdownTrigger } from '@/registry/ui/dropdown';
import { AlertDialog } from '@/registry/ui/modal';
import { cx } from '@/registry/lib/cx';

/**
 * RowActions: the action cluster at the end of a BoardUI table row. A 32px
 * bordered kebab opens the kit Dropdown with Edit, Duplicate and a red Delete;
 * Delete never runs straight away but asks through the kit AlertDialog first.
 * With `inline`, delete and edit also sit in front of the kebab as 32px icon
 * buttons (as in the finance table), collapsing into the kebab below 640px.
 * Actions without a handler are left out of the menu.
 */

export interface RowActionsProps {
  /** Row name used in every label: "Actions for Ana Carter", "Delete Ana Carter?". */
  name: string;
  onEdit?: () => void;
  onDuplicate?: () => void;
  /**
   * Runs once the delete is confirmed. Return a promise to keep the dialog
   * open with a busy Delete button until it settles (it stays open on reject).
   */
  onDelete?: () => void | Promise<unknown>;
  /** Also show delete and edit as icon buttons before the kebab, from 640px up. */
  inline?: boolean;
  confirmTitle?: ReactNode;
  confirmDescription?: ReactNode;
  confirmLabel?: ReactNode;
  placement?: 'bottom end' | 'bottom start' | 'top end' | 'top start';
  className?: string;
}

type Icon = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;

/** The kit secondary small icon-only Button, applied to the Dropdown's own trigger. */
const KEBAB = cx(
  buttonStyles.base,
  buttonStyles.size.small,
  buttonStyles.variant.secondary,
  buttonStyles.iconOnlySize.small,
);
/** Keeps the kebab pressed-looking while its menu is open. */
const KEBAB_OPEN = 'bg-background-primary-active border-border-button-active';
const DANGER_ITEM =
  'text-text-error-primary hover:bg-background-tertiary-error focus-visible:bg-background-tertiary-error';

function ItemLabel({ icon: Glyph, danger, children }: { icon: Icon; danger?: boolean; children: ReactNode }) {
  return (
    <>
      <Glyph aria-hidden className={cx('size-[18px] shrink-0', danger ? 'text-foreground-icon-error' : 'text-foreground-icon-tertiary')} />
      <span className="text-body-medium">{children}</span>
    </>
  );
}

// #region critical
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
// #endregion
