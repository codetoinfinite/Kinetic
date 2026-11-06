# Build: Context Menu

The actions for whatever is under the pointer: a file, a row, a message, a spot on a canvas. It opens on right-click, on a 500ms touch long-press, and on Shift+F10 or the Menu key while the target has focus, with the menu's corner at the pointer. React Aria's Menu in a non-modal popover supplies arrows, typeahead, submenus, Escape and focus return; the component adds the pointer anchor and, like the browser's own menu, closes on any press or scroll outside it. The compact panel (14px radius, 32px rows, 20px icons) grows from the pointer with the menu family's 150ms fade, scale and blur.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Right-click, long-press and Shift+F10 menu anchored to the pointer, with icons, shortcuts, submenus and checkable rows.

- Category: overlay
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. `ContextMenuTrigger` wraps its children in a `display: contents` div (so it adds no box) with `[-webkit-touch-callout:none]`, and listens for `contextmenu`, `keydown`, `pointerdown`, `pointermove`, `pointerup` and `pointercancel`. Children can be a function of `{ isOpen }` so the target can highlight while its menu is open.
2. Opening records the point and portals a 1px `pointer-events-none fixed` anchor div to `document.body` at `left: x, top: y`; `ContextMenu` positions an `AriaPopover` against it with `triggerRef={anchorRef}`, `placement="bottom start"`, `offset={2}` and `dir` from `useDirection()`, so the panel's corner sits at the pointer towards the reading direction and flips or shifts to stay on screen. `openCount` is bumped on every opening and used as the popover's `key`, so each menu mounts fresh at its own point.
3. Right-click calls `preventDefault` and opens at `clientX/clientY` with the menu itself focused (`autoFocus` true, as the browser does). Keyboard openings (Shift+F10, the `ContextMenu` key, or a `contextmenu` event at 0,0) use `openFrom(element)`: just inside the focused element's start edge, `min(24, width/2)` in and `min(height, 40)` down, with `autoFocus="first"` so the first item is focused. A touch `pointerdown` starts a 500ms timer that is cancelled if the finger drifts more than 10px or lifts.
4. The popover is `isNonModal`, so React Aria leaves it open on outside presses. While open, capture-phase `pointerdown` and `scroll` listeners on `document` close it unless the event target sits inside an element whose `data-context-menu` equals this trigger's `useId()` (the root panel and every submenu carry it). `contextmenu` events bubbling back through the portal are `preventDefault`ed so the browser menu never stacks on top; nested triggers: the innermost handles the event first and the outer sees `defaultPrevented`.
5. Panels share `PANEL`: `z-110 min-w-52 max-w-[calc(100vw-32px)] rounded-[14px] border border-border-button-default bg-background-primary-default shadow-dropdown`, `origin-(--trigger-anchor-point)`, `transition-[opacity,scale,filter] duration-150 ease-out`, `opacity-0` on `data-[entering]` / `data-[exiting]` and, under `motion-safe:`, `scale-95 blur-[2px]`. `MenuList` is an `AriaMenu` scroller (`gap-1 p-1 overflow-y-auto overscroll-contain`) with a `ScrollFade`.
6. `ContextMenuItem` is an `AriaMenuItem` using `MENU_ITEM` plus `px-2 py-1.5 text-body-medium`, highlighted with `MENU_ITEM_ACTIVE` while focused or while its submenu is open; it renders a 20px icon, the label, a check when selected, a `<kbd>` shortcut and a chevron (mirrored in RTL) when it has a submenu. `ContextMenuSubmenu` is an `AriaSubmenuTrigger` whose popover uses `offset={9}` and `crossOffset={-5}` and forwards the root's `onAction` and `close` through `RootMenuContext`, so submenu item ids reach the root handler.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `LONG_PRESS_MS = 500`
  How long a touch must rest before the menu opens: long enough not to fire on a tap or the start of a scroll, about what native long-press menus use.
- `LONG_PRESS_SLOP = 10 (px)`
  A resting finger still drifts a few pixels; more than 10px means the reader is scrolling or dragging, so the press is cancelled.
- `keyboard anchor = min(24, width/2) in from the start edge, min(height, 40) down`
  A keyboard opening has no pointer; this places the menu just inside the focused element so it visibly belongs to it, even on a small target.
- `submenu offset = offset 9, crossOffset -5`
  9px clears the parent's 4px padding and 1px border for a 4px gap; -5px lines the submenu's first row up with the row that opened it.
- `panel = rounded-[14px], p-1, min-w-52 (208px), 150ms scale 0.95 / blur 2px`
  The compact look of Multi-agent Chat's chat menu it was promoted from, with the shared menu motion so all anchored menus open alike.

## API

```ts
function ContextMenuTrigger(props: { children: ReactNode | ((state: { isOpen: boolean }) => ReactNode); isDisabled?: boolean; onOpenChange?: (isOpen: boolean) => void; className?: string }): JSX.Element
function ContextMenu<T extends object>(props: Omit<AriaMenuProps<T>, "className" | "autoFocus" | "onClose"> & { "aria-label"?: string; className?: string }): JSX.Element
function ContextMenuItem(props: Omit<AriaMenuItemProps, "children" | "className"> & { icon?: IconComponent; shortcut?: string; variant?: "default" | "danger"; className?: string; children: ReactNode }): JSX.Element
function ContextMenuSubmenu(props: { label: ReactNode; icon?: IconComponent; textValue?: string; isDisabled?: boolean; className?: string; children: ReactNode }): JSX.Element
function ContextMenuSection(props: Omit<AriaMenuSectionProps<object>, "children" | "className"> & { title?: ReactNode; className?: string; children: ReactNode }): JSX.Element
function ContextMenuSeparator(props: { className?: string }): JSX.Element
```

- `ContextMenuTrigger.children: ReactNode | ((state: { isOpen: boolean }) => ReactNode)`
  The target, then its ContextMenu. The function form lets the target highlight while open.
- `ContextMenuTrigger.isDisabled: boolean` — default `false`
  Leave the browser's own menu in place.
- `ContextMenuTrigger.onOpenChange: (isOpen: boolean) => void`
  Called when the menu opens or closes.
- `ContextMenu.aria-label: string` — default `"Actions"`
  Names the menu for screen readers.
- `ContextMenu.onAction: (key: Key) => void`
  Runs with the chosen item's id, including items inside submenus.
- `ContextMenuItem.icon: IconComponent`
  Remix Icon component drawn at 20px before the label.
- `ContextMenuItem.shortcut: string`
  Keyboard hint at the end of the row, e.g. "⌘C".
- `ContextMenuItem.variant: "default" | "danger"` — default `"default"`
  Danger tints the row and its icon with the destructive text colour.
- `ContextMenuSection.selectionMode: "single" | "multiple"`
  Makes the section's rows checkable.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ContextMenuTrigger({ children, isDisabled = false, onOpenChange, className }: ContextMenuTriggerProps) {
  const id = useId();
  const direction = useDirection();
  const anchorRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const press = useRef<{ x: number; y: number; timer: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [autoFocus, setAutoFocus] = useState<"first" | true>(true);

  const setOpen = useCallback(
    (next: boolean) => {
      if (openRef.current === next) return;
      openRef.current = next;
      setIsOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  const close = useCallback(() => setOpen(false), [setOpen]);

  // A pointer opening focuses the menu itself, as the browser's menu does;
  // a keyboard opening lands on the first item.
  const openAt = (x: number, y: number, focus: "first" | true) => {
    setPoint({ x, y });
    setAutoFocus(focus);
    setOpenCount((count) => count + 1);
    setOpen(true);
  };

  /** Keyboard openings have no pointer: open just inside the focused element's start edge. */
  const openFrom = (element: Element) => {
    const rect = element.getBoundingClientRect();
    const inset = Math.min(24, rect.width / 2);
    openAt(direction === "rtl" ? rect.right - inset : rect.left + inset, rect.top + Math.min(rect.height, 40), "first");
  };

  const cancelPress = () => {
    if (!press.current) return;
    window.clearTimeout(press.current.timer);
    press.current = null;
  };

  useEffect(() => () => {
    if (press.current) window.clearTimeout(press.current.timer);
  }, []);

  // React Aria leaves non-modal popovers open on outside presses, and the
  // anchor is fixed, so close on a press or a scroll outside this menu tree.
  useEffect(() => {
    if (!isOpen) return;
    const onOutside = (event: Event) => {
      if (menuOf(event.target) !== id) close();
    };
    document.addEventListener("pointerdown", onOutside, true);
    document.addEventListener("scroll", onOutside, true);
    return () => {
      document.removeEventListener("pointerdown", onOutside, true);
      document.removeEventListener("scroll", onOutside, true);
    };
  }, [isOpen, id, close]);

  const onContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    // Events from the open menu bubble here through its portal; never show
    // the browser's menu on top of it.
    if (menuOf(event.target) === id) {
      event.preventDefault();
      return;
    }
    if (isDisabled || event.defaultPrevented || !event.currentTarget.contains(event.target as Node)) return;
    event.preventDefault();
    if (openRef.current) return;
    // Some keyboard-made events carry no position.
    if (event.clientX === 0 && event.clientY === 0) openFrom(event.target as Element);
    else openAt(event.clientX, event.clientY, true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isDisabled || event.defaultPrevented || !event.currentTarget.contains(event.target as Node)) return;
    if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
    event.preventDefault();
    openFrom(event.target as Element);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || isDisabled || !event.currentTarget.contains(event.target as Node)) return;
    cancelPress();
    const { clientX: x, clientY: y } = event;
    press.current = {
      x,
      y,
      timer: window.setTimeout(() => {
        press.current = null;
        if (!openRef.current) openAt(x, y, true);
      }, LONG_PRESS_MS),
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (press.current && Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > LONG_PRESS_SLOP) {
      cancelPress();
    }
  };

  const content = typeof children === "function" ? children({ isOpen }) : children;

  return (
    <TriggerContext.Provider value={{ id, isOpen, openCount, anchorRef, autoFocus, close }}>
      <div
        className={cx("contents [-webkit-touch-callout:none]", className)}
        data-open={isOpen || undefined}
        onContextMenu={onContextMenu}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
      >
        {content}
      </div>
      {point
        ? createPortal(
            <div
              ref={anchorRef}
              aria-hidden
              className="pointer-events-none fixed size-px"
              style={{ left: point.x, top: point.y }}
            />,
            document.body,
          )
        : null}
    </TriggerContext.Provider>
  );
}

/* ------------------------------------------------------------------- menu */

/** A menu's scrolling list, with the shared progressive top blur. */
function MenuList<T extends object>({ children, ...props }: Omit<AriaMenuProps<T>, "className">) {
  const fade = useScrollFade();
  return (
    <div className="relative flex min-h-0 flex-col">
      <AriaMenu
        {...props}
        onScroll={fade.onScroll}
        className="flex min-h-0 flex-col gap-1 overflow-y-auto overscroll-contain p-1 outline-none [scrollbar-width:thin]"
      >
        {children}
      </AriaMenu>
      <ScrollFade progress={fade.progress} />
    </div>
  );
}

export interface ContextMenuProps<T extends object> extends Omit<AriaMenuProps<T>, "className" | "autoFocus" | "onClose"> {
  /** Names the menu for screen readers. Default "Actions". */
  "aria-label"?: string;
  /** Classes on the panel, e.g. a width. */
  className?: string;
}

export function ContextMenu<T extends object>({
  "aria-label": ariaLabel = "Actions",
  onAction,
  className,
  ...props
}: ContextMenuProps<T>) {
  const trigger = useContext(TriggerContext);
  const direction = useDirection();
  const localize = useTemplateCopy();
  if (!trigger) throw new Error("ContextMenu must be inside a ContextMenuTrigger.");
  const { id, isOpen, openCount, anchorRef, autoFocus, close } = trigger;

  return (
    <RootMenuContext.Provider
      value={{ id, onAction: onAction as ((key: Key, value: object) => void) | undefined, close }}
    >
      <AriaPopover
        key={openCount}
        triggerRef={anchorRef}
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        isNonModal
        placement="bottom start"
        offset={2}
        dir={direction}
        data-context-menu={id}
        className={cx(PANEL, className)}
      >
        <MenuList {...props} aria-label={localize(ariaLabel)} autoFocus={autoFocus} onAction={onAction} onClose={close} />
      </AriaPopover>
    </RootMenuContext.Provider>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The document `pointerdown` and `scroll` capture listeners exist only while the menu is open and are removed by their effect cleanup. An unmount effect clears any pending long-press timer. The portalled anchor div unmounts with the trigger.

**Reduced motion.** The panel's scale and blur are behind `motion-safe:`, so under `prefers-reduced-motion: reduce` the menu and its submenus only fade in and out over 150ms.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not anchor the popover to the target element. The menu belongs at the pointer; a 1px fixed anchor portalled to the body at the click point is what React Aria positions against.
- Do not reuse one popover instance across openings. Without the `key={openCount}` remount, a second right-click elsewhere animates from the old position.
- Do not rely on React Aria to close a non-modal popover on outside presses; it does not. Close on capture-phase `pointerdown` and `scroll` outside elements tagged with this menu's `data-context-menu` id, or submenus will count as "outside".
- Do not let `contextmenu` from inside the open menu reach the browser. Events from the portal bubble through React to the trigger, so they must be `preventDefault`ed or the native menu appears on top.
- Do not depend on the browser's `contextmenu` event for touch. Not every mobile browser fires it on a long-press, so the trigger runs its own 500ms timer on touch `pointerdown` and opens at the press point.

## Notes

- `isDisabled` on the trigger leaves the browser's own menu in place.
- A `ContextMenuSection` with `selectionMode` makes its rows checkable; selected rows show a check in the accent colour.
- The default `aria-label` is "Actions", passed through `useTemplateCopy()` so localized templates can translate it.

## Definition of done

Right-clicking anywhere on the file card opens the menu with its top-left corner at the pointer (no browser menu), the card highlights, and pressing outside or scrolling closes it. Hovering "Move to" opens a submenu aligned with that row; choosing "Archive" closes everything and the status reads "Moved to Archive". Tabbing to the card and pressing Shift+F10 opens the menu just inside the card with the first item focused; arrows, typeahead and Escape work. On touch, holding still for half a second opens it, while dragging cancels.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
