'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Board Empty State" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { BoardEmptyState } from '@/registry/ui/board-empty-state';
import { KanbanBoard, KanbanColumn, KanbanItem, KanbanMoveMenu, moveItem, type KanbanMove } from '@/registry/ui/kanban-column';
import { KanbanCard, type KanbanCardProps } from '@/registry/ui/kanban-card';
import type { AvatarStackPerson } from '@/registry/ui/avatar-stack';
import { Button } from '@/registry/ui/button';

const AD: AvatarStackPerson = { id: 'ad', name: 'Ana Duarte', description: 'Product design', color: 'pink' };
const JK: AvatarStackPerson = { id: 'jk', name: 'Jonas Keller', description: 'Frontend', color: 'lime' };

type Ticket = Omit<KanbanCardProps, 'onPress' | 'isSelected' | 'dragState' | 'actions'> & { id: string };

const COLUMNS = [
  { id: 'todo', title: 'To do', limit: 5, empty: 'Nothing queued', hint: 'New tickets land here first.' },
  { id: 'progress', title: 'In progress', limit: 4, empty: 'Nothing in progress', hint: 'Drag a ticket here when work starts.' },
  { id: 'review', title: 'Review', limit: 3, empty: 'Nothing to review', hint: 'Finished work queues here.' },
] as const;

const INITIAL: Record<string, Ticket[]> = {
  todo: [],
  progress: [
    { id: 'FE-82', code: 'FE-82', area: 'Composer', priority: 'low', tags: ['firstview'], title: 'Add keyboard navigation to model picker', assignees: [JK, AD], meta: 'Since 11 Sep' },
  ],
  review: [],
};

const EMPTY: Record<string, Ticket[]> = { todo: [], progress: [], review: [] };

export default function Demo() {
  const [columns, setColumns] = useState(INITIAL);
  const [created, setCreated] = useState(0);
  const total = Object.values(columns).reduce((sum, list) => sum + list.length, 0);

  const add = (columnId: string) => {
    const n = created + 1;
    const code = `DS-${40 + n}`;
    setCreated(n);
    setColumns((current) => ({
      ...current,
      [columnId]: [
        { id: code, code, area: 'Untriaged', priority: 'medium', tags: ['BoardUI'], title: `New ticket ${n}`, meta: 'Just now' },
        ...(current[columnId] ?? []),
      ],
    }));
  };

  const onMove = (move: KanbanMove) => setColumns((current) => moveItem(current, move));

  return (
    <div data-demo className="flex w-full max-w-[880px] flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1.5">
        <p className="text-headline-semibold text-text-primary">BoardUI Design Tasks</p>
        <Button variant="secondary" size="small" onClick={() => setColumns(EMPTY)} disabled={total === 0}>
          Clear board
        </Button>
      </div>

      {total === 0 ? (
        <BoardEmptyState
          size="board"
          headingLevel={2}
          title="No tickets yet"
          description="Tickets you create land in To do. Drag them across the board as the work moves."
          onCreate={() => add('todo')}
          className="min-h-80 rounded-2-5xl bg-background-secondary-default"
        />
      ) : (
        <KanbanBoard aria-label="BoardUI Design Tasks" onMove={onMove} className="pb-1">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              limit={column.limit}
              onAdd={() => add(column.id)}
              empty={
                <BoardEmptyState
                  title={column.empty}
                  description={column.hint}
                  createLabel="Add ticket"
                  onCreate={() => add(column.id)}
                  className="rounded-xl"
                />
              }
            >
              {(columns[column.id] ?? []).map(({ id, ...ticket }) => (
                <KanbanItem key={id} id={id} label={`${ticket.code} ${ticket.title}`}>
                  {({ dragState }) => <KanbanCard {...ticket} dragState={dragState} actions={<KanbanMoveMenu />} />}
                </KanbanItem>
              ))}
            </KanbanColumn>
          ))}
        </KanbanBoard>
      )}
    </div>
  );
}
