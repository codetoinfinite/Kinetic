import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'kanban-column',
  title: 'Kanban Column',
  category: 'display',
  kit: 'boardui',
  tags: ['kanban', 'drag-and-drop', 'project-board', 'keyboard', 'boardui'],
  blurb: 'Board column with name, WIP count and add button; cards move by pointer drag, Alt + arrow keys or a per-card move menu.',
  cost: 'dom',
  motif: 'stack',

  files: [{ path: 'registry/ui/kanban-column.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The project-board column: a 20px-radius grey panel with "Backlog 3/8" in the header, a ghost "…" menu and "+" button, and a stack of ticket cards. `KanbanBoard` wraps the columns in a horizontal scroller and owns one move model with three inputs: pointer drag with a ghost card and an opening drop slot, Alt + arrow keys on a focused card, and a per-card "Move" menu. Every route ends in a single `onMove({ itemId, from, to, index })`, which `moveItem` applies to a column map.',

  mechanism: [
    'A press on a `KanbanItem` row (mouse or pen, primary button, not on a nested control) records the pointer and attaches window `pointermove` / `pointerup` / `pointercancel` / `keydown` / `blur` listeners. Nothing renders until the pointer has travelled 4px, so a plain click still opens the card.',
    'Once the drag starts, the row renders its card as `dragState: "source"` (dimmed in place) and portals a `dragState: "overlay"` copy into a fixed, `pointer-events-none`, `inert` ghost. The ghost is moved with `translate3d` written straight to its style from the pointer events, so following the pointer never re-renders React.',
    'Hit testing runs `document.elementFromPoint` (the ghost is transparent to it), takes the closest `[data-kanban-column]` and counts the items whose vertical midline is above the pointer. The dragged card still counts, so its own spot and the one after it are no-ops and draw no slot. The column splices a dashed `<li>` the height of the card into its children at that index. Items below the slot shift down by its height, which gives built-in hysteresis: the pointer must cross back over the unshifted midline before the slot moves up again.',
    'Release re-runs the hit test at the `pointerup` point, so a single move then release with no frame in between (how automated drags behave) still lands. A drop below the origin in the same column subtracts one from the index. Escape, `pointercancel` or window blur end the session without a move, and the click that follows a drag is swallowed in the capture phase.',
    'A `requestAnimationFrame` loop scrolls the board sideways while the pointer sits within 56px of its left or right edge, at up to 18px per frame scaled by depth. It re-tests the hit after each scroll step.',
    'Keyboard and menu moves read the live column order and counts from the DOM (`data-kanban-column`, `data-kanban-title`), commit the move, then stash `itemId + column` in a ref. The row that mounts there pulls focus onto its `[data-kanban-focus]` element, and a `role="status"` region announces "FE-79 … moved to Review, position 2 of 2."',
  ],

  constants: [
    { name: 'DRAG_THRESHOLD', value: '4px', why: 'Below this a press stays a click; above it, a drag. Small enough that a quick flick still picks the card up.' },
    { name: 'EDGE / MAX_SCROLL_STEP', value: '56px / 18px per frame', why: 'A band about two cursor widths deep; speed grows with depth so a nudge creeps and a push races.' },
    { name: 'column width', value: 'w-68 (272px), p-1.5, gap-1.5', why: 'Matches the board: 260px cards sit 6px inside a 20px-radius panel with 6px between cards.' },
    { name: 'drop slot', value: 'dragged card height, dashed border-button-hover, tertiary 60%', why: 'Same height as the card so the column does not jump on drop; dashed so it reads as an empty place, not a card.' },
  ],

  pitfalls: [
    'Starting the drag on `pointerdown`. Every click then flashes a ghost; wait for movement past a threshold.',
    'Hit testing against the ghost. Without `pointer-events-none` the ghost is always the element under the pointer and no column is found.',
    'Committing from the last rendered slot instead of re-testing on release. An automated drag sends one move and a release in the same frame, before the slot state has rendered.',
    'Alt + Left / Right is browser Back / Forward on Windows and Linux. The handler calls `preventDefault`, and the move menu stays available as the route that never collides with a shortcut.',
  ],

  notes: [
    'Touch pointers are left to scroll the board, since dragging would hijack the pan. On touch screens the move menu trigger is always visible (`pointer-coarse:opacity-100`), and that menu is how cards move.',
    'Give `KanbanBoard` a height (the demo uses `h-125`) and every column caps at it with `max-h-full`; the card list then scrolls on its own (`min-h-0 overflow-y-auto`), so a long Backlog never pushes the headers off screen. Without a height the columns grow with their cards.',
    'Items must be direct children of `KanbanColumn` (an array from `.map` is fine) because the column splices the drop slot into `Children.toArray(children)`.',
    'The demo uses Kanban Card for the cards, passes `dragState` through, and puts the move menu in the card\'s `actions` slot.',
  ],

  apiSignature:
    'function KanbanBoard(props: HTMLAttributes<HTMLDivElement> & { onMove: (move: KanbanMove) => void; instructions?: string; children: ReactNode }): JSX.Element; function KanbanColumn(props: { id: string; title: string; count?: number; limit?: number; onAdd?: () => void; addLabel?: string; menu?: ReactNode; empty?: ReactNode; headingLevel?: 2 | 3 | 4; children?: ReactNode }): JSX.Element; function KanbanItem(props: { id: string; label: string; children: ReactNode | ((state: { dragState: "idle" | "source" | "overlay" }) => ReactNode) }): JSX.Element; function KanbanMoveMenu(props: { className?: string }): JSX.Element | null; function moveItem<T extends { id: string }>(columns: Record<string, readonly T[]>, move: KanbanMove): Record<string, T[]>; interface KanbanMove { itemId: string; from: string; to: string; index: number }',

  props: [
    { name: 'onMove (KanbanBoard)', type: '(move: KanbanMove) => void', description: 'Fires once per finished move from drag, keyboard or menu. `index` is the position in `to` after the card left `from`.' },
    { name: 'instructions (KanbanBoard)', type: 'string', description: 'Screen-reader help linked to the board with aria-describedby.' },
    { name: 'id (KanbanColumn)', type: 'string', description: 'Column key used in `KanbanMove.from` / `to`.' },
    { name: 'title (KanbanColumn)', type: 'string', description: 'Header name; also used in announcements and the move menu.' },
    { name: 'count / limit (KanbanColumn)', type: 'number', description: 'Header shows "count/limit"; count defaults to the item count and turns red past the limit.' },
    { name: 'onAdd / addLabel (KanbanColumn)', type: '() => void / string', description: 'Shows the "+" button and names it (default "Add card to {title}").' },
    { name: 'menu (KanbanColumn)', type: 'ReactNode', description: 'Extra header controls before "+"; style triggers with `kanbanIconButtonClass`.' },
    { name: 'empty (KanbanColumn)', type: 'ReactNode', description: 'Replaces the dashed "No cards" placeholder.' },
    { name: 'id / label (KanbanItem)', type: 'string', description: 'Card key, and the short name used in announcements and the menu.' },
    { name: 'children (KanbanItem)', type: 'ReactNode | ({ dragState }) => ReactNode', description: 'The card; the function form receives "idle", "source" or "overlay".' },
  ],

  reducedMotion: 'Only decoration is animated: the moved card\'s 200ms fade and scale-in (`starting:`) and the menu trigger\'s fade are dropped with `motion-reduce:transition-none`, and Kanban Card drops the ghost\'s tilt and scale. The ghost still follows the pointer and the board still edge-scrolls, because both are direct manipulation.',

  cleanup: 'Window listeners and the edge-scroll `requestAnimationFrame` belong to the drag session. They are removed on release, Escape, pointercancel and window blur, and by the board\'s unmount effect if it unmounts mid-drag. The ghost is a portal owned by the dragged row, so it unmounts with the session.',

  acceptance:
    'Four columns (Backlog 3/8, To do 2/5, In progress 2/4, Review 1/3) fit at desktop width and scroll sideways at 360px. Dragging DS-31 onto Review shows a dashed slot, and on release Review reads 2/3, the log says "Moved DS-31 to Review", and Escape mid-drag cancels. Focusing FE-79 and pressing Alt+ArrowRight moves it to Review with focus kept on the card. Its "…" Move menu lists the other columns, and choosing "Backlog" moves it there; Backlog now holds four cards and scrolls inside its column while every header stays in view. "+" prepends a new ticket. A plain click on a card still toggles its outline.',

  criticalRegion: 'critical',
};

export default meta;
