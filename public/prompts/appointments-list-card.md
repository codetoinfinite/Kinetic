# Build: Appointments List Card

A patient's upcoming appointments in the medical profile's grey card: a label, a big count of visits that are not cancelled, then one white tile per visit with a month/day/weekday chip, the visit type, its time window and mode, the doctor's initials and a status chip. Reschedule opens a menu of open slots and moves the visit, Cancel strikes it through and swaps the actions for an Undo that restores the status it had.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Upcoming visits as inner tiles: date chip, time window, mode, doctor initials and status, with reschedule slots, cancel and undo.

- Category: display
- Runtime cost: css
- Dependencies: @internationalized/date@^3.12.4, @remixicon/react@^4.9.0

## How it works

1. The list is controlled (`appointments`) or uncontrolled (`defaultAppointments`); every change goes through `commit`, which updates internal state only when uncontrolled and always calls `onAppointmentsChange` with the whole list. Tiles render sorted by the `date`T`time` string, so a moved visit slides to its new place.
2. Dates are parsed with `parseDate` / `parseDateTime` from @internationalized/date and printed with `DateFormatter` in the `locale` (en-US by default) on `toDate("UTC")` with `timeZone: "UTC"`, so the chip and the "9:30 AM – 10:00 AM" window never shift with the viewer's timezone. The end time adds `durationMinutes` (default 30) with `.add({ minutes })`.
3. Reschedule is a kit `Dropdown` whose open state is held per card (`openMenu` = the visit id), because `DropdownItem` does not close the menu itself. Its items come from `getSlots`, which defaults to `defaultSlots`: the next three weekdays after the visit (`getDayOfWeek` skips Saturday and Sunday) at the same time, 14:30 and 10:00. Picking one patches `date`, `time` and `status: "rescheduled"`, closes the menu and calls `onReschedule`.
4. Cancel stores the current status in `previousStatus` keyed by id, then sets `status: "cancelled"`; the tile dims to 60% with a line-through and shows Undo, which restores the stored status (or "confirmed") and calls `onRestore`.
5. The count and the date chip are keyed by their value (`active` count, `date`T`time`), so the kit `animate-number-fade` keyframe replays when a visit is cancelled, restored or moved. A visually hidden `aria-live="polite"` line announces each change.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `default duration = 30 minutes`
  Most outpatient visits; the end of the time window is start + durationMinutes.
- `default slots = next 3 weekdays at same time, 14:30, 10:00`
  Gives a morning and an afternoon option without a scheduling backend.
- `cancelled opacity = 60%`
  Keeps the cancelled visit readable for the Undo while clearly out of the schedule.
- `date chip width = 48px`
  Fits a three-letter month, a two-digit day and a weekday at caption size.

## API

```ts
export function AppointmentsListCard({ appointments, defaultAppointments = [], onAppointmentsChange, onReschedule, onCancel, onRestore, getSlots = defaultSlots, title = "Upcoming appointments", countLabel = "scheduled", locale = "en-US", className }: AppointmentsListCardProps): JSX.Element
```

- `appointments: Appointment[]`
  Controlled list of visits.
- `defaultAppointments: Appointment[]` — default `[]`
  Initial list when uncontrolled.
- `onAppointmentsChange: (appointments: Appointment[]) => void`
  Called with the whole list after a reschedule, cancel or undo.
- `onReschedule: (appointment: Appointment, slot: AppointmentSlot) => void`
  Called when a slot is picked, with the visit before the move.
- `onCancel: (appointment: Appointment) => void`
  Called when a visit is cancelled.
- `onRestore: (appointment: Appointment) => void`
  Called when Undo restores a cancelled visit.
- `getSlots: (appointment: Appointment) => AppointmentSlot[]` — default `defaultSlots`
  Open slots offered in the Reschedule menu.
- `title: string` — default `"Upcoming appointments"`
  Card label and accessible name.
- `countLabel: string` — default `"scheduled"`
  Words after the count of visits that are not cancelled.
- `locale: string` — default `"en-US"`
  Locale for month, weekday and time formatting.
- `className: string`
  Classes on the card.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers, listeners or observers of its own; the kit Dropdown removes its outside-press listener when it closes.

**Reduced motion.** The count and date chip fades use motion-reduce:animate-none, so values swap instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not format a `CalendarDate` through the viewer's local timezone: convert with `toDate("UTC")` and format with `timeZone: "UTC"`, or the chip can show the previous day west of UTC.
- Do not leave the Reschedule menu uncontrolled: kit `DropdownItem` only runs `onSelect`, so the menu would stay open over the moved tile.
- Do not key the tile by its date: the `li` keeps the id as key so focus and the menu survive a re-sort, and only the date chip is keyed by start time to replay the fade.

## Notes

- Status colours: confirmed lime, pending yellow, rescheduled blue, cancelled rose (kit `Chip` caption variant).
- Mode icons are Remix `RiHospitalLine` (in person), `RiVideoChatLine` (video call) and `RiPhoneLine` (phone).
- The tile list is a flex-1 `overflow-y-auto` column, so a `max-h-*` class on the card keeps it to a fixed height and scrolls the visits (the demo uses max-h-[500px]).
- Doctor initials come from `doctorInitials` or the first letters of the first two words after a "Dr." prefix.

## Definition of done

Picking a slot in a Reschedule menu closes it, moves the visit to that date and time with a blue Rescheduled chip; Cancel shows a rose Cancelled chip, lowers the count by one and offers Undo, which restores the previous status.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
