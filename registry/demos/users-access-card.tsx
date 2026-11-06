'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Users Access Card" (boardui.com/).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { UsersAccessCard, type AccessUser } from '@/registry/ui/users-access-card';

/* A workspace's members: the owner row is locked, the others change role
   from the select or leave with the × button. The invite field checks the
   address (empty, malformed, already a member) before adding a row. */
const TEAM: AccessUser[] = [
  { id: 'ava', name: 'Ava Lindqvist', email: 'ava.lindqvist@example.com', role: 'Owner', color: 'pink', locked: true },
  { id: 'jon', name: 'Jon Park', email: 'jon.park@example.com', role: 'admin', color: 'blue' },
  { id: 'priya', name: 'Priya Nair', email: 'priya.nair@example.com', role: 'editor', color: 'lime' },
  { id: 'leo', name: 'Leo Martins', email: 'leo.martins@example.com', role: 'viewer', invited: true },
];

export default function Demo() {
  const [users, setUsers] = useState(TEAM);
  const admins = users.filter((u) => u.role === 'admin' || u.locked).length;

  return (
    <div className="flex w-full max-w-[460px] flex-col gap-3">
      <UsersAccessCard users={users} onUsersChange={setUsers} />
      <p className="px-1 text-caption-1-medium text-text-tertiary">
        {admins} with admin rights · try inviting jon.park@example.com twice
      </p>
    </div>
  );
}
