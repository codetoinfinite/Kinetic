# Build: Copy Page Button

The "Copy Page" control that sits beside a docs page title. One bordered 36px shell is split by a 1px rule into a copy button and a chevron trigger. The copy half writes the page Markdown to the clipboard and swaps its icon and label to a lime check and "Copied" for a moment. The chevron opens the kit Dropdown with "Copy as Markdown", "View as Markdown" and any extra actions you pass.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Docs split button: the main half copies the page as Markdown and flips to Copied, the chevron opens Copy and View as Markdown.

- Category: action
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. `markdown` is a string or a function, sync or async, resolved at click time by `resolveMarkdown`. A page can then build or fetch its Markdown only when someone asks for it. A `busy` ref drops repeat clicks while an async source is still pending.
2. The resolved text goes through `useCopyToClipboard` from `code-block-copy`. It tries the async Clipboard API, falls back to a hidden textarea with `execCommand("copy")`, and sets `copied` for `resetMs` (1600ms). The copy icon scales to 50% and fades out while the check scales in, and the label switches to `copiedLabel`.
3. The chevron half is a `DropdownTrigger` inside a `Dropdown` whose open state is held here, controlled or uncontrolled. The chevron can then rotate 180 degrees while the menu is open. The `DropdownPopover` opens at `bottom end` with a 6px offset and 288px width, so its right edge lines up with the button.
4. Each menu row closes the menu first and then runs its action. "Copy as Markdown" uses the same `copyPage` path, so the main half shows the copied state even though the click happened in the menu. "View as Markdown" becomes a real `<a target="_blank">` when `markdownHref` is set. Otherwise it calls `onViewMarkdown(text)`, or, as the fallback, opens a `text/plain` Blob URL in a new tab and revokes it after 60s.
5. A visually hidden `role="status"` span announces "Page copied as Markdown" while `copied` is true, because the visible label change alone is not read out.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `shell = h-9, rounded-2lg (10px), 1px border-button-default, shadow-xs`
  This matches the kit secondary Button at medium size, so the split button lines up with other toolbar buttons.
- `chevron half = w-9 (36px square)`
  It gives the trigger a square hit area the same height as the shell, like an icon-only medium button.
- `resetMs = 1600`
  Long enough to read "Copied", short enough that a second copy still gives fresh feedback.
- `menu = placement bottom end, offset 6, w-[288px]`
  The button sits at the right of the title row, so the panel aligns to its end edge and stays inside the content column.
- `blob revoke = 60_000 ms`
  The new tab needs the object URL alive while it loads. Revoking at once would show a blank tab in some browsers.

## API

```ts
function CopyPageButton(props: { markdown: string | (() => string | Promise<string>); markdownHref?: string; onViewMarkdown?: (markdown: string) => void; actions?: readonly { id: string; label: string; description?: string; icon?: ComponentType; onAction: () => void }[]; label?: string; copiedLabel?: string; resetMs?: number; onCopied?: (markdown: string) => void; isMenuOpen?: boolean; onMenuOpenChange?: (isOpen: boolean) => void; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element
```

- `markdown: string | (() => string | Promise<string>)`
  The page as Markdown, or a function resolved at click time.
- `markdownHref: string`
  URL of the raw Markdown. "View as Markdown" becomes a new-tab link.
- `onViewMarkdown: (markdown: string) => void`
  Custom "View as Markdown" handler, used when no `markdownHref` is set.
- `actions: readonly CopyPageAction[]` — default `[]`
  Extra menu rows under the built-in two.
- `label: string` — default `"Copy Page"`
  Main button label.
- `copiedLabel: string` — default `"Copied"`
  Label while the copied state lasts.
- `resetMs: number` — default `1600`
  Duration of the copied state in ms.
- `onCopied: (markdown: string) => void`
  Called after a successful copy.
- `isMenuOpen / onMenuOpenChange: boolean / (isOpen: boolean) => void` — default `uncontrolled`
  Controlled menu state.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const copyPage = async () => {
  // Ignore double clicks while an async source is still resolving.
  if (busy.current) return;
  busy.current = true;
  try {
    const text = await resolveMarkdown(markdown);
    if (await copy(text)) onCopied?.(text);
  } finally {
    busy.current = false;
  }
};

const viewMarkdown = async () => {
  setOpen(false);
  if (markdownHref) return; // the anchor navigates on its own
  const text = await resolveMarkdown(markdown);
  if (onViewMarkdown) onViewMarkdown(text);
  else openMarkdownBlob(text);
};

const runFromMenu = (action: () => void | Promise<void>) => () => {
  setOpen(false);
  void action();
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The copied-state timeout belongs to `useCopyToClipboard` and is cleared on unmount and before each new copy. The Blob URL fallback revokes its object URL after 60 seconds. Outside-press listeners belong to the kit Dropdown and go away when it closes.

**Reduced motion.** The icon cross-fade, the chevron rotation and the hover colours all carry `motion-reduce:transition-none`. The kit Dropdown panel skips its fade, scale and blur. Under reduced motion the state still changes, only without animation.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Awaiting a slow network fetch before `clipboard.writeText`. Safari drops the user activation after a long await and rejects the write. Keep async sources fast, or pass a string.
- Leaving the menu open after "Copy as Markdown". The copied feedback is on the main button, so the menu has to close first or the reader never sees it.
- Rendering "View as Markdown" as a button that calls `window.open` with a server URL. A plain anchor keeps middle-click and "open in new tab" working, which is why `markdownHref` renders an `<a>`.

## Notes

- `actions` appends rows such as "Open in ChatGPT" or "Copy page link". Each row closes the menu before its `onAction` runs.
- The copy logic is shared with the Code Block copy button through `useCopyToClipboard` in `code-block-copy.tsx`.

## Definition of done

Clicking "Copy Page" puts the exact Markdown on the clipboard, and the button reads "Copied" with a lime check for about 1.6s before going back. Clicking the chevron opens a menu below the button, aligned to its right edge, with "Copy as Markdown" and "View as Markdown", and the chevron points up. Choosing "Copy as Markdown" closes the menu and shows the same copied state. Choosing "View as Markdown" closes the menu and calls `onViewMarkdown` with the text, or opens `markdownHref` in a new tab. Escape closes the menu.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
