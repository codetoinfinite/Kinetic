'use client';

import { useState } from 'react';

import { Pagination } from '@/registry/ui/pagination';

const PER_PAGE = 10;
const TOTAL = 118;

/* BoardUI shows the pager spread across a full-width row. Here it is a table
   footer with a live "showing" line, and below it the same pager in a 340px
   card, where its own ResizeObserver drops the labels and the sibling window. */
export default function Demo() {
  const [page, setPage] = useState(3);
  const [compactPage, setCompactPage] = useState(5);
  const totalPages = Math.ceil(TOTAL / PER_PAGE);
  const first = (page - 1) * PER_PAGE + 1;
  const last = Math.min(page * PER_PAGE, TOTAL);

  return (
    <div className="flex w-full max-w-[640px] flex-col items-center gap-6">
      <div className="flex w-full flex-col gap-3 rounded-xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
        <p className="text-body-2-regular text-text-secondary">
          Showing <span className="text-body-2-medium text-text-primary">{first}</span> to{' '}
          <span className="text-body-2-medium text-text-primary">{last}</span> of{' '}
          <span className="text-body-2-medium text-text-primary">{TOTAL}</span> invoices
        </p>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} aria-label="Invoices pages" />
      </div>

      <div className="flex w-full max-w-[340px] flex-col gap-2 rounded-xl border border-border-button-default bg-background-primary-default p-3 shadow-xs">
        <p className="text-caption-1-medium text-text-tertiary">Compact, under 420px</p>
        <Pagination
          page={compactPage}
          totalPages={24}
          onChange={setCompactPage}
          aria-label="Activity pages"
        />
      </div>
    </div>
  );
}
