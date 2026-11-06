'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Table Filter Bar" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */

import { useMemo, useState } from 'react';
import { TableFilterBar, type FilterDefinition, type FilterValues } from '@/registry/ui/table-filter-bar';

type Row = {
  id: string;
  customer: string;
  initials: string;
  product: 'laptop' | 'phone' | 'tablet' | 'audio';
  region: 'europe' | 'americas' | 'asia';
  price: number;
  updated: string;
};

const ROWS: readonly Row[] = [
  { id: 'o1', customer: 'John Clarkson', initials: 'JC', product: 'laptop', region: 'europe', price: 1899, updated: 'Sep 05, 2026' },
  { id: 'o2', customer: 'Aspen Lubin', initials: 'AL', product: 'phone', region: 'americas', price: 899, updated: 'Mar 25, 2026' },
  { id: 'o3', customer: 'Mia Chen', initials: 'MC', product: 'audio', region: 'asia', price: 129, updated: 'Jun 12, 2026' },
  { id: 'o4', customer: 'Leo Park', initials: 'LP', product: 'tablet', region: 'asia', price: 649, updated: 'Apr 02, 2026' },
  { id: 'o5', customer: 'Ana Carter', initials: 'AC', product: 'laptop', region: 'americas', price: 2349, updated: 'Jul 19, 2026' },
  { id: 'o6', customer: 'Noah Fischer', initials: 'NF', product: 'audio', region: 'europe', price: 49, updated: 'Feb 08, 2026' },
  { id: 'o7', customer: 'Sofia Rossi', initials: 'SR', product: 'phone', region: 'europe', price: 1099, updated: 'Aug 30, 2026' },
  { id: 'o8', customer: 'Kenji Sato', initials: 'KS', product: 'laptop', region: 'asia', price: 1499, updated: 'May 14, 2026' },
  { id: 'o9', customer: 'Emma Wright', initials: 'EW', product: 'tablet', region: 'americas', price: 329, updated: 'Jan 21, 2026' },
  { id: 'o10', customer: 'Lucas Martin', initials: 'LM', product: 'audio', region: 'americas', price: 199, updated: 'Oct 03, 2026' },
];

const PRODUCT_LABEL: Record<Row['product'], string> = { laptop: 'Laptop', phone: 'Phone', tablet: 'Tablet', audio: 'Headphones' };
const REGION_LABEL: Record<Row['region'], string> = { europe: 'Europe', americas: 'Americas', asia: 'Asia Pacific' };

const FILTERS: readonly FilterDefinition[] = [
  {
    id: 'price',
    label: 'Price',
    allLabel: 'All prices',
    options: [
      { id: 'under-500', label: 'Under $500' },
      { id: '500-1500', label: '$500 - $1,500' },
      { id: 'over-1500', label: 'Over $1,500' },
    ],
  },
  {
    id: 'product',
    label: 'Product',
    allLabel: 'All products',
    options: (Object.keys(PRODUCT_LABEL) as Row['product'][]).map((id) => ({ id, label: PRODUCT_LABEL[id] })),
  },
  {
    id: 'region',
    label: 'Region',
    allLabel: 'All regions',
    options: (Object.keys(REGION_LABEL) as Row['region'][]).map((id) => ({ id, label: REGION_LABEL[id] })),
  },
];

function matchesPrice(price: number, bucket: string | undefined) {
  if (bucket === 'under-500') return price < 500;
  if (bucket === '500-1500') return price >= 500 && price <= 1500;
  if (bucket === 'over-1500') return price > 1500;
  return true;
}

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

export default function Demo() {
  const [values, setValues] = useState<FilterValues>({});
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ROWS.filter(
      (row) =>
        matchesPrice(row.price, values.price) &&
        (!values.product || row.product === values.product) &&
        (!values.region || row.region === values.region) &&
        (!q || row.customer.toLowerCase().includes(q) || PRODUCT_LABEL[row.product].toLowerCase().includes(q)),
    );
  }, [values, query]);

  return (
    <div className="w-full max-w-[1100px]" data-demo>
      <div className="overflow-hidden rounded-3xl border border-border-table bg-background-full">
        <div className="p-4 sm:p-5">
          <TableFilterBar
            filters={FILTERS}
            values={values}
            onValuesChange={setValues}
            query={query}
            onQueryChange={setQuery}
            resultCount={rows.length}
            resultLabel={rows.length === 1 ? 'order' : 'orders'}
          />
        </div>

        <div className="border-t border-border-table">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_1fr_1fr_1fr_0.8fr] gap-4 bg-background-secondary-default px-5 py-2.5 text-caption-1-medium text-text-tertiary md:grid">
            <span>Customer</span>
            <span>Product</span>
            <span>Region</span>
            <span>Last updated</span>
            <span className="text-end">Price</span>
          </div>
          <ul aria-label="Orders" className="max-h-[300px] overflow-y-auto">
            {rows.map((row) => (
              <li
                key={row.id}
                data-row
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-border-table px-4 py-2.5 last:border-b-0 sm:px-5 md:grid-cols-[minmax(0,1.6fr)_1fr_1fr_1fr_0.8fr]"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-background-tertiary-default text-caption-1-medium text-text-secondary"
                  >
                    {row.initials}
                  </span>
                  <span className="truncate text-body-medium text-text-primary">{row.customer}</span>
                </span>
                <span className="text-end text-body-medium text-text-primary tabular-nums md:order-last">{money(row.price)}</span>
                <span className="col-span-2 text-caption-1-regular text-text-tertiary md:hidden">
                  {PRODUCT_LABEL[row.product]} · {REGION_LABEL[row.region]} · {row.updated}
                </span>
                <span className="hidden text-body-regular text-text-secondary md:block">{PRODUCT_LABEL[row.product]}</span>
                <span className="hidden text-body-regular text-text-secondary md:block">{REGION_LABEL[row.region]}</span>
                <span className="hidden text-body-regular text-text-secondary md:block">{row.updated}</span>
              </li>
            ))}
          </ul>
          {rows.length === 0 ? (
            <p data-empty className="px-5 py-10 text-center text-body-regular text-text-tertiary">
              No orders match these filters.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
