'use client';

import { useMemo, useState } from 'react';
import { RiRestartLine } from '@remixicon/react';

import { Button } from '@/registry/ui/button';
import { DataGrid } from '@/registry/ui/data-grid';
import type { DataGridColumn } from '@/registry/ui/data-grid';

type Renewal = {
  id: string;
  account: string;
  owner: string;
  region: string;
  stage: string;
  renews: string;
  seats: number;
  arr: number;
  health: number;
};

const OWNERS = ['Maya Patel', 'Owen Park', 'Priya Shah', 'Daniel Kim', 'Sofia Reyes'];
const REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Latin America'];
const STAGES = ['Discovery', 'Proposal', 'Negotiation', 'Committed', 'Closed won'];
const MONTHS = ['Jul 2026', 'Aug 2026', 'Sep 2026'];
const NAMES = [
  'Northwind', 'Lumen', 'Cedar', 'Brightline', 'Harbor', 'Pinecrest', 'Atlas', 'Summit',
  'Fieldstone', 'Evergreen', 'Meridian', 'Redwood', 'Westbridge', 'Sterling', 'Juniper', 'Oakmont',
  'Bluepeak', 'Copperline', 'Driftwood', 'Foxglove', 'Granite', 'Kestrel', 'Larkspur', 'Tidewater',
];
const SUFFIXES = ['Freight', 'Labs', 'Health', 'Studio', 'Systems', 'Logistics', 'Energy', 'Foods', 'Media', 'Capital'];

/* 240 accounts from fixed arithmetic, so the server and the browser build the
   same rows. Enough to scroll through, still under 1,000 so the grid's
   locale-formatted row count prints the same everywhere. */
function makeRows(count: number): Renewal[] {
  return Array.from({ length: count }, (_, i) => {
    const seats = 10 + ((i * 73 + 19) % 640);
    return {
      id: `acct-${i}`,
      account: `${NAMES[i % NAMES.length]} ${SUFFIXES[Math.floor(i / NAMES.length) % SUFFIXES.length]}`,
      owner: OWNERS[(i * 3 + Math.floor(i / 5)) % OWNERS.length] ?? 'Maya Patel',
      region: REGIONS[(i * 7) % REGIONS.length] ?? 'Europe',
      stage: STAGES[(i * 13 + 2) % STAGES.length] ?? 'Proposal',
      renews: MONTHS[(i * 5) % MONTHS.length] ?? 'Jul 2026',
      seats,
      arr: seats * (240 + (i % 4) * 60),
      health: 35 + ((i * 17) % 66),
    };
  });
}

const INITIAL = makeRows(240);

/* Fixed-locale formatters keep summaries identical on server and client. */
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

const getRowId = (row: Renewal) => row.id;

const COLUMNS: DataGridColumn<Renewal>[] = [
  {
    key: 'account',
    header: 'Account',
    width: 208,
    validate: (value) => (String(value).trim() ? undefined : 'Account cannot be empty.'),
  },
  { key: 'owner', header: 'Owner', width: 156, type: 'select', options: OWNERS },
  { key: 'region', header: 'Region', width: 152, type: 'select', options: REGIONS },
  { key: 'stage', header: 'Stage', width: 140, type: 'select', options: STAGES },
  { key: 'renews', header: 'Renews', width: 120, type: 'select', options: MONTHS },
  { key: 'seats', header: 'Seats', width: 92, type: 'number', min: 0, summary: 'sum', formatSummary: (value) => compact.format(value) },
  {
    key: 'arr',
    header: 'ARR',
    width: 132,
    type: 'number',
    min: 0,
    summary: 'sum',
    format: (value) => usd.format(Number(value)),
    formatSummary: (value) => `$${compact.format(value)}`,
  },
  {
    key: 'health',
    header: 'Health',
    width: 100,
    type: 'number',
    min: 0,
    max: 100,
    summary: 'average',
    format: (value) => `${value}%`,
    formatSummary: (value) => `${value.toFixed(1)}%`,
  },
];

/* A renewals workspace in a revenue app. The figures above the grid are
   derived from the same rows, so edits, pastes, deletes and undo move them. */
export default function Demo() {
  const [data, setData] = useState(INITIAL);
  const [resetKey, setResetKey] = useState(0);
  const changed = data !== INITIAL;

  const stats = useMemo(() => {
    let arr = 0;
    let committed = 0;
    let atRisk = 0;
    for (const row of data) {
      arr += row.arr;
      if (row.stage === 'Committed' || row.stage === 'Closed won') committed += row.arr;
      if (row.health < 50) atRisk += 1;
    }
    return [
      { label: 'Renewing ARR', value: `$${compact.format(arr)}` },
      { label: 'Committed or won', value: arr ? `${Math.round((committed / arr) * 100)}%` : '0%' },
      { label: 'At risk', value: `${atRisk} ${atRisk === 1 ? 'account' : 'accounts'}` },
      { label: 'Accounts', value: String(data.length) },
    ];
  }, [data]);

  return (
    <div className="flex h-full w-full bg-background-full p-3">
      <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto rounded-3xl border border-border-button-default bg-background-primary-default px-6 py-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-body-2-medium text-text-tertiary">Revenue</span>
            <h1 className="text-title-1-semibold text-text-primary">Q3 renewals</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-body-2-regular text-text-tertiary md:inline">
              Double-click to edit, or paste a block from a spreadsheet.
            </span>
            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiRestartLine}
              disabled={!changed}
              onClick={() => {
                setData(INITIAL);
                setResetKey((key) => key + 1);
              }}
            >
              Reset
            </Button>
          </div>
        </header>

        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-2">
              <dt className="text-body-2-regular text-text-tertiary">{stat.label}</dt>
              <dd className="text-body-medium text-text-primary tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <DataGrid
          key={resetKey}
          aria-label="Q3 renewals"
          data={data}
          columns={COLUMNS}
          getRowId={getRowId}
          onDataChange={setData}
          height={420}
          exportFileName="q3-renewals.csv"
        />
      </main>
    </div>
  );
}
