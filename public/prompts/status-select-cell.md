# Build: Status Select Cell

The coloured status badge from BoardUI table rows ("Recovering", "Under observation", "Critical") turned into its own editor. It is a React Aria Select whose trigger wears the kit Chip colours, so the cell still reads as a static pill; hovering or focusing reveals a chevron, and the list shows each status as its own pill with a check on the current one. Arrow keys, type-ahead, Enter and Escape come from the listbox.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Table status pill in status-* colours that is also a select: hover reveals a chevron, press or Enter opens the list to change it.

- Category: form
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1, @remixicon/react@^4.9.0

## How it works

1. Value is controlled (value + onChange) or uncontrolled (defaultValue); the current option is looked up in options by id and its color picks the bg/text pair from the kit CHIP_COLORS map (status-*-background / status-*-text tokens).
2. A React Aria Select wraps an AriaButton styled as the pill (rounded-md, py-0.5, ps-1.5, text-body-medium) whose SelectValue renders only the option label, so the trigger's accessible name is "<label> <aria-label>", e.g. "Critical Status for Livia Saris".
3. A ChevronDownSmall sits at the end of the pill collapsed to width 0 and opacity 0; on data-hovered or data-focus-visible (and always on hover:none touch screens or while open) it grows to 14px wide at 0.7 opacity, 2px from the label and pulled 4px into the end padding, and rotates 180deg while open.
4. The Popover is isNonModal like the kit Select, so it never locks <html> scroll; the kit useDismissOnOutsidePress and useTriggerToggle hooks restore outside-press closing and trigger toggling with a controlled isOpen.
5. Each ListBoxItem renders the status pill and an optional description as React Aria Text slots (label / description, so the option is named by its label and described by the line), plus a RiCheckLine that is visible only when isSelected; choosing the current status is ignored, any other calls onChange(id) and the listbox returns focus to the pill.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `popover width = w-60 (240px), offset 6px`
  Fits the longest pill ("Under observation") plus a one-line description and the check column.
- `chevron = w-0 -> w-3.5 (ms-0.5, -me-1), opacity 0 -> 0.7`
  At rest the pill is as tight as a static badge; on hover the chevron signals "editable" without turning every row into a form field.
- `hover ring = ring-1 ring-current/25`
  Derived from the pill's own text colour, so the hover outline matches every status tone in light and dark.
- `focus ring = ring-2 ring-border-focus-ring ring-offset-1`
  The kit focus treatment; the offset keeps it legible against tinted pills.
- `list height = max-h-[280px]`
  Five statuses with descriptions fit without scrolling; longer workflows scroll inside the surface.

## API

```ts
export function StatusSelectCell<K extends string = string>({ options, value, defaultValue, onChange, "aria-label", size, chevron, placeholder, isDisabled, placement, className, popoverClassName }: StatusSelectCellProps<K>): JSX.Element
```

- `options: readonly StatusOption<K>[]`
  Each { id, label, color: ChipColor, description? }.
- `value / defaultValue: K`
  Selected status id, controlled or initial.
- `onChange: (value: K) => void`
  Called when a different status is picked.
- `aria-label: string` — default `'Status'`
  Accessible name; include the row, e.g. "Status for Ana Carter".
- `size: 'md' | 'sm'` — default `'md'`
  Body (14px) or caption (12px) pill text.
- `chevron: 'hover' | 'always' | 'none'` — default `'hover'`
  When the dropdown chevron is shown.
- `placeholder: ReactNode` — default `'Set status'`
  Shown in a dashed pill when nothing matches.
- `isDisabled: boolean` — default `false`
  Renders the pill at 60% opacity and blocks opening.
- `placement: 'bottom start' | 'bottom end' | 'top start' | 'top end'` — default `'bottom start'`
  Popover placement relative to the pill.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Its only listeners are the kit hooks' capture-phase pointerdown handlers, added while open and removed on close or unmount; the toggle hook's 400ms safety timeout only clears a ref.

**Reduced motion.** Ring and chevron transitions are removed (motion-reduce:transition-none) and the popover drops its scale and blur entry, keeping only the opacity fade.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not render the label as plain children of the trigger without SelectValue: React Aria labels the button with the SelectValue id, and the value would drop out of the accessible name.
- Pass a row-specific aria-label ("Status for John Clarkson"); a column of identical "Status" names is useless to screen-reader users.
- If the popover is made modal instead, React Aria puts overflow:hidden on <html> while open, which jumps pages that scroll the root element.

## Notes

- size="sm" uses caption text for dense tables; chevron="always" suits touch-first layouts, chevron="none" a pure badge look.
- Options without a match render a dashed placeholder pill ("Set status").

## Definition of done

Tabbing to "Critical Status for Livia Saris" and pressing Enter opens a list of five status pills with a check on Critical; typing "S" moves to "Stable" and Enter closes it, the pill turns lime and reads Stable, the Critical count drops to 0 and Stable rises to 3.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
