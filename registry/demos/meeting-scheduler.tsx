'use client';

import { useState } from 'react';
import { CalendarDate, getDayOfWeek } from '@internationalized/date';
import { RiCheckboxCircleFill, RiTimeLine } from '@remixicon/react';
import { I18nProvider } from 'react-aria-components';

import { MeetingScheduler } from '@/registry/ui/meeting-scheduler';
import type { MeetingSchedulerValue } from '@/registry/ui/meeting-scheduler';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* Formatted by hand so the server and the browser print the same string. */
function formatBooking({ date, time }: MeetingSchedulerValue) {
  return `${WEEKDAYS[getDayOfWeek(date, 'en-US')]}, ${MONTHS[date.month - 1]} ${date.day} at ${time}`;
}

const STEPS = [
  { id: 'workspace', title: 'Workspace created', detail: 'northwind.boardui.app' },
  { id: 'billing', title: 'Billing connected', detail: 'Business plan, 24 seats' },
];

/* An onboarding checklist whose last step is booked through the scheduler.
   The trigger sits at the end of the header, where its right-aligned panel
   has room to open downward. */
export default function Demo() {
  const [booking, setBooking] = useState<MeetingSchedulerValue | null>({
    date: new CalendarDate(2026, 3, 19),
    time: null,
  });
  const booked = booking?.time ? booking : null;

  // React Aria formats dates and numbers in the browser's language; pin it to
  // en-US so the values match this demo's English copy and the server render.
  return (
    <I18nProvider locale="en-US">
      <div className="flex min-h-[500px] w-full justify-center">
        <section className="flex h-fit w-full max-w-[760px] flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-body-semibold text-text-primary">Northwind onboarding</span>
              <span className="text-caption-1-regular text-text-tertiary">
                {booked ? '3 of 3 steps ready' : '2 of 3 steps ready'}
              </span>
            </div>
            <MeetingScheduler
              triggerLabel={booked ? 'Reschedule kickoff' : 'Book kickoff'}
              aria-label="Book kickoff call"
              timezone="London"
              host={{ name: 'Maya Patel', email: 'maya@boardui.app', avatarInitial: 'M' }}
              meeting={{
                title: 'Kickoff call',
                description: 'Walk through your workspace and agree on a launch date.',
                durationMinutes: 45,
                language: 'English',
                conferencing: 'Google Meet',
              }}
              value={booking}
              onChange={setBooking}
            />
          </div>

          <ul className="flex flex-col gap-1">
            {STEPS.map((step) => (
              <li key={step.id} className="flex items-center gap-3 rounded-xl bg-background-secondary-default px-3 py-2.5">
                <RiCheckboxCircleFill className="size-5 shrink-0 text-accent-500" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-body-medium text-text-primary">{step.title}</span>
                <span className="hidden text-body-2-regular text-text-secondary sm:inline">{step.detail}</span>
              </li>
            ))}
            <li className="flex items-center gap-3 rounded-xl bg-background-secondary-default px-3 py-2.5">
              {booked ? (
                <RiCheckboxCircleFill className="size-5 shrink-0 text-accent-500" aria-hidden />
              ) : (
                <RiTimeLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate text-body-medium text-text-primary">Kickoff call</span>
              <span className="text-body-2-regular text-text-secondary" aria-live="polite">
                {booked ? formatBooking(booked) : 'Not scheduled'}
              </span>
            </li>
          </ul>
        </section>
      </div>
    </I18nProvider>
  );
}
