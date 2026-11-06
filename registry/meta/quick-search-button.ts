/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Quick Search Button" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'quick-search-button',
  title: 'Quick Search Button',
  category: 'action',
  kit: 'boardui',
  tags: ['search', 'command-palette', 'shortcut', 'kbd', 'header', 'boardui'],
  blurb:
    'A "Search..." field-style trigger with a ⌘K hint that opens the kit command palette, and a global ⌘K / Ctrl+K shortcut that toggles it.',
  cost: 'dom',
  motif: 'stack',

  files: [
    { path: 'registry/ui/quick-search-button.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: ['react-aria-components@^1.22.1', '@remixicon/react@^4.9.0'],

  summary:
    'The search entry point for an app or docs header. It looks like a small search field (magnifier, "Search..." and a ⌘ K key hint) but is a button. Clicking it, or pressing ⌘K / Ctrl+K anywhere on the page, opens the existing CommandPalette with whatever sections and items you pass as children; running an item closes the palette and reports its id.',

  mechanism: [
    'The trigger is a native `button` with `aria-haspopup="dialog"`, `aria-expanded` and `aria-keyshortcuts` ("Meta+K" on Apple platforms, "Control+K" elsewhere). The key hint is two kit `Kbd` elements marked `aria-hidden`, since the shortcut is already exposed through `aria-keyshortcuts`.',
    'Open state lives here and is passed to `CommandPalette` as `isOpen` / `onOpenChange`, with the palette\'s own shortcut turned off (`shortcut={false}`), so exactly one keyboard listener exists. The query is controlled too (`inputValue` / `onInputChange`) and cleared on every open, because the palette only resets it when it opens itself.',
    'A single `keydown` listener on `window`, added in an effect and removed in its cleanup, accepts ⌘ or Ctrl plus `shortcutKey` (default "k"), ignores Alt, Shift and auto-repeat, calls `preventDefault` so the browser address-bar shortcut does not fire, and toggles the palette.',
    'The ⌘ versus Ctrl glyph comes from `useSyncExternalStore` with a server snapshot of "Apple", so server HTML and the hydration pass agree and Windows or Linux visitors see "Ctrl" right after hydration with no mismatch warning.',
    'Everything inside the palette (filtering, arrow-key navigation, Escape, focus return to the trigger, the modal scrim) is the kit CommandPalette built on React Aria Autocomplete and Menu.',
  ],

  constants: [
    { name: 'shortcutKey', value: '"k"', why: '⌘K / Ctrl+K is the convention people already try first for search and command menus.' },
    { name: 'trigger width', value: 'w-full, max 16rem', why: 'Wide enough to read as a field in a header, and it shrinks with a truncating label in tight bars.' },
  ],

  pitfalls: [
    'Leaving the palette\'s built-in shortcut on while adding your own. Both listeners toggle on the same keypress and the palette opens and closes in one event; this component passes `shortcut={false}`.',
    'Reading `navigator` during render to choose ⌘ or Ctrl. The server has no navigator and the markup mismatches on hydration; `useSyncExternalStore` with a server snapshot avoids it.',
    'Controlling `isOpen` but not the query. The palette clears its own query only when it opens itself, so a palette opened from outside would come back showing the last search; the query is reset here on each open.',
    'Forgetting `preventDefault` on Ctrl+K. In Chrome and Firefox on Windows and Linux it focuses the browser search bar instead.',
  ],

  notes: [
    'Children are ordinary `CommandPaletteSection` / `CommandPaletteItem` elements, so items can have icons, descriptions and shortcut hints.',
    'Mount one per page. Two instances would each register the global shortcut.',
  ],

  apiSignature:
    'function QuickSearchButton(props: { label?: string; shortcutKey?: string; placeholder?: string; paletteLabel?: string; onAction?: (key: Key) => void; children: ReactNode; className?: string }): JSX.Element',

  props: [
    { name: 'label', type: 'string', default: '"Search..."', description: 'Trigger text.' },
    { name: 'shortcutKey', type: 'string', default: '"k"', description: 'Letter pressed with ⌘ or Ctrl to toggle the palette; also shown in the key hint.' },
    { name: 'placeholder', type: 'string', description: 'Palette input placeholder; the palette default is used when omitted.' },
    { name: 'paletteLabel', type: 'string', default: '"Search"', description: 'Accessible name of the palette dialog.' },
    { name: 'onAction', type: '(key: Key) => void', description: 'Called with the id of the item that was run.' },
    { name: 'children', type: 'ReactNode', description: 'CommandPaletteSection and CommandPaletteItem elements.' },
    { name: 'className', type: 'string', description: 'Merged onto the trigger button.' },
  ],

  reducedMotion:
    'The trigger\'s hover colour transitions use `motion-reduce:transition-none`. The palette\'s open and close motion is handled by the kit CommandPalette.',

  cleanup:
    'The window `keydown` listener is removed when the component unmounts or `shortcutKey` changes. The palette is closed state, not a portal left behind.',

  acceptance:
    'The demo header shows a "Search..." field with a ⌘ K hint and no dialog open. Clicking it opens the palette with Pages and Actions sections and focus in the input. Typing "pri" leaves only Pricing; Enter runs it, closes the palette, returns focus to the trigger and the demo shows "Ran: Pricing". Pressing Ctrl+K (or ⌘K) opens it again with an empty query and pressing it a second time closes it. Escape also closes it.',

  criticalRegion: 'critical',
};

export default meta;
