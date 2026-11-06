'use client';

import { useId, useState } from 'react';

import { Radio, RadioGroup } from '@/registry/ui/radio';

/* BoardUI's preview is the Weekly / Monthly / Yearly group. Next to it, the
   small size as used in the AI chat model picker, with one locked option. */
export default function Demo() {
  const [frequency, setFrequency] = useState('weekly');
  const [model, setModel] = useState('balanced');
  const frequencyId = useId();
  const modelId = useId();

  return (
    <div className="flex flex-wrap items-start justify-center gap-x-16 gap-y-8">
      <div className="flex flex-col gap-3">
        <p id={frequencyId} className="text-caption-1-medium text-text-tertiary">
          Report frequency
        </p>
        <RadioGroup
          aria-labelledby={frequencyId}
          value={frequency}
          onChange={setFrequency}
          className="gap-3"
        >
          <Radio value="weekly">Weekly</Radio>
          <Radio value="monthly">Monthly</Radio>
          <Radio value="yearly">Yearly</Radio>
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-3">
        <p id={modelId} className="text-caption-1-medium text-text-tertiary">
          Model
        </p>
        <RadioGroup aria-labelledby={modelId} value={model} onChange={setModel} className="gap-2.5">
          <Radio size="sm" value="fast">
            Fast
          </Radio>
          <Radio size="sm" value="balanced">
            Balanced
          </Radio>
          <Radio size="sm" value="deep" isDisabled>
            Deep reasoning (Pro)
          </Radio>
        </RadioGroup>
      </div>
    </div>
  );
}
