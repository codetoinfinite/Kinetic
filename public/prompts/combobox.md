# Build: Combobox

React Aria's `ComboBox` dressed in the kit's existing parts. The field is Input's `InputBase`, so hover, focus, invalid and disabled states match every other text field, and the menu is Select's surface, so the motion and row styling match every other list. Two details are its own: the popover anchors to the whole field and copies its measured width, and the list scrolls under a progressive top blur that ramps in over the first 24px of scroll.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Type to filter a list: Input's own field with a chevron toggle, and a field-width menu with sections, a check and a scroll fade.

- Category: form
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. React Aria would anchor the popover to the bare `<input>`. The component instead passes `groupRef={fieldRef}` into `InputBase` and `triggerRef={fieldRef}` to the `AriaPopover`, so the menu opens under the full field, icon and chevron included.
2. A `ResizeObserver` on that field writes `field.offsetWidth` into state, and the popover gets `style={{ width: fieldWidth }}`. The menu therefore stays exactly as wide as the field through container resizes and font loading.
3. The toggle is an `AriaButton` in `InputBase`'s `trailingAddon`. React Aria finds it by context and wires it as the open button. Its `ChevronDownSmall` turns `rotate-180` while open over 200ms.
4. `useScrollFade()` turns the listbox's `scrollTop` into a 0–1 `progress` over its distance, and `<ScrollFade progress>` overlays a masked backdrop blur plus a wash at the top of the list. `onOpenChange` calls `fade.reset()` on each open, because every opening starts the list at the top.
5. `allowsEmptyCollection` keeps the popover open when the filter matches nothing, and the listbox's `renderEmptyState` shows `emptyMessage` ("No results" by default) instead of closing on the user mid-word.
6. `ComboBoxItem` uses the shared `MENU_ITEM` row and only adds `MENU_ITEM_ACTIVE` for the focused row. Selection shows as a 16px `RiCheckLine` in the accent colour at the end of the row. `ComboBoxSection` adds a muted `Header` and 8px of top padding between groups.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `popover offset = 4px`
  Matches Select, so a combobox and a select in the same form open their menus at the same distance.
- `list height = max-h-[240px], overscroll-contain`
  About six rows before the list scrolls. `overscroll-contain` stops a wheel at the end of the list from scrolling the page behind it.
- `scroll-fade distance = 24px (SCROLL_FADE_DISTANCE)`
  The fade reaches full strength after one row of scrolling. A longer ramp leaves the first rows sharp under the edge, and a shorter one makes the blur pop in.
- `emptyMessage = "No results"`
  Shown in tertiary text instead of closing the list, so a typo leaves the popover in place and the user can correct it.

## API

```ts
function ComboBox<T extends object>(props: Omit<AriaComboBoxProps<T>, "children" | "className"> & { label?: ReactNode; hint?: ReactNode; placeholder?: string; leadingIcon?: IconComponent; size?: InputSize; emptyMessage?: ReactNode; className?: string; popoverClassName?: string; children: ReactNode | ((item: T) => ReactNode); ref?: Ref<HTMLDivElement> }): JSX.Element; function ComboBoxItem(props: Omit<AriaListBoxItemProps, "children"> & { children?: ReactNode }): JSX.Element; function ComboBoxSection<T extends object>(props: Omit<AriaListBoxSectionProps<T>, "className" | "children"> & { title?: ReactNode; className?: string; children: ReactNode }): JSX.Element
```

- `label: ReactNode`
  Field label, wired as the accessible name. Without it, pass `aria-label`.
- `placeholder: string`
  Input placeholder.
- `leadingIcon: ComponentType<{ className?: string }>`
  Icon at the start of the field, for example `RiSearchLine`.
- `hint: ReactNode`
  Help text under the field. Shown in the error colour while the field is invalid.
- `size: "medium" | "small"` — default `"medium"`
  Field height, 36px or 32px, as Input.
- `emptyMessage: ReactNode` — default `"No results"`
  Shown in the list when nothing matches.
- `defaultItems / items: Iterable<T>`
  Data for a function child. `defaultItems` lets React Aria filter; `items` means you filter.
- `value / defaultValue / onChange: Key | null`
  React Aria's selected key, controlled or uncontrolled.
- `inputValue / onInputChange / allowsCustomValue: string / boolean`
  Control the typed text, or keep text that matches no row.
- `popoverClassName: string`
  Classes on the list popover.
- `children: ReactNode | ((item: T) => ReactNode)`
  `ComboBoxItem` rows, optionally grouped in `ComboBoxSection`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ComboBox<T extends object>({
  label,
  hint,
  placeholder,
  leadingIcon,
  size,
  emptyMessage = "No results",
  className,
  popoverClassName,
  children,
  ref,
  ...props
}: ComboBoxProps<T>) {
  const direction = useDirection();
  const fieldRef = useRef<HTMLDivElement>(null);
  const fade = useScrollFade();
  const [fieldWidth, setFieldWidth] = useState<number>();

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const observer = new ResizeObserver(() => setFieldWidth(field.offsetWidth));
    observer.observe(field);
    return () => observer.disconnect();
  }, []);

  return (
    <AriaComboBox
      ref={ref}
      allowsEmptyCollection
      {...props}
      className={cx("group flex flex-col gap-1", className)}
      onOpenChange={(isOpen, trigger) => {
        // Each opening starts the list at the top, so the fade starts hidden.
        if (isOpen) fade.reset();
        props.onOpenChange?.(isOpen, trigger);
      }}
    >
      {({ isOpen, isRequired, isInvalid }) => (
        <>
          {label ? <Label isRequired={isRequired}>{label}</Label> : null}
          <InputBase
            groupRef={fieldRef}
            size={size}
            placeholder={placeholder}
            leadingIcon={leadingIcon}
            trailingAddon={
              <AriaButton
                className={({ isFocusVisible }) =>
                  cx(
                    "-m-1 flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1 text-text-secondary outline-none",
                    isFocusVisible && "ring-2 ring-border-focus-ring",
                  )
                }
              >
                <ChevronDownSmall
                  className={cx("size-4 transition-transform duration-200 ease", isOpen && "rotate-180")}
                />
              </AriaButton>
            }
          />
          {hint ? <HintText isInvalid={isInvalid}>{hint}</HintText> : null}
          <AriaPopover
            triggerRef={fieldRef}
            dir={direction}
            offset={4}
            style={{ width: fieldWidth }}
            className={cx(MENU_POPOVER_SURFACE, "flex flex-col overflow-hidden p-2", popoverClassName)}
          >
            <div className="relative flex min-h-0 flex-col">
              <AriaListBox
                onScroll={fade.onScroll}
                renderEmptyState={() => (
                  <div className="px-2 py-2 text-body-medium text-text-tertiary">{emptyMessage}</div>
                )}
                className={cx(MENU_ITEMS_CONTAINER, "max-h-[240px] min-h-0 overflow-y-auto overscroll-contain")}
              >
                {children}
              </AriaListBox>
              <ScrollFade progress={fade.progress} />
            </div>
          </AriaPopover>
        </>
      )}
    </AriaComboBox>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The `ResizeObserver` on the field is disconnected in the effect's cleanup on unmount. React Aria removes the popover portal on close.

**Reduced motion.** The menu fade, scale and blur and the 200ms chevron rotation are CSS transitions from the shared menu recipe. None of them moves content across the screen, so they stay under `prefers-reduced-motion`. The scroll fade follows scroll position directly and has no animation of its own.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Giving rows rich children with no `textValue`. Filtering and the input text after selection both use `textValue`, so an avatar row without it never matches anything typed.
- Leaving out both `label` and `aria-label`. React Aria logs an accessibility warning and the input has no accessible name.
- Expecting `className` to style the input. It goes on the root column. Width belongs there, and field styling comes from `InputBase` and `size`.
- Passing data through `items` and expecting the list to filter as the user types. With `items` the consumer owns filtering. Use `defaultItems` to let React Aria filter by `textValue`.

## Notes

- With a function child, pass the data through `defaultItems` (uncontrolled filtering) or `items` (you filter). With static `ComboBoxItem` children, React Aria filters by `textValue` itself.
- `menuTrigger="focus"` opens the list on focus, which suits short lists such as timezones. The default `"input"` waits for typing.

## Definition of done

Typing "ma" into Assignee narrows the list to Maya Chen and Mateo Ruiz, and the menu is exactly as wide as the field, icon to chevron. Typing "zz" keeps the menu open with "No one by that name". Choosing a row closes the menu, fills the input with the name and shows a check on that row the next time the menu opens. In Timezone the list opens on focus with three headed sections, and scrolling it blurs the rows that pass under the top edge. Escape closes either menu, and arrow keys move the highlight.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
