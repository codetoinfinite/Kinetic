'use client';

import { useState } from 'react';
import { parseDate } from '@internationalized/date';
import type { CalendarDate } from '@internationalized/date';
import { I18nProvider } from 'react-aria-components';

import { DatePicker } from '@/registry/ui/date-picker';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function label(date: CalendarDate | null) {
  return date ? `${date.day} ${MONTHS[date.month - 1] ?? ''}` : 'Not scheduled';
}

const CHANNELS = [
  { name: 'Blog post', time: '09:00' },
  { name: 'Newsletter', time: '10:30' },
  { name: 'LinkedIn', time: '12:00' },
] as const;

/* A publishing card with the picker in its header, as BoardUI uses it in a
   scheduling surface. The card sits at the top of a tall frame so the popover
   (one month plus a footer) has room to open below the trigger. The rows below
   only follow the committed value, so they change on Apply, not on each click
   in the month. */
export default function Demo() {
  const [publish, setPublish] = useState<CalendarDate | null>(parseDate('2026-03-18'));

  // React Aria formats dates and numbers in the browser's language; pin it to
  // en-US so the values match this demo's English copy and the server render.
  return (
    <I18nProvider locale="en-US">
      <div className="flex min-h-[480px] w-full justify-center">
        <div className="h-fit w-full max-w-[440px] rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-body-semibold text-text-primary">Spring launch announcement</span>
              <span className="text-caption-1-regular text-text-secondary">Publish date</span>
            </div>
            <DatePicker aria-label="Publish date" value={publish} onChange={setPublish} />
          </div>

          <ul className="mt-4 flex flex-col divide-y divide-border-button-default border-y border-border-button-default">
            {CHANNELS.map((channel) => (
              <li key={channel.name} className="flex items-center justify-between py-2.5">
                <span className="text-body-medium text-text-primary">{channel.name}</span>
                <span className="text-body-regular text-text-secondary">
                  {label(publish)}
                  {publish ? ` · ${channel.time}` : ''}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-body-medium text-text-primary">Press embargo</span>
              <span className="text-caption-1-regular text-text-secondary">Locked by the comms team</span>
            </div>
            <DatePicker aria-label="Press embargo" defaultValue={parseDate('2026-03-16')} isDisabled />
          </div>
        </div>
      </div>
    </I18nProvider>
  );
}
