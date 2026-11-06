'use client';

import { useState } from 'react';
import { Time } from '@internationalized/date';
import { I18nProvider } from 'react-aria-components';

import { TimeField } from '@/registry/ui/time-field';

/* Opening hours as BoardUI previews it (Opens / Closes, 12-hour), plus the two
   variants the field adds: a 24-hour time with seconds, and a bounded slot
   that turns red as soon as it leaves its range. */
export default function Demo() {
  const [opens, setOpens] = useState<Time | null>(new Time(9, 0));
  const [closes, setCloses] = useState<Time | null>(new Time(18, 0));
  const [lastBooking, setLastBooking] = useState<Time | null>(new Time(17, 0));

  // React Aria formats dates and numbers in the browser's language; pin it to
  // en-US so the values match this demo's English copy and the server render.
  return (
    <I18nProvider locale="en-US">
      <div className="grid w-full max-w-[520px] grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <TimeField label="Opens" hourCycle={12} value={opens} onChange={setOpens} />
        <TimeField label="Closes" hourCycle={12} value={closes} onChange={setCloses} />
        <TimeField
          label="Backup runs at"
          hourCycle={24}
          granularity="second"
          defaultValue={new Time(2, 30, 15)}
          hint="Server time, 24-hour"
        />
        <TimeField
          label="Last booking"
          hourCycle={12}
          value={lastBooking}
          onChange={setLastBooking}
          minValue={new Time(9, 0)}
          maxValue={new Time(17, 30)}
          validationBehavior="aria"
          hint="Between 9:00 AM and 5:30 PM"
        />
      </div>
    </I18nProvider>
  );
}
