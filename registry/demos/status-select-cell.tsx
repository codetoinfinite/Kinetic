'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Status Select Cell" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { StatusSelectCell, type StatusOption } from '@/registry/ui/status-select-cell';

type Status = 'recovering' | 'treatment' | 'observation' | 'stable' | 'critical';

const STATUSES: readonly StatusOption<Status>[] = [
  { id: 'stable', label: 'Stable', color: 'lime', description: 'Vitals within normal range' },
  { id: 'recovering', label: 'Recovering', color: 'cyan', description: 'Improving after treatment' },
  { id: 'treatment', label: 'In treatment', color: 'blue', description: 'Active care plan running' },
  { id: 'observation', label: 'Under observation', color: 'yellow', description: 'Monitored every 4 hours' },
  { id: 'critical', label: 'Critical', color: 'rose', description: 'Needs immediate attention' },
];

type Patient = { id: string; name: string; initials: string; condition: string; next: string; status: Status };

const PATIENTS: readonly Patient[] = [
  { id: 'p1', name: 'John Clarkson', initials: 'JC', condition: 'Post-op', next: 'May 14, 2026', status: 'recovering' },
  { id: 'p2', name: 'Aspen Lubin', initials: 'AL', condition: 'Hypertension', next: 'Oct 15, 2026', status: 'treatment' },
  { id: 'p3', name: 'Michael Ekstrom', initials: 'ME', condition: 'Asthma', next: 'Mar 25, 2026', status: 'observation' },
  { id: 'p4', name: 'Kianna Vaccaro', initials: 'KV', condition: 'Post-op', next: 'Oct 03, 2026', status: 'stable' },
  { id: 'p5', name: 'Livia Saris', initials: 'LS', condition: 'Migraine', next: 'Dec 24, 2026', status: 'critical' },
  { id: 'p6', name: 'Jaydon Aminoff', initials: 'JA', condition: 'Diabetes', next: 'Feb 22, 2026', status: 'stable' },
];

export default function Demo() {
  const [statuses, setStatuses] = useState<Record<string, Status>>(() =>
    Object.fromEntries(PATIENTS.map((p) => [p.id, p.status])),
  );
  const [lastChange, setLastChange] = useState<string>('Click a status pill, or Tab to it and press Enter.');

  const counts = STATUSES.map((s) => ({ ...s, count: PATIENTS.filter((p) => statuses[p.id] === s.id).length }));

  return (
    <div className="w-full max-w-[1000px]" data-demo>
      <div className="overflow-hidden rounded-3xl border border-border-table bg-background-full">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex flex-col">
            <p className="text-body-medium text-text-tertiary">Ward 4B</p>
            <p className="text-body-medium text-text-primary">{PATIENTS.length} patients</p>
          </div>
          <ul aria-label="Patients by status" className="flex flex-wrap gap-x-3 gap-y-1">
            {counts.map((s) => (
              <li key={s.id} data-count={s.id} className="text-caption-1-medium text-text-secondary tabular-nums">
                {s.label} <span className="text-text-primary">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border-table">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_1.2fr_1fr_1fr] gap-4 bg-background-secondary-default px-5 py-2.5 text-caption-1-medium text-text-tertiary md:grid">
            <span>Patient</span>
            <span>Status</span>
            <span>Condition</span>
            <span>Next appointment</span>
          </div>
          <ul aria-label="Patients">
            {PATIENTS.map((patient) => {
              const status = statuses[patient.id] ?? patient.status;
              return (
                <li
                  key={patient.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-border-table px-4 py-3 last:border-b-0 sm:px-5 md:grid-cols-[minmax(0,1.4fr)_1.2fr_1fr_1fr] md:gap-x-4"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-background-tertiary-default text-caption-1-medium text-text-secondary"
                    >
                      {patient.initials}
                    </span>
                    <span className="truncate text-body-medium text-text-primary">{patient.name}</span>
                  </span>
                  <span className="flex justify-end md:justify-start">
                    <StatusSelectCell
                      aria-label={`Status for ${patient.name}`}
                      options={STATUSES}
                      value={status}
                      onChange={(next) => {
                        setStatuses((current) => ({ ...current, [patient.id]: next }));
                        const label = STATUSES.find((s) => s.id === next)?.label ?? next;
                        setLastChange(`${patient.name} is now ${label}.`);
                      }}
                    />
                  </span>
                  <span className="col-span-2 text-caption-1-regular text-text-tertiary md:hidden">
                    {patient.condition} · Next {patient.next}
                  </span>
                  <span className="hidden md:block">
                    <span className="rounded-md bg-background-secondary-default px-1.5 py-0.5 text-body-medium text-text-primary">
                      {patient.condition}
                    </span>
                  </span>
                  <span className="hidden text-body-medium text-text-primary md:block">{patient.next}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <p data-last-change aria-live="polite" className="border-t border-border-table px-4 py-3 text-caption-1-regular text-text-tertiary sm:px-5">
          {lastChange}
        </p>
      </div>
    </div>
  );
}
