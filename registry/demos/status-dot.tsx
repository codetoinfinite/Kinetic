'use client';

import { StatusDot } from '@/registry/ui/status-dot';

/* The dot where BoardUI uses it: in front of a purchase status on an orders
   list. The dot is decorative, so every row keeps its text label. */
type Status = 'completed' | 'waiting' | 'processing';

const STATUS: Record<Status, { label: string; color: 'green' | 'yellow' | 'indigo' }> = {
  completed: { label: 'Completed', color: 'green' },
  waiting: { label: 'Waiting', color: 'yellow' },
  processing: { label: 'Processing', color: 'indigo' },
};

const ORDERS: { id: string; customer: string; total: string; status: Status }[] = [
  { id: '#4821', customer: 'Lena Hoffmann', total: '$240.00', status: 'completed' },
  { id: '#4822', customer: 'Marcus Reid', total: '$86.50', status: 'processing' },
  { id: '#4823', customer: 'Aiko Tanaka', total: '$1,120.00', status: 'waiting' },
  { id: '#4824', customer: 'Sofia Alvarez', total: '$312.40', status: 'completed' },
];

export default function Demo() {
  return (
    <div className="flex w-full max-w-[440px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-center gap-4">
        {(Object.keys(STATUS) as Status[]).map((key) => (
          <span key={key} className="inline-flex items-center gap-2 text-body-medium text-text-primary">
            <StatusDot color={STATUS[key].color} />
            {STATUS[key].label}
          </span>
        ))}
      </div>

      <ul
        aria-label="Recent orders"
        className="flex flex-col divide-y divide-border-table overflow-hidden rounded-xl border border-border-table bg-background-primary-default"
      >
        {ORDERS.map((order) => (
          <li key={order.id} className="flex items-center gap-3 px-4 py-3">
            <span className="w-12 shrink-0 text-body-medium text-text-tertiary">{order.id}</span>
            <span className="min-w-0 flex-1 truncate text-body-medium text-text-primary">{order.customer}</span>
            <span className="hidden text-body-medium text-text-secondary sm:inline">{order.total}</span>
            <span className="inline-flex w-[104px] shrink-0 items-center gap-2 text-body-medium text-text-primary">
              <StatusDot color={STATUS[order.status].color} />
              {STATUS[order.status].label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
