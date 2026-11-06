import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'command-palette',
  title: 'Command Palette',
  category: 'overlay',
  kit: 'boardui',
  tags: ['command-palette', 'search', 'cmdk', 'modal', 'menu', 'react-aria', 'boardui'],
  blurb:
    '⌘K palette of searchable commands with sections, icons and shortcuts, built-in or custom filtering, on React Aria Autocomplete and Menu.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/command-palette.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A searchable list of actions and destinations opened with ⌘K / Ctrl+K: jump to a page, run a command, find a record. It is React Aria\'s Autocomplete and Menu inside a modal dialog, so focus stays in the search field while the arrow keys move a highlight through the list, Enter runs the highlighted row, and focus goes back to where it was on close. The panel sits 12vh from the top over a 20% black scrim and fades in while rising 10px and sharpening from a 4px blur over 200ms.',

  mechanism: [
    '`CommandPalette` keeps open state and the query, each controllable (`isOpen` / `onOpenChange`, `inputValue` / `onInputChange`). Its `setOpen` notifies the parent and, on every opening, empties the query (also through `onInputChange("")`) and calls `fade.reset()`, so each opening starts with a blank field and the list at its top.',
    'The shortcut is a `keydown` listener on `window` that fires on `metaKey || ctrlKey` plus the `shortcut` letter (default "k", case-insensitive), calls `preventDefault` and toggles the palette. The effect has no dependency array, so it re-subscribes every render and always reads the current `isOpen`; `shortcut={false}` skips it.',
    'The overlay is an `AriaModalOverlay` (`isDismissable`, `dir` from `useDirection()`) laid out as `fixed inset-x-0 top-0 z-100 h-(--visual-viewport-height) items-start justify-center px-4 pt-[12vh]`, so the panel stays above a phone\'s keyboard. A sibling `aria-hidden` div is the `bg-black/20` scrim, fading over 150ms via `group-data-[entering]/palette` and `group-data-[exiting]/palette`.',
    '`AriaModal` is `max-h-[min(560px,76vh)] w-full max-w-[560px]` with `transition-[opacity,translate,scale,filter] duration-200 ease-out`: it enters from `opacity-0` and, under `motion-safe:`, `translate-y-2.5 scale-[0.98] blur-[4px]`, and exits to `translate-y-2 scale-[0.98] blur-[3px]`. Inside, an `AriaDialog` (`rounded-3xl`, button border, `shadow-sidebar`, `overflow-clip`) labelled by `aria-label` holds the search row, the list and the footer.',
    '`AriaAutocomplete` wires an `autoFocus` `AriaSearchField` (search icon plus a bare `AriaInput`, native cancel button hidden) to an `AriaMenu`. Its filter is `filter ?? contains`, where `contains` comes from `useFilter({ sensitivity: "base" })` (ignores case and accents); `filter={null}` passes no filter, so the children show as given. The menu is the `overflow-y-auto overscroll-contain` scroller with a `ScrollFade` over its top, `renderEmptyState` shows `emptyState`, and `onAction` closes the palette first and then calls the consumer\'s `onAction(key)`.',
    '`CommandPaletteItem` is an `AriaMenuItem` whose `textValue` falls back to string children; it is a `rounded-xl px-3 py-2.5` row that takes `bg-background-secondary-default` while focused (100ms colour transition), with a 16px icon, the label, an optional muted `description` and an optional `Kbd` shortcut. `CommandPaletteSection` is an `AriaMenuSection` with an `AriaHeader` title (`text-body-2-medium text-text-tertiary`) and `pt-2` on every section after the first. The default footer reads "Navigate with ↑ ↓" and "Select ↵"; `footer={false}` hides it.',
  ],

  constants: [
    {
      name: 'panel position',
      value: 'pt-[12vh], max-w-[560px], max-h-[min(560px,76vh)]',
      why: 'High enough that the results list has room to grow downward, but not pinned to the top edge; the height cap keeps the footer on screen on short viewports.',
    },
    {
      name: 'enter motion',
      value: '200ms ease-out, opacity 0, translate-y 10px, scale 0.98, blur 4px',
      why: 'The docs-site search\'s motion: a short lift and sharpen reads as the panel arriving, without travelling far enough to delay typing.',
    },
    {
      name: 'exit motion',
      value: 'translate-y 8px, scale 0.98, blur 3px',
      why: 'Slightly smaller than the entrance so closing feels quicker than opening.',
    },
    {
      name: 'scrim',
      value: 'bg-black/20, 150ms fade',
      why: 'Dims the page enough to focus the palette while keeping the page legible behind it.',
    },
    {
      name: 'shortcut',
      value: '"k" with ⌘ or Ctrl',
      why: 'The common convention for command palettes; `metaKey || ctrlKey` covers macOS and Windows/Linux with one listener.',
    },
  ],

  pitfalls: [
    'Do not move DOM focus into the list. Autocomplete keeps focus in the field and moves a virtual highlight, so typing keeps working while arrowing through results.',
    'Do not give the shortcut effect an empty dependency array. The listener would capture the first `isOpen` and ⌘K could open the palette but never close it.',
    'Do not pass non-string children without `textValue`. The filter matches on `textValue`, which only falls back to children when they are a plain string.',
    'Do not pass `filter={null}` and forget to filter the children yourself. It turns off matching entirely, which is meant for custom ranking.',
  ],

  notes: [
    'The palette\'s own copy (label, placeholder, empty state, footer hints) runs through `useTemplateCopy()`, so a TemplateCopyProvider translates it.',
    'Escape follows React Aria\'s search field: with text in the field it clears the query first, and a second Escape closes the palette.',
    'The overlay is z-100, the same layer as Modal and Drawer.',
  ],

  apiSignature:
    'function CommandPalette(props: { isOpen?: boolean; defaultOpen?: boolean; onOpenChange?: (isOpen: boolean) => void; shortcut?: string | false; "aria-label"?: string; placeholder?: string; inputValue?: string; onInputChange?: (value: string) => void; filter?: ((textValue: string, inputValue: string) => boolean) | null; onAction?: (key: Key) => void; emptyState?: ReactNode; footer?: ReactNode | false; className?: string; children: ReactNode }): JSX.Element\nfunction CommandPaletteItem(props: Omit<AriaMenuItemProps, "children" | "className"> & { icon?: IconComponent; description?: ReactNode; shortcut?: string; className?: string; children: ReactNode }): JSX.Element\nfunction CommandPaletteSection(props: { title?: ReactNode; className?: string; children: ReactNode }): JSX.Element',

  props: [
    { name: 'isOpen / onOpenChange', type: 'boolean / (isOpen: boolean) => void', description: 'Controlled open state; `defaultOpen` for uncontrolled.' },
    { name: 'shortcut', type: 'string | false', default: '"k"', description: 'Letter that toggles the palette with ⌘ / Ctrl; `false` turns it off.' },
    { name: 'aria-label', type: 'string', default: '"Command palette"', description: 'Accessible name of the dialog, field and menu.' },
    { name: 'placeholder', type: 'string', default: '"Type a command or search…"', description: 'Search field placeholder.' },
    { name: 'inputValue / onInputChange', type: 'string / (value: string) => void', description: 'Controlled query, e.g. for remote search.' },
    { name: 'filter', type: '((textValue, inputValue) => boolean) | null', default: 'locale-aware contains', description: 'Row matcher; `null` shows the children unfiltered.' },
    { name: 'onAction', type: '(key: Key) => void', description: 'Runs with the chosen item\'s id after the palette closes.' },
    { name: 'emptyState', type: 'ReactNode', default: '"No results"', description: 'Shown when nothing matches.' },
    { name: 'footer', type: 'ReactNode | false', default: 'navigate / select hints', description: 'The hint row under the list; `false` hides it.' },
    { name: 'CommandPaletteItem.icon / description / shortcut', type: 'IconComponent / ReactNode / string', description: 'Leading icon, trailing muted text and a keyboard hint for the row.' },
  ],

  reducedMotion:
    'The lift, scale and blur are behind `motion-safe:`, so under `prefers-reduced-motion: reduce` the panel only fades over 200ms and the scrim over 150ms.',

  cleanup:
    'The `window` keydown listener is removed by its effect cleanup on every re-render and on unmount. React Aria restores focus to the previously focused element when the modal closes and unmounts it after the exit transition.',

  acceptance:
    'Pressing the search bar, or ⌘K / Ctrl+K anywhere, dims the page and brings the palette in 12vh from the top with the field focused. Typing "set" leaves only Settings; arrow keys move the grey highlight; Enter closes the palette and the page reads "Ran Settings". With a query typed, Escape clears it, a second Escape closes the palette and focus returns to the search bar. Clicking the scrim also closes it.',

  criticalRegion: 'critical',
};

export default meta;
