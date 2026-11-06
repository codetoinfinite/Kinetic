'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Month View Grid" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { CalendarDate, CalendarDateTime, getDayOfWeek, isSameMonth } from '@internationalized/date';
import { RiArrowGoBackLine, RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';

import { MonthViewGrid, eventsOnDay } from '@/registry/ui/month-view-grid';
import { calendarEventColorStyles, formatEventTime } from '@/registry/ui/calendar-event-chip';
import type { CalendarAttendee, CalendarEvent } from '@/registry/ui/calendar-event-chip';
import { EventDetailPopover } from '@/registry/ui/event-detail-popover';
import { Button } from '@/registry/ui/button';
import { cx } from '@/registry/lib/cx';

/* August 2026 with "today" pinned to Thursday the 20th. Busy days collapse
   into "+N more", which selects the day so the agenda on the side lists all
   of it. Every chip opens its details popover, and Delete removes it. */

const at = (month: number, day: number, hour: number, minute = 0) => new CalendarDateTime(2026, month, day, hour, minute);
const timed = (month: number, day: number, from: [number, number], to: [number, number]) => ({
  start: at(month, day, ...from),
  end: at(month, day, ...to),
});
const allDay = (month: number, from: number, to: number) => ({
  start: at(month, from, 0),
  end: at(month, to, 0).add({ days: 1 }),
  allDay: true,
});

const ME: CalendarAttendee = { name: 'Mertcan Esmergul', initials: 'ME', organizer: true, status: 'accepted' };
const LENA: CalendarAttendee = { name: 'Lena Park', initials: 'LP', status: 'accepted' };
const DIEGO: CalendarAttendee = { name: 'Diego Alvarez', initials: 'DA', status: 'tentative' };
const AIKO: CalendarAttendee = { name: 'Aiko Tanaka', initials: 'AT', status: 'pending' };

const EVENTS: CalendarEvent[] = [
  { id: 'coffee', title: 'Coffee', color: 'lime', ...timed(7, 28, [9, 30], [10, 0]), location: 'Café Nuevo' },
  { id: 'payday-jul', title: 'Payday', color: 'lime', ...allDay(7, 30, 30) },
  { id: 'brunch-1', title: 'Brunch', color: 'lime', ...timed(8, 1, [11, 0], [12, 30]), location: 'Café Nuevo' },
  { id: 'standup-2', title: 'Stand-up', color: 'pink', ...timed(8, 2, [11, 30], [11, 45]), meetingCode: 'brd-xqtm-wav', attendees: [ME, LENA, DIEGO] },
  { id: 'sync-2', title: '1:1 sync', color: 'lime', ...timed(8, 2, [16, 30], [17, 0]), attendees: [ME, AIKO] },
  { id: 'gym', title: 'Gym', color: 'pink', ...timed(8, 5, [7, 0], [8, 0]) },
  { id: 'games', title: 'Game night', color: 'purple', ...timed(8, 8, [19, 0], [22, 0]), location: 'Lena’s place' },
  { id: 'holidays', title: 'Holidays', color: 'emerald', ...allDay(8, 11, 13), location: 'Bacalar' },
  { id: 'birthday', title: 'Birthday night at Bacalar', color: 'purple', ...timed(8, 11, [20, 30], [23, 0]), location: 'Bacalar' },
  { id: 'retro', title: 'Retro', color: 'blue', ...timed(8, 14, [15, 0], [16, 0]), attendees: [ME, LENA, DIEGO] },
  { id: 'planning', title: 'Planning', color: 'blue', ...timed(8, 17, [10, 0], [11, 30]), meetingCode: 'brd-plan-q3x', attendees: [ME, LENA, DIEGO, AIKO] },
  { id: 'haircut', title: 'Haircut', color: 'emerald', ...timed(8, 17, [16, 0], [17, 0]), location: 'Barbería Sur' },
  { id: 'focus', title: 'Focus block', color: 'emerald', ...timed(8, 20, [9, 0], [11, 0]) },
  { id: 'standup', title: 'Stand-up', color: 'pink', ...timed(8, 20, [11, 30], [11, 45]), location: 'Studio 2', meetingCode: 'brd-xqtm-wav', attendees: [ME, LENA, DIEGO, AIKO] },
  { id: 'lunch', title: 'Team lunch', color: 'purple', ...timed(8, 20, [13, 0], [14, 0]), location: 'Mercado Roma' },
  { id: 'portfolio', title: 'Portfolio review', color: 'blue', ...timed(8, 20, [14, 30], [15, 30]), attendees: [ME, DIEGO] },
  { id: 'sync', title: '1:1 sync', color: 'lime', ...timed(8, 20, [16, 30], [17, 0]), meetingCode: 'brd-one-1on', attendees: [ME, AIKO] },
  { id: 'climb', title: 'Climbing', color: 'emerald', ...timed(8, 20, [19, 0], [20, 30]), location: 'Bloc Hall' },
  { id: 'dinner', title: 'Dinner with friends', color: 'purple', ...timed(8, 24, [19, 15], [21, 30]), location: 'La Terraza' },
  { id: 'yoga', title: 'Yoga', color: 'pink', ...timed(8, 27, [7, 30], [8, 30]) },
  { id: 'brunch-29', title: 'Brunch', color: 'lime', ...timed(8, 29, [11, 0], [12, 30]), location: 'Café Nuevo' },
  { id: 'payday-sep', title: 'Payday', color: 'lime', ...allDay(9, 1, 1) },
];

const TODAY = new CalendarDate(2026, 8, 20);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const dayLabel = (d: CalendarDate) => `${WEEKDAYS[getDayOfWeek(d, 'en-US')]}, ${MONTHS[d.month - 1]} ${d.day}`;
const timeLabel = (e: CalendarEvent) =>
  e.allDay ? 'All day' : `${formatEventTime(e.start)} – ${formatEventTime(e.end)}`;

type Notice = { text: string; restore?: CalendarEvent };

export default function Demo() {
  const [events, setEvents] = useState(EVENTS);
  const [month, setMonth] = useState(TODAY);
  const [selected, setSelected] = useState<CalendarDate>(TODAY);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const agenda = eventsOnDay(events, selected);
  const remove = (event: CalendarEvent) => {
    setEvents((list) => list.filter((e) => e.id !== event.id));
    setNotice({ text: `Deleted “${event.title}”`, restore: event });
  };

  return (
    <div className="flex w-full max-w-[1120px] flex-col gap-3 md:flex-row md:items-start md:gap-4">
      <MonthViewGrid
        className="min-w-0 flex-1"
        events={events}
        month={month}
        onMonthChange={setMonth}
        selectedDate={selected}
        onSelectedDateChange={setSelected}
        today={TODAY}
        maxVisible={2}
        selectedEventId={openKey?.split('@')[0] ?? null}
        onShowMore={(day, list) => setNotice({ text: `${list.length} events on ${dayLabel(day)}` })}
        renderEvent={(event, chip, day) => {
          // Holidays spans three cells; only the chip that was pressed opens.
          const key = `${event.id}@${day.toString()}`;
          return (
            <EventDetailPopover
              event={event}
              isOpen={openKey === key}
              onOpenChange={(open) => setOpenKey((cur) => (open ? key : cur === key ? null : cur))}
              onJoin={(e) => setNotice({ text: `Joining “${e.title}” · ${e.meetingCode}` })}
              onDelete={remove}
            >
              {chip}
            </EventDetailPopover>
          );
        }}
      />

      <aside aria-label="Selected day" className="flex flex-col gap-3 md:w-[280px] md:shrink-0">
        <div className="flex items-center gap-1">
          <p className="min-w-0 flex-1 whitespace-nowrap text-headline-semibold text-text-primary">
            {MONTHS[month.month - 1]} <span className="text-text-secondary">{month.year}</span>
          </p>
          <Button
            variant="ghost"
            size="small"
            iconOnly
            leadingIcon={RiArrowLeftSLine}
            aria-label="Previous month"
            onClick={() => setMonth((m) => m.subtract({ months: 1 }))}
          />
          <Button
            variant="ghost"
            size="small"
            iconOnly
            leadingIcon={RiArrowRightSLine}
            aria-label="Next month"
            onClick={() => setMonth((m) => m.add({ months: 1 }))}
          />
          <Button
            variant="secondary"
            size="small"
            disabled={isSameMonth(month, TODAY) && selected.compare(TODAY) === 0}
            onClick={() => {
              setMonth(TODAY);
              setSelected(TODAY);
            }}
          >
            Today
          </Button>
        </div>

        <div className="flex flex-col gap-2 rounded-[20px] bg-background-secondary-default p-3">
          <p className="flex items-baseline justify-between gap-2 px-1">
            <span data-agenda-day className="text-body-2-semibold text-text-primary">
              {dayLabel(selected)}
            </span>
            <span className="text-caption-1-medium tabular-nums text-text-secondary">
              {agenda.length === 1 ? '1 event' : `${agenda.length} events`}
            </span>
          </p>
          {agenda.length ? (
            <ul className="flex max-h-[150px] flex-col gap-1 overflow-y-auto md:max-h-none">
              {agenda.map((e) => (
                <li key={e.id} className="flex shrink-0 items-center gap-2.5 rounded-xl bg-background-primary-default px-2.5 py-1.5 md:py-2">
                  <span aria-hidden className={cx('size-2 shrink-0 rounded-full', calendarEventColorStyles[e.color].dot)} />
                  <span className="min-w-0 flex-1 truncate text-body-2-medium text-text-primary">{e.title}</span>
                  <span className="shrink-0 text-caption-1-medium tabular-nums text-text-secondary">{timeLabel(e)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-background-primary-default px-2.5 py-3 text-body-2-regular text-text-secondary">
              Nothing planned
            </p>
          )}
        </div>

        <div aria-live="polite" className="flex min-h-8 items-center justify-between gap-2 px-1">
          <p className="line-clamp-2 min-w-0 text-caption-1-medium text-text-secondary">
            {notice ? notice.text : 'Arrow keys move, Page Up / Down turn the month'}
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
      </aside>
    </div>
  );
}
