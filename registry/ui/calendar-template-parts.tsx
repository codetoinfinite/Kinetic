/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Calendar" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { CalendarDate, CalendarDateTime, getDayOfWeek, isSameDay, toCalendarDate } from "@internationalized/date";
import {
  RiAlignLeft,
  RiCalendarEventLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiGroupLine,
  RiInbox2Line,
  RiMailLine,
  RiMapPin2Line,
  RiTimeLine,
  RiVideoOnLine,
} from "@remixicon/react";

import {
  CALENDAR_EVENT_COLORS,
  calendarEventColorStyles,
  formatEventTime,
  type CalendarAttendee,
  type CalendarEvent,
  type CalendarEventColor,
} from "@/registry/ui/calendar-event-chip";
import type { BellNotification } from "@/registry/ui/notification-bell-badge";
import { Popover, PopoverFooter, PopoverHeader, PopoverTrigger } from "@/registry/ui/popover";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/registry/ui/modal";
import { SegmentedControl, SegmentedControlItem } from "@/registry/ui/segmented-control";
import { DatePicker } from "@/registry/ui/date-picker";
import { Select, SelectItem } from "@/registry/ui/select";
import { Input } from "@/registry/ui/input";
import { Checkbox } from "@/registry/ui/checkbox";
import { Avatar } from "@/registry/ui/avatar";
import { tintOf } from "@/registry/ui/avatar-stack";
import { Button } from "@/registry/ui/button";
import { IconButton } from "@/registry/ui/icon-button";
import { cx } from "@/registry/lib/cx";

/* ------------------------------------------------------------- clock + labels */

/** Fixed "today" and "now" so renders never read the clock. Thursday. */
export const TODAY = new CalendarDate(2026, 8, 20);
export const NOW = { hour: 10, minute: 40 };

export type CalendarView = "day" | "week" | "month";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const monthName = (d: { month: number }) => MONTHS[d.month - 1] ?? "";
export const shortMonth = (d: { month: number }) => monthName(d).slice(0, 3);
export const weekdayName = (d: CalendarDate) => WEEKDAYS[getDayOfWeek(d, "en-US")] ?? "";
/** "Thursday, 20 August" */
export const longDay = (d: CalendarDate) => `${weekdayName(d)}, ${d.day} ${monthName(d)}`;
export const pad2 = (n: number) => String(n).padStart(2, "0");

export function timeRange(event: CalendarEvent) {
  if (event.allDay) return "All day";
  return `${formatEventTime(event.start)} – ${formatEventTime(event.end)}`;
}

/** Events touching `date`: all-day first, then by start time. */
export function eventsOn(events: readonly CalendarEvent[], date: CalendarDate) {
  return events
    .filter((e) => toCalendarDate(e.start).compare(date) <= 0 && toCalendarDate(e.end).compare(date) >= 0)
    .sort((a, b) => Number(Boolean(b.allDay)) - Number(Boolean(a.allDay)) || a.start.compare(b.start));
}

/* ------------------------------------------------------------------ sample data */

export const ME_EMAIL = "jordan@acme.co";
const ME: CalendarAttendee = { name: "Jordan Lee", initials: "JL", email: ME_EMAIL, status: "accepted" };
const PRIYA: CalendarAttendee = { name: "Priya Shah", initials: "PS", email: "priya@acme.co", status: "accepted" };
const MARCUS: CalendarAttendee = { name: "Marcus Lee", initials: "ML", email: "marcus@acme.co", status: "tentative" };
const ELENA: CalendarAttendee = { name: "Elena Ruiz", initials: "ER", email: "elena@acme.co", status: "pending" };
const SAM: CalendarAttendee = { name: "Sam Carter", initials: "SC", email: "sam@acme.co", status: "accepted" };
const NOOR: CalendarAttendee = { name: "Noor Haddad", initials: "NH", email: "noor@acme.co", status: "declined" };

function ev(
  id: string,
  title: string,
  color: CalendarEventColor,
  month: number,
  day: number,
  time: readonly [number, number] | "all-day",
  minutes = 60,
  extra: Partial<CalendarEvent> = {},
): CalendarEvent {
  if (time === "all-day") {
    return {
      id,
      title,
      color,
      allDay: true,
      start: new CalendarDateTime(2026, month, day, 0, 0),
      end: new CalendarDateTime(2026, month, day, 23, 59),
      ...extra,
    };
  }
  const start = new CalendarDateTime(2026, month, day, time[0], time[1]);
  return { id, title, color, start, end: start.add({ minutes }), ...extra };
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
  ev("e1", "Coffee", "lime", 7, 28, [9, 30], 45, { location: "Fig & Bean" }),
  ev("e2", "Payday", "lime", 7, 30, "all-day"),
  ev("e3", "Brunch", "lime", 8, 1, [11, 0], 90, { location: "Juniper Kitchen" }),
  ev("e4", "Stand-up", "pink", 8, 2, [11, 30], 15, { meetingCode: "sdw-ktpq-fra" }),
  ev("e5", "1:1 sync", "lime", 8, 2, [16, 30], 30, { attendees: [{ ...SAM, organizer: true }, ME] }),
  ev("e6", "Gym", "pink", 8, 5, [7, 0]),
  ev("e7", "Game night", "purple", 8, 8, [19, 0], 180, { location: "Marcus's place" }),
  ev("e8", "Holidays", "emerald", 8, 11, "all-day", 0, { description: "Office closed. Out of office replies are on." }),
  ev("e9", "Birthday night at Bacalar’s", "purple", 8, 11, [20, 30], 150, { location: "Bacalar, 14 Harbour St" }),
  ev("e10", "Retro", "blue", 8, 14, [15, 0], 60, {
    meetingCode: "rtr-mxqa-pol",
    attendees: [{ ...MARCUS, organizer: true, status: "accepted" }, ME, PRIYA, SAM],
  }),
  ev("e11", "Planning", "blue", 8, 17, [10, 0], 90, {
    meetingCode: "pln-wqer-zxu",
    attendees: [{ ...PRIYA, organizer: true }, ME, MARCUS, ELENA],
    description: "Sprint 34 scope. Bring estimates for the calendar import work.",
  }),
  ev("e12", "Haircut", "emerald", 8, 17, [16, 0], 45),
  ev("e13", "Roadmap review", "blue", 8, 18, [10, 0], 90, {
    location: "Room 4B",
    attendees: [{ ...ELENA, organizer: true, status: "accepted" }, ME, NOOR],
  }),
  ev("e14", "Vendor call", "emerald", 8, 18, [10, 30], 30, { meetingCode: "vnd-plok-ahs" }),
  ev("e15", "Design crit", "purple", 8, 19, [15, 0], 60, { attendees: [{ ...NOOR, organizer: true, status: "accepted" }, ME, PRIYA] }),
  ev("e16", "Stand-up", "pink", 8, 20, [11, 30], 15, {
    meetingCode: "sdw-ktpq-fra",
    attendees: [{ ...PRIYA, organizer: true }, ME, MARCUS, ELENA],
    description: "Yesterday, today, blockers. Fifteen minutes, cameras optional.",
  }),
  ev("e17", "Team lunch", "purple", 8, 20, [13, 0], 60, { location: "Rooftop canteen" }),
  ev("e18", "Portfolio review", "blue", 8, 20, [14, 30], 60, {
    meetingCode: "pfr-nhyt-qwe",
    attendees: [{ ...SAM, organizer: true }, ME, NOOR],
  }),
  ev("e19", "1:1 sync", "lime", 8, 20, [16, 30], 30, { meetingCode: "one-sync-jbs", attendees: [{ ...SAM, organizer: true }, ME] }),
  ev("e20", "Ship review", "blue", 8, 21, [11, 0], 60, { attendees: [{ ...MARCUS, organizer: true, status: "accepted" }, ME, PRIYA] }),
  ev("e21", "Farmers market", "emerald", 8, 22, [9, 0], 120),
  ev("e22", "Dinner with friends", "purple", 8, 24, [19, 15], 120, { location: "Osteria Lume" }),
  ev("e23", "Yoga", "pink", 8, 27, [7, 30]),
  ev("e24", "Brunch", "lime", 8, 29, [11, 0], 90),
  ev("e25", "Payday", "lime", 8, 31, "all-day"),
  ev("e26", "Kickoff", "blue", 9, 1, [9, 0], 60, { meetingCode: "kck-ofsp-tem" }),
  ev("e27", "Standup", "pink", 9, 2, [9, 0], 15),
  ev("e28", "Dentist", "emerald", 9, 4, [10, 30], 45, { location: "Bright Smile Clinic" }),
];

export interface CalendarInvite {
  id: string;
  from: string;
  event: CalendarEvent;
}

export const CALENDAR_INVITES: CalendarInvite[] = [
  {
    id: "i1",
    from: "Priya Shah",
    event: ev("e40", "Design system sync", "blue", 8, 21, [15, 30], 45, {
      meetingCode: "dss-yhbn-kol",
      attendees: [{ ...PRIYA, organizer: true }, { ...ME, status: "pending" }, NOOR],
    }),
  },
  {
    id: "i2",
    from: "Marcus Lee",
    event: ev("e41", "Quarterly planning", "purple", 8, 25, [10, 0], 120, {
      location: "Room 2A",
      attendees: [{ ...MARCUS, organizer: true, status: "accepted" }, { ...ME, status: "pending" }, PRIYA, SAM],
    }),
  },
  {
    id: "i3",
    from: "Elena Ruiz",
    event: ev("e42", "Coffee chat", "lime", 8, 26, [9, 0], 30, {
      attendees: [{ ...ELENA, organizer: true, status: "accepted" }, { ...ME, status: "pending" }],
    }),
  },
];

export const CALENDAR_NOTIFICATIONS: BellNotification[] = [
  { id: "n1", title: "Priya accepted Stand-up", time: "5m ago", icon: RiCheckLine, tone: "success" },
  { id: "n2", title: "Portfolio review moved to 14:30", description: "Sam changed the start time.", time: "1h ago", icon: RiTimeLine, tone: "information" },
  { id: "n3", title: "Marcus may join Stand-up", time: "2h ago", icon: RiGroupLine, tone: "neutral" },
  { id: "n4", title: "Retro notes shared", description: "Marcus attached the board export.", time: "Yesterday", icon: RiAlignLeft, tone: "neutral" },
  { id: "n5", title: "Elena invited you to Coffee chat", time: "Yesterday", icon: RiMailLine, tone: "information" },
];

/* --------------------------------------------------------------- event details */

export type RsvpStatus = "accepted" | "tentative" | "declined";

const STATUS_LABEL: Record<NonNullable<CalendarAttendee["status"]>, string> = {
  accepted: "Going",
  tentative: "Maybe",
  declined: "Declined",
  pending: "Awaiting",
};

function DetailRow({ icon: Icon, children }: { icon: typeof RiTimeLine; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-body-regular text-text-secondary">
      <Icon className="mt-0.5 size-4 shrink-0 text-foreground-icon-tertiary" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export interface EventDetailsProps {
  event: CalendarEvent;
  onRsvp: (status: RsvpStatus) => void;
  onJoin: () => void;
  onCopyCode: () => void;
  onDelete: () => void;
}

/** Body of the anchored event popover. */
export function EventDetails({ event, onRsvp, onJoin, onCopyCode, onDelete }: EventDetailsProps) {
  const c = calendarEventColorStyles[event.color];
  const attendees = event.attendees ?? [];
  const me = attendees.find((a) => a.email === ME_EMAIL);
  const going = attendees.filter((a) => a.status === "accepted").length;
  const day = toCalendarDate(event.start);

  return (
    <>
      <div className="flex items-start gap-2.5 px-0.5 pt-0.5">
        <span aria-hidden className={cx("mt-1.5 size-3 shrink-0 rounded-[4px]", c.dot)} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-headline-semibold text-text-primary">{event.title}</h2>
          <p className="text-body-regular text-text-secondary">
            {longDay(day)} · {timeRange(event)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-0.5">
        {event.location ? <DetailRow icon={RiMapPin2Line}>{event.location}</DetailRow> : null}
        {event.meetingCode ? (
          <DetailRow icon={RiVideoOnLine}>
            <div className="flex items-center justify-between gap-2">
              <span>
                Meeting code <span className="font-mono text-text-primary">{event.meetingCode}</span>
              </span>
              <IconButton icon={RiFileCopyLine} size="small" aria-label="Copy meeting code" onClick={onCopyCode} />
            </div>
          </DetailRow>
        ) : null}
        {attendees.length > 0 ? (
          <DetailRow icon={RiGroupLine}>
            <p className="mb-1.5">
              {attendees.length} guests · {going} going
            </p>
            <ul aria-label="Guests" className="flex flex-col gap-1.5">
              {attendees.map((a) => (
                <li key={a.email ?? a.name} className="flex items-center gap-2">
                  <Avatar size="sm" initials={a.initials} color={tintOf(a.name)} />
                  <span className="min-w-0 flex-1 truncate text-body-2-medium text-text-primary">
                    {a.name}
                    {a.email === ME_EMAIL ? <span className="text-text-tertiary"> (you)</span> : null}
                  </span>
                  <span
                    className={cx(
                      "shrink-0 text-caption-1-regular",
                      a.organizer ? "text-status-blue-text" : a.status === "declined" ? "text-text-tertiary line-through" : "text-text-tertiary",
                    )}
                  >
                    {a.organizer ? "Organizer" : STATUS_LABEL[a.status ?? "pending"]}
                  </span>
                </li>
              ))}
            </ul>
          </DetailRow>
        ) : null}
        {event.description ? <DetailRow icon={RiAlignLeft}>{event.description}</DetailRow> : null}
      </div>

      {me && !me.organizer ? (
        <div className="flex items-center justify-between gap-3 border-t border-separator-border px-0.5 pt-3">
          <span className="text-body-2-medium text-text-secondary">Going?</span>
          <SegmentedControl
            aria-label="Your response"
            selectedKeys={me.status && me.status !== "pending" ? [me.status] : []}
            onSelectionChange={(keys) => {
              const key = [...keys][0];
              if (key === "accepted" || key === "tentative" || key === "declined") onRsvp(key);
            }}
          >
            <SegmentedControlItem id="accepted">Yes</SegmentedControlItem>
            <SegmentedControlItem id="tentative">Maybe</SegmentedControlItem>
            <SegmentedControlItem id="declined">No</SegmentedControlItem>
          </SegmentedControl>
        </div>
      ) : null}

      <PopoverFooter>
        <Button variant="ghost" size="small" leadingIcon={RiDeleteBinLine} onClick={onDelete}>
          Delete
        </Button>
        {event.meetingCode ? (
          <Button size="small" leadingIcon={RiVideoOnLine} onClick={onJoin}>
            Join meeting
          </Button>
        ) : null}
      </PopoverFooter>
    </>
  );
}

/* ---------------------------------------------------------------- invitations */

const TRIGGER =
  "relative flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-primary-default text-foreground-icon-secondary shadow-xs outline-none transition-colors duration-150 ease-out hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none";

export interface InvitesPopoverProps {
  invites: readonly CalendarInvite[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

/** Inbox of pending invitations; accepting one adds it to the calendar. */
export function InvitesPopover({ invites, onAccept, onDecline }: InvitesPopoverProps) {
  // The pressed button unmounts with its row; park focus on the dialog so Escape still closes it.
  const keepFocus = (target: HTMLElement) => target.closest<HTMLElement>('[role="dialog"]')?.focus();
  return (
    <PopoverTrigger>
      <button type="button" className={TRIGGER} aria-label={invites.length ? `Invitations, ${invites.length} pending` : "Invitations"}>
        <RiInbox2Line className="size-5" aria-hidden />
        {invites.length > 0 ? (
          <span
            aria-hidden
            className="pointer-events-none absolute -end-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background-full bg-chart-5"
          />
        ) : null}
      </button>
      <Popover placement="bottom end" className="w-[340px]" dialogClassName="flex flex-col gap-3 p-3">
        <PopoverHeader title="Invitations" description="Accept one to add it to your calendar." />
        {invites.length === 0 ? (
          <p className="py-6 text-center text-body-regular text-text-secondary">You&apos;re all caught up.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invites.map(({ id, from, event }) => (
              <li key={id} className="flex flex-col gap-2 rounded-xl bg-background-secondary-default p-2.5">
                <div className="flex items-start gap-2">
                  <span aria-hidden className={cx("mt-1.5 size-2 shrink-0 rounded-full", calendarEventColorStyles[event.color].dot)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-2-medium text-text-primary">{event.title}</p>
                    <p className="text-caption-1-regular text-text-secondary">
                      {longDay(toCalendarDate(event.start))} · {timeRange(event)}
                    </p>
                    <p className="text-caption-1-regular text-text-tertiary">From {from}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    aria-label={`Decline ${event.title}`}
                    onClick={(e) => {
                      keepFocus(e.currentTarget);
                      onDecline(id);
                    }}
                  >
                    Decline
                  </Button>
                  <Button
                    size="small"
                    aria-label={`Accept ${event.title}`}
                    onClick={(e) => {
                      keepFocus(e.currentTarget);
                      onAccept(id);
                    }}
                  >
                    Accept
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Popover>
    </PopoverTrigger>
  );
}

/* ------------------------------------------------------------------ new event */

export interface NewEventDraft {
  date: CalendarDate;
  hour: number;
}

const START_TIMES = Array.from({ length: 48 }, (_, i) => `${pad2(Math.floor(i / 2))}:${i % 2 ? "30" : "00"}`);
const DURATIONS = [
  { id: "15", label: "15 minutes" },
  { id: "30", label: "30 minutes" },
  { id: "45", label: "45 minutes" },
  { id: "60", label: "1 hour" },
  { id: "90", label: "1.5 hours" },
  { id: "120", label: "2 hours" },
];
const COLOR_LABEL: Record<CalendarEventColor, string> = {
  blue: "Blue · work",
  emerald: "Emerald · errands",
  lime: "Lime · personal",
  pink: "Pink · health",
  purple: "Purple · social",
};

export interface NewEventDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  draft: NewEventDraft;
  onCreate: (event: Omit<CalendarEvent, "id">) => void;
}

/** Mount with a fresh `key` per opening so the fields start from the draft. */
export function NewEventDialog({ isOpen, onOpenChange, draft, onCreate }: NewEventDialogProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<CalendarDate>(draft.date);
  const [start, setStart] = useState(`${pad2(draft.hour)}:00`);
  const [duration, setDuration] = useState("60");
  const [color, setColor] = useState<CalendarEventColor>("blue");
  const [allDay, setAllDay] = useState(false);
  const name = title.trim();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name) return;
    const [h = 9, m = 0] = start.split(":").map(Number);
    let from = new CalendarDateTime(date.year, date.month, date.day, allDay ? 0 : h, allDay ? 0 : m);
    let to = allDay ? from.set({ hour: 23, minute: 59 }) : from.add({ minutes: Number(duration) });
    // Keep a late event on its own day rather than spilling past midnight.
    if (!isSameDay(toCalendarDate(to), date)) to = from.set({ hour: 23, minute: 59 });
    if (allDay) from = from.set({ hour: 0, minute: 0 });
    onCreate({ title: name, color, start: from, end: to, allDay, attendees: [{ ...ME, organizer: true }] });
    onOpenChange(false);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
        <ModalHeader icon={RiCalendarEventLine} title="New event" description="It shows on your calendar straight away." />
        <ModalBody>
          <form id="calendar-new-event" onSubmit={submit} className="flex flex-col gap-4">
          <Input label="Title" value={title} onChange={setTitle} placeholder="e.g. Design review" autoFocus />
          <div className="grid grid-cols-2 items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-body-2-medium text-text-primary">Date</span>
              <DatePicker aria-label="Date" value={date} onChange={(next) => next && setDate(next)} />
            </div>
            <Checkbox isSelected={allDay} onChange={setAllDay} className="h-9">
              All day
            </Checkbox>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Starts"
              selectedKey={start}
              onSelectionChange={(key) => key != null && setStart(String(key))}
              isDisabled={allDay}
            >
              {START_TIMES.map((t) => (
                <SelectItem key={t} id={t} textValue={t}>
                  {t}
                </SelectItem>
              ))}
            </Select>
            <Select
              label="Duration"
              selectedKey={duration}
              onSelectionChange={(key) => key != null && setDuration(String(key))}
              isDisabled={allDay}
            >
              {DURATIONS.map((d) => (
                <SelectItem key={d.id} id={d.id} textValue={d.label}>
                  {d.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <Select
            label="Colour"
            selectedKey={color}
            onSelectionChange={(key) => {
              const next = CALENDAR_EVENT_COLORS.find((c) => c === key);
              if (next) setColor(next);
            }}
          >
            {CALENDAR_EVENT_COLORS.map((c) => (
              <SelectItem key={c} id={c} textValue={COLOR_LABEL[c]}>
                <span className="flex items-center gap-2">
                  <span aria-hidden className={cx("size-2.5 rounded-full", calendarEventColorStyles[c].dot)} />
                  {COLOR_LABEL[c]}
                </span>
              </SelectItem>
            ))}
          </Select>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="calendar-new-event" disabled={!name} title={name ? undefined : "Add a title first"}>
            Create event
          </Button>
        </ModalFooter>
    </Modal>
  );
}
