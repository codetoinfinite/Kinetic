import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'date-picker',
  title: 'Date Picker',
  category: 'form',
  kit: 'boardui',
  tags: ['date', 'calendar', 'popover', 'react-aria', 'form', 'boardui'],
  blurb:
    'A trigger button that opens one month in a popover, with an editable DD/MM/YYYY chip and Cancel / Apply so nothing commits early.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/date-picker.tsx',
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
    'A single-date picker: a calendar-icon trigger shows the committed date, and clicking it opens a popover holding one month, a typed date chip and Cancel / Apply buttons. Picking a day only changes a draft; `onChange` fires on Apply. The popover scales in from 95% with a 2px blur, and the date chip drops in with a slight overshoot the first time a day is chosen.',

  mechanism: [
    'The trigger is a plain `<button>` styled with the shared `triggerButtonClassName` (white surface, `rounded-2lg`, `shadow-xs`, 150ms colour transition). Its label is the committed value through `Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" })`, or "Select date" when empty, next to a 20px `RiCalendarLine`.',
    'The surface is a standalone React Aria `Popover` with `triggerRef`, `isOpen`, `offset={4}`, `placement="bottom end"` and `isNonModal`, wrapping a `Dialog`. Non-modal avoids the scroll lock and focus trap, but it also turns off outside-click dismissal, so `useDismissOnOutsidePress` closes it on any `pointerdown` outside both the trigger and the popover.',
    'Value is split in two. `committedValue` is the controlled `value` or internal state from `defaultValue`. `pendingValue` is what the `Calendar` edits. Apply calls `commit(pendingValue)`, which sets internal state when uncontrolled, fires `onChange` and closes; Cancel resets the draft to the committed value and closes.',
    'An effect keyed on `isOpen` resets the draft to the committed value and increments `openKey` on every open, and `Calendar` is keyed on `openKey`. React Aria\'s Calendar keeps its own visible month while mounted (the Popover stays mounted through its exit animation), so without the remount a value changed from outside would reopen on the old month.',
    'Inside the Calendar sits the shared `MonthPanel` (326px card, 32px cells, 12px spacing). The footer\'s `AnimatePresence` mounts a `motion.div` with the editable `DateChipInput` once a draft exists: `initial { opacity: 0, y: -12 }` to `{ opacity: 1, y: 0 }` over 0.25s with the overshoot curve `[0.34, 1.2, 0.64, 1]`. The chip keeps its own text while typing and commits on blur or Enter; text that does not parse as `DD/MM/YYYY` reverts.',
    'Passing `triggerRef` switches to external mode: DatePicker hides its own button, anchors the popover to the given element and takes `isOpen` / `onOpenChange` from the caller.',
  ],

  constants: [
    {
      name: 'popover offset / placement',
      value: '4px, bottom end',
      why: 'Four pixels clears the trigger\'s shadow without looking detached. `end` right-aligns the 342px popover to the trigger, so a trigger at the right of a toolbar or card header opens inward.',
    },
    {
      name: 'popover enter / exit',
      value: '150ms ease-out, opacity 0, scale-95, blur-[2px], origin-top',
      why: 'From the shared `popoverClassName`. The scale grows down from the trigger edge; the blur hides the text snapping in on the first frame.',
    },
    {
      name: 'date chip entrance',
      value: 'y -12 → 0, 0.25s, ease [0.34, 1.2, 0.64, 1]',
      why: 'The control point above 1 overshoots slightly, so the chip settles rather than sliding to a dead stop. Twelve pixels reads as dropping out of the calendar above it.',
    },
    {
      name: 'z-index',
      value: 'z-110',
      why: 'Above the kit\'s modal layer (z-100), so a date picker inside a dialog opens over it.',
    },
    {
      name: 'chip width',
      value: 'w-[104px]',
      why: 'Fits "DD/MM/YYYY" at the body-medium size with 8px padding, so the field does not resize as digits are typed.',
    },
  ],

  pitfalls: [
    'Do not fire `onChange` from the Calendar\'s own `onChange`. The calendar edits a draft; only Apply commits, and Cancel must leave the committed value untouched.',
    'Do not remove the `openKey` remount. The popover content stays mounted between opens, so the Calendar keeps showing the month it last displayed even after `value` moved to another month.',
    'Do not set `isNonModal` without restoring outside dismissal. React Aria couples the two, and the popover would then only close through Cancel, Apply or Escape.',
    'Do not pass a JS `Date`. `value`, `defaultValue` and `onChange` use `CalendarDate` from `@internationalized/date` (`parseDate("2026-03-18")`).',
    'Do not render it with an initial `isOpen` on a server-rendered page. Open it from the trigger.',
  ],

  notes: [
    'Strings are run through `useTemplateCopy`, so a `TemplateCopyProvider` higher up can translate "Select date", "Cancel" and "Apply" without forking the component.',
    'The month grid, day cell, chip input and popover chrome come from the shared date-picker module, the same code that renders `DateRangePicker` and `DateCalendar`.',
  ],

  apiSignature:
    'function DatePicker(props: { value?: CalendarDate | null; defaultValue?: CalendarDate | null; onChange?: (value: CalendarDate | null) => void; isDisabled?: boolean; className?: string; "aria-label"?: string; triggerRef?: RefObject<HTMLElement | null>; isOpen?: boolean; onOpenChange?: (isOpen: boolean) => void }): JSX.Element',

  props: [
    { name: 'value', type: 'CalendarDate | null', description: 'Controlled committed date. Leave undefined for uncontrolled use.' },
    { name: 'defaultValue', type: 'CalendarDate | null', default: 'null', description: 'Initial committed date when uncontrolled.' },
    { name: 'onChange', type: '(value: CalendarDate | null) => void', description: 'Fires on Apply with the drafted date, never while browsing the month.' },
    { name: 'isDisabled', type: 'boolean', description: 'Disables the built-in trigger button.' },
    { name: 'aria-label', type: 'string', default: '"Date"', description: 'Labels the dialog and the calendar grid.' },
    { name: 'triggerRef', type: 'RefObject<HTMLElement | null>', description: 'Anchor the popover to your own element; DatePicker\'s button is then not rendered.' },
    { name: 'isOpen / onOpenChange', type: 'boolean / (isOpen: boolean) => void', description: 'Open state, used only together with `triggerRef`.' },
    { name: 'className', type: 'string', description: 'Merged onto the trigger button.' },
  ],

  reducedMotion:
    'The component does not branch on `prefers-reduced-motion`: the popover\'s 150ms fade, scale and blur and the chip\'s 12px drop still play. Both are short. Wrap the app in Motion\'s `<MotionConfig reducedMotion="user">` to drop the chip\'s transform; the day-cell selection only fades opacity.',

  cleanup:
    'The outside-press hook removes its document `pointerdown` listener when the popover closes or the component unmounts. Motion\'s `AnimatePresence` finishes or cancels the chip animation on unmount. No timers.',

  acceptance:
    'The trigger shows the current date (e.g. "Mar 18, 2026"). Clicking it opens a month card below, right-aligned, fading and scaling in. Clicking a day moves the pill and drops a DD/MM/YYYY chip into the footer, but the trigger label does not change. Typing a valid date in the chip and pressing Enter moves the selection; invalid text reverts on blur. Apply updates the trigger and fires `onChange` once; Cancel or a click outside closes it with the old date intact. Reopening shows the month of the committed date.',

  criticalRegion: 'critical',
};

export default meta;
