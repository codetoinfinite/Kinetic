'use client';

import { useState } from 'react';

import { Checkbox } from '@/registry/ui/checkbox';

const CHANNELS = [
  { id: 'email', label: 'Email' },
  { id: 'push', label: 'Push notifications' },
  { id: 'sms', label: 'Text messages' },
] as const;

type ChannelId = (typeof CHANNELS)[number]['id'];

/* A parent checkbox driving three children: with some (not all) channels on
   it shows the indeterminate dash, and pressing it selects every channel.
   Below, the 14px size and the disabled state. */
export default function Demo() {
  const [selected, setSelected] = useState<Set<ChannelId>>(() => new Set<ChannelId>(['email']));
  const [compact, setCompact] = useState(true);

  const all = selected.size === CHANNELS.length;
  const some = selected.size > 0 && !all;

  const toggle = (id: ChannelId, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleAll = (on: boolean) =>
    setSelected(on ? new Set<ChannelId>(CHANNELS.map((channel) => channel.id)) : new Set<ChannelId>());

  return (
    <div className="flex w-full max-w-[360px] flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-4">
        <Checkbox isSelected={all} isIndeterminate={some} onChange={toggleAll}>
          Notify me on every channel
        </Checkbox>
        <div role="group" aria-label="Channels" className="flex flex-col gap-3 ps-6">
          {CHANNELS.map((channel) => (
            <Checkbox
              key={channel.id}
              isSelected={selected.has(channel.id)}
              onChange={(on) => toggle(channel.id, on)}
            >
              {channel.label}
            </Checkbox>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-1">
        <Checkbox size="sm" isSelected={compact} onChange={setCompact}>
          Compact rows
        </Checkbox>
        <Checkbox size="sm" defaultSelected isDisabled>
          Required by admin
        </Checkbox>
      </div>

      <p className="px-1 text-body-2-regular text-text-secondary">
        {selected.size === 0
          ? 'No channels on: alerts stay in the app.'
          : `${selected.size} of ${CHANNELS.length} channels on${compact ? ', compact rows' : ''}.`}
      </p>
    </div>
  );
}
