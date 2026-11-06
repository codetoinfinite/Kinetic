# Build: Dashboard Page Header

The strip that opens every dashboard page: a small breadcrumb whose team and person crumbs carry a 16px initials circle, a 20px title, and a toolbar on the right. The toolbar has three fixed slots in order (date range, notification bell, actions), so pages line up the same way, and it wraps under the title on narrow screens. A companion PeriodStepper gives the "< Jun 29 - Jul 5 >" control that walks the window by its own length.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Dashboard page header: breadcrumb with initials crumbs, title, week stepper, unread bell and trailing action buttons.

- Category: navigation
- Runtime cost: css
- Dependencies: @internationalized/date@^3.12.4, react-aria@^3.53.1, @remixicon/react@^4.9.0

## How it works

1. Breadcrumbs are plain data ({ label, href, onPress, initials, tone, icon }); each maps to the kit BreadcrumbItem, and the last one is rendered with current (aria-current="page", no link or click handler).
2. A crumb with initials renders an aria-hidden 16px rounded-full span tinted with status-blue / status-lime / status-purple tokens or the tertiary background for neutral; otherwise its icon goes through BreadcrumbItem's icon prop.
3. The title row is flex-wrap justify-between: the heading (h1 by default, headingLevel 1-3) truncates, and the toolbar is its own flex-wrap gap-2 group so it drops onto a second line instead of squeezing the title.
4. The bell slot is the notifications prop when given, else a built-in PageHeaderBell whenever notificationCount is defined: an IconButton whose aria-label carries the unread count, plus an aria-hidden red badge that scales from 50% and fades out at zero.
5. PeriodStepper shifts the range by an explicit step when given; otherwise a whole-calendar-month range moves by its month count (the end rebuilt with endOfMonth from the new start), and any other range moves by its own length in days.
6. The stepper label comes from useDateFormatter({ day: numeric, month: short, timeZone: UTC }).formatRange, shown in an aria-live <output> so each step is announced; previous/next disable when the shifted range would cross minValue / maxValue.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `crumb initials = 16px circle, 9px semibold`
  Sits on the 12px breadcrumb line at the same size as the kit's 16px crumb icons.
- `badge position = top-1 start-[18px], h-3.5 min-w-3.5`
  Puts the count over the bell glyph's top-right shoulder inside the 36px IconButton without covering the bell.
- `badge max = 9`
  A 14px badge holds two characters; larger counts read as 9+.
- `stepper height = h-9 (medium) / h-8 (small)`
  Matches the 36px Button and IconButton beside it so the toolbar shares one baseline.
- `badge transition = 200ms ease-out on scale and opacity`
  Quick enough to confirm "marked read" without delaying the next click; removed under motion-reduce.

## API

```ts
export function DashboardPageHeader({ title, description, breadcrumbs, breadcrumbLabel, dateRange, notificationCount, onNotificationsPress, notificationsLabel, notifications, actions, headingLevel, className, ...props }: DashboardPageHeaderProps): JSX.Element
export function PageHeaderBell({ count, max, label, onPress, className }: PageHeaderBellProps): JSX.Element
export function PeriodStepper({ value, defaultValue, onChange, step, minValue, maxValue, formatOptions, size, 'aria-label', previousLabel, nextLabel, className }: PeriodStepperProps): JSX.Element
export function shiftPeriod(range: PeriodRange, direction: 1 | -1, step?: DateDuration): PeriodRange
export function usePeriodLabel(range: PeriodRange, formatOptions?: Intl.DateTimeFormatOptions): string
```

- `title: ReactNode`
  Page title, rendered as a truncating 20px heading.
- `description: ReactNode`
  Optional secondary line under the title.
- `breadcrumbs: readonly PageHeaderCrumb[]` — default `[]`
  Ancestors first; the last crumb is the current page. Each crumb: label, href, onPress, initials, tone, icon.
- `breadcrumbLabel: string` — default `'Breadcrumb'`
  Accessible name of the breadcrumb nav.
- `dateRange: ReactNode`
  First toolbar slot, typically a PeriodStepper.
- `notificationCount: number`
  Unread count for the built-in bell; leaving it undefined (and notifications unset) hides the bell.
- `onNotificationsPress: () => void`
  Called when the built-in bell is clicked.
- `notificationsLabel: string` — default `'Notifications'`
  Base accessible label of the bell; ", N unread" is appended when the count is above zero.
- `notifications: ReactNode`
  Replaces the built-in bell in the second toolbar slot.
- `actions: ReactNode`
  Trailing buttons; put the primary action last.
- `headingLevel: 1 | 2 | 3` — default `1`
  Heading element used for the title.
- `PeriodStepper.value / defaultValue: PeriodRange`
  Controlled or initial { start, end } CalendarDate range.
- `PeriodStepper.onChange: (range: PeriodRange) => void`
  Called with the shifted range after each previous / next press.
- `PeriodStepper.step: DateDuration`
  Fixed shift per press; defaults to the range length, or its month count for whole months.
- `PeriodStepper.minValue / maxValue: CalendarDate`
  Bounds; the matching button disables once a step would cross them.
- `PeriodStepper.size: 'medium' | 'small'` — default `'medium'`
  36px or 32px tall.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function DashboardPageHeader({
  title,
  description,
  breadcrumbs = [],
  breadcrumbLabel = 'Breadcrumb',
  dateRange,
  notificationCount,
  onNotificationsPress,
  notificationsLabel,
  notifications,
  actions,
  headingLevel = 1,
  className,
  ...props
}: DashboardPageHeaderProps) {
  const Heading = (['h1', 'h2', 'h3'] as const)[headingLevel - 1] ?? 'h1';
  const bell =
    notifications ??
    (notificationCount !== undefined ? (
      <PageHeaderBell count={notificationCount} label={notificationsLabel} onPress={onNotificationsPress} />
    ) : null);
  const hasToolbar = Boolean(dateRange || bell || actions);
  const lastIndex = breadcrumbs.length - 1;

  return (
    <header {...props} className={cx('flex w-full min-w-0 flex-col gap-4', className)}>
      {breadcrumbs.length > 0 ? (
        <Breadcrumb aria-label={breadcrumbLabel} className="-mx-1">
          {breadcrumbs.map((crumb, index) => (
            <BreadcrumbItem
              key={`${index}-${crumb.label}`}
              icon={crumb.initials ? undefined : crumb.icon}
              href={index === lastIndex ? undefined : crumb.href}
              onClick={index === lastIndex ? undefined : crumb.onPress}
              current={index === lastIndex}
            >
              {crumb.initials ? <CrumbInitials initials={crumb.initials} tone={crumb.tone} /> : null}
              {crumb.label}
            </BreadcrumbItem>
          ))}
        </Breadcrumb>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Heading className="truncate text-title-2-medium text-text-primary">{title}</Heading>
          {description ? <p className="text-body-regular text-text-secondary">{description}</p> : null}
        </div>
        {hasToolbar ? (
          <div className="flex flex-wrap items-center gap-2">
            {dateRange}
            {bell}
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to release: no timers, listeners or observers; all state is React state.

**Reduced motion.** The badge appears and disappears without its scale/opacity transition, and the stepper and crumb hover colours change instantly (motion-reduce:transition-none). Nothing else moves.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not shift a whole-month range by adding months to its end: Jan 31 + 1 month clamps to Feb 28 and stays clamped (Mar 28). Rebuild the end from the new start.
- Do not format CalendarDate ranges in the local time zone: toDate(local) plus a local formatter can render the previous day for users west of UTC. Format with timeZone UTC from toDate("UTC").
- Do not put the unread count only in the badge: it is aria-hidden, so the IconButton's aria-label must carry it.
- Do not give the last crumb a link; it is the current page and gets aria-current="page".

## Notes

- Pass notifications={<YourBellPopover />} to replace the built-in bell, e.g. with a bell that opens a notification list.
- PeriodStepper is controlled (value + onChange) or uncontrolled (defaultValue); it throws when given neither.
- Without dateRange, the bell and actions the toolbar is not rendered, leaving a plain breadcrumb and title.

## Definition of done

Pressing "Next week" changes the stepper label from Jun 29 - Jul 5 to Jul 6 - 12, and pressing the bell hides its badge and drops the count from its accessible name.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
