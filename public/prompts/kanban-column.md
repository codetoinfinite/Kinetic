# Build: Kanban Column

The project-board column: a 20px-radius grey panel with "Backlog 3/8" in the header, a ghost "…" menu and "+" button, and a stack of ticket cards. `KanbanBoard` wraps the columns in a horizontal scroller and owns one move model with three inputs: pointer drag with a ghost card and an opening drop slot, Alt + arrow keys on a focused card, and a per-card "Move" menu. Every route ends in a single `onMove({ itemId, from, to, index })`, which `moveItem` applies to a column map.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Board column with name, WIP count and add button; cards move by pointer drag, Alt + arrow keys or a per-card move menu.

- Category: display
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. A press on a `KanbanItem` row (mouse or pen, primary button, not on a nested control) records the pointer and attaches window `pointermove` / `pointerup` / `pointercancel` / `keydown` / `blur` listeners. Nothing renders until the pointer has travelled 4px, so a plain click still opens the card.
2. Once the drag starts, the row renders its card as `dragState: "source"` (dimmed in place) and portals a `dragState: "overlay"` copy into a fixed, `pointer-events-none`, `inert` ghost. The ghost is moved with `translate3d` written straight to its style from the pointer events, so following the pointer never re-renders React.
3. Hit testing runs `document.elementFromPoint` (the ghost is transparent to it), takes the closest `[data-kanban-column]` and counts the items whose vertical midline is above the pointer. The dragged card still counts, so its own spot and the one after it are no-ops and draw no slot. The column splices a dashed `<li>` the height of the card into its children at that index. Items below the slot shift down by its height, which gives built-in hysteresis: the pointer must cross back over the unshifted midline before the slot moves up again.
4. Release re-runs the hit test at the `pointerup` point, so a single move then release with no frame in between (how automated drags behave) still lands. A drop below the origin in the same column subtracts one from the index. Escape, `pointercancel` or window blur end the session without a move, and the click that follows a drag is swallowed in the capture phase.
5. A `requestAnimationFrame` loop scrolls the board sideways while the pointer sits within 56px of its left or right edge, at up to 18px per frame scaled by depth. It re-tests the hit after each scroll step.
6. Keyboard and menu moves read the live column order and counts from the DOM (`data-kanban-column`, `data-kanban-title`), commit the move, then stash `itemId + column` in a ref. The row that mounts there pulls focus onto its `[data-kanban-focus]` element, and a `role="status"` region announces "FE-79 … moved to Review, position 2 of 2."

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `DRAG_THRESHOLD = 4px`
  Below this a press stays a click; above it, a drag. Small enough that a quick flick still picks the card up.
- `EDGE / MAX_SCROLL_STEP = 56px / 18px per frame`
  A band about two cursor widths deep; speed grows with depth so a nudge creeps and a push races.
- `column width = w-68 (272px), p-1.5, gap-1.5`
  Matches the board: 260px cards sit 6px inside a 20px-radius panel with 6px between cards.
- `drop slot = dragged card height, dashed border-button-hover, tertiary 60%`
  Same height as the card so the column does not jump on drop; dashed so it reads as an empty place, not a card.

## API

```ts
function KanbanBoard(props: HTMLAttributes<HTMLDivElement> & { onMove: (move: KanbanMove) => void; instructions?: string; children: ReactNode }): JSX.Element; function KanbanColumn(props: { id: string; title: string; count?: number; limit?: number; onAdd?: () => void; addLabel?: string; menu?: ReactNode; empty?: ReactNode; headingLevel?: 2 | 3 | 4; children?: ReactNode }): JSX.Element; function KanbanItem(props: { id: string; label: string; children: ReactNode | ((state: { dragState: "idle" | "source" | "overlay" }) => ReactNode) }): JSX.Element; function KanbanMoveMenu(props: { className?: string }): JSX.Element | null; function moveItem<T extends { id: string }>(columns: Record<string, readonly T[]>, move: KanbanMove): Record<string, T[]>; interface KanbanMove { itemId: string; from: string; to: string; index: number }
```

- `onMove (KanbanBoard): (move: KanbanMove) => void`
  Fires once per finished move from drag, keyboard or menu. `index` is the position in `to` after the card left `from`.
- `instructions (KanbanBoard): string`
  Screen-reader help linked to the board with aria-describedby.
- `id (KanbanColumn): string`
  Column key used in `KanbanMove.from` / `to`.
- `title (KanbanColumn): string`
  Header name; also used in announcements and the move menu.
- `count / limit (KanbanColumn): number`
  Header shows "count/limit"; count defaults to the item count and turns red past the limit.
- `onAdd / addLabel (KanbanColumn): () => void / string`
  Shows the "+" button and names it (default "Add card to {title}").
- `menu (KanbanColumn): ReactNode`
  Extra header controls before "+"; style triggers with `kanbanIconButtonClass`.
- `empty (KanbanColumn): ReactNode`
  Replaces the dashed "No cards" placeholder.
- `id / label (KanbanItem): string`
  Card key, and the short name used in announcements and the menu.
- `children (KanbanItem): ReactNode | ({ dragState }) => ReactNode`
  The card; the function form receives "idle", "source" or "overlay".

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function KanbanBoard({
  onMove,
  instructions = "Drag a card to another column, or focus a card and press Alt with an arrow key: left and right change column, up and down change position. Each card also has a move menu.",
  className,
  children,
  ref,
  "aria-label": ariaLabel = "Board",
  ...props
}: KanbanBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLElement | null>(null);
  const session = useRef<Session | null>(null);
  const onMoveRef = useRef(onMove);
  const pendingFocus = useRef<string | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<DragView | null>(null);
  const [lastMoved, setLastMoved] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const hintId = useId();

  useEffect(() => {
    onMoveRef.current = onMove;
  });
  // Unmounting mid-drag must not leave window listeners or a frame loop behind.
  useEffect(() => () => session.current?.detach(), []);

  const setRefs = useCallback(
    (element: HTMLDivElement | null) => {
      boardRef.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) ref.current = element;
    },
    [ref],
  );

  const locate = (itemId: string): Location | null => {
    const columns = Array.from(boardRef.current?.querySelectorAll<HTMLElement>("[data-kanban-column]") ?? []).map((el) => ({
      id: el.dataset.kanbanColumn ?? "",
      title: el.dataset.kanbanTitle ?? "",
      items: Array.from(el.querySelectorAll<HTMLElement>("[data-kanban-item]")),
    }));
    for (const [column, entry] of columns.entries()) {
      const index = entry.items.findIndex((el) => el.dataset.kanbanItem === itemId);
      if (index >= 0) return { columns: columns.map(({ id, title, items }) => ({ id, title, count: items.length })), column, index };
    }
    return null;
  };

  const commit = (move: KanbanMove, label: string, focus: boolean) => {
    const dest = locate(move.itemId)?.columns.find((column) => column.id === move.to);
    onMoveRef.current(move);
    if (focus) pendingFocus.current = move.itemId + FOCUS_KEY + move.to;
    setLastMoved(move.itemId);
    if (dest) {
      const total = dest.count + (move.from === move.to ? 0 : 1);
      setAnnouncement(`${label} moved to ${dest.title}, position ${move.index + 1} of ${total}.`);
    }
  };

  const step = (itemId: string, label: string, direction: Direction) => {
    const location = locate(itemId);
    const here = location?.columns[location.column];
    if (!location || !here) return;
    let to = here;
    let index = location.index;
    if (direction === "up") index -= 1;
    else if (direction === "down") index += 1;
    else {
      const target = location.columns[location.column + (direction === "next" ? 1 : -1)];
      if (!target) return;
      to = target;
      index = Math.min(location.index, target.count);
    }
    if (to === here && (index < 0 || index >= here.count)) return;
    commit({ itemId, from: here.id, to: to.id, index }, label, true);
  };

  /** Column under the point and the insertion index from item midlines (the dragged card still counts). */
  const hitTest = (x: number, y: number) => {
    const column = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-kanban-column]");
    if (!column || !boardRef.current?.contains(column)) return null;
    let index = 0;
    for (const item of column.querySelectorAll<HTMLElement>("[data-kanban-item]")) {
      const rect = item.getBoundingClientRect();
      if (y < rect.top + rect.height / 2) break;
      index += 1;
    }
    return { column: column.dataset.kanbanColumn ?? "", index };
  };

  const placeGhost = () => {
    const s = session.current;
    if (s && ghostRef.current) ghostRef.current.style.transform = `translate3d(${s.x - s.offsetX}px, ${s.y - s.offsetY}px, 0)`;
  };

  const track = () => {
    const s = session.current;
    if (!s?.started) return;
    const hit = hitTest(s.x, s.y);
    const isNoop = hit !== null && hit.column === s.from && (hit.index === s.fromIndex || hit.index === s.fromIndex + 1);
    const slot = hit && !isNoop ? hit : null;
    const key = slot ? `${slot.column}:${slot.index}` : "";
    if (key === s.slotKey) return;
    s.slotKey = key;
    setDrag((view) => view && { ...view, slot });
  };

  const autoScroll = () => {
    const s = session.current;
    const board = boardRef.current;
    if (!s?.started || !board) return;
    const rect = board.getBoundingClientRect();
    const depth = s.x < rect.left + EDGE ? s.x - (rect.left + EDGE) : s.x > rect.right - EDGE ? s.x - (rect.right - EDGE) : 0;
    if (depth !== 0) {
      const before = board.scrollLeft;
      board.scrollLeft += Math.sign(depth) * Math.max(1, Math.min(MAX_SCROLL_STEP, Math.round(Math.abs(depth) / 3)));
      if (board.scrollLeft !== before) track();
    }
    s.frame = requestAnimationFrame(autoScroll);
  };

  const press = (event: ReactPointerEvent<HTMLElement>, itemId: string, label: string) => {
    suppressClick.current = false;
    const row = event.currentTarget;
    const target = event.target as Element;
    if (event.button !== 0 || !event.isPrimary || event.pointerType === "touch" || !row.contains(target)) return;
    const blocker = target.closest(NO_DRAG);
    if (blocker && row.contains(blocker)) return;
    const location = locate(itemId);
    const from = location?.columns[location.column];
    if (!location || !from) return;
    session.current?.detach();

    const rect = row.getBoundingClientRect();
    const end = () => {
      const s = session.current;
      if (!s) return;
      s.detach();
      session.current = null;
      setDrag(null);
    };
    const onPointerMove = (e: PointerEvent) => {
      const s = session.current;
      if (!s || e.pointerId !== s.pointerId) return;
      s.x = e.clientX;
      s.y = e.clientY;
      if (!s.started) {
        if (Math.hypot(s.x - s.startX, s.y - s.startY) < DRAG_THRESHOLD) return;
        s.started = true;
        setDrag({ itemId: s.itemId, width: s.width, height: s.height, slot: null });
        s.frame = requestAnimationFrame(autoScroll);
      }
      placeGhost();
      track();
    };
    const onPointerUp = (e: PointerEvent) => {
      const s = session.current;
      if (!s || e.pointerId !== s.pointerId) return;
      end();
      if (!s.started) return;
      suppressClick.current = true;
      // Re-test at the release point so a single move + release (no frame in between) still lands.
      const hit = hitTest(e.clientX, e.clientY);
      if (!hit) {
        setAnnouncement(`${s.label} returned to ${from.title}.`);
        return;
      }
      const index = hit.column === s.from && hit.index > s.fromIndex ? hit.index - 1 : hit.index;
      if (hit.column === s.from && index === s.fromIndex) return;
      commit({ itemId: s.itemId, from: s.from, to: hit.column, index }, s.label, false);
    };
    const cancel = () => {
      const s = session.current;
      end();
      if (!s?.started) return;
      suppressClick.current = true;
      setAnnouncement(`Move cancelled. ${s.label} stays in ${from.title}.`);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !session.current?.started) return;
      e.preventDefault();
      e.stopPropagation();
      cancel();
    };
    const onPointerCancel = (e: PointerEvent) => {
      if (e.pointerId === session.current?.pointerId) cancel();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("blur", cancel);
    const next: Session = {
      pointerId: event.pointerId,
      itemId,
      label,
      from: from.id,
      fromIndex: location.index,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      started: false,
      slotKey: "",
      frame: 0,
      detach: () => {
        cancelAnimationFrame(next.frame);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerCancel);
        window.removeEventListener("keydown", onKeyDown, true);
        window.removeEventListener("blur", cancel);
      },
    };
    session.current = next;
  };

  // The ghost mounts a render after the drag starts; put it under the pointer before it paints.
  const ghost = useCallback((element: HTMLElement | null) => {
    ghostRef.current = element;
    const s = session.current;
    if (s && element) element.style.transform = `translate3d(${s.x - s.offsetX}px, ${s.y - s.offsetY}px, 0)`;
  }, []);

  return (
    <BoardContext.Provider
      value={{ drag, lastMoved, pendingFocus, suppressClick, ghost, press, step, locate, commit }}
    >
      <div
        ref={setRefs}
        role="region"
        aria-label={ariaLabel}
        aria-describedby={hintId}
        data-dragging={drag ? "" : undefined}
        className={cx("flex w-full items-start gap-2 overflow-x-auto overscroll-x-contain", drag && "cursor-grabbing", className)}
        {...props}
      >
        {children}
        <p id={hintId} hidden>
          {instructions}
        </p>
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
      </div>
    </BoardContext.Provider>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Window listeners and the edge-scroll `requestAnimationFrame` belong to the drag session. They are removed on release, Escape, pointercancel and window blur, and by the board's unmount effect if it unmounts mid-drag. The ghost is a portal owned by the dragged row, so it unmounts with the session.

**Reduced motion.** Only decoration is animated: the moved card's 200ms fade and scale-in (`starting:`) and the menu trigger's fade are dropped with `motion-reduce:transition-none`, and Kanban Card drops the ghost's tilt and scale. The ghost still follows the pointer and the board still edge-scrolls, because both are direct manipulation.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Starting the drag on `pointerdown`. Every click then flashes a ghost; wait for movement past a threshold.
- Hit testing against the ghost. Without `pointer-events-none` the ghost is always the element under the pointer and no column is found.
- Committing from the last rendered slot instead of re-testing on release. An automated drag sends one move and a release in the same frame, before the slot state has rendered.
- Alt + Left / Right is browser Back / Forward on Windows and Linux. The handler calls `preventDefault`, and the move menu stays available as the route that never collides with a shortcut.

## Notes

- Touch pointers are left to scroll the board, since dragging would hijack the pan. On touch screens the move menu trigger is always visible (`pointer-coarse:opacity-100`), and that menu is how cards move.
- Give `KanbanBoard` a height (the demo uses `h-125`) and every column caps at it with `max-h-full`; the card list then scrolls on its own (`min-h-0 overflow-y-auto`), so a long Backlog never pushes the headers off screen. Without a height the columns grow with their cards.
- Items must be direct children of `KanbanColumn` (an array from `.map` is fine) because the column splices the drop slot into `Children.toArray(children)`.
- The demo uses Kanban Card for the cards, passes `dragState` through, and puts the move menu in the card's `actions` slot.

## Definition of done

Four columns (Backlog 3/8, To do 2/5, In progress 2/4, Review 1/3) fit at desktop width and scroll sideways at 360px. Dragging DS-31 onto Review shows a dashed slot, and on release Review reads 2/3, the log says "Moved DS-31 to Review", and Escape mid-drag cancels. Focusing FE-79 and pressing Alt+ArrowRight moves it to Review with focus kept on the card. Its "…" Move menu lists the other columns, and choosing "Backlog" moves it there; Backlog now holds four cards and scrolls inside its column while every header stays in view. "+" prepends a new ticket. A plain click on a card still toggles its outline.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
