import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'copy-page-button',
  title: 'Copy Page Button',
  category: 'action',
  kit: 'boardui',
  tags: ['copy', 'markdown', 'split-button', 'dropdown', 'docs', 'boardui'],
  blurb:
    'Docs split button: the main half copies the page as Markdown and flips to Copied, the chevron opens Copy and View as Markdown.',
  cost: 'css',
  motif: 'split',

  files: [{ path: 'registry/ui/copy-page-button.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The "Copy Page" control that sits beside a docs page title. One bordered 36px shell is split by a 1px rule into a copy button and a chevron trigger. The copy half writes the page Markdown to the clipboard and swaps its icon and label to a lime check and "Copied" for a moment. The chevron opens the kit Dropdown with "Copy as Markdown", "View as Markdown" and any extra actions you pass.',

  mechanism: [
    '`markdown` is a string or a function, sync or async, resolved at click time by `resolveMarkdown`. A page can then build or fetch its Markdown only when someone asks for it. A `busy` ref drops repeat clicks while an async source is still pending.',
    'The resolved text goes through `useCopyToClipboard` from `code-block-copy`. It tries the async Clipboard API, falls back to a hidden textarea with `execCommand("copy")`, and sets `copied` for `resetMs` (1600ms). The copy icon scales to 50% and fades out while the check scales in, and the label switches to `copiedLabel`.',
    'The chevron half is a `DropdownTrigger` inside a `Dropdown` whose open state is held here, controlled or uncontrolled. The chevron can then rotate 180 degrees while the menu is open. The `DropdownPopover` opens at `bottom end` with a 6px offset and 288px width, so its right edge lines up with the button.',
    'Each menu row closes the menu first and then runs its action. "Copy as Markdown" uses the same `copyPage` path, so the main half shows the copied state even though the click happened in the menu. "View as Markdown" becomes a real `<a target="_blank">` when `markdownHref` is set. Otherwise it calls `onViewMarkdown(text)`, or, as the fallback, opens a `text/plain` Blob URL in a new tab and revokes it after 60s.',
    'A visually hidden `role="status"` span announces "Page copied as Markdown" while `copied` is true, because the visible label change alone is not read out.',
  ],

  constants: [
    { name: 'shell', value: 'h-9, rounded-2lg (10px), 1px border-button-default, shadow-xs', why: 'This matches the kit secondary Button at medium size, so the split button lines up with other toolbar buttons.' },
    { name: 'chevron half', value: 'w-9 (36px square)', why: 'It gives the trigger a square hit area the same height as the shell, like an icon-only medium button.' },
    { name: 'resetMs', value: '1600', why: 'Long enough to read "Copied", short enough that a second copy still gives fresh feedback.' },
    { name: 'menu', value: 'placement bottom end, offset 6, w-[288px]', why: 'The button sits at the right of the title row, so the panel aligns to its end edge and stays inside the content column.' },
    { name: 'blob revoke', value: '60_000 ms', why: 'The new tab needs the object URL alive while it loads. Revoking at once would show a blank tab in some browsers.' },
  ],

  pitfalls: [
    'Awaiting a slow network fetch before `clipboard.writeText`. Safari drops the user activation after a long await and rejects the write. Keep async sources fast, or pass a string.',
    'Leaving the menu open after "Copy as Markdown". The copied feedback is on the main button, so the menu has to close first or the reader never sees it.',
    'Rendering "View as Markdown" as a button that calls `window.open` with a server URL. A plain anchor keeps middle-click and "open in new tab" working, which is why `markdownHref` renders an `<a>`.',
  ],

  notes: [
    '`actions` appends rows such as "Open in ChatGPT" or "Copy page link". Each row closes the menu before its `onAction` runs.',
    'The copy logic is shared with the Code Block copy button through `useCopyToClipboard` in `code-block-copy.tsx`.',
  ],

  apiSignature:
    'function CopyPageButton(props: { markdown: string | (() => string | Promise<string>); markdownHref?: string; onViewMarkdown?: (markdown: string) => void; actions?: readonly { id: string; label: string; description?: string; icon?: ComponentType; onAction: () => void }[]; label?: string; copiedLabel?: string; resetMs?: number; onCopied?: (markdown: string) => void; isMenuOpen?: boolean; onMenuOpenChange?: (isOpen: boolean) => void; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element',

  props: [
    { name: 'markdown', type: 'string | (() => string | Promise<string>)', description: 'The page as Markdown, or a function resolved at click time.' },
    { name: 'markdownHref', type: 'string', description: 'URL of the raw Markdown. "View as Markdown" becomes a new-tab link.' },
    { name: 'onViewMarkdown', type: '(markdown: string) => void', description: 'Custom "View as Markdown" handler, used when no `markdownHref` is set.' },
    { name: 'actions', type: 'readonly CopyPageAction[]', default: '[]', description: 'Extra menu rows under the built-in two.' },
    { name: 'label', type: 'string', default: '"Copy Page"', description: 'Main button label.' },
    { name: 'copiedLabel', type: 'string', default: '"Copied"', description: 'Label while the copied state lasts.' },
    { name: 'resetMs', type: 'number', default: '1600', description: 'Duration of the copied state in ms.' },
    { name: 'onCopied', type: '(markdown: string) => void', description: 'Called after a successful copy.' },
    { name: 'isMenuOpen / onMenuOpenChange', type: 'boolean / (isOpen: boolean) => void', default: 'uncontrolled', description: 'Controlled menu state.' },
  ],

  reducedMotion:
    'The icon cross-fade, the chevron rotation and the hover colours all carry `motion-reduce:transition-none`. The kit Dropdown panel skips its fade, scale and blur. Under reduced motion the state still changes, only without animation.',

  cleanup:
    'The copied-state timeout belongs to `useCopyToClipboard` and is cleared on unmount and before each new copy. The Blob URL fallback revokes its object URL after 60 seconds. Outside-press listeners belong to the kit Dropdown and go away when it closes.',

  acceptance:
    'Clicking "Copy Page" puts the exact Markdown on the clipboard, and the button reads "Copied" with a lime check for about 1.6s before going back. Clicking the chevron opens a menu below the button, aligned to its right edge, with "Copy as Markdown" and "View as Markdown", and the chevron points up. Choosing "Copy as Markdown" closes the menu and shows the same copied state. Choosing "View as Markdown" closes the menu and calls `onViewMarkdown` with the text, or opens `markdownHref` in a new tab. Escape closes the menu.',

  criticalRegion: 'critical',
};

export default meta;
