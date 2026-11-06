'use client';

import { useId, useState } from 'react';

import { RadioGroup } from '@/registry/ui/radio';
import { RadioCard } from '@/registry/ui/radio-card';

/* A plan picker: the cards are radios in one group, so a click anywhere on a
   card selects it, Tab enters the group once and the arrow keys move between
   plans. Enterprise is disabled to show the locked state. */
export default function Demo() {
  const [plan, setPlan] = useState('team');
  const labelId = useId();

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-2">
      <p id={labelId} className="text-body-medium text-text-primary">
        Choose a plan
      </p>
      <RadioGroup aria-labelledby={labelId} value={plan} onChange={setPlan}>
        <RadioCard value="starter" title="Starter" description="Free for up to 3 members and 2 projects." />
        <RadioCard value="team" title="Team" description="$12 per member a month, unlimited projects." />
        <RadioCard value="business" title="Business" description="$24 per member a month, SSO and audit log." />
        <RadioCard
          value="enterprise"
          title="Enterprise"
          description="Custom contract. Contact sales to enable."
          isDisabled
        />
      </RadioGroup>
    </div>
  );
}
