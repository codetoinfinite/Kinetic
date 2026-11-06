/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Event Detail Popover" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Heading } from "react-aria-components";
import { DateFormatter } from "@internationalized/date";
import { RiDeleteBinLine, RiGroupLine, RiMapPin2Line, RiPencilLine, RiTimeLine, RiVideoOnLine } from "@remixicon/react";
import { Avatar } from "@/registry/ui/avatar";
import { Button } from "@/registry/ui/button";
import { Popover, PopoverTrigger } from "@/registry/ui/popover";
import type { PopoverProps } from "@/registry/ui/popover";
import { calendarEventColorStyles, formatEventTime } from "@/registry/ui/calendar-event-chip";
import type { CalendarAttendee, CalendarEvent, HourCycle } from "@/registry/ui/calendar-event-chip";
import { cx } from "@/registry/lib/cx";

/**
 * The details card a calendar chip opens: colour key, title, date and time
 * range, location, meeting code with a Join button, the guest list with RSVP
 * states, and edit / delete actions. `EventDetailPopover` anchors it to any
 * trigger (usually a CalendarEventChip) through the kit Popover, so it flips
 * at viewport edges, Escape closes it and focus returns to the chip.
 * `EventDetails` is the bare card for side panels.
 */

const dateFormatters = new Map<string, DateFormatter>();

/** "Thursday, August 20" for a calendar date, identical on server and client. */
export function formatEventDate(
  date: { year: number; month: number; day: number },
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" },
): string {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new DateFormatter(locale, { ...options, timeZone: "UTC" });
    dateFormatters.set(key, formatter);
  }
  return formatter.format(new Date(Date.UTC(date.year, date.month - 1, date.day, 12)));
}

const RSVP_LABEL: Record<NonNullable<CalendarAttendee["status"]>, string> = {
  accepted: "Going",
  tentative: "Maybe",
  declined: "Declined",
  pending: "Awaiting",
};

// Neutral avatars match the card surface in dark mode, so guests cycle the three tints.
const AVATAR_TINTS = ["blue", "lime", "pink"] as const;

export interface EventDetailsProps {
  event: CalendarEvent;
  onJoin?: (event: CalendarEvent) => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  joinLabel?: string;
  locale?: string;
  hourCycle?: HourCycle;
  /** Guests shown before collapsing into "+N more". Default 4. */
  maxAttendees?: number;
  className?: string;
}

// #region critical
export function EventDetails({
  event,
  onJoin,
  onEdit,
  onDelete,
  joinLabel = "Join",
  locale = "en-US",
  hourCycle = 24,
  maxAttendees = 4,
  className,
}: EventDetailsProps) {
  const c = calendarEventColorStyles[event.color];
  const dateLabel = formatEventDate(event.start, locale);
  const sameDay =
    event.start.year === event.end.year && event.start.month === event.end.month && event.start.day === event.end.day;
  const timeLabel = event.allDay
    ? "All day"
    : `${formatEventTime(event.start, { locale, hourCycle })} – ${formatEventTime(event.end, { locale, hourCycle })}${
        sameDay ? "" : ` (${formatEventDate(event.end, locale, { month: "short", day: "numeric" })})`
      }`;
  const attendees = event.attendees ?? [];
  const going = attendees.filter((a) => a.status === "accepted" || a.organizer).length;
  const shown = attendees.slice(0, maxAttendees);
  const hidden = attendees.length - shown.length;

  return (
    <div className={cx("flex flex-col gap-3", className)}>
      <div className="flex items-start gap-2.5 ps-1">
        <span aria-hidden className={cx("mt-1.5 size-3 shrink-0 rounded-[4px]", c.dot)} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Heading slot="title" className="text-headline-semibold break-words text-text-primary">
            {event.title}
          </Heading>
          <p className="text-body-2-regular text-text-secondary">{dateLabel}</p>
        </div>
        {onEdit || onDelete ? (
          <div className="-me-1 -mt-1 flex shrink-0 items-center gap-0.5">
            {onEdit ? (
              <Button
                variant="secondary"
                size="small"
                iconOnly
                leadingIcon={RiPencilLine}
                aria-label={`Edit ${event.title}`}
                onClick={() => onEdit(event)}
              />
            ) : null}
            {onDelete ? (
              <Button
                variant="secondary"
                size="small"
                iconOnly
                leadingIcon={RiDeleteBinLine}
                aria-label={`Delete ${event.title}`}
                className="hover:text-text-destructive"
                onClick={() => onDelete(event)}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <dl className="flex flex-col gap-2.5 rounded-[14px] bg-background-secondary-default p-3">
        <div className="flex items-center gap-2.5">
          <dt className="shrink-0">
            <RiTimeLine aria-hidden className="size-4 text-foreground-icon-secondary" />
            <span className="sr-only">Time</span>
          </dt>
          <dd className="min-w-0 text-body-2-medium tabular-nums text-text-primary">{timeLabel}</dd>
        </div>
        {event.location ? (
          <div className="flex items-center gap-2.5">
            <dt className="shrink-0">
              <RiMapPin2Line aria-hidden className="size-4 text-foreground-icon-secondary" />
              <span className="sr-only">Location</span>
            </dt>
            <dd className="min-w-0 truncate text-body-2-regular text-text-primary">{event.location}</dd>
          </div>
        ) : null}
        {event.meetingCode ? (
          <div className="flex items-center gap-2.5">
            <dt className="shrink-0">
              <RiVideoOnLine aria-hidden className="size-4 text-foreground-icon-secondary" />
              <span className="sr-only">Meeting code</span>
            </dt>
            <dd className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="truncate font-mono text-caption-1-medium text-text-secondary">{event.meetingCode}</span>
              {onJoin ? (
                <Button size="xs" onClick={() => onJoin(event)} aria-label={`${joinLabel} ${event.title}`}>
                  {joinLabel}
                </Button>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>

      {attendees.length > 0 ? (
        <div className="flex flex-col gap-2 px-1">
          <p className="flex items-center gap-2 text-caption-1-medium text-text-secondary">
            <RiGroupLine aria-hidden className="size-4 text-foreground-icon-secondary" />
            {attendees.length} {attendees.length === 1 ? "guest" : "guests"}
            <span aria-hidden className="text-text-tertiary">·</span>
            <span>{going} going</span>
          </p>
          <ul className="flex flex-col gap-1.5">
            {shown.map((person, i) => (
              <li key={person.email ?? person.name} className="flex items-center gap-2">
                <Avatar size="sm" initials={person.initials} color={AVATAR_TINTS[i % AVATAR_TINTS.length]} aria-hidden />
                <span
                  className={cx(
                    "min-w-0 flex-1 truncate text-body-2-regular text-text-primary",
                    person.status === "declined" && "text-text-tertiary line-through",
                  )}
                >
                  {person.name}
                </span>
                <span className="shrink-0 text-caption-1-regular text-text-tertiary">
                  {person.organizer ? "Organizer" : RSVP_LABEL[person.status ?? "pending"]}
                </span>
              </li>
            ))}
          </ul>
          {hidden > 0 ? <p className="ps-8 text-caption-1-regular text-text-tertiary">+{hidden} more</p> : null}
        </div>
      ) : null}

      {event.description ? (
        <p className="border-t border-border-table px-1 pt-3 text-body-2-regular text-text-secondary">{event.description}</p>
      ) : null}
    </div>
  );
}

export interface EventDetailPopoverProps extends Omit<EventDetailsProps, "className"> {
  /** The trigger, usually a CalendarEventChip. It must forward its ref and spread props. */
  children: ReactNode;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** Default "bottom start"; flips when there is no room. */
  placement?: PopoverProps["placement"];
  /** Close after Join / Edit. Delete always closes. Default true. */
  closeOnAction?: boolean;
  /** Classes on the popover surface (default width 340px). */
  className?: string;
}

export function EventDetailPopover({
  children,
  event,
  isOpen: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  placement = "bottom start",
  closeOnAction = true,
  onJoin,
  onEdit,
  onDelete,
  className,
  ...details
}: EventDetailPopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  // Each action closes the popover first, then hands the event to the
  // caller, so a delete that unmounts the trigger never races the overlay.
  const act = (handler: ((e: CalendarEvent) => void) | undefined, close: boolean) =>
    handler
      ? (e: CalendarEvent) => {
          if (close) setOpen(false);
          handler(e);
        }
      : undefined;

  return (
    <PopoverTrigger isOpen={isOpen} onOpenChange={setOpen}>
      {children}
      <Popover placement={placement} className={cx("w-[340px]", className)} dialogClassName="p-2">
        <EventDetails
          event={event}
          onJoin={act(onJoin, closeOnAction)}
          onEdit={act(onEdit, closeOnAction)}
          onDelete={act(onDelete, true)}
          {...details}
        />
      </Popover>
    </PopoverTrigger>
  );
}
// #endregion
