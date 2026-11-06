/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Calendar Event Chip" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */
import type { ButtonHTMLAttributes, Ref } from "react";
import { DateFormatter } from "@internationalized/date";
import type { CalendarDateTime } from "@internationalized/date";
import { cx } from "@/registry/lib/cx";

/**
 * The tinted event pill of the calendar template. Each of the five colours is
 * a background / title / time token triple (calendar-event-<color>-*), so
 * light and dark come from the theme sheet. `compact` is the one-line month
 * cell chip (title truncates, time stays); `full` is the block used in time
 * grids (title, then the time range, clipped to whatever height it is given).
 *
 * The file also owns the calendar's shared event model and time formatting,
 * which the week grid, month grid and detail popover import.
 */

export type CalendarEventColor = "blue" | "emerald" | "lime" | "pink" | "purple";

export const CALENDAR_EVENT_COLORS: readonly CalendarEventColor[] = ["blue", "emerald", "lime", "pink", "purple"];

export interface CalendarAttendee {
  name: string;
  /** One or two letters for the avatar. */
  initials: string;
  email?: string;
  organizer?: boolean;
  status?: "accepted" | "tentative" | "declined" | "pending";
}

export interface CalendarEvent {
  id: string;
  title: string;
  color: CalendarEventColor;
  start: CalendarDateTime;
  end: CalendarDateTime;
  /** All-day events show no time and sit at the top of a day. */
  allDay?: boolean;
  location?: string;
  meetingCode?: string;
  description?: string;
  attendees?: CalendarAttendee[];
}

/** Token classes per colour. Full class names so Tailwind can see them. */
export const calendarEventColorStyles: Record<
  CalendarEventColor,
  { background: string; title: string; time: string; bar: string; ring: string; dot: string }
> = {
  blue: {
    background: "bg-calendar-event-blue-background",
    title: "text-calendar-event-blue-title",
    time: "text-calendar-event-blue-time",
    bar: "border-calendar-event-blue-title",
    ring: "ring-calendar-event-blue-title",
    dot: "bg-calendar-event-blue-title",
  },
  emerald: {
    background: "bg-calendar-event-emerald-background",
    title: "text-calendar-event-emerald-title",
    time: "text-calendar-event-emerald-time",
    bar: "border-calendar-event-emerald-title",
    ring: "ring-calendar-event-emerald-title",
    dot: "bg-calendar-event-emerald-title",
  },
  lime: {
    background: "bg-calendar-event-lime-background",
    title: "text-calendar-event-lime-title",
    time: "text-calendar-event-lime-time",
    bar: "border-calendar-event-lime-title",
    ring: "ring-calendar-event-lime-title",
    dot: "bg-calendar-event-lime-title",
  },
  pink: {
    background: "bg-calendar-event-pink-background",
    title: "text-calendar-event-pink-title",
    time: "text-calendar-event-pink-time",
    bar: "border-calendar-event-pink-title",
    ring: "ring-calendar-event-pink-title",
    dot: "bg-calendar-event-pink-title",
  },
  purple: {
    background: "bg-calendar-event-purple-background",
    title: "text-calendar-event-purple-title",
    time: "text-calendar-event-purple-time",
    bar: "border-calendar-event-purple-title",
    ring: "ring-calendar-event-purple-title",
    dot: "bg-calendar-event-purple-title",
  },
};

export type HourCycle = 12 | 24;

const timeFormatters = new Map<string, DateFormatter>();

/**
 * "09:30" (24h, the template's style) or "9:30 AM" (12h). Formats a fixed UTC
 * instant built from the wall-clock fields, so server and client agree.
 */
export function formatEventTime(
  time: { hour: number; minute: number },
  { locale = "en-US", hourCycle = 24 }: { locale?: string; hourCycle?: HourCycle } = {},
): string {
  const key = `${locale}|${hourCycle}`;
  let formatter = timeFormatters.get(key);
  if (!formatter) {
    formatter = new DateFormatter(locale, {
      hour: hourCycle === 24 ? "2-digit" : "numeric",
      minute: "2-digit",
      hourCycle: hourCycle === 24 ? "h23" : "h12",
      timeZone: "UTC",
    });
    timeFormatters.set(key, formatter);
  }
  return formatter.format(new Date(Date.UTC(2000, 0, 1, time.hour, time.minute)));
}

export type CalendarEventChipVariant = "compact" | "full";

export interface CalendarEventChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "color" | "title"> {
  title: string;
  color?: CalendarEventColor;
  start?: { hour: number; minute: number };
  end?: { hour: number; minute: number };
  allDay?: boolean;
  /** `compact`: one 22px line. `full`: a block for time grids. */
  variant?: CalendarEventChipVariant;
  /** Draws a 2px ring in the event colour. */
  selected?: boolean;
  locale?: string;
  hourCycle?: HourCycle;
  ref?: Ref<HTMLButtonElement>;
}

// #region critical
export function CalendarEventChip({
  title,
  color = "blue",
  start,
  end,
  allDay = false,
  variant = "compact",
  selected = false,
  locale = "en-US",
  hourCycle = 24,
  className,
  type = "button",
  ref,
  ...props
}: CalendarEventChipProps) {
  const c = calendarEventColorStyles[color];
  const startLabel = !allDay && start ? formatEventTime(start, { locale, hourCycle }) : null;
  const endLabel = !allDay && end ? formatEventTime(end, { locale, hourCycle }) : null;

  const base = cx(
    "relative min-w-0 cursor-pointer select-none text-start outline-none",
    "transition-[box-shadow,filter] duration-150 ease-out hover:brightness-[0.97] dark:hover:brightness-125",
    "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
    selected && cx("ring-2", c.ring),
    c.background,
  );

  if (variant === "full") {
    return (
      <button
        ref={ref}
        type={type}
        data-selected={selected || undefined}
        data-variant="full"
        className={cx(
          base,
          "flex h-full w-full flex-col items-start gap-0.5 overflow-hidden rounded-lg border-s-[3px] py-1 ps-1.5 pe-1",
          c.bar,
          className,
        )}
        {...props}
      >
        <span className={cx("line-clamp-2 w-full text-body-2-medium break-words", c.title)}>{title}</span>
        {startLabel ? (
          <span className={cx("w-full truncate text-caption-1-regular tabular-nums opacity-90", c.time)}>
            {startLabel}
            {endLabel ? ` – ${endLabel}` : null}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      data-selected={selected || undefined}
      data-variant="compact"
      className={cx(base, "flex h-[22px] w-full items-center gap-1.5 rounded-md px-1.5", className)}
      {...props}
    >
      <span className={cx("min-w-0 flex-1 truncate text-body-2-medium", c.title)}>{title}</span>
      {startLabel ? (
        <span className={cx("shrink-0 text-caption-1-regular tabular-nums opacity-90", c.time)}>{startLabel}</span>
      ) : null}
    </button>
  );
}
// #endregion
