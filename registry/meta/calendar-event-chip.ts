import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'calendar-event-chip',
  title: 'Calendar Event Chip',
  category: 'display',
  kit: 'boardui',
  tags: ['calendar', 'event', 'chip', 'pill', 'boardui'],
  blurb:
    'Tinted calendar event pill in five colour tokens: one-line compact chip for month cells, block variant for time grids, selected ring.',
  cost: 'css',
  motif: 'stack',

  files: [{ path: 'registry/ui/calendar-event-chip.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@internationalized/date@^3.12.4'],

  summary:
    'The event pill of the calendar template as a native button. Each colour is a background, title and time token triple, so light and dark come from the theme. The compact variant is a 22px line whose title truncates while the start time stays; the full variant is a block with a coloured start edge, a two-line title and the time range, made to fill an absolutely positioned slot in a week grid. The file also exports the shared `CalendarEvent` model and `formatEventTime`, which the other calendar pieces import.',

  mechanism: [
    '`calendarEventColorStyles` maps each colour to complete class names (`bg-calendar-event-<c>-background`, `text-calendar-event-<c>-title`, `text-calendar-event-<c>-time`, plus border, ring and dot classes built from the title token), so Tailwind sees every class statically and nothing is concatenated at runtime.',
    'Compact is a single flex row: the title span takes `min-w-0 flex-1 truncate` and the time span takes `shrink-0`, so a narrow month cell eats the title first and never the time. All-day chips omit the time.',
    'Full is a column with `h-full w-full overflow-hidden`, a 3px logical start border in the title colour, `line-clamp-2` on the title and a truncated "start – end" line. The parent sets the height, so a 15-minute slot shows only the title and a 2-hour slot shows both lines.',
    '`formatEventTime` formats a fixed UTC instant built from the wall-clock hour and minute with a cached `DateFormatter` (`hourCycle: "h23"` and 2-digit hours for 24h, `h12` for 12h). Server and client therefore print the same string whatever their time zones.',
    '`selected` adds `ring-2` in the event colour and `data-selected`; keyboard focus uses the kit focus ring. Remaining button props are spread last, so the chip works as a `PopoverTrigger` child and accepts `aria-pressed`, handlers and refs.',
  ],

  constants: [
    { name: 'compact height', value: '22px', why: 'Three chips plus a "+N more" line fit under the day number of a ~120px month cell.' },
    { name: 'start border', value: '3px', why: 'Reads as the colour key of the block at a glance without eating the narrow width of a week column.' },
    { name: 'hover', value: 'brightness 0.97 light, 1.25 dark', why: 'The tinted backgrounds are light in light mode and deep in dark mode, so the hover nudge must go in opposite directions to stay visible.' },
    { name: 'time format', value: 'HH:mm (h23) by default', why: 'Matches the template and keeps every time the same width with `tabular-nums`.' },
  ],

  pitfalls: [
    'Building class names like `bg-calendar-event-${color}-background` at runtime. Tailwind only generates classes it can find in source; keep the full-name map.',
    'Formatting times with `toLocaleTimeString` on a local `Date`. The server and the browser can be in different zones and print different hours, which breaks hydration.',
    'Forgetting `min-w-0` on the compact title. Without it the flex item refuses to shrink and the time is pushed out of the cell instead of the title truncating.',
  ],

  notes: [
    'Pass `aria-pressed` when the chip toggles a selection, or wrap it in the event detail popover trigger, which supplies `aria-expanded`.',
    'The shared `CalendarEvent` type stores `CalendarDateTime` start and end; pass `{ hour, minute }` objects (or the `CalendarDateTime` itself) as `start`/`end`.',
  ],

  apiSignature:
    'type CalendarEventColor = "blue" | "emerald" | "lime" | "pink" | "purple"\nfunction formatEventTime(time: { hour: number; minute: number }, options?: { locale?: string; hourCycle?: 12 | 24 }): string\nfunction CalendarEventChip(props: ButtonHTMLAttributes<HTMLButtonElement> & { title: string; color?: CalendarEventColor; start?: { hour: number; minute: number }; end?: { hour: number; minute: number }; allDay?: boolean; variant?: "compact" | "full"; selected?: boolean; locale?: string; hourCycle?: 12 | 24; ref?: Ref<HTMLButtonElement> }): JSX.Element',

  props: [
    { name: 'title', type: 'string', description: 'Event title; truncates (compact) or clamps to two lines (full).' },
    { name: 'color', type: 'CalendarEventColor', default: '"blue"', description: 'Token triple used for background, title and time.' },
    { name: 'start / end', type: '{ hour: number; minute: number }', description: 'Wall-clock times. Compact shows start; full shows the range.' },
    { name: 'allDay', type: 'boolean', default: 'false', description: 'Hide the time.' },
    { name: 'variant', type: '"compact" | "full"', default: '"compact"', description: 'One-line month chip or time-grid block.' },
    { name: 'selected', type: 'boolean', default: 'false', description: 'Colour ring and `data-selected`.' },
    { name: 'hourCycle', type: '12 | 24', default: '24', description: '"09:30" or "9:30 AM".' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Locale for the time formatter.' },
  ],

  reducedMotion:
    'Only a 150ms colour/filter transition on hover; there is no movement. It is short and non-spatial, so it stays under reduced motion.',

  cleanup: 'Nothing to clean up: no effects, timers or listeners. Formatters are cached in a module-level map.',

  acceptance:
    'Five compact chips render in blue, emerald, lime, pink and purple, each with its title and a 24h start time such as "15:00". In a 104px cell "Coffee with Lena" truncates with an ellipsis while "09:30" stays whole. Full blocks show the title and "13:00 – 14:00"; a 36px block shows only the title. Clicking a chip adds the colour ring and sets `data-selected`; clicking it again removes both. Both themes keep the title readable on the tinted background.',

  criticalRegion: 'critical',
};

export default meta;
