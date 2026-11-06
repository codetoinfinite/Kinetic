'use client';

import { RiAddLine, RiDownload2Line } from '@remixicon/react';

import { Button } from '@/registry/ui/button';
import { DataTableExample } from '@/registry/ui/data-table';

const SUMMARY = [
  { label: 'Active customers', value: '48', note: 'across 4 regions' },
  { label: 'Repeat buyers', value: '62%', note: 'up 4 points on last year' },
  { label: 'Average order', value: '$1,964', note: 'last 12 months' },
];

/* The customers page of a store dashboard, with the table as BoardUI ships it:
   filters and search in its toolbar, sortable headers, row selection,
   pagination and the Normal / Compact switch under it. */
export default function Demo() {
  return (
    <div className="flex h-full w-full bg-background-full p-3">
      <main className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto rounded-3xl border border-border-button-default bg-background-primary-default px-8 py-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-body-2-medium text-text-tertiary">Sales</span>
            <h1 className="text-title-1-semibold text-text-primary">Customers</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" leadingIcon={RiDownload2Line}>
              Export CSV
            </Button>
            <Button leadingIcon={RiAddLine}>Add customer</Button>
          </div>
        </header>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SUMMARY.map((item) => (
            <li
              key={item.label}
              className="flex items-baseline justify-between gap-3 rounded-2xl bg-background-secondary-default px-4 py-3"
            >
              <span className="flex flex-col">
                <span className="text-body-2-medium text-text-secondary">{item.label}</span>
                <span className="text-caption-1-regular text-text-tertiary">{item.note}</span>
              </span>
              <span className="text-title-2-semibold text-text-primary">{item.value}</span>
            </li>
          ))}
        </ul>

        <DataTableExample />
      </main>
    </div>
  );
}
