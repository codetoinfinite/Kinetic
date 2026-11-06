/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Home Dashboard" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
'use client';

import { useMemo, useRef, useState } from 'react';
import type { Key } from 'react';
import type { SortDescriptor } from 'react-aria-components';
import { parseDate } from '@internationalized/date';
import { RiUserLine } from '@remixicon/react';
import { Avatar } from '@/registry/ui/avatar';
import { Button } from '@/registry/ui/button';
import { Checkbox } from '@/registry/ui/checkbox';
import { Chip } from '@/registry/ui/chip';
import type { ChipColor } from '@/registry/ui/chip';
import { Input } from '@/registry/ui/input';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/registry/ui/modal';
import { Pagination } from '@/registry/ui/pagination';
import { RowActions } from '@/registry/ui/row-actions';
import { SearchField } from '@/registry/ui/search-field';
import { Select, SelectItem } from '@/registry/ui/select';
import { StatusDot } from '@/registry/ui/status-dot';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/registry/ui/table';
import { toast } from '@/registry/ui/toast';
import { ChevronSortDown } from '@/registry/lib/chevrons';
import { cx } from '@/registry/lib/cx';

/**
 * The customers table at the foot of the home dashboard: three filters and
 * a search, sortable name / date / price columns, page-wide selection with
 * a bulk delete, an editable purchase status per row, and working row
 * actions (edit in a modal, duplicate, delete behind a confirmation).
 */

export type PurchaseStatus = 'completed' | 'waiting' | 'processing';
export type DeliveryStatus = 'failed' | 'shipped' | 'waiting' | 'confirmed';

export interface Customer {
  id: string;
  name: string;
  initials: string;
  avatarColor?: 'neutral' | 'blue' | 'lime' | 'pink';
  purchase: PurchaseStatus;
  delivery: DeliveryStatus;
  product: string;
  region: string;
  /** ISO date, e.g. "2026-09-05". */
  updated: string;
  /** Whole dollars. */
  price: number;
}

const PURCHASE: Record<PurchaseStatus, { label: string; dot: 'green' | 'yellow' | 'indigo' }> = {
  completed: { label: 'Completed', dot: 'green' },
  waiting: { label: 'Waiting', dot: 'yellow' },
  processing: { label: 'Processing', dot: 'indigo' },
};

const DELIVERY: Record<DeliveryStatus, { label: string; chip: ChipColor }> = {
  failed: { label: 'Delivery failed', chip: 'rose' },
  shipped: { label: 'Shipped', chip: 'lime' },
  waiting: { label: 'Delivery waiting', chip: 'yellow' },
  confirmed: { label: 'Confirmed', chip: 'cyan' },
};

const PRODUCTS = ['Starter plan', 'Team plan', 'Enterprise', 'Add-on seats'] as const;
const REGIONS = ['Europe', 'North America', 'Asia Pacific'] as const;

const PRICE_BUCKETS: readonly { id: string; label: string; test: (price: number) => boolean }[] = [
  { id: 'all', label: 'All prices', test: () => true },
  { id: 'under-1k', label: 'Under $1,000', test: (p) => p < 1000 },
  { id: '1k-3k', label: '$1,000 to $3,000', test: (p) => p >= 1000 && p <= 3000 },
  { id: 'over-3k', label: 'Over $3,000', test: (p) => p > 3000 },
];

type Row = [string, PurchaseStatus, DeliveryStatus, string, number, number, number, Customer['avatarColor']?];

// name, purchase, delivery, updated, price, product index, region index, avatar tint
const ROWS: Row[] = [
  ['John Clarkson', 'waiting', 'failed', '2026-09-05', 3412, 2, 0, 'blue'],
  ['Aspen Lubin', 'waiting', 'failed', '2026-03-25', 1899, 1, 1, 'pink'],
  ['Michael Ekstrom', 'completed', 'shipped', '2026-08-01', 2752, 1, 0],
  ['Kianna Vaccaro', 'completed', 'shipped', '2026-04-02', 145, 3, 2, 'lime'],
  ['Livia Saris', 'processing', 'failed', '2026-11-14', 708, 0, 1, 'pink'],
  ['Jaydon Aminoff', 'processing', 'waiting', '2026-07-17', 224, 3, 1],
  ['Maria Lubin', 'completed', 'shipped', '2026-11-15', 2959, 1, 2, 'lime'],
  ['Ann Press', 'processing', 'waiting', '2026-09-20', 2646, 2, 0, 'blue'],
  ['Zaire Torff', 'completed', 'confirmed', '2026-02-04', 3770, 2, 1, 'blue'],
  ['Gretchen Septimus', 'completed', 'shipped', '2026-04-20', 3740, 2, 2, 'blue'],
  ['Omar Vetrovs', 'waiting', 'failed', '2026-07-10', 1747, 1, 0],
  ['Talan Calzoni', 'completed', 'confirmed', '2026-11-13', 3976, 2, 1],
  ['Cristofer Dorwart', 'processing', 'confirmed', '2026-06-08', 860, 0, 2, 'lime'],
  ['Hanna Geidt', 'completed', 'shipped', '2026-05-29', 1320, 1, 0, 'pink'],
  ['Ruben Herwitz', 'waiting', 'waiting', '2026-10-02', 512, 3, 1],
  ['Lydia Bergson', 'completed', 'confirmed', '2026-01-18', 4210, 2, 0, 'blue'],
  ['Desirae Kenter', 'processing', 'shipped', '2026-08-23', 2380, 1, 2],
  ['Jakob Dokidis', 'completed', 'shipped', '2026-03-11', 960, 0, 1, 'lime'],
  ['Mira Workman', 'waiting', 'failed', '2026-10-27', 3115, 2, 2, 'pink'],
  ['Corey Rosser', 'completed', 'confirmed', '2026-06-30', 1475, 1, 1],
  ['Skylar Culhane', 'processing', 'waiting', '2026-02-21', 399, 3, 0],
  ['Nolan Siphron', 'completed', 'shipped', '2026-09-12', 2210, 1, 1, 'blue'],
];

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export const HOME_CUSTOMERS: readonly Customer[] = ROWS.map(([name, purchase, delivery, updated, price, product, region, tint], i) => ({
  id: `c${i + 1}`,
  name,
  initials: initialsOf(name),
  avatarColor: tint ?? 'neutral',
  purchase,
  delivery,
  updated,
  price,
  product: PRODUCTS[product] ?? PRODUCTS[0],
  region: REGIONS[region] ?? REGIONS[0],
}));

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' });

function compare(a: Customer, b: Customer, column: Key): number {
  if (column === 'price') return a.price - b.price;
  if (column === 'updated') return a.updated.localeCompare(b.updated);
  return a.name.localeCompare(b.name);
}

const COLUMNS = [
  { id: 'name', label: 'Customer name', sortable: true, className: 'w-[230px]' },
  { id: 'purchase', label: 'Purchase', sortable: false, className: 'w-[176px]' },
  { id: 'delivery', label: 'Status', sortable: false, className: 'w-[176px]' },
  { id: 'updated', label: 'Last updated', sortable: true, className: 'w-[150px]' },
  { id: 'price', label: 'Price', sortable: true, className: 'w-[120px]' },
  { id: 'actions', label: 'Actions', sortable: false, className: 'w-[140px] text-end' },
] as const;

export interface HomeCustomersTableProps {
  /** Controlled rows. Pair with onCustomersChange. */
  customers?: readonly Customer[];
  /** Initial rows when uncontrolled. Default HOME_CUSTOMERS. */
  defaultCustomers?: readonly Customer[];
  onCustomersChange?: (customers: Customer[]) => void;
  /** Rows per page. Default 8. */
  pageSize?: number;
  label?: string;
  className?: string;
}

// #region critical
export function HomeCustomersTable({
  customers,
  defaultCustomers = HOME_CUSTOMERS,
  onCustomersChange,
  pageSize = 8,
  label = 'Customers',
  className,
}: HomeCustomersTableProps) {
  const [inner, setInner] = useState<readonly Customer[]>(defaultCustomers);
  const rows = customers ?? inner;
  const commit = (next: Customer[]) => {
    if (customers === undefined) setInner(next);
    onCustomersChange?.(next);
  };

  const [price, setPrice] = useState('all');
  const [product, setProduct] = useState('all');
  const [region, setRegion] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortDescriptor | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [editing, setEditing] = useState<Customer | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const copies = useRef(0);

  const filtered = useMemo(() => {
    const bucket = PRICE_BUCKETS.find((b) => b.id === price) ?? PRICE_BUCKETS[0];
    const q = query.trim().toLocaleLowerCase();
    const out = rows.filter(
      (c) =>
        (bucket ? bucket.test(c.price) : true) &&
        (product === 'all' || c.product === product) &&
        (region === 'all' || c.region === region) &&
        (q === '' || c.name.toLocaleLowerCase().includes(q)),
    );
    if (sort?.column != null) {
      const dir = sort.direction === 'descending' ? -1 : 1;
      out.sort((a, b) => compare(a, b, sort.column) * dir);
    }
    return out;
  }, [rows, price, product, region, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);
  const pageIds = visible.map((c) => c.id);
  const pageSelected = pageIds.filter((id) => selected.has(id)).length;

  const update = (id: string, patch: Partial<Customer>) => commit(rows.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (ids: ReadonlySet<string>) => {
    commit(rows.filter((c) => !ids.has(c.id)));
    setSelected((prev) => new Set([...prev].filter((id) => !ids.has(id))));
  };
  const duplicate = (customer: Customer) => {
    copies.current += 1;
    const copy: Customer = { ...customer, id: `${customer.id}-copy-${copies.current}`, name: `${customer.name} (copy)` };
    const at = rows.findIndex((c) => c.id === customer.id);
    commit([...rows.slice(0, at + 1), copy, ...rows.slice(at + 1)]);
    toast(`${customer.name} duplicated`, { status: 'success' });
  };
  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const togglePage = (on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  const filterTo = (setter: (value: string) => void) => (key: Key | null) => {
    setter(String(key ?? 'all'));
    setPage(1);
  };
  // #endregion

  return (
    <section
      aria-label={label}
      className={cx('flex w-full min-w-0 flex-col rounded-2xl border border-border-table pt-2', totalPages > 1 ? 'pb-3' : 'pb-0', className)}
    >
      <div className="flex flex-col gap-3 px-3 py-1 xl:flex-row xl:items-center xl:justify-between">
        {selected.size > 0 ? (
          <div className="flex items-center gap-3" role="status">
            <p className="text-body-medium text-text-primary tabular-nums">{selected.size} selected</p>
            <Button
              variant="danger"
              size="small"
              onClick={() => {
                const count = selected.size;
                remove(selected);
                toast(`${count} ${count === 1 ? 'customer' : 'customers'} deleted`);
              }}
            >
              Delete selected
            </Button>
            <Button variant="ghost" size="small" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        ) : (
          <div className="flex flex-col">
            <p className="text-body-medium text-text-tertiary">Total Results</p>
            <p className="text-body-medium text-text-primary tabular-nums" aria-live="polite">
              {filtered.length.toLocaleString('en-US')} {filtered.length === 1 ? 'customer' : 'customers'}
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <Select aria-label="Filter by price" className="shrink-0" popoverClassName="min-w-44" selectedKey={price} onSelectionChange={filterTo(setPrice)}>
            {PRICE_BUCKETS.map((b) => (
              <SelectItem key={b.id} id={b.id} textValue={b.label}>
                {b.label}
              </SelectItem>
            ))}
          </Select>
          <Select aria-label="Filter by product" className="shrink-0" popoverClassName="min-w-40" selectedKey={product} onSelectionChange={filterTo(setProduct)}>
            {['all', ...PRODUCTS].map((p) => (
              <SelectItem key={p} id={p} textValue={p === 'all' ? 'All products' : p}>
                {p === 'all' ? 'All products' : p}
              </SelectItem>
            ))}
          </Select>
          <Select aria-label="Filter by region" className="shrink-0" popoverClassName="min-w-40" selectedKey={region} onSelectionChange={filterTo(setRegion)}>
            {['all', ...REGIONS].map((r) => (
              <SelectItem key={r} id={r} textValue={r === 'all' ? 'All regions' : r}>
                {r === 'all' ? 'All regions' : r}
              </SelectItem>
            ))}
          </Select>
          <SearchField
            aria-label="Search customers"
            placeholder="Search"
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            className="min-w-0 flex-1 sm:w-40 sm:flex-none"
            fieldClassName="bg-background-secondary-default"
          />
        </div>
      </div>

      <div className="mt-2">
        <Table aria-label={label} sortDescriptor={sort} onSortChange={setSort} className="min-w-[1000px]">
          <TableHeader>
            {COLUMNS.map((c) => (
              <TableColumn
                key={c.id}
                id={c.id}
                isRowHeader={c.id === 'name'}
                allowsSorting={c.sortable}
                className={cx(
                  c.className,
                  c.sortable && 'cursor-pointer',
                  'data-[focus-visible]:ring-2 data-[focus-visible]:ring-inset data-[focus-visible]:ring-border-focus-ring',
                )}
              >
                {({ sortDirection }) => (
                  <span className={cx('flex items-center gap-2', c.id === 'actions' && 'justify-end')}>
                    {c.id === 'name' ? (
                      <Checkbox
                        slot={null}
                        aria-label="Select all customers on this page"
                        isSelected={pageIds.length > 0 && pageSelected === pageIds.length}
                        isIndeterminate={pageSelected > 0 && pageSelected < pageIds.length}
                        onChange={togglePage}
                      />
                    ) : null}
                    <span className="flex items-center gap-0.5">
                      <span className={cx(sortDirection && 'text-text-secondary')}>{c.label}</span>
                      {c.sortable ? (
                        <ChevronSortDown
                          className={cx(
                            'size-5 shrink-0 transition-[transform,color] duration-150 ease-out motion-reduce:transition-none',
                            sortDirection === 'ascending' && 'rotate-180',
                            sortDirection ? 'text-text-secondary' : 'text-text-tertiary opacity-60',
                          )}
                        />
                      ) : null}
                    </span>
                  </span>
                )}
              </TableColumn>
            ))}
          </TableHeader>
          <TableBody
            renderEmptyState={() => (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-body-medium text-text-tertiary">
                <RiUserLine aria-hidden className="size-5" />
                No customers match your filters.
              </div>
            )}
          >
            {visible.map((c) => (
              <TableRow key={c.id} id={c.id} className="hover:bg-background-secondary-default">
                <TableCell>
                  <span className="flex min-w-0 items-center gap-2">
                    <Checkbox slot={null} aria-label={`Select ${c.name}`} isSelected={selected.has(c.id)} onChange={(on) => toggle(c.id, on)} />
                    <Avatar size="sm" color={c.avatarColor} initials={c.initials} aria-hidden />
                    <span className="truncate text-body-medium text-text-primary">{c.name}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <Select
                    aria-label={`Purchase status for ${c.name}`}
                    size="sm"
                    className="w-[142px]"
                    selectedKey={c.purchase}
                    onSelectionChange={(key) => {
                      if (key != null) update(c.id, { purchase: String(key) as PurchaseStatus });
                    }}
                  >
                    {(Object.keys(PURCHASE) as PurchaseStatus[]).map((p) => (
                      <SelectItem key={p} id={p} textValue={PURCHASE[p].label}>
                        <StatusDot color={PURCHASE[p].dot} />
                        {PURCHASE[p].label}
                      </SelectItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Chip color={DELIVERY[c.delivery].chip}>{DELIVERY[c.delivery].label}</Chip>
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  <time dateTime={c.updated}>{day.format(parseDate(c.updated).toDate('UTC'))}</time>
                </TableCell>
                <TableCell>
                  <Chip color="gray" className="tabular-nums">
                    {money.format(c.price)}
                  </Chip>
                </TableCell>
                <TableCell>
                  <RowActions
                    name={c.name}
                    inline
                    className="justify-end"
                    onEdit={() => {
                      setEditing(c);
                      setEditOpen(true);
                    }}
                    onDuplicate={() => duplicate(c)}
                    onDelete={() => {
                      remove(new Set([c.id]));
                      toast(`${c.name} deleted`);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="border-t border-separator-border px-3 pt-3">
          <Pagination page={current} totalPages={totalPages} onChange={setPage} aria-label={`${label} pages`} />
        </div>
      ) : null}

      <Modal isOpen={editOpen} onOpenChange={setEditOpen} size="sm">
        {editing ? (
          <EditCustomerForm
            key={editing.id}
            customer={editing}
            onCancel={() => setEditOpen(false)}
            onSave={(patch) => {
              update(editing.id, patch);
              toast(`${patch.name ?? editing.name} updated`, { status: 'success' });
              setEditOpen(false);
            }}
          />
        ) : (
          <span />
        )}
      </Modal>
    </section>
  );
}

function EditCustomerForm({
  customer,
  onCancel,
  onSave,
}: {
  customer: Customer;
  onCancel: () => void;
  onSave: (patch: Partial<Customer>) => void;
}) {
  const [name, setName] = useState(customer.name);
  const [price, setPrice] = useState(String(customer.price));
  const [delivery, setDelivery] = useState<DeliveryStatus>(customer.delivery);
  const priceValue = Number(price);
  const valid = name.trim().length > 0 && Number.isFinite(priceValue) && priceValue >= 0;

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        const trimmed = name.trim();
        onSave({ name: trimmed, initials: initialsOf(trimmed), price: Math.round(priceValue), delivery });
      }}
    >
      <ModalHeader title="Edit customer" description="Changes apply to this row straight away." />
      <ModalBody className="flex flex-col gap-4">
        <Input label="Customer name" value={name} onChange={setName} isRequired autoFocus />
        <Input
          label="Price (USD)"
          value={price}
          onChange={setPrice}
          inputMode="numeric"
          isInvalid={!Number.isFinite(priceValue) || priceValue < 0}
          errorMessage="Enter a whole dollar amount."
        />
        <Select label="Delivery status" selectedKey={delivery} onSelectionChange={(key) => key != null && setDelivery(String(key) as DeliveryStatus)}>
          {(Object.keys(DELIVERY) as DeliveryStatus[]).map((d) => (
            <SelectItem key={d} id={d} textValue={DELIVERY[d].label}>
              {DELIVERY[d].label}
            </SelectItem>
          ))}
        </Select>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid}>
          Save changes
        </Button>
      </ModalFooter>
    </form>
  );
}
