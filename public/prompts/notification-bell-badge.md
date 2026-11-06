# Build: Notification Bell Badge

The dashboard header bell: a 36px bordered button with a small red count badge over the glyph. Pressing it opens the kit Popover with the notification list; each row toggles its own read state and "Mark all as read" clears them, and the badge, the trigger's accessible name and the "N unread" line all come from the same list.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Bell button with a red unread badge that opens a notification popover; mark one or all read and the badge follows.

- Category: action
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. State is one notifications array (controlled via notifications + onNotificationsChange, or uncontrolled via defaultNotifications); unread is derived as items.filter(!read).length and never stored separately.
2. BellButton is a plain <button> that forwards its ref and spreads props, styled with the kit buttonStyles base and secondary variant at 36px (or 32px), so it can be the first child of PopoverTrigger.
3. Its aria-label reads "Notifications, N unread"; the visual badge is aria-hidden, absolutely positioned at top-1 start-[18px] and scales from 50% plus fades out when the count hits 0.
4. While fading out the badge keeps its last non-zero number (a setState-during-render sync that only updates on non-zero counts), so it never flashes an empty red dot.
5. Each row's toggle button flips between "Mark as read" and "Mark as unread" and calls setRead(id, !read), mapping a new array; "Mark all as read" maps every unread item to read.
6. Neither control unmounts or becomes disabled after use (the mark-all button turns aria-disabled), so keyboard focus stays inside the popover; the unread line is aria-live so screen readers hear the new count.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `badge position = top-1 start-[18px], h-3.5 min-w-3.5`
  Sits on the bell glyph's top-right shoulder inside the 36px button, matching the dashboard shot.
- `badge ring = ring-2 ring-background-primary-default`
  A 2px ring in the button's own fill cuts the badge out of the glyph outline in both themes.
- `max = 9`
  A 14px badge holds two characters; larger counts read 9+.
- `popover width = 360px (max 100vw - 32px)`
  Fits a two-line title, a description and the toggle button without wrapping the time row.
- `list height = max-h-[min(340px,60vh)]`
  About five rows before the list scrolls, and never taller than a phone viewport allows.

## API

```ts
export function NotificationBellBadge({ notifications, defaultNotifications, onNotificationsChange, isOpen, defaultOpen, onOpenChange, max, size, label, emptyState, footer, placement, className, popoverClassName }: NotificationBellBadgeProps): JSX.Element
export function BellButton({ count, max, size, label, className, ref, ...props }: BellButtonProps): JSX.Element
```

- `notifications: readonly BellNotification[]`
  Controlled list: { id, title, description?, time, read?, icon?, tone? }.
- `defaultNotifications: readonly BellNotification[]` — default `[]`
  Initial list when uncontrolled.
- `onNotificationsChange: (next: BellNotification[]) => void`
  Receives the whole updated list after a mark-one or mark-all change.
- `isOpen / defaultOpen / onOpenChange: boolean / boolean / (isOpen: boolean) => void`
  Popover open state, controlled or not.
- `max: number` — default `9`
  Counts above this show as max+.
- `size: 'medium' | 'small'` — default `'medium'`
  36px or 32px bell.
- `label: string` — default `'Notifications'`
  Trigger accessible name base and popover title.
- `emptyState: ReactNode` — default `'You are all caught up.'`
  Shown when the list is empty.
- `footer: ReactNode`
  Content under the list, e.g. a "View all" link.
- `placement: 'bottom' | 'bottom start' | 'bottom end'` — default `'bottom end'`
  Popover placement relative to the bell.
- `BellButton.count: number`
  Unread count shown in the standalone bell; the badge hides at 0.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function NotificationBellBadge({
  notifications,
  defaultNotifications = [],
  onNotificationsChange,
  isOpen,
  defaultOpen,
  onOpenChange,
  max = 9,
  size = 'medium',
  label = 'Notifications',
  emptyState = 'You are all caught up.',
  footer,
  placement = 'bottom end',
  className,
  popoverClassName,
}: NotificationBellBadgeProps) {
  const [uncontrolled, setUncontrolled] = useState<readonly BellNotification[]>(defaultNotifications);
  const items = notifications ?? uncontrolled;
  const unread = items.filter((item) => !item.read).length;

  const commit = (next: BellNotification[]) => {
    setUncontrolled(next);
    onNotificationsChange?.(next);
  };
  const setRead = (id: string, read: boolean) =>
    commit(items.map((item) => (item.id === id ? { ...item, read } : item)));
  const markAllRead = () => {
    if (unread === 0) return;
    commit(items.map((item) => (item.read ? item : { ...item, read: true })));
  };

  return (
    <PopoverTrigger isOpen={isOpen} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <BellButton count={unread} max={max} size={size} label={label} className={className} />
      <Popover placement={placement} className={cx('w-[360px]', popoverClassName)} dialogClassName="gap-1.5 p-1">
        <div className="flex items-start justify-between gap-3 px-2 pt-1.5 pb-1">
          <PopoverHeader
            title={label}
            description={<span aria-live="polite">{unread > 0 ? `${unread} unread` : 'No unread notifications'}</span>}
          />
          <Button
            variant="ghost"
            size="xs"
            leadingIcon={RiCheckDoubleLine}
            aria-disabled={unread === 0 || undefined}
            onClick={markAllRead}
            className="mt-px"
          >
            Mark all as read
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-body-2-regular text-text-tertiary">{emptyState}</p>
        ) : (
          <ul className="flex max-h-[min(340px,60vh)] flex-col gap-0.5 overflow-y-auto" aria-label={label}>
            {items.map((item) => {
              const Icon = item.icon ?? RiNotification3Line;
              return (
                <li
                  key={item.id}
                  className={cx(
                    'flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors duration-150 ease-out motion-reduce:transition-none',
                    item.read ? 'bg-transparent' : 'bg-background-secondary-default',
                  )}
                >
                  <span
                    aria-hidden
                    className={cx('flex size-8 shrink-0 items-center justify-center rounded-full', styles.tone[item.tone ?? DEFAULT_TONE])}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className={cx('text-body-2-medium', item.read ? 'text-text-secondary' : 'text-text-primary')}>
                      {item.title}
                      {item.read ? null : <span className="sr-only"> (unread)</span>}
                    </p>
                    {item.description ? <p className="text-caption-1-regular text-text-tertiary">{item.description}</p> : null}
                    <p className="flex items-center gap-1 text-caption-1-regular text-text-tertiary">
                      {item.read ? null : <StatusDot color="indigo" className="-ms-[3px]" />}
                      {item.time}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.toggle}
                    aria-label={item.read ? `Mark "${item.title}" as unread` : `Mark "${item.title}" as read`}
                    title={item.read ? 'Mark as unread' : 'Mark as read'}
                    onClick={() => setRead(item.id, !item.read)}
                  >
                    {item.read ? <RiMailLine aria-hidden className="size-4" /> : <RiCheckLine aria-hidden className="size-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {footer ? <div className="border-t border-separator-border px-2 pt-2 pb-1">{footer}</div> : null}
      </Popover>
    </PopoverTrigger>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing of its own to release: no timers or listeners. The kit PopoverTrigger owns and removes its outside-press listener.

**Reduced motion.** The badge and row highlight change instantly (motion-reduce:transition-none); the kit Popover drops its scale and blur entry and only fades.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not remove the per-row button once a notification is read: focus would drop to <body> mid-popover. Flip its label instead.
- Do not disable "Mark all as read" with the disabled attribute for the same reason; use aria-disabled and no-op the handler.
- Do not wrap IconButton in a span as the PopoverTrigger child: the trigger must be the focusable element that receives the forwarded ref and press props.
- Do not keep a separate unread counter in state; derive it from the list or the badge and the list will drift apart.

## Notes

- BellButton is exported on its own for headers that open a different surface (a drawer or a full notification center).
- Pass isOpen / onOpenChange to control the popover, e.g. to close it after navigating to a notification.

## Definition of done

With 5 unread, the bell reads "Notifications, 5 unread"; marking one read in the popover makes it "4 unread", and "Mark all as read" hides the badge and leaves the name "Notifications".

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
