'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Week View Grid" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { CalendarDate, CalendarDateTime } from '@internationalized/date';
import { RiArrowGoBackLine } from '@remixicon/react';

import { WeekViewGrid } from '@/registry/ui/week-view-grid';
import type { CalendarAttendee, CalendarEvent } from '@/registry/ui/calendar-event-chip';
import { EventDetailPopover } from '@/registry/ui/event-detail-popover';
import { Button } from '@/registry/ui/button';

/* The week of August 16 2026 with "now" pinned to Thursday 10:42. Monday,
   Thursday and Friday have overlapping meetings that split their column;
   every block opens its details popover, and Delete removes it. */

const on = (day: number, hour: number, minute = 0) => new CalendarDateTime(2026, 8, day, hour, minute);
const allDay = (from: number, to: number) => ({ start: on(from, 0), end: on(to + 1, 0), allDay: true });

const ME: CalendarAttendee = { name: 'Mertcan Esmergul', initials: 'ME', organizer: true, status: 'accepted' };
const LENA: CalendarAttendee = { name: 'Lena Park', initials: 'LP', status: 'accepted' };
const DIEGO: CalendarAttendee = { name: 'Diego Alvarez', initials: 'DA', status: 'tentative' };
const AIKO: CalendarAttendee = { name: 'Aiko Tanaka', initials: 'AT', status: 'pending' };

const WEEK: CalendarEvent[] = [
  { id: 'payday', title: 'Payday', color: 'lime', ...allDay(19, 19) },
  { id: 'holidays', title: 'Holidays', color: 'emerald', ...allDay(21, 22), location: 'Bacalar' },
  { id: 'brunch', title: 'Brunch', color: 'lime', start: on(16, 11), end: on(16, 12, 30), location: 'Café Nuevo' },
  { id: 'planning', title: 'Planning', color: 'blue', start: on(17, 10), end: on(17, 11, 30), meetingCode: 'brd-plan-q3x', attendees: [ME, LENA, DIEGO, AIKO] },
  { id: 'crit', title: 'Design crit', color: 'purple', start: on(17, 10, 30), end: on(17, 11, 30), location: 'Studio 2', attendees: [ME, LENA] },
  { id: 'haircut', title: 'Haircut', color: 'emerald', start: on(17, 16), end: on(17, 17), location: 'Barbería Sur' },
  { id: 'gym', title: 'Gym', color: 'pink', start: on(18, 7), end: on(18, 8) },
  { id: 'roadmap', title: 'Roadmap review', color: 'blue', start: on(18, 13), end: on(18, 14, 30), meetingCode: 'brd-road-26m', attendees: [ME, DIEGO, AIKO] },
  { id: 'focus', title: 'Focus block', color: 'emerald', start: on(20, 9), end: on(20, 11) },
  { id: 'standup', title: 'Stand-up', color: 'pink', start: on(20, 11, 30), end: on(20, 11, 45), location: 'Studio 2', meetingCode: 'brd-xqtm-wav', attendees: [ME, LENA, DIEGO, AIKO] },
  { id: 'lunch', title: 'Team lunch', color: 'purple', start: on(20, 13), end: on(20, 14), location: 'Mercado Roma' },
  { id: 'client', title: 'Client call', color: 'lime', start: on(20, 14), end: on(20, 15), meetingCode: 'brd-clnt-7aa', attendees: [ME, AIKO] },
  { id: 'portfolio', title: 'Portfolio review', color: 'blue', start: on(20, 14, 30), end: on(20, 15, 30), attendees: [ME, DIEGO] },
  { id: 'retro', title: 'Retro', color: 'blue', start: on(21, 15), end: on(21, 16), attendees: [ME, LENA, DIEGO] },
  { id: 'demo', title: 'Demo day', color: 'pink', start: on(21, 15, 30), end: on(21, 17) },
  { id: 'wrap', title: 'Wrap-up', color: 'purple', start: on(21, 15, 30), end: on(21, 16) },
  { id: 'dinner', title: 'Dinner with friends', color: 'purple', start: on(22, 19, 15), end: on(22, 21, 30), location: 'La Terraza' },
];

const NOW = on(20, 10, 42);
const WEEK_OF = new CalendarDate(2026, 8, 16);

type Notice = { text: string; restore?: CalendarEvent };

export default function Demo() {
  const [events, setEvents] = useState(WEEK);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const remove = (event: CalendarEvent) => {
    setEvents((list) => list.filter((e) => e.id !== event.id));
    setNotice({ text: `Deleted “${event.title}”`, restore: event });
  };

  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2">
        <p className="text-headline-semibold text-text-primary">
          August 16 – 22 <span className="text-text-secondary">2026</span>
        </p>
        <p className="text-caption-1-medium tabular-nums text-text-secondary">
          {events.length} events · now Thu 10:42
        </p>
      </div>
      <WeekViewGrid
        events={events}
        week={WEEK_OF}
        now={NOW}
        height={440}
        scrollToHour={8}
        selectedEventId={openId}
        renderEvent={(event, chip) => (
          <EventDetailPopover
            event={event}
            isOpen={openId === event.id}
            onOpenChange={(open) => setOpenId((cur) => (open ? event.id : cur === event.id ? null : cur))}
            onJoin={(e) => setNotice({ text: `Joining “${e.title}” · ${e.meetingCode}` })}
            onDelete={remove}
          >
            {chip}
          </EventDetailPopover>
        )}
      />
      <div aria-live="polite" className="flex min-h-8 items-center justify-between gap-2 px-2">
        <p className="truncate text-body-2-regular text-text-secondary">
          {notice ? notice.text : 'Scroll the hours or click a block for details'}
        </p>
        {notice?.restore ? (
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiArrowGoBackLine}
            onClick={() => {
              const back = notice.restore!;
              setEvents((list) => [...list, back]);
              setNotice({ text: `Restored “${back.title}”` });
            }}
          >
            Undo
          </Button>
        ) : null}
      </div>
    </div>
  );
}
