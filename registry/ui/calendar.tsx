/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Calendar" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */
"use client";

import { useRef, useState, type MouseEvent } from "react";
import { CalendarDate, isSameDay, startOfMonth, startOfWeek, toCalendarDate } from "@internationalized/date";
import { RiAddLine, RiArrowLeftLine, RiArrowLeftSLine, RiArrowRightSLine, RiCalendarLine } from "@remixicon/react";

import { DASHBOARD_NAV, DashboardSidebar } from "@/registry/ui/dashboard-sidebar";
import { DashboardPageHeader } from "@/registry/ui/dashboard-page-header";
import { NotificationBellBadge, type BellNotification } from "@/registry/ui/notification-bell-badge";
import { SegmentedControl, SegmentedControlItem } from "@/registry/ui/segmented-control";
import { Popover } from "@/registry/ui/popover";
import { Button } from "@/registry/ui/button";
import { Toaster, toast } from "@/registry/ui/toast";
import type { CalendarEvent } from "@/registry/ui/calendar-event-chip";
import { cx } from "@/registry/lib/cx";
import {
  CALENDAR_EVENTS,
  CALENDAR_INVITES,
  CALENDAR_NOTIFICATIONS,
  EventDetails,
  InvitesPopover,
  ME_EMAIL,
  NOW,
  NewEventDialog,
  TODAY,
  longDay,
  monthName,
  shortMonth,
  weekdayName,
  type CalendarInvite,
  type CalendarView,
  type NewEventDraft,
  type RsvpStatus,
} from "@/registry/ui/calendar-template-parts";
import { DayRail, MonthGrid, TimeGrid } from "@/registry/ui/calendar-template-views";

export type { CalendarView } from "@/registry/ui/calendar-template-parts";

const HOME_VIEW = "calendar";
const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];
const STEPPER_BUTTON =
  "flex size-8 items-center justify-center rounded-md text-foreground-icon-secondary outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none";

// #region critical
/** Sunday-first weeks, as the month grid and week view draw them. */
const LOCALE = "en-US";

/** Six full weeks starting on the Sunday on or before the 1st, so the grid never changes height. */
export function monthWeeks(anchor: CalendarDate): CalendarDate[][] {
  const first = startOfWeek(startOfMonth(anchor), LOCALE);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => first.add({ days: w * 7 + d })));
}

export function weekDays(anchor: CalendarDate): CalendarDate[] {
  const first = startOfWeek(anchor, LOCALE);
  return Array.from({ length: 7 }, (_, d) => first.add({ days: d }));
}

/** One step of the stepper. Month steps clamp the day (31 Aug -> 30 Sep). */
export function stepAnchor(view: CalendarView, anchor: CalendarDate, dir: 1 | -1): CalendarDate {
  if (view === "month") return anchor.add({ months: dir });
  if (view === "week") return anchor.add({ weeks: dir });
  return anchor.add({ days: dir });
}

/** "August 2026" · "16 – 22 Aug 2026" · "30 Aug – 5 Sep 2026" · "Thursday, 20 Aug 2026" */
export function rangeLabel(view: CalendarView, anchor: CalendarDate): string {
  if (view === "month") return `${monthName(anchor)} ${anchor.year}`;
  if (view === "day") return `${weekdayName(anchor)}, ${anchor.day} ${shortMonth(anchor)} ${anchor.year}`;
  const days = weekDays(anchor);
  const a = days[0] ?? anchor;
  const b = days[6] ?? anchor;
  if (a.year !== b.year) return `${a.day} ${shortMonth(a)} ${a.year} – ${b.day} ${shortMonth(b)} ${b.year}`;
  if (a.month !== b.month) return `${a.day} ${shortMonth(a)} – ${b.day} ${shortMonth(b)} ${b.year}`;
  return `${a.day} – ${b.day} ${shortMonth(b)} ${b.year}`;
}
// #endregion

export interface CalendarTemplateProps {
  /** Events on the calendar. Creating, accepting and deleting change a local copy. */
  events?: CalendarEvent[];
  invites?: CalendarInvite[];
  defaultNotifications?: BellNotification[];
  defaultCalendarView?: CalendarView;
  /** Day the calendar opens on, and the day marked as today. */
  today?: CalendarDate;
  /** Sidebar key shown first. Any key other than "calendar" shows a placeholder. */
  defaultView?: string;
  className?: string;
}

export function CalendarTemplate({
  events: initialEvents = CALENDAR_EVENTS,
  invites: initialInvites = CALENDAR_INVITES,
  defaultNotifications = CALENDAR_NOTIFICATIONS,
  defaultCalendarView = "month",
  today = TODAY,
  defaultView = HOME_VIEW,
  className,
}: CalendarTemplateProps) {
  const [view, setView] = useState(defaultView);
  const [calView, setCalView] = useState<CalendarView>(defaultCalendarView);
  const [anchor, setAnchor] = useState<CalendarDate>(today);
  const [events, setEvents] = useState(initialEvents);
  const [invites, setInvites] = useState(initialInvites);
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [draft, setDraft] = useState<NewEventDraft>({ date: today, hour: 9 });
  const [draftKey, setDraftKey] = useState(0);
  const anchorRef = useRef<HTMLElement | null>(null);
  const counter = useRef(0);

  const navItem = DASHBOARD_NAV.find((item) => item.key === view);
  const isHome = view === HOME_VIEW;
  const openEvent = events.find((e) => e.id === openId) ?? null;

  const onNavClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href="#"]');
    if (!link) return;
    event.preventDefault();
    const item = DASHBOARD_NAV.find((entry) => entry.label === link.getAttribute("aria-label"));
    if (item) setView(item.key);
  };

  // The popover anchors to whichever chip, block or agenda row was pressed.
  const pressEvent = (event: CalendarEvent, target: HTMLElement) => {
    anchorRef.current = target;
    setOpenId(event.id);
  };

  const openDay = (date: CalendarDate) => {
    setAnchor(date);
    setCalView("day");
  };

  const startNew = (date: CalendarDate, hour: number) => {
    setDraft({ date, hour });
    setDraftKey((k) => k + 1);
    setNewOpen(true);
  };

  const patchEvent = (id: string, patch: (event: CalendarEvent) => CalendarEvent) =>
    setEvents((list) => list.map((e) => (e.id === id ? patch(e) : e)));

  const createEvent = (input: Omit<CalendarEvent, "id">) => {
    counter.current += 1;
    const created: CalendarEvent = { ...input, id: `new-${counter.current}` };
    const day = toCalendarDate(created.start);
    setEvents((list) => [...list, created]);
    setAnchor(day);
    toast.success("Event created", { description: `${created.title} · ${longDay(day)}` });
  };

  const deleteEvent = (event: CalendarEvent) => {
    setOpenId(null);
    setEvents((list) => list.filter((e) => e.id !== event.id));
    toast("Event deleted", {
      description: event.title,
      actions: [
        {
          label: "Undo",
          onClick: () => setEvents((list) => (list.some((e) => e.id === event.id) ? list : [...list, event])),
        },
      ],
    });
  };

  const rsvp = (event: CalendarEvent, status: RsvpStatus) =>
    patchEvent(event.id, (e) => ({
      ...e,
      attendees: e.attendees?.map((a) => (a.email === ME_EMAIL ? { ...a, status } : a)),
    }));

  const acceptInvite = (id: string) => {
    const invite = invites.find((i) => i.id === id);
    if (!invite) return;
    const event: CalendarEvent = {
      ...invite.event,
      attendees: invite.event.attendees?.map((a) => (a.email === ME_EMAIL ? { ...a, status: "accepted" as const } : a)),
    };
    setInvites((list) => list.filter((i) => i.id !== id));
    setEvents((list) => [...list, event]);
    toast.success("Added to your calendar", { description: `${event.title} · ${longDay(toCalendarDate(event.start))}` });
  };

  const declineInvite = (id: string) => {
    const invite = invites.find((i) => i.id === id);
    setInvites((list) => list.filter((i) => i.id !== id));
    if (invite) toast("Invitation declined", { description: `${invite.from} will be told.` });
  };

  const stepLabel = calView === "month" ? "month" : calView === "week" ? "week" : "day";
  const showsToday = isSameDay(anchor, today);

  return (
    <div
      className={cx("relative flex h-full w-full gap-3 overflow-hidden bg-background-full p-3", className)}
      onClickCapture={onNavClickCapture}
    >
      <DashboardSidebar selected={view} showThemeToggle={false} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden px-1 pt-1.5">
        <DashboardPageHeader
          title={isHome ? `${monthName(anchor)} ${anchor.year}` : (navItem?.label ?? "Calendar")}
          breadcrumbs={[
            { label: "Acme team", initials: "A", tone: "blue", onPress: () => setView("home") },
            { label: "Jordan", initials: "J", onPress: () => setView("profile") },
            { label: navItem?.label ?? "Calendar", icon: navItem?.icon ?? RiCalendarLine },
          ]}
          dateRange={
            isHome ? (
              <SegmentedControl
                aria-label="Calendar view"
                selectedKeys={[calView]}
                onSelectionChange={(keys) => {
                  const next = VIEWS.find((v) => keys.has(v.id));
                  if (next) setCalView(next.id);
                }}
              >
                {VIEWS.map((v) => (
                  <SegmentedControlItem key={v.id} id={v.id}>
                    {v.label}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            ) : undefined
          }
          notifications={
            <NotificationBellBadge notifications={notifications} onNotificationsChange={(next) => setNotifications([...next])} />
          }
          actions={
            isHome ? (
              <>
                <InvitesPopover invites={invites} onAccept={acceptInvite} onDecline={declineInvite} />
                <Button
                  variant="secondary"
                  disabled={showsToday}
                  title={showsToday ? "Already on today" : undefined}
                  onClick={() => setAnchor(today)}
                >
                  Today
                </Button>
                <div className="flex h-9 items-center gap-0.5 rounded-lg border border-border-button-default bg-background-primary-default px-0.5 shadow-xs">
                  <button
                    type="button"
                    aria-label={`Previous ${stepLabel}`}
                    className={STEPPER_BUTTON}
                    onClick={() => setAnchor((a) => stepAnchor(calView, a, -1))}
                  >
                    <RiArrowLeftSLine className="size-5" aria-hidden />
                  </button>
                  <span aria-live="polite" className="min-w-[164px] px-1 text-center text-body-2-medium text-text-primary tabular-nums">
                    {rangeLabel(calView, anchor)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Next ${stepLabel}`}
                    className={STEPPER_BUTTON}
                    onClick={() => setAnchor((a) => stepAnchor(calView, a, 1))}
                  >
                    <RiArrowRightSLine className="size-5" aria-hidden />
                  </button>
                </div>
                <Button leadingIcon={RiAddLine} onClick={() => startNew(anchor, 9)}>
                  New event
                </Button>
              </>
            ) : undefined
          }
        />

        {isHome ? (
          <div className="mb-3 flex min-h-0 flex-1 gap-3">
            {calView === "month" ? (
              <MonthGrid
                weeks={monthWeeks(anchor)}
                month={anchor}
                events={events}
                today={today}
                selectedId={openId}
                onEventPress={pressEvent}
                onDayOpen={openDay}
                onCreate={startNew}
              />
            ) : (
              <>
                <TimeGrid
                  key={calView}
                  days={calView === "week" ? weekDays(anchor) : [anchor]}
                  events={events}
                  today={today}
                  now={NOW}
                  selectedId={openId}
                  onEventPress={pressEvent}
                  onDayOpen={openDay}
                  onCreate={startNew}
                />
                {calView === "day" ? (
                  <DayRail date={anchor} events={events} selectedId={openId} onDateChange={setAnchor} onEventPress={pressEvent} />
                ) : null}
              </>
            )}
          </div>
        ) : (
          <section
            aria-label={navItem?.label ?? view}
            className="mb-3 flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default p-10 text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-background-primary-default text-foreground-icon-secondary shadow-xs">
              {navItem ? <navItem.icon className="size-6" aria-hidden /> : <RiCalendarLine className="size-6" aria-hidden />}
            </span>
            <div className="flex max-w-sm flex-col gap-1">
              <h2 className="text-title-3-medium text-text-primary">{navItem?.label ?? view}</h2>
              <p className="text-body-regular text-text-secondary">
                {navItem?.label ?? "This view"} is a template of its own. This page is the calendar, so there is nothing to show here yet.
              </p>
            </div>
            <Button variant="secondary" leadingIcon={RiArrowLeftLine} onClick={() => setView(HOME_VIEW)}>
              Back to Calendar
            </Button>
          </section>
        )}
      </main>

      <Popover
        triggerRef={anchorRef}
        isOpen={openEvent != null && isHome}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
        placement="end top"
        aria-label={openEvent?.title ?? "Event"}
        className="w-[340px]"
        dialogClassName="flex flex-col gap-3 p-3"
      >
        {openEvent ? (
          <EventDetails
            event={openEvent}
            onRsvp={(status) => rsvp(openEvent, status)}
            onJoin={() => {
              setOpenId(null);
              toast.info(`Joining ${openEvent.title}`, { description: `Meeting code ${openEvent.meetingCode ?? ""}` });
            }}
            onCopyCode={() => {
              const code = openEvent.meetingCode ?? "";
              navigator.clipboard?.writeText(code).catch(() => {});
              toast.success("Meeting code copied", { description: code });
            }}
            onDelete={() => deleteEvent(openEvent)}
          />
        ) : null}
      </Popover>
      <NewEventDialog key={draftKey} isOpen={newOpen} onOpenChange={setNewOpen} draft={draft} onCreate={createEvent} />
      <Toaster position="bottom-end" />
    </div>
  );
}
