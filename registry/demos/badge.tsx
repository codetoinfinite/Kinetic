'use client';

import { Badge } from '@/registry/ui/badge';

/* Badges in the place they live: counts on a nav list, with the selected row
   carrying the primary tone and every other row the neutral one. */
const ROWS = [
  { label: 'Inbox', count: '12', selected: true },
  { label: 'Assigned to me', count: '4', selected: false },
  { label: 'Mentions', count: '99+', selected: false },
  { label: 'Archive', count: '1,204', selected: false },
];

export default function Demo() {
  return (
    <ul className="flex w-full max-w-[240px] flex-col gap-0.5" aria-label="Mailboxes">
      {ROWS.map((row) => (
        <li
          key={row.label}
          className={
            row.selected
              ? 'flex h-8 items-center justify-between rounded-lg bg-background-primary-active px-2 text-body-medium text-text-primary'
              : 'flex h-8 items-center justify-between rounded-lg px-2 text-body-medium text-text-secondary'
          }
        >
          <span>{row.label}</span>
          <Badge color={row.selected ? 'primary' : 'neutral'} aria-label={`${row.count} items`}>
            {row.count}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
