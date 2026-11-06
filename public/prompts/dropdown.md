# Build: Dropdown

A free-form menu surface rather than a value picker: grouped rows of actions, headers, avatars, footers of buttons, whatever the panel needs. It is built from React Aria's `DialogTrigger`, `Popover` and `Dialog` and shares the kit's menu recipe with Select, so the 266px white panel opens with the same 150ms fade, scale 0.95 and 2px blur, grown from the corner nearest the trigger. Open state can be controlled so the trigger can react to it (a turning chevron) and rows can close the panel.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Composable popover menu (trigger, panel, groups, rows, dividers) built on React Aria: the recipe behind the sidebar team and account menus.

- Category: overlay
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `Dropdown` holds the open state, bridging controlled (`isOpen` / `onOpenChange`) and uncontrolled use, and shares a `triggerRef` and a `popoverRef` through context. It renders `AriaDialogTrigger` with `onOpenChange={(o) => allowOpenChange(o) && setOpen(o)}`.
2. The panel is `isNonModal`: React Aria's modal scroll lock puts `overflow: hidden` on `<html>`, which collapses the page scroll position and yanks sticky layout whenever a menu opens. Non-modal loses outside-press dismissal, so `useDismissOnOutsidePress` restores it with a capture-phase `pointerdown` listener that closes the menu when a press lands outside both refs, and `useTriggerToggle` swallows the reopen when the open trigger itself is pressed, so the trigger toggles.
3. `DropdownTrigger` is a React Aria `Button` carrying `triggerRef`, with only `cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring` of its own; the consumer styles the rest through `className`.
4. `DropdownPopover` renders `AriaPopover` (`placement` "bottom start", `offset` 4) with `MENU_POPOVER_WIDTH` (`w-[266px]`) and `MENU_POPOVER_SURFACE`: `z-110 max-w-[calc(100vw-32px)] overflow-y-auto rounded-2xl border border-border-button-default bg-background-primary-default p-2.5 shadow-dropdown`, a `transition duration-150 ease-out`, and `data-[entering]` / `data-[exiting]` set to `opacity-0 scale-95 blur-[2px]`; `DropdownPopover` adds `motion-reduce:transition-none` after them. The transform origin follows `data-[placement]` and the reading direction (`origin-top-left`, `rtl:origin-top-right`, and so on). Inside, an `AriaDialog` labelled by the required `aria-label` is a `flex flex-col gap-1` column.
5. Rows: `DropdownGroup` stacks an optional `ps-2 text-body-medium text-text-secondary` label over a `gap-1` column and only adds `pt-1` when there is a label. `DropdownItem` is a native `<button type="button">` with `aria-pressed={selected}`, `MENU_ITEM` (`flex w-full items-center gap-2 rounded-2lg p-2 text-start text-text-primary transition-colors`) and either the active background or hover / focus-visible backgrounds (`bg-dropdown-item-hover-background`). `DropdownDivider` bleeds through the panel padding with `-mx-2.5 my-1.5 h-px bg-border-button-default`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `panel width = w-[266px], max-w-[calc(100vw-32px)]`
  The width of the dashboard sidebar's team and account menus, shared with Select through `MENU_POPOVER_WIDTH`; the cap keeps a 16px gutter on phones.
- `motion = 150ms ease-out, scale 0.95, blur 2px`
  The menu family's appear animation, identical in Select and Popover so every anchored surface opens alike.
- `row rhythm = gap-1 (4px) between rows, p-2 per row`
  The same rhythm as the Select listbox. The divider's `my-1.5` plus the dialog's `gap-1` on both sides gives the original 10px around a divider.
- `offset = 4px, placement "bottom start"`
  Close enough that the panel reads as belonging to its trigger; start alignment keeps the menu's left edge (right in RTL) under the trigger's.

## API

```ts
function Dropdown(props: { isOpen?: boolean; onOpenChange?: (isOpen: boolean) => void; children: ReactNode }): JSX.Element
function DropdownTrigger(props: ComponentProps<typeof AriaButton>): JSX.Element
function DropdownPopover(props: Pick<ComponentProps<typeof AriaPopover>, "placement" | "offset" | "crossOffset"> & { "aria-label": string; className?: string; dialogClassName?: string; children: ReactNode }): JSX.Element
function DropdownGroup(props: { label?: string; className?: string; children: ReactNode }): JSX.Element
function DropdownItem(props: { selected?: boolean; onSelect?: () => void; className?: string; children: ReactNode }): JSX.Element
function DropdownDivider(props: { className?: string }): JSX.Element
```

- `isOpen / onOpenChange: boolean / (isOpen: boolean) => void`
  Optional controlled state, for a trigger that reacts to it or rows that close the panel.
- `DropdownPopover.aria-label: string`
  Required accessible name for the menu dialog.
- `DropdownPopover.placement: Placement` — default `"bottom start"`
  Preferred side and alignment; flips on collision.
- `DropdownPopover.offset: number` — default `4`
  Gap between trigger and panel in pixels.
- `DropdownPopover.className: string`
  Extra panel classes, e.g. a width override for the default 266px.
- `DropdownGroup.label: string`
  Muted body-medium heading above the rows.
- `DropdownItem.selected: boolean`
  Keeps the hover pill on the row and sets `aria-pressed`.
- `DropdownItem.onSelect: () => void`
  Click handler for the row.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function Dropdown({ isOpen: controlledOpen, onOpenChange, children }: DropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isOpen = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  useDismissOnOutsidePress(isOpen, () => setOpen(false), [triggerRef, popoverRef]);
  // Pressing the trigger while open closes the menu instead of reopening
  const allowOpenChange = useTriggerToggle(isOpen, triggerRef);

  return (
    <DropdownContext.Provider value={{ triggerRef, popoverRef }}>
      <AriaDialogTrigger isOpen={isOpen} onOpenChange={(o) => allowOpenChange(o) && setOpen(o)}>
        {children}
      </AriaDialogTrigger>
    </DropdownContext.Provider>
  );
}

/** The element that opens the menu. Style it entirely via className. */
export function DropdownTrigger({ className, ...props }: ComponentProps<typeof AriaButton>) {
  const context = useContext(DropdownContext);
  return (
    <AriaButton
      ref={context?.triggerRef}
      {...props}
      className={cx(
        "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        className as string,
      )}
    />
  );
}

/* ------------------------------------------------------------------- panel */

export interface DropdownPopoverProps
  extends Pick<ComponentProps<typeof AriaPopover>, "placement" | "offset" | "crossOffset"> {
  "aria-label": string;
  /** Extra classes on the panel — e.g. a width override (default w-[266px]). */
  className?: string;
  /** Classes on the inner dialog (the flex column), e.g. gap between groups. */
  dialogClassName?: string;
  children: ReactNode;
}

export function DropdownPopover({
  "aria-label": ariaLabel,
  placement = "bottom start",
  offset = 4,
  crossOffset,
  className,
  dialogClassName,
  children,
}: DropdownPopoverProps) {
  const context = useContext(DropdownContext);
  return (
    <AriaPopover
      ref={context?.popoverRef}
      isNonModal
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cx(
        MENU_POPOVER_WIDTH,
        MENU_POPOVER_SURFACE,
        // No fade, scale or blur under reduced motion: the panel opens and
        // closes at once, and react-aria unmounts it without waiting.
        "motion-reduce:transition-none",
        className,
      )}
    >
      {/* gap-1 keeps bare DropdownItems 4px apart, the same rhythm as the
          Select listbox; DropdownDivider's margins are sized to absorb it. */}
      <AriaDialog aria-label={ariaLabel} className={cx("flex flex-col gap-1 outline-none", dialogClassName)}>
        {children}
      </AriaDialog>
    </AriaPopover>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The capture-phase `pointerdown` listeners on `document` exist only while the menu is open and are removed by their effect cleanups on close or unmount. React Aria returns focus to the trigger.

**Reduced motion.** Under `prefers-reduced-motion: reduce`, `motion-reduce:transition-none` on the panel removes its 150ms scale, blur and fade: it opens and closes at once, and react-aria unmounts it without waiting. Row hover changes are colour only.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not make the popover modal to get outside-press dismissal back. The modal scroll lock sets `overflow: hidden` on `<html>` and shunts sticky layout every time a menu opens.
- Do not nest a `<button>` inside `DropdownItem`. The row is itself a native button; put footer buttons outside the rows, as the demo does.
- Do not add `pt-1` to a label-less group. Its first row would float 4px lower than the panel padding implies, visible as extra space above the first hover pill.
- Do not omit `aria-label` on `DropdownPopover`; it is required because the dialog has no heading to name it.

## Notes

- Unlike Select, Dropdown does not put a value into the trigger; it is the composable shell behind the sidebar team / account menus and the AI chat template's add, model and folder menus.
- The `MENU_*` class constants live in `registry/lib/menu-styles`, shared with Select and Context Menu so the menu surfaces stay identical.

## Definition of done

Clicking "Team access" grows a 266px white panel from its top-left corner below the trigger and turns the chevron; the page keeps scrolling normally. The current owner's row keeps the grey pill, hovering another row shows the pill, and clicking it changes the owner and closes the panel. Clicking the trigger again, clicking outside, or pressing Escape closes it.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
