'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Priority Badge" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */

import { useMemo, useState } from 'react';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  PRIORITY_RANK,
  PriorityBadge,
  PriorityGlyph,
  type Priority,
} from '@/registry/ui/priority-badge';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';
import { cx } from '@/registry/lib/cx';

type Ticket = { id: string; title: string; priority: Priority; since: number };

const TICKETS: Ticket[] = [
  { id: 'DS-38', title: 'Explore approval cards for agent handoffs', priority: 'low', since: 14 },
  { id: 'DS-34', title: 'Define semantic tokens for elevated surfaces', priority: 'high', since: 12 },
  { id: 'BE-23', title: 'Record an audit trail for agent actions', priority: 'medium', since: 12 },
  { id: 'FE-82', title: 'Add keyboard navigation to model picker', priority: 'low', since: 11 },
  { id: 'DS-31', title: 'Tune chart contrast on dark dashboard cards', priority: 'urgent', since: 8 },
];

export default function Demo() {
  const [tickets, setTickets] = useState(TICKETS);
  const [sort, setSort] = useState<'priority' | 'recent'>('priority');
  const [selectedId, setSelectedId] = useState('FE-82');

  const ordered = useMemo(() => {
    const copy = [...tickets];
    copy.sort((a, b) =>
      sort === 'priority' ? PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || b.since - a.since : b.since - a.since,
    );
    return copy;
  }, [tickets, sort]);

  const selected = tickets.find((t) => t.id === selectedId);

  const setPriority = (priority: Priority) =>
    setTickets((list) => list.map((t) => (t.id === selectedId ? { ...t, priority } : t)));

  return (
    <div className="flex w-full max-w-[880px] flex-col gap-4 md:flex-row md:items-start">
      {/* Every level in the three looks the kit ships. */}
      <section
        aria-label="Priority levels"
        className="hidden shrink-0 flex-col gap-3 rounded-2-5xl bg-background-secondary-default p-4 md:flex md:w-[340px]"
      >
        <h3 className="text-body-medium text-text-primary">Levels</h3>
        <div className="grid grid-cols-[auto_auto_auto_auto] items-center justify-start justify-items-start gap-x-2 gap-y-3 rounded-xl bg-background-primary-default p-2.5 shadow-card sm:gap-x-3 sm:p-3">
          {PRIORITIES.map((p) => (
            <div key={p} className="contents">
              <PriorityBadge priority={p} />
              <PriorityBadge priority={p} showIcon={false} />
              <PriorityBadge priority={p} variant="plain" size="sm" />
              <PriorityBadge priority={p} iconOnly size="sm" />
            </div>
          ))}
        </div>
        <p className="text-caption-1-regular text-text-secondary">
          Bars fill one, two or three steps; urgent swaps them for an alert tile, so the level reads without colour.
        </p>
      </section>

      {/* A triage queue: pick a ticket, change its priority, watch the sort. */}
      <section
        aria-label="Triage queue"
        data-demo
        className="flex min-w-0 flex-1 flex-col gap-3 rounded-2-5xl bg-background-secondary-default p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-body-medium text-text-primary">
            Triage <span className="text-text-secondary">{tickets.length}</span>
          </h3>
          <SegmentedControl
            aria-label="Sort tickets"
            selectedKeys={[sort]}
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (next === 'priority' || next === 'recent') setSort(next);
            }}
          >
            <SegmentedControlItem id="priority">Priority</SegmentedControlItem>
            <SegmentedControlItem id="recent">Recent</SegmentedControlItem>
          </SegmentedControl>
        </div>

        <ul aria-label="Tickets" className="flex flex-col gap-1.5">
          {ordered.map((t) => {
            const isSelected = t.id === selectedId;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${t.id} ${t.title}`}
                  onClick={() => setSelectedId(t.id)}
                  className={cx(
                    'flex w-full cursor-pointer items-center gap-3 rounded-xl bg-background-primary-default px-3 py-2.5 text-start shadow-card',
                    'outline-none transition-[box-shadow,background-color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-border-focus-ring',
                    'motion-reduce:transition-none',
                    isSelected ? 'ring-2 ring-accent-400' : 'hover:bg-background-primary-hover',
                  )}
                >
                  <span className="w-12 shrink-0 text-body-2-regular text-text-secondary">{t.id}</span>
                  <span className="min-w-0 flex-1 truncate text-body-medium text-text-primary">{t.title}</span>
                  <PriorityBadge priority={t.priority} data-ticket={t.id} />
                </button>
              </li>
            );
          })}
        </ul>

        <div
          role="group"
          aria-label={`Priority for ${selected?.id ?? 'ticket'}`}
          className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border-button-default bg-background-primary-default p-1.5"
        >
          <span className="px-1.5 text-body-2-regular text-text-secondary">{selected?.id}</span>
          {PRIORITIES.map((p) => {
            const checked = selected?.priority === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={checked}
                onClick={() => setPriority(p)}
                className={cx(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-body-regular',
                  'outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none',
                  checked
                    ? 'bg-background-tertiary-default text-text-primary'
                    : 'text-text-secondary hover:bg-background-primary-hover hover:text-text-primary',
                )}
              >
                <PriorityGlyph
                  priority={p}
                  className={cx(
                    p === 'urgent' && 'text-status-rose-text',
                    p === 'high' && 'text-status-orange-text',
                    p === 'medium' && 'text-status-yellow-text',
                    p === 'low' && 'text-status-blue-text',
                  )}
                />
                {PRIORITY_LABELS[p]}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
