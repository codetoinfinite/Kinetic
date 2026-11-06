# Build: Notification Center

A 430px inbox card: a header with the unread count and "Mark all read", a segmented control filtering All / Mentions / System with a count on each tab, and a scrolling list of notification rows. Each row shows an avatar or a tinted status icon, title, timestamp, an unread dot, the description and optional action buttons. Read state is tracked inside the component, so pressing an action or "Mark all read" clears the dots without the parent rewriting its data; the tab can be controlled or left uncontrolled.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Tabbed activity inbox with unread counts, avatars or status icons, inline action buttons and a mark-all-read control.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. Tab state bridges controlled and uncontrolled use: `activeTab = tab ?? internalTab`, and `setTab` only writes `internalTab` when `tab` is undefined before calling `onTabChange`. The `SegmentedControl` (`selectedKeys={[activeTab]}`) reads the first key of the selection set and ignores an empty selection, so a tab can never be deselected.
2. Read state is a `Set` of ids in local state. `isUnread(item)` is `item.unread === true && !readIds.has(item.id)`; the header shows "N unread" or "No unread notifications", and "Mark all read" (a small ghost Button, disabled at zero) replaces the set with every `unread` id. Pressing any action button adds that row's id before calling `onAction(notificationId, actionId)`.
3. Tab counts and the visible list are `useMemo`s over `notifications`: All shows everything, Mentions and System filter by `category`. Items with `category: "activity"` only appear under All. Each tab label renders its count in a `bg-badge-neutral-background` pill.
4. `NotificationVisual` renders the `avatar` (Avatar `size="lg"` forced to `size-10`) when present, else a 40px round badge with `icon ?? STATUS_ICON[status]` tinted by `status`: neutral (tertiary background), information, success and error (`bg-notification-*-background` / `text-notification-*-foreground`).
5. The list sits in a padded well (`p-1.5` around a `rounded-2xl bg-background-secondary-default` box) whose inner div is `max-h-[516px] overflow-y-auto overscroll-contain`, so long inboxes scroll inside the card without scrolling the page. Rows are `<article>`s with `rounded-notification-card` (10px) on the primary background; the unread dot is an 8px `bg-accent-500` span labelled "Unread". With no visible rows it shows an empty state with `RiNotificationOffLine` and `emptyMessage`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `card width = w-full max-w-[430px], rounded-3xl`
  Fits a notification row with two inline buttons and a timestamp on one line, and fits the 440px bell popover in the app shell with its border.
- `list height = max-h-[516px]`
  Caps the list so the card stays inside a laptop viewport when it is opened from a header bell; longer inboxes scroll inside it.
- `row card radius = --radius-notification-card: 10px`
  Smaller than the 16px (`rounded-2xl`) well around the rows, so the nested corners read as nested inside its 8px padding.
- `visual size = size-10 (40px), icon size-5`
  Avatars and status icons share one footprint, so titles line up whatever the row's visual is.

## API

```ts
function NotificationCenter(props: Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & { notifications: NotificationCenterItem[]; defaultTab?: "all" | "mentions" | "system"; tab?: "all" | "mentions" | "system"; onTabChange?: (tab: NotificationCenterTab) => void; onAction?: (notificationId: string, actionId: string) => void; title?: string; emptyMessage?: string; ref?: Ref<HTMLDivElement> }): JSX.Element
type NotificationCenterItem = { id: string; category: "mentions" | "system" | "activity"; group: string; title: string; description: string; timestamp: string; unread?: boolean; status?: "neutral" | "information" | "success" | "error"; icon?: IconComponent; avatar?: Pick<AvatarProps, "src" | "alt" | "initials" | "color">; actions?: { id: string; label: string; variant?: ButtonProps["variant"] }[] }
```

- `notifications: NotificationCenterItem[]`
  The inbox, rendered in array order.
- `defaultTab: "all" | "mentions" | "system"` — default `"all"`
  Initial tab when uncontrolled.
- `tab / onTabChange: NotificationCenterTab / (tab) => void`
  Controlled tab.
- `onAction: (notificationId: string, actionId: string) => void`
  Called when a row's action button is pressed; the row is marked read first.
- `title: string` — default `"Notifications"`
  Heading and accessible name of the section.
- `emptyMessage: string` — default `"You’re all caught up."`
  Shown when the active tab has no rows.
- `item.status: "neutral" | "information" | "success" | "error"` — default `"neutral"`
  Tint and default icon of the round badge when there is no avatar.
- `item.actions[].variant: ButtonProps["variant"]` — default `"secondary"`
  Button style of an inline action.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function NotificationCenter({
  notifications,
  defaultTab = "all",
  tab,
  onTabChange,
  onAction,
  title = "Notifications",
  emptyMessage = "You’re all caught up.",
  className,
  ref,
  ...props
}: NotificationCenterProps) {
  const localize = useTemplateCopy();
  const [internalTab, setInternalTab] = useState<NotificationCenterTab>(defaultTab);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const activeTab = tab ?? internalTab;

  const setTab = (nextTab: NotificationCenterTab) => {
    if (tab === undefined) setInternalTab(nextTab);
    onTabChange?.(nextTab);
  };

  const isUnread = (item: NotificationCenterItem) => item.unread === true && !readIds.has(item.id);
  const unreadCount = notifications.filter(isUnread).length;

  const tabCounts = useMemo(
    () => ({
      all: notifications.length,
      mentions: notifications.filter((item) => item.category === "mentions").length,
      system: notifications.filter((item) => item.category === "system").length,
    }),
    [notifications],
  );

  const visibleNotifications = useMemo(
    () =>
      activeTab === "all"
        ? notifications
        : notifications.filter((item) => item.category === activeTab),
    [activeTab, notifications],
  );

  const markAllRead = () => {
    setReadIds(new Set(notifications.filter((item) => item.unread).map((item) => item.id)));
  };

  return localize((
    <section
      ref={ref}
      aria-label={title}
      className={cx(
        "flex w-full max-w-[430px] flex-col overflow-hidden rounded-3xl border border-border-button-default bg-notification-center-background shadow-dropdown",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-3 p-4 pb-1.5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-title-3-medium text-text-primary">{title}</h2>
            <p className="text-body-regular text-text-secondary">
              {unreadCount === 0 ? "No unread notifications" : `${unreadCount} unread`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="small"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            Mark all read
          </Button>
        </div>

        <SegmentedControl
          aria-label="Notification category"
          selectedKeys={[activeTab]}
          onSelectionChange={(keys) => {
            const next = [...(keys as Set<string>)][0] as NotificationCenterTab | undefined;
            if (next) setTab(next);
          }}
          className="flex w-full"
        >
          {TABS.map(({ id, label }) => (
            <SegmentedControlItem
              key={id}
              id={id}
              className="flex-1"
            >
              <TabLabel label={label} count={tabCounts[id]} />
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>

      <div className="bg-notification-center-background p-1.5">
        <div className="overflow-hidden rounded-2xl bg-background-secondary-default">
          <div className="max-h-[516px] overflow-y-auto overscroll-contain bg-background-secondary-default p-2">
            {visibleNotifications.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-2xl bg-background-primary-default px-6 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-background-secondary-default text-foreground-icon-secondary">
                  <RiNotificationOffLine className="size-5" aria-hidden />
                </span>
                <p className="text-body-medium text-text-primary">{emptyMessage}</p>
                <p className="max-w-64 text-body-regular text-text-secondary">
                  New activity will appear here when it arrives.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {visibleNotifications.map((item) => {
                  const unread = isUnread(item);
                  return (
                    <article
                      key={item.id}
                      className="group/item relative flex gap-3 rounded-notification-card bg-background-primary-default px-3 py-3"
                    >
                      <NotificationVisual item={item} />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <p className="min-w-0 text-body-medium text-text-primary">{item.title}</p>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-caption-1-medium whitespace-nowrap text-text-tertiary">
                              {item.timestamp}
                            </span>
                            {unread ? (
                              <span
                                className="size-2 rounded-full bg-accent-500"
                                aria-label="Unread"
                              />
                            ) : null}
                          </div>
                        </div>
                        <p className="text-body-regular text-text-secondary">{item.description}</p>
                        {item.actions?.length ? (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {item.actions.map((action) => (
                              <Button
                                key={action.id}
                                size="small"
                                variant={action.variant ?? "secondary"}
                                onClick={() => {
                                  setReadIds((current) => new Set(current).add(item.id));
                                  onAction?.(item.id, action.id);
                                }}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  ));
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** None: state only (tab, read ids), no listeners or timers.

**Reduced motion.** The component adds no motion of its own; tab and button transitions come from SegmentedControl and Button and follow their reduced-motion rules.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not expect `unread: false` to be written back to your data. Read state lives in the component's `readIds` set; persist it in `onAction` (or a "mark all" handler of your own) if it must survive a remount.
- Do not rely on `group` for headings. It is part of the item type for your own data, but the list renders flat rows in array order; sort the array yourself.
- Do not pass `tab` without `onTabChange`. A controlled tab never changes on its own, so the segmented control would appear stuck.
- Do not give an item both `avatar` and `icon` expecting the icon; the avatar wins.

## Notes

- The fixed copy (tab names, "Mark all read", the empty-state line) runs through `useTemplateCopy()`'s `localize`, so localized templates translate it.
- The section is labelled by `title` (`aria-label`), and the h2 shows the same text.
- Used by the app shell's notification bell, which renders it inside a non-modal popover.

## Definition of done

The card reads "4 unread" with tab counts All 6, Mentions 2, System 3. Choosing System shows the three system rows and "Viewing System" in the activity panel. Pressing Retry removes that row's blue dot, drops the count to 3 and logs "Retry" beside the card. "Mark all read" clears every dot, reads "No unread notifications" and disables itself. The list scrolls inside the card when it is taller than 516px.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
