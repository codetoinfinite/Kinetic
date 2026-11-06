'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Dashboard Page Header" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { parseDate } from '@internationalized/date';
import { RiAddLine, RiDownload2Line, RiHomeLine } from '@remixicon/react';
import { Button } from '@/registry/ui/button';
import { DashboardPageHeader, type PageHeaderCrumb } from '@/registry/ui/dashboard-page-header';
import { PeriodStepper, usePeriodLabel, type PeriodRange } from '@/registry/ui/dashboard-page-header-range';

const BASE: PeriodRange = { start: parseDate('2026-06-29'), end: parseDate('2026-07-05') };
const WEEK_MS = 7 * 86_400_000;

const CRUMBS: PageHeaderCrumb[] = [
  { label: 'Board team', initials: 'B', tone: 'blue', href: '#' },
  { label: 'Mertcan', initials: 'M', tone: 'neutral', href: '#' },
  { label: 'Home', icon: RiHomeLine },
];

/** Deterministic per-week numbers so stepping the range visibly changes the cards. */
function weekStats(offset: number, created: number) {
  const wobble = (n: number, mod: number) => (((offset * n) % mod) + mod) % mod;
  return [
    { label: 'Open tickets', value: String(128 + wobble(37, 41) + created) },
    { label: 'Resolved', value: String(342 + wobble(53, 67)) },
    { label: 'Avg. first reply', value: `${(2.1 + wobble(7, 13) / 10).toFixed(1)}h` },
  ];
}

export default function Demo() {
  const [range, setRange] = useState<PeriodRange>(BASE);
  const [unread, setUnread] = useState(5);
  const [created, setCreated] = useState(0);
  const [status, setStatus] = useState('Showing this week.');
  const label = usePeriodLabel(range);
  const offset = Math.round((range.start.toDate('UTC').getTime() - BASE.start.toDate('UTC').getTime()) / WEEK_MS);
  const stats = weekStats(offset, created);

  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-3" data-demo>
      <div className="flex flex-col gap-6 rounded-3xl border border-border-table bg-background-full p-4 sm:p-6">
        <DashboardPageHeader
          breadcrumbs={CRUMBS}
          title="Welcome Mertcan"
          dateRange={
            <PeriodStepper
              value={range}
              onChange={(next) => {
                setRange(next);
                setStatus('Range changed.');
              }}
              aria-label="Reporting week"
              previousLabel="Previous week"
              nextLabel="Next week"
            />
          }
          notificationCount={unread}
          onNotificationsPress={() => {
            setStatus(unread > 0 ? `Marked ${unread} notifications as read.` : 'No unread notifications.');
            setUnread(0);
          }}
          actions={
            <>
              <Button variant="secondary" leadingIcon={RiDownload2Line} onClick={() => setStatus(`Exported ${label} as CSV.`)}>
                Export
              </Button>
              <Button
                leadingIcon={RiAddLine}
                onClick={() => {
                  setCreated((count) => count + 1);
                  setUnread((count) => count + 1);
                  setStatus(`Ticket #${1043 + created} created.`);
                }}
              >
                Create ticket
              </Button>
            </>
          }
        />

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-2 rounded-2xl bg-background-secondary-default p-4">
              <dt className="text-caption-1-medium text-text-secondary">{stat.label}</dt>
              <dd className="text-title-2-medium text-text-primary tabular-nums" data-stat={stat.label}>
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p aria-live="polite" className="px-1 text-caption-1-regular text-text-tertiary">
        {status}
      </p>
    </div>
  );
}
