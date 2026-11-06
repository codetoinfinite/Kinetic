import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'data-table',
  title: 'Data Table',
  category: 'block',
  kit: 'boardui',
  tags: ['table', 'data-table', 'tanstack', 'sorting', 'pagination', 'selection', 'react-aria', 'boardui'],
  blurb:
    'A customers table where TanStack owns sorting, selection and pages, filters narrow the rows, and React Aria renders the grid.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/data-table.tsx',
      type: 'registry:ui',
      role: 'block',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', '@tanstack/react-table@^8.21.3', 'react-aria-components@^1.22.1'],

  summary:
    'The dashboard customers table from BoardUI: a toolbar with a result count, price, product and region selects and a search field, then a sortable, selectable, paginated table of 48 seeded customers with avatar initials, a purchase-status select, a status chip, a date, a price and row actions. A @tanstack/react-table instance owns the sort, selection and page state, and the kit\'s React Aria `Table` only renders what TanStack hands it. A Normal / Compact switch under the table changes the density of every cell at once.',

  mechanism: [
    'Rows come from a module-level array: 48 customers drawn from a seeded PRNG (seed 42), so server and client generate the same list. The first eight use fixed names; the rest combine random first and last names. Each row carries a purchase state, one of four statuses, a product, a region, a price from $20 to $3,999 and a 2026 date, plus `updatedTs` for sorting.',
    'Filtering happens before TanStack sees the data: a `useMemo` keeps the customers that match the price bucket, product, region and a case-insensitive name search. Every filter `onSelectionChange` and every keystroke in search calls `table.setPageIndex(0)`, so narrowing the list never strands you on a page that no longer exists.',
    '`useReactTable` gets the filtered data, column defs, `getRowId: row => row.id` and controlled `sorting`, `rowSelection` and `pagination` state, with the core, sorted and pagination row models. Name, Last updated (sorted on `updatedTs`) and Price are sortable; Purchase, Status and Actions set `enableSorting: false`. Two rows start selected.',
    'The kit `Table` is React Aria\'s with `selectionMode="none"`, so React Aria never keeps a second selection. Selection is TanStack\'s: each name cell holds a `Checkbox` with `slot={null}` wired to `row.toggleSelected`, the header holds a select-all-on-this-page checkbox that shows indeterminate for a partial page, and selected rows get the secondary background through an inline style.',
    'Sortable headers are plain buttons calling `column.getToggleSortingHandler()`; the `SortChevron` turns 180 degrees for ascending over 150ms and darkens when active. Rows render `flexRender` cells into fixed-width columns inside a `min-w-[1000px]` table whose container scrolls horizontally on narrow screens. An empty filter result shows "No customers match your filters."',
    'Row actions are Delete and Edit `IconButton`s wrapped in `Focusable` so a React Aria `TooltipTrigger` can attach (200ms delay), and a More trigger styled like an IconButton that opens a four-item dropdown. The pagination footer appears only when there is more than one page. The density switch sets the table `size` to `md` or `sm`, which also swaps avatar, select and chip sizes, and the `.bui-table` styles animate cell padding and font size over 200ms.',
  ],

  constants: [
    {
      name: 'page size',
      value: '8 rows (prop `pageSize`)',
      why: 'Eight Normal-density rows plus the toolbar and footer fit a laptop viewport; BoardUI\'s landing collage passes 5 to match the Figma crop.',
    },
    {
      name: 'seeded data',
      value: 'mulberry32-style PRNG, seed 42, 48 rows',
      why: 'Enough rows for six pages and meaningful filtering, and deterministic so server-rendered markup matches the client.',
    },
    {
      name: 'column widths',
      value: 'name 240, purchase 172, status 168, updated 160, price 140, actions 132 (px); table min-w-[1000px]',
      why: 'Fixed widths stop columns from jumping when sorting or paging changes the longest value; the minimum width keeps the action buttons from wrapping and lets the container scroll instead.',
    },
    {
      name: 'cell density',
      value: 'Normal px-3 py-2.5 body; Compact px-2.5 py-1.5 body-2; 200ms transition',
      why: 'The density switch animates padding and font size together, so the rows compress smoothly instead of snapping.',
    },
    {
      name: 'tooltip delay',
      value: '200ms',
      why: 'Long enough that sweeping across a row of icon buttons does not flash tooltips, short enough to label an icon on purpose.',
    },
  ],

  pitfalls: [
    'Do not let React Aria and TanStack both own selection. The table uses `selectionMode="none"` and the checkboxes use `slot={null}`; otherwise React Aria claims the checkboxes for its own selection model and the two states drift apart.',
    'Do not drop `getRowId`. With TanStack\'s default index ids, selection belongs to positions, so filtering or sorting moves the checkmarks onto different customers.',
    'Do not change filters without resetting `pageIndex`. Filtering to fewer rows while on page 5 leaves the table showing an empty page.',
    'Do not put the real `IconButton` inside `DropdownTrigger`. Both render buttons, so the More trigger restyles the trigger itself to avoid nesting a button in a button.',
    'Do not generate the sample data with `Math.random()` at render time. The seeded PRNG at module level is what keeps hydration stable.',
  ],

  notes: [
    'The purchase select in each row is uncontrolled (`defaultSelectedKey`) and does not write back to the data, so a change resets when the row remounts, for example after paging. Lift it into state if it must persist.',
    '`formatPrice` prints prices of 1,000 or more with a dot separator ("$1.250"), as in the Figma frame; swap in `Intl.NumberFormat` for your locale.',
    'All strings go through `useTemplateCopy`, so a `TemplateCopyProvider` can translate the toolbar, headers and empty state.',
    'Composes kit items: Table, Select, Checkbox, Avatar, Chip, StatusDot, IconButton, Tooltip, Dropdown, InputBase, Pagination and SegmentedControl.',
  ],

  apiSignature: 'function DataTableExample(props?: { showSizeToggle?: boolean; pageSize?: number }): JSX.Element',

  props: [
    { name: 'pageSize', type: 'number', default: '8', description: 'Rows per page.' },
    { name: 'showSizeToggle', type: 'boolean', default: 'true', description: 'Shows the Normal / Compact density switch below the table.' },
  ],

  reducedMotion:
    'The block does not branch on `prefers-reduced-motion`. Its motion is the 150ms sort-chevron turn, 150ms row and button colour fades, the 200ms density change and the kit popovers\' short entrances; none of it carries information the static state lacks.',

  cleanup:
    'No timers or global listeners of its own. The TanStack instance lives in component state, and React Aria tears down tooltip, select and dropdown overlays when they close or unmount.',

  acceptance:
    'The toolbar reads "Total Results 48 customers" with All prices, All products and All regions selects and a Search field; the table shows 8 rows with two selected and a pagination footer. Clicking "Customer name" sorts A to Z and turns the chevron, clicking again sorts Z to A. Choosing "Over $1,000" or typing a name narrows the count, returns to page 1 and keeps the selection on the same customers. The header checkbox selects or clears the current page and shows indeterminate when only some rows are selected. Hovering Edit shows its tooltip; the More button opens View profile, Duplicate row, Download invoice and Archive customer. Compact tightens every row smoothly.',

  criticalRegion: 'critical',
};

export default meta;
