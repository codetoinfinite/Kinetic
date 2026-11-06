'use client';

import { useState } from 'react';
import { Avatar } from '@/registry/ui/avatar';
import { StatusDot } from '@/registry/ui/status-dot';
import { Switch } from '@/registry/ui/switch';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/registry/ui/table';

/* BoardUI's members table: a name column that heads each row, a role, a
   status with its dot, and a quiet last-active column. The switch flips the
   density flag so the padding transition is visible. */
type Status = 'active' | 'invited' | 'away';

const STATUS: Record<Status, { label: string; color: 'green' | 'yellow' | 'indigo' }> = {
  active: { label: 'Active', color: 'green' },
  invited: { label: 'Invited', color: 'indigo' },
  away: { label: 'Away', color: 'yellow' },
};

const MEMBERS: {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: 'neutral' | 'blue' | 'lime' | 'pink';
  role: string;
  status: Status;
  lastActive: string;
}[] = [
  { id: 'olivia', name: 'Olivia Rhye', email: 'olivia@boardly.co', initials: 'OR', color: 'blue', role: 'Product Designer', status: 'active', lastActive: '2 min ago' },
  { id: 'phoenix', name: 'Phoenix Baker', email: 'phoenix@boardly.co', initials: 'PB', color: 'lime', role: 'Engineer', status: 'active', lastActive: '18 min ago' },
  { id: 'lana', name: 'Lana Steiner', email: 'lana@boardly.co', initials: 'LS', color: 'pink', role: 'Design Lead', status: 'invited', lastActive: 'Never' },
  { id: 'demi', name: 'Demi Wilkinson', email: 'demi@boardly.co', initials: 'DW', color: 'neutral', role: 'Frontend Engineer', status: 'away', lastActive: 'Yesterday' },
  { id: 'candice', name: 'Candice Wu', email: 'candice@boardly.co', initials: 'CW', color: 'blue', role: 'Customer Success', status: 'active', lastActive: '1 hr ago' },
];

export default function Demo() {
  const [compact, setCompact] = useState(false);

  return (
    <div className="flex w-full items-center justify-center p-4 sm:p-8">
      <section
        aria-labelledby="members-title"
        className="w-full max-w-[760px] overflow-hidden rounded-2xl border border-border-table bg-background-primary-default"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <h3 id="members-title" className="text-headline-semibold text-text-primary">
              Team members
            </h3>
            <p className="text-caption-1-medium text-text-tertiary">5 people in Boardly Workspace</p>
          </div>
          <Switch size="sm" isSelected={compact} onChange={setCompact}>
            Compact rows
          </Switch>
        </header>

        <Table aria-labelledby="members-title" size={compact ? 'sm' : 'md'}>
          <TableHeader>
            <TableColumn id="name" isRowHeader>
              Name
            </TableColumn>
            <TableColumn id="role">Role</TableColumn>
            <TableColumn id="status">Status</TableColumn>
            <TableColumn id="active">Last active</TableColumn>
          </TableHeader>
          <TableBody>
            {MEMBERS.map((member) => (
              <TableRow key={member.id} id={member.id} textValue={member.name}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar size={compact ? 'sm' : 'md'} color={member.color} initials={member.initials} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="truncate whitespace-nowrap">{member.name}</div>
                      <div className="truncate whitespace-nowrap text-caption-1-medium text-text-tertiary">{member.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="whitespace-nowrap text-text-secondary">{member.role}</span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <StatusDot color={STATUS[member.status].color} aria-hidden="true" />
                    {STATUS[member.status].label}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="whitespace-nowrap tabular-nums text-text-tertiary">{member.lastActive}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
