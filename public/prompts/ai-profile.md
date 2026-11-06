# Build: AI Profile

A full AI usage profile for a 1280 × 800 frame. A workspace sidebar sits on the left; the main pane holds a cover header with the owner's name, handle, badge, inline stats, Share and Edit, and four tabs. Overview shows a contributions headline with four selectable lifetime tiles and a Weekly / Monthly / Yearly activity heatmap. Agents ranks the month's active agents, Images is a masonry gallery and Activity is a timeline. Under the header an Agents bar chart steps through months and a Tokens area chart switches between 7, 30 and 90 days. Every sidebar entry opens a real view.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

AI usage profile page: cover header with tabs, stat tiles, an activity heatmap, and agent and token charts beside a workspace sidebar.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. All page state lives in `AiProfile`: the view, the profile tab, the sidebar and drawer flags, the open overlays, the editable profile, the agent month, the token period, the selected tile, the unread count and the team. The sidebar, panels, workspace pages and edit form are controlled components in their own files.
2. The agent month is shared. `AgentsBarCard` steps it through `onMonthChange`, and the same month drives the Agents tab count, the Agents panel ranking and the header's agents stat, so they always describe one month.
3. The heatmap is a CSS grid with `grid-flow-col` and inline row and column templates, so one component draws the 7 × 38 weekly grid, the 4 × 12 monthly grid and the 3 × 12 yearly grid from column-major values. Each cell's level is `ceil(value / max × 4)`, capped at 4, with 0 for idle cells. One `pointerover` handler on the grid reads the cell's `data-cell` index and the readout under the grid names that cell and its runs.
4. All series come from a seeded mulberry32 generator and hard-coded day labels, so the server and client render the same numbers and the demo never reads the clock.
5. Edit opens a kit Modal with a form. Name and handle are validated (the handle must be 2 to 24 letters, numbers, dots or underscores, with a leading @ stripped), and Save writes the name, handle, bio and cover tone back to the header and the sidebar account button.
6. The sidebar collapse button hides the sidebar and a Show sidebar button brings it back. Below 1024px the sidebar becomes a drawer over a backdrop, opened from the menu button and closed by the backdrop, Escape, a nav choice or the collapse button.
7. Quick Search opens the kit Command palette (also on ⌘L) with every page and the profile actions; Settings opens the kit Settings modal. Share, Support, team switches and gallery downloads report through toasts.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `frame = 12px padding and gaps; sidebar 248px; content column up to 720px`
  At 1280px the profile column sits centred in the main pane with room for the two charts side by side.
- `heat levels = 5 steps: empty, then violet at 20%, 40%, 70% and 100%`
  Quartiles of the busiest cell keep the grid readable whatever the range's scale.
- `agents shown = top 6, then Show all`
  Six rows fit the tab panel without pushing the charts below the fold.

## API

```ts
function AiProfile(props: AiProfileProps): JSX.Element
interface AiProfileProps { defaultView?: ProfileView; defaultMonth?: string; className?: string }
```

- `defaultView: ProfileView` — default `"profile"`
  View selected on first render: "home", "board", "marketing", "calendar", "finance", "medical", "chat", "images" or "profile".
- `defaultMonth: string` — default `"dec"`
  Month the Agents chart and tab open on: "oct", "nov" or "dec".
- `className: string`
  Merged onto the root, which is h-full w-full.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// The month is shared: the Agents chart steps it and the Agents tab and its
// count read it, so both always describe the same month.
const month = AGENT_MONTHS.find((m) => m.id === monthId) ?? AGENT_MONTHS[AGENT_MONTHS.length - 1]!;
const activeAgents = month.agents.filter((a) => a.value > 0).length;
const span = MONTH_SPAN[month.id] ?? ["", ""];
const tile = PROFILE_TILES.find((t) => t.id === tileId);

const go = (next: ProfileView, nextTab?: ProfileTabId) => {
  setView(next);
  if (nextTab) setTab(nextTab);
  setDrawer(false);
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The only listener the page adds is the Escape handler for the drawer, which exists while the drawer is open and is removed when it closes or the page unmounts. The kit overlays and toasts clean up their own timers.

**Reduced motion.** Hover and selection transitions use motion-reduce:transition-none. The token chart turns its Recharts animation off under reduced motion, the agent bars stop easing their height, and the kit tabs, modal, palette and toasts follow their own reduced-motion rules.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Giving the Agents chart and the Agents tab their own month state. They drift apart as soon as the chart steps; the month lives in the page and both read it.
- Seeding the series from `Math.random()` or the clock. The server and client then render different grids and hydration fails; the data uses a fixed-seed generator and fixed labels.
- Attaching a listener to every heatmap cell. The weekly grid alone has 266 cells; one delegated `pointerover` on the grid reads a `data-cell` index instead.

## Notes

- The workspace pages (Home, Project board, Marketing and so on) are light stand-ins with seeded rows; Home's Mark all read clears the sidebar badge.
- Share copies a profile link to the clipboard when the browser allows it. Support and downloads are local stand-ins that report through toasts.

## Definition of done

At 1280 × 800 a sidebar and a profile column fill the frame. The cover shows Mara Ellison, @maraellison, a PRO badge, Share and Edit. Overview shows a contributions headline, four tiles that toggle a detail line, and a heatmap that switches between Weekly, Monthly and Yearly and names the hovered cell. The Agents, Images and Activity tabs each show their panel. Stepping the Agents chart month changes the Agents tab count. The Tokens chart switches between 7D, 30D and 90D. Editing the profile updates the header. Every sidebar item opens its view, the sidebar hides and comes back, and below 1024px it becomes a drawer.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
