# Build: Project Board

The Project Board template as one working page. Five columns (Backlog, To do, In progress, Review, Done) show count against a work-in-progress limit; cards drag between and within columns with an insertion line, open a side panel with editable status, priority, project, assignees, a token usage chart and comments, and the header carries an activity inbox, sort, filter, a panel toggle and New ticket.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A full kanban page: drag tickets across five columns, open a side panel to edit them, create, sort and filter, with an activity inbox.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. Every ticket lives in one ordered array; a column is that array filtered by `stage`, then filtered by the active `BoardFilter` and optionally sorted for display. Counts in the column header use the unfiltered stage list, so `3/8` stays true while filters hide cards.
2. `moveTicket(id, stage, beforeId)` removes the ticket, restamps its stage (moving into Done stamps a completion day, moving out clears it) and splices it back in front of `beforeId`, or after the last ticket already in the target stage when `beforeId` is null. Drag, the Alt+Arrow keys, the panel's Status select and the column menu all go through it.
3. Drag and drop is native HTML5. A card sets `text/plain` to its id on `dragstart`. Each card's `dragover` compares the pointer to its vertical midpoint and reports `{stage, beforeId}` (itself, or the next card); the column's own `dragover` only claims the end slot when the pointer first enters it. `drop` reads the id and calls `moveTicket`; `dragend` clears the indicator either way.
4. Each card is an `article` with a stretched title button (`after:absolute after:inset-0`), so the whole card opens the detail panel while the hit area stays one real button. Alt+ArrowLeft/Right on that button moves the ticket one stage and an `aria-live` region announces it.
5. The side panel shows `TicketPanel` (keyed by ticket id so the title draft resets) or, with nothing open, a board overview of column load and total tokens. Every edit appends an entry to the activity log that feeds the Inbox popover; closing the popover marks entries read.
6. Sidebar rows are `href="#"` links; one `onClickCapture` on the root maps the link's `aria-label` to a `DASHBOARD_NAV` key and switches the view in state. Other keys show a placeholder with "Back to Project board".

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `column width = 268px`
  Fits "KEY > epic" plus a three-avatar stack on one line; the board scrolls sideways when the side panel takes 332px.
- `WIP limits = 8 / 5 / 4 / 3 / 6`
  Backlog to Done. Going over turns the count rose so overload is visible at a glance.
- `TODAY = 15 (Sep)`
  Fixed day stamped on created tickets and on tickets moved into Done, so renders never read the clock.
- `drop midpoint = rect.top + rect.height / 2`
  Upper half inserts before the hovered card, lower half after it, matching where the line is drawn.
- `activity cap = 30 entries`
  Keeps the inbox list short and the state small during long sessions.

## API

```ts
function ProjectBoard(props: { tickets?: Ticket[]; defaultNotifications?: BellNotification[]; defaultView?: string; defaultPanelOpen?: boolean; className?: string }): JSX.Element
```

- `tickets: Ticket[]` — default `BOARD_TICKETS`
  Tickets in board order (13 samples). Moves, edits, comments and deletes change a local copy.
- `defaultNotifications: BellNotification[]` — default `BOARD_NOTIFICATIONS`
  Initial bell contents; unread items drive the badge count.
- `defaultView: string` — default `"project-board"`
  Sidebar key shown first. Any other key shows the placeholder view.
- `defaultPanelOpen: boolean` — default `false`
  Show the side panel (board overview) on first render. Opening a ticket always opens it.
- `className: string`
  Merged onto the root.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// The sidebar rows are `href="#"` links: one capture listener turns any of
// them into a local view switch so the host URL never changes.
const onNavClickCapture = (event: MouseEvent<HTMLDivElement>) => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a[href="#"]');
  if (!link) return;
  event.preventDefault();
  const item = DASHBOARD_NAV.find((entry) => entry.label === link.getAttribute("aria-label"));
  if (item) setView(item.key);
};

// One ordered array holds every ticket. Moving = remove it, restamp its
// stage (Done gets a completion day), then splice it back in front of
// `beforeId`, or after the last ticket already in the target stage.
const moveTicket = (id: string, stage: StageId, beforeId: string | null) => {
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) return;
  if (beforeId === id) {
    if (ticket.stage === stage) return;
    beforeId = null;
  }
  setTickets((list) => {
    const current = list.find((t) => t.id === id);
    if (!current) return list;
    const rest = list.filter((t) => t.id !== id);
    let at = beforeId ? rest.findIndex((t) => t.id === beforeId) : -1;
    if (at < 0) {
      at = rest.length;
      for (let i = rest.length - 1; i >= 0; i--) {
        if (rest[i]?.stage === stage) {
          at = i + 1;
          break;
        }
      }
    }
    return [...rest.slice(0, at), withStage(current, stage), ...rest.slice(at)];
  });
  const label = stageOf(stage).label;
  const message = ticket.stage === stage ? `Reordered ${id} in ${label}` : `${id} moved to ${label}`;
  if (ticket.stage !== stage) log(`Jordan moved ${id} to ${label}`);
  setAnnouncement(message);
};

const onDropTicket = (id: string) => {
  const target = drop;
  setDragId(null);
  setDrop(null);
  if (target) moveTicket(id, target.stage, target.beforeId);
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers, observers or global listeners: drag state lives in React state set by element drag events and is cleared on `dragend` and `drop`. Overlays and the Toaster clean up their own listeners.

**Reduced motion.** The ticket entry fade, token bar height and column-load width transitions all carry `motion-reduce:transition-none`, so changes apply instantly. Dragging uses the browser's own drag image and has no added animation.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Calling `preventDefault` only on the column. Cards sit on top of it, so each card must also cancel `dragover` (and stop it bubbling) or the drop is refused over cards.
- Clearing the drop target on every `dragleave`. The event fires when the pointer crosses into a child card; ignore it while `relatedTarget` is still inside the column.
- Counting the visible cards for the WIP limit. Filters would make a full column look under its limit; count the stage before filtering.
- Reordering inside a sorted view. With a sort active the display order is derived, so dropping still moves stage but the manual order only shows again under "Manual order".
- Wrapping a `PopoverTrigger` child in a plain `span`. The trigger must be an element that forwards its ref and props (a native `button` here) or the popover cannot anchor.

## Notes

- Composed from kit items: `DashboardSidebar`, `DashboardPageHeader`, `NotificationBellBadge`, `AvatarStack`, `PriorityBadge`, `Dropdown`, `Popover`, `Modal`, `Select`, `Input`, `Textarea`, `Checkbox` and `Toaster`. The board, panel and toolbar are this item's own files.
- New tickets slide in with a CSS `@starting-style` fade and lift (`starting:opacity-0 starting:translate-y-1`), switched off under `motion-reduce`.

## Definition of done

At 1280x800 the sidebar shows Project board selected and the board shows Backlog 3/8, To do 3/5, In progress 2/4, Review 1/3 and Done 4/6. Dragging FE-76 onto Done makes Review 0/3 and Done 5/6 with "Completed 15 Sep" on the card. New ticket with a title adds it to the top of Backlog (4/8) and toasts. Clicking a card opens its panel; changing Status moves the card; posting a comment adds it to the list. Filter by Urgent leaves only DS-31 visible. Clicking Calendar in the sidebar shows the placeholder and "Back to Project board" returns.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
