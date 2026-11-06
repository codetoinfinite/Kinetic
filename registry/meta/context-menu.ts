import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'context-menu',
  title: 'Context Menu',
  category: 'overlay',
  kit: 'boardui',
  tags: ['context-menu', 'menu', 'right-click', 'long-press', 'submenu', 'react-aria', 'boardui'],
  blurb:
    'Right-click, long-press and Shift+F10 menu anchored to the pointer, with icons, shortcuts, submenus and checkable rows.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/context-menu.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'The actions for whatever is under the pointer: a file, a row, a message, a spot on a canvas. It opens on right-click, on a 500ms touch long-press, and on Shift+F10 or the Menu key while the target has focus, with the menu\'s corner at the pointer. React Aria\'s Menu in a non-modal popover supplies arrows, typeahead, submenus, Escape and focus return; the component adds the pointer anchor and, like the browser\'s own menu, closes on any press or scroll outside it. The compact panel (14px radius, 32px rows, 20px icons) grows from the pointer with the menu family\'s 150ms fade, scale and blur.',

  mechanism: [
    '`ContextMenuTrigger` wraps its children in a `display: contents` div (so it adds no box) with `[-webkit-touch-callout:none]`, and listens for `contextmenu`, `keydown`, `pointerdown`, `pointermove`, `pointerup` and `pointercancel`. Children can be a function of `{ isOpen }` so the target can highlight while its menu is open.',
    'Opening records the point and portals a 1px `pointer-events-none fixed` anchor div to `document.body` at `left: x, top: y`; `ContextMenu` positions an `AriaPopover` against it with `triggerRef={anchorRef}`, `placement="bottom start"`, `offset={2}` and `dir` from `useDirection()`, so the panel\'s corner sits at the pointer towards the reading direction and flips or shifts to stay on screen. `openCount` is bumped on every opening and used as the popover\'s `key`, so each menu mounts fresh at its own point.',
    'Right-click calls `preventDefault` and opens at `clientX/clientY` with the menu itself focused (`autoFocus` true, as the browser does). Keyboard openings (Shift+F10, the `ContextMenu` key, or a `contextmenu` event at 0,0) use `openFrom(element)`: just inside the focused element\'s start edge, `min(24, width/2)` in and `min(height, 40)` down, with `autoFocus="first"` so the first item is focused. A touch `pointerdown` starts a 500ms timer that is cancelled if the finger drifts more than 10px or lifts.',
    'The popover is `isNonModal`, so React Aria leaves it open on outside presses. While open, capture-phase `pointerdown` and `scroll` listeners on `document` close it unless the event target sits inside an element whose `data-context-menu` equals this trigger\'s `useId()` (the root panel and every submenu carry it). `contextmenu` events bubbling back through the portal are `preventDefault`ed so the browser menu never stacks on top; nested triggers: the innermost handles the event first and the outer sees `defaultPrevented`.',
    'Panels share `PANEL`: `z-110 min-w-52 max-w-[calc(100vw-32px)] rounded-[14px] border border-border-button-default bg-background-primary-default shadow-dropdown`, `origin-(--trigger-anchor-point)`, `transition-[opacity,scale,filter] duration-150 ease-out`, `opacity-0` on `data-[entering]` / `data-[exiting]` and, under `motion-safe:`, `scale-95 blur-[2px]`. `MenuList` is an `AriaMenu` scroller (`gap-1 p-1 overflow-y-auto overscroll-contain`) with a `ScrollFade`.',
    '`ContextMenuItem` is an `AriaMenuItem` using `MENU_ITEM` plus `px-2 py-1.5 text-body-medium`, highlighted with `MENU_ITEM_ACTIVE` while focused or while its submenu is open; it renders a 20px icon, the label, a check when selected, a `<kbd>` shortcut and a chevron (mirrored in RTL) when it has a submenu. `ContextMenuSubmenu` is an `AriaSubmenuTrigger` whose popover uses `offset={9}` and `crossOffset={-5}` and forwards the root\'s `onAction` and `close` through `RootMenuContext`, so submenu item ids reach the root handler.',
  ],

  constants: [
    {
      name: 'LONG_PRESS_MS',
      value: '500',
      why: 'How long a touch must rest before the menu opens: long enough not to fire on a tap or the start of a scroll, about what native long-press menus use.',
    },
    {
      name: 'LONG_PRESS_SLOP',
      value: '10 (px)',
      why: 'A resting finger still drifts a few pixels; more than 10px means the reader is scrolling or dragging, so the press is cancelled.',
    },
    {
      name: 'keyboard anchor',
      value: 'min(24, width/2) in from the start edge, min(height, 40) down',
      why: 'A keyboard opening has no pointer; this places the menu just inside the focused element so it visibly belongs to it, even on a small target.',
    },
    {
      name: 'submenu offset',
      value: 'offset 9, crossOffset -5',
      why: '9px clears the parent\'s 4px padding and 1px border for a 4px gap; -5px lines the submenu\'s first row up with the row that opened it.',
    },
    {
      name: 'panel',
      value: 'rounded-[14px], p-1, min-w-52 (208px), 150ms scale 0.95 / blur 2px',
      why: 'The compact look of Multi-agent Chat\'s chat menu it was promoted from, with the shared menu motion so all anchored menus open alike.',
    },
  ],

  pitfalls: [
    'Do not anchor the popover to the target element. The menu belongs at the pointer; a 1px fixed anchor portalled to the body at the click point is what React Aria positions against.',
    'Do not reuse one popover instance across openings. Without the `key={openCount}` remount, a second right-click elsewhere animates from the old position.',
    'Do not rely on React Aria to close a non-modal popover on outside presses; it does not. Close on capture-phase `pointerdown` and `scroll` outside elements tagged with this menu\'s `data-context-menu` id, or submenus will count as "outside".',
    'Do not let `contextmenu` from inside the open menu reach the browser. Events from the portal bubble through React to the trigger, so they must be `preventDefault`ed or the native menu appears on top.',
    'Do not depend on the browser\'s `contextmenu` event for touch. Not every mobile browser fires it on a long-press, so the trigger runs its own 500ms timer on touch `pointerdown` and opens at the press point.',
  ],

  notes: [
    '`isDisabled` on the trigger leaves the browser\'s own menu in place.',
    'A `ContextMenuSection` with `selectionMode` makes its rows checkable; selected rows show a check in the accent colour.',
    'The default `aria-label` is "Actions", passed through `useTemplateCopy()` so localized templates can translate it.',
  ],

  apiSignature:
    'function ContextMenuTrigger(props: { children: ReactNode | ((state: { isOpen: boolean }) => ReactNode); isDisabled?: boolean; onOpenChange?: (isOpen: boolean) => void; className?: string }): JSX.Element\nfunction ContextMenu<T extends object>(props: Omit<AriaMenuProps<T>, "className" | "autoFocus" | "onClose"> & { "aria-label"?: string; className?: string }): JSX.Element\nfunction ContextMenuItem(props: Omit<AriaMenuItemProps, "children" | "className"> & { icon?: IconComponent; shortcut?: string; variant?: "default" | "danger"; className?: string; children: ReactNode }): JSX.Element\nfunction ContextMenuSubmenu(props: { label: ReactNode; icon?: IconComponent; textValue?: string; isDisabled?: boolean; className?: string; children: ReactNode }): JSX.Element\nfunction ContextMenuSection(props: Omit<AriaMenuSectionProps<object>, "children" | "className"> & { title?: ReactNode; className?: string; children: ReactNode }): JSX.Element\nfunction ContextMenuSeparator(props: { className?: string }): JSX.Element',

  props: [
    { name: 'ContextMenuTrigger.children', type: 'ReactNode | ((state: { isOpen: boolean }) => ReactNode)', description: 'The target, then its ContextMenu. The function form lets the target highlight while open.' },
    { name: 'ContextMenuTrigger.isDisabled', type: 'boolean', default: 'false', description: 'Leave the browser\'s own menu in place.' },
    { name: 'ContextMenuTrigger.onOpenChange', type: '(isOpen: boolean) => void', description: 'Called when the menu opens or closes.' },
    { name: 'ContextMenu.aria-label', type: 'string', default: '"Actions"', description: 'Names the menu for screen readers.' },
    { name: 'ContextMenu.onAction', type: '(key: Key) => void', description: 'Runs with the chosen item\'s id, including items inside submenus.' },
    { name: 'ContextMenuItem.icon', type: 'IconComponent', description: 'Remix Icon component drawn at 20px before the label.' },
    { name: 'ContextMenuItem.shortcut', type: 'string', description: 'Keyboard hint at the end of the row, e.g. "⌘C".' },
    { name: 'ContextMenuItem.variant', type: '"default" | "danger"', default: '"default"', description: 'Danger tints the row and its icon with the destructive text colour.' },
    { name: 'ContextMenuSection.selectionMode', type: '"single" | "multiple"', description: 'Makes the section\'s rows checkable.' },
  ],

  reducedMotion:
    'The panel\'s scale and blur are behind `motion-safe:`, so under `prefers-reduced-motion: reduce` the menu and its submenus only fade in and out over 150ms.',

  cleanup:
    'The document `pointerdown` and `scroll` capture listeners exist only while the menu is open and are removed by their effect cleanup. An unmount effect clears any pending long-press timer. The portalled anchor div unmounts with the trigger.',

  acceptance:
    'Right-clicking anywhere on the file card opens the menu with its top-left corner at the pointer (no browser menu), the card highlights, and pressing outside or scrolling closes it. Hovering "Move to" opens a submenu aligned with that row; choosing "Archive" closes everything and the status reads "Moved to Archive". Tabbing to the card and pressing Shift+F10 opens the menu just inside the card with the first item focused; arrows, typeahead and Escape work. On touch, holding still for half a second opens it, while dragging cancels.',

  criticalRegion: 'critical',
};

export default meta;
