/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent List Panel" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'agent-list-panel',
  title: 'Agent List Panel',
  category: 'navigation',
  kit: 'boardui',
  tags: ['boardui', 'agents', 'sidebar', 'list', 'filter', 'react-aria'],
  blurb: 'Agent sidebar list with avatar, live status dot, last message and time, single selection, search and All/Running/Done tabs.',
  cost: 'dom',
  motif: 'stack',
  files: [
    {
      path: 'registry/ui/agent-list-panel.tsx',
      type: 'registry:ui',
      role: 'AgentListPanel, AgentStatusDot, AgentMonogram, AGENT_STATUS_META, matchesAgentFilter',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1', '@remixicon/react@^4.9.0'],
  summary:
    'The left rail of a multi-agent workspace: a pill toolbar (search, optional extra buttons, a blue "+"), a three-way All / Running / Done filter with live counts, and a list of agents. Each row shows a 32px avatar with a status dot on its corner, the agent name with a relative time, and its last message on one truncated line. Rows select like a listbox with the pointer or the arrow keys, and the selection can be controlled or left to the panel.',
  mechanism: [
    'Counts for every tab are computed once per agents array with matchesAgentFilter: Running covers status running or waiting, Done covers done, All covers everything.',
    'The visible list is the agents array filtered by the active tab and by the search query (case-insensitive match on name or last message), memoised on agents, filter and query.',
    'The filter is a React Aria ToggleButtonGroup with selectionMode="single" and disallowEmptySelection, so one tab is always pressed; filter/defaultFilter/onFilterChange make it controlled or uncontrolled.',
    'The list is a React Aria ListBox (single selection, disallowEmptySelection): arrow keys, Home/End and typeahead move focus, Enter/Space or a click select, and handleSelection maps the key back to the agent before calling onSelect.',
    'The search pill toggles an autofocused input under the toolbar; Escape or the pill (now an X) clears the query and closes it.',
    'Avatars default to AgentMonogram, a 32px rounded tile whose tint is picked by hashSeed(name) from five calendar-event palettes, so a name always keeps its colour; any node can replace it per agent.',
  ],
  constants: [
    { name: 'avatar', value: '32px tile, 10px radius', why: 'Matches the reference rows; the status dot (10px with a 2px ring) sits on its bottom corner without covering the initials.' },
    { name: 'toolbar pills', value: 'h-8, rounded-full, flex-1', why: 'Search, extra buttons and "+" share the width evenly like the reference toolbar.' },
    { name: 'filter rule', value: 'running = running | waiting; done = done', why: 'An agent waiting on your input is still in progress; failed and idle agents only appear under All.' },
    { name: 'tones', value: '5 (lime, blue, pink, purple, emerald)', why: 'calendar-event tokens carry their own dark values, so monograms stay legible in both themes.' },
  ],
  pitfalls: [
    'Do not render the list as buttons in a div: the ListBox gives one tab stop, arrow navigation and aria-selected for free.',
    'When the selected agent is filtered out it stays selected; keep showing its conversation instead of clearing it.',
    'The status dot ring is drawn in the panel background colour; on a different surface pass a matching ring-* class or the dot looks cut out.',
  ],
  notes: [
    'Pass footer for Support / Settings links or an account card; it pins under the scrolling list.',
    'AgentStatusDot and AGENT_STATUS_META are exported so the conversation header can show the same status.',
  ],
  apiSignature:
    'function AgentListPanel(props: { agents: AgentListItem[]; selectedId?: string | null; defaultSelectedId?: string | null; onSelect?: (id: string, agent: AgentListItem) => void; filter?: AgentFilter; defaultFilter?: AgentFilter; onFilterChange?: (filter: AgentFilter) => void; onCreate?: () => void; createLabel?: string; toolbar?: ReactNode; searchable?: boolean; footer?: ReactNode; emptyLabel?: string; "aria-label"?: string; className?: string }): JSX.Element',
  props: [
    { name: 'agents', type: 'AgentListItem[]', description: '{ id, name, lastMessage?, time?, status?, avatar?, unread? } per agent.' },
    { name: 'selectedId', type: 'string | null', description: 'Controlled selected agent id.' },
    { name: 'defaultSelectedId', type: 'string | null', default: 'null', description: 'Initial selection when uncontrolled.' },
    { name: 'onSelect', type: '(id: string, agent: AgentListItem) => void', description: 'Called when a different agent is chosen.' },
    { name: 'filter', type: '"all" | "running" | "done"', description: 'Controlled filter tab.' },
    { name: 'defaultFilter', type: '"all" | "running" | "done"', default: '"all"', description: 'Initial filter when uncontrolled.' },
    { name: 'onFilterChange', type: '(filter: AgentFilter) => void', description: 'Called when a tab is pressed.' },
    { name: 'onCreate', type: '() => void', description: 'Shows the blue "+" toolbar button and runs on press.' },
    { name: 'createLabel', type: 'string', default: '"New agent"', description: 'Accessible label of the "+" button.' },
    { name: 'toolbar', type: 'ReactNode', description: 'Extra toolbar buttons between search and "+".' },
    { name: 'searchable', type: 'boolean', default: 'true', description: 'Show the search toggle.' },
    { name: 'footer', type: 'ReactNode', description: 'Content pinned below the list.' },
    { name: 'emptyLabel', type: 'string', default: '"No agents here yet."', description: 'Shown when a tab has no agents.' },
    { name: 'aria-label', type: 'string', default: '"Agents"', description: 'Accessible name of the list.' },
    { name: 'className', type: 'string', description: 'Classes for the panel surface (set its width and height here).' },
  ],
  reducedMotion:
    'The running dot drops its ping halo (motion-reduce:hidden), and row, tab and search transitions use motion-reduce:transition-none; selection and filtering still work instantly.',
  cleanup: 'No timers, listeners or observers of its own; React Aria owns the listbox and toggle-group handlers and removes them on unmount.',
  acceptance:
    'Pressing Running leaves only running and waiting agents and its count matches the rows shown; Done leaves only done agents; clicking a row (or arrowing to it and pressing Enter) gives it aria-selected="true" and fires onSelect once; the search toggle shows an input that filters rows by name as you type and Escape closes and clears it; "+" runs onCreate.',
  criticalRegion: 'critical',
};

export default meta;
