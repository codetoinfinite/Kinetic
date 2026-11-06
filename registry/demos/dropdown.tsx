'use client';

import { useState } from 'react';
import { RiAddFill, RiArrowDownSLine, RiCheckLine, RiEqualizer3Line } from '@remixicon/react';

import { Avatar } from '@/registry/ui/avatar';
import { Button } from '@/registry/ui/button';
import { Dropdown, DropdownDivider, DropdownGroup, DropdownItem, DropdownPopover, DropdownTrigger } from '@/registry/ui/dropdown';

/* The account menu from BoardUI's dashboard sidebar: an avatar-stack
   trigger, a "Users with access" group of avatar rows (the picked row keeps
   the hover pill), a full-bleed divider, then a footer of buttons. Open
   state is controlled so the chevron can turn and every action can close
   the panel. Buttons sit outside the rows: a row is itself a <button>. */

const USERS = [
  { initials: 'JL', name: 'Jordan Lee', color: 'neutral' },
  { initials: 'SR', name: 'Steven Raule', color: 'lime' },
  { initials: 'LP', name: 'Lauren Proso', color: 'pink' },
] as const;

export default function Demo() {
  const [isOpen, setIsOpen] = useState(false);
  const [owner, setOwner] = useState<string>(USERS[0].name);

  return (
    <div className="flex flex-col items-center gap-4">
      <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
        <DropdownTrigger className="flex items-center gap-2 rounded-xl border border-border-button-default bg-background-primary-default py-1.5 ps-2 pe-2.5 shadow-xs">
          <span aria-hidden className="flex -space-x-1.5 rtl:space-x-reverse">
            {USERS.map((user) => (
              <Avatar
                key={user.initials}
                size="sm"
                color={user.color}
                initials={user.initials}
                className="ring-2 ring-background-primary-default"
              />
            ))}
          </span>
          <span className="text-body-medium text-text-primary">Team access</span>
          <RiArrowDownSLine
            aria-hidden
            className={`size-4 text-foreground-icon-secondary transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          />
        </DropdownTrigger>

        <DropdownPopover aria-label="Team access">
          <DropdownGroup label="Users with access">
            {USERS.map((user) => (
              <DropdownItem
                key={user.initials}
                selected={owner === user.name}
                onSelect={() => {
                  setOwner(user.name);
                  setIsOpen(false);
                }}
              >
                <Avatar size="xs" color={user.color} initials={user.initials} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-body-medium">{user.name}</span>
                {owner === user.name ? (
                  <RiCheckLine aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />
                ) : null}
              </DropdownItem>
            ))}
          </DropdownGroup>
          <DropdownDivider />
          <div className="flex gap-3 px-2 pb-2">
            <Button variant="secondary" size="small" leadingIcon={RiAddFill} className="flex-1" onClick={() => setIsOpen(false)}>
              Add user
            </Button>
            <Button variant="secondary" size="small" leadingIcon={RiEqualizer3Line} className="flex-1" onClick={() => setIsOpen(false)}>
              Manage
            </Button>
          </div>
        </DropdownPopover>
      </Dropdown>

      <p aria-live="polite" className="text-body-2-regular text-text-tertiary">
        Owner: {owner}
      </p>
    </div>
  );
}
