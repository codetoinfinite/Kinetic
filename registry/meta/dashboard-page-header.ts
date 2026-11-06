/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Dashboard Page Header" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'dashboard-page-header',
  title: 'Dashboard Page Header',
  category: 'navigation',
  kit: 'boardui',
  tags: ['boardui', 'header', 'breadcrumb', 'dashboard', 'date-range', 'toolbar'],
  blurb: 'Dashboard page header: breadcrumb with initials crumbs, title, week stepper, unread bell and trailing action buttons.',
  cost: 'css',
  motif: 'stack',
  files: [
    { path: 'registry/ui/dashboard-page-header.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/ui/dashboard-page-header-range.tsx', type: 'registry:ui', role: 'period stepper' },
  ],
  dependencies: ['@internationalized/date@^3.12.4', 'react-aria@^3.53.1', '@remixicon/react@^4.9.0'],
  summary:
    'The strip that opens every dashboard page: a small breadcrumb whose team and person crumbs carry a 16px initials circle, a 20px title, and a toolbar on the right. The toolbar has three fixed slots in order (date range, notification bell, actions), so pages line up the same way, and it wraps under the title on narrow screens. A companion PeriodStepper gives the "< Jun 29 - Jul 5 >" control that walks the window by its own length.',
  mechanism: [
    'Breadcrumbs are plain data ({ label, href, onPress, initials, tone, icon }); each maps to the kit BreadcrumbItem, and the last one is rendered with current (aria-current="page", no link or click handler).',
    'A crumb with initials renders an aria-hidden 16px rounded-full span tinted with status-blue / status-lime / status-purple tokens or the tertiary background for neutral; otherwise its icon goes through BreadcrumbItem\'s icon prop.',
    'The title row is flex-wrap justify-between: the heading (h1 by default, headingLevel 1-3) truncates, and the toolbar is its own flex-wrap gap-2 group so it drops onto a second line instead of squeezing the title.',
    'The bell slot is the notifications prop when given, else a built-in PageHeaderBell whenever notificationCount is defined: an IconButton whose aria-label carries the unread count, plus an aria-hidden red badge that scales from 50% and fades out at zero.',
    'PeriodStepper shifts the range by an explicit step when given; otherwise a whole-calendar-month range moves by its month count (the end rebuilt with endOfMonth from the new start), and any other range moves by its own length in days.',
    'The stepper label comes from useDateFormatter({ day: numeric, month: short, timeZone: UTC }).formatRange, shown in an aria-live <output> so each step is announced; previous/next disable when the shifted range would cross minValue / maxValue.',
  ],
  constants: [
    { name: 'crumb initials', value: '16px circle, 9px semibold', why: 'Sits on the 12px breadcrumb line at the same size as the kit\'s 16px crumb icons.' },
    { name: 'badge position', value: 'top-1 start-[18px], h-3.5 min-w-3.5', why: 'Puts the count over the bell glyph\'s top-right shoulder inside the 36px IconButton without covering the bell.' },
    { name: 'badge max', value: '9', why: 'A 14px badge holds two characters; larger counts read as 9+.' },
    { name: 'stepper height', value: 'h-9 (medium) / h-8 (small)', why: 'Matches the 36px Button and IconButton beside it so the toolbar shares one baseline.' },
    { name: 'badge transition', value: '200ms ease-out on scale and opacity', why: 'Quick enough to confirm "marked read" without delaying the next click; removed under motion-reduce.' },
  ],
  pitfalls: [
    'Do not shift a whole-month range by adding months to its end: Jan 31 + 1 month clamps to Feb 28 and stays clamped (Mar 28). Rebuild the end from the new start.',
    'Do not format CalendarDate ranges in the local time zone: toDate(local) plus a local formatter can render the previous day for users west of UTC. Format with timeZone UTC from toDate("UTC").',
    'Do not put the unread count only in the badge: it is aria-hidden, so the IconButton\'s aria-label must carry it.',
    'Do not give the last crumb a link; it is the current page and gets aria-current="page".',
  ],
  notes: [
    'Pass notifications={<YourBellPopover />} to replace the built-in bell, e.g. with a bell that opens a notification list.',
    'PeriodStepper is controlled (value + onChange) or uncontrolled (defaultValue); it throws when given neither.',
    'Without dateRange, the bell and actions the toolbar is not rendered, leaving a plain breadcrumb and title.',
  ],
  apiSignature:
    "export function DashboardPageHeader({ title, description, breadcrumbs, breadcrumbLabel, dateRange, notificationCount, onNotificationsPress, notificationsLabel, notifications, actions, headingLevel, className, ...props }: DashboardPageHeaderProps): JSX.Element\nexport function PageHeaderBell({ count, max, label, onPress, className }: PageHeaderBellProps): JSX.Element\nexport function PeriodStepper({ value, defaultValue, onChange, step, minValue, maxValue, formatOptions, size, 'aria-label', previousLabel, nextLabel, className }: PeriodStepperProps): JSX.Element\nexport function shiftPeriod(range: PeriodRange, direction: 1 | -1, step?: DateDuration): PeriodRange\nexport function usePeriodLabel(range: PeriodRange, formatOptions?: Intl.DateTimeFormatOptions): string",
  props: [
    { name: 'title', type: 'ReactNode', description: 'Page title, rendered as a truncating 20px heading.' },
    { name: 'description', type: 'ReactNode', description: 'Optional secondary line under the title.' },
    { name: 'breadcrumbs', type: 'readonly PageHeaderCrumb[]', default: '[]', description: 'Ancestors first; the last crumb is the current page. Each crumb: label, href, onPress, initials, tone, icon.' },
    { name: 'breadcrumbLabel', type: 'string', default: "'Breadcrumb'", description: 'Accessible name of the breadcrumb nav.' },
    { name: 'dateRange', type: 'ReactNode', description: 'First toolbar slot, typically a PeriodStepper.' },
    { name: 'notificationCount', type: 'number', description: 'Unread count for the built-in bell; leaving it undefined (and notifications unset) hides the bell.' },
    { name: 'onNotificationsPress', type: '() => void', description: 'Called when the built-in bell is clicked.' },
    { name: 'notificationsLabel', type: 'string', default: "'Notifications'", description: 'Base accessible label of the bell; ", N unread" is appended when the count is above zero.' },
    { name: 'notifications', type: 'ReactNode', description: 'Replaces the built-in bell in the second toolbar slot.' },
    { name: 'actions', type: 'ReactNode', description: 'Trailing buttons; put the primary action last.' },
    { name: 'headingLevel', type: '1 | 2 | 3', default: '1', description: 'Heading element used for the title.' },
    { name: 'PeriodStepper.value / defaultValue', type: 'PeriodRange', description: 'Controlled or initial { start, end } CalendarDate range.' },
    { name: 'PeriodStepper.onChange', type: '(range: PeriodRange) => void', description: 'Called with the shifted range after each previous / next press.' },
    { name: 'PeriodStepper.step', type: 'DateDuration', description: 'Fixed shift per press; defaults to the range length, or its month count for whole months.' },
    { name: 'PeriodStepper.minValue / maxValue', type: 'CalendarDate', description: 'Bounds; the matching button disables once a step would cross them.' },
    { name: 'PeriodStepper.size', type: "'medium' | 'small'", default: "'medium'", description: '36px or 32px tall.' },
  ],
  reducedMotion:
    'The badge appears and disappears without its scale/opacity transition, and the stepper and crumb hover colours change instantly (motion-reduce:transition-none). Nothing else moves.',
  cleanup: 'Nothing to release: no timers, listeners or observers; all state is React state.',
  acceptance:
    'Pressing "Next week" changes the stepper label from Jun 29 - Jul 5 to Jul 6 - 12, and pressing the bell hides its badge and drops the count from its accessible name.',
  criticalRegion: 'critical',
};

export default meta;
