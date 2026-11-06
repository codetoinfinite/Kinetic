# Build: Date Range Picker

A dashboard-style range picker. The trigger shows the committed span ("Mar 2, 2026 - Mar 15, 2026"); the popover pairs a column of presets (Today through All time) with two side-by-side months whose selection reads as one continuous band. The footer drops in editable start and end chips and a "14 days selected" pill, and nothing is committed until Apply.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Two adjacent months in a popover with a quick-select sidebar, typed start and end chips, a day count and Cancel / Apply.

- Category: form
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1, @internationalized/date@^3.12.4, @remixicon/react@^4.9.0, motion@^12.43.0

## How it works

1. A controlled React Aria `DialogTrigger` wraps an `AriaButton` trigger and a `Popover` (`offset={4}`, `placement="bottom end"`, `isNonModal`). Its `onOpenChange` first asks `useTriggerToggle` whether to allow the change, then on open resets the draft to the committed range. `useDismissOnOutsidePress` restores the outside-click close that `isNonModal` turns off.
2. State is two ranges: `committedValue` (controlled `value`, or internal state seeded from `defaultValue`) and `pendingValue`, which the `RangeCalendar`, the presets and the chips all edit. Apply calls `commit(pendingValue)` (internal state when uncontrolled, then `onChange`) and the Dialog render prop's `close()`; Cancel resets the draft and closes.
3. `RangeCalendar` gets `visibleDuration={{ months: 2 }}` and renders two shared `MonthPanel`s in a `flex gap-2` row: `offset={0}` with only the previous chevron, `offset={1}` with only the next one. The inner chevron slots render as invisible 16px spacers, because two adjacent months share one navigation state.
4. The 118px `QuickSelect` column lists eight presets built in a `useMemo` from `today(getLocalTimeZone())`: Today, Yesterday, Last week (the 7 days before today), This month, Last month, This year, Last year and All time (10 years back). A preset whose start and end match the draft with `isSameDay` gets `bg-background-tertiary-default`.
5. The footer's `AnimatePresence` mounts the summary once a draft exists, sliding from `y: -12` over 0.25s on `[0.34, 1.2, 0.64, 1]`. Two `DateChipInput`s edit start and end as DD/MM/YYYY; a typed start after the end moves the end to it, and a typed end before the start moves the start. The pill counts days inclusively: `Math.round((end - start) / 86_400_000) + 1` using local-time `Date`s.
6. Day cells come from the shared `DayCell`: a band layer and an edge-pill layer that only change opacity (100ms), with the band reaching 6px into the 12px cell gaps so a range across both months reads as one strip broken only at week edges.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `ms per day + round = 86_400_000, Math.round(...) + 1`
  Local-time dates across a DST change are 23 or 25 hours apart; rounding absorbs that. The +1 makes the count inclusive, so a one-day range says "1 day selected", not 0.
- `quick-select width = w-[118px], gap-1.5`
  Fits the longest preset label ("Last month") at body-medium with 8px padding, so the months beside it never shift as the active preset changes.
- `popover offset / placement = 4px, bottom end`
  The popover is wider than most triggers (sidebar plus two 326px months), so aligning its end edge to the trigger keeps it opening inward from a right-hand toolbar slot.
- `summary entrance = y -12 → 0, 0.25s, ease [0.34, 1.2, 0.64, 1]`
  A small overshoot so the chips settle in under the months. The same values as the single Date Picker, so the two read as one family.
- `All time preset = today minus 10 years`
  A bounded stand-in for "everything". An unbounded start would leave the calendar no month to show.

## API

```ts
interface DateRangeValue { start: CalendarDate; end: CalendarDate }
function DateRangePicker(props: { value?: DateRangeValue | null; defaultValue?: DateRangeValue | null; onChange?: (value: DateRangeValue | null) => void; isDisabled?: boolean; className?: string; popoverClassName?: string; "aria-label"?: string; placeholder?: string }): JSX.Element
```

- `value: DateRangeValue | null`
  Controlled committed range of `CalendarDate`s.
- `defaultValue: DateRangeValue | null` — default `null`
  Initial range when uncontrolled.
- `onChange: (value: DateRangeValue | null) => void`
  Fires once on Apply.
- `isDisabled: boolean`
  Disables the trigger.
- `placeholder: string` — default `"Select date range"`
  Trigger text when no range is committed.
- `aria-label: string` — default `"Date range"`
  Labels the dialog and the range calendar.
- `className: string`
  Merged onto the trigger button.
- `popoverClassName: string`
  Extra classes for the portalled popover surface.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function DateRangePicker({
  value,
  defaultValue = null,
  onChange,
  isDisabled,
  className,
  popoverClassName: calendarClassName,
  "aria-label": ariaLabel = "Date range",
  placeholder = "Select date range",
}: DateRangePickerProps) {
  const localize = useTemplateCopy();
  const { locale } = useLocale();
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<DateRangeValue | null>(defaultValue);
  const committedValue = isControlled ? (value ?? null) : internalValue;

  const [pendingValue, setPendingValue] = useState<DateRangeValue | null>(committedValue);

  const commit = (next: DateRangeValue | null) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  };

  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  useDismissOnOutsidePress(isOpen, () => setIsOpen(false), [triggerRef, popoverRef]);
  // Pressing the trigger while open closes the popover instead of reopening
  const allowOpenChange = useTriggerToggle(isOpen, triggerRef);

  return localize((
    <DialogTrigger
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!allowOpenChange(open)) return;
        if (open) setPendingValue(committedValue);
        setIsOpen(open);
      }}
    >
      <AriaButton ref={triggerRef} isDisabled={isDisabled} className={cx(triggerButtonClassName, className)}>
        <RiCalendarLine className="size-5 shrink-0 text-foreground-icon-primary" aria-hidden />
        <span className="flex items-center justify-center whitespace-nowrap px-1 text-body-medium text-text-primary">
          {committedValue ? `${formatTriggerDate(committedValue.start, locale)} - ${formatTriggerDate(committedValue.end, locale)}` : placeholder}
        </span>
      </AriaButton>
      <Popover ref={popoverRef} offset={4} placement="bottom end" isNonModal className={cx(popoverClassName, calendarClassName)}>
        <Dialog aria-label={ariaLabel} className="outline-none">
          {({ close }) => (
            <RangeCalendar
              aria-label={ariaLabel}
              visibleDuration={{ months: 2 }}
              value={pendingValue}
              onChange={setPendingValue}
            >
              <div className="flex gap-3">
                <div className="pt-4 ps-4">
                  <QuickSelect
                    value={pendingValue}
                    onSelect={(range) => setPendingValue(range)}
                  />
                </div>
                <div className="flex flex-col pt-2 pe-2 pb-3">
                  <div className="flex gap-2">
                    <MonthPanel offset={0} showPrev />
                    <MonthPanel offset={1} showNext />
                  </div>
                  <Footer
                    value={pendingValue}
                    onChange={setPendingValue}
                    onCancel={() => {
                      setPendingValue(committedValue);
                      close();
                    }}
                    onApply={() => {
                      commit(pendingValue);
                      close();
                    }}
                  />
                </div>
              </div>
            </RangeCalendar>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  ));
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The outside-press and trigger-toggle hooks add document `pointerdown` listeners only while open and remove them on close and unmount. `AnimatePresence` handles the footer's exit. No timers.

**Reduced motion.** Nothing branches on `prefers-reduced-motion`. The popover's 150ms fade, scale and 2px blur and the footer's 12px drop still play; day selection only fades opacity. Wrap the app in Motion's `<MotionConfig reducedMotion="user">` to drop the footer's transform.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not remove `useTriggerToggle`. With `isNonModal`, pressing the trigger while open makes React Aria fire `onOpenChange(false)` and then `onOpenChange(true)` in the same press, so the popover would never close from its trigger.
- Do not wire the two inner chevrons. The months are always adjacent, so there is one paging state; four buttons would give two that do the same thing as the outer pair.
- Do not count days as `end.day - start.day` or with a floor. That breaks across months and across DST changes; subtract real dates, round, and add one.
- Do not hoist the presets to module scope. They are built from `today()` when the popover renders, so a module-level list would freeze "today" at import time and differ between server and client.
- Do not commit on every calendar click. The draft only becomes the value on Apply, and Cancel must restore the trigger's range.

## Notes

- `popoverClassName` adds classes to the portalled surface (for a locale-specific font, for example), since the popover renders outside the trigger's tree.
- Strings run through `useTemplateCopy`, so preset labels, "days selected", Cancel and Apply can be translated by a `TemplateCopyProvider`.
- The popover is wide (sidebar plus two months, about 810px). On a phone-width viewport the popover is capped at `calc(100vw - 2rem)` and scrolls sideways inside, so Apply stays reachable; for narrow layouts, `DateRangeCalendar` with `visibleMonths={1}` fits without scrolling.

## Definition of done

The trigger reads "Mar 2, 2026 - Mar 15, 2026" for that committed range. Clicking it opens a popover with eight presets on the left and two consecutive months; clicking a start and then an end day draws a single band (crossing into the second month if needed) and the footer shows both dates as DD/MM/YYYY chips and "N days selected" counted inclusively. Clicking "This month" selects today's month and highlights the preset. Pressing the trigger again closes the popover. Apply updates the trigger and fires `onChange` once; Cancel or an outside click leaves it unchanged.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
