'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Calendar Toolbar" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */

import { useMemo, useState } from 'react';
import { DateFormatter, parseDate } from '@internationalized/date';
import type { CalendarDate } from '@internationalized/date';

import { CalendarToolbar } from '@/registry/ui/calendar-toolbar';
import type { CalendarView } from '@/registry/ui/calendar-toolbar';

/* The calendar header wired to a small agenda. Step months, press Today,
   switch Day / Week / Month, filter by title, or add an event. */

type Row = { id: string; date: string; time: string; title: string; dot: string };

const TODAY = parseDate('2026-08-20');

const EVENTS: Row[] = [
  { id: 'e1', date: '2026-07-28', time: '09:30', title: 'Coffee with Lena', dot: 'bg-calendar-event-lime-title' },
  { id: 'e2', date: '2026-08-02', time: '11:30', title: 'Stand-up', dot: 'bg-calendar-event-pink-title' },
  { id: 'e3', date: '2026-08-02', time: '16:30', title: '1:1 sync', dot: 'bg-calendar-event-lime-title' },
  { id: 'e4', date: '2026-08-14', time: '15:00', title: 'Retro', dot: 'bg-calendar-event-blue-title' },
  { id: 'e5', date: '2026-08-17', time: '10:00', title: 'Planning', dot: 'bg-calendar-event-blue-title' },
  { id: 'e6', date: '2026-08-20', time: '13:00', title: 'Team lunch', dot: 'bg-calendar-event-purple-title' },
  { id: 'e7', date: '2026-08-20', time: '14:30', title: 'Portfolio review', dot: 'bg-calendar-event-blue-title' },
  { id: 'e8', date: '2026-08-27', time: '07:30', title: 'Yoga', dot: 'bg-calendar-event-pink-title' },
  { id: 'e9', date: '2026-09-01', time: '09:00', title: 'Kickoff', dot: 'bg-calendar-event-emerald-title' },
  { id: 'e10', date: '2026-09-04', time: '10:30', title: 'Dentist', dot: 'bg-calendar-event-pink-title' },
];

const dayLabel = new DateFormatter('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

export default function Demo() {
  const [month, setMonth] = useState<CalendarDate>(() => parseDate('2026-08-01'));
  const [view, setView] = useState<CalendarView>('month');
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<Row[]>(EVENTS);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      const d = parseDate(e.date);
      return d.year === month.year && d.month === month.month && (!q || e.title.toLowerCase().includes(q));
    });
  }, [events, month, query]);

  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-4 rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-xs sm:p-5">
      <CalendarToolbar
        month={month}
        onMonthChange={setMonth}
        today={TODAY}
        view={view}
        onViewChange={setView}
        searchValue={query}
        onSearchChange={setQuery}
        onNewEvent={() =>
          setEvents((list) => [
            ...list,
            { id: `new-${list.length}`, date: TODAY.toString(), time: '17:00', title: 'Untitled event', dot: 'bg-calendar-event-purple-title' },
          ])
        }
      />
      <div className="flex flex-col gap-1 rounded-2xl bg-background-secondary-default p-2">
        <p data-demo="caption" className="px-2 py-1 text-caption-1-medium text-text-secondary">
          {view === 'day' ? 'Day' : view === 'week' ? 'Week' : 'Month'} view · {visible.length}{' '}
          {visible.length === 1 ? 'event' : 'events'}
        </p>
        <ul data-demo="agenda" className="flex max-h-[260px] flex-col gap-1 overflow-y-auto">
          {visible.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-xl bg-background-primary-default px-3 py-2"
            >
              <span aria-hidden className={`size-2 shrink-0 rounded-full ${e.dot}`} />
              <span className="min-w-0 flex-1 truncate text-body-medium text-text-primary">{e.title}</span>
              <span className="shrink-0 text-body-2-regular tabular-nums text-text-secondary">
                {dayLabel.format(parseDate(e.date).toDate('UTC'))} · {e.time}
              </span>
            </li>
          ))}
          {visible.length === 0 ? (
            <li className="px-3 py-6 text-center text-body-2-regular text-text-secondary">No events this month.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
