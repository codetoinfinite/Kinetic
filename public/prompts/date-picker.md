# Build: Date Picker

A single-date picker: a calendar-icon trigger shows the committed date, and clicking it opens a popover holding one month, a typed date chip and Cancel / Apply buttons. Picking a day only changes a draft; `onChange` fires on Apply. The popover scales in from 95% with a 2px blur, and the date chip drops in with a slight overshoot the first time a day is chosen.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A trigger button that opens one month in a popover, with an editable DD/MM/YYYY chip and Cancel / Apply so nothing commits early.

- Category: form
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1, @internationalized/date@^3.12.4, @remixicon/react@^4.9.0, motion@^12.43.0

## How it works

1. The trigger is a plain `<button>` styled with the shared `triggerButtonClassName` (white surface, `rounded-2lg`, `shadow-xs`, 150ms colour transition). Its label is the committed value through `Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" })`, or "Select date" when empty, next to a 20px `RiCalendarLine`.
2. The surface is a standalone React Aria `Popover` with `triggerRef`, `isOpen`, `offset={4}`, `placement="bottom end"` and `isNonModal`, wrapping a `Dialog`. Non-modal avoids the scroll lock and focus trap, but it also turns off outside-click dismissal, so `useDismissOnOutsidePress` closes it on any `pointerdown` outside both the trigger and the popover.
3. Value is split in two. `committedValue` is the controlled `value` or internal state from `defaultValue`. `pendingValue` is what the `Calendar` edits. Apply calls `commit(pendingValue)`, which sets internal state when uncontrolled, fires `onChange` and closes; Cancel resets the draft to the committed value and closes.
4. An effect keyed on `isOpen` resets the draft to the committed value and increments `openKey` on every open, and `Calendar` is keyed on `openKey`. React Aria's Calendar keeps its own visible month while mounted (the Popover stays mounted through its exit animation), so without the remount a value changed from outside would reopen on the old month.
5. Inside the Calendar sits the shared `MonthPanel` (326px card, 32px cells, 12px spacing). The footer's `AnimatePresence` mounts a `motion.div` with the editable `DateChipInput` once a draft exists: `initial { opacity: 0, y: -12 }` to `{ opacity: 1, y: 0 }` over 0.25s with the overshoot curve `[0.34, 1.2, 0.64, 1]`. The chip keeps its own text while typing and commits on blur or Enter; text that does not parse as `DD/MM/YYYY` reverts.
6. Passing `triggerRef` switches to external mode: DatePicker hides its own button, anchors the popover to the given element and takes `isOpen` / `onOpenChange` from the caller.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `popover offset / placement = 4px, bottom end`
  Four pixels clears the trigger's shadow without looking detached. `end` right-aligns the 342px popover to the trigger, so a trigger at the right of a toolbar or card header opens inward.
- `popover enter / exit = 150ms ease-out, opacity 0, scale-95, blur-[2px], origin-top`
  From the shared `popoverClassName`. The scale grows down from the trigger edge; the blur hides the text snapping in on the first frame.
- `date chip entrance = y -12 → 0, 0.25s, ease [0.34, 1.2, 0.64, 1]`
  The control point above 1 overshoots slightly, so the chip settles rather than sliding to a dead stop. Twelve pixels reads as dropping out of the calendar above it.
- `z-index = z-110`
  Above the kit's modal layer (z-100), so a date picker inside a dialog opens over it.
- `chip width = w-[104px]`
  Fits "DD/MM/YYYY" at the body-medium size with 8px padding, so the field does not resize as digits are typed.

## API

```ts
function DatePicker(props: { value?: CalendarDate | null; defaultValue?: CalendarDate | null; onChange?: (value: CalendarDate | null) => void; isDisabled?: boolean; className?: string; "aria-label"?: string; triggerRef?: RefObject<HTMLElement | null>; isOpen?: boolean; onOpenChange?: (isOpen: boolean) => void }): JSX.Element
```

- `value: CalendarDate | null`
  Controlled committed date. Leave undefined for uncontrolled use.
- `defaultValue: CalendarDate | null` — default `null`
  Initial committed date when uncontrolled.
- `onChange: (value: CalendarDate | null) => void`
  Fires on Apply with the drafted date, never while browsing the month.
- `isDisabled: boolean`
  Disables the built-in trigger button.
- `aria-label: string` — default `"Date"`
  Labels the dialog and the calendar grid.
- `triggerRef: RefObject<HTMLElement | null>`
  Anchor the popover to your own element; DatePicker's button is then not rendered.
- `isOpen / onOpenChange: boolean / (isOpen: boolean) => void`
  Open state, used only together with `triggerRef`.
- `className: string`
  Merged onto the trigger button.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function DatePicker({
  value,
  defaultValue = null,
  onChange,
  isDisabled,
  className,
  "aria-label": ariaLabel = "Date",
  triggerRef: externalTriggerRef,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}: DatePickerProps) {
  const localize = useTemplateCopy();
  const { locale } = useLocale();
  const ownTriggerRef = useRef<HTMLButtonElement>(null);
  const triggerRef = externalTriggerRef ?? ownTriggerRef;
  const isExternal = externalTriggerRef !== undefined;
  const popoverRef = useRef<HTMLElement>(null);

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isExternal ? (controlledIsOpen ?? false) : internalOpen;
  const setIsOpen = isExternal ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<CalendarDate | null>(defaultValue);
  const committedValue = isControlled ? (value ?? null) : internalValue;

  const [pendingValue, setPendingValue] = useState<CalendarDate | null>(committedValue);
  // React Aria's `Calendar` keeps its own internal `visibleRange` state for
  // as long as it stays mounted (Popover keeps its content mounted between
  // opens for the exit animation), so it never re-derives the visible month
  // from a later `value` change on its own. Bumping this on every open and
  // keying `Calendar` on it forces a fresh mount showing the right month —
  // needed for the external-trigger case, where `value` can jump (e.g. the
  // calendar template's month switcher) between one open and the next.
  const [openKey, setOpenKey] = useState(0);

  // Re-sync the calendar's displayed month/selection to the current
  // committed value every time the popover opens — not just when DatePicker's
  // own trigger toggles it, but also when `isOpen` is flipped true by an
  // external trigger (`triggerRef`), which never runs `openChange` below.
  useEffect(() => {
    if (isOpen) {
      setPendingValue(committedValue);
      setOpenKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resync on the open transition only, not every committedValue change
  }, [isOpen]);

  const commit = (next: CalendarDate | null) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
    setIsOpen(false);
  };

  const openChange = (open: boolean) => {
    setIsOpen(open);
  };

  useDismissOnOutsidePress(isOpen, () => setIsOpen(false), [triggerRef, popoverRef]);

  return localize((
    <>
      {!isExternal && (
        <button
          ref={ownTriggerRef}
          type="button"
          disabled={isDisabled}
          onClick={() => openChange(!isOpen)}
          className={cx(triggerButtonClassName, className)}
        >
          <RiCalendarLine className="size-5 shrink-0 text-foreground-icon-primary" aria-hidden />
          <span className="flex items-center justify-center whitespace-nowrap px-1 text-body-medium text-text-primary">
            {committedValue ? formatTriggerDate(committedValue, locale) : "Select date"}
          </span>
        </button>
      )}
      <Popover
        ref={popoverRef}
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={openChange}
        offset={4}
        placement="bottom end"
        isNonModal
        className={popoverClassName}
      >
        <Dialog aria-label={ariaLabel} className="outline-none">
          <Calendar key={openKey} aria-label={ariaLabel} value={pendingValue} onChange={setPendingValue}>
            <div className="flex flex-col pt-2 pe-2 pb-3 ps-2">
              <MonthPanel offset={0} showPrev showNext />
              <div className="flex items-center justify-between pt-3 pe-4 ps-4">
                <div>
                  <AnimatePresence>
                    {pendingValue && (
                      <motion.div
                        key="date-summary"
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25, ease: [0.34, 1.2, 0.64, 1] }}
                      >
                        <DateChipInput date={pendingValue} label="Date" onCommit={setPendingValue} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPendingValue(committedValue);
                      setIsOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => commit(pendingValue)} disabled={!pendingValue}>
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </Calendar>
        </Dialog>
      </Popover>
    </>
  ));
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The outside-press hook removes its document `pointerdown` listener when the popover closes or the component unmounts. Motion's `AnimatePresence` finishes or cancels the chip animation on unmount. No timers.

**Reduced motion.** The component does not branch on `prefers-reduced-motion`: the popover's 150ms fade, scale and blur and the chip's 12px drop still play. Both are short. Wrap the app in Motion's `<MotionConfig reducedMotion="user">` to drop the chip's transform; the day-cell selection only fades opacity.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not fire `onChange` from the Calendar's own `onChange`. The calendar edits a draft; only Apply commits, and Cancel must leave the committed value untouched.
- Do not remove the `openKey` remount. The popover content stays mounted between opens, so the Calendar keeps showing the month it last displayed even after `value` moved to another month.
- Do not set `isNonModal` without restoring outside dismissal. React Aria couples the two, and the popover would then only close through Cancel, Apply or Escape.
- Do not pass a JS `Date`. `value`, `defaultValue` and `onChange` use `CalendarDate` from `@internationalized/date` (`parseDate("2026-03-18")`).
- Do not render it with an initial `isOpen` on a server-rendered page. Open it from the trigger.

## Notes

- Strings are run through `useTemplateCopy`, so a `TemplateCopyProvider` higher up can translate "Select date", "Cancel" and "Apply" without forking the component.
- The month grid, day cell, chip input and popover chrome come from the shared date-picker module, the same code that renders `DateRangePicker` and `DateCalendar`.

## Definition of done

The trigger shows the current date (e.g. "Mar 18, 2026"). Clicking it opens a month card below, right-aligned, fading and scaling in. Clicking a day moves the pill and drops a DD/MM/YYYY chip into the footer, but the trigger label does not change. Typing a valid date in the chip and pressing Enter moves the selection; invalid text reverts on blur. Apply updates the trigger and fires `onChange` once; Cancel or a click outside closes it with the old date intact. Reopening shows the month of the committed date.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
