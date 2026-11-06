import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'date-range-picker',
  title: 'Date Range Picker',
  category: 'form',
  kit: 'boardui',
  tags: ['date', 'range', 'calendar', 'popover', 'presets', 'react-aria', 'boardui'],
  blurb:
    'Two adjacent months in a popover with a quick-select sidebar, typed start and end chips, a day count and Cancel / Apply.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/date-range-picker.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [
    'react-aria-components@^1.22.1',
    '@internationalized/date@^3.12.4',
    '@remixicon/react@^4.9.0',
    'motion@^12.43.0',
  ],

  summary:
    'A dashboard-style range picker. The trigger shows the committed span ("Mar 2, 2026 - Mar 15, 2026"); the popover pairs a column of presets (Today through All time) with two side-by-side months whose selection reads as one continuous band. The footer drops in editable start and end chips and a "14 days selected" pill, and nothing is committed until Apply.',

  mechanism: [
    'A controlled React Aria `DialogTrigger` wraps an `AriaButton` trigger and a `Popover` (`offset={4}`, `placement="bottom end"`, `isNonModal`). Its `onOpenChange` first asks `useTriggerToggle` whether to allow the change, then on open resets the draft to the committed range. `useDismissOnOutsidePress` restores the outside-click close that `isNonModal` turns off.',
    'State is two ranges: `committedValue` (controlled `value`, or internal state seeded from `defaultValue`) and `pendingValue`, which the `RangeCalendar`, the presets and the chips all edit. Apply calls `commit(pendingValue)` (internal state when uncontrolled, then `onChange`) and the Dialog render prop\'s `close()`; Cancel resets the draft and closes.',
    '`RangeCalendar` gets `visibleDuration={{ months: 2 }}` and renders two shared `MonthPanel`s in a `flex gap-2` row: `offset={0}` with only the previous chevron, `offset={1}` with only the next one. The inner chevron slots render as invisible 16px spacers, because two adjacent months share one navigation state.',
    'The 118px `QuickSelect` column lists eight presets built in a `useMemo` from `today(getLocalTimeZone())`: Today, Yesterday, Last week (the 7 days before today), This month, Last month, This year, Last year and All time (10 years back). A preset whose start and end match the draft with `isSameDay` gets `bg-background-tertiary-default`.',
    'The footer\'s `AnimatePresence` mounts the summary once a draft exists, sliding from `y: -12` over 0.25s on `[0.34, 1.2, 0.64, 1]`. Two `DateChipInput`s edit start and end as DD/MM/YYYY; a typed start after the end moves the end to it, and a typed end before the start moves the start. The pill counts days inclusively: `Math.round((end - start) / 86_400_000) + 1` using local-time `Date`s.',
    'Day cells come from the shared `DayCell`: a band layer and an edge-pill layer that only change opacity (100ms), with the band reaching 6px into the 12px cell gaps so a range across both months reads as one strip broken only at week edges.',
  ],

  constants: [
    {
      name: 'ms per day + round',
      value: '86_400_000, Math.round(...) + 1',
      why: 'Local-time dates across a DST change are 23 or 25 hours apart; rounding absorbs that. The +1 makes the count inclusive, so a one-day range says "1 day selected", not 0.',
    },
    {
      name: 'quick-select width',
      value: 'w-[118px], gap-1.5',
      why: 'Fits the longest preset label ("Last month") at body-medium with 8px padding, so the months beside it never shift as the active preset changes.',
    },
    {
      name: 'popover offset / placement',
      value: '4px, bottom end',
      why: 'The popover is wider than most triggers (sidebar plus two 326px months), so aligning its end edge to the trigger keeps it opening inward from a right-hand toolbar slot.',
    },
    {
      name: 'summary entrance',
      value: 'y -12 → 0, 0.25s, ease [0.34, 1.2, 0.64, 1]',
      why: 'A small overshoot so the chips settle in under the months. The same values as the single Date Picker, so the two read as one family.',
    },
    {
      name: 'All time preset',
      value: 'today minus 10 years',
      why: 'A bounded stand-in for "everything". An unbounded start would leave the calendar no month to show.',
    },
  ],

  pitfalls: [
    'Do not remove `useTriggerToggle`. With `isNonModal`, pressing the trigger while open makes React Aria fire `onOpenChange(false)` and then `onOpenChange(true)` in the same press, so the popover would never close from its trigger.',
    'Do not wire the two inner chevrons. The months are always adjacent, so there is one paging state; four buttons would give two that do the same thing as the outer pair.',
    'Do not count days as `end.day - start.day` or with a floor. That breaks across months and across DST changes; subtract real dates, round, and add one.',
    'Do not hoist the presets to module scope. They are built from `today()` when the popover renders, so a module-level list would freeze "today" at import time and differ between server and client.',
    'Do not commit on every calendar click. The draft only becomes the value on Apply, and Cancel must restore the trigger\'s range.',
  ],

  notes: [
    '`popoverClassName` adds classes to the portalled surface (for a locale-specific font, for example), since the popover renders outside the trigger\'s tree.',
    'Strings run through `useTemplateCopy`, so preset labels, "days selected", Cancel and Apply can be translated by a `TemplateCopyProvider`.',
    'The popover is wide (sidebar plus two months, about 810px). On a phone-width viewport the popover is capped at `calc(100vw - 2rem)` and scrolls sideways inside, so Apply stays reachable; for narrow layouts, `DateRangeCalendar` with `visibleMonths={1}` fits without scrolling.',
  ],

  apiSignature:
    'interface DateRangeValue { start: CalendarDate; end: CalendarDate }\nfunction DateRangePicker(props: { value?: DateRangeValue | null; defaultValue?: DateRangeValue | null; onChange?: (value: DateRangeValue | null) => void; isDisabled?: boolean; className?: string; popoverClassName?: string; "aria-label"?: string; placeholder?: string }): JSX.Element',

  props: [
    { name: 'value', type: 'DateRangeValue | null', description: 'Controlled committed range of `CalendarDate`s.' },
    { name: 'defaultValue', type: 'DateRangeValue | null', default: 'null', description: 'Initial range when uncontrolled.' },
    { name: 'onChange', type: '(value: DateRangeValue | null) => void', description: 'Fires once on Apply.' },
    { name: 'isDisabled', type: 'boolean', description: 'Disables the trigger.' },
    { name: 'placeholder', type: 'string', default: '"Select date range"', description: 'Trigger text when no range is committed.' },
    { name: 'aria-label', type: 'string', default: '"Date range"', description: 'Labels the dialog and the range calendar.' },
    { name: 'className', type: 'string', description: 'Merged onto the trigger button.' },
    { name: 'popoverClassName', type: 'string', description: 'Extra classes for the portalled popover surface.' },
  ],

  reducedMotion:
    'Nothing branches on `prefers-reduced-motion`. The popover\'s 150ms fade, scale and 2px blur and the footer\'s 12px drop still play; day selection only fades opacity. Wrap the app in Motion\'s `<MotionConfig reducedMotion="user">` to drop the footer\'s transform.',

  cleanup:
    'The outside-press and trigger-toggle hooks add document `pointerdown` listeners only while open and remove them on close and unmount. `AnimatePresence` handles the footer\'s exit. No timers.',

  acceptance:
    'The trigger reads "Mar 2, 2026 - Mar 15, 2026" for that committed range. Clicking it opens a popover with eight presets on the left and two consecutive months; clicking a start and then an end day draws a single band (crossing into the second month if needed) and the footer shows both dates as DD/MM/YYYY chips and "N days selected" counted inclusively. Clicking "This month" selects today\'s month and highlights the preset. Pressing the trigger again closes the popover. Apply updates the trigger and fires `onChange` once; Cancel or an outside click leaves it unchanged.',

  criticalRegion: 'critical',
};

export default meta;
