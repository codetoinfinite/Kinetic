'use client';

import { useId, useState } from 'react';
import { RiHomeLine } from '@remixicon/react';

import { AppShell, STARTER_SITE_PREFIX, StarterBaseContext } from '@/registry/ui/app-shell';
import { Avatar, type AvatarProps } from '@/registry/ui/avatar';
import { Button } from '@/registry/ui/button';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';
import { StatCards } from '@/registry/ui/stat-cards';

type TicketState = 'open' | 'closed';
type Filter = 'all' | TicketState;
type Priority = 'High' | 'Normal' | 'Low';

type Ticket = {
  id: string;
  title: string;
  customer: string;
  initials: string;
  color: AvatarProps['color'];
  priority: Priority;
  updated: string;
  state: TicketState;
};

const TICKETS: Ticket[] = [
  { id: 'T-1042', title: 'Refund missing from the March invoice', customer: 'Livia Saris', initials: 'LS', color: 'pink', priority: 'High', updated: '12m', state: 'open' },
  { id: 'T-1041', title: 'Add a second admin to the Acme workspace', customer: 'Aspen Lubin', initials: 'AL', color: 'blue', priority: 'Normal', updated: '48m', state: 'open' },
  { id: 'T-1039', title: 'CSV export drops the currency column', customer: 'Jaydon Aminoff', initials: 'JA', color: 'lime', priority: 'High', updated: '2h', state: 'open' },
  { id: 'T-1036', title: 'Change the billing email after a domain move', customer: 'Maria Ekstrom', initials: 'ME', color: 'neutral', priority: 'Low', updated: '1d', state: 'closed' },
  { id: 'T-1033', title: 'Two-factor codes arrive late on Android', customer: 'Kadin Bator', initials: 'KB', color: 'blue', priority: 'Normal', updated: '2d', state: 'closed' },
];

const PRIORITY_STYLE: Record<Priority, string> = {
  High: 'bg-status-rose-background text-status-rose-text',
  Normal: 'bg-status-blue-background text-status-blue-text',
  Low: 'bg-badge-neutral-background text-text-secondary',
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
];

/* The starter's dashboard page inside the shell, as BoardUI ships it: the
   breadcrumb trail, "Welcome Jordan", the default bell / Filters / Create
   ticket actions and the footer KPI cards, then a support queue whose filter
   and close / reopen buttons are live. The bell's popover stays closed until
   it is pressed. */
export default function Demo() {
  const headingId = useId();
  const [filter, setFilter] = useState<Filter>('open');
  const [states, setStates] = useState<Record<string, TicketState>>(() =>
    Object.fromEntries(TICKETS.map((ticket) => [ticket.id, ticket.state])),
  );

  const stateOf = (ticket: Ticket) => states[ticket.id] ?? ticket.state;
  const openCount = TICKETS.filter((ticket) => stateOf(ticket) === 'open').length;
  const rows = filter === 'all' ? TICKETS : TICKETS.filter((ticket) => stateOf(ticket) === filter);

  const toggle = (ticket: Ticket) =>
    setStates((current) => ({
      ...current,
      [ticket.id]: stateOf(ticket) === 'open' ? 'closed' : 'open',
    }));

  return (
    <div className="h-full w-full bg-background-full">
      <StarterBaseContext.Provider value={STARTER_SITE_PREFIX}>
        <AppShell title="Dashboard" heading="Welcome Jordan" icon={RiHomeLine} className="h-full">
          <StatCards variant="footer" />

          <section
            aria-labelledby={headingId}
            className="flex flex-col gap-3 rounded-2xl bg-background-secondary-default p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 id={headingId} className="text-headline-medium text-text-primary">
                  Support queue
                </h2>
                <p className="text-body-regular text-text-secondary">
                  {openCount === 0 ? 'Nothing waiting on the team' : `${openCount} open`}
                </p>
              </div>
              <SegmentedControl
                aria-label="Ticket status"
                selectedKeys={[filter]}
                onSelectionChange={(keys) => {
                  const next = [...(keys as Set<string>)][0] as Filter | undefined;
                  if (next) setFilter(next);
                }}
                className="flex w-[260px]"
              >
                {FILTERS.map(({ id, label }) => (
                  <SegmentedControlItem key={id} id={id} className="flex-1">
                    {label}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            </div>

            <ul className="flex flex-col overflow-hidden rounded-2xl bg-background-primary-default shadow-card">
              {rows.length === 0 ? (
                <li className="px-4 py-6 text-center text-body-regular text-text-secondary">
                  No tickets here.
                </li>
              ) : (
                rows.map((ticket) => {
                  const open = stateOf(ticket) === 'open';
                  return (
                    <li
                      key={ticket.id}
                      className="flex items-center gap-3 border-b border-separator-border px-3 py-2.5 last:border-b-0"
                    >
                      <Avatar size="md" color={ticket.color} initials={ticket.initials} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="truncate text-body-medium text-text-primary">{ticket.title}</p>
                        <p className="text-caption-1-regular text-text-tertiary">
                          {ticket.id} · {ticket.customer}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-caption-1-medium ${PRIORITY_STYLE[ticket.priority]}`}
                      >
                        {ticket.priority}
                      </span>
                      <span className="w-9 text-end text-caption-1-medium text-text-tertiary">
                        {ticket.updated}
                      </span>
                      <Button
                        variant={open ? 'secondary' : 'ghost'}
                        size="small"
                        onClick={() => toggle(ticket)}
                        className="w-[76px]"
                      >
                        {open ? 'Close' : 'Reopen'}
                      </Button>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </AppShell>
      </StarterBaseContext.Provider>
    </div>
  );
}
