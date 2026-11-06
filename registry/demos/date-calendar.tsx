'use client';

import { useState } from 'react';
import { parseDate } from '@internationalized/date';
import type { CalendarDate, DateValue } from '@internationalized/date';
import { I18nProvider } from 'react-aria-components';

import { DateCalendar, DateRangeCalendar } from '@/registry/ui/date-calendar';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function short(date: CalendarDate) {
  return `${date.day} ${MONTHS[date.month - 1] ?? ''}`;
}

/* Delivery slots already full: still focusable, struck through, not pickable. */
const FULL_DAYS = new Set(['2026-03-12', '2026-03-13', '2026-03-24']);

function isFull(date: DateValue) {
  return FULL_DAYS.has(date.toString().slice(0, 10));
}

/* The two calendars side by side as the kit shows them: a single delivery
   date with fully-booked days struck out, and a one-month range for a stay.
   Every date is fixed, and today's dot is off, so server and client render
   the same month. */
export default function Demo() {
  const [delivery, setDelivery] = useState<CalendarDate>(parseDate('2026-03-18'));
  const [stay, setStay] = useState<{ start: CalendarDate; end: CalendarDate }>({
    start: parseDate('2026-04-09'),
    end: parseDate('2026-04-13'),
  });
  const nights = stay.end.compare(stay.start);

  // React Aria formats dates and numbers in the browser's language; pin it to
  // en-US so the values match this demo's English copy and the server render.
  return (
    <I18nProvider locale="en-US">
      <div className="flex flex-wrap items-start justify-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <DateCalendar
            aria-label="Delivery date"
            value={delivery}
            onChange={setDelivery}
            minValue={parseDate('2026-03-05')}
            isDateUnavailable={isFull}
            showToday={false}
          />
          <p className="text-body-medium text-text-secondary">
            Delivery on <span className="text-text-primary">{short(delivery)} {delivery.year}</span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <DateRangeCalendar
            aria-label="Stay"
            visibleMonths={1}
            value={stay}
            onChange={setStay}
            showToday={false}
          />
          <p className="text-body-medium text-text-secondary">
            <span className="text-text-primary">
              {nights} {nights === 1 ? 'night' : 'nights'}
            </span>{' '}
            · {short(stay.start)} – {short(stay.end)}
          </p>
        </div>
      </div>
    </I18nProvider>
  );
}
