'use client';

import { useState } from 'react';

import { CheckboxCard } from '@/registry/ui/checkbox-card';

const options = [
  { id: 'mentions', title: 'Mentions', description: 'When someone @mentions you in a comment.' },
  { id: 'digest', title: 'Weekly digest', description: 'A Monday summary of activity in your projects.' },
  { id: 'product', title: 'Product updates', description: 'New features and changes, about once a month.' },
] as const;

type OptionId = (typeof options)[number]['id'];

/* A notification-preferences list: each card is the whole hit target, so a
   click on the description toggles it too. The last card is disabled to show
   the locked state. */
export default function Demo() {
  const [selected, setSelected] = useState<Set<OptionId>>(() => new Set<OptionId>(['mentions', 'digest']));

  const toggle = (id: OptionId, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-2">
      <p className="text-body-medium text-text-primary">Email me about</p>
      {options.map((option) => (
        <CheckboxCard
          key={option.id}
          title={option.title}
          description={option.description}
          isSelected={selected.has(option.id)}
          onChange={(on) => toggle(option.id, on)}
        />
      ))}
      <CheckboxCard
        title="Security alerts"
        description="Always on for workspace owners."
        isSelected
        isDisabled
      />
    </div>
  );
}
