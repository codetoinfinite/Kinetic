'use client';

import { useState } from 'react';
import { RiAddLine, RiSubtractLine } from '@remixicon/react';
import { I18nProvider } from 'react-aria-components';

import { Button } from '@/registry/ui/button';
import { Meter, type MeterTone } from '@/registry/ui/meter';

/* A workspace usage card, as on BoardUI's tile: meters filling towards their
   limits, each tone chosen by the caller. The seats row is live, so the fill
   eases and the tone turns amber, then red, as the plan fills up. */
const MAX_SEATS = 20;

function seatTone(seats: number): MeterTone {
  if (seats >= MAX_SEATS) return 'error';
  if (seats >= 17) return 'warning';
  return 'accent';
}

export default function Demo() {
  const [seats, setSeats] = useState(14);
  const left = MAX_SEATS - seats;

  // React Aria formats dates and numbers in the browser's language; pin it to
  // en-US so the values match this demo's English copy and the server render.
  return (
    <I18nProvider locale="en-US">
      <section
        aria-label="Workspace usage"
        className="flex w-full max-w-[360px] flex-col gap-5 rounded-2xl border border-border-table bg-background-primary-default p-5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-headline-semibold text-text-primary">Usage</h3>
          <span className="text-caption-1-medium text-text-tertiary">Team plan · resets Dec 1</span>
        </div>

        <Meter label="Storage" value={72} valueLabel="7.2 of 10 GB" />

        <div className="flex items-end gap-3">
          <Meter
            className="flex-1"
            label="Seats"
            value={seats}
            maxValue={MAX_SEATS}
            valueLabel={`${seats} of ${MAX_SEATS}`}
            tone={seatTone(seats)}
            description={left === 0 ? 'No seats left. Upgrade to invite more.' : `${left} ${left === 1 ? 'seat' : 'seats'} left`}
          />
          <div className="mb-5 flex shrink-0 gap-1">
            <Button
              variant="secondary"
              size="small"
              iconOnly
              leadingIcon={RiSubtractLine}
              aria-label="Remove a seat"
              onClick={() => setSeats((s) => Math.max(0, s - 1))}
            />
            <Button
              variant="secondary"
              size="small"
              iconOnly
              leadingIcon={RiAddLine}
              aria-label="Add a seat"
              onClick={() => setSeats((s) => Math.min(MAX_SEATS, s + 1))}
            />
          </div>
        </div>

        <Meter label="API requests" value={96} tone="error" description="96,000 of 100,000 this month" />
        <Meter label="Automations" value={38} tone="success" size="sm" />
      </section>
    </I18nProvider>
  );
}
