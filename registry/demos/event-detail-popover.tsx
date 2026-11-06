'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Event Detail Popover" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { CalendarDateTime } from '@internationalized/date';
import { RiArrowGoBackLine } from '@remixicon/react';

import { CalendarEventChip } from '@/registry/ui/calendar-event-chip';
import type { CalendarAttendee, CalendarEvent } from '@/registry/ui/calendar-event-chip';
import { EventDetailPopover } from '@/registry/ui/event-detail-popover';
import { Button } from '@/registry/ui/button';

/* One day of the calendar template (Thursday, August 20 2026). Each block
   opens its details popover; Join and Edit report below, Delete removes the
   event and offers Undo. */

const at = (hour: number, minute = 0) => new CalendarDateTime(2026, 8, 20, hour, minute);

const TEAM: CalendarAttendee[] = [
  { name: 'Mertcan Esmergul', initials: 'ME', email: 'mertcan@board.team', organizer: true, status: 'accepted' },
  { name: 'Lena Park', initials: 'LP', email: 'lena@board.team', status: 'accepted' },
  { name: 'Diego Alvarez', initials: 'DA', email: 'diego@board.team', status: 'tentative' },
  { name: 'Aiko Tanaka', initials: 'AT', email: 'aiko@board.team', status: 'accepted' },
  { name: 'Sam Okafor', initials: 'SO', email: 'sam@board.team', status: 'declined' },
  { name: 'Priya Nair', initials: 'PN', email: 'priya@board.team', status: 'pending' },
];

const DAY: CalendarEvent[] = [
  {
    id: 'standup',
    title: 'Stand-up',
    color: 'pink',
    start: at(11, 30),
    end: at(11, 45),
    location: 'Studio 2, 4th floor',
    meetingCode: 'brd-xqtm-wav',
    attendees: TEAM,
  },
  {
    id: 'lunch',
    title: 'Team lunch',
    color: 'purple',
    start: at(13),
    end: at(14),
    location: 'Mercado Roma, Calle 14',
    attendees: TEAM.slice(0, 4),
    description: 'Table is booked under Board team. Bring the offsite ideas.',
  },
  {
    id: 'portfolio',
    title: 'Portfolio review',
    color: 'blue',
    start: at(14, 30),
    end: at(15, 30),
    meetingCode: 'brd-pfrv-26k',
    attendees: [TEAM[0]!, TEAM[2]!, TEAM[5]!],
  },
  {
    id: 'sync',
    title: '1:1 sync',
    color: 'lime',
    start: at(16, 30),
    end: at(17),
    location: 'Phone booth B',
    meetingCode: 'brd-1on1-lp7',
    attendees: [TEAM[0]!, TEAM[1]!],
  },
];

type Notice = { text: string; restore?: CalendarEvent };

export default function Demo() {
  const [events, setEvents] = useState(DAY);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const remove = (event: CalendarEvent) => {
    setEvents((list) => list.filter((e) => e.id !== event.id));
    setNotice({ text: `Deleted “${event.title}”`, restore: event });
  };
  const undo = (event: CalendarEvent) => {
    setEvents((list) => [...list, event].sort((a, b) => a.start.compare(b.start)));
    setNotice({ text: `Restored “${event.title}”` });
  };

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-3xl bg-background-secondary-default p-2">
        <div className="flex items-baseline justify-between px-2 pt-1">
          <p className="text-headline-semibold text-text-primary">
            Thu 20 <span className="text-text-secondary">August</span>
          </p>
          <p className="text-caption-1-medium text-text-secondary">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </p>
        </div>
        <ol className="flex flex-col gap-1.5 rounded-2xl bg-background-primary-default p-2">
          {events.map((event) => (
            <li key={event.id} className="flex h-[52px] items-stretch gap-2">
              <span className="w-11 shrink-0 pt-1 text-end text-caption-1-regular tabular-nums text-text-tertiary">
                {String(event.start.hour).padStart(2, '0')}:{String(event.start.minute).padStart(2, '0')}
              </span>
              <EventDetailPopover
                event={event}
                isOpen={openId === event.id}
                onOpenChange={(open) => setOpenId((cur) => (open ? event.id : cur === event.id ? null : cur))}
                onJoin={(e) => setNotice({ text: `Joining “${e.title}” · ${e.meetingCode}` })}
                onEdit={(e) => setNotice({ text: `Editing “${e.title}”` })}
                onDelete={remove}
              >
                <CalendarEventChip
                  variant="full"
                  title={event.title}
                  color={event.color}
                  start={event.start}
                  end={event.end}
                  selected={openId === event.id}
                />
              </EventDetailPopover>
            </li>
          ))}
          {events.length === 0 ? (
            <li className="flex h-[52px] items-center justify-center text-body-2-regular text-text-tertiary">
              Nothing scheduled
            </li>
          ) : null}
        </ol>
      </div>
      <div aria-live="polite" className="flex min-h-8 items-center justify-between gap-2 px-2">
        <p className="truncate text-body-2-regular text-text-secondary">{notice ? notice.text : 'Click an event for details'}</p>
        {notice?.restore ? (
          <Button variant="secondary" size="small" leadingIcon={RiArrowGoBackLine} onClick={() => undo(notice.restore!)}>
            Undo
          </Button>
        ) : null}
      </div>
    </div>
  );
}
