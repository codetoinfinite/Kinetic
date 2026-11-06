# Build: Select

React Aria's `Select` with BoardUI's trigger and menu chrome: a 10px-radius bordered button whose 16px chevron turns 180° while open, and a 266px popover that shares the Dropdown recipe (radius 2xl, shadow-dropdown, 150ms fade, scale and blur). The popover is deliberately non-modal so opening a select never locks page scroll, and the component restores the outside-press dismissal and trigger toggle that React Aria drops in that mode. Rows take any content, so a status dot, avatar or flag sits beside the text.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A React Aria select: bordered trigger with a turning chevron, non-modal popover on the shared menu surface, free-form rows.

- Category: form
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. Open state is controlled locally (`isOpen` in `useState`) and passed to `AriaSelect`. The `AriaPopover` is `isNonModal` with `offset={4}`, which skips React Aria's scroll lock: that lock sets `overflow: hidden` on `<html>` and, under an `h-full` root, makes the page jump each time a select opens.
2. `isNonModal` also turns off React Aria's outside-press dismissal, so `useDismissOnOutsidePress(isOpen, close, [triggerRef, popoverRef])` adds a capture-phase `pointerdown` listener on `document` while open and closes when the press lands outside both refs.
3. Pressing the trigger while open makes React Aria call `onOpenChange(false)` then `onOpenChange(true)` in the same press. `useTriggerToggle` watches for that pointerdown and swallows the reopen, so `onOpenChange={(o) => allowOpenChange(o) && setIsOpen(o)}` turns the trigger into a true toggle.
4. The trigger is an `AriaButton` holding `AriaSelectValue` (the selected row's own content, or `renderValue`) and `ChevronDownSmall`, which gets `rotate-180` from the render-prop `isOpen` and animates with `transition-transform duration-200`. The button itself transitions background, border, shadow, padding and font size over 200ms, so hover and a `size` switch both ease.
5. The popover combines `MENU_POPOVER_WIDTH` (266px), `MENU_POPOVER_SURFACE` and `p-2`. The surface's `data-[entering]` and `data-[exiting]` classes run opacity 0, `scale-95` and `blur-[2px]` over 150ms ease-out, with `transform-origin` taken from `data-placement`. Inside, an `AriaListBox` scrolls past `max-h-[240px]`.
6. `size` goes down to the rows through `SelectSizeContext`. `SelectItem` reads it to pick `text-body-medium` (md) or `px-2 py-1.5 text-body-2-medium` (sm), and applies `MENU_ITEM_ACTIVE` when the row is focused or selected.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `popover offset = 4px`
  The gap between trigger and menu. It is enough to show the trigger border and shadow, and close enough that the menu reads as belonging to that trigger.
- `menu width = w-[266px] (MENU_POPOVER_WIDTH)`
  Shared with Dropdown so every menu in the kit has the same width. Pass `popoverClassName` to narrow it, for example to the trigger width in a filter bar.
- `list height = max-h-[240px]`
  About six rows at 36px plus 4px gaps. Longer lists scroll inside the popover instead of running past the viewport.
- `trigger padding = md px-2.5 py-2, gap-1.5 / sm px-[7px] py-1, gap-1`
  From Figma: md gives a 38px trigger that lines up with Input, and sm gives a 28px trigger for compact table toolbars.
- `motion = chevron 200ms rotate; popover 150ms opacity/scale-95/blur-2px`
  The menu is quicker than the chevron so the list is readable by the time the chevron settles. The 2px blur hides the scale step on the first frame.

## API

```ts
function Select<T extends object>(props: Omit<AriaSelectProps<T>, "children"> & { label?: ReactNode; className?: string; triggerClassName?: string; popoverClassName?: string; size?: "sm" | "md"; children: ReactNode; items?: Iterable<T>; renderValue?: ReactNode | ((values: AriaSelectValueRenderProps<T>) => ReactNode); ref?: Ref<HTMLDivElement> }): JSX.Element; function SelectItem(props: Omit<AriaListBoxItemProps, "children"> & { children?: ReactNode }): JSX.Element
```

- `label: ReactNode`
  Visible label above the trigger. React Aria wires it as the accessible name. Without it, pass `aria-label`.
- `size: "sm" | "md"` — default `"md"`
  Trigger padding and type size. Rows read the same size through context.
- `placeholder: string`
  React Aria's placeholder, shown in the trigger until something is selected.
- `value / defaultValue / onChange: Key | null`
  React Aria's selection value, controlled or uncontrolled. The older `selectedKey` props still work but are deprecated in React Aria.
- `renderValue: ReactNode | ((values) => ReactNode)`
  Custom trigger content. Falls back to the selected row's children.
- `className: string`
  Classes on the root, for example a fixed width.
- `triggerClassName: string`
  Classes on the trigger button.
- `popoverClassName: string`
  Classes on the popover, for example a narrower width.
- `items: Iterable<T>`
  Optional dynamic collection, rendered with a children function inside the listbox.
- `children: ReactNode`
  `SelectItem` rows, each with an `id` and a `textValue`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function Select<T extends object>({
  label,
  className,
  triggerClassName,
  popoverClassName,
  size = "md",
  children,
  items,
  renderValue,
  ref,
  ...props
}: SelectProps<T>) {
  // The popover is `isNonModal`: react-aria's modal scroll lock puts
  // `overflow: hidden` on <html>, which — with this app's `h-full` root —
  // collapses the page scroll position and visibly yanks the sticky
  // sidebar upward every time a select opens. Non-modal skips the lock,
  // but also disables react-aria's outside-press dismissal (`isDismissable`
  // is hard-coupled to `!isNonModal` in usePopover), so open state is
  // controlled here and dismissal restored manually — the same fix as the
  // date-picker family (see utils/use-dismiss-on-outside-press.ts).
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  useDismissOnOutsidePress(isOpen, () => setIsOpen(false), [triggerRef, popoverRef]);
  // Pressing the trigger while open closes the popover instead of reopening
  const allowOpenChange = useTriggerToggle(isOpen, triggerRef);

  return (
    <AriaSelect
      ref={ref}
      {...props}
      isOpen={isOpen}
      onOpenChange={(o) => allowOpenChange(o) && setIsOpen(o)}
      className={cx("group flex flex-col", label ? "gap-1" : undefined, className)}
    >
      {({ isOpen, isRequired }) => (
        <>
          {label ? <Label isRequired={isRequired}>{label}</Label> : null}
          <AriaButton
            ref={triggerRef}
            className={cx(
              "flex w-full cursor-pointer items-center justify-between rounded-2lg",
              "border border-border-button-default bg-background-primary-default shadow-xs",
              "text-text-primary",
              "transition-[background-color,border-color,box-shadow,padding,font-size] duration-200 ease",
              "hover:bg-background-primary-hover hover:border-border-button-hover",
              "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring",
              "disabled:cursor-not-allowed disabled:bg-background-primary-disabled disabled:text-text-tertiary disabled:shadow-none",
              size === "sm"
                ? "gap-1 px-[7px] py-1 text-body-2-medium"
                : "gap-1.5 px-2.5 py-2 text-body-medium",
              triggerClassName,
            )}
          >
            <AriaSelectValue
              className={cx(
                "flex min-w-0 items-center truncate",
                size === "sm" ? "gap-1" : "gap-[5px]",
              )}
            >
              {renderValue as never /* RAC accepts node or render-prop */}
            </AriaSelectValue>
            <ChevronDownSmall
              className={cx(
                "shrink-0 text-text-secondary transition-transform duration-200 ease",
                size === "sm" ? "size-3.5" : "size-4",
                isOpen && "rotate-180",
              )}
            />
          </AriaButton>
          <AriaPopover
            ref={popoverRef}
            isNonModal
            offset={4}
            className={cx(
              MENU_POPOVER_WIDTH,
              MENU_POPOVER_SURFACE,
              // Listbox rows already space themselves 4px apart, so the
              // surface sits a touch tighter than the action-menu Dropdown.
              "p-2",
              popoverClassName,
            )}
          >
            <AriaListBox
              items={items}
              className={cx(MENU_ITEMS_CONTAINER, "max-h-[240px] overflow-auto")}
            >
              <SelectSizeContext.Provider value={size}>{children}</SelectSizeContext.Provider>
            </AriaListBox>
          </AriaPopover>
        </>
      )}
    </AriaSelect>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The outside-press listener is added in an effect only while the popover is open and removed in that effect's cleanup, both on close and on unmount. `useTriggerToggle` clears its 400ms safety timeout the same way. React Aria owns the popover portal and removes it on close.

**Reduced motion.** The chevron rotation, the trigger colour transitions and the popover fade, scale and blur are CSS transitions of 150–200ms with no JavaScript tween. They do not change position on screen, so they run under `prefers-reduced-motion` too. Add `motion-reduce:transition-none` through `popoverClassName` and `triggerClassName` to remove them.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Leaving out both `label` and `aria-label`. React Aria then logs an accessibility warning and screen readers announce an unnamed button. Pass one of them.
- Removing `isNonModal` to get dismissal for free. The modal popover's scroll lock returns and the page jumps under an `h-full` root on every open.
- Giving a `SelectItem` rich children with no `textValue`. Typeahead and the accessible name then fall back to an empty string, so pass `textValue` whenever children are not plain text.
- Passing `isOpen` or `onOpenChange` from outside. The component controls open state itself, and the spread comes before its own props, so outside values are overwritten.

## Notes

- The trigger value is the selected row's own content, so a row with a status dot shows the dot in the trigger too. Use `renderValue` when the trigger needs a more compact form, such as a flag and a dial code.
- Like the other BoardUI controls, `className` and `triggerClassName` merge through tailwind-merge, so `w-[240px]` replaces the default width cleanly.

## Definition of done

Clicking the trigger opens a 266px menu 4px below it with a short fade and scale, and the chevron turns 180°. Picking a row closes the menu and shows that row's content, status dot included, in the trigger. Clicking the trigger again, clicking outside, or pressing Escape closes the menu, and the page does not scroll or jump. Arrow keys move the highlight, and typing a letter jumps to the matching `textValue`. No accessibility warning appears in the console when `label` or `aria-label` is passed.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
