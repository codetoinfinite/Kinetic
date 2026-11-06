# Build: Transactions Table

A bordered card holding a toolbar (result count, status filter, search), the kit Table and the kit Pagination. Each row shows a category icon tile and merchant, the account with a status dot, a coloured category chip, the date, a status pill with a dot, and a signed amount chip that turns lime for money in. Sorting runs through React Aria's sortDescriptor, so headers carry aria-sort and sort from the keyboard too.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A finance transactions table with sortable headers, category and status pills, signed currency amounts, search and pagination.

- Category: display
- Runtime cost: dom
- Dependencies: @internationalized/date@^3.12.4, @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. Hold the sort as a React Aria `SortDescriptor` (controlled through `sortDescriptor`/`onSortChange`, otherwise local state seeded with newest date first) and pass it to the kit `Table`; columns with `allowsSorting` toggle it on click or Enter and get `aria-sort` for free.
2. Derive the rows with `sortTransactions`: filter by status, then by a case-insensitive query on merchant and category label, then sort with a per-column comparator (ISO date strings compare chronologically, statuses by workflow rank) times -1 for descending, falling back to the id so ties keep a stable order.
3. Slice the sorted rows into pages of `pageSize`; clamp the stored page to the page count instead of resetting it in an effect, and send every sort, filter or search change back to page 1.
4. Format amounts once per locale with `Intl.NumberFormat(locale, { style: "currency", currency, signDisplay: "exceptZero" })`, so money in reads "+$6,200.00" and money out "-$135.42"; dates go through `parseDate(iso).toDate("UTC")` and a UTC `Intl.DateTimeFormat`, so server and client print the same day.
5. Render the header sort chevron from the column render prop: tertiary and faded when unsorted, secondary when active, rotated 180 degrees for ascending. The table sits in the kit Table's `overflow-x-auto` wrapper with a 760px minimum width, so narrow screens scroll the table and not the page.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `pageSize = 6 (demo uses 5)`
  Six 52px rows plus toolbar, header and pager keep the card under one dashboard fold.
- `table min width = 760px`
  Below this the six columns start wrapping; the kit Table wrapper scrolls horizontally instead.
- `default sort = { column: "date", direction: "descending" }`
  A ledger reads newest first.
- `status rank = completed 0, pending 1, failed 2`
  Status sorts by workflow order rather than alphabetically.

## API

```ts
type Transaction = { id: string; name: string; category: TransactionCategory; account: "checking" | "savings" | "credit"; date: string; amount: number; status: "completed" | "pending" | "failed" }
function TransactionsTable(props: TransactionsTableProps): JSX.Element
function sortTransactions(rows: Transaction[], sort: SortDescriptor, status?: TransactionStatus | "all", query?: string): Transaction[]
```

- `transactions: Transaction[]`
  All rows; filtering, sorting and paging happen inside.
- `pageSize: number` — default `6`
  Rows per page.
- `sortDescriptor / defaultSortDescriptor / onSortChange: SortDescriptor` — default `{ column: "date", direction: "descending" }`
  Sort state, controlled or uncontrolled. Columns: name, category, date, status, amount.
- `onPageChange: (page: number) => void`
  Fires with the 1-based page on every page change, including resets to page 1.
- `showToolbar: boolean` — default `true`
  Shows the status filter and the search field.
- `currency: string` — default `"USD"`
  ISO 4217 code for the amount column.
- `locale: string` — default `"en-US"`
  Locale for amounts, dates and the result count.
- `label: string` — default `"Transactions"`
  Accessible name of the card and the table.
- `className: string`
  Merged onto the card.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Comparator per sortable column. Dates are ISO strings, so a plain string
 *  compare is chronological; statuses sort by workflow rank, not by label. */
function compare(a: Transaction, b: Transaction, column: Key): number {
  switch (column) {
    case "name":
      return a.name.localeCompare(b.name);
    case "category":
      return CATEGORY[a.category].label.localeCompare(CATEGORY[b.category].label);
    case "date":
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    case "status":
      return STATUS[a.status].rank - STATUS[b.status].rank;
    case "amount":
      return a.amount - b.amount;
    default:
      return 0;
  }
}

/** Filter by status and query, then sort. Ties fall back to the id so the
 *  order (and therefore each page) is stable between renders. */
export function sortTransactions(
  rows: Transaction[],
  sort: SortDescriptor,
  status: TransactionStatus | "all" = "all",
  query = "",
): Transaction[] {
  const q = query.trim().toLowerCase();
  const sign = sort.direction === "descending" ? -1 : 1;
  return rows
    .filter((t) => status === "all" || t.status === status)
    .filter((t) => !q || t.name.toLowerCase().includes(q) || CATEGORY[t.category].label.toLowerCase().includes(q))
    .sort((a, b) => sign * compare(a, b, sort.column) || a.id.localeCompare(b.id));
}

export function TransactionsTable({
  transactions,
  pageSize = 6,
  sortDescriptor,
  defaultSortDescriptor = DEFAULT_SORT,
  onSortChange,
  onPageChange,
  showToolbar = true,
  currency = "USD",
  locale = "en-US",
  label = "Transactions",
  className,
}: TransactionsTableProps) {
  const [localSort, setLocalSort] = useState<SortDescriptor>(defaultSortDescriptor);
  const sort = sortDescriptor ?? localSort;
  const [status, setStatus] = useState<TransactionStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [rawPage, setRawPage] = useState(1);

  const money = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency, signDisplay: "exceptZero" }),
    [locale, currency],
  );
  const day = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }),
    [locale],
  );

  const rows = useMemo(
    () => sortTransactions(transactions, sort, status, query),
    [transactions, sort, status, query],
  );
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  // Clamp rather than store: a filter that shrinks the list never strands
  // the table on an empty page.
  const page = Math.min(rawPage, totalPages);
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);

  const goTo = (next: number) => {
    setRawPage(next);
    onPageChange?.(next);
  };
  const handleSort = (next: SortDescriptor) => {
    if (sortDescriptor === undefined) setLocalSort(next);
    onSortChange?.(next);
    goTo(1);
  };
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The component adds no timers or listeners of its own. The kit Pagination disconnects its ResizeObserver on unmount, and the Select popover is closed by React Aria.

**Reduced motion.** The only motion is the 150ms rotation of the sort chevron and the row hover colour; the chevron carries `motion-reduce:transition-none`, so it flips instantly under `prefers-reduced-motion: reduce`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not format dates with a local-time Date. A YYYY-MM-DD string parsed in local time can land on the previous day west of UTC and mismatch server output during hydration; format in UTC.
- Keep the tie-breaker on the id. Array.prototype.sort is stable, but rows that compare equal would otherwise depend on the input order and shuffle between pages after a filter.
- React Aria collection components (Column, Row, Cell) cannot be wrapped in custom components; the sort label is rendered through the Column render prop instead.

## Notes

- Failed transactions keep their amount but strike it through at 60% opacity, so they read as not counted.
- Set `showToolbar={false}` to drop the status filter and search when the table sits under an external filter bar.
- `sortTransactions` is exported for server-side or test use with the same ordering.

## Definition of done

With the demo data the card reads "18 transactions" and rows are newest first. Clicking "Amount" sorts ascending (largest outflow first) and a second click flips to descending with "+$6,200.00" on top; the header gets aria-sort. Choosing "Failed" in the status filter shows 2 rows and hides the pager; typing "sub" in the search shows only subscription rows. Positive amounts are lime chips with a plus sign, negative ones grey with a minus. At 360px wide the table scrolls horizontally inside the card while the page does not. Light and dark both read correctly.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
