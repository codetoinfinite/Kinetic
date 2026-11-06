/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Profile" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'ai-profile',
  title: 'AI Profile',
  category: 'block',
  kit: 'boardui',
  tags: ['template', 'ai', 'profile', 'dashboard', 'charts', 'heatmap', 'sidebar', 'boardui'],
  blurb: 'AI usage profile page: cover header with tabs, stat tiles, an activity heatmap, and agent and token charts beside a workspace sidebar.',
  cost: 'dom',
  motif: 'stack',

  files: [
    { path: 'registry/ui/ai-profile.tsx', type: 'registry:ui', role: 'page: state, layout, tab panels, edit modal, search palette and toasts' },
    { path: 'registry/ui/ai-profile-views.tsx', type: 'registry:ui', role: 'activity heatmap, Agents / Images / Activity panels, workspace pages and the edit form' },
    { path: 'registry/ui/ai-profile-sidebar.tsx', type: 'registry:ui', role: 'workspace sidebar with account menu, nav, theme toggle and team switcher' },
    { path: 'registry/ui/ai-profile-data.tsx', type: 'registry:ui', role: 'seeded heatmap ranges, agent months, token series, stat tiles, feed and page rows' },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A full AI usage profile for a 1280 × 800 frame. A workspace sidebar sits on the left; the main pane holds a cover header with the owner\'s name, handle, badge, inline stats, Share and Edit, and four tabs. Overview shows a contributions headline with four selectable lifetime tiles and a Weekly / Monthly / Yearly activity heatmap. Agents ranks the month\'s active agents, Images is a masonry gallery and Activity is a timeline. Under the header an Agents bar chart steps through months and a Tokens area chart switches between 7, 30 and 90 days. Every sidebar entry opens a real view.',

  mechanism: [
    'All page state lives in `AiProfile`: the view, the profile tab, the sidebar and drawer flags, the open overlays, the editable profile, the agent month, the token period, the selected tile, the unread count and the team. The sidebar, panels, workspace pages and edit form are controlled components in their own files.',
    'The agent month is shared. `AgentsBarCard` steps it through `onMonthChange`, and the same month drives the Agents tab count, the Agents panel ranking and the header\'s agents stat, so they always describe one month.',
    'The heatmap is a CSS grid with `grid-flow-col` and inline row and column templates, so one component draws the 7 × 38 weekly grid, the 4 × 12 monthly grid and the 3 × 12 yearly grid from column-major values. Each cell\'s level is `ceil(value / max × 4)`, capped at 4, with 0 for idle cells. One `pointerover` handler on the grid reads the cell\'s `data-cell` index and the readout under the grid names that cell and its runs.',
    'All series come from a seeded mulberry32 generator and hard-coded day labels, so the server and client render the same numbers and the demo never reads the clock.',
    'Edit opens a kit Modal with a form. Name and handle are validated (the handle must be 2 to 24 letters, numbers, dots or underscores, with a leading @ stripped), and Save writes the name, handle, bio and cover tone back to the header and the sidebar account button.',
    'The sidebar collapse button hides the sidebar and a Show sidebar button brings it back. Below 1024px the sidebar becomes a drawer over a backdrop, opened from the menu button and closed by the backdrop, Escape, a nav choice or the collapse button.',
    'Quick Search opens the kit Command palette (also on ⌘L) with every page and the profile actions; Settings opens the kit Settings modal. Share, Support, team switches and gallery downloads report through toasts.',
  ],

  constants: [
    { name: 'frame', value: '12px padding and gaps; sidebar 248px; content column up to 720px', why: 'At 1280px the profile column sits centred in the main pane with room for the two charts side by side.' },
    { name: 'heat levels', value: '5 steps: empty, then violet at 20%, 40%, 70% and 100%', why: 'Quartiles of the busiest cell keep the grid readable whatever the range\'s scale.' },
    { name: 'agents shown', value: 'top 6, then Show all', why: 'Six rows fit the tab panel without pushing the charts below the fold.' },
  ],

  pitfalls: [
    'Giving the Agents chart and the Agents tab their own month state. They drift apart as soon as the chart steps; the month lives in the page and both read it.',
    'Seeding the series from `Math.random()` or the clock. The server and client then render different grids and hydration fails; the data uses a fixed-seed generator and fixed labels.',
    'Attaching a listener to every heatmap cell. The weekly grid alone has 266 cells; one delegated `pointerover` on the grid reads a `data-cell` index instead.',
  ],

  notes: [
    'The workspace pages (Home, Project board, Marketing and so on) are light stand-ins with seeded rows; Home\'s Mark all read clears the sidebar badge.',
    'Share copies a profile link to the clipboard when the browser allows it. Support and downloads are local stand-ins that report through toasts.',
  ],

  apiSignature:
    'function AiProfile(props: AiProfileProps): JSX.Element\ninterface AiProfileProps { defaultView?: ProfileView; defaultMonth?: string; className?: string }',

  props: [
    { name: 'defaultView', type: 'ProfileView', default: '"profile"', description: 'View selected on first render: "home", "board", "marketing", "calendar", "finance", "medical", "chat", "images" or "profile".' },
    { name: 'defaultMonth', type: 'string', default: '"dec"', description: 'Month the Agents chart and tab open on: "oct", "nov" or "dec".' },
    { name: 'className', type: 'string', description: 'Merged onto the root, which is h-full w-full.' },
  ],

  reducedMotion:
    'Hover and selection transitions use motion-reduce:transition-none. The token chart turns its Recharts animation off under reduced motion, the agent bars stop easing their height, and the kit tabs, modal, palette and toasts follow their own reduced-motion rules.',

  cleanup:
    'The only listener the page adds is the Escape handler for the drawer, which exists while the drawer is open and is removed when it closes or the page unmounts. The kit overlays and toasts clean up their own timers.',

  acceptance:
    'At 1280 × 800 a sidebar and a profile column fill the frame. The cover shows Mara Ellison, @maraellison, a PRO badge, Share and Edit. Overview shows a contributions headline, four tiles that toggle a detail line, and a heatmap that switches between Weekly, Monthly and Yearly and names the hovered cell. The Agents, Images and Activity tabs each show their panel. Stepping the Agents chart month changes the Agents tab count. The Tokens chart switches between 7D, 30D and 90D. Editing the profile updates the header. Every sidebar item opens its view, the sidebar hides and comes back, and below 1024px it becomes a drawer.',

  criticalRegion: 'critical',
};

export default meta;
