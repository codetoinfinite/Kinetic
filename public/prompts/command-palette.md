# Build: Command Palette

A searchable list of actions and destinations opened with ⌘K / Ctrl+K: jump to a page, run a command, find a record. It is React Aria's Autocomplete and Menu inside a modal dialog, so focus stays in the search field while the arrow keys move a highlight through the list, Enter runs the highlighted row, and focus goes back to where it was on close. The panel sits 12vh from the top over a 20% black scrim and fades in while rising 10px and sharpening from a 4px blur over 200ms.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

⌘K palette of searchable commands with sections, icons and shortcuts, built-in or custom filtering, on React Aria Autocomplete and Menu.

- Category: overlay
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. `CommandPalette` keeps open state and the query, each controllable (`isOpen` / `onOpenChange`, `inputValue` / `onInputChange`). Its `setOpen` notifies the parent and, on every opening, empties the query (also through `onInputChange("")`) and calls `fade.reset()`, so each opening starts with a blank field and the list at its top.
2. The shortcut is a `keydown` listener on `window` that fires on `metaKey || ctrlKey` plus the `shortcut` letter (default "k", case-insensitive), calls `preventDefault` and toggles the palette. The effect has no dependency array, so it re-subscribes every render and always reads the current `isOpen`; `shortcut={false}` skips it.
3. The overlay is an `AriaModalOverlay` (`isDismissable`, `dir` from `useDirection()`) laid out as `fixed inset-x-0 top-0 z-100 h-(--visual-viewport-height) items-start justify-center px-4 pt-[12vh]`, so the panel stays above a phone's keyboard. A sibling `aria-hidden` div is the `bg-black/20` scrim, fading over 150ms via `group-data-[entering]/palette` and `group-data-[exiting]/palette`.
4. `AriaModal` is `max-h-[min(560px,76vh)] w-full max-w-[560px]` with `transition-[opacity,translate,scale,filter] duration-200 ease-out`: it enters from `opacity-0` and, under `motion-safe:`, `translate-y-2.5 scale-[0.98] blur-[4px]`, and exits to `translate-y-2 scale-[0.98] blur-[3px]`. Inside, an `AriaDialog` (`rounded-3xl`, button border, `shadow-sidebar`, `overflow-clip`) labelled by `aria-label` holds the search row, the list and the footer.
5. `AriaAutocomplete` wires an `autoFocus` `AriaSearchField` (search icon plus a bare `AriaInput`, native cancel button hidden) to an `AriaMenu`. Its filter is `filter ?? contains`, where `contains` comes from `useFilter({ sensitivity: "base" })` (ignores case and accents); `filter={null}` passes no filter, so the children show as given. The menu is the `overflow-y-auto overscroll-contain` scroller with a `ScrollFade` over its top, `renderEmptyState` shows `emptyState`, and `onAction` closes the palette first and then calls the consumer's `onAction(key)`.
6. `CommandPaletteItem` is an `AriaMenuItem` whose `textValue` falls back to string children; it is a `rounded-xl px-3 py-2.5` row that takes `bg-background-secondary-default` while focused (100ms colour transition), with a 16px icon, the label, an optional muted `description` and an optional `Kbd` shortcut. `CommandPaletteSection` is an `AriaMenuSection` with an `AriaHeader` title (`text-body-2-medium text-text-tertiary`) and `pt-2` on every section after the first. The default footer reads "Navigate with ↑ ↓" and "Select ↵"; `footer={false}` hides it.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `panel position = pt-[12vh], max-w-[560px], max-h-[min(560px,76vh)]`
  High enough that the results list has room to grow downward, but not pinned to the top edge; the height cap keeps the footer on screen on short viewports.
- `enter motion = 200ms ease-out, opacity 0, translate-y 10px, scale 0.98, blur 4px`
  The docs-site search's motion: a short lift and sharpen reads as the panel arriving, without travelling far enough to delay typing.
- `exit motion = translate-y 8px, scale 0.98, blur 3px`
  Slightly smaller than the entrance so closing feels quicker than opening.
- `scrim = bg-black/20, 150ms fade`
  Dims the page enough to focus the palette while keeping the page legible behind it.
- `shortcut = "k" with ⌘ or Ctrl`
  The common convention for command palettes; `metaKey || ctrlKey` covers macOS and Windows/Linux with one listener.

## API

```ts
function CommandPalette(props: { isOpen?: boolean; defaultOpen?: boolean; onOpenChange?: (isOpen: boolean) => void; shortcut?: string | false; "aria-label"?: string; placeholder?: string; inputValue?: string; onInputChange?: (value: string) => void; filter?: ((textValue: string, inputValue: string) => boolean) | null; onAction?: (key: Key) => void; emptyState?: ReactNode; footer?: ReactNode | false; className?: string; children: ReactNode }): JSX.Element
function CommandPaletteItem(props: Omit<AriaMenuItemProps, "children" | "className"> & { icon?: IconComponent; description?: ReactNode; shortcut?: string; className?: string; children: ReactNode }): JSX.Element
function CommandPaletteSection(props: { title?: ReactNode; className?: string; children: ReactNode }): JSX.Element
```

- `isOpen / onOpenChange: boolean / (isOpen: boolean) => void`
  Controlled open state; `defaultOpen` for uncontrolled.
- `shortcut: string | false` — default `"k"`
  Letter that toggles the palette with ⌘ / Ctrl; `false` turns it off.
- `aria-label: string` — default `"Command palette"`
  Accessible name of the dialog, field and menu.
- `placeholder: string` — default `"Type a command or search…"`
  Search field placeholder.
- `inputValue / onInputChange: string / (value: string) => void`
  Controlled query, e.g. for remote search.
- `filter: ((textValue, inputValue) => boolean) | null` — default `locale-aware contains`
  Row matcher; `null` shows the children unfiltered.
- `onAction: (key: Key) => void`
  Runs with the chosen item's id after the palette closes.
- `emptyState: ReactNode` — default `"No results"`
  Shown when nothing matches.
- `footer: ReactNode | false` — default `navigate / select hints`
  The hint row under the list; `false` hides it.
- `CommandPaletteItem.icon / description / shortcut: IconComponent / ReactNode / string`
  Leading icon, trailing muted text and a keyboard hint for the row.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function CommandPalette({
  isOpen: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  shortcut = "k",
  "aria-label": ariaLabel = "Command palette",
  placeholder = "Type a command or search…",
  inputValue: controlledInput,
  onInputChange,
  filter,
  onAction,
  emptyState = "No results",
  footer,
  className,
  children,
}: CommandPaletteProps) {
  const direction = useDirection();
  const localize = useTemplateCopy();
  const label = localize(ariaLabel);
  const { contains } = useFilter({ sensitivity: "base" });
  const fade = useScrollFade();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [uncontrolledInput, setUncontrolledInput] = useState("");
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const inputValue = controlledInput ?? uncontrolledInput;

  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
    if (next) {
      // Every opening starts fresh: an empty query and the list at its top.
      setUncontrolledInput("");
      onInputChange?.("");
      fade.reset();
    }
  };

  useEffect(() => {
    if (shortcut === false) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== shortcut.toLowerCase()) return;
      event.preventDefault();
      setOpen(!isOpen);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <AriaModalOverlay
      isOpen={isOpen}
      onOpenChange={setOpen}
      isDismissable
      dir={direction}
      className="group/palette fixed inset-x-0 top-0 z-100 flex h-(--visual-viewport-height) items-start justify-center px-4 pt-[12vh]"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-black/20 transition-opacity duration-150 ease-out group-data-[entering]/palette:opacity-0 group-data-[exiting]/palette:opacity-0"
      />
      <AriaModal
        className={cx(
          "relative flex max-h-[min(560px,76vh)] w-full max-w-[560px] flex-col outline-none",
          "transition-[opacity,translate,scale,filter] duration-200 ease-out",
          "data-[entering]:opacity-0 data-[exiting]:opacity-0",
          "motion-safe:data-[entering]:translate-y-2.5 motion-safe:data-[entering]:scale-[0.98] motion-safe:data-[entering]:blur-[4px]",
          "motion-safe:data-[exiting]:translate-y-2 motion-safe:data-[exiting]:scale-[0.98] motion-safe:data-[exiting]:blur-[3px]",
        )}
      >
        <AriaDialog
          aria-label={label}
          className={cx(
            "flex min-h-0 flex-1 flex-col overflow-clip rounded-3xl border border-border-button-default bg-background-primary-default shadow-sidebar outline-none",
            className,
          )}
        >
          <AriaAutocomplete
            inputValue={inputValue}
            onInputChange={(value) => {
              setUncontrolledInput(value);
              onInputChange?.(value);
            }}
            filter={filter === null ? undefined : filter ?? contains}
          >
            <AriaSearchField aria-label={label} autoFocus className="flex shrink-0 items-center gap-2 border-b border-separator-border p-3">
              <RiSearchLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
              <AriaInput
                placeholder={localize(placeholder)}
                className="min-w-0 flex-1 bg-transparent text-body-medium text-text-primary outline-none placeholder:text-text-tertiary [&::-webkit-search-cancel-button]:hidden"
              />
            </AriaSearchField>
            <div className="relative flex min-h-0 flex-1 flex-col">
              <AriaMenu
                aria-label={label}
                onScroll={fade.onScroll}
                onAction={(key) => {
                  setOpen(false);
                  onAction?.(key);
                }}
                renderEmptyState={() => (
                  <div className="flex min-h-32 flex-col items-center justify-center gap-1 px-4 text-center text-body-medium text-text-tertiary">
                    {localize(emptyState)}
                  </div>
                )}
                className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-2 outline-none [scrollbar-width:thin]"
              >
                {children}
              </AriaMenu>
              <ScrollFade progress={fade.progress} />
            </div>
          </AriaAutocomplete>
          {footer === false ? null : (
            <div className="flex shrink-0 items-center justify-between border-t border-separator-border px-3 py-2 text-body-regular text-text-tertiary">
              {localize(
                footer ?? (
                  <>
                    <span>Navigate with ↑ ↓</span>
                    <span className="flex items-center gap-1.5">
                      Select
                      <Kbd aria-label="Enter">
                        <RiCornerDownLeftLine className="size-3" aria-hidden />
                      </Kbd>
                    </span>
                  </>
                ),
              )}
            </div>
          )}
        </AriaDialog>
      </AriaModal>
    </AriaModalOverlay>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The `window` keydown listener is removed by its effect cleanup on every re-render and on unmount. React Aria restores focus to the previously focused element when the modal closes and unmounts it after the exit transition.

**Reduced motion.** The lift, scale and blur are behind `motion-safe:`, so under `prefers-reduced-motion: reduce` the panel only fades over 200ms and the scrim over 150ms.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not move DOM focus into the list. Autocomplete keeps focus in the field and moves a virtual highlight, so typing keeps working while arrowing through results.
- Do not give the shortcut effect an empty dependency array. The listener would capture the first `isOpen` and ⌘K could open the palette but never close it.
- Do not pass non-string children without `textValue`. The filter matches on `textValue`, which only falls back to children when they are a plain string.
- Do not pass `filter={null}` and forget to filter the children yourself. It turns off matching entirely, which is meant for custom ranking.

## Notes

- The palette's own copy (label, placeholder, empty state, footer hints) runs through `useTemplateCopy()`, so a TemplateCopyProvider translates it.
- Escape follows React Aria's search field: with text in the field it clears the query first, and a second Escape closes the palette.
- The overlay is z-100, the same layer as Modal and Drawer.

## Definition of done

Pressing the search bar, or ⌘K / Ctrl+K anywhere, dims the page and brings the palette in 12vh from the top with the field focused. Typing "set" leaves only Settings; arrow keys move the grey highlight; Enter closes the palette and the page reads "Ran Settings". With a query typed, Escape clears it, a second Escape closes the palette and focus returns to the search bar. Clicking the scrim also closes it.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
