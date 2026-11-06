# Build: Event Detail Popover

Wraps any trigger, usually a calendar event chip, in the kit Popover and shows the event behind it: a colour key and title, the long date, the time range, location, a meeting code with a Join button, and the guest list with RSVP labels. Edit and Delete sit as neutral icon buttons in the header. Every action closes the popover before handing the event to the caller, so a delete that removes the chip is safe. `EventDetails` is exported on its own for side panels.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Anchored calendar event card: colour key, date and time, location, meeting code with Join, guest RSVPs, edit and delete.

- Category: overlay
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1, @internationalized/date@^3.12.4, @remixicon/react@^4.9.0

## How it works

1. `EventDetailPopover` keeps its own open state (or takes `isOpen` / `onOpenChange`) and renders `PopoverTrigger` with the child as trigger and a 340px `Popover` placed "bottom start". React Aria positions and flips it, Escape closes it and focus returns to the chip.
2. The card header is a 12px rounded square in the event colour (the `dot` class from `calendarEventColorStyles`), a React Aria `Heading slot="title"` that names the dialog, and the long date from `formatEventDate`, which formats a fixed UTC noon instant so server and client print the same day.
3. A tinted `dl` lists time ("11:30 – 11:45", or "All day"), location and the meeting code; each label is an icon plus an `sr-only` term. The Join button sits at the end of the meeting row.
4. Guests render as initials avatars with the name and an RSVP label (Organizer, Going, Maybe, Declined, Awaiting); declined names are struck through. Past `maxAttendees` the rest collapse into "+N more", and the header counts guests and how many are going.
5. Join, Edit and Delete are wrapped by `act()`: it sets the popover closed first and then calls the handler, so removing the event in `onDelete` unmounts a closed trigger instead of yanking an open overlay.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `popover width = 340px`
  Fits the longest row (meeting code plus Join) on one line; the kit Popover caps it at 100vw − 32px on phones.
- `placement = "bottom start"`
  Opens under the chip aligned to its start edge, like the template; React Aria flips it when the chip is near the bottom.
- `maxAttendees = 4`
  Keeps the card under ~420px tall so it fits beside a month cell without scrolling.
- `colour key = 12px, radius 4px`
  Matches the chip tint so the card reads as the same event at a glance.

## API

```ts
function formatEventDate(date: { year: number; month: number; day: number }, locale?: string, options?: Intl.DateTimeFormatOptions): string
function EventDetails(props: { event: CalendarEvent; onJoin?: (e: CalendarEvent) => void; onEdit?: (e: CalendarEvent) => void; onDelete?: (e: CalendarEvent) => void; joinLabel?: string; locale?: string; hourCycle?: 12 | 24; maxAttendees?: number; className?: string }): JSX.Element
function EventDetailPopover(props: EventDetailsProps & { children: ReactNode; isOpen?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; placement?: Placement; closeOnAction?: boolean }): JSX.Element
```

- `event: CalendarEvent`
  The event to show (title, colour, start/end, location, meetingCode, attendees, description).
- `children: ReactNode`
  The trigger; must forward its ref and spread props.
- `isOpen / defaultOpen / onOpenChange: boolean / boolean / (open) => void` — default `uncontrolled, closed`
  Open state.
- `onJoin: (event) => void`
  Shows the Join button on the meeting row.
- `onEdit: (event) => void`
  Shows the edit icon button.
- `onDelete: (event) => void`
  Shows the delete icon button; always closes first.
- `placement: Placement` — default `"bottom start"`
  Preferred side; flips when needed.
- `closeOnAction: boolean` — default `true`
  Close after Join or Edit.
- `maxAttendees: number` — default `4`
  Guests listed before "+N more".
- `hourCycle: 12 | 24` — default `24`
  Time format.
- `locale: string` — default `"en-US"`
  Locale for dates and times.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No effects of its own. The kit PopoverTrigger owns the outside-press listener and removes it on close and unmount; date formatters are cached in a module-level map.

**Reduced motion.** The kit Popover fades in 150ms and adds a 0.95 scale and 2px blur only under `motion-safe`, so reduced motion keeps just the fade.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Calling the delete handler before closing the popover. The trigger unmounts while React Aria still tracks the open overlay; close first, then remove.
- Passing a trigger that does not forward its ref. PopoverTrigger wraps the child in React Aria `Pressable`, which needs the DOM node to anchor and to restore focus.
- Formatting the date with `toLocaleDateString` on a local Date. The server and browser zones can disagree about the day; format a UTC instant built from the calendar fields.

## Notes

- Control `isOpen` from the parent when the trigger should show a selected state while open, as the demo does with the chip `selected` prop.
- Pass `closeOnAction={false}` to keep the card open after Join or Edit.

## Definition of done

Clicking the "Stand-up" chip opens a dialog named "Stand-up" under it with "Thursday, August 20", "11:30 – 11:45", "Studio 2, 4th floor", the code "brd-xqtm-wav" with a Join button, and "6 guests · 3 going" with four guests and "+2 more". Escape closes it and focus returns to the chip. Join and Edit close it and report below the card. Delete closes it, removes the chip, lowers the event count and shows Undo, which puts the event back in time order.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
