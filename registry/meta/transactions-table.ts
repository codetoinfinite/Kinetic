/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Transactions Table" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'transactions-table',
  title: 'Transactions Table',
  category: 'display',
  kit: 'boardui',
  tags: ['table', 'finance', 'dashboard', 'sorting', 'pagination', 'boardui'],
  blurb: 'A finance transactions table with sortable headers, category and status pills, signed currency amounts, search and pagination.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/transactions-table.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@internationalized/date@^3.12.4', '@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A bordered card holding a toolbar (result count, status filter, search), the kit Table and the kit Pagination. Each row shows a category icon tile and merchant, the account with a status dot, a coloured category chip, the date, a status pill with a dot, and a signed amount chip that turns lime for money in. Sorting runs through React Aria\'s sortDescriptor, so headers carry aria-sort and sort from the keyboard too.',

  mechanism: [
    'Hold the sort as a React Aria `SortDescriptor` (controlled through `sortDescriptor`/`onSortChange`, otherwise local state seeded with newest date first) and pass it to the kit `Table`; columns with `allowsSorting` toggle it on click or Enter and get `aria-sort` for free.',
    'Derive the rows with `sortTransactions`: filter by status, then by a case-insensitive query on merchant and category label, then sort with a per-column comparator (ISO date strings compare chronologically, statuses by workflow rank) times -1 for descending, falling back to the id so ties keep a stable order.',
    'Slice the sorted rows into pages of `pageSize`; clamp the stored page to the page count instead of resetting it in an effect, and send every sort, filter or search change back to page 1.',
    'Format amounts once per locale with `Intl.NumberFormat(locale, { style: "currency", currency, signDisplay: "exceptZero" })`, so money in reads "+$6,200.00" and money out "-$135.42"; dates go through `parseDate(iso).toDate("UTC")` and a UTC `Intl.DateTimeFormat`, so server and client print the same day.',
    'Render the header sort chevron from the column render prop: tertiary and faded when unsorted, secondary when active, rotated 180 degrees for ascending. The table sits in the kit Table\'s `overflow-x-auto` wrapper with a 760px minimum width, so narrow screens scroll the table and not the page.',
  ],

  constants: [
    { name: 'pageSize', value: '6 (demo uses 5)', why: 'Six 52px rows plus toolbar, header and pager keep the card under one dashboard fold.' },
    { name: 'table min width', value: '760px', why: 'Below this the six columns start wrapping; the kit Table wrapper scrolls horizontally instead.' },
    { name: 'default sort', value: '{ column: "date", direction: "descending" }', why: 'A ledger reads newest first.' },
    { name: 'status rank', value: 'completed 0, pending 1, failed 2', why: 'Status sorts by workflow order rather than alphabetically.' },
  ],

  pitfalls: [
    'Do not format dates with a local-time Date. A YYYY-MM-DD string parsed in local time can land on the previous day west of UTC and mismatch server output during hydration; format in UTC.',
    'Keep the tie-breaker on the id. Array.prototype.sort is stable, but rows that compare equal would otherwise depend on the input order and shuffle between pages after a filter.',
    'React Aria collection components (Column, Row, Cell) cannot be wrapped in custom components; the sort label is rendered through the Column render prop instead.',
  ],

  notes: [
    'Failed transactions keep their amount but strike it through at 60% opacity, so they read as not counted.',
    'Set `showToolbar={false}` to drop the status filter and search when the table sits under an external filter bar.',
    '`sortTransactions` is exported for server-side or test use with the same ordering.',
  ],

  apiSignature:
    'type Transaction = { id: string; name: string; category: TransactionCategory; account: "checking" | "savings" | "credit"; date: string; amount: number; status: "completed" | "pending" | "failed" }\nfunction TransactionsTable(props: TransactionsTableProps): JSX.Element\nfunction sortTransactions(rows: Transaction[], sort: SortDescriptor, status?: TransactionStatus | "all", query?: string): Transaction[]',

  props: [
    { name: 'transactions', type: 'Transaction[]', description: 'All rows; filtering, sorting and paging happen inside.' },
    { name: 'pageSize', type: 'number', default: '6', description: 'Rows per page.' },
    { name: 'sortDescriptor / defaultSortDescriptor / onSortChange', type: 'SortDescriptor', default: '{ column: "date", direction: "descending" }', description: 'Sort state, controlled or uncontrolled. Columns: name, category, date, status, amount.' },
    { name: 'onPageChange', type: '(page: number) => void', description: 'Fires with the 1-based page on every page change, including resets to page 1.' },
    { name: 'showToolbar', type: 'boolean', default: 'true', description: 'Shows the status filter and the search field.' },
    { name: 'currency', type: 'string', default: '"USD"', description: 'ISO 4217 code for the amount column.' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Locale for amounts, dates and the result count.' },
    { name: 'label', type: 'string', default: '"Transactions"', description: 'Accessible name of the card and the table.' },
    { name: 'className', type: 'string', description: 'Merged onto the card.' },
  ],

  reducedMotion:
    'The only motion is the 150ms rotation of the sort chevron and the row hover colour; the chevron carries `motion-reduce:transition-none`, so it flips instantly under `prefers-reduced-motion: reduce`.',

  cleanup: 'The component adds no timers or listeners of its own. The kit Pagination disconnects its ResizeObserver on unmount, and the Select popover is closed by React Aria.',

  acceptance:
    'With the demo data the card reads "18 transactions" and rows are newest first. Clicking "Amount" sorts ascending (largest outflow first) and a second click flips to descending with "+$6,200.00" on top; the header gets aria-sort. Choosing "Failed" in the status filter shows 2 rows and hides the pager; typing "sub" in the search shows only subscription rows. Positive amounts are lime chips with a plus sign, negative ones grey with a minus. At 360px wide the table scrolls horizontally inside the card while the page does not. Light and dark both read correctly.',

  criticalRegion: 'critical',
};

export default meta;
