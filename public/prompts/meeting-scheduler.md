# Build: Meeting Scheduler

A compact "Schedule a meeting" button that opens a three-column booking panel: who you are meeting and what about on the left, a single-month calendar in the middle, and a timezone label, 12h / 24h switch and scrolling half-hour slots on the right. Choices are a draft until "Send meeting", which stays disabled until both a day and a time are picked, then commits and closes. The trigger is a plain button driving a controlled React Aria `Popover`, so the wide panel floats above the page and never pushes layout.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A Cal.com-style booking popover: host and meeting summary, a month calendar and a half-hour slot list, committed by "Send meeting".

- Category: form
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1, @internationalized/date@^3.12.4, @remixicon/react@^4.9.0

## How it works

1. The trigger is a native `<button>` with the shared date-picker trigger styling and a chevron that rotates 180 degrees over 200ms while open. It toggles `isOpen` and, on opening, copies the committed value into `pendingValue`, so a draft abandoned last time never resurfaces.
2. The panel is a React Aria `Popover` wired with `triggerRef`, `isOpen` / `onOpenChange`, `placement="bottom end"`, `offset={8}` and `isNonModal`, so the page behind stays interactive. Non-modal popovers lose React Aria's outside-click dismissal, so `useDismissOnOutsidePress` adds a document `pointerdown` listener that closes it unless the press lands in the trigger or the panel.
3. Inside a `Dialog`, a React Aria `Calendar` bound to `pendingValue.date` wraps the whole 429px-tall row, so the shared `MonthPanel` (`offset={0}` with both arrows) renders the grid and day cells. Picking a day keeps any time already chosen; picking a slot keeps the day (falling back to today).
4. The left column (207px) shows the host avatar initial, name and email, the meeting title and description, then duration, language and conferencing rows pinned to the bottom. Under the calendar a chip shows the pending date and time ("Select a time" until one is picked) beside the "Send meeting" button.
5. The right column (170px) holds the timezone label, a weekday + day chip, a 12h / 24h switch (24h by default) and the slots: 09:00 to 18:30 every 30 minutes, generated once and shown as "2:30 PM" in 12h mode. The list scrolls inside a mask that fades the top 16px, and the chosen slot gets the tertiary background.
6. "Send meeting" calls `commit(pendingValue)`: uncontrolled, it stores the value internally; either way it calls `onChange({ date, time })` with `time` as 24-hour "HH:mm", and closes the popover.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `panel columns = 207px summary, 326px MonthPanel, 170px slots, gap-4, h-[429px]`
  From the Figma "Meeting" frame (node 3881:7618). A fixed height lets the slot column scroll while the summary and calendar stay put.
- `slots = 09:00 to 18:30, every 30 minutes (20 slots)`
  Replaces Figma's static mock (which repeated 14:00) with a generated working-day range.
- `popover = placement bottom end, offset 8, isNonModal`
  Right-aligned to the trigger so it can sit at the end of a toolbar; non-modal so the page stays scrollable and clickable while the panel is open.
- `slot mask = linear-gradient(to bottom, transparent, black 16px, black 100%)`
  Slots scrolled under the 24h toggle fade out instead of being cut off at a hard edge.
- `defaultOpen threshold = (min-width: 640px), applied after mount`
  If the ~735px panel is in the first paint, mobile Safari sizes its layout viewport to it and the page stays zoomed out after it closes.

## API

```ts
function MeetingScheduler(props: { host?: { name: string; email: string; avatarInitial: string }; meeting?: { title: string; description?: string; durationMinutes: number; language?: string; conferencing?: string }; timezone?: string; value?: MeetingSchedulerValue | null; defaultValue?: MeetingSchedulerValue | null; onChange?: (value: MeetingSchedulerValue | null) => void; defaultOpen?: boolean; className?: string; "aria-label"?: string; triggerLabel?: string }): JSX.Element
```

- `value / defaultValue: { date: CalendarDate; time: string | null } | null`
  Controlled or initial booking. Without either, the draft starts on today with no time.
- `onChange: (value: MeetingSchedulerValue | null) => void`
  Fires once, when "Send meeting" is pressed.
- `host: MeetingSchedulerHost` — default `Jordan Lee`
  Name, email and avatar initial in the summary column.
- `meeting: MeetingSchedulerDetails` — default `30 min intro meeting`
  Title, description, duration, language and conferencing rows.
- `timezone: string` — default `"Amsterdam"`
  Label in the slot column header.
- `triggerLabel: string` — default `"Schedule a meeting"`
  Text on the trigger button.
- `defaultOpen: boolean` — default `false`
  Opens after mount on viewports 640px and wider.
- `aria-label: string` — default `"Schedule meeting"`
  Names the dialog and the calendar grid.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function MeetingScheduler({
  host = DEFAULT_HOST,
  meeting = DEFAULT_MEETING,
  timezone = "Amsterdam",
  value,
  defaultValue = null,
  onChange,
  defaultOpen = false,
  className,
  "aria-label": ariaLabel = "Schedule meeting",
  triggerLabel = "Schedule a meeting",
}: MeetingSchedulerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const timeSlots = useTimeSlots();
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<MeetingSchedulerValue | null>(
    defaultValue ?? { date: today(getLocalTimeZone()), time: null },
  );
  const committedValue = isControlled ? value : internalValue;

  const [pendingValue, setPendingValue] = useState<MeetingSchedulerValue | null>(committedValue);
  const [use24h, setUse24h] = useState(true);
  // Never honor `defaultOpen` on the initial render: the ~700px-wide panel
  // being in the very first paint makes mobile Safari compute its layout
  // viewport from that width, permanently zooming the whole page out even
  // after the panel closes. Open it post-mount instead, and only on
  // viewports wide enough to show the panel without overflowing.
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (!defaultOpen) return;
    if (window.matchMedia("(min-width: 640px)").matches) {
      setIsOpen(true);
    }
  }, [defaultOpen]);

  const commit = (next: MeetingSchedulerValue | null) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
    setIsOpen(false);
  };

  useDismissOnOutsidePress(isOpen, () => setIsOpen(false), [triggerRef, popoverRef]);

  const chip = pendingValue ? formatChipDateTime(pendingValue) : null;
  const dayChip = pendingValue
    ? {
        weekday: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(pendingValue.date.toDate(getLocalTimeZone())).slice(0, 2),
        day: pendingValue.date.day,
      }
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen) setPendingValue(committedValue);
          setIsOpen((open) => !open);
        }}
        className={cx(triggerButtonClassName, className)}
      >
        <RiCalendarLine className="size-5 shrink-0 text-foreground-icon-primary" aria-hidden />
        <span className="flex items-center justify-center whitespace-nowrap px-1 text-body-medium text-text-primary">
          {triggerLabel}
        </span>
        <ChevronDownSmall
          className={cx("size-4 shrink-0 text-text-secondary transition-transform duration-200 ease", isOpen && "rotate-180")}
        />
      </button>
      <Popover
        ref={popoverRef}
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom end"
        offset={8}
        isNonModal
        className={popoverClassName}
      >
        <Dialog aria-label={ariaLabel} className="outline-none">
          <Calendar
            aria-label={ariaLabel}
            value={pendingValue?.date ?? null}
            onChange={(date) => setPendingValue((prev) => ({ date, time: prev?.time ?? null }))}
          >
            <div className="flex h-[429px] gap-4">
              {/* Host + meeting summary */}
              <div className="flex w-[207px] shrink-0 flex-col gap-4 py-4 ps-4">
                <div className="flex flex-col items-start gap-2">
                  <Avatar size="md" color="blue" initials={host.avatarInitial} />
                  <div className="flex flex-col text-body-medium">
                    <span className="text-text-primary">{host.name}</span>
                    <span className="text-text-secondary">{host.email}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-title-3-medium text-text-primary">{meeting.title}</p>
                  {meeting.description && (
                    <p className="text-body-2-medium text-text-secondary">{meeting.description}</p>
                  )}
                </div>
                <div className="mt-auto flex flex-col gap-3">
                  <InfoRow icon={<GlyphIcon icon={RiGlobalLine} />}>{meeting.durationMinutes} minutes</InfoRow>
                  {meeting.language && <InfoRow icon={<GlyphIcon icon={RiFlagLine} />}>{meeting.language}</InfoRow>}
                  {meeting.conferencing && <InfoRow icon={<GoogleMeetIcon />}>{meeting.conferencing}</InfoRow>}
                </div>
              </div>

              {/* Calendar + footer */}
              <div className="flex flex-col gap-3 pt-2 pb-3">
                <MonthPanel offset={0} showPrev showNext />
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 rounded-2lg border border-border-button-default bg-background-primary-default px-2 py-2 text-body-medium text-text-primary shadow-xs">
                    {chip && (
                      <>
                        <span>{chip.date}</span>
                        <span className="text-text-secondary">{chip.time}</span>
                      </>
                    )}
                  </span>
                  <Button onClick={() => commit(pendingValue)} disabled={!pendingValue?.time}>
                    Send meeting
                  </Button>
                </div>
              </div>

              {/* Timezone + hour format + time slots */}
              <div className="flex h-full w-[170px] shrink-0 flex-col gap-3 overflow-hidden pt-4 pe-4">
                <button
                  type="button"
                  className="flex cursor-pointer items-center justify-between rounded-2lg outline-none"
                >
                  <span className="flex items-center gap-[5px] text-body-medium text-text-primary">
                    <RiGlobalLine className="size-5 shrink-0 text-foreground-icon-primary" aria-hidden />
                    {timezone}
                  </span>
                  <ChevronDownSmall className="size-4 shrink-0 text-text-secondary" />
                </button>

                <div className="flex items-center justify-between">
                  {dayChip && (
                    <span className="inline-flex items-center gap-[3px] rounded-2lg bg-background-tertiary-default px-2 py-1 text-body-medium">
                      <span className="text-text-primary">{dayChip.weekday}</span>
                      <span className="text-text-secondary">{dayChip.day}</span>
                    </span>
                  )}
                  <HourFormatToggle use24h={use24h} onChange={setUse24h} />
                </div>

                <div
                  className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-3"
                  style={{
                    maskImage: "linear-gradient(to bottom, transparent, black 16px, black 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, transparent, black 16px, black 100%)",
                  }}
                >
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() =>
                        setPendingValue((prev) => ({ date: prev?.date ?? today(getLocalTimeZone()), time: slot }))
                      }
                      className={cx(
                        "w-full shrink-0 cursor-pointer rounded-2lg px-2 py-1.5 text-center text-body-medium text-text-primary transition-colors duration-150 ease",
                        pendingValue?.time === slot
                          ? "bg-background-tertiary-default"
                          : "hover:bg-background-secondary-hover",
                      )}
                    >
                      {formatTime(slot, use24h)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Calendar>
        </Dialog>
      </Popover>
    </>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The outside-press hook removes its document listener when the panel closes or the component unmounts, and React Aria tears down the popover's positioning and focus handling on close. No timers.

**Reduced motion.** The component does not branch on `prefers-reduced-motion`. The motion is the shared popover entrance (150ms opacity, scale and blur), the 200ms chevron turn and 150ms colour fades on slots and the hour toggle, all brief and none needed to understand the state.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not open the panel during the first render. `defaultOpen` is applied in an effect and only on viewports of 640px or wider; rendering a ~735px overlay in the first paint zooms mobile Safari out permanently.
- Do not commit on every click. Date and slot edits go to `pendingValue`; only "Send meeting" calls `onChange`, so closing the panel discards the draft.
- Do not leave `isNonModal` without the outside-press hook. React Aria skips light dismiss for non-modal popovers, so clicking the page would leave the panel stuck open.
- Do not rely on the uncontrolled default in server-rendered pages. With no `value` or `defaultValue` it seeds today's date, which can differ between server and client around midnight; pass a value.

## Notes

- The value is `{ date: CalendarDate; time: string | null }`; `time` is always 24-hour "HH:mm" regardless of the 12h / 24h display.
- The timezone row is a label with a chevron, not a working selector; wire your own picker there if you need one.
- The trigger keeps `triggerLabel` ("Schedule a meeting") after booking; show the booked time elsewhere, as the demo does.
- BoardUI ships a Google Meet bitmap for conferencing; this port uses a Remix video icon.

## Definition of done

A "Schedule a meeting" button with a calendar icon and chevron. Clicking it opens a panel below, right-aligned, with the host card and meeting rows, a month calendar and a slot column from 09:00 to 18:30; "Send meeting" is disabled. Picking a day updates the chip and the weekday badge, picking a slot highlights it and fills the chip, and "Send meeting" becomes enabled. Toggling 12h shows "9:00 AM" style labels. Pressing "Send meeting" closes the panel and calls `onChange` with the date and the 24-hour time; clicking outside instead closes it without calling `onChange`.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
