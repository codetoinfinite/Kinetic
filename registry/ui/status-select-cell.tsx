/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Status Select Cell" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */
'use client';

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Button as AriaButton,
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  Popover as AriaPopover,
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  Text as AriaText,
  type Key,
} from 'react-aria-components';
import { RiCheckLine } from '@remixicon/react';
import { CHIP_COLORS, type ChipColor } from '@/registry/ui/chip';
import { ChevronDownSmall } from '@/registry/lib/chevrons';
import { MENU_ITEM, MENU_ITEM_ACTIVE, MENU_ITEMS_CONTAINER, MENU_POPOVER_SURFACE } from '@/registry/lib/menu-styles';
import { useDismissOnOutsidePress, useTriggerToggle } from '@/registry/hooks/use-dismiss-on-outside-press';
import { cx } from '@/registry/lib/cx';

/**
 * StatusSelectCell: the coloured status pill of a BoardUI table row
 * ("Recovering", "Under observation", "Critical") that is also the control
 * that changes it. It is a React Aria Select whose trigger is styled as the
 * kit Chip, so it reads as a static badge until hovered or focused, then
 * reveals a chevron. Arrow keys, type-ahead, Enter and Escape come from the
 * listbox; the list shows every status as its own pill with a check on the
 * current one.
 */

export interface StatusOption<K extends string = string> {
  id: K;
  label: string;
  /** Kit chip colour, i.e. the status-* background/text token pair. */
  color: ChipColor;
  /** Optional second line in the list, e.g. what the status means. */
  description?: string;
}

export type StatusSelectCellSize = 'md' | 'sm';

export interface StatusSelectCellProps<K extends string = string> {
  options: readonly StatusOption<K>[];
  value?: K;
  defaultValue?: K;
  onChange?: (value: K) => void;
  /** Name the row, e.g. "Status for John Clarkson". Default "Status". */
  'aria-label'?: string;
  /** 'md' (14px body text, default) or 'sm' (12px caption text). */
  size?: StatusSelectCellSize;
  /** When the chevron shows: on hover/focus (default), always, or never. */
  chevron?: 'hover' | 'always' | 'none';
  /** Shown when no option matches the value. */
  placeholder?: ReactNode;
  isDisabled?: boolean;
  placement?: 'bottom start' | 'bottom end' | 'top start' | 'top end';
  className?: string;
  popoverClassName?: string;
}

const PILL_SIZE: Record<StatusSelectCellSize, string> = {
  md: 'rounded-md px-1.5 py-0.5 text-body-medium',
  sm: 'rounded-md px-1.5 py-0.5 text-caption-1-medium',
};

/** Chevron shown: 14px wide, 2px from the label, pulled 4px into the end padding. */
const CHEVRON_SHOWN = 'w-3.5 ms-0.5 -me-1 opacity-70';
/** Chevron hidden until the pill is hovered or keyboard-focused (always on touch screens). */
const CHEVRON_ON_HOVER = [
  'w-0 opacity-0',
  'group-data-[hovered]/status:w-3.5 group-data-[hovered]/status:ms-0.5 group-data-[hovered]/status:-me-1 group-data-[hovered]/status:opacity-70',
  'group-data-[focus-visible]/status:w-3.5 group-data-[focus-visible]/status:ms-0.5 group-data-[focus-visible]/status:-me-1 group-data-[focus-visible]/status:opacity-70',
  '[@media(hover:none)]:w-3.5 [@media(hover:none)]:ms-0.5 [@media(hover:none)]:-me-1 [@media(hover:none)]:opacity-70',
].join(' ');

// #region critical
export function StatusSelectCell<K extends string = string>({
  options,
  value,
  defaultValue,
  onChange,
  'aria-label': ariaLabel = 'Status',
  size = 'md',
  chevron = 'hover',
  placeholder = 'Set status',
  isDisabled,
  placement = 'bottom start',
  className,
  popoverClassName,
}: StatusSelectCellProps<K>) {
  const [inner, setInner] = useState<K | undefined>(defaultValue);
  const current = value ?? inner;
  const option = options.find((o) => o.id === current);

  // Same non-modal recipe as the kit Select: no scroll lock on <html>, with
  // outside-press dismissal and trigger toggling restored by the kit hooks.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const refs = useMemo(() => [triggerRef, popoverRef], []);
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  useDismissOnOutsidePress(isOpen, close, refs);
  const allowOpenChange = useTriggerToggle(isOpen, triggerRef);

  const select = (key: Key | null) => {
    if (key === null) return;
    const next = options.find((o) => o.id === String(key));
    if (!next || next.id === current) return;
    setInner(next.id);
    onChange?.(next.id);
  };

  const showChevron = chevron !== 'none';

  return (
    <AriaSelect
      aria-label={ariaLabel}
      selectedKey={current ?? null}
      onSelectionChange={select}
      isOpen={isOpen}
      onOpenChange={(open) => allowOpenChange(open) && setIsOpen(open)}
      isDisabled={isDisabled}
      className={cx('inline-flex max-w-full', className)}
    >
      <AriaButton
        ref={triggerRef}
        data-status={current}
        className={cx(
          'group/status inline-flex max-w-full cursor-pointer items-center whitespace-nowrap outline-none',
          'transition-[box-shadow,background-color] duration-150 ease-out motion-reduce:transition-none',
          'data-[hovered]:ring-1 data-[hovered]:ring-current/25',
          'data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring data-[focus-visible]:ring-offset-1 data-[focus-visible]:ring-offset-background-primary-default',
          'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60',
          PILL_SIZE[size],
          option ? CHIP_COLORS[option.color] : 'border border-dashed border-border-button-default text-text-tertiary',
          isOpen && 'ring-1 ring-current/25',
        )}
      >
        <AriaSelectValue className="truncate">{() => (option ? option.label : placeholder)}</AriaSelectValue>
        {showChevron ? (
          <ChevronDownSmall
            className={cx(
              'h-3.5 shrink-0 transition-[width,margin,opacity,rotate] duration-150 ease-out motion-reduce:transition-none',
              chevron === 'always' || isOpen ? CHEVRON_SHOWN : CHEVRON_ON_HOVER,
              isOpen && 'rotate-180',
            )}
          />
        ) : null}
      </AriaButton>
      <AriaPopover
        ref={popoverRef}
        isNonModal
        offset={6}
        placement={placement}
        className={cx(
          MENU_POPOVER_SURFACE,
          'w-60 p-1.5',
          'motion-reduce:transition-opacity motion-reduce:data-[entering]:scale-100 motion-reduce:data-[entering]:blur-none',
          'motion-reduce:data-[exiting]:scale-100 motion-reduce:data-[exiting]:blur-none',
          popoverClassName,
        )}
      >
        <AriaListBox items={options} className={cx(MENU_ITEMS_CONTAINER, 'max-h-[280px] overflow-auto')}>
          {(item) => (
            <AriaListBoxItem
              id={item.id}
              textValue={item.label}
              className={({ isFocused }) => cx(MENU_ITEM, 'items-start gap-2 p-1.5', isFocused && MENU_ITEM_ACTIVE)}
            >
              {({ isSelected }) => (
                <>
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                    <AriaText
                      slot="label"
                      elementType="span"
                      className={cx('rounded-md px-1.5 py-0.5', size === 'sm' ? 'text-caption-1-medium' : 'text-body-medium', CHIP_COLORS[item.color])}
                    >
                      {item.label}
                    </AriaText>
                    {item.description ? (
                      <AriaText slot="description" elementType="span" className="ps-0.5 text-caption-1-regular text-text-tertiary">
                        {item.description}
                      </AriaText>
                    ) : null}
                  </span>
                  <RiCheckLine
                    aria-hidden
                    className={cx('mt-1 size-4 shrink-0 text-foreground-icon-primary', isSelected ? 'opacity-100' : 'opacity-0')}
                  />
                </>
              )}
            </AriaListBoxItem>
          )}
        </AriaListBox>
      </AriaPopover>
    </AriaSelect>
  );
}
// #endregion
