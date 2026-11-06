'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Kanban Column" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiMoreLine } from '@remixicon/react';
import {
  KanbanBoard,
  KanbanColumn,
  KanbanItem,
  KanbanMoveMenu,
  kanbanIconButtonClass,
  moveItem,
  type KanbanMove,
} from '@/registry/ui/kanban-column';
import { KanbanCard, type KanbanCardProps } from '@/registry/ui/kanban-card';
import { PRIORITY_RANK } from '@/registry/ui/priority-badge';
import type { AvatarStackPerson } from '@/registry/ui/avatar-stack';
import { Dropdown, DropdownGroup, DropdownItem, DropdownPopover, DropdownTrigger } from '@/registry/ui/dropdown';

const ME: AvatarStackPerson = { id: 'me', name: 'Mertcan Esmergul', description: 'Design lead', color: 'blue' };
const AD: AvatarStackPerson = { id: 'ad', name: 'Ana Duarte', description: 'Product design', color: 'pink' };
const JK: AvatarStackPerson = { id: 'jk', name: 'Jonas Keller', description: 'Frontend', color: 'lime' };
const RO: AvatarStackPerson = { id: 'ro', name: 'Rafael Ortiz', description: 'Backend', color: 'neutral' };

type Ticket = Omit<KanbanCardProps, 'onPress' | 'isSelected' | 'dragState' | 'actions'> & { id: string };

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', limit: 8 },
  { id: 'todo', title: 'To do', limit: 5 },
  { id: 'progress', title: 'In progress', limit: 4 },
  { id: 'review', title: 'Review', limit: 3 },
] as const;

const INITIAL: Record<string, Ticket[]> = {
  backlog: [
    { id: 'DS-38', code: 'DS-38', area: 'Agent handoff', priority: 'low', tags: ['vibl'], title: 'Explore approval cards for agent handoffs', assignees: [ME, AD], meta: 'Since 14 Sep' },
    { id: 'FE-86', code: 'FE-86', area: 'Project board', priority: 'low', tags: ['firstview'], title: 'Add saved views for each project team', assignees: [AD], meta: 'Since 13 Sep' },
    { id: 'BE-23', code: 'BE-23', area: 'Activity API', priority: 'medium', tags: ['vibl'], title: 'Record an audit trail for agent actions', assignees: [RO], meta: 'Since 12 Sep' },
  ],
  todo: [
    { id: 'DS-34', code: 'DS-34', area: 'Foundations', priority: 'high', tags: ['BoardUI'], title: 'Define semantic tokens for elevated surfaces', assignees: [ME], meta: 'Since 12 Sep' },
    { id: 'FE-82', code: 'FE-82', area: 'Composer', priority: 'low', tags: ['firstview'], title: 'Add keyboard navigation to model picker', assignees: [JK, AD], meta: 'Since 11 Sep' },
  ],
  progress: [
    { id: 'FE-79', code: 'FE-79', area: 'Agent progress', priority: 'medium', tags: ['firstview'], title: 'Animate nested task groups as they stream', assignees: [AD, JK], meta: 'Since 9 Sep', comments: 4, due: '18 Sep', dueState: 'soon' },
    { id: 'DS-31', code: 'DS-31', area: 'Dark mode', priority: 'urgent', tags: ['BoardUI'], title: 'Tune chart contrast on dark dashboard cards', assignees: [ME], meta: 'Since 8 Sep' },
  ],
  review: [
    { id: 'FE-76', code: 'FE-76', area: 'Questionnaire', priority: 'low', tags: ['vibl'], title: 'Polish the transition between plan questions', assignees: [JK], meta: 'Since 7 Sep' },
  ],
};

function ColumnMenu({ title, onSort }: { title: string; onSort: (by: 'priority' | 'key') => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const sort = (by: 'priority' | 'key') => {
    onSort(by);
    setIsOpen(false);
  };
  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <DropdownTrigger aria-label={`${title} options`} className={kanbanIconButtonClass}>
        <RiMoreLine aria-hidden className="size-4.5" />
      </DropdownTrigger>
      <DropdownPopover aria-label={`${title} options`} placement="bottom end" className="w-52">
        <DropdownGroup label="Sort">
          <DropdownItem onSelect={() => sort('priority')}>By priority</DropdownItem>
          <DropdownItem onSelect={() => sort('key')}>By ticket key</DropdownItem>
        </DropdownGroup>
      </DropdownPopover>
    </Dropdown>
  );
}

export default function Demo() {
  const [columns, setColumns] = useState(INITIAL);
  const [open, setOpen] = useState<string | null>(null);
  const [log, setLog] = useState('Drag a card, or focus one and press Alt + arrow keys.');
  const [created, setCreated] = useState(0);

  const titleOf = (id: string) => COLUMNS.find((column) => column.id === id)?.title ?? id;

  const onMove = (move: KanbanMove) => {
    setColumns((current) => moveItem(current, move));
    setLog(`Moved ${move.itemId} to ${titleOf(move.to)}, position ${move.index + 1}.`);
  };

  const add = (columnId: string) => {
    const n = created + 1;
    const code = `FE-${90 + n}`;
    setCreated(n);
    setColumns((current) => ({
      ...current,
      [columnId]: [
        { id: code, code, area: 'Untriaged', priority: 'medium', tags: ['firstview'], title: `New ticket ${n}`, meta: 'Just now' },
        ...(current[columnId] ?? []),
      ],
    }));
    setLog(`Added ${code} to ${titleOf(columnId)}.`);
  };

  const sort = (columnId: string, by: 'priority' | 'key') => {
    setColumns((current) => ({
      ...current,
      [columnId]: [...(current[columnId] ?? [])].sort((a, b) =>
        by === 'key' ? a.code.localeCompare(b.code, 'en', { numeric: true }) : PRIORITY_RANK[b.priority ?? 'low'] - PRIORITY_RANK[a.priority ?? 'low'],
      ),
    }));
    setLog(`Sorted ${titleOf(columnId)} by ${by === 'key' ? 'ticket key' : 'priority'}.`);
  };

  return (
    <div data-demo className="flex w-full max-w-[1120px] flex-col gap-3">
      <KanbanBoard aria-label="BoardUI Design Tasks" onMove={onMove} className="h-125 pb-1">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            limit={column.limit}
            onAdd={() => add(column.id)}
            menu={<ColumnMenu title={column.title} onSort={(by) => sort(column.id, by)} />}
          >
            {(columns[column.id] ?? []).map(({ id, ...ticket }) => (
              <KanbanItem key={id} id={id} label={`${ticket.code} ${ticket.title}`}>
                {({ dragState }) => (
                  <KanbanCard
                    {...ticket}
                    dragState={dragState}
                    isSelected={open === id}
                    onPress={() => setOpen((current) => (current === id ? null : id))}
                    actions={<KanbanMoveMenu />}
                  />
                )}
              </KanbanItem>
            ))}
          </KanbanColumn>
        ))}
      </KanbanBoard>
      <p data-log className="px-1.5 text-body-2-regular text-text-secondary">
        {log}
      </p>
    </div>
  );
}
