'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Kanban Card" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { KanbanCard, type KanbanCardProps } from '@/registry/ui/kanban-card';
import type { AvatarStackPerson } from '@/registry/ui/avatar-stack';

const PEOPLE: Record<string, AvatarStackPerson> = {
  me: { id: 'me', name: 'Mertcan Esmergul', description: 'Design lead', color: 'blue' },
  ad: { id: 'ad', name: 'Ana Duarte', description: 'Product design', color: 'pink' },
  jk: { id: 'jk', name: 'Jonas Keller', description: 'Frontend', color: 'lime' },
  ls: { id: 'ls', name: 'Lina Sato', description: 'Frontend', color: 'neutral' },
  ro: { id: 'ro', name: 'Rafael Ortiz', description: 'Backend', color: 'blue' },
};

type Ticket = Omit<KanbanCardProps, 'onPress' | 'isSelected'> & { column: string; count: string };

const TICKETS: Ticket[] = [
  {
    column: 'Backlog',
    count: '3/8',
    code: 'DS-38',
    area: 'Agent handoff',
    priority: 'low',
    tags: ['vibl'],
    title: 'Explore approval cards for agent handoffs',
    assignees: [PEOPLE.me!, PEOPLE.ad!],
    meta: 'Since 14 Sep',
  },
  {
    column: 'In progress',
    count: '2/4',
    code: 'FE-79',
    area: 'Agent progress',
    priority: 'medium',
    tags: ['firstview'],
    title: 'Animate nested task groups as they stream',
    description: 'Child steps slide in under their parent and the group header counts them as they land.',
    assignees: [PEOPLE.ad!, PEOPLE.jk!],
    meta: 'Since 9 Sep',
    comments: 4,
    attachments: 2,
    due: '18 Sep',
    dueState: 'soon',
  },
  {
    column: 'Review',
    count: '1/3',
    code: 'DS-31',
    area: 'Dark mode',
    priority: 'urgent',
    tags: ['BoardUI'],
    title: 'Tune chart contrast on dark dashboard cards',
    description: 'Series 3 and 4 fall under 3:1 against the 800 surface. Pick new steps from the chart ramp.',
    assignees: [PEOPLE.ro!, PEOPLE.me!, PEOPLE.ls!, PEOPLE.jk!],
    meta: 'Since 8 Sep',
    comments: 12,
    attachments: 1,
    due: '12 Sep',
    dueState: 'overdue',
  },
];

export default function Demo() {
  const [selected, setSelected] = useState<string | null>('FE-79');
  const current = TICKETS.find((t) => t.code === selected);

  return (
    <div data-demo className="flex w-full max-w-[860px] flex-col gap-3">
      <div className="grid w-full grid-cols-[repeat(3,256px)] gap-2 overflow-x-auto rounded-2-5xl bg-background-secondary-default p-1.5 sm:grid-cols-3">
        {TICKETS.map(({ column, count, ...ticket }) => (
          <div key={ticket.code} className="flex min-w-0 flex-col gap-1.5">
            <p className="flex items-center gap-1.5 px-1.5 pt-1.5 text-body-medium text-text-primary">
              {column}
              <span className="text-body-regular text-text-secondary">{count}</span>
            </p>
            <KanbanCard
              {...ticket}
              isSelected={selected === ticket.code}
              onPress={() => setSelected((s) => (s === ticket.code ? null : ticket.code))}
            />
          </div>
        ))}
      </div>
      <p aria-live="polite" className="px-1.5 text-body-2-regular text-text-secondary">
        {current ? (
          <>
            Open: <span className="text-text-primary">{current.code}</span> · {current.title}
          </>
        ) : (
          'Click a card to open its ticket.'
        )}
      </p>
    </div>
  );
}
