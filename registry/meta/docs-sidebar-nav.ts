import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'docs-sidebar-nav',
  title: 'Docs Sidebar Nav',
  category: 'navigation',
  kit: 'boardui',
  tags: ['docs', 'sidebar', 'navigation', 'tree', 'filter', 'boardui'],
  blurb:
    'Floating docs sidebar with collapsible groups, tree rails, New/Pro badges, an active page and a ⌘K filter that highlights matches.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/docs-sidebar-nav.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The left rail of a documentation site: a rounded floating panel with a brand slot, a pill filter, and grouped page links drawn on a thin tree rail. Group headers fold their lists with a height transition, the current page sits on a grey fill, and New/Pro pills flag pages. Typing in the filter narrows every group at once, opens all groups and highlights the matched letters.',

  mechanism: [
    'Data is an array of groups, each with items `{ id, label, icon?, badge?, href?, disabled?, keywords? }`. Active page, collapsed group ids and filter text are each controlled-or-uncontrolled through a small `useControllable` helper, so the nav works stand-alone or wired to a router.',
    '`filterDocsNav(groups, query)` lower-cases the query; a group whose own label matches is kept whole, otherwise only items whose label or `keywords` contain the query survive, and empty groups drop out. While a query is active every surviving group is forced open and its header renders as a plain label instead of a toggle, so a match can never hide inside a folded group.',
    'Each group panel is a CSS grid that transitions `grid-template-rows` between `0fr` and `1fr` (with opacity) over 200ms. The inner list has `min-h-0 overflow-hidden`, so the fold animates to the real content height without measuring. A folded panel gets `inert`, which removes its links from the tab order and from the accessibility tree.',
    'Every row is a `<button>` (or an `<a>` when `href` is given) with `aria-current="page"` on the active one. The tree rail is two absolutely positioned spans per row painted after the button: a 8px "corner" with `border-s border-b rounded-es-[6px]` from the row top to its middle, and, for all but the last row, a straight line from the middle to the next row. Because they come after the row they stay visible over the active fill.',
    'Keyboard: ArrowUp/ArrowDown/Home/End on the nav move focus across the filter, group headers and rows (anything with `data-docs-nav-focus` that is not inside an `inert` panel or disabled). Escape in the filter clears it. With `hotkey`, a window `keydown` listener focuses and selects the filter on ⌘K / Ctrl+K and is removed on unmount.',
    'On mount, if the active row is outside the list viewport, the list scroller\'s `scrollTop` is adjusted to centre it (rect maths on the scroller, never `scrollIntoView`, so the page itself never jumps). The list fades out over its last 32px with a mask and pads 32px at the bottom so the last row can scroll clear of the fade.',
  ],

  constants: [
    { name: 'rail inset', value: 'start-[13px], 8px corner, rounded-es-[6px]', why: 'Puts the rail under the group label\'s first letter column and leaves room for the 16px icon at 33px, matching the reference spacing where icons start 33px from the list edge and plain labels 32px.' },
    { name: 'row height / gap', value: 'h-8 with gap-0.5 (34px pitch)', why: 'The reference rows sit 34px apart with a 32px tall active fill; the 2px gap keeps neighbouring hover fills from touching.' },
    { name: 'fold duration', value: '200ms ease-out on grid-template-rows + opacity', why: 'Long enough to read as a fold, short enough that toggling several groups in a row never queues up visible motion.' },
    { name: 'bottom fade', value: 'mask-b-from-[calc(100%-32px)] with pb-8', why: 'The fade signals more content below; the matching 32px of padding lets the last row scroll fully out of the faded band.' },
    { name: 'panel width', value: 'w-[260px], rounded-3xl, shadow-sidebar', why: 'Same floating panel recipe as the kit dashboard sidebar so the two read as one system.' },
  ],

  pitfalls: [
    'Animating `height` from 0 to `auto` instead of the `0fr`/`1fr` grid trick. `auto` does not interpolate, so the fold snaps; measuring heights in JS breaks when badges or wrapping labels change the content.',
    'Hiding a collapsed panel with only `overflow-hidden`. Its links stay focusable and Tab lands inside an invisible list. The panel must be `inert` while closed.',
    'Keeping collapsed groups collapsed while filtering. A match inside a folded group looks like "no results"; the filter forces every surviving group open.',
    'Calling `scrollIntoView` to reveal the active row. It scrolls every scrollable ancestor, including the page, so a docs page would jump on load.',
    'Drawing the rail before the row button. The active row\'s fill then paints over it and the tree looks broken at the current page.',
  ],

  notes: [
    '`filterDocsNav` is exported so a command palette can reuse the same matching rules as the sidebar.',
    'The hotkey is opt-in because a host app may already own ⌘K for its own command palette.',
  ],

  apiSignature:
    'function DocsSidebarNav(props: { groups: DocsNavGroup[]; value?: string | null; defaultValue?: string | null; onValueChange?: (id: string, item: DocsNavItem) => void; collapsedGroups?: string[]; defaultCollapsedGroups?: string[]; onCollapsedGroupsChange?: (ids: string[]) => void; query?: string; defaultQuery?: string; onQueryChange?: (query: string) => void; showFilter?: boolean; filterPlaceholder?: string; filterLabel?: string; hotkey?: boolean; hotkeyLabel?: string; header?: ReactNode; footer?: ReactNode; emptyMessage?: (query: string) => ReactNode; "aria-label"?: string; className?: string }): JSX.Element\nfunction filterDocsNav(groups: DocsNavGroup[], query: string): DocsNavGroup[]',

  props: [
    { name: 'groups', type: 'DocsNavGroup[]', description: 'Sections of `{ id, label, items }`; each item is `{ id, label, icon?, badge?: "new" | "pro", href?, disabled?, keywords? }`.' },
    { name: 'value / defaultValue', type: 'string | null', default: 'null', description: 'Id of the active page. Gets the grey fill and `aria-current="page"`.' },
    { name: 'onValueChange', type: '(id: string, item: DocsNavItem) => void', description: 'Called when a row is activated.' },
    { name: 'collapsedGroups / defaultCollapsedGroups', type: 'string[]', default: '[]', description: 'Ids of folded groups.' },
    { name: 'onCollapsedGroupsChange', type: '(ids: string[]) => void', description: 'Called with the next folded ids when a header is toggled.' },
    { name: 'query / defaultQuery', type: 'string', default: '""', description: 'Filter text. Non-empty text filters rows, opens all groups and highlights matches.' },
    { name: 'onQueryChange', type: '(query: string) => void', description: 'Called as the filter changes or is cleared.' },
    { name: 'showFilter', type: 'boolean', default: 'true', description: 'Renders the pill filter input.' },
    { name: 'hotkey', type: 'boolean', default: 'false', description: 'Focuses the filter on ⌘K / Ctrl+K and shows `hotkeyLabel` in the pill.' },
    { name: 'header / footer', type: 'ReactNode', description: 'Brand row above the filter and a pinned row below the list.' },
    { name: 'emptyMessage', type: '(query: string) => ReactNode', default: 'No pages match “…”', description: 'Shown when the filter leaves nothing.' },
    { name: 'className', type: 'string', description: 'Merged onto the panel; set the height here so the list can scroll.' },
  ],

  reducedMotion:
    'The group fold, chevron rotation and row colour transitions all carry `motion-reduce:transition-none`, so groups open and close instantly and the chevron flips without turning. Nothing else moves.',

  cleanup:
    'The optional ⌘K `keydown` listener is attached to `window` in an effect and removed on unmount or when `hotkey` turns off. The mount-time scroll correction is a one-shot read with nothing to release.',

  acceptance:
    'Typography is active with a grey fill and `aria-current="page"`. Clicking "Base" folds that group (its header gets `aria-expanded="false"`) and clicking again unfolds it. Typing "car" into the filter leaves Carousel and Line Chart Card with "car" highlighted, opening the folded Charts group; Escape clears it and the full list returns. Pressing ⌘K focuses the filter. Clicking Badge moves the active fill to Badge and the side panel heading reads Badge. The disabled Sankey Flow row cannot be activated.',

  criticalRegion: 'critical',
};

export default meta;
