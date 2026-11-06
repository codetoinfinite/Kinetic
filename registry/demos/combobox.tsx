'use client';

import { useState } from 'react';
import type { Key } from 'react-aria-components';
import { RiSearchLine, RiTimeLine } from '@remixicon/react';
import { Avatar } from '@/registry/ui/avatar';
import { ComboBox, ComboBoxItem, ComboBoxSection } from '@/registry/ui/combobox';

/* An issue sidebar: pick an assignee by typing part of a name, and a timezone
   from a sectioned list. Both lists open under the whole field. */
const PEOPLE = [
  { id: 'maya', name: 'Maya Chen', email: 'maya@acme.com', initials: 'MC', color: 'blue' },
  { id: 'mateo', name: 'Mateo Ruiz', email: 'mateo@acme.com', initials: 'MR', color: 'lime' },
  { id: 'amir', name: 'Amir Haddad', email: 'amir@acme.com', initials: 'AH', color: 'pink' },
  { id: 'leo', name: 'Leo Park', email: 'leo@acme.com', initials: 'LP', color: 'neutral' },
  { id: 'sofia', name: 'Sofia Rossi', email: 'sofia@acme.com', initials: 'SR', color: 'blue' },
  { id: 'nia', name: 'Nia Okafor', email: 'nia@acme.com', initials: 'NO', color: 'lime' },
] as const;

const TIMEZONES = [
  {
    title: 'Europe',
    zones: [
      { id: 'lisbon', label: 'Lisbon', offset: 'UTC+0' },
      { id: 'amsterdam', label: 'Amsterdam', offset: 'UTC+1' },
      { id: 'istanbul', label: 'Istanbul', offset: 'UTC+3' },
    ],
  },
  {
    title: 'Americas',
    zones: [
      { id: 'new-york', label: 'New York', offset: 'UTC−5' },
      { id: 'mexico-city', label: 'Mexico City', offset: 'UTC−6' },
      { id: 'sao-paulo', label: 'São Paulo', offset: 'UTC−3' },
    ],
  },
  {
    title: 'Asia Pacific',
    zones: [
      { id: 'singapore', label: 'Singapore', offset: 'UTC+8' },
      { id: 'tokyo', label: 'Tokyo', offset: 'UTC+9' },
      { id: 'sydney', label: 'Sydney', offset: 'UTC+11' },
    ],
  },
];

export default function Demo() {
  const [assignee, setAssignee] = useState<Key | null>('maya');

  return (
    <div className="flex w-full max-w-[600px] flex-wrap items-start justify-center gap-6">
      <ComboBox
        label="Assignee"
        placeholder="Search people"
        leadingIcon={RiSearchLine}
        defaultItems={PEOPLE}
        value={assignee}
        onChange={setAssignee}
        emptyMessage="No one by that name"
        className="w-full max-w-[280px]"
      >
        {(person) => (
          <ComboBoxItem id={person.id} textValue={person.name}>
            <Avatar size="sm" color={person.color} initials={person.initials} />
            <span className="truncate">{person.name}</span>
            <span className="truncate text-body-2-regular text-text-tertiary">{person.email}</span>
          </ComboBoxItem>
        )}
      </ComboBox>

      <ComboBox
        label="Timezone"
        placeholder="Search cities"
        leadingIcon={RiTimeLine}
        menuTrigger="focus"
        hint="Reminders go out at 9:00 in this zone."
        className="w-full max-w-[280px]"
      >
        {TIMEZONES.map((group) => (
          <ComboBoxSection key={group.title} id={group.title} title={group.title}>
            {group.zones.map((zone) => (
              <ComboBoxItem key={zone.id} id={zone.id} textValue={zone.label}>
                <span className="flex-1 truncate">{zone.label}</span>
                <span className="text-body-2-regular text-text-tertiary">{zone.offset}</span>
              </ComboBoxItem>
            ))}
          </ComboBoxSection>
        ))}
      </ComboBox>
    </div>
  );
}
