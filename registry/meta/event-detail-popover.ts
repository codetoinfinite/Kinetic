import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'event-detail-popover',
  title: 'Event Detail Popover',
  category: 'overlay',
  kit: 'boardui',
  tags: ['calendar', 'event', 'popover', 'details', 'attendees', 'boardui'],
  blurb:
    'Anchored calendar event card: colour key, date and time, location, meeting code with Join, guest RSVPs, edit and delete.',
  cost: 'css',
  motif: 'stack',

  files: [{ path: 'registry/ui/event-detail-popover.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['react-aria-components@^1.22.1', '@internationalized/date@^3.12.4', '@remixicon/react@^4.9.0'],

  summary:
    'Wraps any trigger, usually a calendar event chip, in the kit Popover and shows the event behind it: a colour key and title, the long date, the time range, location, a meeting code with a Join button, and the guest list with RSVP labels. Edit and Delete sit as neutral icon buttons in the header. Every action closes the popover before handing the event to the caller, so a delete that removes the chip is safe. `EventDetails` is exported on its own for side panels.',

  mechanism: [
    '`EventDetailPopover` keeps its own open state (or takes `isOpen` / `onOpenChange`) and renders `PopoverTrigger` with the child as trigger and a 340px `Popover` placed "bottom start". React Aria positions and flips it, Escape closes it and focus returns to the chip.',
    'The card header is a 12px rounded square in the event colour (the `dot` class from `calendarEventColorStyles`), a React Aria `Heading slot="title"` that names the dialog, and the long date from `formatEventDate`, which formats a fixed UTC noon instant so server and client print the same day.',
    'A tinted `dl` lists time ("11:30 – 11:45", or "All day"), location and the meeting code; each label is an icon plus an `sr-only` term. The Join button sits at the end of the meeting row.',
    'Guests render as initials avatars with the name and an RSVP label (Organizer, Going, Maybe, Declined, Awaiting); declined names are struck through. Past `maxAttendees` the rest collapse into "+N more", and the header counts guests and how many are going.',
    'Join, Edit and Delete are wrapped by `act()`: it sets the popover closed first and then calls the handler, so removing the event in `onDelete` unmounts a closed trigger instead of yanking an open overlay.',
  ],

  constants: [
    { name: 'popover width', value: '340px', why: 'Fits the longest row (meeting code plus Join) on one line; the kit Popover caps it at 100vw − 32px on phones.' },
    { name: 'placement', value: '"bottom start"', why: 'Opens under the chip aligned to its start edge, like the template; React Aria flips it when the chip is near the bottom.' },
    { name: 'maxAttendees', value: '4', why: 'Keeps the card under ~420px tall so it fits beside a month cell without scrolling.' },
    { name: 'colour key', value: '12px, radius 4px', why: 'Matches the chip tint so the card reads as the same event at a glance.' },
  ],

  pitfalls: [
    'Calling the delete handler before closing the popover. The trigger unmounts while React Aria still tracks the open overlay; close first, then remove.',
    'Passing a trigger that does not forward its ref. PopoverTrigger wraps the child in React Aria `Pressable`, which needs the DOM node to anchor and to restore focus.',
    'Formatting the date with `toLocaleDateString` on a local Date. The server and browser zones can disagree about the day; format a UTC instant built from the calendar fields.',
  ],

  notes: [
    'Control `isOpen` from the parent when the trigger should show a selected state while open, as the demo does with the chip `selected` prop.',
    'Pass `closeOnAction={false}` to keep the card open after Join or Edit.',
  ],

  apiSignature:
    'function formatEventDate(date: { year: number; month: number; day: number }, locale?: string, options?: Intl.DateTimeFormatOptions): string\nfunction EventDetails(props: { event: CalendarEvent; onJoin?: (e: CalendarEvent) => void; onEdit?: (e: CalendarEvent) => void; onDelete?: (e: CalendarEvent) => void; joinLabel?: string; locale?: string; hourCycle?: 12 | 24; maxAttendees?: number; className?: string }): JSX.Element\nfunction EventDetailPopover(props: EventDetailsProps & { children: ReactNode; isOpen?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; placement?: Placement; closeOnAction?: boolean }): JSX.Element',

  props: [
    { name: 'event', type: 'CalendarEvent', description: 'The event to show (title, colour, start/end, location, meetingCode, attendees, description).' },
    { name: 'children', type: 'ReactNode', description: 'The trigger; must forward its ref and spread props.' },
    { name: 'isOpen / defaultOpen / onOpenChange', type: 'boolean / boolean / (open) => void', default: 'uncontrolled, closed', description: 'Open state.' },
    { name: 'onJoin', type: '(event) => void', description: 'Shows the Join button on the meeting row.' },
    { name: 'onEdit', type: '(event) => void', description: 'Shows the edit icon button.' },
    { name: 'onDelete', type: '(event) => void', description: 'Shows the delete icon button; always closes first.' },
    { name: 'placement', type: 'Placement', default: '"bottom start"', description: 'Preferred side; flips when needed.' },
    { name: 'closeOnAction', type: 'boolean', default: 'true', description: 'Close after Join or Edit.' },
    { name: 'maxAttendees', type: 'number', default: '4', description: 'Guests listed before "+N more".' },
    { name: 'hourCycle', type: '12 | 24', default: '24', description: 'Time format.' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Locale for dates and times.' },
  ],

  reducedMotion:
    'The kit Popover fades in 150ms and adds a 0.95 scale and 2px blur only under `motion-safe`, so reduced motion keeps just the fade.',

  cleanup:
    'No effects of its own. The kit PopoverTrigger owns the outside-press listener and removes it on close and unmount; date formatters are cached in a module-level map.',

  acceptance:
    'Clicking the "Stand-up" chip opens a dialog named "Stand-up" under it with "Thursday, August 20", "11:30 – 11:45", "Studio 2, 4th floor", the code "brd-xqtm-wav" with a Join button, and "6 guests · 3 going" with four guests and "+2 more". Escape closes it and focus returns to the chip. Join and Edit close it and report below the card. Delete closes it, removes the chip, lowers the event count and shows Undo, which puts the event back in time order.',

  criticalRegion: 'critical',
};

export default meta;
