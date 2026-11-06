import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'project-board',
  title: 'Project Board',
  category: 'block',
  kit: 'boardui',
  tags: ['kanban', 'board', 'template', 'drag-and-drop', 'page', 'boardui'],
  blurb:
    'A full kanban page: drag tickets across five columns, open a side panel to edit them, create, sort and filter, with an activity inbox.',
  cost: 'dom',
  motif: 'split',

  files: [
    { path: 'registry/ui/project-board.tsx', type: 'registry:ui', role: 'page: sidebar views, header actions, ticket state, move and drop logic' },
    { path: 'registry/ui/project-board-parts.tsx', type: 'registry:ui', role: 'data model, ticket card, board column with drop targets, New ticket dialog' },
    { path: 'registry/ui/project-board-toolbar.tsx', type: 'registry:ui', role: 'activity inbox popover, sort menu, filter popover' },
    { path: 'registry/ui/project-board-panel.tsx', type: 'registry:ui', role: 'ticket detail panel, board overview, purple token bars' },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The Project Board template as one working page. Five columns (Backlog, To do, In progress, Review, Done) show count against a work-in-progress limit; cards drag between and within columns with an insertion line, open a side panel with editable status, priority, project, assignees, a token usage chart and comments, and the header carries an activity inbox, sort, filter, a panel toggle and New ticket.',

  mechanism: [
    'Every ticket lives in one ordered array; a column is that array filtered by `stage`, then filtered by the active `BoardFilter` and optionally sorted for display. Counts in the column header use the unfiltered stage list, so `3/8` stays true while filters hide cards.',
    '`moveTicket(id, stage, beforeId)` removes the ticket, restamps its stage (moving into Done stamps a completion day, moving out clears it) and splices it back in front of `beforeId`, or after the last ticket already in the target stage when `beforeId` is null. Drag, the Alt+Arrow keys, the panel\'s Status select and the column menu all go through it.',
    'Drag and drop is native HTML5. A card sets `text/plain` to its id on `dragstart`. Each card\'s `dragover` compares the pointer to its vertical midpoint and reports `{stage, beforeId}` (itself, or the next card); the column\'s own `dragover` only claims the end slot when the pointer first enters it. `drop` reads the id and calls `moveTicket`; `dragend` clears the indicator either way.',
    'Each card is an `article` with a stretched title button (`after:absolute after:inset-0`), so the whole card opens the detail panel while the hit area stays one real button. Alt+ArrowLeft/Right on that button moves the ticket one stage and an `aria-live` region announces it.',
    'The side panel shows `TicketPanel` (keyed by ticket id so the title draft resets) or, with nothing open, a board overview of column load and total tokens. Every edit appends an entry to the activity log that feeds the Inbox popover; closing the popover marks entries read.',
    'Sidebar rows are `href="#"` links; one `onClickCapture` on the root maps the link\'s `aria-label` to a `DASHBOARD_NAV` key and switches the view in state. Other keys show a placeholder with "Back to Project board".',
  ],

  constants: [
    { name: 'column width', value: '268px', why: 'Fits "KEY > epic" plus a three-avatar stack on one line; the board scrolls sideways when the side panel takes 332px.' },
    { name: 'WIP limits', value: '8 / 5 / 4 / 3 / 6', why: 'Backlog to Done. Going over turns the count rose so overload is visible at a glance.' },
    { name: 'TODAY', value: '15 (Sep)', why: 'Fixed day stamped on created tickets and on tickets moved into Done, so renders never read the clock.' },
    { name: 'drop midpoint', value: 'rect.top + rect.height / 2', why: 'Upper half inserts before the hovered card, lower half after it, matching where the line is drawn.' },
    { name: 'activity cap', value: '30 entries', why: 'Keeps the inbox list short and the state small during long sessions.' },
  ],

  pitfalls: [
    'Calling `preventDefault` only on the column. Cards sit on top of it, so each card must also cancel `dragover` (and stop it bubbling) or the drop is refused over cards.',
    'Clearing the drop target on every `dragleave`. The event fires when the pointer crosses into a child card; ignore it while `relatedTarget` is still inside the column.',
    'Counting the visible cards for the WIP limit. Filters would make a full column look under its limit; count the stage before filtering.',
    'Reordering inside a sorted view. With a sort active the display order is derived, so dropping still moves stage but the manual order only shows again under "Manual order".',
    'Wrapping a `PopoverTrigger` child in a plain `span`. The trigger must be an element that forwards its ref and props (a native `button` here) or the popover cannot anchor.',
  ],

  notes: [
    'Composed from kit items: `DashboardSidebar`, `DashboardPageHeader`, `NotificationBellBadge`, `AvatarStack`, `PriorityBadge`, `Dropdown`, `Popover`, `Modal`, `Select`, `Input`, `Textarea`, `Checkbox` and `Toaster`. The board, panel and toolbar are this item\'s own files.',
    'New tickets slide in with a CSS `@starting-style` fade and lift (`starting:opacity-0 starting:translate-y-1`), switched off under `motion-reduce`.',
  ],

  apiSignature:
    'function ProjectBoard(props: { tickets?: Ticket[]; defaultNotifications?: BellNotification[]; defaultView?: string; defaultPanelOpen?: boolean; className?: string }): JSX.Element',

  props: [
    { name: 'tickets', type: 'Ticket[]', default: 'BOARD_TICKETS', description: 'Tickets in board order (13 samples). Moves, edits, comments and deletes change a local copy.' },
    { name: 'defaultNotifications', type: 'BellNotification[]', default: 'BOARD_NOTIFICATIONS', description: 'Initial bell contents; unread items drive the badge count.' },
    { name: 'defaultView', type: 'string', default: '"project-board"', description: 'Sidebar key shown first. Any other key shows the placeholder view.' },
    { name: 'defaultPanelOpen', type: 'boolean', default: 'false', description: 'Show the side panel (board overview) on first render. Opening a ticket always opens it.' },
    { name: 'className', type: 'string', description: 'Merged onto the root.' },
  ],

  reducedMotion:
    'The ticket entry fade, token bar height and column-load width transitions all carry `motion-reduce:transition-none`, so changes apply instantly. Dragging uses the browser\'s own drag image and has no added animation.',

  cleanup:
    'No timers, observers or global listeners: drag state lives in React state set by element drag events and is cleared on `dragend` and `drop`. Overlays and the Toaster clean up their own listeners.',

  acceptance:
    'At 1280x800 the sidebar shows Project board selected and the board shows Backlog 3/8, To do 3/5, In progress 2/4, Review 1/3 and Done 4/6. Dragging FE-76 onto Done makes Review 0/3 and Done 5/6 with "Completed 15 Sep" on the card. New ticket with a title adds it to the top of Backlog (4/8) and toasts. Clicking a card opens its panel; changing Status moves the card; posting a comment adds it to the list. Filter by Urgent leaves only DS-31 visible. Clicking Calendar in the sidebar shows the placeholder and "Back to Project board" returns.',

  criticalRegion: 'critical',
};

export default meta;
