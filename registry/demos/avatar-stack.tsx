'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Avatar Stack" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { AvatarStack, type AvatarStackPerson, type AvatarStackSize } from '@/registry/ui/avatar-stack';
import { Checkbox } from '@/registry/ui/checkbox';

const TEAM: AvatarStackPerson[] = [
  { id: 'me', name: 'Mertcan Esmergul', description: 'Design lead' },
  { id: 'ad', name: 'Ana Duarte', description: 'Product design' },
  { id: 'jk', name: 'Jonas Keller', description: 'Frontend' },
  { id: 'ls', name: 'Lina Sato', description: 'Frontend' },
  { id: 'ro', name: 'Rafael Ortiz', description: 'Backend' },
  { id: 'pn', name: 'Priya Nair', description: 'QA' },
  { id: 'tb', name: 'Tom Becker', description: 'Research' },
];

const SIZES: { size: AvatarStackSize; label: string; count: number }[] = [
  { size: 'xs', label: 'xs · 20px', count: 2 },
  { size: 'sm', label: 'sm · 24px', count: 4 },
  { size: 'md', label: 'md · 32px', count: 5 },
  { size: 'lg', label: 'lg · 36px', count: 7 },
];

export default function Demo() {
  const [assigned, setAssigned] = useState<string[]>(['me', 'ad', 'jk', 'ls', 'pn']);
  const [expanded, setExpanded] = useState(false);
  const people = TEAM.filter((p) => assigned.includes(p.id ?? p.name));

  const toggle = (id: string, on: boolean) =>
    setAssigned((list) => (on ? TEAM.map((p) => p.id ?? p.name).filter((x) => x === id || list.includes(x)) : list.filter((x) => x !== id)));

  return (
    <div className="flex w-full max-w-[760px] flex-col gap-4 sm:flex-row sm:items-start">
      <section
        aria-label="Sizes"
        className="hidden shrink-0 flex-col gap-3 rounded-2-5xl bg-background-secondary-default p-4 sm:flex sm:w-[260px]"
      >
        <h3 className="text-body-medium text-text-primary">Sizes</h3>
        <ul className="flex flex-col gap-1.5">
          {SIZES.map(({ size, label, count }) => (
            <li
              key={size}
              className="flex items-center justify-between gap-3 rounded-xl bg-background-primary-default px-3 py-2.5 shadow-card"
            >
              <span className="text-body-2-regular text-text-secondary">{label}</span>
              <AvatarStack people={TEAM.slice(0, count)} size={size} max={3} label={`${label} stack`} />
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label="Ticket assignees"
        data-demo
        className="flex min-w-0 flex-1 flex-col gap-3 rounded-2-5xl bg-background-secondary-default p-3 sm:p-4"
      >
        <div className="flex flex-col gap-3 rounded-xl bg-background-primary-default p-3 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-body-regular text-text-secondary">
              DS-27 <span aria-hidden>›</span> Avatars
            </span>
            <AvatarStack
              people={people}
              size="sm"
              max={expanded ? TEAM.length : 3}
              onOverflowPress={() => setExpanded(true)}
              data-testid="ticket-stack"
            />
          </div>
          <p className="text-body-medium text-text-primary">Ship overlapping avatar groups for cards</p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-body-regular text-text-secondary" aria-live="polite">
              {people.length === 0 ? 'Unassigned' : `${people.length} assigned`}
            </span>
            {expanded && people.length > 4 && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="cursor-pointer rounded-md px-1.5 py-0.5 text-body-2-medium text-text-secondary outline-none hover:bg-background-primary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
              >
                Collapse
              </button>
            )}
          </div>
        </div>

        <fieldset className="flex flex-col gap-1 rounded-xl border border-border-button-default bg-background-primary-default p-2">
          <legend className="sr-only">Assign teammates</legend>
          {TEAM.map((p) => {
            const id = p.id ?? p.name;
            return (
              <div key={id} className="flex items-center justify-between gap-3 rounded-lg px-1.5 py-1 hover:bg-background-primary-hover">
                <Checkbox isSelected={assigned.includes(id)} onChange={(on) => toggle(id, on)} size="sm">
                  <span className="text-body-regular text-text-primary">{p.name}</span>
                </Checkbox>
                <span className="text-caption-1-regular text-text-tertiary">{p.description}</span>
              </div>
            );
          })}
        </fieldset>
      </section>
    </div>
  );
}
