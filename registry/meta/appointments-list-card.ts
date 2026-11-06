/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Appointments List Card" (boardui.com/templates/medical-profile).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'appointments-list-card',
  title: 'Appointments List Card',
  category: 'display',
  kit: 'boardui',
  tags: ['medical', 'appointments', 'list', 'schedule', 'health', 'boardui'],
  blurb:
    'Upcoming visits as inner tiles: date chip, time window, mode, doctor initials and status, with reschedule slots, cancel and undo.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/appointments-list-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@internationalized/date@^3.12.4', '@remixicon/react@^4.9.0'],

  summary:
    'A patient\'s upcoming appointments in the medical profile\'s grey card: a label, a big count of visits that are not cancelled, then one white tile per visit with a month/day/weekday chip, the visit type, its time window and mode, the doctor\'s initials and a status chip. Reschedule opens a menu of open slots and moves the visit, Cancel strikes it through and swaps the actions for an Undo that restores the status it had.',

  mechanism: [
    'The list is controlled (`appointments`) or uncontrolled (`defaultAppointments`); every change goes through `commit`, which updates internal state only when uncontrolled and always calls `onAppointmentsChange` with the whole list. Tiles render sorted by the `date`T`time` string, so a moved visit slides to its new place.',
    'Dates are parsed with `parseDate` / `parseDateTime` from @internationalized/date and printed with `DateFormatter` in the `locale` (en-US by default) on `toDate("UTC")` with `timeZone: "UTC"`, so the chip and the "9:30 AM – 10:00 AM" window never shift with the viewer\'s timezone. The end time adds `durationMinutes` (default 30) with `.add({ minutes })`.',
    'Reschedule is a kit `Dropdown` whose open state is held per card (`openMenu` = the visit id), because `DropdownItem` does not close the menu itself. Its items come from `getSlots`, which defaults to `defaultSlots`: the next three weekdays after the visit (`getDayOfWeek` skips Saturday and Sunday) at the same time, 14:30 and 10:00. Picking one patches `date`, `time` and `status: "rescheduled"`, closes the menu and calls `onReschedule`.',
    'Cancel stores the current status in `previousStatus` keyed by id, then sets `status: "cancelled"`; the tile dims to 60% with a line-through and shows Undo, which restores the stored status (or "confirmed") and calls `onRestore`.',
    'The count and the date chip are keyed by their value (`active` count, `date`T`time`), so the kit `animate-number-fade` keyframe replays when a visit is cancelled, restored or moved. A visually hidden `aria-live="polite"` line announces each change.',
  ],

  constants: [
    { name: 'default duration', value: '30 minutes', why: 'Most outpatient visits; the end of the time window is start + durationMinutes.' },
    { name: 'default slots', value: 'next 3 weekdays at same time, 14:30, 10:00', why: 'Gives a morning and an afternoon option without a scheduling backend.' },
    { name: 'cancelled opacity', value: '60%', why: 'Keeps the cancelled visit readable for the Undo while clearly out of the schedule.' },
    { name: 'date chip width', value: '48px', why: 'Fits a three-letter month, a two-digit day and a weekday at caption size.' },
  ],

  pitfalls: [
    'Do not format a `CalendarDate` through the viewer\'s local timezone: convert with `toDate("UTC")` and format with `timeZone: "UTC"`, or the chip can show the previous day west of UTC.',
    'Do not leave the Reschedule menu uncontrolled: kit `DropdownItem` only runs `onSelect`, so the menu would stay open over the moved tile.',
    'Do not key the tile by its date: the `li` keeps the id as key so focus and the menu survive a re-sort, and only the date chip is keyed by start time to replay the fade.',
  ],

  notes: [
    'Status colours: confirmed lime, pending yellow, rescheduled blue, cancelled rose (kit `Chip` caption variant).',
    'Mode icons are Remix `RiHospitalLine` (in person), `RiVideoChatLine` (video call) and `RiPhoneLine` (phone).',
    'The tile list is a flex-1 `overflow-y-auto` column, so a `max-h-*` class on the card keeps it to a fixed height and scrolls the visits (the demo uses max-h-[500px]).',
    'Doctor initials come from `doctorInitials` or the first letters of the first two words after a "Dr." prefix.',
  ],

  apiSignature:
    'export function AppointmentsListCard({ appointments, defaultAppointments = [], onAppointmentsChange, onReschedule, onCancel, onRestore, getSlots = defaultSlots, title = "Upcoming appointments", countLabel = "scheduled", locale = "en-US", className }: AppointmentsListCardProps): JSX.Element',

  props: [
    { name: 'appointments', type: 'Appointment[]', description: 'Controlled list of visits.' },
    { name: 'defaultAppointments', type: 'Appointment[]', default: '[]', description: 'Initial list when uncontrolled.' },
    { name: 'onAppointmentsChange', type: '(appointments: Appointment[]) => void', description: 'Called with the whole list after a reschedule, cancel or undo.' },
    { name: 'onReschedule', type: '(appointment: Appointment, slot: AppointmentSlot) => void', description: 'Called when a slot is picked, with the visit before the move.' },
    { name: 'onCancel', type: '(appointment: Appointment) => void', description: 'Called when a visit is cancelled.' },
    { name: 'onRestore', type: '(appointment: Appointment) => void', description: 'Called when Undo restores a cancelled visit.' },
    { name: 'getSlots', type: '(appointment: Appointment) => AppointmentSlot[]', default: 'defaultSlots', description: 'Open slots offered in the Reschedule menu.' },
    { name: 'title', type: 'string', default: '"Upcoming appointments"', description: 'Card label and accessible name.' },
    { name: 'countLabel', type: 'string', default: '"scheduled"', description: 'Words after the count of visits that are not cancelled.' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Locale for month, weekday and time formatting.' },
    { name: 'className', type: 'string', description: 'Classes on the card.' },
  ],

  reducedMotion:
    'The count and date chip fades use motion-reduce:animate-none, so values swap instantly.',
  cleanup:
    'No timers, listeners or observers of its own; the kit Dropdown removes its outside-press listener when it closes.',
  acceptance:
    'Picking a slot in a Reschedule menu closes it, moves the visit to that date and time with a blue Rescheduled chip; Cancel shows a rose Cancelled chip, lowers the count by one and offers Undo, which restores the previous status.',
  criticalRegion: 'critical',
};

export default meta;
