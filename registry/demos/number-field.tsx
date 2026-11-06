'use client';

import { useState } from 'react';
import { I18nProvider } from 'react-aria-components';

import { NumberField } from '@/registry/ui/number-field';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/* A seat-based plan editor: seats, price per seat and a discount, each a
   number field with its own formatting and limits, feeding a monthly total. */
export default function Demo() {
  const [seats, setSeats] = useState(5);
  const [price, setPrice] = useState(12);
  const [discount, setDiscount] = useState(0.1);

  const ready = [seats, price, discount].every((n) => Number.isFinite(n));
  const total = ready ? seats * price * (1 - discount) : null;

  // React Aria formats dates and numbers in the browser's language; pin it to
  // en-US so the values match this demo's English copy and the server render.
  return (
    <I18nProvider locale="en-US">
      <div className="flex w-full max-w-[640px] flex-col gap-5 rounded-2lg border border-border-button-default bg-background-primary-default p-5 shadow-xs">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NumberField
            label="Seats"
            value={seats}
            onChange={setSeats}
            minValue={1}
            maxValue={50}
            hint="Between 1 and 50."
          />
          <NumberField
            label="Price per seat"
            value={price}
            onChange={setPrice}
            minValue={0}
            step={1}
            formatOptions={{ style: 'currency', currency: 'USD' }}
          />
          <NumberField
            label="Discount"
            value={discount}
            onChange={setDiscount}
            minValue={0}
            maxValue={0.5}
            step={0.05}
            formatOptions={{ style: 'percent' }}
            hint="Up to 50%."
          />
        </div>
        <div className="flex items-center justify-between border-t border-separator-border pt-4">
          <span className="text-body-regular text-text-secondary">Monthly total</span>
          <span className="text-body-semibold text-text-primary tabular-nums">
            {total === null ? '—' : USD.format(total)}
          </span>
        </div>
      </div>
    </I18nProvider>
  );
}
