# Build: Data Table

The dashboard customers table from BoardUI: a toolbar with a result count, price, product and region selects and a search field, then a sortable, selectable, paginated table of 48 seeded customers with avatar initials, a purchase-status select, a status chip, a date, a price and row actions. A @tanstack/react-table instance owns the sort, selection and page state, and the kit's React Aria `Table` only renders what TanStack hands it. A Normal / Compact switch under the table changes the density of every cell at once.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A customers table where TanStack owns sorting, selection and pages, filters narrow the rows, and React Aria renders the grid.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, @tanstack/react-table@^8.21.3, react-aria-components@^1.22.1

## How it works

1. Rows come from a module-level array: 48 customers drawn from a seeded PRNG (seed 42), so server and client generate the same list. The first eight use fixed names; the rest combine random first and last names. Each row carries a purchase state, one of four statuses, a product, a region, a price from $20 to $3,999 and a 2026 date, plus `updatedTs` for sorting.
2. Filtering happens before TanStack sees the data: a `useMemo` keeps the customers that match the price bucket, product, region and a case-insensitive name search. Every filter `onSelectionChange` and every keystroke in search calls `table.setPageIndex(0)`, so narrowing the list never strands you on a page that no longer exists.
3. `useReactTable` gets the filtered data, column defs, `getRowId: row => row.id` and controlled `sorting`, `rowSelection` and `pagination` state, with the core, sorted and pagination row models. Name, Last updated (sorted on `updatedTs`) and Price are sortable; Purchase, Status and Actions set `enableSorting: false`. Two rows start selected.
4. The kit `Table` is React Aria's with `selectionMode="none"`, so React Aria never keeps a second selection. Selection is TanStack's: each name cell holds a `Checkbox` with `slot={null}` wired to `row.toggleSelected`, the header holds a select-all-on-this-page checkbox that shows indeterminate for a partial page, and selected rows get the secondary background through an inline style.
5. Sortable headers are plain buttons calling `column.getToggleSortingHandler()`; the `SortChevron` turns 180 degrees for ascending over 150ms and darkens when active. Rows render `flexRender` cells into fixed-width columns inside a `min-w-[1000px]` table whose container scrolls horizontally on narrow screens. An empty filter result shows "No customers match your filters."
6. Row actions are Delete and Edit `IconButton`s wrapped in `Focusable` so a React Aria `TooltipTrigger` can attach (200ms delay), and a More trigger styled like an IconButton that opens a four-item dropdown. The pagination footer appears only when there is more than one page. The density switch sets the table `size` to `md` or `sm`, which also swaps avatar, select and chip sizes, and the `.bui-table` styles animate cell padding and font size over 200ms.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `page size = 8 rows (prop `pageSize`)`
  Eight Normal-density rows plus the toolbar and footer fit a laptop viewport; BoardUI's landing collage passes 5 to match the Figma crop.
- `seeded data = mulberry32-style PRNG, seed 42, 48 rows`
  Enough rows for six pages and meaningful filtering, and deterministic so server-rendered markup matches the client.
- `column widths = name 240, purchase 172, status 168, updated 160, price 140, actions 132 (px); table min-w-[1000px]`
  Fixed widths stop columns from jumping when sorting or paging changes the longest value; the minimum width keeps the action buttons from wrapping and lets the container scroll instead.
- `cell density = Normal px-3 py-2.5 body; Compact px-2.5 py-1.5 body-2; 200ms transition`
  The density switch animates padding and font size together, so the rows compress smoothly instead of snapping.
- `tooltip delay = 200ms`
  Long enough that sweeping across a row of icon buttons does not flash tooltips, short enough to label an icon on purpose.

## API

```ts
function DataTableExample(props?: { showSizeToggle?: boolean; pageSize?: number }): JSX.Element
```

- `pageSize: number` — default `8`
  Rows per page.
- `showSizeToggle: boolean` — default `true`
  Shows the Normal / Compact density switch below the table.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const data = useMemo(() => {
  const bucket = PRICE_BUCKETS.find((b) => b.id === priceFilter) ?? PRICE_BUCKETS[0]!;
  const q = query.trim().toLowerCase();
  return CUSTOMERS.filter(
    (c) =>
      bucket.test(c.price) &&
      (productFilter === "all" || c.product === productFilter) &&
      (regionFilter === "all" || c.region === regionFilter) &&
      (q === "" || c.name.toLowerCase().includes(q)),
  );
}, [priceFilter, productFilter, regionFilter, query]);

const columns = useMemo<ColumnDef<Customer>[]>(
  () => [
    {
      accessorKey: "name",
      header: "Customer name",
      cell: ({ row }) => {
        const c = row.original;
        return localize((
          <div className="flex min-w-0 items-center gap-2">
            <Checkbox
              slot={null}
              aria-label={`Select ${c.name}`}
              isSelected={row.getIsSelected()}
              onChange={(v) => row.toggleSelected(!!v)}
            />
            {c.avatar ? (
              <Avatar size={avatarSize} src={c.avatar} alt="" />
            ) : (
              <Avatar size={avatarSize} color={c.initialsColor} initials={initialsOf(c.name)} />
            )}
            <span className="truncate text-body-medium text-text-primary">{c.name}</span>
          </div>
        ));
      },
    },
    {
      id: "purchase",
      enableSorting: false,
      header: "Purchase",
      cell: ({ row }) => localize((
        <PurchaseSelect value={row.original.purchase} name={row.original.name} size={size} />
      )),
    },
    {
      id: "status",
      enableSorting: false,
      header: "Status",
      cell: ({ row }) => localize((
        <Chip variant={size === "sm" ? "caption" : "bold"} color={row.original.status.color}>
          {row.original.status.label}
        </Chip>
      )),
    },
    {
      accessorKey: "updatedTs",
      header: "Last updated",
      cell: ({ row }) => localize((
        <span className="whitespace-nowrap text-body-medium text-text-primary">{row.original.updated}</span>
      )),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => localize((
        <Chip variant={size === "sm" ? "caption" : "subtle"} color="gray">
          {formatPrice(row.original.price)}
        </Chip>
      )),
    },
    {
      id: "actions",
      enableSorting: false,
      header: "Actions",
      cell: ({ row }) => localize((
        <div className="flex items-center justify-end gap-2.5">
          <RowActionButton icon={RiDeleteBin6Line} label="Delete" />
          <RowActionButton icon={RiEditLine} label="Edit" />
          <RowMoreMenu name={row.original.name} />
        </div>
      )),
    },
  ],
  [avatarSize, size, localize],
);

const table = useReactTable({
  data,
  columns,
  getRowId: (row) => row.id,
  state: { sorting, rowSelection, pagination },
  onSortingChange: setSorting,
  onRowSelectionChange: setRowSelection,
  onPaginationChange: setPagination,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  enableRowSelection: true,
});

const resetPage = () => table.setPageIndex(0);
const headers = table.getHeaderGroups()[0]?.headers ?? [];
const rows = table.getRowModel().rows;
const totalPages = table.getPageCount();
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers or global listeners of its own. The TanStack instance lives in component state, and React Aria tears down tooltip, select and dropdown overlays when they close or unmount.

**Reduced motion.** The block does not branch on `prefers-reduced-motion`. Its motion is the 150ms sort-chevron turn, 150ms row and button colour fades, the 200ms density change and the kit popovers' short entrances; none of it carries information the static state lacks.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not let React Aria and TanStack both own selection. The table uses `selectionMode="none"` and the checkboxes use `slot={null}`; otherwise React Aria claims the checkboxes for its own selection model and the two states drift apart.
- Do not drop `getRowId`. With TanStack's default index ids, selection belongs to positions, so filtering or sorting moves the checkmarks onto different customers.
- Do not change filters without resetting `pageIndex`. Filtering to fewer rows while on page 5 leaves the table showing an empty page.
- Do not put the real `IconButton` inside `DropdownTrigger`. Both render buttons, so the More trigger restyles the trigger itself to avoid nesting a button in a button.
- Do not generate the sample data with `Math.random()` at render time. The seeded PRNG at module level is what keeps hydration stable.

## Notes

- The purchase select in each row is uncontrolled (`defaultSelectedKey`) and does not write back to the data, so a change resets when the row remounts, for example after paging. Lift it into state if it must persist.
- `formatPrice` prints prices of 1,000 or more with a dot separator ("$1.250"), as in the Figma frame; swap in `Intl.NumberFormat` for your locale.
- All strings go through `useTemplateCopy`, so a `TemplateCopyProvider` can translate the toolbar, headers and empty state.
- Composes kit items: Table, Select, Checkbox, Avatar, Chip, StatusDot, IconButton, Tooltip, Dropdown, InputBase, Pagination and SegmentedControl.

## Definition of done

The toolbar reads "Total Results 48 customers" with All prices, All products and All regions selects and a Search field; the table shows 8 rows with two selected and a pagination footer. Clicking "Customer name" sorts A to Z and turns the chevron, clicking again sorts Z to A. Choosing "Over $1,000" or typing a name narrows the count, returns to page 1 and keeps the selection on the same customers. The header checkbox selects or clears the current page and shows indeterminate when only some rows are selected. Hovering Edit shows its tooltip; the More button opens View profile, Duplicate row, Download invoice and Archive customer. Compact tightens every row smoothly.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
