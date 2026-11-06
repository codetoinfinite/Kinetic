/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Appointments List Card" (boardui.com/templates/medical-profile).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { DateFormatter, getDayOfWeek, parseDate, parseDateTime } from "@internationalized/date";
import {
  RiArrowGoBackLine,
  RiCalendarScheduleLine,
  RiCloseLine,
  RiHospitalLine,
  RiPhoneLine,
  RiTimeLine,
  RiVideoChatLine,
} from "@remixicon/react";

import { Avatar } from "@/registry/ui/avatar";
import type { AvatarProps } from "@/registry/ui/avatar";
import { Button, buttonStyles } from "@/registry/ui/button";
import { Chip } from "@/registry/ui/chip";
import type { ChipColor } from "@/registry/ui/chip";
import { Dropdown, DropdownGroup, DropdownItem, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { cx } from "@/registry/lib/cx";

/**
 * Appointments List Card: the upcoming visits of one patient, styled like
 * the medical profile's "Important alerts" card: a grey card with a label
 * and a big count, then white inner tiles. Each tile has a date chip, the
 * visit type, its time window and mode, the doctor's initials and a status
 * chip. Reschedule opens a menu of open slots and moves the visit (status
 * becomes "Rescheduled", the list re-sorts); Cancel strikes it through and
 * leaves an Undo that restores the previous status.
 */

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export type AppointmentStatus = "confirmed" | "pending" | "rescheduled" | "cancelled";
export type AppointmentMode = "in-person" | "video" | "phone";

export type Appointment = {
  id: string;
  /** ISO date, e.g. "2026-07-12". */
  date: string;
  /** 24-hour start time, e.g. "09:30". */
  time: string;
  /** Length in minutes; default 30. */
  durationMinutes?: number;
  /** Visit type, e.g. "Cardiology follow-up". */
  type: string;
  doctor: string;
  /** Initials for the doctor avatar; derived from `doctor` when omitted. */
  doctorInitials?: string;
  doctorColor?: AvatarProps["color"];
  mode?: AppointmentMode;
  status: AppointmentStatus;
};

export type AppointmentSlot = { date: string; time: string };

export interface AppointmentsListCardProps {
  /** Controlled list. */
  appointments?: Appointment[];
  /** Initial list when uncontrolled. */
  defaultAppointments?: Appointment[];
  /** Called with the whole list after a reschedule, cancel or undo. */
  onAppointmentsChange?: (appointments: Appointment[]) => void;
  onReschedule?: (appointment: Appointment, slot: AppointmentSlot) => void;
  onCancel?: (appointment: Appointment) => void;
  onRestore?: (appointment: Appointment) => void;
  /** Open slots offered for a visit; defaults to the next three weekdays. */
  getSlots?: (appointment: Appointment) => AppointmentSlot[];
  title?: string;
  /** Word after the count, e.g. "this month". */
  countLabel?: string;
  locale?: string;
  className?: string;
}

const STATUS: Record<AppointmentStatus, { label: string; color: ChipColor }> = {
  confirmed: { label: "Confirmed", color: "lime" },
  pending: { label: "Pending", color: "yellow" },
  rescheduled: { label: "Rescheduled", color: "blue" },
  cancelled: { label: "Cancelled", color: "rose" },
};

const MODE: Record<AppointmentMode, { label: string; icon: IconComponent }> = {
  "in-person": { label: "In person", icon: RiHospitalLine },
  video: { label: "Video call", icon: RiVideoChatLine },
  phone: { label: "Phone", icon: RiPhoneLine },
};

const SLOT_TIMES = ["", "14:30", "10:00"];

/** Next three weekdays after the visit: same time, then 14:30, then 10:00. */
export function defaultSlots(appointment: Appointment): AppointmentSlot[] {
  const slots: AppointmentSlot[] = [];
  let day = parseDate(appointment.date);
  while (slots.length < 3) {
    day = day.add({ days: 1 });
    const weekday = getDayOfWeek(day, "en-US"); // 0 = Sunday
    if (weekday === 0 || weekday === 6) continue;
    const time = SLOT_TIMES[slots.length] || appointment.time;
    slots.push({ date: day.toString(), time });
  }
  return slots;
}

const startOf = (a: Pick<Appointment, "date" | "time">) => `${a.date}T${a.time}`;
const byStart = (a: Appointment, b: Appointment) => startOf(a).localeCompare(startOf(b));

function initialsOf(name: string) {
  const words = name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function makeFormatters(locale: string) {
  const opts = { timeZone: "UTC" } as const;
  return {
    month: new DateFormatter(locale, { ...opts, month: "short" }),
    weekday: new DateFormatter(locale, { ...opts, weekday: "short" }),
    slotDay: new DateFormatter(locale, { ...opts, weekday: "short", month: "short", day: "numeric" }),
    time: new DateFormatter(locale, { ...opts, hour: "numeric", minute: "2-digit" }),
  };
}

// #region critical
export function AppointmentsListCard({
  appointments,
  defaultAppointments = [],
  onAppointmentsChange,
  onReschedule,
  onCancel,
  onRestore,
  getSlots = defaultSlots,
  title = "Upcoming appointments",
  countLabel = "scheduled",
  locale = "en-US",
  className,
}: AppointmentsListCardProps) {
  const [inner, setInner] = useState<Appointment[]>(defaultAppointments);
  const [previousStatus, setPreviousStatus] = useState<Record<string, AppointmentStatus>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const list = appointments ?? inner;
  const sorted = [...list].sort(byStart);
  const active = list.filter((a) => a.status !== "cancelled").length;
  const f = makeFormatters(locale);

  const toDate = (date: string) => parseDate(date).toDate("UTC");
  const toTime = (date: string, time: string, minutes = 0) =>
    f.time.format(parseDateTime(`${date}T${time}`).add({ minutes }).toDate("UTC"));
  const slotLabel = (slot: AppointmentSlot) => `${f.slotDay.format(toDate(slot.date))} · ${toTime(slot.date, slot.time)}`;

  const commit = (next: Appointment[]) => {
    if (appointments === undefined) setInner(next);
    onAppointmentsChange?.(next);
  };
  const patch = (id: string, change: Partial<Appointment>) =>
    commit(list.map((a) => (a.id === id ? { ...a, ...change } : a)));

  const reschedule = (appointment: Appointment, slot: AppointmentSlot) => {
    patch(appointment.id, { ...slot, status: "rescheduled" });
    setOpenMenu(null);
    setAnnouncement(`${appointment.type} moved to ${slotLabel(slot)}`);
    onReschedule?.(appointment, slot);
  };

  const cancel = (appointment: Appointment) => {
    setPreviousStatus((prev) => ({ ...prev, [appointment.id]: appointment.status }));
    patch(appointment.id, { status: "cancelled" });
    setAnnouncement(`${appointment.type} cancelled`);
    onCancel?.(appointment);
  };

  const restore = (appointment: Appointment) => {
    const status = previousStatus[appointment.id] ?? "confirmed";
    patch(appointment.id, { status });
    setAnnouncement(`${appointment.type} restored`);
    onRestore?.(appointment);
  };

  return (
    <section
      aria-label={title}
      className={cx(
        "flex w-full min-w-0 flex-col gap-3 rounded-[20px] bg-background-secondary-default px-2.5 pt-4 pb-2.5",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5 px-1.5">
        <h3 className="text-body-medium text-text-secondary">{title}</h3>
        <p className="flex items-baseline gap-1.5">
          <span
            key={active}
            className="animate-number-fade text-title-1-medium text-text-primary tabular-nums motion-reduce:animate-none"
            data-appointments-count=""
          >
            {active}
          </span>
          <span className="text-body-2-medium text-text-secondary">{countLabel}</span>
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-2lg bg-background-inner-default px-3 py-6 text-center text-body-regular text-text-secondary">
          No upcoming appointments
        </p>
      ) : (
        <ul aria-label={title} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {sorted.map((a) => {
            const cancelled = a.status === "cancelled";
            const day = toDate(a.date);
            const mode = a.mode ? MODE[a.mode] : undefined;
            const status = STATUS[a.status];
            return (
              <li
                key={a.id}
                data-appointment={a.id}
                className="flex gap-3 rounded-2lg bg-background-inner-default p-2.5"
              >
                <div
                  key={startOf(a)}
                  aria-hidden
                  className={cx(
                    "flex w-12 shrink-0 animate-number-fade flex-col items-center justify-center self-start rounded-lg bg-background-secondary-default py-1.5 motion-reduce:animate-none",
                    cancelled && "opacity-60",
                  )}
                >
                  <span className="text-caption-2-semibold text-text-secondary uppercase">{f.month.format(day)}</span>
                  <span className={cx("text-title-2-medium text-text-primary tabular-nums", cancelled && "line-through")}>
                    {parseDate(a.date).day}
                  </span>
                  <span className="text-caption-2-medium text-text-tertiary">{f.weekday.format(day)}</span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className={cx("flex min-w-0 flex-col gap-0.5", cancelled && "opacity-60")}>
                      <p className={cx("line-clamp-2 text-body-medium break-words text-text-primary", cancelled && "line-through")}>
                        {a.type}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption-1-medium text-text-secondary">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums" data-appointment-time="">
                          <RiTimeLine className="size-3.5 shrink-0" aria-hidden />
                          <span className="sr-only">{f.slotDay.format(day)}, </span>
                          {toTime(a.date, a.time)} – {toTime(a.date, a.time, a.durationMinutes ?? 30)}
                        </span>
                        {mode ? (
                          <span className="inline-flex items-center gap-1">
                            <mode.icon className="size-3.5 shrink-0" aria-hidden />
                            {mode.label}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <Chip variant="caption" color={status.color} className="shrink-0" data-appointment-status="">
                      {status.label}
                    </Chip>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={cx("flex min-w-0 items-center gap-1.5", cancelled && "opacity-60")}>
                      <Avatar size="sm" color={a.doctorColor} initials={a.doctorInitials ?? initialsOf(a.doctor)} aria-hidden />
                      <span className="truncate text-caption-1-medium text-text-secondary">{a.doctor}</span>
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      {cancelled ? (
                        <Button
                          variant="secondary"
                          size="xs"
                          leadingIcon={RiArrowGoBackLine}
                          aria-label={`Undo cancel ${a.type}`}
                          onClick={() => restore(a)}
                        >
                          Undo
                        </Button>
                      ) : (
                        <>
                          <Dropdown
                            isOpen={openMenu === a.id}
                            onOpenChange={(open) => setOpenMenu(open ? a.id : null)}
                          >
                            <DropdownTrigger
                              aria-label={`Reschedule ${a.type}`}
                              className={cx(
                                buttonStyles.base,
                                buttonStyles.size.xs,
                                buttonStyles.variant.ghost,
                                "gap-1",
                              )}
                            >
                              <RiCalendarScheduleLine className="size-3.5 shrink-0" aria-hidden />
                              Reschedule
                            </DropdownTrigger>
                            <DropdownPopover
                              aria-label={`New time for ${a.type}`}
                              placement="bottom end"
                              className="w-[232px]"
                            >
                              <DropdownGroup label="Open slots">
                                {getSlots(a).map((slot) => (
                                  <DropdownItem
                                    key={startOf(slot)}
                                    className="px-2 py-1.5 tabular-nums"
                                    onSelect={() => reschedule(a, slot)}
                                  >
                                    <RiCalendarScheduleLine className="size-4 shrink-0 text-text-secondary" aria-hidden />
                                    <span className="text-body-medium text-text-primary">{slotLabel(slot)}</span>
                                  </DropdownItem>
                                ))}
                              </DropdownGroup>
                            </DropdownPopover>
                          </Dropdown>
                          <Button
                            variant="secondary"
                            size="xs"
                            leadingIcon={RiCloseLine}
                            aria-label={`Cancel ${a.type}`}
                            onClick={() => cancel(a)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
// #endregion
