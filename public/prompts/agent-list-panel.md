# Build: Agent List Panel

The left rail of a multi-agent workspace: a pill toolbar (search, optional extra buttons, a blue "+"), a three-way All / Running / Done filter with live counts, and a list of agents. Each row shows a 32px avatar with a status dot on its corner, the agent name with a relative time, and its last message on one truncated line. Rows select like a listbox with the pointer or the arrow keys, and the selection can be controlled or left to the panel.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Agent sidebar list with avatar, live status dot, last message and time, single selection, search and All/Running/Done tabs.

- Category: navigation
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1, @remixicon/react@^4.9.0

## How it works

1. Counts for every tab are computed once per agents array with matchesAgentFilter: Running covers status running or waiting, Done covers done, All covers everything.
2. The visible list is the agents array filtered by the active tab and by the search query (case-insensitive match on name or last message), memoised on agents, filter and query.
3. The filter is a React Aria ToggleButtonGroup with selectionMode="single" and disallowEmptySelection, so one tab is always pressed; filter/defaultFilter/onFilterChange make it controlled or uncontrolled.
4. The list is a React Aria ListBox (single selection, disallowEmptySelection): arrow keys, Home/End and typeahead move focus, Enter/Space or a click select, and handleSelection maps the key back to the agent before calling onSelect.
5. The search pill toggles an autofocused input under the toolbar; Escape or the pill (now an X) clears the query and closes it.
6. Avatars default to AgentMonogram, a 32px rounded tile whose tint is picked by hashSeed(name) from five calendar-event palettes, so a name always keeps its colour; any node can replace it per agent.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `avatar = 32px tile, 10px radius`
  Matches the reference rows; the status dot (10px with a 2px ring) sits on its bottom corner without covering the initials.
- `toolbar pills = h-8, rounded-full, flex-1`
  Search, extra buttons and "+" share the width evenly like the reference toolbar.
- `filter rule = running = running | waiting; done = done`
  An agent waiting on your input is still in progress; failed and idle agents only appear under All.
- `tones = 5 (lime, blue, pink, purple, emerald)`
  calendar-event tokens carry their own dark values, so monograms stay legible in both themes.

## API

```ts
function AgentListPanel(props: { agents: AgentListItem[]; selectedId?: string | null; defaultSelectedId?: string | null; onSelect?: (id: string, agent: AgentListItem) => void; filter?: AgentFilter; defaultFilter?: AgentFilter; onFilterChange?: (filter: AgentFilter) => void; onCreate?: () => void; createLabel?: string; toolbar?: ReactNode; searchable?: boolean; footer?: ReactNode; emptyLabel?: string; "aria-label"?: string; className?: string }): JSX.Element
```

- `agents: AgentListItem[]`
  { id, name, lastMessage?, time?, status?, avatar?, unread? } per agent.
- `selectedId: string | null`
  Controlled selected agent id.
- `defaultSelectedId: string | null` — default `null`
  Initial selection when uncontrolled.
- `onSelect: (id: string, agent: AgentListItem) => void`
  Called when a different agent is chosen.
- `filter: "all" | "running" | "done"`
  Controlled filter tab.
- `defaultFilter: "all" | "running" | "done"` — default `"all"`
  Initial filter when uncontrolled.
- `onFilterChange: (filter: AgentFilter) => void`
  Called when a tab is pressed.
- `onCreate: () => void`
  Shows the blue "+" toolbar button and runs on press.
- `createLabel: string` — default `"New agent"`
  Accessible label of the "+" button.
- `toolbar: ReactNode`
  Extra toolbar buttons between search and "+".
- `searchable: boolean` — default `true`
  Show the search toggle.
- `footer: ReactNode`
  Content pinned below the list.
- `emptyLabel: string` — default `"No agents here yet."`
  Shown when a tab has no agents.
- `aria-label: string` — default `"Agents"`
  Accessible name of the list.
- `className: string`
  Classes for the panel surface (set its width and height here).

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const counts = useMemo(() => {
  const out: Record<AgentFilter, number> = { all: 0, running: 0, done: 0 };
  for (const a of agents) {
    out.all += 1;
    if (matchesAgentFilter(a.status, "running")) out.running += 1;
    if (matchesAgentFilter(a.status, "done")) out.done += 1;
  }
  return out;
}, [agents]);

const visible = useMemo(() => {
  const q = query.trim().toLowerCase();
  return agents.filter(
    (a) =>
      matchesAgentFilter(a.status, activeFilter) &&
      (!q || a.name.toLowerCase().includes(q) || (a.lastMessage ?? "").toLowerCase().includes(q)),
  );
}, [agents, activeFilter, query]);

const setFilter = (next: AgentFilter) => {
  if (filter === undefined) setInnerFilter(next);
  onFilterChange?.(next);
};

const handleSelection = (keys: Selection) => {
  if (keys === "all") return;
  const [first] = keys as Set<Key>;
  if (first === undefined) return;
  const id = String(first);
  const agent = agents.find((a) => a.id === id);
  if (!agent || id === activeId) return;
  if (selectedId === undefined) setInnerSelected(id);
  onSelect?.(id, agent);
};

const closeSearch = () => {
  setQuery("");
  setSearchOpen(false);
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers, listeners or observers of its own; React Aria owns the listbox and toggle-group handlers and removes them on unmount.

**Reduced motion.** The running dot drops its ping halo (motion-reduce:hidden), and row, tab and search transitions use motion-reduce:transition-none; selection and filtering still work instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not render the list as buttons in a div: the ListBox gives one tab stop, arrow navigation and aria-selected for free.
- When the selected agent is filtered out it stays selected; keep showing its conversation instead of clearing it.
- The status dot ring is drawn in the panel background colour; on a different surface pass a matching ring-* class or the dot looks cut out.

## Notes

- Pass footer for Support / Settings links or an account card; it pins under the scrolling list.
- AgentStatusDot and AGENT_STATUS_META are exported so the conversation header can show the same status.

## Definition of done

Pressing Running leaves only running and waiting agents and its count matches the rows shown; Done leaves only done agents; clicking a row (or arrowing to it and pressing Enter) gives it aria-selected="true" and fires onSelect once; the search toggle shows an input that filters rows by name as you type and Escape closes and clears it; "+" runs onCreate.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
