import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'sidebar',
  title: 'Sidebar',
  category: 'block',
  kit: 'boardui',
  tags: ['sidebar', 'navigation', 'collapsible', 'search', 'menu', 'boardui'],
  blurb:
    'A floating dashboard sidebar that folds from 260px to a 60px icon rail, with ⌘L nav search, team and account menus and a settings entry.',
  cost: 'dom',
  motif: 'stack',

  files: [
    { path: 'registry/ui/dashboard-sidebar.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/ui/dashboard-team-menu.tsx', type: 'registry:ui', role: 'team-menu' },
    { path: 'registry/ui/dashboard-user-menu.tsx', type: 'registry:ui', role: 'user-menu' },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A floating `<aside>` with an account switcher at the top, Quick Search, the primary nav and, at the bottom, Support, Settings and a team card. One button folds it from 260px to a 60px rail. The panel width animates, and every label, badge and shortcut hint blurs and narrows away while the icons stay where they were. The account and team cards open React Aria popovers beside the rail, and Settings opens the kit\'s `SettingsModal`.',

  mechanism: [
    'Collapsing animates two things on the same 300ms ease-in-out clock. The aside\'s `width` goes from 260px to 60px, and each text slot is wrapped in `Collapsible`, which moves `max-width` from full to 0, `opacity` from 1 to 0 and `filter` from blur(0) to blur(3px). The icons are never re-centred, so they stay pinned to the left edge while the panel closes over them.',
    'Each row is an `<a>` with `aria-label`, `aria-current` on the selected row and a `title` tooltip only while collapsed. The selected row is filled with a top-to-bottom accent gradient and `shadow-nav-selected`, and its badge switches to the primary colour. Rows passed through `items` are filtered against the search query by a separate `NavRows` component, so the closures over the query and `collapsed` stay out of the sidebar body.',
    'Quick Search has three ways in: the button, ⌘L or Ctrl+L, and expanding the rail first if it is collapsed. All of them set `searchActive`. The field replaces the button with a 2px inset ring and its input is focused one animation frame later, once it exists. A document `click` listener closes the search when a click lands outside the field. Escape clears it and puts focus back on the trigger on the next frame. Support and Settings are filtered too, and "No results" appears only when nothing in either list matches.',
    'The scroller is wider than the rail by 16px (`-m-2 p-2 w-[calc(100%+16px)]`). A vertical `overflow-y: auto` box also clips horizontally, so without that extra room the selected row\'s ring, the focus rings and the account trigger\'s 6px hover pill would be cut off at the rail edge. The negative margin gives the space back, so nothing moves.',
    'The account and team cards are React Aria `DialogTrigger` + `Popover` pairs, 265px wide and offset 8px. The account menu opens to the right and aligned to the top of its trigger, and the team menu to the right and aligned to the bottom. In RTL they open to the left, and below 640px they drop under the trigger. Both animate 150ms ease-out from `data-[entering]` / `data-[exiting]` states at opacity 0, scale 0.95 and blur 2px. React Aria handles focus containment, Escape and outside-click dismissal.',
    'Expanding the rail sets `suppressHover` on the account trigger. Its hover pill is drawn by a `::before` with `-inset-x-1.5 -inset-y-[5px]`. Without the flag, the newly expanded trigger would slide under a pointer that has not moved and light its pill. The flag is cleared on the trigger\'s next `pointerleave`.',
  ],

  constants: [
    {
      name: 'rail widths',
      value: '260px expanded, 60px collapsed (px 11, py 12)',
      why: 'The collapsed width is 1px border + 11px padding on each side, which leaves exactly 36px, the width of a `w-9` icon row. So icons sit centred in the rail without being moved, and the selected fill fits the column with no clipping.',
    },
    {
      name: 'collapse timing',
      value: '300ms ease-in-out, label blur 3px',
      why: 'Width, label fade and icon flip share one duration, so the panel edge and the disappearing text arrive together. A 3px blur is enough to soften the text as it is squeezed, so it never reads as being cut off.',
    },
    {
      name: 'popover motion',
      value: '150ms ease-out, scale 0.95, blur 2px, offset 8px',
      why: 'Menus are opened often and should feel instant, so they run at half the rail\'s duration. A 0.95 scale from the corner nearest the trigger (`origin-top-left` / `origin-bottom-left`) makes the panel read as coming out of the card.',
    },
    {
      name: 'search shortcut',
      value: '⌘L / Ctrl+L on window',
      why: 'Matches the Kbd hint on the button. The handler calls `preventDefault`, so while the sidebar is mounted the shortcut opens the nav search instead of focusing the browser\'s address bar.',
    },
    {
      name: 'mobile breakpoint',
      value: '(max-width: 639px)',
      why: 'Below Tailwind\'s `sm`, the sidebar can span the whole viewport, and a 265px popover placed to its right would render off-screen. Both menus switch to `bottom start` under that query.',
    },
  ],

  pitfalls: [
    'Clipping the nav scroller to the rail\'s own box. `overflow-y: auto` forces `overflow-x` to clip too, and the selected ring, the focus rings and the account trigger\'s hover pill all extend past the rows. Keep the padded, negatively-margined scroller.',
    'Centring icons when the rail collapses (`justify-center` on the rows). The icons then jump sideways while the width animates. Only the label slots should change. The 60px rail is sized so the left-aligned icons already end up centred.',
    'Animating labels with `width` or `display`. `display: none` cannot transition, and a fixed `max-width` cap (an earlier version used 160px) truncates long labels such as "AI Image Generation". The slot animates `max-width` between `full` and 0.',
    'Rendering two sidebars on one page. Each registers its own window ⌘L listener, so a single shortcut opens search in both.',
    'Rendering the sidebar inside a parent without a height. The aside is `h-full` and its nav scrolls inside it, so a parent with no height gives the nav nothing to scroll in and the footer is pushed below the fold.',
  ],

  notes: [
    '`items` replaces the primary rows (the default is `DASHBOARD_NAV`), and `selected` takes any row `key`. Rows without an `href` fall back to `#`, so a host app that routes client-side should pass real paths.',
    '`flat` drops the floating panel treatment for a sidebar revealed beneath mobile content. `mobile` swaps the collapse button for a close button, and with `flat` it turns search into an expanding pill next to the account trigger.',
    'Settings is an action row. Its click handler calls `preventDefault` and opens `SettingsModal`, so the settings dialog comes with the sidebar as a registry dependency.',
  ],

  apiSignature:
    'interface DashboardNavItem { key: string; label: string; icon: IconComponent; href?: string; badge?: string | number }\nconst DASHBOARD_NAV: DashboardNavItem[]\nfunction DashboardSidebar(props?: { mobile?: boolean; onClose?: () => void; fluid?: boolean; showThemeToggle?: boolean; selected?: DashboardNavKey; items?: DashboardNavItem[]; flat?: boolean; className?: string }): JSX.Element\nfunction DashboardTeamMenu(props: { collapsed?: boolean; className?: string; showThemeToggle?: boolean }): JSX.Element\nfunction DashboardUserMenu(props: { collapsed?: boolean; suppressHover?: boolean; onHoverSuppressionEnd?: () => void; avatarClassName?: string }): JSX.Element',

  props: [
    { name: 'selected', type: 'string', default: '"home"', description: 'Key of the row drawn in the filled accent state.' },
    { name: 'items', type: 'DashboardNavItem[]', default: 'DASHBOARD_NAV', description: 'Primary navigation rows: key, label, icon component, optional href and badge.' },
    { name: 'showThemeToggle', type: 'boolean', default: 'true', description: 'Shows the light/dark segmented control above the footer. It toggles the document theme, so hide it when the sidebar is used as artwork.' },
    { name: 'fluid', type: 'boolean', default: 'false', description: 'Expanded width fills the container below `lg` instead of a fixed 260px. The collapsed rail stays 60px.' },
    { name: 'mobile', type: 'boolean', default: 'false', description: 'Drawer mode: always expanded, with a close button in place of the collapse toggle.' },
    { name: 'onClose', type: '() => void', description: 'Called by the mobile close button.' },
    { name: 'flat', type: 'boolean', default: 'false', description: 'Removes the border, radius and shadow and paints the full background.' },
    { name: 'className', type: 'string', description: 'Merged onto the aside.' },
  ],

  reducedMotion:
    'Not handled. The rail width, label blur, search field and popover transitions run at full duration under `prefers-reduced-motion: reduce`, and none of the three files uses `motion-reduce:` variants. The motion is short (150 to 300ms) and never loops, but to honour the setting add `motion-reduce:transition-none` to the aside, `Collapsible` and the two popovers. The theme toggle, when shown, already skips its view-transition reveal under reduced motion.',

  cleanup:
    'Every listener is scoped to an effect: the window `keydown` for ⌘L (always), the document `click` for outside-click (only while search is active) and the rAF that focuses the search input (cancelled if search closes first). Each is removed on unmount or when its condition ends. The account menu removes its `matchMedia` change listener, and the team menu reads the same query through `useSyncExternalStore`, which unsubscribes itself. React Aria tears down the popovers\' focus scope and dismiss handlers when they close.',

  acceptance:
    'The sidebar fills the page height beside the content, with Home selected and its 152 badge. Clicking the fold icon narrows the panel to a 60px rail as labels, badges and the ⌘L hint blur away, and the icons do not move sideways. Clicking it again restores everything. Pressing ⌘L or Ctrl+L, or clicking Quick Search, opens a ringed search field (expanding the rail if needed). Typing filters the rows, "zzz" shows "No results", and Escape or a click outside closes it. Clicking the Jordan Lee trigger opens an account list to the right that blurs and scales in, and clicking the Acme team card opens the team menu to the right, aligned with the card\'s bottom edge. Escape closes either. Settings opens the settings dialog, which is closed until then.',

  criticalRegion: 'critical',
};

export default meta;
