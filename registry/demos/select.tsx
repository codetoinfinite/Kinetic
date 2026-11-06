'use client';

import { useState } from 'react';
import type { Key } from 'react-aria-components';
import { Select, SelectItem } from '@/registry/ui/select';
import { StatusDot } from '@/registry/ui/status-dot';

/* Two selects from a project settings row: a labelled framework picker and a
   compact status filter whose rows carry a status dot. */
const FRAMEWORKS = [
  { id: 'react', name: 'React' },
  { id: 'vue', name: 'Vue' },
  { id: 'svelte', name: 'Svelte' },
  { id: 'solid', name: 'Solid' },
  { id: 'angular', name: 'Angular' },
];

const STATUSES = [
  { id: 'completed', name: 'Completed', color: 'green' },
  { id: 'waiting', name: 'Waiting', color: 'yellow' },
  { id: 'processing', name: 'Processing', color: 'indigo' },
] as const;

export default function Demo() {
  const [framework, setFramework] = useState<Key | null>('react');
  const [status, setStatus] = useState<Key | null>('completed');

  const frameworkName = FRAMEWORKS.find((f) => f.id === framework)?.name ?? 'nothing';

  return (
    <div className="flex w-full max-w-[420px] flex-col items-center gap-6">
      <div className="flex w-full flex-wrap items-end justify-center gap-4">
        <Select
          label="Framework"
          className="w-[180px]"
          value={framework}
          onChange={setFramework}
        >
          {FRAMEWORKS.map((f) => (
            <SelectItem key={f.id} id={f.id} textValue={f.name}>
              {f.name}
            </SelectItem>
          ))}
        </Select>

        <Select
          aria-label="Purchase status"
          size="sm"
          className="w-[142px]"
          value={status}
          onChange={setStatus}
        >
          {STATUSES.map((s) => (
            <SelectItem key={s.id} id={s.id} textValue={s.name}>
              <StatusDot color={s.color} />
              {s.name}
            </SelectItem>
          ))}
        </Select>
      </div>
      <p className="text-center text-body-2-regular text-text-secondary">
        Building with <span className="text-text-primary">{frameworkName}</span>, showing{' '}
        <span className="text-text-primary">{String(status ?? 'all')}</span> orders.
      </p>
    </div>
  );
}
