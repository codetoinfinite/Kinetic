/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Kanban Column" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */
"use client";

import {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { RiAddLine, RiMoreLine } from "@remixicon/react";
import { Dropdown, DropdownDivider, DropdownGroup, DropdownItem, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { cx } from "@/registry/lib/cx";

/**
 * Kanban board parts: `KanbanBoard` (horizontal scroller that owns the drag
 * session and the live announcer), `KanbanColumn` (header with name, count
 * and add button over a list of cards) and `KanbanItem` (one draggable list
 * row). Cards move three ways, all reported through one `onMove` callback:
 *
 * - pointer drag (mouse / pen): a ghost follows the pointer, a slot opens
 *   where the card will land, Escape cancels;
 * - keyboard: Alt + arrow keys on a focused card (left / right between
 *   columns, up / down within one);
 * - `KanbanMoveMenu`: a per-card menu with the same moves, the fallback for
 *   touch and switch users.
 *
 * The board never reorders anything itself; the consumer applies the move
 * (`moveItem` does it for a `Record<columnId, item[]>`) and re-renders.
 */

/** A finished move. `index` is the card's position in `to` after it has left `from`. */
export interface KanbanMove {
  itemId: string;
  from: string;
  to: string;
  index: number;
}

export type KanbanItemDragState = "idle" | "source" | "overlay";

type Direction = "up" | "down" | "prev" | "next";

interface ColumnInfo {
  id: string;
  title: string;
  count: number;
}

interface Location {
  columns: ColumnInfo[];
  column: number;
  index: number;
}

interface DragView {
  itemId: string;
  width: number;
  height: number;
  /** Where the drop slot is drawn: a raw index among the column's rendered items. Null over a no-op spot. */
  slot: { column: string; index: number } | null;
}

interface Session {
  pointerId: number;
  itemId: string;
  label: string;
  from: string;
  fromIndex: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  started: boolean;
  slotKey: string;
  frame: number;
  detach: () => void;
}

interface BoardContextValue {
  drag: DragView | null;
  lastMoved: string | null;
  pendingFocus: RefObject<string | null>;
  suppressClick: RefObject<boolean>;
  ghost: (element: HTMLElement | null) => void;
  press: (event: ReactPointerEvent<HTMLElement>, itemId: string, label: string) => void;
  step: (itemId: string, label: string, direction: Direction) => void;
  locate: (itemId: string) => Location | null;
  commit: (move: KanbanMove, label: string, focus: boolean) => void;
}

const BoardContext = createContext<BoardContextValue | null>(null);
const ColumnContext = createContext<{ id: string } | null>(null);
const ItemContext = createContext<{ id: string; label: string } | null>(null);

function useBoard(part: string) {
  const board = useContext(BoardContext);
  if (!board) throw new Error(`${part} must be rendered inside <KanbanBoard>.`);
  return board;
}

/** Pixels the pointer travels before a press turns into a drag (keeps clicks clicks). */
const DRAG_THRESHOLD = 4;
/** Auto-scroll band at the board's left / right edges, and the top speed in px per frame. */
const EDGE = 56;
const MAX_SCROLL_STEP = 18;
/** Presses that start on these stay with the control (menu triggers, links, fields). */
const NO_DRAG = 'button:not([data-kanban-press]), a[href], input, textarea, select, [contenteditable="true"], [data-kanban-no-drag]';
const FOCUS_KEY = "\u0000";

/** Square 24px header control on the column surface; reuse it for a column menu trigger. */
export const kanbanIconButtonClass = cx(
  "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground-icon-secondary outline-none",
  "transition-colors duration-150 ease-out hover:bg-background-secondary-hover hover:text-foreground-icon-hover",
  "focus-visible:ring-2 focus-visible:ring-border-focus-ring aria-expanded:bg-background-secondary-hover motion-reduce:transition-none",
);

/**
 * Applies a `KanbanMove` to a column map and returns a new map (inputs are
 * not mutated). Unknown ids return an unchanged copy.
 */
export function moveItem<T extends { id: string }>(
  columns: Readonly<Record<string, readonly T[]>>,
  move: KanbanMove,
): Record<string, T[]> {
  const next: Record<string, T[]> = {};
  for (const [key, list] of Object.entries(columns)) next[key] = [...list];
  const source = next[move.from];
  const target = next[move.to];
  const item = source?.find((entry) => entry.id === move.itemId);
  if (!source || !target || !item) return next;
  source.splice(source.indexOf(item), 1);
  target.splice(Math.max(0, Math.min(move.index, target.length)), 0, item);
  return next;
}

/* ------------------------------------------------------------------- board */

export interface KanbanBoardProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Called once per finished move (drag, keyboard or menu). Apply it to your data. */
  onMove: (move: KanbanMove) => void;
  /** Screen-reader instructions linked to the board. */
  instructions?: string;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

// #region critical
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
// #endregion

/* ------------------------------------------------------------------ column */

export interface KanbanColumnProps extends Omit<HTMLAttributes<HTMLElement>, "title" | "children" | "id"> {
  /** Column key reported in `KanbanMove.from` / `to`. */
  id: string;
  title: string;
  /** Number shown after the title. Defaults to the number of items. */
  count?: number;
  /** WIP limit, shown as "count/limit"; the count turns red when it is exceeded. */
  limit?: number;
  /** Shows the "+" header button. */
  onAdd?: () => void;
  /** Accessible name of the "+" button. Default "Add card to {title}". */
  addLabel?: string;
  /** Extra header controls before "+", e.g. a Dropdown whose trigger uses `kanbanIconButtonClass`. */
  menu?: ReactNode;
  /** Shown when the column has no items (and nothing is being dragged over it). */
  empty?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  /** `KanbanItem`s, as direct children (an array from `.map` is fine). */
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

export function KanbanColumn({
  id,
  title,
  count,
  limit,
  onAdd,
  addLabel,
  menu,
  empty,
  headingLevel = 2,
  className,
  children,
  ref,
  ...props
}: KanbanColumnProps) {
  const board = useBoard("KanbanColumn");
  const headingId = useId();
  const Heading = `h${headingLevel}` as const;
  const items = Children.toArray(children);
  const shown = count ?? items.length;
  const isOver = limit !== undefined && shown > limit;
  const slot = board.drag?.slot?.column === id ? board.drag.slot : null;
  if (slot && board.drag) {
    items.splice(
      Math.min(slot.index, items.length),
      0,
      <li
        key="kanban-drop-slot"
        aria-hidden
        data-kanban-slot
        style={{ height: board.drag.height }}
        className="shrink-0 rounded-xl border border-dashed border-border-button-hover bg-background-tertiary-default/60"
      />,
    );
  }

  return (
    <ColumnContext.Provider value={{ id }}>
      <section
        ref={ref}
        aria-labelledby={headingId}
        data-kanban-column={id}
        data-kanban-title={title}
        data-drop-target={slot ? "" : undefined}
        className={cx("flex max-h-full min-h-0 w-68 shrink-0 flex-col gap-1.5 rounded-2-5xl bg-background-secondary-default p-1.5", className)}
        {...props}
      >
        <div className="flex h-8 shrink-0 items-center gap-1.5 ps-2.5 pe-1">
          <Heading id={headingId} className="min-w-0 truncate text-body-medium text-text-primary">
            {title}
          </Heading>
          <span className={cx("shrink-0 text-body-regular tabular-nums", isOver ? "text-text-error-primary" : "text-text-secondary")}>
            <span aria-hidden>
              {shown}
              {limit !== undefined && `/${limit}`}
            </span>
            <span className="sr-only">
              {shown === 1 ? "1 card" : `${shown} cards`}
              {limit !== undefined && `, limit ${limit}`}
              {isOver && ", over the limit"}
            </span>
          </span>
          <div className="ms-auto flex items-center gap-0.5">
            {menu}
            {onAdd && (
              <button type="button" aria-label={addLabel ?? `Add card to ${title}`} onClick={onAdd} className={kanbanIconButtonClass}>
                <RiAddLine aria-hidden className="size-4.5" />
              </button>
            )}
          </div>
        </div>
        {items.length > 0 ? (
          <ul
            role="list"
            aria-labelledby={headingId}
            className="-m-1 flex min-h-0 flex-col gap-1.5 overflow-y-auto overscroll-y-contain p-1"
          >
            {items}
          </ul>
        ) : (
          (empty ?? (
            <p className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border-button-default text-body-regular text-text-tertiary">
              No cards
            </p>
          ))
        )}
      </section>
    </ColumnContext.Provider>
  );
}

/* -------------------------------------------------------------------- item */

export interface KanbanItemProps extends Omit<HTMLAttributes<HTMLLIElement>, "children" | "id"> {
  id: string;
  /** Short name used in announcements and the move menu, e.g. "FE-79 Animate nested task groups". */
  label: string;
  /** The card. A function receives the drag role so the card can dim (source) or lift (overlay). */
  children: ReactNode | ((state: { dragState: KanbanItemDragState }) => ReactNode);
}

export function KanbanItem({ id, label, className, children, ...props }: KanbanItemProps) {
  const board = useBoard("KanbanItem");
  const column = useContext(ColumnContext);
  const rowRef = useRef<HTMLLIElement>(null);
  const isDragged = board.drag?.itemId === id;
  const render = (dragState: KanbanItemDragState) => (typeof children === "function" ? children({ dragState }) : children);

  // After a keyboard or menu move the row remounts (or is re-inserted) and loses focus: hand it back.
  useEffect(() => {
    if (board.pendingFocus.current !== id + FOCUS_KEY + column?.id) return;
    board.pendingFocus.current = null;
    const row = rowRef.current;
    (row?.querySelector<HTMLElement>("[data-kanban-focus]") ?? row)?.focus();
  });

  return (
    <ItemContext.Provider value={{ id, label }}>
      <li
        ref={rowRef}
        tabIndex={-1}
        data-kanban-item={id}
        onPointerDown={(event) => board.press(event, id, label)}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (!board.suppressClick.current) return;
          board.suppressClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          board.suppressClick.current = false;
          if (!event.altKey || event.ctrlKey || event.metaKey || !event.currentTarget.contains(event.target as Node)) return;
          const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
          const keys: Record<string, Direction> = {
            ArrowUp: "up",
            ArrowDown: "down",
            ArrowLeft: rtl ? "next" : "prev",
            ArrowRight: rtl ? "prev" : "next",
          };
          const direction = keys[event.key];
          if (!direction) return;
          event.preventDefault();
          board.step(id, label, direction);
        }}
        className={cx(
          "group/kanban-item relative cursor-grab outline-none select-none",
          board.lastMoved === id &&
            "transition-[opacity,scale] duration-200 ease-out starting:scale-95 starting:opacity-0 motion-reduce:transition-none",
          className,
        )}
        {...props}
      >
        {render(isDragged ? "source" : "idle")}
      </li>
      {isDragged &&
        board.drag &&
        createPortal(
          <div
            ref={board.ghost}
            aria-hidden
            inert
            className="pointer-events-none fixed top-0 left-0 z-50"
            style={{ width: board.drag.width }}
          >
            {render("overlay")}
          </div>,
          document.body,
        )}
    </ItemContext.Provider>
  );
}

/* -------------------------------------------------------------- move menu */

export interface KanbanMoveMenuProps {
  /** Classes on the 24px trigger. */
  className?: string;
}

/**
 * Per-card "Move" menu: up / down within the column and "Move to" every
 * other column. Render it inside a `KanbanItem` (e.g. a card's actions slot).
 * The trigger stays hidden until the row is hovered or focused, except on
 * coarse pointers where hover does not exist.
 */
export function KanbanMoveMenu({ className }: KanbanMoveMenuProps) {
  const board = useBoard("KanbanMoveMenu");
  const item = useContext(ItemContext);
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  if (!item) return null;

  const here = location?.columns[location.column];
  const pick = (to: ColumnInfo, index: number) => {
    setIsOpen(false);
    if (here) board.commit({ itemId: item.id, from: here.id, to: to.id, index }, item.label, true);
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (open) setLocation(board.locate(item.id));
        setIsOpen(open);
      }}
    >
      <DropdownTrigger
        aria-label={`Move ${item.label}`}
        className={cx(
          "inline-flex size-6 items-center justify-center rounded-md text-foreground-icon-secondary opacity-0 transition-[opacity,background-color] duration-150 ease-out",
          "hover:bg-background-primary-hover hover:text-foreground-icon-hover aria-expanded:bg-background-primary-hover aria-expanded:opacity-100",
          "group-hover/kanban-item:opacity-100 group-focus-within/kanban-item:opacity-100 pointer-coarse:opacity-100 motion-reduce:transition-none",
          className,
        )}
      >
        <RiMoreLine aria-hidden className="size-4" />
      </DropdownTrigger>
      <DropdownPopover aria-label={`Move ${item.label}`} placement="bottom end" className="w-56">
        {location && here && (
          <>
            {here.count > 1 && (
              <DropdownGroup label="Position">
                {location.index > 0 && (
                  <DropdownItem onSelect={() => pick(here, location.index - 1)}>Move up</DropdownItem>
                )}
                {location.index < here.count - 1 && (
                  <DropdownItem onSelect={() => pick(here, location.index + 1)}>Move down</DropdownItem>
                )}
              </DropdownGroup>
            )}
            {here.count > 1 && location.columns.length > 1 && <DropdownDivider />}
            {location.columns.length > 1 && (
              <DropdownGroup label="Move to">
                {location.columns.map((column) =>
                  column.id === here.id ? null : (
                    <DropdownItem key={column.id} onSelect={() => pick(column, Math.min(location.index, column.count))}>
                      {column.title}
                    </DropdownItem>
                  ),
                )}
              </DropdownGroup>
            )}
          </>
        )}
      </DropdownPopover>
    </Dropdown>
  );
}
