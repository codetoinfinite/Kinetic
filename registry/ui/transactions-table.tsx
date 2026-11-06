/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Transactions Table" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */
"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { parseDate } from "@internationalized/date";
import type { Key, SortDescriptor } from "react-aria-components";
import {
  RiCarLine,
  RiHandCoinLine,
  RiHeartPulseLine,
  RiHome4Line,
  RiLightbulbLine,
  RiPlaneLine,
  RiRepeatLine,
  RiRestaurantLine,
  RiShoppingBag3Line,
  RiStockLine,
} from "@remixicon/react";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@/registry/ui/table";
import { Pagination } from "@/registry/ui/pagination";
import { Chip } from "@/registry/ui/chip";
import type { ChipColor } from "@/registry/ui/chip";
import { StatusDot } from "@/registry/ui/status-dot";
import { SearchField } from "@/registry/ui/search-field";
import { Select, SelectItem } from "@/registry/ui/select";
import { ChevronSortDown } from "@/registry/lib/chevrons";
import { cx } from "@/registry/lib/cx";

export type TransactionStatus = "completed" | "pending" | "failed";
export type TransactionAccount = "checking" | "savings" | "credit";
export type TransactionCategory =
  | "housing"
  | "groceries"
  | "transport"
  | "dining"
  | "subscriptions"
  | "utilities"
  | "travel"
  | "health"
  | "income"
  | "investing";

export type Transaction = {
  id: string;
  /** Merchant or payer. */
  name: string;
  category: TransactionCategory;
  account: TransactionAccount;
  /** ISO calendar date, YYYY-MM-DD. */
  date: string;
  /** Signed amount in major units: negative is money out, positive is money in. */
  amount: number;
  status: TransactionStatus;
};

export type TransactionSortColumn = "name" | "category" | "date" | "status" | "amount";

export interface TransactionsTableProps {
  transactions: Transaction[];
  /** Rows per page. Default 6. */
  pageSize?: number;
  /** Current sort. Controlled when defined. */
  sortDescriptor?: SortDescriptor;
  /** Initial sort when uncontrolled. Default newest date first. */
  defaultSortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
  /** Called with the 1-based page whenever the page changes. */
  onPageChange?: (page: number) => void;
  /** Show the status filter and the search field. Default true. */
  showToolbar?: boolean;
  /** ISO 4217 code used for the amount column. Default "USD". */
  currency?: string;
  /** Locale for amounts and dates. Default "en-US". */
  locale?: string;
  /** Accessible name of the table and the card. Default "Transactions". */
  label?: string;
  className?: string;
}

type CategoryStyle = { label: string; chip: ChipColor; icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }> };

const CATEGORY: Record<TransactionCategory, CategoryStyle> = {
  housing: { label: "Housing", chip: "orange", icon: RiHome4Line },
  groceries: { label: "Groceries", chip: "lime", icon: RiShoppingBag3Line },
  transport: { label: "Transport", chip: "cyan", icon: RiCarLine },
  dining: { label: "Dining", chip: "rose", icon: RiRestaurantLine },
  subscriptions: { label: "Subscriptions", chip: "purple", icon: RiRepeatLine },
  utilities: { label: "Utilities", chip: "neutral", icon: RiLightbulbLine },
  travel: { label: "Travel", chip: "blue", icon: RiPlaneLine },
  health: { label: "Health", chip: "yellow", icon: RiHeartPulseLine },
  income: { label: "Income", chip: "lime", icon: RiHandCoinLine },
  investing: { label: "Investing", chip: "blue", icon: RiStockLine },
};

const ACCOUNT: Record<TransactionAccount, { label: string; dot: "green" | "indigo" | "yellow" }> = {
  checking: { label: "Checking", dot: "green" },
  savings: { label: "Savings", dot: "indigo" },
  credit: { label: "Credit card", dot: "yellow" },
};

const STATUS: Record<TransactionStatus, { label: string; chip: ChipColor; rank: number }> = {
  completed: { label: "Completed", chip: "lime", rank: 0 },
  pending: { label: "Pending", chip: "yellow", rank: 1 },
  failed: { label: "Failed", chip: "rose", rank: 2 },
};

type ColumnDef = { id: TransactionSortColumn | "account"; label: string; sortable: boolean; className?: string };

const COLUMNS: ColumnDef[] = [
  { id: "name", label: "Transaction", sortable: true, className: "w-[30%]" },
  { id: "account", label: "Account", sortable: false },
  { id: "category", label: "Category", sortable: true },
  { id: "date", label: "Date", sortable: true },
  { id: "status", label: "Status", sortable: true },
  { id: "amount", label: "Amount", sortable: true, className: "text-end" },
];

const DEFAULT_SORT: SortDescriptor = { column: "date", direction: "descending" };

// #region critical
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
// #endregion

  return (
    <section
      aria-label={label}
      className={cx(
        "flex w-full min-w-0 flex-col rounded-2xl border border-border-table bg-background-primary-default pt-2",
        totalPages > 1 ? "pb-3" : "pb-0",
        className,
      )}
    >
      <div className="flex flex-col gap-3 px-3 py-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col">
          <p className="text-body-medium text-text-tertiary">Total Results</p>
          <p className="text-body-medium text-text-primary tabular-nums" aria-live="polite">
            {rows.length.toLocaleString(locale)} {rows.length === 1 ? "transaction" : "transactions"}
          </p>
        </div>
        {showToolbar && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Select
              aria-label="Filter by status"
              className="shrink-0"
              popoverClassName="min-w-40"
              selectedKey={status}
              onSelectionChange={(k) => {
                setStatus(String(k) as TransactionStatus | "all");
                goTo(1);
              }}
            >
              <SelectItem id="all" textValue="All statuses">All statuses</SelectItem>
              {(Object.keys(STATUS) as TransactionStatus[]).map((s) => (
                <SelectItem key={s} id={s} textValue={STATUS[s].label}>
                  {STATUS[s].label}
                </SelectItem>
              ))}
            </Select>
            <SearchField
              aria-label="Search transactions"
              placeholder="Search"
              value={query}
              onChange={(v) => {
                setQuery(v);
                goTo(1);
              }}
              className="min-w-0 flex-1 sm:w-48 sm:flex-none"
              fieldClassName="bg-background-secondary-default"
            />
          </div>
        )}
      </div>

      <div className="mt-2">
        <Table
          aria-label={label}
          sortDescriptor={sort}
          onSortChange={handleSort}
          className="min-w-[760px]"
        >
          <TableHeader>
            {COLUMNS.map((c) => (
              <TableColumn
                key={c.id}
                id={c.id}
                isRowHeader={c.id === "name"}
                allowsSorting={c.sortable}
                className={cx(
                  c.className,
                  c.sortable && "cursor-pointer",
                  "data-[focus-visible]:ring-2 data-[focus-visible]:ring-inset data-[focus-visible]:ring-border-focus-ring",
                )}
              >
                {({ sortDirection }) =>
                  c.sortable ? (
                    <span className={cx("flex items-center gap-0.5", c.id === "amount" && "flex-row-reverse")}>
                      <span className={cx(sortDirection && "text-text-secondary")}>{c.label}</span>
                      <ChevronSortDown
                        className={cx(
                          "size-5 shrink-0 transition-[transform,color] duration-150 ease-out motion-reduce:transition-none",
                          sortDirection === "ascending" && "rotate-180",
                          sortDirection ? "text-text-secondary" : "text-text-tertiary opacity-60",
                        )}
                      />
                    </span>
                  ) : (
                    c.label
                  )
                }
              </TableColumn>
            ))}
          </TableHeader>
          <TableBody
            renderEmptyState={() => (
              <div className="flex h-32 items-center justify-center text-body-medium text-text-tertiary">
                No transactions match your filters.
              </div>
            )}
          >
            {visible.map((t) => {
              const cat = CATEGORY[t.category];
              const Icon = cat.icon;
              return (
                <TableRow key={t.id} id={t.id} className="hover:bg-background-secondary-default">
                  <TableCell>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-secondary-default text-foreground-icon-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="truncate">{t.name}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <StatusDot color={ACCOUNT[t.account].dot} aria-hidden />
                      {ACCOUNT[t.account].label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Chip color={cat.chip}>{cat.label}</Chip>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    <time dateTime={t.date}>{day.format(parseDate(t.date).toDate("UTC"))}</time>
                  </TableCell>
                  <TableCell>
                    <Chip variant="subtle" color={STATUS[t.status].chip} className="gap-1.5">
                      <span aria-hidden className="size-1.5 rounded-full bg-current" />
                      {STATUS[t.status].label}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-end">
                    <Chip
                      color={t.amount > 0 ? "lime" : "gray"}
                      className={cx("tabular-nums", t.status === "failed" && "line-through opacity-60")}
                    >
                      {money.format(t.amount)}
                    </Chip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="border-t border-separator-border px-3 pt-3">
          <Pagination page={page} totalPages={totalPages} onChange={goTo} aria-label={`${label} pages`} />
        </div>
      )}
    </section>
  );
}
