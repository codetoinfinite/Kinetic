import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'meeting-scheduler',
  title: 'Meeting Scheduler',
  category: 'form',
  kit: 'boardui',
  tags: ['scheduler', 'booking', 'calendar', 'time-slots', 'popover', 'react-aria', 'boardui'],
  blurb:
    'A Cal.com-style booking popover: host and meeting summary, a month calendar and a half-hour slot list, committed by "Send meeting".',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/meeting-scheduler.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1', '@internationalized/date@^3.12.4', '@remixicon/react@^4.9.0'],

  summary:
    'A compact "Schedule a meeting" button that opens a three-column booking panel: who you are meeting and what about on the left, a single-month calendar in the middle, and a timezone label, 12h / 24h switch and scrolling half-hour slots on the right. Choices are a draft until "Send meeting", which stays disabled until both a day and a time are picked, then commits and closes. The trigger is a plain button driving a controlled React Aria `Popover`, so the wide panel floats above the page and never pushes layout.',

  mechanism: [
    'The trigger is a native `<button>` with the shared date-picker trigger styling and a chevron that rotates 180 degrees over 200ms while open. It toggles `isOpen` and, on opening, copies the committed value into `pendingValue`, so a draft abandoned last time never resurfaces.',
    'The panel is a React Aria `Popover` wired with `triggerRef`, `isOpen` / `onOpenChange`, `placement="bottom end"`, `offset={8}` and `isNonModal`, so the page behind stays interactive. Non-modal popovers lose React Aria\'s outside-click dismissal, so `useDismissOnOutsidePress` adds a document `pointerdown` listener that closes it unless the press lands in the trigger or the panel.',
    'Inside a `Dialog`, a React Aria `Calendar` bound to `pendingValue.date` wraps the whole 429px-tall row, so the shared `MonthPanel` (`offset={0}` with both arrows) renders the grid and day cells. Picking a day keeps any time already chosen; picking a slot keeps the day (falling back to today).',
    'The left column (207px) shows the host avatar initial, name and email, the meeting title and description, then duration, language and conferencing rows pinned to the bottom. Under the calendar a chip shows the pending date and time ("Select a time" until one is picked) beside the "Send meeting" button.',
    'The right column (170px) holds the timezone label, a weekday + day chip, a 12h / 24h switch (24h by default) and the slots: 09:00 to 18:30 every 30 minutes, generated once and shown as "2:30 PM" in 12h mode. The list scrolls inside a mask that fades the top 16px, and the chosen slot gets the tertiary background.',
    '"Send meeting" calls `commit(pendingValue)`: uncontrolled, it stores the value internally; either way it calls `onChange({ date, time })` with `time` as 24-hour "HH:mm", and closes the popover.',
  ],

  constants: [
    {
      name: 'panel columns',
      value: '207px summary, 326px MonthPanel, 170px slots, gap-4, h-[429px]',
      why: 'From the Figma "Meeting" frame (node 3881:7618). A fixed height lets the slot column scroll while the summary and calendar stay put.',
    },
    {
      name: 'slots',
      value: '09:00 to 18:30, every 30 minutes (20 slots)',
      why: 'Replaces Figma\'s static mock (which repeated 14:00) with a generated working-day range.',
    },
    {
      name: 'popover',
      value: 'placement bottom end, offset 8, isNonModal',
      why: 'Right-aligned to the trigger so it can sit at the end of a toolbar; non-modal so the page stays scrollable and clickable while the panel is open.',
    },
    {
      name: 'slot mask',
      value: 'linear-gradient(to bottom, transparent, black 16px, black 100%)',
      why: 'Slots scrolled under the 24h toggle fade out instead of being cut off at a hard edge.',
    },
    {
      name: 'defaultOpen threshold',
      value: '(min-width: 640px), applied after mount',
      why: 'If the ~735px panel is in the first paint, mobile Safari sizes its layout viewport to it and the page stays zoomed out after it closes.',
    },
  ],

  pitfalls: [
    'Do not open the panel during the first render. `defaultOpen` is applied in an effect and only on viewports of 640px or wider; rendering a ~735px overlay in the first paint zooms mobile Safari out permanently.',
    'Do not commit on every click. Date and slot edits go to `pendingValue`; only "Send meeting" calls `onChange`, so closing the panel discards the draft.',
    'Do not leave `isNonModal` without the outside-press hook. React Aria skips light dismiss for non-modal popovers, so clicking the page would leave the panel stuck open.',
    'Do not rely on the uncontrolled default in server-rendered pages. With no `value` or `defaultValue` it seeds today\'s date, which can differ between server and client around midnight; pass a value.',
  ],

  notes: [
    'The value is `{ date: CalendarDate; time: string | null }`; `time` is always 24-hour "HH:mm" regardless of the 12h / 24h display.',
    'The timezone row is a label with a chevron, not a working selector; wire your own picker there if you need one.',
    'The trigger keeps `triggerLabel` ("Schedule a meeting") after booking; show the booked time elsewhere, as the demo does.',
    'BoardUI ships a Google Meet bitmap for conferencing; this port uses a Remix video icon.',
  ],

  apiSignature:
    'function MeetingScheduler(props: { host?: { name: string; email: string; avatarInitial: string }; meeting?: { title: string; description?: string; durationMinutes: number; language?: string; conferencing?: string }; timezone?: string; value?: MeetingSchedulerValue | null; defaultValue?: MeetingSchedulerValue | null; onChange?: (value: MeetingSchedulerValue | null) => void; defaultOpen?: boolean; className?: string; "aria-label"?: string; triggerLabel?: string }): JSX.Element',

  props: [
    { name: 'value / defaultValue', type: '{ date: CalendarDate; time: string | null } | null', description: 'Controlled or initial booking. Without either, the draft starts on today with no time.' },
    { name: 'onChange', type: '(value: MeetingSchedulerValue | null) => void', description: 'Fires once, when "Send meeting" is pressed.' },
    { name: 'host', type: 'MeetingSchedulerHost', default: 'Jordan Lee', description: 'Name, email and avatar initial in the summary column.' },
    { name: 'meeting', type: 'MeetingSchedulerDetails', default: '30 min intro meeting', description: 'Title, description, duration, language and conferencing rows.' },
    { name: 'timezone', type: 'string', default: '"Amsterdam"', description: 'Label in the slot column header.' },
    { name: 'triggerLabel', type: 'string', default: '"Schedule a meeting"', description: 'Text on the trigger button.' },
    { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Opens after mount on viewports 640px and wider.' },
    { name: 'aria-label', type: 'string', default: '"Schedule meeting"', description: 'Names the dialog and the calendar grid.' },
  ],

  reducedMotion:
    'The component does not branch on `prefers-reduced-motion`. The motion is the shared popover entrance (150ms opacity, scale and blur), the 200ms chevron turn and 150ms colour fades on slots and the hour toggle, all brief and none needed to understand the state.',

  cleanup:
    'The outside-press hook removes its document listener when the panel closes or the component unmounts, and React Aria tears down the popover\'s positioning and focus handling on close. No timers.',

  acceptance:
    'A "Schedule a meeting" button with a calendar icon and chevron. Clicking it opens a panel below, right-aligned, with the host card and meeting rows, a month calendar and a slot column from 09:00 to 18:30; "Send meeting" is disabled. Picking a day updates the chip and the weekday badge, picking a slot highlights it and fills the chip, and "Send meeting" becomes enabled. Toggling 12h shows "9:00 AM" style labels. Pressing "Send meeting" closes the panel and calls `onChange` with the date and the 24-hour time; clicking outside instead closes it without calling `onChange`.',

  criticalRegion: 'critical',
};

export default meta;
