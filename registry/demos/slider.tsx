'use client';

import { useState } from 'react';
import { I18nProvider } from 'react-aria-components';
import { RangeSlider, Slider } from '@/registry/ui/slider';

/* A notification-settings panel: a single volume slider and a monthly budget
   range, both controlled so the summary line follows every drag. */
export default function Demo() {
  const [volume, setVolume] = useState(62);
  const [budget, setBudget] = useState<number[]>([1200, 3600]);
  const [low = 0, high = 0] = budget;

  // React Aria formats dates and numbers in the browser's language; pin it to
  // en-US so the values match this demo's English copy and the server render.
  return (
    <I18nProvider locale="en-US">
      <div className="flex w-full max-w-[360px] flex-col gap-8">
        <Slider label="Alert volume" value={volume} onChange={setVolume} thumbLabel="Alert volume" />
        <RangeSlider
          label="Monthly budget"
          value={budget}
          onChange={setBudget}
          minValue={0}
          maxValue={5000}
          step={100}
          thumbLabels={['Minimum budget', 'Maximum budget']}
          formatValue={(value) => `$${value.toLocaleString('en-US')}`}
        />
        <p className="text-body-2-regular text-text-secondary">
          Alerts play at <span className="text-text-primary tabular-nums">{volume}%</span>, and spend between{' '}
          <span className="text-text-primary tabular-nums">${low.toLocaleString('en-US')}</span> and{' '}
          <span className="text-text-primary tabular-nums">${high.toLocaleString('en-US')}</span> is approved.
        </p>
      </div>
    </I18nProvider>
  );
}
