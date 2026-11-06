# Build: Quick Search Button

The search entry point for an app or docs header. It looks like a small search field (magnifier, "Search..." and a ⌘ K key hint) but is a button. Clicking it, or pressing ⌘K / Ctrl+K anywhere on the page, opens the existing CommandPalette with whatever sections and items you pass as children; running an item closes the palette and reports its id.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A "Search..." field-style trigger with a ⌘K hint that opens the kit command palette, and a global ⌘K / Ctrl+K shortcut that toggles it.

- Category: action
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1, @remixicon/react@^4.9.0

## How it works

1. The trigger is a native `button` with `aria-haspopup="dialog"`, `aria-expanded` and `aria-keyshortcuts` ("Meta+K" on Apple platforms, "Control+K" elsewhere). The key hint is two kit `Kbd` elements marked `aria-hidden`, since the shortcut is already exposed through `aria-keyshortcuts`.
2. Open state lives here and is passed to `CommandPalette` as `isOpen` / `onOpenChange`, with the palette's own shortcut turned off (`shortcut={false}`), so exactly one keyboard listener exists. The query is controlled too (`inputValue` / `onInputChange`) and cleared on every open, because the palette only resets it when it opens itself.
3. A single `keydown` listener on `window`, added in an effect and removed in its cleanup, accepts ⌘ or Ctrl plus `shortcutKey` (default "k"), ignores Alt, Shift and auto-repeat, calls `preventDefault` so the browser address-bar shortcut does not fire, and toggles the palette.
4. The ⌘ versus Ctrl glyph comes from `useSyncExternalStore` with a server snapshot of "Apple", so server HTML and the hydration pass agree and Windows or Linux visitors see "Ctrl" right after hydration with no mismatch warning.
5. Everything inside the palette (filtering, arrow-key navigation, Escape, focus return to the trigger, the modal scrim) is the kit CommandPalette built on React Aria Autocomplete and Menu.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `shortcutKey = "k"`
  ⌘K / Ctrl+K is the convention people already try first for search and command menus.
- `trigger width = w-full, max 16rem`
  Wide enough to read as a field in a header, and it shrinks with a truncating label in tight bars.

## API

```ts
function QuickSearchButton(props: { label?: string; shortcutKey?: string; placeholder?: string; paletteLabel?: string; onAction?: (key: Key) => void; children: ReactNode; className?: string }): JSX.Element
```

- `label: string` — default `"Search..."`
  Trigger text.
- `shortcutKey: string` — default `"k"`
  Letter pressed with ⌘ or Ctrl to toggle the palette; also shown in the key hint.
- `placeholder: string`
  Palette input placeholder; the palette default is used when omitted.
- `paletteLabel: string` — default `"Search"`
  Accessible name of the palette dialog.
- `onAction: (key: Key) => void`
  Called with the id of the item that was run.
- `children: ReactNode`
  CommandPaletteSection and CommandPaletteItem elements.
- `className: string`
  Merged onto the trigger button.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function QuickSearchButton({
  label = "Search...",
  shortcutKey = "k",
  placeholder,
  paletteLabel = "Search",
  onAction,
  children,
  className,
}: QuickSearchButtonProps) {
  const [open, setOpen] = useState(false);
  // The query is controlled here: the palette only clears it when it opens itself, and here it is opened from outside.
  const [query, setQuery] = useState("");
  // Server and first hydration render use the Mac glyph; the real platform lands right after without a mismatch.
  const apple = useSyncExternalStore(noop, isApple, () => true);
  const key = shortcutKey.toLowerCase();

  // One global listener for ⌘K / Ctrl+K. It toggles, so the same chord closes an open palette.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== key || event.repeat) return;
      event.preventDefault();
      setQuery("");
      setOpen((current) => !current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts={`${apple ? "Meta" : "Control"}+${key.toUpperCase()}`}
        className={cx(
          "group inline-flex h-9 w-full max-w-64 min-w-0 cursor-pointer items-center gap-2 rounded-xl bg-background-primary-default pr-1.5 pl-3 text-start shadow-xs ring-1 ring-separator-border outline-none",
          "transition-[background-color,box-shadow] duration-150 ease-out hover:bg-background-secondary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none",
          className,
        )}
      >
        <RiSearchLine
          aria-hidden
          className="size-4 shrink-0 text-foreground-icon-tertiary transition-colors group-hover:text-foreground-icon-secondary motion-reduce:transition-none"
        />
        <span className="min-w-0 flex-1 truncate text-body-2-regular text-text-tertiary transition-colors group-hover:text-text-secondary motion-reduce:transition-none">
          {label}
        </span>
        <span aria-hidden className="flex shrink-0 items-center gap-0.5">
          <Kbd className="min-w-5">{apple ? "⌘" : "Ctrl"}</Kbd>
          <Kbd className="min-w-5">{key.toUpperCase()}</Kbd>
        </span>
      </button>

      <CommandPalette
        isOpen={open}
        onOpenChange={setOpen}
        shortcut={false}
        aria-label={paletteLabel}
        placeholder={placeholder}
        inputValue={query}
        onInputChange={setQuery}
        onAction={onAction}
      >
        {children}
      </CommandPalette>
    </>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The window `keydown` listener is removed when the component unmounts or `shortcutKey` changes. The palette is closed state, not a portal left behind.

**Reduced motion.** The trigger's hover colour transitions use `motion-reduce:transition-none`. The palette's open and close motion is handled by the kit CommandPalette.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Leaving the palette's built-in shortcut on while adding your own. Both listeners toggle on the same keypress and the palette opens and closes in one event; this component passes `shortcut={false}`.
- Reading `navigator` during render to choose ⌘ or Ctrl. The server has no navigator and the markup mismatches on hydration; `useSyncExternalStore` with a server snapshot avoids it.
- Controlling `isOpen` but not the query. The palette clears its own query only when it opens itself, so a palette opened from outside would come back showing the last search; the query is reset here on each open.
- Forgetting `preventDefault` on Ctrl+K. In Chrome and Firefox on Windows and Linux it focuses the browser search bar instead.

## Notes

- Children are ordinary `CommandPaletteSection` / `CommandPaletteItem` elements, so items can have icons, descriptions and shortcut hints.
- Mount one per page. Two instances would each register the global shortcut.

## Definition of done

The demo header shows a "Search..." field with a ⌘ K hint and no dialog open. Clicking it opens the palette with Pages and Actions sections and focus in the input. Typing "pri" leaves only Pricing; Enter runs it, closes the palette, returns focus to the trigger and the demo shows "Ran: Pricing". Pressing Ctrl+K (or ⌘K) opens it again with an empty query and pressing it a second time closes it. Escape also closes it.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
